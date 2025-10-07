import { Resolver, Mutation, Args, ID, Query } from "@nestjs/graphql"
import { ValidationPipe } from "@nestjs/common"
import { DonorProfileSchema, Role } from "libs/databases/prisma/schemas"
import { UpdateDonorProfileInput } from "../../dto/profile.input"
import { CreateOrganizationInput, JoinOrganizationInput } from "../../dto/organization.input"
import { DonorService } from "../../services/donor/donor.service"
import { CurrentUser, RequireRole } from "libs/auth"
import { OrganizationService } from "../../services"

@Resolver(() => DonorProfileSchema)
export class DonorProfileResolver {
    constructor(
        private readonly donorService: DonorService,
        private readonly organizationService: OrganizationService,
    ) {}

    @Mutation(() => DonorProfileSchema)
    @RequireRole(Role.DONOR)
    async updateDonorProfile(
        @CurrentUser() user: { cognito_id: string },
        @Args("updateDonorProfileInput", new ValidationPipe())
            updateDonorProfileInput: UpdateDonorProfileInput,
    ) {
        return this.donorService.updateProfile(user.cognito_id, updateDonorProfileInput)
    }

    @Mutation(() => String)
    @RequireRole(Role.DONOR)
    async requestCreateOrganization(
        @CurrentUser() user: any,
        @Args("input") input: CreateOrganizationInput,
    ) {
        const result = await this.organizationService.requestCreateOrganization(user.id, input)
        return result.id
    }

    @Query(() => String, { nullable: true }) 
    @RequireRole(Role.DONOR)
    async myOrganizationRequest(@CurrentUser() user: any) {
        // Get user's organization request (pending, approved, or rejected)
        const result = await this.organizationService.getUserOrganization(user.id)
        return result?.id || null
    }

    // Join Organization methods
    @Mutation(() => String)
    @RequireRole(Role.DONOR)
    async requestJoinOrganization(
        @CurrentUser() user: any,
        @Args("input") input: JoinOrganizationInput,
    ) {
        const result = await this.organizationService.requestJoinOrganization(user.id, input)
        return result.id
    }

    @Query(() => String, { nullable: true })
    @RequireRole(Role.DONOR)
    async myJoinRequest(@CurrentUser() user: any) {
        const result = await this.organizationService.getMyJoinRequests(user.id)
        return result?.id || null
    }
}