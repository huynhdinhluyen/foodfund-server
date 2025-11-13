import { CognitoGraphQLGuard, createUserContextFromToken, CurrentUser } from "@app/campaign/src/shared"
import { CampaignStatsResponse } from "../../dtos/response/campaign-stats.response"
import { UseGuards, UseInterceptors } from "@nestjs/common"
import { Args, Query, Resolver } from "@nestjs/graphql"
import { CampaignStatsFilterInput } from "../../dtos/request/campaign-stats-filter.input"
import { CampaignService } from "../../services"
import { SentryInterceptor } from "@libs/observability"

@Resolver()
@UseInterceptors(SentryInterceptor)
export class CampaignStatsQueryResolver {
    constructor(private readonly campaignService: CampaignService) {}

    @Query(() => CampaignStatsResponse)
    async platformCampaignStats(
        @Args("filter", {
            type: () => CampaignStatsFilterInput,
            nullable: true,
        })
            filter?: CampaignStatsFilterInput,
    ): Promise<CampaignStatsResponse> {
        return await this.campaignService.getPlatformStats(filter)
    }

    @Query(() => CampaignStatsResponse)
    async categoryCampaignStats(
        @Args("categoryId", { type: () => String })
            categoryId: string,
    ): Promise<CampaignStatsResponse> {
        return await this.campaignService.getCategoryStats(categoryId)
    }

    @Query(() => CampaignStatsResponse)
    @UseGuards(CognitoGraphQLGuard)
    async myCampaignStats(
        @CurrentUser("decodedToken") decodedToken: any,
    ): Promise<CampaignStatsResponse> {
        const userContext = createUserContextFromToken(decodedToken)
        return await this.campaignService.getUserCampaignStats(userContext)
    }
}