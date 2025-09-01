import { Injectable } from '@nestjs/common';
import {
  AwsCognitoService,
  CognitoUser,
  AuthResponse,
} from '../../../../libs/aws-cognito';

@Injectable()
export class AuthService {
  constructor(private readonly cognitoService: AwsCognitoService) {}

  /**
   * Verify Cognito access token and return user info
   */
  async verifyToken(accessToken: string): Promise<CognitoUser> {
    const decodedToken = await this.cognitoService.validateToken(accessToken);
    const cognitoUserResponse = await this.cognitoService.getUser(accessToken);

    return {
      sub: decodedToken.sub,
      email:
        decodedToken.email ||
        this.cognitoService.getAttributeValue(
          cognitoUserResponse.UserAttributes,
          'email',
        ) ||
        '',
      emailVerified: decodedToken.email_verified || false,
      username:
        decodedToken['cognito:username'] || cognitoUserResponse.Username,
      name:
        decodedToken.name ||
        this.cognitoService.getAttributeValue(
          cognitoUserResponse.UserAttributes,
          'name',
        ),
      givenName:
        decodedToken.given_name ||
        this.cognitoService.getAttributeValue(
          cognitoUserResponse.UserAttributes,
          'given_name',
        ),
      familyName:
        decodedToken.family_name ||
        this.cognitoService.getAttributeValue(
          cognitoUserResponse.UserAttributes,
          'family_name',
        ),
      picture:
        decodedToken.picture ||
        this.cognitoService.getAttributeValue(
          cognitoUserResponse.UserAttributes,
          'picture',
        ),
      phoneNumber:
        decodedToken.phone_number ||
        this.cognitoService.getAttributeValue(
          cognitoUserResponse.UserAttributes,
          'phone_number',
        ),
      phoneNumberVerified: decodedToken.phone_number_verified || false,
      groups: decodedToken['cognito:groups'] || [],
      customAttributes: this.cognitoService.extractCustomAttributes(
        cognitoUserResponse.UserAttributes || [],
      ),
      cognitoUser: cognitoUserResponse,
      provider: 'cognito',
      createdAt: cognitoUserResponse.UserCreateDate,
      updatedAt: cognitoUserResponse.UserLastModifiedDate,
    } as CognitoUser;
  }

  /**
   * Get user by Cognito sub (user ID)
   */
  async getUserBySub(username: string): Promise<any> {
    return this.cognitoService.getUserByUsername(username);
  }

  /**
   * Validate user authentication status
   */
  async validateUser(user: CognitoUser): Promise<AuthResponse> {
    // Additional business logic can be added here
    // e.g., check if user is active, has required permissions, etc.

    return {
      user,
      message: 'Authentication successful',
    };
  }

  /**
   * Health check endpoint
   */
  getHealth(): { status: string; service: string; timestamp: string } {
    return {
      status: 'healthy',
      service: 'AWS Cognito Auth Service',
      timestamp: new Date().toISOString(),
    };
  }
}
