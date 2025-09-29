import { ObjectType, Field, ID } from "@nestjs/graphql"
import { Directive } from "@nestjs/graphql"
import { AbstractSchema } from "../abstract.schema"
import {
    VerificationStatus,
    AvailabilityStatus,
    Role,
} from "../enums/user.enums"

// Main User GraphQL Schema - now inherits all common fields from AbstractSchema
@ObjectType()
@Directive("@shareable")
@Directive("@key(fields: \"id\")")
export class UserProfileSchema extends AbstractSchema {
    
    @Field(() => String, {
        description: "User's full name",
    })
        full_name: string

    @Field(() => String, {
        description: "User email address", 
    })
        email: string

    @Field(() => String, {
        description: "User's avatar URL",
        nullable: true,
    })
        avatar_url?: string

    @Field(() => String, {
        description: "Unique username",
    })
        user_name: string

    @Field(() => Boolean, {
        description: "Whether the user is active",
        defaultValue: true,
    })
        is_active: boolean

    @Field(() => Role, {
        description: "User's role in the system",
    })
        role: Role

    @Field(() => String, {
        description: "User's phone number",
        nullable: true,
    })
        phone_number?: string

    @Field(() => String, {
        nullable: true,
        description: "User's bio/description",
    })
        bio?: string

    __typename?: string

    constructor() {
        super()
    }
}

// Donor Profile Schema
@ObjectType()
export class DonorProfileSchema extends UserProfileSchema {
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
export class KitchenStaffProfileSchema extends UserProfileSchema {
    @Field(() => Number, {
        description: "Total batches prepared",
    })
        totalBatchPrepared: number
}

// Fundraiser Profile Schema
@ObjectType()
export class FundraiserProfileSchema extends UserProfileSchema {
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
export class DeliveryStaffProfileSchema extends UserProfileSchema {
    @Field(() => AvailabilityStatus, {
        description: "Current availability status",
    })
        availabilityStatus: AvailabilityStatus

    @Field(() => Number, {
        description: "Total deliveries completed",
    })
        totalDeliveries: number
}
