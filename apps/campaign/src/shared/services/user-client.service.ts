import { Injectable, Logger } from "@nestjs/common"
import { GrpcClientService } from "@libs/grpc"

interface UserProfile {
    id: string
    fullName?: string
    username?: string
    email?: string
}

@Injectable()
export class UserClientService {
    private readonly logger = new Logger(UserClientService.name)

    constructor(private readonly grpcClient: GrpcClientService) {}

    async getUserById(userId: string): Promise<UserProfile | null> {
        try {
            const response = await this.grpcClient.callUserService<
                { id: string },
                {
                    success: boolean
                    user?: {
                        id: string
                        full_name: string
                        username: string
                        email: string
                    }
                    error?: string
                }
            >("GetUser", { id: userId }, { timeout: 3000, retries: 2 })

            if (!response.success || !response.user) {
                this.logger.warn(
                    `Failed to fetch user ${userId}: ${response.error || "User not found"}`,
                )
                return null
            }

            return {
                id: response.user.id,
                fullName: response.user.full_name,
                username: response.user.username,
                email: response.user.email,
            }
        } catch (error) {
            this.logger.error(`Error fetching user ${userId}:`, error)
            return null
        }
    }

    async getUserName(userId: string): Promise<string | null> {
        const user = await this.getUserById(userId)
        return user?.fullName || user?.username || null
    }

    async getUserByCognitoId(cognitoId: string): Promise<UserProfile | null> {
        try {
            // Use GetUser method with cognito_id parameter
            // According to user.proto: GetUserRequest has optional cognito_id field
            const response = await this.grpcClient.callUserService<
                { id?: string; cognito_id?: string },
                {
                    success: boolean
                    user?: {
                        id: string
                        cognito_id: string
                        full_name: string
                        username: string
                        email: string
                    }
                    error?: string
                }
            >(
                "GetUser",
                { cognito_id: cognitoId },
                { timeout: 3000, retries: 2 },
            )

            if (!response.success || !response.user) {
                this.logger.warn(
                    `Failed to fetch user by Cognito ID ${cognitoId}: ${response.error || "User not found"}`,
                )
                return null
            }

            return {
                id: response.user.id,
                fullName: response.user.full_name,
                username: response.user.username,
                email: response.user.email,
            }
        } catch (error) {
            this.logger.error(
                `Error fetching user by Cognito ID ${cognitoId}:`,
                error,
            )
            return null
        }
    }

    async getUserNameByCognitoId(cognitoId: string): Promise<string | null> {
        const user = await this.getUserByCognitoId(cognitoId)
        return user?.fullName || user?.username || null
    }
}
