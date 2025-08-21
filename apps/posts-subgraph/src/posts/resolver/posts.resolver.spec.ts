import { Test, TestingModule } from '@nestjs/testing';
import { PostsResolverResolver } from './posts.resolver';

describe('PostsResolverResolver', () => {
  let resolver: PostsResolverResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PostsResolverResolver],
    }).compile();

    resolver = module.get<PostsResolverResolver>(PostsResolverResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
