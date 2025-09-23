import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException } from "@nestjs/common"
import { GqlExecutionContext } from "@nestjs/graphql"
import { GrpcClientService } from "libs/grpc"

@Injectable()
export class AdminGuard implements CanActivate {
    constructor(
        private readonly grpcClient: GrpcClientService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = this.getRequest(context)
        const token = this.extractTokenFromHeader(request)

        if (!token) {
            throw new UnauthorizedException("No authorization token provided")
        }

        try {
            // Verify token using Auth service gRPC call
            const authResponse = await this.grpcClient.callAuthService("VerifyToken", {
                accessToken: token
            })

            if (!authResponse.success || !authResponse.user) {
                throw new UnauthorizedException("Invalid token")
            }

            const user = authResponse.user

            // Check if user has admin role via gRPC call to User service
            const userDetails = await this.getUserRole(user.id)
            
            if (!userDetails || userDetails.role !== 4) { // ADMIN = 4 from proto enum
                throw new ForbiddenException("Admin access required")
            }

            // Add user to request context for use in resolvers
            request.user = user
            request.userRole = userDetails.role

            return true
        } catch (error) {
            if (error instanceof UnauthorizedException || error instanceof ForbiddenException) {
                throw error
            }
            throw new UnauthorizedException("Authentication failed")
        }
    }

    private getRequest(context: ExecutionContext) {
        const gqlContext = GqlExecutionContext.create(context).getContext()
        return gqlContext.req
    }

    private extractTokenFromHeader(request: any): string | null {
        const authHeader = request.headers?.authorization
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return null
        }
        return authHeader.substring(7)
    }

    private async getUserRole(cognitoId: string): Promise<{ role: number } | null> {
        try {
            const response = await this.grpcClient.callUserService("GetUser", {
                id: cognitoId,
            })

            if (response.success && response.user) {
                return { role: response.user.role }
            }
            
            return null
        } catch (error) {
            // Log error but don't expose internal details
            console.error("Failed to get user role:", error)
            return null
        }
    }
}