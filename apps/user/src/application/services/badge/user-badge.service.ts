import {
    Injectable,
    NotFoundException,
    BadRequestException,
    Logger,
} from "@nestjs/common"
import { UserBadgeRepository, BadgeRepository } from "../../repositories"
import { UserRepository } from "../../repositories/user.repository"
import { Role } from "../../../domain/enums"

@Injectable()
export class UserBadgeService {
    private readonly logger = new Logger(UserBadgeService.name)

    constructor(
        private readonly userBadgeRepository: UserBadgeRepository,
        private readonly badgeRepository: BadgeRepository,
        private readonly userRepository: UserRepository,
    ) {}

    async awardBadge(userId: string, badgeId: string, force = false) {
        // Validate user exists
        const user = await this.userRepository.findUserById(userId)
        if (!user) {
            throw new NotFoundException(`User with ID ${userId} not found`)
        }

        // Only DONOR can receive badges
        if (user.role !== Role.DONOR) {
            throw new BadRequestException(
                `Only DONOR users can receive badges. User has role: ${user.role}`,
            )
        }

        // Validate badge exists and is active
        const badge = await this.badgeRepository.findBadgeById(badgeId)
        if (!badge) {
            throw new NotFoundException(`Badge with ID ${badgeId} not found`)
        }

        if (!badge.is_active) {
            throw new BadRequestException(
                `Badge "${badge.name}" is currently inactive and cannot be awarded`,
            )
        }

        // Check if user already has a badge
        const existingBadge =
            await this.userBadgeRepository.findUserBadge(userId)

        if (existingBadge) {
            // If not forcing, skip if same badge
            if (!force && existingBadge.badge_id === badgeId) {
                this.logger.log(
                    `User ${userId} already has badge ${badge.name}, skipping`,
                )
                return existingBadge
            }

            // Replace existing badge (since schema is 1:1)
            this.logger.log(
                `Replacing user ${userId} badge from ${existingBadge.badge.name} to ${badge.name}`,
            )
            await this.userBadgeRepository.revokeBadge(userId)
        }

        this.logger.log(`Awarding badge ${badge.name} to user ${userId}`)
        return this.userBadgeRepository.awardBadge(userId, badgeId)
    }

    async getUserBadge(userId: string) {
        return this.userBadgeRepository.findUserBadge(userId)
    }

    async revokeBadge(userId: string) {
        const userBadge = await this.userBadgeRepository.findUserBadge(userId)
        if (!userBadge) {
            throw new NotFoundException(
                `User with ID ${userId} does not have a badge`,
            )
        }

        this.logger.log(`Revoking badge from user ${userId}`)
        return this.userBadgeRepository.revokeBadge(userId)
    }

    async getBadgeUsers(badgeId: string) {
        const badge = await this.badgeRepository.findBadgeById(badgeId)
        if (!badge) {
            throw new NotFoundException(`Badge with ID ${badgeId} not found`)
        }

        return this.userBadgeRepository.findBadgeUsers(badgeId)
    }
}
