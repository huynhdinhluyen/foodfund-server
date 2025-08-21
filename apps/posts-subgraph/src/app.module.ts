import { Module } from '@nestjs/common';
import { PostsSubgraphModule } from './posts/posts-subgraph.module';
import { PostsResolverResolver } from './posts/resolver/posts.resolver';

@Module({
  imports: [PostsSubgraphModule],
  controllers: [],
  providers: [PostsResolverResolver],
})
export class AppModule {}