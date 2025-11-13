import { Field, InputType } from "@nestjs/graphql"
import { IsOptional, IsString } from "class-validator"
import { CampaignStatus } from "../../enum"
import { Type } from "class-transformer"

@InputType()
export class CampaignStatsFilterInput {
    @Field(() => String, {
        nullable: true,
        description: "Filter by category ID",
    })
    @IsOptional()
    @IsString()
        categoryId?: string

    @Field(() => String, {
        nullable: true,
        description: "Filter by campaign creator ID",
    })
    @IsOptional()
    @IsString()
        creatorId?: string

    @Field(() => [CampaignStatus], {
        nullable: true,
        description: "Filter by campaign status",
    })
    @IsOptional()
        status?: CampaignStatus[]

    @Field(() => Date, {
        nullable: true,
        description: "Start date for time range filter (ISO 8601)",
    })
    @IsOptional()
    @Type(() => Date)
        dateFrom?: Date

    @Field(() => Date, {
        nullable: true,
        description: "End date for time range filter (ISO 8601)",
    })
    @IsOptional()
    @Type(() => Date)
        dateTo?: Date
}