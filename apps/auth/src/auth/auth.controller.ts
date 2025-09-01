import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  CognitoUser,
  AuthResponse,
  CognitoAuthGuard,
} from '../../../../libs/aws-cognito';

interface VerifyTokenDto {
  accessToken: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Health check endpoint
   */
  @Get('health')
  getHealth() {
    return this.authService.getHealth();
  }

  /**
   * Verify AWS Cognito access token
   */
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verifyToken(
    @Body() { accessToken }: VerifyTokenDto,
  ): Promise<AuthResponse> {
    const user = await this.authService.verifyToken(accessToken);
    return this.authService.validateUser(user);
  }

  /**
   * Get current user profile (protected route)
   */
  @Get('profile')
  @UseGuards(CognitoAuthGuard)
  async getProfile(@Request() req): Promise<{ user: CognitoUser }> {
    return { user: req.user };
  }

  /**
   * Get user by sub (protected route)
   */
  @Post('user')
  @UseGuards(CognitoAuthGuard)
  async getUserBySub(@Body() { username }: { username: string }) {
    return this.authService.getUserBySub(username);
  }

  /**
   * Protected test endpoint
   */
  @Get('protected')
  @UseGuards(CognitoAuthGuard)
  getProtected(@Request() req): { message: string; user: CognitoUser } {
    return {
      message: 'This is a protected route',
      user: req.user,
    };
  }
}
