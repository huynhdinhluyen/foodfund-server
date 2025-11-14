import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common"
import { GrpcClientService } from "@libs/grpc"
import { CreateInflowTransactionInput } from "../../dtos"
import { PrismaClient } from "@app/operation/src/generated/operation-client"

@Injectable()
export class InflowTransactionValidationService {
    constructor(
        private readonly grpcClient: GrpcClientService,
        private readonly prisma: PrismaClient,
    ) {}

    private async getFundraiserByPhaseId(phaseId: string): Promise<string> {
        const response = await this.grpcClient.callCampaignService<
            { phaseId: string },
            {
                success: boolean
                fundraiserId: string | null
                error: string | null
            }
        >("GetFundraiserByPhaseId", { phaseId })

        if (!response.success || !response.fundraiserId) {
            throw new NotFoundException(
                response.error ||
                    `Campaign phase ${phaseId} not found or has no fundraiser`,
            )
        }

        return response.fundraiserId
    }

    async validateCreateInput(input: CreateInflowTransactionInput) {
        // Validate amount is positive
        if (BigInt(input.amount) <= 0) {
            throw new BadRequestException("Amount must be greater than 0")
        }

        // Validate proof URL format
        if (!input.proof || input.proof.trim().length === 0) {
            throw new BadRequestException("Proof URL is required")
        }

        // Get fundraiser ID from campaign phase
        const fundraiserId = await this.getFundraiserByPhaseId(input.campaignPhaseId)

        return {
            campaignPhaseId: input.campaignPhaseId,
            fundraiserId,
        }
    }

    async checkDuplicateDisbursement(
        campaignPhaseId: string,
        amount: bigint,
    ): Promise<boolean> {
        // Get today's date range (start and end of day)
        const startOfDay = new Date()
        startOfDay.setHours(0, 0, 0, 0)

        const endOfDay = new Date()
        endOfDay.setHours(23, 59, 59, 999)

        // Query for existing disbursement with same phase, amount, and created today
        const existing = await this.prisma.inflow_Transaction.findFirst({
            where: {
                campaign_phase_id: campaignPhaseId,
                amount: amount,
                created_at: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
            },
        })

        return !!existing
    }
}
