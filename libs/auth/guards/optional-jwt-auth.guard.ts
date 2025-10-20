import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common"
import { GqlExecutionContext } from "@nestjs/graphql"
import * as jwt from "jsonwebtoken"

/**
 * OptionalJwtAuthGuard: Cho phép cả anonymous và authenticated user.
 * Nếu có Authorization Bearer token thì decode và gắn user vào req/user context.
 * Nếu không có token thì next() cho phép anonymous.
 */
@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const gqlCtx = GqlExecutionContext.create(context)
        const req = gqlCtx.getContext().req
        const authHeader = req.headers?.authorization || req.headers?.Authorization
        if (authHeader && typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
            const token = authHeader.slice(7)
            try {
                // TODO: Replace 'your_jwt_secret' with actual secret or use a service
                const decoded = jwt.decode(token, { json: true })
                if (decoded) {
                    req.user = decoded
                }
            } catch (err) {
                // Nếu token lỗi thì vẫn cho qua như anonymous
                req.user = null
            }
        } else {
            req.user = null
        }
        return true // Luôn cho phép đi qua
    }
}
