import { Injectable, Logger } from "@nestjs/common"
import { GrpcClientService } from "@libs/grpc"
import { envConfig } from "@libs/env"

/**
 * Badge Award Service - MVP Version
 * Auto-award badges based on total donation amount
 * Badges auto-upgrade when user reaches higher milestones
 */

interface BadgeMilestone {
    name: string
    badgeId: string
    minAmount: bigint
    priority: number
}

@Injectable()
export class BadgeAwardService {
    private readonly logger = new Logger(BadgeAwardService.name)
    env = envConfig()

    private readonly milestones: BadgeMilestone[] = [
        {
            name: "Diamond Donor",
            badgeId: this.env.badge.diamondId,
            minAmount: BigInt(500_000_000), // 500M VND
            priority: 110,
        },
        {
            name: "Platinum Donor",
            badgeId: this.env.badge.platinumId,
            minAmount: BigInt(100_000_000), // 100M VND
            priority: 100,
        },
        {
            name: "Gold Donor",
            badgeId: this.env.badge.goldId,
            minAmount: BigInt(10_000_000), // 10M VND
            priority: 90,
        },
        {
            name: "Silver Donor",
            badgeId: this.env.badge.silverId,
            minAmount: BigInt(1_000_000), // 1M VND
            priority: 80,
        },
        {
            name: "Bronze Donor",
            badgeId: this.env.badge.bronzeId,
            minAmount: BigInt(100_000), // 100K VND
            priority: 70,
        },
        {
            name: "First Donation",
            badgeId: this.env.badge.firstDonationId,
            minAmount: BigInt(0), // Any amount
            priority: 10,
        },
    ]

    constructor(private readonly grpcClient: GrpcClientService) {}

    /**
     * Check and award appropriate badge based on total donation amount
     * Called after each successful donation (non-blocking)
     *
     * @param donorId - User ID of the donor
     * @param totalDonationAmount - Total amount donated by user (in VND)
     * @param isFirstDonation - Whether this is user's first donation
     */
    async checkAndAwardBadge(
        donorId: string,
        totalDonationAmount: bigint,
        isFirstDonation: boolean,
    ): Promise<void> {
        try {
            const milestone = this.findHighestMilestone(totalDonationAmount)

            if (!milestone) {
                this.logger.warn(
                    `No badge milestone found for donor ${donorId} with amount ${totalDonationAmount}`,
                )
                return
            }

            this.logger.log(
                `[BadgeAward] Donor ${donorId} qualifies for ${milestone.name} (total: ${totalDonationAmount})`,
            )

            // Award badge via gRPC (will auto-replace if lower priority)
            const response = await this.grpcClient.callUserService(
                "AwardBadgeToDonor",
                {
                    userId: donorId,
                    badgeId: milestone.badgeId,
                },
            )

            if (response.success) {
                this.logger.log(
                    `✅ [BadgeAward] Awarded ${milestone.name} to donor ${donorId}`,
                )
            } else {
                this.logger.error(
                    `❌ [BadgeAward] Failed to award badge: ${response.error}`,
                )
            }
        } catch (error) {
            // Non-blocking: Log error but don't throw
            // Badge award failure should not affect donation flow
            this.logger.error(
                `[BadgeAward] Error awarding badge to donor ${donorId}:`,
                error.message,
            )
        }
    }

    /**
     * Find highest milestone that user qualifies for
     * Milestones are sorted by priority DESC, so first match is highest
     */
    private findHighestMilestone(totalAmount: bigint): BadgeMilestone | null {
        for (const milestone of this.milestones) {
            if (totalAmount >= milestone.minAmount) {
                return milestone
            }
        }
        return null
    }
}
