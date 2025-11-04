import { Module } from "@nestjs/common"
import { GraphQLSubgraphModule } from "libs/graphql/subgraph"
import { AwsCognitoModule } from "libs/aws-cognito"
import { GrpcModule } from "libs/grpc"
import { AuthLibModule } from "libs/auth/auth.module"

// Presentation Layer
import { HealthController } from "./presentation/http/controllers"
import {
    AuthRegistrationResolver,
    AuthAuthenticationResolver,
    AuthUserResolver,
    AdminResolver,
} from "./presentation/graphql/resolvers"

// Application Layer
import {
    AuthRegistrationService,
    AuthAuthenticationService,
    AuthUserService,
    AuthAdminService,
} from "./application/use-cases"

// Infrastructure Layer
import { AuthGrpcService } from "./infrastructure/grpc"

@Module({
    providers: [
        // Resolvers (Presentation Layer)
        AuthRegistrationResolver,
        AuthAuthenticationResolver,
        AuthUserResolver,
        AdminResolver,

        // Services (Application Layer)
        AuthRegistrationService,
        AuthAuthenticationService,
        AuthUserService,
        AuthAdminService,

        // gRPC (Infrastructure Layer)
        AuthGrpcService,
    ],
    imports: [
        GrpcModule,
        AuthLibModule,
        GraphQLSubgraphModule.forRoot({
            debug: true,
            playground: true,
        }),
        AwsCognitoModule.forRoot({
            isGlobal: true,
            mockMode: false,
        }),
    ],
    controllers: [HealthController],
})
export class AuthModule {}
