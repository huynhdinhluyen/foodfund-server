import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common"
import { DonationRepository } from "../repositories/donation.repository"
import { CreateDonationInput } from "../dtos/create-donation.input"
import { DonationResponse } from "../dtos/donation-response.dto"
import { CreateDonationRepositoryInput } from "../dtos/create-donation-repository.input"
import { CampaignRepository } from "../../campaign/campaign.repository"
import { CampaignStatus } from "../../campaign/enum/campaign.enum"
import { Donation } from "../models/donation.model"
import { SqsService } from "@libs/aws-sqs"
import { PayOSService } from "@libs/payos"
import { CurrentUserType } from "@libs/auth"
import { v7 as uuidv7 } from "uuid"

@Injectable()
export class DonationService {
    constructor(
        private readonly donationRepository: DonationRepository,
        private readonly campaignRepository: CampaignRepository,
        private readonly sqsService: SqsService,
    private readonly payosService: PayOSService,
    ) {}

    async createDonation(
        input: CreateDonationInput,
        user: CurrentUserType | null,
    ): Promise<DonationResponse> {
        // Basic validation first
        const campaign = await this.campaignRepository.findById(input.campaignId)
        
        if (!campaign) {
            throw new NotFoundException("Campaign not found")
        }

        if (!campaign.isActive) {
            throw new BadRequestException("Campaign is not active")
        }

        // Check campaign status - only allow donations for active campaigns
        if (campaign.status !== CampaignStatus.ACTIVE) {
            throw new BadRequestException(
                `Cannot donate to campaign with status: ${campaign.status}. Campaign must be ACTIVE.`
            )
        }

        // Check if campaign fundraising is within date range
        const now = new Date()
        if (now < campaign.fundraisingStartDate) {
            throw new BadRequestException("Fundraising has not started yet")
        }

        if (now > campaign.fundraisingEndDate) {
            throw new BadRequestException("Fundraising period has ended")
        }

        // Validate donation amount
        const donationAmount = BigInt(input.amount)
        if (donationAmount <= 0) {
            throw new BadRequestException("Donation amount must be greater than 0")
        }

        // Generate UUIDv7 for the donation
        const donationId = uuidv7()
        
        // Determine user info - either authenticated user or anonymous
        const donorId = user?.username || "anonymous"
        const isAnonymous = !user || input.isAnonymous

        // Generate unique order code for tracking
        const orderCode = Date.now()
        
        // Generate transfer content for bank transfer tracking
        const transferContent = `DONATE ${donationId.slice(0, 8)} ${campaign.title.slice(0, 15)}`

        // Tạo payment link qua PayOS
        let payosResult
        try {
            payosResult = await this.payosService.createPaymentLink({
                amount: Number(donationAmount),
                description: transferContent.slice(0, 25),
                orderCode: orderCode,
                returnUrl: "",
                cancelUrl: "", 
            })
        } catch (err) {
            console.error("PayOS createPaymentLink failed", err)
            throw new BadRequestException("Không tạo được mã QR thanh toán. Vui lòng thử lại sau.")
        }

        const qrCode = payosResult?.qrCode || null
        const checkoutUrl = payosResult?.checkoutUrl || null
        const paymentLinkId = payosResult?.paymentLinkId || null
        
        try {
            // Send donation request to SQS queue for background processing
            await this.sqsService.sendMessage({
                messageBody: {
                    eventType: "DONATION_REQUEST",
                    donationId,
                    donorId,
                    campaignId: input.campaignId,
                    amount: donationAmount.toString(),
                    message: input.message,
                    isAnonymous,
                    orderCode,
                    transferContent,
                    status: "PENDING", // Initial status - will be updated when payment received
                    requestedAt: new Date().toISOString(),
                    paymentLinkId,
                    checkoutUrl,
                },
                messageAttributes: {
                    eventType: {
                        DataType: "String",
                        StringValue: "DONATION_REQUEST"
                    },
                    campaignId: {
                        DataType: "String",
                        StringValue: input.campaignId
                    },
                    orderCode: {
                        DataType: "Number",
                        StringValue: orderCode.toString()
                    }
                }
            })

            return {
                message: user 
                    ? `Thank you ${user.name}! Your donation request has been created. Please complete payment by scanning the QR code below.`
                    : "Thank you for your anonymous donation! Please complete payment by scanning the QR code below.",
                donationId,
                checkoutUrl,
                qrCode,
                orderCode,
                paymentLinkId
            }

        } catch (error) {
            console.error("Failed to create donation request:", error)
            throw new BadRequestException("Failed to create donation request. Please try again.")
        }
    }

    async getDonationById(id: string): Promise<Donation | null> {
        const donation = await this.donationRepository.findById(id)
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
        }
    ): Promise<Donation[]> {
        const donations = await this.donationRepository.findByDonorId(donorId, options)
        return donations.map(this.mapDonationToGraphQLModel)
    }

    async getDonationsByCampaign(
        campaignId: string,
        options?: {
            skip?: number
            take?: number
        }
    ): Promise<Donation[]> {
        const donations = await this.donationRepository.findByCampaignId(campaignId, options)
        return donations.map(this.mapDonationToGraphQLModel)
    }

    async getDonationStats(donorId: string): Promise<{
        totalDonated: string
        donationCount: number
        campaignCount: number
    }> {
        const stats = await this.donationRepository.getDonationStats(donorId)
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
        const stats = await this.donationRepository.getTotalDonationsByCampaign(campaignId)
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
            paymentReference: donation.payment_reference,
            isAnonymous: donation.is_anonymous,
            created_at: donation.created_at,
            updated_at: donation.updated_at,
        }
    }
}