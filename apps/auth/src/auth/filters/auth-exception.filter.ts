import { ExceptionFilter, Catch, ArgumentsHost, Logger } from "@nestjs/common"
import { Response } from "express"
import { AuthException } from "../exceptions"
import { SentryService } from "libs/observability/sentry.service"

@Catch(AuthException)
export class AuthExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(AuthExceptionFilter.name)

    constructor(private readonly sentryService: SentryService) {}

    catch(exception: AuthException, host: ArgumentsHost) {
        const ctx = host.switchToHttp()
        const response = ctx.getResponse<Response>()
        const request = ctx.getRequest()

        const status = exception.getStatus()
        const message = exception.message

        // Create error response
        const errorResponse = {
            success: false,
            error: {
                code: exception.errorCode,
                type: exception.errorType,
                message: message,
                timestamp: new Date().toISOString(),
                path: request.url,
                method: request.method,
            },
            // Include context in development
            ...(process.env.NODE_ENV === "development" && {
                context: exception.context,
                stack: exception.stack,
            }),
        }

        // Log error locally
        this.logger.error(
            `Auth Error [${exception.errorCode}]: ${message}`,
            {
                errorType: exception.errorType,
                context: exception.context,
                url: request.url,
                method: request.method,
                userAgent: request.headers["user-agent"],
            }
        )

        // Send to Sentry with rich context
        this.sentryService.captureError(exception, {
            ...exception.toSentryContext(),
            request: {
                url: request.url,
                method: request.method,
                headers: this.sanitizeHeaders(request.headers),
                body: this.sanitizeBody(request.body),
                query: request.query,
                params: request.params,
            },
            user: request.user ? {
                id: request.user.id,
                email: request.user.email,
            } : undefined,
        })

        // Add breadcrumb for error tracking
        this.sentryService.addBreadcrumb(
            `Auth Error: ${exception.errorCode}`,
            "error",
            {
                errorCode: exception.errorCode,
                errorType: exception.errorType,
                message: message,
            }
        )

        response.status(status).json(errorResponse)
    }

    private sanitizeHeaders(headers: any): any {
        const sanitized = { ...headers }
        const sensitiveHeaders = ["authorization", "cookie", "x-api-key"]
    
        sensitiveHeaders.forEach(header => {
            if (sanitized[header]) {
                sanitized[header] = "[REDACTED]"
            }
        })
    
        return sanitized
    }

    private sanitizeBody(body: any): any {
        if (!body) return body
    
        const sensitiveFields = ["password", "confirmationCode", "token", "secret"]
        const sanitized = { ...body }
    
        sensitiveFields.forEach(field => {
            if (sanitized[field]) {
                sanitized[field] = "[REDACTED]"
            }
        })
    
        return sanitized
    }
}