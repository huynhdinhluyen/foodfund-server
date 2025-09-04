import { Module } from "@nestjs/common"
import { getHttpUrl } from "libs/common"
import { Container, envConfig } from "libs/env"
import { GraphQLGatewayModule } from "libs/graphql/gateway"

@Module({
    imports: [
        GraphQLGatewayModule.forRoot({
            subgraphs: [
                {
                    name: "auth",
                    url: getHttpUrl({
                        host: envConfig().containers[Container.Auth]?.host,
                        port: envConfig().containers[Container.Auth]?.port,
                        path: "/graphql",
                    }),
                },
            ],
        }),
    ],
    controllers: [],
    providers: [],
})
export class ApiGatewayModule { }
