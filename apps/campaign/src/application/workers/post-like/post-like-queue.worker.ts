import { SqsService } from "@libs/aws-sqs"
import { Injectable, OnModuleInit } from "@nestjs/common"
import { PostLikeRepository } from "../../repositories/post-like.repository"
import { PostCacheService } from "../../services/post/post-cache.service"
import { SentryService } from "@libs/observability"

export enum LikeAction {
    LIKE = "LIKE",
    UNLIKE = "UNLIKE",
}

export interface LikeQueueMessage {
    action: LikeAction
    postId: string
    userId: string
    timestamp: number
}

export interface LikeQueueResponse {
    success: boolean
    message: string
    isLiked: boolean
    tempLikeCount?: number
}

@Injectable()
export class LikeQueueWorkerService implements OnModuleInit {
    private isRunning = false

    constructor(
        private readonly sqsService: SqsService,
        private readonly postLikeRepository: PostLikeRepository,
        private readonly postCacheService: PostCacheService,
        private readonly sentryService: SentryService,
    ) {}

    async onModuleInit() {
        this.startWorker()
    }

    private startWorker() {
        if (this.isRunning) {
            return
        }

        this.isRunning = true

        setImmediate(async () => {
            try {
                await this.processLikeQueue()
            } catch (error) {
                this.isRunning = false
                setTimeout(() => this.startWorker(), 10000)
            }
        })
    }

    private async processLikeQueue(): Promise<void> {
        while (this.isRunning) {
            try {
                const messages = await this.sqsService.receiveMessages({
                    maxNumberOfMessages: 10,
                    waitTimeSeconds: 20,
                    visibilityTimeout: 300,
                })

                if (messages.length === 0) {
                    continue
                }

                for (const message of messages) {
                    let shouldDelete = false

                    try {
                        shouldDelete = await this.processMessage(message)
                    } catch (error) {
                        this.sentryService.captureError(error as Error, {
                            operation: "processLikeMessage",
                            messageId: message.MessageId,
                        })
                    } finally {
                        if (shouldDelete && message.ReceiptHandle) {
                            await this.sqsService.deleteMessage(
                                message.ReceiptHandle,
                            )
                        }
                    }
                }
            } catch (error) {
                await new Promise((resolve) => setTimeout(resolve, 5000))
            }
        }
    }

    private async processMessage(message: any): Promise<boolean> {
        try {
            const body = JSON.parse(message.Body)
            const likeMessage: LikeQueueMessage = body

            if (!this.validateMessage(likeMessage)) {
                return true
            }

            const { action, postId, userId, timestamp } = likeMessage

            if (action === LikeAction.LIKE) {
                await this.processLike(postId, userId)
            } else if (action === LikeAction.UNLIKE) {
                await this.processUnlike(postId, userId)
            } else {
                return true
            }

            return true
        } catch (error) {
            return false
        }
    }

    private async processLike(postId: string, userId: string): Promise<void> {
        const alreadyLiked = await this.postLikeRepository.checkIfUserLikedPost(
            postId,
            userId,
        )

        if (alreadyLiked) {
            return
        }

        const result = await this.postLikeRepository.likePost(postId, userId)

        await this.postCacheService.initializeDistributedLikeCounter(
            postId,
            result.likeCount,
        )

        await this.postCacheService.deletePost(postId)
    }

    private async processUnlike(postId: string, userId: string): Promise<void> {
        const hasLiked = await this.postLikeRepository.checkIfUserLikedPost(
            postId,
            userId,
        )

        if (!hasLiked) {
            return
        }

        const result = await this.postLikeRepository.unlikePost(postId, userId)

        await this.postCacheService.initializeDistributedLikeCounter(
            postId,
            result.likeCount,
        )

        await this.postCacheService.deletePost(postId)
    }

    private validateMessage(message: any): message is LikeQueueMessage {
        return (
            message &&
            typeof message === "object" &&
            typeof message.action === "string" &&
            (message.action === LikeAction.LIKE ||
                message.action === LikeAction.UNLIKE) &&
            typeof message.postId === "string" &&
            typeof message.userId === "string" &&
            typeof message.timestamp === "number"
        )
    }

    async onModuleDestroy() {
        this.isRunning = false
    }
}
