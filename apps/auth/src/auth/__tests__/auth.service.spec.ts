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
                {
                    provide: AwsCognitoService,
                    useValue: mockAwsCognitoService,
                },
                Logger,
            ],
        }).compile()

        service = module.get<AuthSubgraphService>(AuthSubgraphService)
    })

    afterEach(() => {
        jest.clearAllMocks()
    })

    it("should be defined", () => {
        expect(service).toBeDefined()
    })

    describe("signUp", () => {
        it("should sign up a user and return userSub", async () => {
            const signUpInput: SignUpInput = {
                email: "moratemple6309@gmail.com",
                password: "password123",
                name: "Test User",
                phoneNumber: "+1234567890",
            }
            const cognitoResult = { userSub: "some-user-sub" }
            mockAwsCognitoService.signUp.mockResolvedValue(cognitoResult)

            const result = await service.signUp(signUpInput)

            expect(mockAwsCognitoService.signUp).toHaveBeenCalledWith(
                signUpInput.email,
                signUpInput.password,
                { name: signUpInput.name, phone_number: signUpInput.phoneNumber },
            )
            expect(result).toEqual({
                userSub: cognitoResult.userSub,
                message:
          "Sign up successful. Please check your email for verification code.",
                emailSent: true,
            })
        })
    })

    describe("confirmSignUp", () => {
        it("should confirm a user sign up", async () => {
            const confirmSignUpInput: ConfirmSignUpInput = {
                email: "moratemple6309@gmail.com",
                confirmationCode: "123456",
            }
            mockAwsCognitoService.confirmSignUp.mockResolvedValue({})

            const result = await service.confirmSignUp(confirmSignUpInput)

            expect(mockAwsCognitoService.confirmSignUp).toHaveBeenCalledWith(
                confirmSignUpInput.email,
                confirmSignUpInput.confirmationCode,
            )
            expect(result).toEqual({
                confirmed: true,
                message: "Email confirmed successfully. You can now sign in.",
            })
        })
    })

    describe("signIn", () => {
        it("should sign in a user and return auth tokens and user info", async () => {
            const signInInput: SignInInput = {
                email: "moratemple6309@gmail.com",
                password: "password123",
            }
            const authResult = {
                AccessToken: "access-token",
                RefreshToken: "refresh-token",
                IdToken: "id-token",
                ExpiresIn: 3600,
            }
            const userResponse = {
                Username: "test-user",
                UserAttributes: [
                    { Name: "email", Value: "moratemple6309@gmail.com" },
                    { Name: "name", Value: "Test User" },
                ],
                UserCreateDate: new Date(),
            }
            mockAwsCognitoService.signIn.mockResolvedValue(authResult)
            mockAwsCognitoService.getUser.mockResolvedValue(userResponse)

            const result = await service.signIn(signInInput)

            expect(mockAwsCognitoService.signIn).toHaveBeenCalledWith(
                signInInput.email,
                signInInput.password,
            )
            expect(mockAwsCognitoService.getUser).toHaveBeenCalledWith(
                authResult.AccessToken,
            )
            expect(result).toHaveProperty("accessToken", authResult.AccessToken)
            expect(result.user).toBeDefined()
            expect(result.user.email).toBe("moratemple6309@gmail.com")
        })
    })

    describe("forgotPassword", () => {
        it("should send a password reset code", async () => {
            const email = "moratemple6309@gmail.com"
            mockAwsCognitoService.forgotPassword.mockResolvedValue({})

            const result = await service.forgotPassword(email)

            expect(mockAwsCognitoService.forgotPassword).toHaveBeenCalledWith(email)
            expect(result).toEqual({
                emailSent: true,
                message: "Password reset code sent to your email.",
            })
        })
    })

    describe("confirmForgotPassword", () => {
        it("should reset the password with a confirmation code", async () => {
            const email = "moratemple6309@gmail.com"
            const confirmationCode = "123456"
            const newPassword = "newPassword123"
            mockAwsCognitoService.confirmForgotPassword.mockResolvedValue({})

            const result = await service.confirmForgotPassword(
                email,
                confirmationCode,
                newPassword,
            )

            expect(mockAwsCognitoService.confirmForgotPassword).toHaveBeenCalledWith(
                email,
                confirmationCode,
                newPassword,
            )
            expect(result).toEqual({
                passwordReset: true,
                message:
          "Password reset successful. You can now sign in with your new password.",
            })
        })
    })

    describe("resendConfirmationCode", () => {
        it("should resend the confirmation code", async () => {
            const email = "moratemple6309@gmail.com"
            mockAwsCognitoService.resendConfirmationCode.mockResolvedValue({})

            const result = await service.resendConfirmationCode(email)

            expect(mockAwsCognitoService.resendConfirmationCode).toHaveBeenCalledWith(
                email,
            )
            expect(result).toEqual({
                emailSent: true,
                message: "Confirmation code resent to your email.",
            })
        })
    })

    describe("getHealth", () => {
        it("should return a health check response", () => {
            const result = service.getHealth()
            expect(result.status).toBe("healthy")
            expect(result.service).toContain("Auth Subgraph")
            expect(result).toHaveProperty("timestamp")
        })
    })
})
