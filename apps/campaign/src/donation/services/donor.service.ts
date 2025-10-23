import {
    Injectable,
    BadRequestException,
    Logger,
    NotFoundException,
} from "@nestjs/common"
import { DonorRepository } from "../repositories/donor.repository"
import { CreateDonationInput } from "../dtos/create-donation.input"
import { DonationResponse } from "../dtos/donation-response.dto"
import { CampaignRepository } from "../../campaign/campaign.repository"
import { CampaignStatus } from "../../campaign/enum/campaign.enum"
import { PaymentStatus } from "../../shared/enum/campaign.enum"
import { Donation } from "../models/donation.model"
import { SqsService } from "@libs/aws-sqs"
import { PayOSService } from "@libs/payos"
import { CurrentUserType } from "@libs/auth"
import { v7 as uuidv7 } from "uuid"
import { PrismaClient } from "../../generated/campaign-client"

@Injectable()
export class DonorService {
    private readonly logger = new Logger(DonorService.name)

    constructor(
        private readonly donorRepository: DonorRepository,
        private readonly campaignRepository: CampaignRepository,
        private readonly sqsService: SqsService,
        private readonly payosService: PayOSService,
        private readonly prisma: PrismaClient,
    ) {}

    async createDonation(
        input: CreateDonationInput,
        user: CurrentUserType | null,
    ): Promise<DonationResponse> {
        const campaign = await this.validateCampaignForDonation(
            input.campaignId,
        )
        const donationAmount = this.validateDonationAmount(input.amount)

        const donationId = uuidv7()
        const donorId = user?.username || "anonymous"
        const isAnonymous = !user || (input.isAnonymous ?? false)
        const orderCode = Date.now()
        const transferContent = `DONATE ${donationId.slice(0, 8)} ${campaign.title.slice(0, 15)}`

        const payosResult = await this.createPaymentLink(
            donationAmount,
            transferContent,
            orderCode,
        )

        try {
            await this.createDonationTransaction(
                donationId,
                donorId,
                input.campaignId,
                donationAmount,
                input.message,
                isAnonymous,
                orderCode,
                payosResult,
            )
        } catch (error) {
            await this.handleDonationCreationFailure(
                error,
                donationId,
                orderCode,
                payosResult.paymentLinkId,
            )
        }

        await this.sendDonationNotification(
            donationId,
            donorId,
            input.campaignId,
            donationAmount,
            input.message,
            isAnonymous,
            orderCode,
            transferContent,
            payosResult.paymentLinkId,
            payosResult.checkoutUrl,
        )

        this.logger.log(
            `[TRANSACTION] Donation creation completed successfully: ${donationId}`,
        )

        return {
            message: user
                ? "Thank you! Your donation request has been created. Please complete payment by scanning the QR code below."
                : "Thank you for your anonymous donation! Please complete payment by scanning the QR code below.",
            donationId,
            checkoutUrl: payosResult.checkoutUrl ?? undefined,
            qrCode: payosResult.qrCode ?? undefined,
            orderCode,
            paymentLinkId: payosResult.paymentLinkId ?? undefined,
        }
    }

    private async validateCampaignForDonation(campaignId: string) {
        const campaign = await this.campaignRepository.findById(campaignId)

        if (!campaign) {
            throw new NotFoundException("Campaign not found")
        }

        if (!campaign.isActive) {
            throw new BadRequestException("Campaign is not active")
        }

        if (campaign.status !== CampaignStatus.ACTIVE) {
            throw new BadRequestException(
                `Cannot donate to campaign with status: ${campaign.status}. Campaign must be ACTIVE.`,
            )
        }

        const now = new Date()
        if (now < campaign.fundraisingStartDate) {
            throw new BadRequestException("Fundraising has not started yet")
        }

        if (now > campaign.fundraisingEndDate) {
            throw new BadRequestException("Fundraising period has ended")
        }

        return campaign
    }

    private validateDonationAmount(amount: number): bigint {
        const donationAmount = BigInt(amount)
        if (donationAmount <= 0) {
            throw new BadRequestException(
                "Donation amount must be greater than 0",
            )
        }
        return donationAmount
    }

    private async createPaymentLink(
        donationAmount: bigint,
        transferContent: string,
        orderCode: number,
    ) {
        try {
            this.logger.log(
                `[SAGA] Step 1: Creating PayOS payment link for order ${orderCode}`,
            )

            const payosResult = await this.payosService.createPaymentLink({
                amount: Number(donationAmount),
                description: transferContent.slice(0, 25),
                orderCode: orderCode,
                returnUrl: "",
                cancelUrl: "",
            })

            this.logger.log(
                `[SAGA] PayOS payment link created: ${payosResult.paymentLinkId}`,
            )

            return {
                qrCode: payosResult?.qrCode || null,
                checkoutUrl: payosResult?.checkoutUrl || null,
                paymentLinkId: payosResult?.paymentLinkId || null,
            }
        } catch (error) {
            this.logger.error("[SAGA] Failed to create PayOS payment link", {
                orderCode,
                error: error instanceof Error ? error.message : error,
            })
            throw new BadRequestException(
                "Failed to create payment link. Please try again later.",
            )
        }
    }

    private async createDonationTransaction(
        donationId: string,
        donorId: string,
        campaignId: string,
        donationAmount: bigint,
        message: string | undefined,
        isAnonymous: boolean,
        orderCode: number,
        payosResult: {
            qrCode: string | null
            checkoutUrl: string | null
            paymentLinkId: string | null
        },
    ) {
        this.logger.log(
            `[TRANSACTION] Starting donation creation for ${donationId}`,
        )

        await this.prisma.$transaction(async (tx) => {
            this.logger.debug("[TRANSACTION] Step 2: Creating donation record")
            await tx.donation.create({
                data: {
                    id: donationId,
                    donor_id: donorId,
                    campaign_id: campaignId,
                    amount: donationAmount,
                    message: message ?? "",
                    is_anonymous: isAnonymous,
                },
            })

            this.logger.debug(
                "[TRANSACTION] Step 3: Creating payment transaction",
            )
            await tx.payment_Transaction.create({
                data: {
                    donation_id: donationId,
                    order_code: BigInt(orderCode),
                    amount: donationAmount,
                    payment_link_id: payosResult.paymentLinkId || "",
                    checkout_url: payosResult.checkoutUrl || "",
                    qr_code: payosResult.qrCode || "",
                    status: PaymentStatus.PENDING,
                },
            })

            this.logger.log(
                "[TRANSACTION] Database operations completed successfully",
            )
        })
    }

    private async handleDonationCreationFailure(
        error: unknown,
        donationId: string,
        orderCode: number,
        paymentLinkId: string | null,
    ) {
        this.logger.error(
            "[TRANSACTION] Donation creation failed, attempting to rollback PayOS payment link",
            {
                donationId,
                orderCode,
                paymentLinkId,
                error: error instanceof Error ? error.message : error,
            },
        )

        await this.cancelPayOSPaymentLinkWithRetry(orderCode, paymentLinkId)
        throw new BadRequestException(
            "Failed to create donation request. Please try again.",
        )
    }

    private async sendDonationNotification(
        donationId: string,
        donorId: string,
        campaignId: string,
        donationAmount: bigint,
        message: string | undefined,
        isAnonymous: boolean,
        orderCode: number,
        transferContent: string,
        paymentLinkId: string | null,
        checkoutUrl: string | null,
    ) {
        try {
            this.logger.debug("[NOTIFICATION] Sending donation request to SQS")

            await this.sqsService.sendMessage({
                messageBody: {
                    eventType: "DONATION_REQUEST",
                    donationId,
                    donorId,
                    campaignId,
                    amount: donationAmount.toString(),
                    message,
                    isAnonymous,
                    orderCode,
                    transferContent,
                    status: "PENDING",
                    requestedAt: new Date().toISOString(),
                    paymentLinkId,
                    checkoutUrl,
                },
                messageAttributes: {
                    eventType: {
                        DataType: "String",
                        StringValue: "DONATION_REQUEST",
                    },
                    campaignId: {
                        DataType: "String",
                        StringValue: campaignId,
                    },
                    orderCode: {
                        DataType: "Number",
                        StringValue: orderCode.toString(),
                    },
                },
            })

            this.logger.log("[NOTIFICATION] SQS message sent successfully")
        } catch (sqsError) {
            this.logger.warn(
                "[NOTIFICATION] Failed to send SQS message, but donation created successfully",
                {
                    donationId,
                    orderCode,
                    error:
                        sqsError instanceof Error ? sqsError.message : sqsError,
                },
            )
        }
    }

    /**
     * Cancel PayOS payment link with retry mechanism
     * Retries up to 3 times with exponential backoff
     */
    private async cancelPayOSPaymentLinkWithRetry(
        orderCode: number,
        paymentLinkId: string | null,
        maxRetries = 3,
    ): Promise<void> {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                await this.payosService.cancelPaymentLink(orderCode)
                this.logger.log(
                    `[SAGA ROLLBACK] PayOS payment link cancelled successfully: ${paymentLinkId}`,
                )
                return // Success
            } catch (error) {
                const errorMessage =
                    error instanceof Error ? error.message : String(error)

                if (attempt === maxRetries) {
                    // Final attempt failed - CRITICAL ERROR
                    this.logger.error(
                        `[SAGA ROLLBACK] FAILED: Could not cancel PayOS payment link after ${maxRetries} attempts`,
                        {
                            orderCode,
                            paymentLinkId,
                            error: errorMessage,
                            severity: "CRITICAL",
                            action: "MANUAL_PAYOS_CANCELLATION_REQUIRED",
                            instructions:
                                "Please manually cancel this payment link in PayOS dashboard to prevent unauthorized payments",
                        },
                    )
                    // Don't throw - we already logged the critical error
                    return
                }

                // Wait before retry (exponential backoff)
                const delayMs = Math.pow(2, attempt) * 1000
                this.logger.warn(
                    `[SAGA ROLLBACK] PayOS cancellation attempt ${attempt} failed, retrying in ${delayMs}ms...`,
                )
                await this.delay(delayMs)
            }
        }
    }

    /**
     * Delay helper for retry mechanism
     */
    private delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms))
    }

    async getDonationById(id: string): Promise<Donation | null> {
        const donation = await this.donorRepository.findById(id)
        if (!donation) {
            return null
        }
        return this.mapDonationToGraphQLModel(donation)
    }

    async getDonationsByDonor(
        donorId: string,
        options?: {
            skip?: number
            take?: number
        },
    ): Promise<Donation[]> {
        const donations = await this.donorRepository.findByDonorId(
            donorId,
            options,
        )
        return donations.map(this.mapDonationToGraphQLModel)
    }

    async getDonationsByCampaign(
        campaignId: string,
        options?: {
            skip?: number
            take?: number
        },
    ): Promise<Donation[]> {
        const donations = await this.donorRepository.findByCampaignId(
            campaignId,
            options,
        )
        return donations.map(this.mapDonationToGraphQLModel)
    }

    async getDonationStats(donorId: string): Promise<{
        totalDonated: string
        donationCount: number
        campaignCount: number
    }> {
        const stats = await this.donorRepository.getDonationStats(donorId)
        return {
            totalDonated: stats.totalDonated.toString(),
            donationCount: stats.donationCount,
            campaignCount: stats.campaignCount,
        }
    }

    async getCampaignDonationStats(campaignId: string): Promise<{
        totalAmount: string
        donationCount: number
    }> {
        const stats =
            await this.donorRepository.getTotalDonationsByCampaign(campaignId)
        return {
            totalAmount: stats.totalAmount.toString(),
            donationCount: stats.donationCount,
        }
    }

    private mapDonationToGraphQLModel(donation: any): Donation {
        return {
            id: donation.id,
            donorId: donation.donor_id,
            campaignId: donation.campaign_id,
            amount: donation.amount.toString(),
            message: donation.message,
            isAnonymous: donation.is_anonymous ?? false,
            created_at: donation.created_at,
            updated_at: donation.updated_at,
        }
    }
}
