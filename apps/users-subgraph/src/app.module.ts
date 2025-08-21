import { Module } from '@nestjs/common';
import { UsersSubgraphModule } from './users/users-subgraph.module';
import { UsersResolver } from './users/resolver/users.resolver';

@Module({
  imports: [UsersSubgraphModule],
  controllers: [],
  providers: [UsersResolver],
})
export class AppModule {}