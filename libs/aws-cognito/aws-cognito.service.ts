import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { 
  CognitoIdentityProviderClient, 
  GetUserCommand,
  AdminGetUserCommand,
  ListUsersCommand 
} from '@aws-sdk/client-cognito-identity-provider';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { envConfig } from '../env';

@Injectable()
export class AwsCognitoService {
  private readonly logger = new Logger(AwsCognitoService.name);
  private readonly cognitoClient: CognitoIdentityProviderClient;
  private readonly jwtVerifier: CognitoJwtVerifier;
  private readonly userPoolId: string;

  constructor() {
    const config = envConfig().aws;
    
    if (!config) {
      throw new Error('AWS configuration not found in environment');
    }

    this.userPoolId = config.cognito.userPoolId;
    
    this.cognitoClient = new CognitoIdentityProviderClient({
      region: config.cognito.region,
      credentials: config.accessKeyId && config.secretAccessKey ? {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      } : undefined, // Use default credentials if not provided
    });

    // Create JWT verifier for access tokens
    this.jwtVerifier = CognitoJwtVerifier.create({
      userPoolId: this.userPoolId,
      tokenUse: 'access',
      clientId: config.cognito.clientId,
    });

    this.logger.log(`AWS Cognito Service initialized for region: ${config.cognito.region}`);
  }

  /**
   * Validate Cognito access token
   */
  async validateToken(token: string) {
    try {
      const payload = await this.jwtVerifier.verify(token);
      this.logger.debug(`Token validated for user: ${payload.sub}`);
      return payload;
    } catch (error) {
      this.logger.error(`Token validation failed: ${error.message}`);
      throw new UnauthorizedException('Invalid AWS Cognito token');
    }
  }

  /**
   * Get user details using access token
   */
  async getUser(accessToken: string) {
    try {
      const command = new GetUserCommand({
        AccessToken: accessToken,
      });
      
      const response = await this.cognitoClient.send(command);
      this.logger.debug(`User retrieved: ${response.Username}`);
      return response;
    } catch (error) {
      this.logger.error(`Failed to get user: ${error.message}`);
      throw new UnauthorizedException('User not found or token invalid');
    }
  }

  /**
   * Get user by username (admin operation)
   */
  async getUserByUsername(username: string) {
    try {
      const command = new AdminGetUserCommand({
        UserPoolId: this.userPoolId,
        Username: username,
      });
      
      const response = await this.cognitoClient.send(command);
      this.logger.debug(`Admin user retrieved: ${username}`);
      return response;
    } catch (error) {
      this.logger.error(`Failed to get user by username: ${error.message}`);
      throw new UnauthorizedException('User not found');
    }
  }

  /**
   * Extract custom attributes from user attributes array
   */
  extractCustomAttributes(attributes: any[]): Record<string, any> {
    const customAttrs: Record<string, any> = {};
    attributes?.forEach(attr => {
      if (attr.Name.startsWith('custom:')) {
        customAttrs[attr.Name.replace('custom:', '')] = attr.Value;
      }
    });
    return customAttrs;
  }

  /**
   * Get attribute value by name
   */
  getAttributeValue(attributes: any[], attributeName: string): string | undefined {
    return attributes?.find(attr => attr.Name === attributeName)?.Value;
  }
}
