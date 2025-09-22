import { Module } from "@nestjs/common"
import { APP_FILTER } from "@nestjs/core"
import { AuthSubgraphService } from "./auth.service"
import { AuthResolver } from "./resolver"
import { GraphQLSubgraphModule } from "libs/graphql/subgraph"
import { AwsCognitoModule } from "libs/aws-cognito"
import { HealthController } from "./health.controller"
import { AuthGrpcService } from "./grpc"
import { GrpcModule } from "libs/grpc"

@Module({
    providers: [
        AuthResolver,
        AuthSubgraphService,
        AuthGrpcService,
    ],
    imports: [
        GrpcModule,
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
})
export class AuthSubgraphModule {}
