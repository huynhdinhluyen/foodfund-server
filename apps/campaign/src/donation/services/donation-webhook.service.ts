import { Injectable, Logger, BadRequestException } from "@nestjs/common"
import { PayOSService } from "@libs/payos"
import { PayOSWebhookPayload } from "../controllers/donation-webhook.controller"
import { DonorRepository } from "../repositories/donor.repository"
import { PaymentStatus } from "../../shared/enum/campaign.enum"

@Injectable()
export class DonationWebhookService {
    private readonly logger = new Logger(DonationWebhookService.name)

    constructor(
        private readonly payosService: PayOSService,
        private readonly DonorRepository: DonorRepository,
    ) {}

    async handlePaymentWebhook(
        payload: PayOSWebhookPayload,
        signature: string,
    ): Promise<void> {
        // Verify webhook signature
        const isValid = this.payosService.verifyWebhookSignature(
            payload.data,
            signature,
        )

        if (!isValid) {
            this.logger.warn("Invalid webhook signature", {
                orderCode: payload.data.orderCode,
            })
            throw new BadRequestException("Invalid webhook signature")
        }

        const { orderCode, code, desc } = payload.data

        // Find payment transaction by order code
        const paymentTransaction =
            await this.DonorRepository.findPaymentTransactionByOrderCode(
                BigInt(orderCode),
            )

        if (!paymentTransaction) {
            this.logger.warn(
                `Payment transaction not found for order ${orderCode}`,
            )
            throw new BadRequestException("Payment transaction not found")
        }

        // Check if already processed
        if (paymentTransaction.status === PaymentStatus.SUCCESS) {
            this.logger.log(`Payment already processed for order ${orderCode}`)
            return
        }

        // Update payment transaction status based on webhook code
        let newStatus: PaymentStatus

        if (code === "00") {
            // Payment successful
            newStatus = PaymentStatus.SUCCESS
            this.logger.log(`Payment successful for order ${orderCode}`)
        } else {
            // Payment failed
            newStatus = PaymentStatus.FAILED
            this.logger.warn(`Payment failed for order ${orderCode}: ${desc}`)
        }

        // Update payment transaction with additional data from webhook
        await this.DonorRepository.updatePaymentTransactionStatus(
            paymentTransaction.id,
            newStatus,
            {
                accountName: payload.data.counterAccountName,
                accountNumber: payload.data.counterAccountNumber,
                accountBankName: payload.data.counterAccountBankName,
                description: payload.data.description,
                transactionDateTime: payload.data.transactionDateTime,
            },
        )

        // If payment successful, update campaign statistics
        if (newStatus === PaymentStatus.SUCCESS) {
            await this.updateCampaignStats(
                paymentTransaction.donation.campaign_id,
                paymentTransaction.amount,
            )
        }

        this.logger.log(`Webhook processed successfully for order ${orderCode}`)
    }

    private async updateCampaignStats(
        campaignId: string,
        amount: bigint,
    ): Promise<void> {
        try {
            // Increment campaign received_amount and donation_count
            await this.DonorRepository.updateCampaignStats(campaignId, amount)
            this.logger.log(
                `Campaign stats updated for ${campaignId}: +${amount}`,
            )
        } catch (error) {
            this.logger.error(
                `Failed to update campaign stats: ${error.message}`,
                error.stack,
            )
            // Don't throw - payment is already successful
        }
    }
}
