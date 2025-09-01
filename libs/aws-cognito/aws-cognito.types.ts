// Base options interface
export interface BaseOptions {
  isGlobal?: boolean;
  useGlobalImports?: boolean;
}

export interface CognitoUser {
  sub: string; // Cognito user ID (equivalent to Firebase uid)
  email: string;
  emailVerified: boolean;
  username: string;
  name?: string;
  givenName?: string;
  familyName?: string;
  picture?: string;
  phoneNumber?: string;
  phoneNumberVerified?: boolean;
  groups?: string[];
  customAttributes?: Record<string, any>;
  cognitoUser: any; // Raw Cognito user object
  provider: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AuthResponse {
  user: CognitoUser;
  message: string;
}

export interface CognitoAuthConfig {
  userPoolId: string;
  clientId: string;
  region: string;
}

export type CognitoAuthOptions = BaseOptions & CognitoAuthConfig;

// JWT payload interface from Cognito
export interface CognitoJwtPayload {
  sub: string;
  email_verified: boolean;
  iss: string;
  'cognito:username': string;
  'cognito:groups'?: string[];
  aud: string;
  event_id: string;
  token_use: string;
  auth_time: number;
  exp: number;
  iat: number;
  jti: string;
  email?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  phone_number?: string;
  phone_number_verified?: boolean;
  [key: string]: any; // For custom attributes
}
