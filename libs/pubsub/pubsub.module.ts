import { Module, DynamicModule } from "@nestjs/common"
import { PubSubService } from "./pubsub.service"

@Module({})
export class PubSubModule {
    static forRoot(): DynamicModule {
        return {
            module: PubSubModule,
            providers: [PubSubService],
            exports: [PubSubService],
        }
    }
}