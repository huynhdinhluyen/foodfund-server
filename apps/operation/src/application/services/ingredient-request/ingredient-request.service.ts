import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from "@nestjs/common"
import { SentryService } from "@libs/observability"
import { IngredientRequestRepository } from "../../repositories"
import {
    AuthorizationService,
    Role,
    UserContext,
} from "@app/operation/src/shared"
import {
    CreateIngredientRequestInput,
    IngredientRequestFilterInput,
    UpdateIngredientRequestStatusInput,
} from "../../dtos"
import { IngredientRequest } from "@app/operation/src/domain"
import { IngredientRequestStatus } from "@app/operation/src/domain/enums"
import { GrpcClientService } from "@libs/grpc"
import { IngredientRequestCacheService } from "./ingredient-request-cache.service"

@Injectable()
export class IngredientRequestService {
    constructor(
        private readonly repository: IngredientRequestRepository,
        private readonly authService: AuthorizationService,
        private readonly sentryService: SentryService,
        private readonly grpcClient: GrpcClientService,
        private readonly cacheService: IngredientRequestCacheService,
    ) {}

    async createRequest(
        input: CreateIngredientRequestInput,
        userContext: UserContext,
    ): Promise<IngredientRequest> {
        try {
            this.authService.requireAuthentication(
                userContext,
                "create ingredient request",
            )

            if (
                userContext.role !== Role.KITCHEN_STAFF &&
                userContext.role !== Role.FUNDRAISER
            ) {
                throw new ForbiddenException(
                    "Only kitchen staff or fundraiser can create ingredient requests",
                )
            }

            if (!input.items || input.items.length === 0) {
                throw new BadRequestException(
                    "At least one ingredient item is required",
                )
            }

            const totalCostNum = parseFloat(input.totalCost)
            if (isNaN(totalCostNum) || totalCostNum <= 0) {
                throw new BadRequestException(
                    "Total cost must be greater than 0",
                )
            }

            for (const item of input.items) {
                if (
                    item.estimatedUnitPrice <= 0 ||
                    item.estimatedTotalPrice <= 0
                ) {
                    throw new BadRequestException(
                        "All item prices must be greater than 0",
                    )
                }
            }

            this.validateItemsTotalCost(input.items, input.totalCost)

            const hasPending =
                await this.repository.hasPendingOrApprovedRequest(
                    input.campaignPhaseId,
                )
            if (hasPending) {
                throw new BadRequestException(
                    "Cannot create new request. There is already a PENDING or APPROVED request for this campaign phase. Please wait for admin approval.",
                )
            }

            await this.validateRequestBudget(
                input.campaignPhaseId,
                BigInt(input.totalCost),
            )

            const request = await this.repository.create(
                input,
                userContext.userId,
            )

            await this.updateCampaignPhaseStatus(
                input.campaignPhaseId,
                "AWAITING_INGREDIENT_DISBURSEMENT",
            )

            const campaignId = await this.repository.getCampaignIdFromPhaseId(
                input.campaignPhaseId,
            )

            await Promise.all([
                this.cacheService.setRequest(request.id, request),
                this.cacheService.deletePhaseRequests(input.campaignPhaseId),
                this.cacheService.deleteUserRequests(userContext.userId),
                this.cacheService.deleteAllRequestLists(),
                this.cacheService.deleteStats(),
                campaignId
                    ? this.invalidateCampaignCache(campaignId)
                    : Promise.resolve(),
            ])

            return request
        } catch (error) {
            this.sentryService.captureError(error as Error, {
                operation: "createIngredientRequest",
                userId: userContext.userId,
                campaignPhaseId: input.campaignPhaseId,
            })
            throw error
        }
    }

    async getRequestById(id: string): Promise<IngredientRequest> {
        try {
            let request = await this.cacheService.getRequest(id)

            if (!request) {
                const dbRequest = await this.repository.findById(id)

                if (!dbRequest) {
                    throw new NotFoundException(
                        `Ingredient request with ID ${id} not found`,
                    )
                }

                request = dbRequest

                await this.cacheService.setRequest(id, request)
            }

            return request
        } catch (error) {
            this.sentryService.captureError(error as Error, {
                operation: "getIngredientRequestById",
                requestId: id,
            })
            throw error
        }
    }

    async getRequests(
        filter?: IngredientRequestFilterInput,
        limit: number = 10,
        offset: number = 0,
    ): Promise<IngredientRequest[]> {
        try {
            const cacheKey = { filter, limit, offset }
            const cachedRequests =
                await this.cacheService.getRequestList(cacheKey)

            if (cachedRequests) {
                return cachedRequests
            }

            let requests: IngredientRequest[]

            if (filter?.campaignId && !filter?.campaignPhaseId) {
                const campaignPhases = await this.getCampaignPhases(
                    filter.campaignId,
                )

                if (campaignPhases.length === 0) {
                    return []
                }

                const phaseIds = campaignPhases.map((phase) => phase.id)

                requests = await this.repository.findByMultipleCampaignPhases(
                    phaseIds,
                    filter.status,
                    filter.sortBy,
                    limit,
                    offset,
                )
            } else {
                requests = await this.repository.findMany(filter, limit, offset)
            }

            await this.cacheService.setRequestList(cacheKey, requests)

            return requests
        } catch (error) {
            this.sentryService.captureError(error as Error, {
                operation: "getIngredientRequests",
                filter,
            })
            throw error
        }
    }

    async getMyRequests(
        userContext: UserContext,
        limit: number = 10,
        offset: number = 0,
    ): Promise<IngredientRequest[]> {
        try {
            this.authService.requireAuthentication(
                userContext,
                "get my ingredient requests",
            )

            const cachedRequests = await this.cacheService.getUserRequests(
                userContext.userId,
                limit,
                offset,
            )

            if (cachedRequests) {
                return cachedRequests
            }

            const requests = await this.repository.findByKitchenStaffId(
                userContext.userId,
                limit,
                offset,
            )

            await this.cacheService.setUserRequests(
                userContext.userId,
                limit,
                offset,
                requests,
            )

            return requests
        } catch (error) {
            this.sentryService.captureError(error as Error, {
                operation: "getMyIngredientRequests",
                userId: userContext.userId,
            })
            throw error
        }
    }

    async updateRequestStatus(
        id: string,
        input: UpdateIngredientRequestStatusInput,
        userContext: UserContext,
    ): Promise<IngredientRequest> {
        try {
            this.authService.requireAdmin(
                userContext,
                "update ingredient request status",
            )

            const existingRequest = await this.repository.findById(id)
            if (!existingRequest) {
                throw new NotFoundException(
                    `Ingredient request with ID ${id} not found`,
                )
            }

            if (existingRequest.status !== IngredientRequestStatus.PENDING) {
                throw new BadRequestException(
                    `Cannot change status from ${existingRequest.status}. Only PENDING requests can be approved/rejected.`,
                )
            }

            const updatedRequest = await this.repository.updateStatus(
                id,
                input.status,
            )

            await Promise.all([
                this.cacheService.setRequest(id, updatedRequest),
                this.cacheService.deletePhaseRequests(
                    existingRequest.campaignPhaseId,
                ),
                this.cacheService.deleteUserRequests(
                    existingRequest.kitchenStaffId,
                ),
                this.cacheService.deleteAllRequestLists(),
                this.cacheService.deleteStats(),
            ])

            return updatedRequest
        } catch (error) {
            this.sentryService.captureError(error as Error, {
                operation: "updateIngredientRequestStatus",
                requestId: id,
                newStatus: input.status,
                adminId: userContext.userId,
            })
            throw error
        }
    }

    private validateItemsTotalCost(
        items: Array<{ estimatedTotalPrice: number; ingredientName: string }>,
        requestTotalCost: string,
    ): void {
        const itemsTotal = items.reduce(
            (sum, item) => sum + item.estimatedTotalPrice,
            0,
        )

        const requestTotal = parseFloat(requestTotalCost)

        if (isNaN(requestTotal)) {
            throw new BadRequestException(
                "Invalid total cost format. Must be a valid number.",
            )
        }

        const difference = Math.abs(itemsTotal - requestTotal)
        const tolerance = 0.01

        if (difference > tolerance) {
            const itemsTotalFormatted = this.formatCurrency(
                BigInt(Math.round(itemsTotal)),
            )
            const requestTotalFormatted = this.formatCurrency(
                BigInt(Math.round(requestTotal)),
            )

            throw new BadRequestException(
                `Tổng chi phí các nguyên liệu (${itemsTotalFormatted} VND) không khớp với ` +
                    `tổng chi phí yêu cầu (${requestTotalFormatted} VND). ` +
                    `Chênh lệch: ${Math.round(difference)} VND. ` +
                    "Vui lòng kiểm tra lại tổng chi phí ước tính của từng item.",
            )
        }
    }

    private async invalidateCampaignCache(campaignId: string): Promise<void> {
        await this.grpcClient.callCampaignService<
            { campaignId: string },
            { success: boolean; error?: string }
        >(
            "InvalidateCampaignCache",
            { campaignId },
            { timeout: 3000, retries: 1 },
        )
    }

    private async getCampaignPhases(campaignId: string): Promise<any[]> {
        try {
            const response = await this.grpcClient.callCampaignService<
                { campaignId: string },
                {
                    success: boolean
                    phases: Array<{
                        id: string
                        campaignId: string
                        phaseName: string
                        location: string
                        ingredientPurchaseDate: string
                        cookingDate: string
                        deliveryDate: string
                    }>
                    error: string | null
                }
            >(
                "GetCampaignPhases",
                { campaignId },
                { timeout: 5000, retries: 2 },
            )

            if (!response.success) {
                throw new BadRequestException(
                    response.error || "Failed to fetch campaign phases",
                )
            }

            return response.phases || []
        } catch (error) {
            this.sentryService.captureError(error as Error, {
                operation: "IngredientRequestService.getCampaignPhases",
                campaignId,
            })
            throw error
        }
    }

    private async updateCampaignPhaseStatus(
        phaseId: string,
        status: string,
    ): Promise<void> {
        try {
            const response = await this.grpcClient.callCampaignService<
                { phaseId: string; status: string },
                { success: boolean; error: string | null }
            >(
                "UpdatePhaseStatus",
                { phaseId, status },
                { timeout: 5000, retries: 2 },
            )

            if (!response.success) {
                throw new Error(
                    response.error || "Failed to update campaign phase status",
                )
            }
        } catch (error) {
            this.sentryService.captureError(error as Error, {
                operation: "updateCampaignPhaseStatus",
                phaseId,
                status,
            })
            throw error
        }
    }

    private async validateRequestBudget(
        phaseId: string,
        requestCost: bigint,
    ): Promise<void> {
        try {
            const response = await this.grpcClient.callCampaignService<
                { phaseId: string },
                {
                    success: boolean
                    phase?: {
                        id: string
                        campaignId: string
                        phaseName: string
                        ingredientFundsAmount: string
                        cookingFundsAmount: string
                        deliveryFundsAmount: string
                    }
                    error: string | null
                }
            >("GetCampaignPhase", { phaseId }, { timeout: 5000, retries: 2 })

            if (!response.success || !response.phase) {
                throw new BadRequestException(
                    response.error || `Campaign phase ${phaseId} not found`,
                )
            }

            const ingredientBudget = BigInt(
                response.phase.ingredientFundsAmount || "0",
            )

            if (ingredientBudget === 0n) {
                throw new BadRequestException(
                    `Chiến dịch "${response.phase.phaseName}" chưa nhận được quyên góp nào. ` +
                        "Không thể tạo yêu cầu mua nguyên liệu khi chưa có kinh phí.",
                )
            }

            if (requestCost > ingredientBudget) {
                const requestCostFormatted = this.formatCurrency(requestCost)
                const budgetFormatted = this.formatCurrency(ingredientBudget)

                throw new BadRequestException(
                    `Tổng chi phí yêu cầu (${requestCostFormatted} VND) vượt quá ngân sách nguyên liệu ` +
                        `được phân bổ cho giai đoạn "${response.phase.phaseName}" (${budgetFormatted} VND). `,
                )
            }
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error
            }
            this.sentryService.captureError(error as Error, {
                operation: "validateIngredientRequestBudget",
                phaseId,
                requestCost: requestCost.toString(),
            })
            throw new BadRequestException(
                "Không thể xác thực ngân sách giai đoạn. Vui lòng thử lại.",
            )
        }
    }

    private formatCurrency(amount: bigint): string {
        return Number(amount).toLocaleString("vi-VN")
    }
}
