import { IntrospectAndCompose } from '@apollo/gateway';
import { ApolloGatewayDriver, ApolloGatewayDriverConfig } from '@nestjs/apollo';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { GraphQLGatewayModule } from 'libs/graphql/gateway';

@Module({
  imports: [
    GraphQLGatewayModule.forRoot({
      subgraphs: [
        {
          name: 'auth',
          url: 'http://localhost:8002/graphql',
        },
      ],
    }),
  ],
  controllers: [],
  providers: [],
})
export class ApiGatewayModule {}
