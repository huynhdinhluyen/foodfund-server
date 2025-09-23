import {
    ValidatorConstraint,
    ValidatorConstraintInterface,
    ValidationArguments,
    registerDecorator,
    ValidationOptions,
} from "class-validator"
import { Role } from "libs/databases/prisma/schemas/enums/user.enums"

@ValidatorConstraint({ name: "isValidStaffRole", async: false })
export class IsValidStaffRoleConstraint
implements ValidatorConstraintInterface
{
    validate(value: any, args: ValidationArguments) {
        const object = args.object as any
        const role = object.role
        const organizationName = object.organization_name

        // If role is FUNDRAISER, organization_name is required
        if (
            role === Role.FUNDRAISER &&
            (!organizationName || organizationName.trim() === "")
        ) {
            return false
        }

        return true
    }

    defaultMessage(args: ValidationArguments) {
        const object = args.object as any
        const role = object.role

        if (role === Role.FUNDRAISER) {
            return "Organization name is required for FUNDRAISER role"
        }

        return "Invalid staff role configuration"
    }
}

export function IsValidStaffRole(validationOptions?: ValidationOptions) {
    return function (object: object, propertyName: string) {
        registerDecorator({
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [],
            validator: IsValidStaffRoleConstraint,
        })
    }
}