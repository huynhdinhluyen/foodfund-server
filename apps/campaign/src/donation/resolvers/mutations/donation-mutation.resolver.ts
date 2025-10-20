import { Args, Mutation, Resolver } from "@nestjs/graphql"
import { UseGuards } from "@nestjs/common"
import { CurrentUser } from "@app/campaign/src/shared"
import { DonationService } from "../../services/donation.service"
import { CreateDonationInput } from "../../dtos/create-donation.input"
import { DonationResponse } from "../../dtos/donation-response.dto"
import { CurrentUserType } from "@libs/auth"
import { OptionalJwtAuthGuard } from "@libs/auth/guards/optional-jwt-auth.guard"

@Resolver(() => DonationResponse)
export class DonationMutationResolver {
    constructor(private readonly donationService: DonationService) {}

    @UseGuards(OptionalJwtAuthGuard)
    @Mutation(() => DonationResponse, {
        description: "Create a new donation for a campaign - supports both authenticated and anonymous users"
    })
    async createDonation(
        @Args("input") input: CreateDonationInput,
        @CurrentUser() user?: CurrentUserType,
    ): Promise<DonationResponse> {
        const userInfo = user || null
        const donation = await this.donationService.createDonation(input, userInfo)
        return donation
    }
}