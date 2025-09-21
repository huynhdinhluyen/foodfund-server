import { Module } from "@nestjs/common"
import { APP_FILTER } from "@nestjs/core"
import { AuthSubgraphService } from "./auth.service"
import { AuthResolver } from "./resolver"
import { GraphQLSubgraphModule } from "libs/graphql/subgraph"
import { AwsCognitoModule } from "libs/aws-cognito"
import { HealthController } from "./health.controller"
import { AuthExceptionFilter } from "./filters"

@Module({
    providers: [
        AuthResolver,
        AuthSubgraphService,
        {
            provide: APP_FILTER,
            useClass: AuthExceptionFilter,
        },
    ],
    imports: [
        GraphQLSubgraphModule.forRoot({
            debug: true,
            playground: true,
        }),
        AwsCognitoModule.forRoot({
            isGlobal: true,
            mockMode: false, // Enable for development without AWS credentials
        }),
    ],
    controllers: [HealthController],
    exports: [AuthSubgraphService],
})
export class AuthSubgraphModule {}
