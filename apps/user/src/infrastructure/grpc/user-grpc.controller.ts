import { Controller, Logger } from "@nestjs/common"
import { GrpcMethod } from "@nestjs/microservices"
import {
    UserCommonRepository,
    UserAdminRepository,
    OrganizationRepository,
} from "../../domain/repositories"
import { Role } from "@libs/databases"
import { generateUniqueUsername } from "libs/common"

// Request/Response interfaces matching proto definitions
interface CreateUserRequest {
    cognitoId: string
    email: string
    username?: string
    fullName: string
    role?: string
    cognitoAttributes?: {
        avatarUrl?: string
        bio?: string
    }
}

interface CreateUserResponse {
    success: boolean
    user: any | null
    error: string | null
}

interface GetUserRequest {
    cognitoId: string
}

interface GetUserResponse {
    success: boolean
    user: any | null
    error: string | null
}

interface UpdateUserRequest {
    id: string
    fullName?: string
    avatarUrl?: string
    phoneNumber?: string
    address?: string
    bio?: string
}

interface UpdateUserResponse {
    success: boolean
    user: any | null
    error: string | null
}

interface UserExistsRequest {
    cognitoId: string
}

interface UserExistsResponse {
    exists: boolean
    userId?: string
    error: string | null
}

interface GetUserByEmailRequest {
    email: string
}

interface GetUserByEmailResponse {
    success: boolean
    user: any | null
    error: string | null
}

interface HealthResponse {
    status: string
    service: string
    timestamp: string
    uptime: number
}

interface GetOrganizationMembersRequest {
    userId: string
}

interface OrganizationMember {
    userId: string
    role: string
    fullName: string
    email: string
}

interface GetOrganizationMembersResponse {
    success: boolean
    members: OrganizationMember[]
    error: string | null
}

const ROLE_MAP = {
    DONOR: 0,
    FUNDRAISER: 1,
    KITCHEN_STAFF: 2,
    DELIVERY_STAFF: 3,
    ADMIN: 4,
}

@Controller()
export class UserGrpcController {
    constructor(
        private readonly userCommonRepository: UserCommonRepository,
        private readonly userAdminRepository: UserAdminRepository,
        private readonly organizationRepository: OrganizationRepository,
    ) {}

    @GrpcMethod("UserService", "Health")
    async health(): Promise<HealthResponse> {
        return {
            status: "healthy",
            service: "user-service",
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
        }
    }

    @GrpcMethod("UserService", "CreateUser")
    async createUser(data: CreateUserRequest): Promise<CreateUserResponse> {
        try {
            const { cognitoId, email, fullName, cognitoAttributes } = data

            if (!cognitoId || !email) {
                return {
                    success: false,
                    user: null,
                    error: "Cognito ID and email are required",
                }
            }

            const finalUsername = generateUniqueUsername(email)

            const user = await this.userCommonRepository.createUser({
                cognito_id: cognitoId,
                email,
                user_name: finalUsername,
                full_name: fullName || "",
                avatar_url: cognitoAttributes?.avatarUrl || "",
                bio: cognitoAttributes?.bio || "",
                role: Role.DONOR,
            } as any)

            if (!user) {
                return {
                    success: false,
                    user: null,
                    error: "Failed to create user",
                }
            }

            return {
                success: true,
                user: {
                    id: user.id,
                    cognitoId: user.cognito_id,
                    email: user.email,
                    username: finalUsername,
                    fullName: user.full_name,
                    phoneNumber: user.phone_number || "",
                    avatarUrl: user.avatar_url || "",
                    bio: user.bio || "",
                    role: 0, // DONOR = 0
                    isActive: user.is_active,
                    createdAt: user.created_at.toISOString(),
                    updatedAt: user.updated_at.toISOString(),
                },
                error: null,
            }
        } catch (error) {
            return {
                success: false,
                user: null,
                error: error.message,
            }
        }
    }

    @GrpcMethod("UserService", "GetUser")
    async getUser(data: GetUserRequest): Promise<GetUserResponse> {
        try {
            const { cognitoId } = data

            if (!cognitoId) {
                return {
                    success: false,
                    user: null,
                    error: "Cognito ID is required",
                }
            }

            const user =
                await this.userCommonRepository.findUserByCognitoId(cognitoId)

            if (!user) {
                return {
                    success: false,
                    user: null,
                    error: "User not found",
                }
            }

            return {
                success: true,
                user: {
                    id: user.id,
                    cognitoId: user.cognito_id,
                    email: user.email,
                    username: user.user_name,
                    fullName: user.full_name,
                    phoneNumber: user.phone_number || "",
                    avatarUrl: user.avatar_url || "",
                    bio: user.bio || "",
                    role: ROLE_MAP[user.role] || 0,
                    isActive: user.is_active,
                    createdAt: user.created_at.toISOString(),
                    updatedAt: user.updated_at.toISOString(),
                },
                error: null,
            }
        } catch (error) {
            return {
                success: false,
                user: null,
                error: error.message,
            }
        }
    }

    @GrpcMethod("UserService", "UpdateUser")
    async updateUser(data: UpdateUserRequest): Promise<UpdateUserResponse> {
        try {
            const { id, fullName, phoneNumber, avatarUrl, bio } = data

            if (!id) {
                return {
                    success: false,
                    user: null,
                    error: "User ID is required",
                }
            }

            const updateData: any = {}
            if (fullName) updateData.full_name = fullName
            if (phoneNumber) updateData.phone_number = phoneNumber
            if (avatarUrl) updateData.avatar_url = avatarUrl
            if (bio) updateData.bio = bio

            const user = await this.userAdminRepository.updateUser(
                id,
                updateData,
            )

            return {
                success: true,
                user: {
                    id: user.id,
                    cognitoId: user.cognito_id,
                    email: user.email,
                    username: user.user_name,
                    fullName: user.full_name,
                    phoneNumber: user.phone_number || "",
                    avatarUrl: user.avatar_url || "",
                    bio: user.bio || "",
                    role: ROLE_MAP[user.role] || 0,
                    isActive: user.is_active,
                    createdAt: user.created_at.toISOString(),
                    updatedAt: user.updated_at.toISOString(),
                },
                error: null,
            }
        } catch (error) {
            return {
                success: false,
                user: null,
                error: error.message,
            }
        }
    }

    @GrpcMethod("UserService", "UserExists")
    async userExists(data: UserExistsRequest): Promise<UserExistsResponse> {
        try {
            const { cognitoId } = data

            if (!cognitoId) {
                return {
                    exists: false,
                    userId: "",
                    error: null,
                }
            }

            const user =
                await this.userCommonRepository.findUserByCognitoId(cognitoId)

            return {
                exists: !!user,
                userId: user?.id || "",
                error: null,
            }
        } catch (error) {
            return {
                exists: false,
                userId: "",
                error: error.message,
            }
        }
    }

    @GrpcMethod("UserService", "GetUserByEmail")
    async getUserByEmail(
        data: GetUserByEmailRequest,
    ): Promise<GetUserByEmailResponse> {
        try {
            const { email } = data

            if (!email) {
                return {
                    success: false,
                    user: null,
                    error: "Email is required",
                }
            }

            const user = await this.userCommonRepository.findUserByEmail(email)

            if (!user) {
                return {
                    success: false,
                    user: null,
                    error: "User not found",
                }
            }

            return {
                success: true,
                user: {
                    id: user.id,
                    cognitoId: user.cognito_id,
                    email: user.email,
                    username: user.user_name,
                    fullName: user.full_name,
                    phoneNumber: user.phone_number || "",
                    avatarUrl: user.avatar_url || "",
                    bio: user.bio || "",
                    role: ROLE_MAP[user.role] || 0,
                    isActive: user.is_active,
                    createdAt: user.created_at.toISOString(),
                    updatedAt: user.updated_at.toISOString(),
                },
                error: null,
            }
        } catch (error) {
            return {
                success: false,
                user: null,
                error: error.message,
            }
        }
    }

    @GrpcMethod("UserService", "GetOrganizationMembers")
    async getOrganizationMembers(
        data: GetOrganizationMembersRequest,
    ): Promise<GetOrganizationMembersResponse> {
        try {
            const { userId } = data

            if (!userId) {
                return {
                    success: false,
                    members: [],
                    error: "User ID is required",
                }
            }

            const user = await this.userCommonRepository.findUserById(userId)

            if (!user) {
                return {
                    success: false,
                    members: [],
                    error: "User not found",
                }
            }

            if (!user.cognito_id) {
                return {
                    success: true,
                    members: [
                        {
                            userId: user.id,
                            role: user.role,
                            fullName: user.full_name,
                            email: user.email,
                        },
                    ],
                    error: null,
                }
            }

            const organizationMembership =
                await this.organizationRepository.findVerifiedMembershipByUserId(
                    user.cognito_id,
                )

            if (!organizationMembership) {
                return {
                    success: true,
                    members: [
                        {
                            userId: user.id,
                            role: user.role,
                            fullName: user.full_name,
                            email: user.email,
                        },
                    ],
                    error: null,
                }
            }

            const allMembers =
                await this.organizationRepository.findMembersByOrganizationId(
                    organizationMembership.organization_id,
                )

            const members: OrganizationMember[] = allMembers.map(
                (memberRecord) => ({
                    userId: memberRecord.member.id,
                    role: memberRecord.member.role,
                    fullName: memberRecord.member.full_name,
                    email: memberRecord.member.email,
                }),
            )

            return {
                success: true,
                members,
                error: null,
            }
        } catch (error) {
            return {
                success: false,
                members: [],
                error: error.message || "Internal server error",
            }
        }
    }
}
