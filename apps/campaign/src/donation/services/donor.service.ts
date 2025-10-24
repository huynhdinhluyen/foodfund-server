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
import { Donation } from "../models/donation.model"
import { SqsService } from "@libs/aws-sqs"
import { PayOSService } from "@libs/payos"
import { CurrentUserType } from "@libs/auth"
import { formatPaymentDescription } from "@libs/common"
import { v7 as uuidv7 } from "uuid"

@Injectable()
export class DonorService {
    private readonly logger = new Logger(DonorService.name)

    constructor(
        private readonly donorRepository: DonorRepository,
        private readonly campaignRepository: CampaignRepository,
        private readonly sqsService: SqsService,
        private readonly payosService: PayOSService,
    ) {}

    async createDonation(
        input: CreateDonationInput,
        user: CurrentUserType | null,
    ): Promise<DonationResponse> {
        // Step 1: Validate campaign
        const campaign = await this.validateCampaignForDonation(
            input.campaignId,
        )
        const donationAmount = this.validateDonationAmount(input.amount)

        // Step 2: Generate IDs and prepare data
        const donationId = uuidv7()
        const donorId = user?.username || "anonymous"
        const isAnonymous = !user || (input.isAnonymous ?? false)
        const orderCode = Date.now()
        const orderCodeStr = orderCode.toString(36).toUpperCase()

        // Step 3: Create PayOS payment link (synchronous - user needs this immediately)
        const transferContent = formatPaymentDescription(
            orderCodeStr,
            campaign.title,
            25,
        )

        const payosResult = await this.createPaymentLink(
            donationAmount,
            transferContent,
            orderCode,
        )

        // Step 4: Send to queue for async DB processing
        try {
            await this.sqsService.sendMessage({
                messageBody: {
                    eventType: "DONATION_CREATE_REQUEST",
                    donationId,
                    donorId,
                    campaignId: input.campaignId,
                    amount: input.amount.toString(),
                    message: input.message,
                    isAnonymous,
                    orderCode,
                    paymentLinkId: payosResult.paymentLinkId,
                    checkoutUrl: payosResult.checkoutUrl,
                    qrCode: payosResult.qrCode,
                    requestedAt: new Date().toISOString(),
                },
                messageAttributes: {
                    eventType: {
                        DataType: "String",
                        StringValue: "DONATION_CREATE_REQUEST",
                    },
                    campaignId: {
                        DataType: "String",
                        StringValue: input.campaignId,
                    },
                    orderCode: {
                        DataType: "Number",
                        StringValue: orderCode.toString(),
                    },
                },
            })

            this.logger.log(
                `[QUEUE] Donation request sent to queue: ${donationId}`,
            )
        } catch (sqsError) {
            // Log error but don't fail the request - we'll retry via SQS DLQ
            this.logger.error(
                "[QUEUE] Failed to send donation to queue, but payment link created",
                {
                    donationId,
                    orderCode,
                    error:
                        sqsError instanceof Error ? sqsError.message : sqsError,
                },
            )
        }

        // Step 5: Return payment details immediately to user
        return {
            message: user
                ? "Thank you! Your donation request has been created. Please complete payment by scanning the QR code or transfer manually using the bank details below."
                : "Thank you for your anonymous donation! Please complete payment by scanning the QR code or transfer manually using the bank details below.",
            donationId,
            qrCode: payosResult.qrCode ?? undefined,
            orderCode,
            paymentLinkId: payosResult.paymentLinkId ?? undefined,
            // Bank transfer information from PayOS response
            bankName: payosResult.bin ?? undefined,
            accountNumber: payosResult.accountNumber ?? undefined,
            accountName: payosResult.accountName ?? undefined,
            amount: Number(donationAmount),
            description: transferContent,
        }
    }

    private async createPaymentLink(
        donationAmount: bigint,
        transferContent: string,
        orderCode: number,
    ) {
        try {
            this.logger.log(
                `[PAYOS] Creating payment link for order ${orderCode}`,
            )

            const payosResult = await this.payosService.createPaymentLink({
                amount: Number(donationAmount),
                description: transferContent,
                orderCode: orderCode,
                returnUrl: "",
                cancelUrl: "",
            })

            this.logger.log(
                `[PAYOS] Payment link created: ${payosResult.paymentLinkId}`,
            )

            return {
                qrCode: payosResult?.qrCode || null,
                checkoutUrl: payosResult?.checkoutUrl || null,
                paymentLinkId: payosResult?.paymentLinkId || null,
                // Bank information for manual transfer
                bin: payosResult?.bin || null,
                accountNumber: payosResult?.accountNumber || null,
                accountName: payosResult?.accountName || null,
            }
        } catch (error) {
            this.logger.error("[PAYOS] Failed to create payment link", {
                orderCode,
                error: error instanceof Error ? error.message : error,
            })
            throw new BadRequestException(
                "Failed to create payment link. Please try again later.",
            )
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
