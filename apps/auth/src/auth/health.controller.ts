import { Controller, Get } from "@nestjs/common"
import { AuthSubgraphService } from "./auth.service"

@Controller("health")
export class HealthController {
    constructor(private readonly service: AuthSubgraphService) {}

  @Get()
    getHealth() {
        return this.service.getHealth()
    }
}
