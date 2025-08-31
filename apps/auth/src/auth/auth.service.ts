import { Injectable } from '@nestjs/common';
import {
  FirebaseAuthService,
  FirebaseUser,
  AuthResponse,
} from '../../../../libs/firebase-auth';

@Injectable()
export class AuthService {
  constructor(private readonly firebaseAuthService: FirebaseAuthService) {}

  /**
   * Verify Firebase ID token and return user info
   */
  async verifyToken(idToken: string): Promise<FirebaseUser> {
    return this.firebaseAuthService.verifyToken(idToken);
  }

  /**
   * Get user by Firebase UID
   */
  async getUserByUid(uid: string): Promise<any> {
    return this.firebaseAuthService.getUserByUid(uid);
  }

  /**
   * Validate user authentication status
   */
  async validateUser(user: FirebaseUser): Promise<AuthResponse> {
    return this.firebaseAuthService.validateUser(user);
  }

  /**
   * Health check endpoint
   */
  getHealth(): { status: string; service: string; timestamp: string } {
    return {
      status: 'healthy',
      service: 'Firebase Auth Service',
      timestamp: new Date().toISOString(),
    };
  }
}
