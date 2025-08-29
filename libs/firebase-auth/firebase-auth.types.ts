// Base options interface
export interface BaseOptions {
  isGlobal?: boolean;
  useGlobalImports?: boolean;
}

export interface FirebaseUser {
  uid: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  picture?: string;
  provider: string;
  customClaims?: Record<string, any>;
  firebaseUser: any;
}

export interface AuthResponse {
  user: FirebaseUser;
  message: string;
}

export interface FirebaseAuthConfig {
  // Add any Firebase auth specific configuration here
}

export type FirebaseAuthOptions = BaseOptions & FirebaseAuthConfig;
