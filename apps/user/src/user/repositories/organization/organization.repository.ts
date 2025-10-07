import { Injectable } from "@nestjs/common"
import {
    PrismaClient,
    Verification_Status,
    Role,
} from "../../../generated/user-client"
import { CreateOrganizationInput } from "../../dto/organization.input"

@Injectable()
export class OrganizationRepository {
    constructor(private readonly prisma: PrismaClient) {}

    async createOrganization(userId: string, data: CreateOrganizationInput) {
        const { website, ...organizationData } = data
        return this.prisma.organization.create({
            data: {
                ...organizationData,
                website: website || "",
                representative_id: userId,
                status: Verification_Status.PENDING,
            },
            include: {
                user: true,
            },
        })
    }

    async findPendingOrganizations() {
        return this.prisma.organization.findMany({
            where: {
                status: Verification_Status.PENDING,
            },
            include: {
                user: true,
            },
            orderBy: {
                created_at: "desc",
            },
        })
    }

    async updateOrganizationStatus(id: string, status: Verification_Status) {
        return this.prisma.organization.update({
            where: { id },
            data: { status },
            include: {
                user: true,
            },
        })
    }

    async findOrganizationById(id: string) {
        return this.prisma.organization.findUnique({
            where: { id },
            include: {
                user: true,
            },
        })
    }

    async createJoinRequest(
        userId: string,
        organizationId: string,
        requestedRole: Role,
    ) {
        return this.prisma.organization_Member.create({
            data: {
                member_id: userId,
                organization_id: organizationId,
                member_role: requestedRole,
                status: Verification_Status.PENDING,
            },
            include: {
                member: true,
                organization: true,
            },
        })
    }

    async findPendingJoinRequestsByOrganization(organizationId: string) {
        return this.prisma.organization_Member.findMany({
            where: {
                organization_id: organizationId,
                status: Verification_Status.PENDING,
            },
            include: {
                member: true,
                organization: true,
            },
            orderBy: {
                joined_at: "desc",
            },
        })
    }

    async findJoinRequestById(requestId: string) {
        return this.prisma.organization_Member.findUnique({
            where: { id: requestId },
            include: {
                member: true,
                organization: true,
            },
        })
    }

    async updateJoinRequestStatus(
        requestId: string,
        status: Verification_Status,
    ) {
        return this.prisma.organization_Member.update({
            where: { id: requestId },
            data: { status },
            include: {
                member: true,
                organization: true,
            },
        })
    }

    async checkExistingJoinRequest(userId: string, organizationId: string) {
        return this.prisma.organization_Member.findFirst({
            where: {
                member_id: userId,
                organization_id: organizationId,
            },
        })
    }

    async findUserActiveOrganizationMembership(userId: string) {
        return this.prisma.organization_Member.findFirst({
            where: {
                member_id: userId,
                status: Verification_Status.VERIFIED,
            },
            include: {
                organization: true,
            },
        })
    }
}
