import { Args, ID, Query, Resolver, ResolveReference } from '@nestjs/graphql';
import { User } from '../models/user.model';
import { UsersSubgraphService } from '../service/users-subgraph.service';

@Resolver((of) => User)
export class UsersResolver {
    constructor(private usersService: UsersSubgraphService) { }

    @Query((returns) => User)
    getUser(@Args({ name: 'id', type: () => ID }) id: number): User {
        return this.usersService.findById(id);
    }

    @ResolveReference()
    resolveReference(reference: { __typename: string; id: number }): User {
        return this.usersService.findById(reference.id);
    }
}
