import { Catch, ArgumentsHost, Logger } from "@nestjs/common"
import { GqlArgumentsHost, GqlExceptionFilter } from "@nestjs/graphql"
import { GraphQLError } from "graphql"
import { BaseException } from "../base.exception"
import { SentryService } from "libs/observability/sentry.service"
import { GraphQLValidationException } from "libs/validation"

@Catch()
export class GraphQLExceptionFilter implements GqlExceptionFilter {
    private readonly logger = new Logger(GraphQLExceptionFilter.name)

    constructor(private readonly sentryService: SentryService) {}

    catch(exception: unknown, host: ArgumentsHost): GraphQLError {
        const gqlHost = GqlArgumentsHost.create(host)
        const info = gqlHost.getInfo()
        const context = gqlHost.getContext()
        const args = gqlHost.getArgs()

        // Extract request info safely
        const requestInfo = {
            operation: info?.operation?.operation || "unknown",
            fieldName: info?.fieldName || "unknown",
            path: info?.path?.key || "unknown",
            variables: args || {},
            user: context?.req?.user,
            userAgent: context?.req?.headers?.["user-agent"],
            ip: context?.req?.ip,
        }

        if (exception instanceof BaseException) {
            // Handle our custom exceptions
            this.logger.error(
                `${exception.service.toUpperCase()} Error [${exception.errorCode}]: ${exception.message}`,
                {
                    errorType: exception.errorType,
                    context: exception.context,
                    operation: requestInfo.operation,
                    fieldName: requestInfo.fieldName,
                    path: requestInfo.path,
                }
            )

            // Send to Sentry with GraphQL context
            this.sentryService.captureError(exception, {
                ...exception.toSentryContext(),
                graphql: {
                    operation: requestInfo.operation,
                    fieldName: requestInfo.fieldName,
                    path: requestInfo.path,
                    variables: this.sanitizeVariables(requestInfo.variables),
                },
                user: requestInfo.user ? {
                    id: requestInfo.user.id,
                    email: requestInfo.user.email,
                } : undefined,
            })

            // Add breadcrumb for error tracking
            this.sentryService.addBreadcrumb(
                `${exception.service} GraphQL Error: ${exception.errorCode}`,
                "error",
                {
                    errorCode: exception.errorCode,
                    errorType: exception.errorType,
                    operation: requestInfo.operation,
                    fieldName: requestInfo.fieldName,
                }
            )

            return new GraphQLError(exception.message, {
                extensions: {
                    code: exception.errorCode,
                    type: exception.errorType,
                    service: exception.service,
                    timestamp: new Date().toISOString(),
                    ...(process.env.NODE_ENV === "development" && {
                        context: exception.context,
                        stack: exception.stack,
                    }),
                },
            })

        } else if (exception instanceof GraphQLValidationException) {
            // Handle our custom GraphQL validation errors
            this.logger.error(`GraphQL Validation Error: ${exception.message}`, {
                operation: requestInfo.operation,
                fieldName: requestInfo.fieldName,
                variables: this.sanitizeVariables(requestInfo.variables),
                validationErrors: exception.validationErrors,
            })

            return new GraphQLError("Input validation failed", {
                extensions: {
                    code: "VALIDATION_ERROR",
                    type: "VALIDATION",
                    service: "validation",
                    timestamp: new Date().toISOString(),
                    details: exception.validationErrors,
                },
            })

        } else if (exception instanceof Error) {
            // Handle other known errors
            const isValidationError = exception.message.includes("Validation failed") || 
                                    exception.name === "BadRequestException"

            if (isValidationError) {
                // Try to extract validation details from the exception
                let validationDetails: any = null
                try {
                    // Check for our custom validation errors first
                    if ((exception as any).validationErrors) {
                        validationDetails = (exception as any).validationErrors
                    } else {
                        const errorResponse = (exception as any).response
                        if (errorResponse && errorResponse.errors) {
                            validationDetails = errorResponse.errors
                        } else if (errorResponse && Array.isArray(errorResponse.message)) {
                            // Standard class-validator format
                            validationDetails = errorResponse.message.map((msg: string, index: number) => ({
                                field: "unknown",
                                message: msg,
                                constraint: "validation",
                                index
                            }))
                        }
                    }
                } catch (e) {
                    // Ignore parsing errors
                }

                this.logger.error(`GraphQL Validation Error: ${exception.message}`, {
                    operation: requestInfo.operation,
                    fieldName: requestInfo.fieldName,
                    variables: this.sanitizeVariables(requestInfo.variables),
                })

                return new GraphQLError("Input validation failed", {
                    extensions: {
                        code: "VALIDATION_ERROR",
                        type: "VALIDATION",
                        service: "validation",
                        timestamp: new Date().toISOString(),
                        ...(validationDetails && { details: validationDetails }),
                        ...(process.env.NODE_ENV === "development" && {
                            originalMessage: exception.message,
                            stack: exception.stack,
                        }),
                    },
                })
            } else {
                // Other known errors
                this.logger.error(`GraphQL Error: ${exception.message}`, {
                    operation: requestInfo.operation,
                    fieldName: requestInfo.fieldName,
                    stack: exception.stack,
                })

                this.sentryService.captureError(exception, {
                    graphql: {
                        operation: requestInfo.operation,
                        fieldName: requestInfo.fieldName,
                        path: requestInfo.path,
                        variables: this.sanitizeVariables(requestInfo.variables),
                    },
                    user: requestInfo.user,
                })

                return new GraphQLError(
                    process.env.NODE_ENV === "development" 
                        ? exception.message 
                        : "Internal server error",
                    {
                        extensions: {
                            code: "INTERNAL_ERROR",
                            type: "SYSTEM",
                            service: "graphql",
                            timestamp: new Date().toISOString(),
                            ...(process.env.NODE_ENV === "development" && {
                                originalMessage: exception.message,
                                stack: exception.stack,
                            }),
                        },
                    }
                )
            }
        } else {
            // Handle unexpected errors
            const errorMessage = String(exception)
            this.logger.error(`Unexpected GraphQL Error: ${errorMessage}`)

            this.sentryService.captureError(
                new Error(errorMessage),
                {
                    graphql: {
                        operation: requestInfo.operation,
                        fieldName: requestInfo.fieldName,
                        path: requestInfo.path,
                    },
                    user: requestInfo.user,
                }
            )

            return new GraphQLError("Internal server error", {
                extensions: {
                    code: "INTERNAL_ERROR",
                    type: "SYSTEM",
                    service: "graphql",
                    timestamp: new Date().toISOString(),
                    ...(process.env.NODE_ENV === "development" && {
                        originalError: errorMessage,
                    }),
                },
            })
        }
    }

    private sanitizeVariables(variables: any): any {
        if (!variables) return variables

        const sensitiveFields = ["password", "confirmationCode", "token", "secret", "apiKey", "accessToken", "refreshToken"]
        const sanitized = { ...variables }

        sensitiveFields.forEach(field => {
            if (sanitized[field]) {
                sanitized[field] = "[REDACTED]"
            }
        })

        return sanitized
    }
}