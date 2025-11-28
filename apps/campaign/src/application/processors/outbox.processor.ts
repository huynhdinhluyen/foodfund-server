import { Injectable, Logger } from "@nestjs/common"
import { Cron, CronExpression } from "@nestjs/schedule"
import { UserClientService } from "@app/campaign/src/shared"
import { DonationEmailService } from "../services/donation/donation-email.service"
import { BadgeAwardService } from "../services/donation/badge-award.service"
import { CampaignFollowerService } from "../services/campaign/campaign-follower.service"
import { OutBoxRepository } from "../repositories/outbox.repository"
import { DonorRepository } from "../repositories/donor.repository" // Import thêm cái này
import { OutboxStatus } from "@app/campaign/src/domain/enums/outbox/outbox.enum"
import { envConfig } from "@libs/env"
import { EventEmitter2 } from "@nestjs/event-emitter" // Import thêm cái này
import { CampaignStatus } from "@app/campaign/src/domain/enums/campaign/campaign.enum" // Import thêm cái này

@Injectable()
export class OutboxProcessor {
    private readonly logger = new Logger(OutboxProcessor.name)
    private isProcessing = false
    private readonly adminId = envConfig().systemAdminId

    constructor(
        private readonly outboxRepository: OutBoxRepository,
        private readonly donorRepository: DonorRepository,
        private readonly userClientService: UserClientService,
        private readonly donationEmailService: DonationEmailService,
        private readonly badgeAwardService: BadgeAwardService,
        private readonly campaignFollowerService: CampaignFollowerService,
        private readonly eventEmitter: EventEmitter2,
    ) { }

    @Cron(CronExpression.EVERY_5_SECONDS)
    async handleOutboxEvents() {
        if (this.isProcessing) {
            return
        }
        this.isProcessing = true

        try {
            const events = await this.outboxRepository.findPendingEvents(10)

            for (const event of events) {
                await this.processEvent(event)
            }
        } catch (error) {
            this.logger.error("Error processing outbox events", error.stack)
        } finally {
            this.isProcessing = false
        }
    }

    private async processEvent(event: any) {
        const { payload, event_type } = event
        this.logger.log(`Processing event ${event.id} - Type: ${event_type}`)

        try {
            await this.outboxRepository.updateStatus(event.id, OutboxStatus.PROCESSING)

            if (event_type === "DONATION_PAYMENT_SUCCEEDED") {
                await this.handleDonationSuccess(payload)
            }

            await this.outboxRepository.updateStatus(event.id, OutboxStatus.COMPLETED)
            this.logger.log(`Event ${event.id} processed successfully`)

        } catch (error) {
            this.logger.error(`Failed to process event ${event.id}`, error.stack)
            await this.outboxRepository.incrementRetryCount(event.id, error.message)
        }
    }

    private async handleDonationSuccess(payload: any) {
        const {
            orderCode, amount, paymentTransactionId,
            donorId, campaignId, donorName, gateway
        } = payload

        await this.userClientService.creditAdminWallet({
            adminId: this.adminId,
            campaignId,
            paymentTransactionId,
            amount: BigInt(amount),
            gateway,
            description: `Ủng hộ từ ${donorName || "Anonymous"} - Đơn hàng ${orderCode}`,
        })

        const donation = await this.donorRepository.findByOrderCode(orderCode)

        if (!donation) {
            this.logger.warn(`Donation not found for order ${orderCode}, skipping side effects`)
            return
        }

        const campaign = donation.campaign
        if (
            campaign &&
            campaign.received_amount > campaign.target_amount &&
            campaign.status === CampaignStatus.ACTIVE
        ) {
            const surplus = campaign.received_amount - campaign.target_amount
            this.logger.log(
                `[Outbox] 🎯 Surplus detected for campaign ${campaign.id} - Surplus: ${surplus.toString()} VND`,
            )
            this.eventEmitter.emit("campaign.surplus.detected", {
                campaignId: campaign.id,
                surplus: surplus.toString(),
            })
        }

        try {
            await this.donationEmailService.sendDonationConfirmation(
                donation,
                BigInt(amount),
                campaign,
                gateway,
            )
        } catch (e) {
            this.logger.warn(`Failed to send email for order ${orderCode}`, e)
        }

        if (donorId) {
            try {
                const user = await this.userClientService.getUserByCognitoId(donorId)

                if (user) {
                    await this.userClientService.updateDonorStats({
                        donorId: user.id,
                        amountToAdd: BigInt(amount),
                        incrementCount: 1,
                        lastDonationAt: new Date(),
                    })
                    await this.badgeAwardService.checkAndAwardBadge(user.id)
                } else {
                    this.logger.warn(`User not found for cognitoId: ${donorId}`)
                }
            } catch (e) {
                this.logger.warn(`Failed to update stats for donor ${donorId}`, e)
            }
        }

        await this.campaignFollowerService.invalidateFollowersCache(campaignId)
    }
}