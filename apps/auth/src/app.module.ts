import { Module } from "@nestjs/common"
import { AuthModule } from "./auth.module"
import { envConfig } from "libs/env"
import { SentryModule } from "libs/observability/sentry.module"
import { EnvModule } from "@libs/env/env.module"
import { AuthLibModule } from "@libs/auth"
import { AwsCognitoModule } from "@libs/aws-cognito"
import { GraphQLSubgraphModule } from "@libs/graphql/subgraph"
import { GrpcModule } from "@libs/grpc"
import { AuthRegistrationService, AuthAuthenticationService, AuthUserService, AuthAdminService } from "./application/use-cases"
import { AuthGrpcService } from "./infrastructure/grpc"
import { AuthRegistrationResolver, AuthAuthenticationResolver, AuthUserResolver, AdminResolver } from "./presentation/graphql/resolvers"

@Module({
    imports: [
        EnvModule.forRoot(),
        SentryModule.forRoot({
            dsn: envConfig().sentry.dsn,
            serviceName: "auth-service",
            environment: envConfig().sentry.environment,
            release: envConfig().sentry.release,
            enableTracing: true,
        }),
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
    controllers: [],
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
})
export class AppModule {}
