import { Injectable } from '@nestjs/common';

@Injectable()
export class PostsSubgraphService {
  getHello(): string {
    return 'Hello World!';
  }
}
