import { Module } from "@nestjs/common"
import { AuthSubgraphService } from "./auth.service"
import { AuthResolver } from "./resolver"
import { GraphQLSubgraphModule } from "libs/graphql/subgraph"
import { AwsCognitoModule } from "libs/aws-cognito"
import { HealthController } from "./health.controller"

@Module({
    providers: [AuthResolver, AuthSubgraphService],
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
