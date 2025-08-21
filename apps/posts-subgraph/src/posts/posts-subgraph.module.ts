import { Module } from '@nestjs/common';
import { PostsResolverResolver } from './resolver/posts.resolver';
import { PostsSubgraphService } from './service/posts-subgraph.service';

@Module({
  imports: [],
  controllers: [],
  providers: [PostsSubgraphService, PostsResolverResolver],
})
export class PostsSubgraphModule {}
