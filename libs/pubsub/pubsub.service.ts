import { RedisService } from "@libs/redis"
import { Injectable, Logger, OnModuleInit } from "@nestjs/common"
import { RedisPubSub } from "graphql-redis-subscriptions"

@Injectable()
export class PubSubService implements OnModuleInit {
    private readonly logger = new Logger(PubSubService.name)
    private pubsub: RedisPubSub | null = null

    constructor(private readonly redisService: RedisService) {}

    async onModuleInit(): Promise<void> {
        let retries = 0
        const maxRetries = 50
        let waitTime = 100

        while (!this.redisService.isAvailable() && retries < maxRetries) {
            if (retries % 10 === 0) {
                this.logger.log(
                    `Waiting for Redis connection... (${retries * 100}ms)`,
                )
            }
            await new Promise((resolve) => setTimeout(resolve, waitTime))
            retries++
            if (retries > 20) {
                waitTime = 200
            }
        }

        if (!this.redisService.isAvailable()) {
            const errorMsg = `⚠️  Redis not available after ${maxRetries * 100}ms. PubSub will be disabled.`
            this.logger.warn(errorMsg)
            this.logger.warn("⚠️  GraphQL subscriptions will not work without Redis")
            return
        }

        this.logger.log("✅ Redis ready, creating PubSub instance")

        try {
            const client = this.redisService.getClient()

            this.pubsub = new RedisPubSub({
                publisher: client,
                subscriber: client,
            })

            this.logger.log("✅ PubSub initialized successfully")
        } catch (error) {
            this.logger.error("❌ Failed to initialize PubSub", error)
            this.logger.warn("⚠️  Service will continue without PubSub")
        }
    }

    getPubSub(): RedisPubSub {
        if (!this.pubsub) {
            throw new Error("PubSub not initialized. Call onModuleInit first.")
        }
        return this.pubsub
    }

    async publish(channel: string, payload: any): Promise<void> {
        if (!this.pubsub) {
            this.logger.warn("⚠️  PubSub not available, skipping publish")
            return
        }

        try {
            await this.pubsub.publish(channel, payload)
        } catch (error) {
            this.logger.error(`Failed to publish to channel ${channel}`, error)
        }
    }

    asyncIterator<T = any>(triggers: string | string[]): AsyncIterator<T> {
        if (!this.pubsub) {
            throw new Error("PubSub not initialized - subscriptions unavailable")
        }
        return this.pubsub.asyncIterator(triggers)
    }
}
