import { Args, Resolver, Mutation, Context } from "@nestjs/graphql"
import { AuthAdminService } from "../../../application/use-cases/auth-admin.service"

@Resolver()
export class AdminResolver {
    constructor(private readonly adminService: AuthAdminService) {}
}
