import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-firebase-jwt';
import { FirebaseAdminService } from '@app/firebase-admin';

@Injectable()
export class FirebaseAuthStrategy extends PassportStrategy(Strategy, 'firebase-auth') {
  constructor(private readonly firebaseAdminService: FirebaseAdminService) {
    super({
      jwtFromRequest: (req: any) => {
        // Extract token from Authorization header
        const authHeader = req.headers?.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          return authHeader.substring(7);
        }
        return null;
      }
    });
  }

  async validate(token: string): Promise<any> {
    try {
      // Verify Firebase ID token
      const decodedToken = await this.firebaseAdminService.validateToken(token);
      
      // Get user details from Firebase
      const firebaseUser = await this.firebaseAdminService.getUser(decodedToken.uid);
      
      // Return user object that will be attached to request
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
          customClaims: firebaseUser.customClaims
        }
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid Firebase token');
    }
  }
}
