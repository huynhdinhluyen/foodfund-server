import { Module } from '@nestjs/common';
import { UsersSubgraphService } from './service/users-subgraph.service';
import { UsersResolver } from './resolver/users.resolver';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloFederationDriver, ApolloFederationDriverConfig } from '@nestjs/apollo';
import { ApolloServerPluginInlineTrace } from '@apollo/server/plugin/inlineTrace';


@Module({
  providers: [UsersResolver, UsersSubgraphService],
  imports: [
    GraphQLModule.forRoot<ApolloFederationDriverConfig>({
      driver: ApolloFederationDriver,
      autoSchemaFile: {
        federation: 2,
      },
      plugins: [ApolloServerPluginInlineTrace()],
    }),
  ],
})
export class UsersSubgraphModule {}
