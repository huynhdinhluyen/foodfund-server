import { Test, TestingModule } from "@nestjs/testing"
import { AuthSubgraphService } from "../auth.service"
import { Logger } from "@nestjs/common"
import { SignUpInput, ConfirmSignUpInput, SignInInput } from "../dto"
import { AwsCognitoService } from "libs/aws-cognito"

// Mock AwsCognitoService
const mockAwsCognitoService = {
    signUp: jest.fn(),
    confirmSignUp: jest.fn(),
    signIn: jest.fn(),
    forgotPassword: jest.fn(),
    confirmForgotPassword: jest.fn(),
    resendConfirmationCode: jest.fn(),
    validateToken: jest.fn(),
    getUser: jest.fn(),
    getUserByUsername: jest.fn(),
    getAttributeValue: jest.fn().mockImplementation((attrs, attr) => {
        const attribute = attrs.find((a) => a.Name === attr)
        return attribute ? attribute.Value : undefined
    }),
    extractCustomAttributes: jest.fn(),
}

describe("AuthSubgraphService", () => {
    let service: AuthSubgraphService

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthSubgraphService,
                Logger,
                { provide: AwsCognitoService, useValue: mockAwsCognitoService },
            ],
        }).compile()

        service = module.get<AuthSubgraphService>(AuthSubgraphService)
        jest.clearAllMocks()
    })

    it("should be defined", () => {
        expect(service).toBeDefined()
    })

    describe("signUp", () => {
        it("should call AwsCognitoService.signUp and return result", async () => {
            const input: SignUpInput = {
                email: "test@example.com",
                password: "Password123!",
                name: "Test User",
                phoneNumber: "+84901234567",
            }
            const mockResult = { success: true }
            mockAwsCognitoService.signUp.mockResolvedValueOnce(mockResult)

            const result = await service.signUp(input)
            expect(mockAwsCognitoService.signUp).toHaveBeenCalledWith(
                input.email,
                input.password,
                expect.objectContaining({
                    name: input.name,
                    phone_number: input.phoneNumber,
                }),
            )
            expect(result).toEqual(mockResult)
        })
    })

    describe("confirmSignUp", () => {
        it("should call AwsCognitoService.confirmSignUp and return result", async () => {
            const input: ConfirmSignUpInput = {
                email: "test@example.com",
                confirmationCode: "123456",
            }
            const mockResult = { success: true }
            mockAwsCognitoService.confirmSignUp.mockResolvedValueOnce(mockResult)

            const result = await service.confirmSignUp(input)
            expect(mockAwsCognitoService.confirmSignUp).toHaveBeenCalledWith(
                input.email,
                input.confirmationCode,
            )
            expect(result).toEqual(mockResult)
        })
    })

    describe("signIn", () => {
        it("should call AwsCognitoService.signIn and return result", async () => {
            const input: SignInInput = {
                email: "test@example.com",
                password: "Password123!",
            }
            const mockResult = { accessToken: "token" }
            mockAwsCognitoService.signIn.mockResolvedValueOnce(mockResult)

            const result = await service.signIn(input)
            expect(mockAwsCognitoService.signIn).toHaveBeenCalledWith(
                input.email,
                input.password,
            )
            expect(result).toEqual(mockResult)
        })
    })

    describe("forgotPassword", () => {
        it("should call AwsCognitoService.forgotPassword and return result", async () => {
            const email = "test@example.com"
            const mockResult = { success: true }
            mockAwsCognitoService.forgotPassword.mockResolvedValueOnce(mockResult)

            const result = await service.forgotPassword(email)
            expect(mockAwsCognitoService.forgotPassword).toHaveBeenCalledWith(email)
            expect(result).toEqual(mockResult)
        })
    })

    describe("confirmForgotPassword", () => {
        it("should call AwsCognitoService.confirmForgotPassword and return result", async () => {
            const email = "test@example.com"
            const code = "123456"
            const newPassword = "NewPassword123!"
            const mockResult = { success: true }
            mockAwsCognitoService.confirmForgotPassword.mockResolvedValueOnce(mockResult)

            const result = await service.confirmForgotPassword(email, code, newPassword)
            expect(mockAwsCognitoService.confirmForgotPassword).toHaveBeenCalledWith(
                email,
                code,
                newPassword,
            )
            expect(result).toEqual(mockResult)
        })
    })

    describe("resendConfirmationCode", () => {
        it("should call AwsCognitoService.resendConfirmationCode and return result", async () => {
            const email = "test@example.com"
            const mockResult = { success: true }
            mockAwsCognitoService.resendConfirmationCode.mockResolvedValueOnce(mockResult)

            const result = await service.resendConfirmationCode(email)
            expect(mockAwsCognitoService.resendConfirmationCode).toHaveBeenCalledWith(email)
            expect(result).toEqual(mockResult)
        })
    })
})