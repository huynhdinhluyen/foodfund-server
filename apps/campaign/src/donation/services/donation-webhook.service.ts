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

        const { orderCode, code, desc, amount, description } = payload.data

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

        // Validate payment details
        const validation = this.validatePaymentDetails(
            paymentTransaction,
            amount,
            description,
        )

        let newStatus: PaymentStatus
        let errorDescription: string | undefined

        if (code === "00") {
            // Payment successful from PayOS perspective
            if (validation.isValid) {
                newStatus = PaymentStatus.SUCCESS
            } else {
                // Payment received but has issues
                newStatus = PaymentStatus.FAILED
                errorDescription = validation.errors.join("; ")
                this.logger.warn(
                    `Payment validation failed for order ${orderCode}`,
                    {
                        errors: validation.errors,
                        expected: validation.expected,
                        actual: validation.actual,
                    },
                )
            }
        } else {
            // Payment failed from PayOS
            newStatus = PaymentStatus.FAILED
            errorDescription = desc
        }

        // Idempotency guard: skip if already in terminal state
        const currentStatus = paymentTransaction.status as string

        if (currentStatus === PaymentStatus.SUCCESS) {
            this.logger.log(
                `Payment already processed successfully for order ${orderCode}`,
            )
            return
        }

        if (
            currentStatus === PaymentStatus.FAILED &&
            newStatus === PaymentStatus.FAILED
        ) {
            this.logger.log(
                `Ignoring duplicate FAILED webhook for ${orderCode}`,
            )
            return
        }

        await this.DonorRepository.updatePaymentWithTransaction(
            paymentTransaction.id,
            newStatus,
            {
                customerAccountName: payload.data.counterAccountName,
                customerAccountNumber: payload.data.counterAccountNumber,
                customerBankName: payload.data.counterAccountBankName,
                customerBankId: payload.data.counterAccountBankId,
                description: payload.data.description,
                transactionDateTime: payload.data.transactionDateTime,
                reference: payload.data.reference,
                errorCode: code !== "00" ? code : undefined,
                errorDescription: errorDescription,
                actualAmount: amount,
            },
            newStatus === PaymentStatus.SUCCESS
                ? {
                    campaignId: paymentTransaction.donation.campaign_id,
                    amount: paymentTransaction.amount,
                }
                : undefined,
        )
    }

    /**
     * Validate payment details against expected values
     * Returns validation result with detailed errors
     */
    private validatePaymentDetails(
        paymentTransaction: any,
        actualAmount: number,
        actualDescription: string,
    ): {
        isValid: boolean
        errors: string[]
        expected: { amount: string; description: string }
        actual: { amount: number; description: string }
    } {
        const errors: string[] = []
        const expectedAmount = Number(paymentTransaction.amount)
        const expectedDescription = paymentTransaction.description || ""

        // Validate amount (must match exactly)
        if (actualAmount !== expectedAmount) {
            if (actualAmount < expectedAmount) {
                errors.push(
                    `Số tiền chuyển thiếu: Cần ${expectedAmount} VND, nhận được ${actualAmount} VND`,
                )
            } else {
                errors.push(
                    `Số tiền chuyển thừa: Cần ${expectedAmount} VND, nhận được ${actualAmount} VND`,
                )
            }
        }

        // Validate description (should contain order code or match expected)
        const orderCodeStr = paymentTransaction.order_code.toString()
        const descriptionMatch =
            actualDescription.includes(expectedDescription) ||
            actualDescription.includes(orderCodeStr) ||
            actualDescription
                .toUpperCase()
                .includes(orderCodeStr.toString(36).toUpperCase())

        if (!descriptionMatch) {
            errors.push(
                `Nội dung chuyển khoản không đúng: Cần "${expectedDescription}", nhận được "${actualDescription}"`,
            )
        }

        return {
            isValid: errors.length === 0,
            errors,
            expected: {
                amount: expectedAmount.toString(),
                description: expectedDescription,
            },
            actual: {
                amount: actualAmount,
                description: actualDescription,
            },
        }
    }
}
