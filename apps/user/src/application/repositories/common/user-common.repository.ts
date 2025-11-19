import { Injectable } from "@nestjs/common"
import { PrismaClient, Role } from "../../../generated/user-client"
import { v7 as uuidv7 } from "uuid"
import { CreateUserInput } from "@app/user/src/application/dtos"

@Injectable()
export class UserCommonRepository {
    constructor(private readonly prisma: PrismaClient) {}

    async createUser(data: CreateUserInput) {
        return this.prisma.user.create({
            data: {
                id: uuidv7(),
                ...data,
                is_active: true,
            },
        })
    }

    async findUserById(id: string) {
        return this.prisma.user.findUnique({
            where: { id, is_active: true },
        })
    }

    async findUserByEmail(email: string) {
        return this.prisma.user.findUnique({
            where: { email },
            include: {
                Organizations: true,
            },
        })
    }

    async findUserByUsername(user_name: string) {
        return this.prisma.user.findUnique({
            where: { user_name },
            include: {
                Organizations: true,
            },
        })
    }

    async findUserByCognitoId(cognito_id: string) {
        if (!cognito_id) {
            throw new Error("cognito_id is required")
        }

        return this.prisma.user.findUnique({
            where: { cognito_id },
        })
    }

    async updateUser(
        id: string,
        data: Partial<CreateUserInput & { is_active?: boolean }>,
    ) {
        return this.prisma.user.update({
            where: { id },
            data,
            include: {
                Organizations: true,
            },
        })
    }

    async findUserBasicInfo(cognitoId: string): Promise<{
        id: string
        role: Role
    } | null> {
        return this.prisma.user.findUnique({
            where: { cognito_id: cognitoId },
            select: {
                id: true,
                role: true,
            },
        })
    }

    async findUsersByIds(userIds: string[]): Promise<any[]> {
        return this.prisma.user.findMany({
            where: {
                id: {
                    in: userIds,
                },
                is_active: true,
            },
            select: {
                id: true,
                full_name: true,
                user_name: true,
                avatar_url: true,
            },
        })
    }

    async findUserFullName(cognitoId: string): Promise<{
        id: string
        full_name: string
    } | null> {
        return this.prisma.user.findUnique({
            where: { cognito_id: cognitoId, is_active: true },
            select: {
                id: true,
                full_name: true,
            },
        })
    }
}
