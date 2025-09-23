import { Injectable, Logger } from "@nestjs/common"
import {
    AuthUser,
    CreateStaffAccountResponse,
} from "../models"
import { AwsCognitoService } from "libs/aws-cognito"
import {
    CreateStaffAccountInput,
} from "../dto"
import { Role } from "libs/databases/prisma/schemas/enums/user.enums"
import { AuthErrorHelper } from "../helpers"
import { GrpcClientService } from "libs/grpc"

@Injectable()
export class AuthAdminService {
    private readonly logger = new Logger(AuthAdminService.name)

    constructor(
        private readonly awsCognitoService: AwsCognitoService,
        private readonly grpcClient: GrpcClientService,
    ) {}

    async createStaffAccount(
        input: CreateStaffAccountInput,
        adminUser: AuthUser,
    ): Promise<CreateStaffAccountResponse> {
        try {
            this.logger.log(`Admin ${adminUser.id} creating staff account for: ${input.email}`)

            // Use a default password that staff can change later
            const defaultPassword = "StaffUser123!"

            // Create user in Cognito using regular signUp
            const cognitoResult = await this.awsCognitoService.signUp(
                input.email,
                defaultPassword,
                {
                    name: input.full_name,
                    phone_number: input.phone_number,
                }
            )

            this.logger.log(`Cognito user created: ${cognitoResult.userSub}`)

            // Create user in database via gRPC
            const userResult = await this.grpcClient.callUserService("CreateStaffUser", {
                cognito_id: cognitoResult.userSub || "",
                email: input.email,
                username: input.user_name,
                full_name: input.full_name,
                phone_number: input.phone_number,
                avatar_url: input.avatar_url || "",
                role: this.mapRoleToProtoEnum(input.role),
                bio: input.bio || "",
                organization_name: input.organization_name || "",
                organization_address: input.organization_address || "",
                created_by_admin_id: adminUser.id,
            })

            if (!userResult.success) {
                // Rollback Cognito user if database creation fails
                // Note: We'll need to implement adminDeleteUser in AwsCognitoService
                throw new Error(`Failed to create user in database: ${userResult.message}`)
            }

            this.logger.log(`Staff account created successfully: ${userResult.user.id}`)

            return {
                success: true,
                message: "Staff account created successfully. Default password: StaffUser123!",
                userId: userResult.user.id,
                cognitoId: cognitoResult.userSub || "",
                temporaryPasswordSent: false,
            }
        } catch (error) {
            this.logger.error(`Staff account creation failed for ${input.email}:`, error)
            throw AuthErrorHelper.mapCognitoError(error, "createStaffAccount", input.email)
        }
    }

    private mapRoleToProtoEnum(role: Role): number {
        switch (role) {
        case Role.DONOR:
            return 0
        case Role.FUNDRAISER:
            return 1
        case Role.KITCHEN_STAFF:
            return 2
        case Role.DELIVERY_STAFF:
            return 3
        case Role.ADMIN:
            return 4
        default:
            throw new Error(`Invalid role: ${role}`)
        }
    }
}