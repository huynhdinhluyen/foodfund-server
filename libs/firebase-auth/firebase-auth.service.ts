import { Injectable, UnauthorizedException } from '@nestjs/common';
import { FirebaseAdminService } from '../firebase-admin';
import { FirebaseUser, AuthResponse } from './firebase-auth.types';

@Injectable()
export class FirebaseAuthService {
  constructor(private readonly firebaseAdminService: FirebaseAdminService) {}

  /**
   * Verify Firebase ID token and return user info
   */
  async verifyToken(idToken: string): Promise<FirebaseUser> {
    try {
      const decodedToken =
        await this.firebaseAdminService.validateToken(idToken);
      const firebaseUser = await this.firebaseAdminService.getUser(
        decodedToken.uid,
      );

      return {
        uid: decodedToken.uid,
        email: decodedToken.email,
        emailVerified: decodedToken.email_verified,
        name: decodedToken.name || firebaseUser.displayName,
        picture: decodedToken.picture || firebaseUser.photoURL,
        provider: decodedToken.firebase.sign_in_provider,
        customClaims: decodedToken.customClaims || {},
        firebaseUser: {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          disabled: firebaseUser.disabled,
          metadata: firebaseUser.metadata,
          customClaims: firebaseUser.customClaims,
        },
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired Firebase token');
    }
  }

  /**
   * Get user by Firebase UID
   */
  async getUserByUid(uid: string): Promise<any> {
    try {
      return await this.firebaseAdminService.getUser(uid);
    } catch (error) {
      throw new UnauthorizedException('User not found');
    }
  }

  /**
   * Validate user authentication status
   */
  async validateUser(user: FirebaseUser): Promise<AuthResponse> {
    // Additional business logic can be added here
    // e.g., check if user is active, has required permissions, etc.

    return {
      user,
      message: 'Authentication successful',
    };
  }
}
