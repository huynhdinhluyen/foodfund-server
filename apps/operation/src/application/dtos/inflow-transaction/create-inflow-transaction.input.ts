import { Field, InputType } from "@nestjs/graphql"
import { IsNotEmpty, IsNumber, IsString } from "class-validator"

@InputType()
export class CreateInflowTransactionInput {
    @Field(() => String, {
        description: "Campaign phase ID for this disbursement",
    })
    @IsNotEmpty()
    @IsString()
        campaignPhaseId: string

    @Field(() => Number, {
        description: "Amount to disburse (in VND)",
    })
    @IsNotEmpty()
    @IsNumber()
        amount: bigint

    @Field(() => String, {
        description: "Proof of bank transfer (S3 URL of screenshot)",
    })
    @IsNotEmpty()
    @IsString()
        proof: string
}
