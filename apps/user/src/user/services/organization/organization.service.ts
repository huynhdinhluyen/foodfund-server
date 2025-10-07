import {
    Injectable,
    NotFoundException,
    BadRequestException,
} from "@nestjs/common"
import { OrganizationRepository } from "../../repositories/organization/organization.repository"
import { UserRepository } from "../../repositories/user.repository"
import { CreateOrganizationInput, JoinOrganizationInput } from "../../dto/organization.input"
import { Verification_Status } from "../../../generated/user-client"
import { Role } from "libs/databases/prisma/schemas"

@Injectable()
export class OrganizationService {
    constructor(
        private readonly organizationRepository: OrganizationRepository,
        private readonly userRepository: UserRepository,
    ) {}

    async requestCreateOrganization(
        userId: string,
        data: CreateOrganizationInput,
    ) {
        const user = await this.userRepository.findUserById(userId)
        if (!user) {
            throw new NotFoundException("User not found")
        }

        if (user.role !== Role.DONOR) {
            throw new BadRequestException(
                "Only donors can request to create organizations",
            )
        }

        // Check if user already has an organization request
        const existingOrg =
            await this.userRepository.findUserOrganization(userId)
        if (existingOrg) {
            throw new BadRequestException(
                "User already has an organization request or approved organization",
            )
        }

        return this.organizationRepository.createOrganization(userId, data)
    }

    async getPendingOrganizationRequests() {
        return this.organizationRepository.findPendingOrganizations()
    }

    async approveOrganizationRequest(organizationId: string) {
        const organization =
            await this.organizationRepository.findOrganizationById(
                organizationId,
            )
        if (!organization) {
            throw new NotFoundException("Organization not found")
        }

        if (organization.status !== Verification_Status.PENDING) {
            throw new BadRequestException(
                "Organization is not in pending status",
            )
        }

        // Update organization status to VERIFIED
        const updatedOrganization =
            await this.organizationRepository.updateOrganizationStatus(
                organizationId,
                Verification_Status.VERIFIED,
            )

        // Update user role to FUNDRAISER
        await this.userRepository.updateUserRole(
            organization.representative_id,
            Role.FUNDRAISER,
        )

        return updatedOrganization
    }

    async rejectOrganizationRequest(organizationId: string) {
        const organization =
            await this.organizationRepository.findOrganizationById(
                organizationId,
            )
        if (!organization) {
            throw new NotFoundException("Organization not found")
        }

        if (organization.status !== Verification_Status.PENDING) {
            throw new BadRequestException(
                "Organization is not in pending status",
            )
        }

        return this.organizationRepository.updateOrganizationStatus(
            organizationId,
            Verification_Status.REJECTED,
        )
    }

    async getUserOrganization(userId: string) {
        return this.userRepository.findUserOrganization(userId)
    }

    async requestJoinOrganization(userId: string, data: JoinOrganizationInput) {
        // Validate requested role
        if (
            data.requested_role !== Role.KITCHEN_STAFF &&
            data.requested_role !== Role.DELIVERY_STAFF
        ) {
            throw new BadRequestException(
                "Can only request to join as KITCHEN_STAFF or DELIVERY_STAFF",
            )
        }

        // Check if user exists and is a DONOR
        const user = await this.userRepository.findUserById(userId)
        if (!user) {
            throw new NotFoundException("User not found")
        }

        if (user.role !== Role.DONOR) {
            throw new BadRequestException(
                "Only donors can request to join organizations",
            )
        }

        // Check if organization exists and is verified
        const organization =
            await this.organizationRepository.findOrganizationById(
                data.organization_id,
            )
        if (!organization) {
            throw new NotFoundException("Organization not found")
        }

        if (organization.status !== Verification_Status.VERIFIED) {
            throw new BadRequestException("Organization is not verified")
        }

        // Check if user already has a join request or membership
        const existingRequest =
            await this.organizationRepository.checkExistingJoinRequest(
                userId,
                data.organization_id,
            )
        if (existingRequest) {
            throw new BadRequestException(
                "User already has a request or membership with this organization",
            )
        }

        return this.organizationRepository.createJoinRequest(
            userId,
            data.organization_id,
            data.requested_role,
        )
    }

    async getOrganizationJoinRequests(
        organizationId: string,
        fundraiserId: string,
    ) {
        // Verify that the fundraiser is the representative of this organization
        const organization =
            await this.organizationRepository.findOrganizationById(
                organizationId,
            )
        if (!organization) {
            throw new NotFoundException("Organization not found")
        }

        if (organization.representative_id !== fundraiserId) {
            throw new BadRequestException(
                "You are not authorized to view requests for this organization",
            )
        }

        return this.organizationRepository.findPendingJoinRequestsByOrganization(
            organizationId,
        )
    }

    async approveJoinRequest(requestId: string, fundraiserId: string) {
        const joinRequest =
            await this.organizationRepository.findJoinRequestById(
                requestId,
            )
        if (!joinRequest) {
            throw new NotFoundException("Join request not found")
        }

        // Verify that the fundraiser is the representative of this organization
        if (joinRequest.organization.representative_id !== fundraiserId) {
            throw new BadRequestException(
                "You are not authorized to approve this request",
            )
        }

        if (joinRequest.status !== Verification_Status.PENDING) {
            throw new BadRequestException(
                "Join request is not in pending status",
            )
        }

        // Update join request status to VERIFIED
        const updatedRequest =
            await this.organizationRepository.updateJoinRequestStatus(
                requestId,
                Verification_Status.VERIFIED,
            )

        // Update user role to the requested role
        await this.userRepository.updateUserRole(
            joinRequest.member_id,
            joinRequest.member_role as Role,
        )

        return updatedRequest
    }

    async rejectJoinRequest(requestId: string, fundraiserId: string) {
        const joinRequest =
            await this.organizationRepository.findJoinRequestById(
                requestId,
            )
        if (!joinRequest) {
            throw new NotFoundException("Join request not found")
        }

        // Verify that the fundraiser is the representative of this organization
        if (joinRequest.organization.representative_id !== fundraiserId) {
            throw new BadRequestException(
                "You are not authorized to reject this request",
            )
        }

        if (joinRequest.status !== Verification_Status.PENDING) {
            throw new BadRequestException(
                "Join request is not in pending status",
            )
        }

        return this.organizationRepository.updateJoinRequestStatus(
            requestId,
            Verification_Status.REJECTED,
        )
    }

    async getMyJoinRequests(userId: string) {
        // Get all join requests made by the user
        return this.organizationRepository.findUserActiveOrganizationMembership(
            userId,
        )
    }
}
