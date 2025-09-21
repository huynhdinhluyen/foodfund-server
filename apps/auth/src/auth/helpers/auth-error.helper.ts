import {
    InvalidEmailFormatException,
    WeakPasswordException,
    MissingRequiredFieldException,
    UserAlreadyExistsException,
    UserNotConfirmedException,
    InvalidCredentialsException,
    AccountLockedException,
    InvalidConfirmationCodeException,
    ConfirmationCodeExpiredException,
    TooManyAttemptsException,
    CognitoServiceException,
    EmailServiceException,
    InvalidTokenException,
    TokenExpiredException,
    SuspiciousActivityException,
} from "../exceptions"

export class AuthErrorHelper {
    // Validation helpers
    static throwInvalidEmail(email: string): never {
        throw new InvalidEmailFormatException(email)
    }

    static throwWeakPassword(requirements: string[]): never {
        throw new WeakPasswordException(requirements)
    }

    static throwMissingField(field: string): never {
        throw new MissingRequiredFieldException(field)
    }

    // Business logic helpers
    static throwUserAlreadyExists(email: string): never {
        throw new UserAlreadyExistsException(email)
    }

    static throwUserNotConfirmed(email: string): never {
        throw new UserNotConfirmedException(email)
    }

    static throwInvalidCredentials(email: string): never {
        throw new InvalidCredentialsException(email)
    }

    static throwAccountLocked(email: string, reason: string): never {
        throw new AccountLockedException(email, reason)
    }

    static throwInvalidConfirmationCode(email: string): never {
        throw new InvalidConfirmationCodeException(email)
    }

    static throwConfirmationCodeExpired(email: string): never {
        throw new ConfirmationCodeExpiredException(email)
    }

    static throwTooManyAttempts(email: string, retryAfter: number): never {
        throw new TooManyAttemptsException(email, retryAfter)
    }

    // External service helpers
    static throwCognitoError(operation: string, cognitoError: string): never {
        throw new CognitoServiceException(operation, cognitoError)
    }

    static throwEmailServiceError(email: string, reason: string): never {
        throw new EmailServiceException(email, reason)
    }

    // Security helpers
    static throwInvalidToken(tokenType: string): never {
        throw new InvalidTokenException(tokenType)
    }

    static throwTokenExpired(tokenType: string): never {
        throw new TokenExpiredException(tokenType)
    }

    static throwSuspiciousActivity(activity: string, userAgent?: string, ip?: string): never {
        throw new SuspiciousActivityException(activity, userAgent, ip)
    }

    // Validation utilities
    static validateEmail(email: string): void {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!email || !emailRegex.test(email)) {
            this.throwInvalidEmail(email)
        }
    }

    static validatePassword(password: string): void {
        const requirements: string[] = []
    
        if (!password) {
            this.throwMissingField("password")
        }
    
        if (password.length < 8) {
            requirements.push("At least 8 characters")
        }
    
        if (!/[A-Z]/.test(password)) {
            requirements.push("At least one uppercase letter")
        }
    
        if (!/[a-z]/.test(password)) {
            requirements.push("At least one lowercase letter")
        }
    
        if (!/\d/.test(password)) {
            requirements.push("At least one number")
        }
    
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
            requirements.push("At least one special character")
        }
    
        if (requirements.length > 0) {
            this.throwWeakPassword(requirements)
        }
    }

    static validateRequiredFields(data: Record<string, any>, requiredFields: string[]): void {
        for (const field of requiredFields) {
            if (!data[field] || data[field].toString().trim() === "") {
                this.throwMissingField(field)
            }
        }
    }

    // Cognito error mapper
    static mapCognitoError(cognitoError: any, operation: string, email?: string): never {
        const errorCode = cognitoError.name || cognitoError.code || "UnknownError"
    
        switch (errorCode) {
        case "UsernameExistsException":
            this.throwUserAlreadyExists(email || "unknown")
            break
        
        case "UserNotConfirmedException":
            this.throwUserNotConfirmed(email || "unknown")
            break
        
        case "NotAuthorizedException":
            this.throwInvalidCredentials(email || "unknown")
            break
        
        case "UserNotFoundException":
            this.throwInvalidCredentials(email || "unknown")
            break
        
        case "CodeMismatchException":
            this.throwInvalidConfirmationCode(email || "unknown")
            break
        
        case "ExpiredCodeException":
            this.throwConfirmationCodeExpired(email || "unknown")
            break
        
        case "TooManyRequestsException":
            this.throwTooManyAttempts(email || "unknown", 5)
            break
        
        case "InvalidPasswordException":
            this.throwWeakPassword(["Password does not meet AWS Cognito requirements"])
            break
        
        default:
            this.throwCognitoError(operation, `${errorCode}: ${cognitoError.message}`)
        }
    }
}