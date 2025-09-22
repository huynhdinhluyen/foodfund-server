import { Field, InputType } from "@nestjs/graphql"
import {
    IsEmail,
    IsNotEmpty,
    IsOptional,
    IsString,
    MinLength,
    Matches,
} from "class-validator"
import { Transform } from "class-transformer"
import { IsStrongPassword, IsVietnamesePhone } from "libs/validation"

@InputType()
export class SignUpInput {
    @Field()
    @IsNotEmpty({ message: "Email is required" })
    @IsEmail({}, { message: "Please provide a valid email address" })
    @Transform(({ value }) => value?.toLowerCase().trim())
        email: string

    @Field()
    @IsNotEmpty({ message: "Password is required" })
    @MinLength(6, { message: "Password must be at least 6 characters long" })
        password: string

    @Field()
    @IsString({ message: "Name must be a string" })
    @IsNotEmpty({ message: "Name is required" })
    @Transform(({ value }) => value?.trim())
        name: string

    @Field()
    @IsString({ message: "Phone number must be a string" })
    @IsNotEmpty({ message: "Phone Number is required" })
    @IsVietnamesePhone({
        message: "Please provide a valid Vietnamese phone number",
    })
    @Transform(({ value }) => value?.trim())
        phoneNumber: string
}

@InputType()
export class ConfirmSignUpInput {
    @Field()
    @IsEmail({}, { message: "Please provide a valid email address" })
    @Transform(({ value }) => value?.toLowerCase().trim())
        email: string

    @Field()
    @IsNotEmpty({ message: "Confirmation code is required" })
    @IsString({ message: "Confirmation code must be a string" })
    @Matches(/^\d{6}$/, { message: "Confirmation code must be 6 digits" })
        confirmationCode: string
}

@InputType()
export class SignInInput {
    @Field()
    @IsEmail({}, { message: "Please provide a valid email address" })
    @Transform(({ value }) => value?.toLowerCase().trim())
        email: string

    @Field()
    @IsNotEmpty({ message: "Password is required" })
    @IsString({ message: "Password must be a string" })
        password: string
}

@InputType()
export class ForgotPasswordInput {
    @Field()
    @IsEmail({}, { message: "Please provide a valid email address" })
    @Transform(({ value }) => value?.toLowerCase().trim())
        email: string
}

@InputType()
export class ConfirmForgotPasswordInput {
    @Field()
    @IsEmail({}, { message: "Please provide a valid email address" })
    @Transform(({ value }) => value?.toLowerCase().trim())
        email: string

    @Field()
    @IsNotEmpty({ message: "Confirmation code is required" })
    @IsString({ message: "Confirmation code must be a string" })
    @Matches(/^\d{6}$/, { message: "Confirmation code must be 6 digits" })
        confirmationCode: string

    @Field()
    @IsNotEmpty({ message: "New password is required" })
    @IsStrongPassword({ message: "Password must be strong" })
        newPassword: string
}

@InputType()
export class ResendCodeInput {
    @Field()
    @IsEmail({}, { message: "Please provide a valid email address" })
    @Transform(({ value }) => value?.toLowerCase().trim())
        email: string
}

@InputType()
export class VerifyTokenInput {
    @Field()
    @IsNotEmpty({ message: "Access token is required" })
    @IsString({ message: "Access token must be a string" })
        accessToken: string
}

@InputType()
export class GetUserInput {
    @Field()
    @IsNotEmpty({ message: "User ID is required" })
    @IsString({ message: "User ID must be a string" })
        userId: string
}
