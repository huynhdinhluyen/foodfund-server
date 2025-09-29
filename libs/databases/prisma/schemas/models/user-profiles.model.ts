import { ObjectType, Field, ID } from "@nestjs/graphql"
import { Directive } from "@nestjs/graphql"
import { AbstractSchema } from "../abstract.schema"
import {
    VerificationStatus,
    AvailabilityStatus,
} from "../enums/user.enums"

// Main User GraphQL Schema - now inherits all common fields from AbstractSchema
@ObjectType()
@Directive("@key(fields: \"id\")")
export class UserProfileSchema extends AbstractSchema {
}

// Donor Profile Schema
@ObjectType()
export class DonorProfileSchema extends AbstractSchema {
    @Field(() => Number, {
        description: "Total number of donations made",
    })
        donationCount: number

    @Field(() => String, {
        description: "Total amount donated (as string for BigInt)",
    })
        totalDonated: string
}

// Kitchen Staff Profile Schema
@ObjectType()
export class KitchenStaffProfileSchema extends AbstractSchema {
    @Field(() => Number, {
        description: "Total batches prepared",
    })
        totalBatchPrepared: number
}

// Fundraiser Profile Schema
@ObjectType()
export class FundraiserProfileSchema extends AbstractSchema {
    @Field(() => String, {
        description: "Organization name",
    })
        organizationName: string

    @Field(() => String, {
        nullable: true,
        description: "Organization address",
    })
        organizationAddress?: string

    @Field(() => VerificationStatus, {
        description: "Verification status",
    })
        verificationStatus: VerificationStatus

    @Field(() => Number, {
        description: "Total campaigns created",
    })
        totalCampaignCreated: number
}

// Delivery Staff Profile Schema
@ObjectType()
export class DeliveryStaffProfileSchema extends AbstractSchema {
    @Field(() => AvailabilityStatus, {
        description: "Current availability status",
    })
        availabilityStatus: AvailabilityStatus

    @Field(() => Number, {
        description: "Total deliveries completed",
    })
        totalDeliveries: number
}
