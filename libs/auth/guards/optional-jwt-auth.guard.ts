import { Injectable, CanActivate, ExecutionContext, Logger } from "@nestjs/common"
import { GqlExecutionContext } from "@nestjs/graphql"
import { GrpcClientService } from "libs/grpc"

@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
    private readonly logger = new Logger(OptionalJwtAuthGuard.name)

    constructor(private readonly grpcClient: GrpcClientService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const gqlCtx = GqlExecutionContext.create(context)
        const req = gqlCtx.getContext().req

        await this.attachUserToRequest(req)
        
        // Always allow request to proceed (never block)
        return true
    }

    private async attachUserToRequest(req: any): Promise<void> {
        const authHeader = req.headers?.authorization || req.headers?.Authorization
        
        if (!this.hasValidAuthHeader(authHeader)) {
            req.user = null
            this.logger.debug("No authorization token - treating as anonymous user")
            return
        }

        const token = authHeader.substring(7)
        req.user = await this.validateAndGetUser(token)
    }

    private hasValidAuthHeader(authHeader: any): boolean {
        return authHeader && typeof authHeader === "string" && authHeader.startsWith("Bearer ")
    }

    private async validateAndGetUser(token: string): Promise<any> {
        try {
            const authResponse = await this.grpcClient.callAuthService(
                "ValidateToken",
                { access_token: token },
            )

            if (authResponse.valid && authResponse.user) {
                this.logger.debug(`Authenticated user: ${authResponse.user.attributes?.email || "unknown"}`)
                return authResponse.user
            }

            this.logger.warn("Token validation failed - treating as anonymous user")
            return null
        } catch (error) {
            this.logger.warn(
                `Token validation error: ${error instanceof Error ? error.message : "Unknown error"} - treating as anonymous user`,
            )
            return null
        }
    }
}
