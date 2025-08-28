import { 
  Controller, 
  Post, 
  Get, 
  Body, 
  UseGuards, 
  Request,
  HttpCode,
  HttpStatus 
} from '@nestjs/common';
import { AuthService, FirebaseUser, AuthResponse } from './auth.service';
import { FirebaseAuthGuard } from '../guards';

interface VerifyTokenDto {
  idToken: string;
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
   * Verify Firebase ID token
   */
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verifyToken(@Body() { idToken }: VerifyTokenDto): Promise<AuthResponse> {
    const user = await this.authService.verifyToken(idToken);
    return this.authService.validateUser(user);
  }

  /**
   * Get current user profile (protected route)
   */
  @Get('profile')
  @UseGuards(FirebaseAuthGuard)
  async getProfile(@Request() req): Promise<{ user: FirebaseUser }> {
    return { user: req.user };
  }

  /**
   * Get user by UID (protected route)
   */
  @Post('user')
  @UseGuards(FirebaseAuthGuard)
  async getUserByUid(@Body() { uid }: { uid: string }) {
    return this.authService.getUserByUid(uid);
  }

  /**
   * Protected test endpoint
   */
  @Get('protected')
  @UseGuards(FirebaseAuthGuard)
  getProtected(@Request() req): { message: string; user: FirebaseUser } {
    return {
      message: 'This is a protected route',
      user: req.user
    };
  }
}
