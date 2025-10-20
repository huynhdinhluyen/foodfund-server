import { Injectable, Logger } from "@nestjs/common"
import { DonationRepository } from "../repositories/donation.repository"
import { CreateDonationRepositoryInput } from "../dtos/create-donation-repository.input"
import { SqsService } from "@libs/aws-sqs"

export interface DonationRequestMessage {
    eventType: "DONATION_REQUEST"
    donationId: string
    donorId: string
    campaignId: string
    amount: string
    message?: string
    isAnonymous: boolean
    requestedAt: string
    // PayOS tracking fields
    orderCode?: number
    paymentLinkId?: string
    payosTransactionData?: {
        bin: string
        accountNumber: string
        accountName: string
        checkoutUrl: string
        status: string
    }
}

@Injectable()
export class DonationProcessorService {
    private readonly logger = new Logger(DonationProcessorService.name)

    constructor(
        private readonly donationRepository: DonationRepository,
        private readonly sqsService: SqsService,
    ) {}

    async processDonationRequest(message: DonationRequestMessage): Promise<void> {
        try {
            this.logger.log(`Processing donation request: ${message.donationId}`, {
                donorId: message.donorId,
                campaignId: message.campaignId,
                amount: message.amount,
                isAnonymous: message.isAnonymous,
                orderCode: message.orderCode,
                paymentLinkId: message.paymentLinkId
            })

            // Create donation in database with predefined ID
            const donationData: CreateDonationRepositoryInput = {
                donor_id: message.donorId,
                campaign_id: message.campaignId,
                amount: BigInt(message.amount),
                message: message.message,
                is_anonymous: message.isAnonymous,
            }

            const createdDonation = await this.donationRepository.createWithId(message.donationId, donationData)

            // Send success notification to SQS
            await this.sqsService.sendMessage({
                messageBody: {
                    eventType: "DONATION_COMPLETED",
                    donationId: message.donationId,
                    campaignId: message.campaignId,
                    donorId: message.donorId,
                    amount: message.amount,
                    status: "SUCCESS",
                    orderCode: message.orderCode,
                    paymentLinkId: message.paymentLinkId,
                    completedAt: new Date().toISOString(),
                },
                messageAttributes: {
                    eventType: {
                        DataType: "String",
                        StringValue: "DONATION_COMPLETED"
                    },
                    campaignId: {
                        DataType: "String",
                        StringValue: message.campaignId
                    },
                    status: {
                        DataType: "String",
                        StringValue: "SUCCESS"
                    }
                }
            })

            this.logger.log(`Successfully processed donation: ${message.donationId}`, {
                orderCode: message.orderCode,
                paymentLinkId: message.paymentLinkId
            })
        } catch (error) {
            this.logger.error(`Failed to process donation request: ${message.donationId}`, {
                donorId: message.donorId,
                campaignId: message.campaignId,
                orderCode: message.orderCode,
                paymentLinkId: message.paymentLinkId,
                error: error.message,
                stack: error.stack
            })

            // Send failure notification to SQS
            try {
                await this.sqsService.sendMessage({
                    messageBody: {
                        eventType: "DONATION_FAILED",
                        donationId: message.donationId,
                        campaignId: message.campaignId,
                        donorId: message.donorId,
                        amount: message.amount,
                        status: "FAILED",
                        error: error.message,
                        orderCode: message.orderCode,
                        paymentLinkId: message.paymentLinkId,
                        failedAt: new Date().toISOString(),
                    },
                    messageAttributes: {
                        eventType: {
                            DataType: "String",
                            StringValue: "DONATION_FAILED"
                        },
                        campaignId: {
                            DataType: "String",
                            StringValue: message.campaignId
                        },
                        status: {
                            DataType: "String",
                            StringValue: "FAILED"
                        }
                    }
                })
            } catch (notificationError) {
                this.logger.error("Failed to send failure notification", notificationError)
            }

            // Re-throw error for queue retry mechanism
            throw error
        }
    }

    async startQueueConsumer(): Promise<void> {
        this.logger.log("Starting donation queue consumer...")
        
        while (true) {
            try {
                const messages = await this.sqsService.receiveMessages({
                    maxNumberOfMessages: 10,
                    waitTimeSeconds: 20,
                    visibilityTimeout: 300, // 5 minutes
                })

                for (const message of messages) {
                    let messageBody: any = null
                    let shouldDeleteMessage = false
                    
                    try {
                        // Validate message body exists
                        if (!message.Body) {
                            this.logger.warn("Received message with empty body", {
                                messageId: message.MessageId,
                                receiptHandle: message.ReceiptHandle?.slice(0, 20) + "..."
                            })
                            shouldDeleteMessage = true
                            continue
                        }

                        // Try to parse JSON
                        try {
                            messageBody = JSON.parse(message.Body)
                        } catch (jsonError) {
                            this.logger.error("Invalid JSON in SQS message - deleting from queue", {
                                messageId: message.MessageId,
                                body: message.Body.slice(0, 100) + (message.Body.length > 100 ? "..." : ""),
                                error: jsonError.message
                            })
                            shouldDeleteMessage = true
                            continue
                        }

                        // Validate message structure
                        if (!messageBody.eventType) {
                            this.logger.warn("Message missing eventType - deleting from queue", {
                                messageId: message.MessageId,
                                body: JSON.stringify(messageBody).slice(0, 100) + "..."
                            })
                            shouldDeleteMessage = true
                            continue
                        }

                        // Process donation request messages
                        if (messageBody.eventType === "DONATION_REQUEST") {
                            // Validate required fields for donation request
                            const requiredFields = ["donationId", "donorId", "campaignId", "amount"]
                            const missingFields = requiredFields.filter(field => !messageBody[field])
                            
                            if (missingFields.length > 0) {
                                this.logger.error("DONATION_REQUEST missing required fields - deleting from queue", {
                                    messageId: message.MessageId,
                                    missingFields,
                                    body: JSON.stringify(messageBody).slice(0, 200) + "..."
                                })
                                shouldDeleteMessage = true
                                continue
                            }

                            await this.processDonationRequest(messageBody as DonationRequestMessage)
                            shouldDeleteMessage = true
                        } else {
                            // Log unknown event types but don't process them
                            this.logger.debug("Ignoring message with unknown eventType", {
                                eventType: messageBody.eventType,
                                messageId: message.MessageId
                            })
                            // Don't delete unknown event types - might be for other processors
                        }
                    } catch (processingError) {
                        this.logger.error("Error processing individual message", {
                            messageId: message.MessageId,
                            eventType: messageBody?.eventType,
                            error: processingError.message,
                            stack: processingError.stack
                        })
                        
                        // For processing errors (not validation errors), let SQS retry
                        // Don't set shouldDeleteMessage = true here
                    } finally {
                        // Delete message if it was processed successfully or is invalid
                        if (shouldDeleteMessage && message.ReceiptHandle) {
                            try {
                                await this.sqsService.deleteMessage(message.ReceiptHandle)
                                this.logger.debug("Deleted message from queue", {
                                    messageId: message.MessageId
                                })
                            } catch (deleteError) {
                                this.logger.error("Failed to delete message from queue", {
                                    messageId: message.MessageId,
                                    error: deleteError.message
                                })
                            }
                        }
                    }
                }
            } catch (error) {
                this.logger.error("Error in queue consumer loop", error)
                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, 5000))
            }
        }
    }
}