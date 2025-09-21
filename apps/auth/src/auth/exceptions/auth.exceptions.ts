import { HttpException, HttpStatus } from "@nestjs/common"

// Base Auth Exception
export abstract class AuthException extends HttpException {
  abstract readonly errorCode: string
  abstract readonly errorType: "VALIDATION" | "BUSINESS" | "EXTERNAL" | "SECURITY"
  
  constructor(
      message: string,
      status: HttpStatus,
    public readonly context?: Record<string, any>
  ) {
      super(message, status)
  }

  toSentryContext() {
      return {
          errorCode: this.errorCode,
          errorType: this.errorType,
          context: this.context,
          service: "auth-service",
      }
  }
}

// === VALIDATION ERRORS ===
export class InvalidEmailFormatException extends AuthException {
    readonly errorCode = "AUTH_001"
    readonly errorType = "VALIDATION" as const

    constructor(email: string) {
        super(`Invalid email format: ${email}`, HttpStatus.BAD_REQUEST, { email })
    }
}

export class WeakPasswordException extends AuthException {
    readonly errorCode = "AUTH_002"
    readonly errorType = "VALIDATION" as const

    constructor(requirements: string[]) {
        super(
            "Password does not meet security requirements",
            HttpStatus.BAD_REQUEST,
            { requirements }
        )
    }
}

export class MissingRequiredFieldException extends AuthException {
    readonly errorCode = "AUTH_003"
    readonly errorType = "VALIDATION" as const

    constructor(field: string) {
        super(`Required field missing: ${field}`, HttpStatus.BAD_REQUEST, { field })
    }
}

// === BUSINESS LOGIC ERRORS ===
export class UserAlreadyExistsException extends AuthException {
    readonly errorCode = "AUTH_101"
    readonly errorType = "BUSINESS" as const

    constructor(email: string) {
        super(`User with email ${email} already exists`, HttpStatus.CONFLICT, { email })
    }
}

export class UserNotConfirmedException extends AuthException {
    readonly errorCode = "AUTH_102"
    readonly errorType = "BUSINESS" as const

    constructor(email: string) {
        super(`User ${email} is not confirmed. Please check your email for confirmation code.`, HttpStatus.FORBIDDEN, { email })
    }
}

export class InvalidCredentialsException extends AuthException {
    readonly errorCode = "AUTH_103"
    readonly errorType = "BUSINESS" as const

    constructor(email: string) {
        super("Invalid email or password", HttpStatus.UNAUTHORIZED, { email })
    }
}

export class AccountLockedException extends AuthException {
    readonly errorCode = "AUTH_104"
    readonly errorType = "BUSINESS" as const

    constructor(email: string, lockReason: string) {
        super(`Account is locked: ${lockReason}`, HttpStatus.FORBIDDEN, { email, lockReason })
    }
}

export class InvalidConfirmationCodeException extends AuthException {
    readonly errorCode = "AUTH_105"
    readonly errorType = "BUSINESS" as const

    constructor(email: string) {
        super("Invalid or expired confirmation code", HttpStatus.BAD_REQUEST, { email })
    }
}

export class ConfirmationCodeExpiredException extends AuthException {
    readonly errorCode = "AUTH_106"
    readonly errorType = "BUSINESS" as const

    constructor(email: string) {
        super("Confirmation code has expired. Please request a new one.", HttpStatus.BAD_REQUEST, { email })
    }
}

export class TooManyAttemptsException extends AuthException {
    readonly errorCode = "AUTH_107"
    readonly errorType = "SECURITY" as const

    constructor(email: string, retryAfter: number) {
        super(
            `Too many failed attempts. Please try again after ${retryAfter} minutes.`,
            HttpStatus.TOO_MANY_REQUESTS,
            { email, retryAfter }
        )
    }
}

// === EXTERNAL SERVICE ERRORS ===
export class CognitoServiceException extends AuthException {
    readonly errorCode = "AUTH_201"
    readonly errorType = "EXTERNAL" as const

    constructor(operation: string, cognitoError: string) {
        super(
            `AWS Cognito error during ${operation}`,
            HttpStatus.SERVICE_UNAVAILABLE,
            { operation, cognitoError }
        )
    }
}

export class EmailServiceException extends AuthException {
    readonly errorCode = "AUTH_202"
    readonly errorType = "EXTERNAL" as const

    constructor(email: string, reason: string) {
        super(
            "Failed to send email notification",
            HttpStatus.SERVICE_UNAVAILABLE,
            { email, reason }
        )
    }
}

// === SECURITY ERRORS ===
export class InvalidTokenException extends AuthException {
    readonly errorCode = "AUTH_301"
    readonly errorType = "SECURITY" as const

    constructor(tokenType: string) {
        super(`Invalid ${tokenType} token`, HttpStatus.UNAUTHORIZED, { tokenType })
    }
}

export class TokenExpiredException extends AuthException {
    readonly errorCode = "AUTH_302"
    readonly errorType = "SECURITY" as const

    constructor(tokenType: string) {
        super(`${tokenType} token has expired`, HttpStatus.UNAUTHORIZED, { tokenType })
    }
}

export class SuspiciousActivityException extends AuthException {
    readonly errorCode = "AUTH_303"
    readonly errorType = "SECURITY" as const

    constructor(activity: string, userAgent?: string, ip?: string) {
        super(
            `Suspicious activity detected: ${activity}`,
            HttpStatus.FORBIDDEN,
            { activity, userAgent, ip }
        )
    }
}