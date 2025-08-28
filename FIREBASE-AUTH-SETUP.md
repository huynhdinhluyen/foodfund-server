# Firebase Authentication Setup Guide

Complete guide for setting up Firebase Authentication in FoodFund Microservices.

## 🔥 Why Firebase Authentication?

- ✅ **No Database Management**: Eliminates need for auth database
- ✅ **Built-in Security**: Enterprise-grade security out of the box  
- ✅ **Multiple Providers**: Google, Facebook, GitHub, Email/Password
- ✅ **Real-time**: Instant token validation
- ✅ **Scalable**: Auto-scaling, no infrastructure management
- ✅ **Cost-effective**: Generous free tier (10,000 MAU)

## 🚀 Firebase Project Setup

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Enter project name: `foodfund-microservices`
4. Enable Google Analytics (optional)
5. Click "Create project"

### 2. Enable Authentication

1. In Firebase Console, go to **Authentication** > **Get started**
2. Go to **Sign-in method** tab
3. Enable desired providers:
   - ✅ **Email/Password**
   - ✅ **Google** 
   - ✅ **Facebook** (optional)
   - ✅ **GitHub** (optional)

### 3. Generate Service Account Key

1. Go to **Project settings** (gear icon)
2. Click **Service accounts** tab
3. Click **Generate new private key**
4. Download the JSON file
5. Keep this file secure (contains private keys)

## ⚙️ Environment Configuration

### 1. Extract Firebase Credentials

From the downloaded JSON file, extract these values:

```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "your-private-key-id", 
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com",
  "client_id": "your-client-id",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/...",
  "universe_domain": "googleapis.com"
}
```

### 2. Update .env File

```bash
# Copy template
cp env.example .env

# Edit Firebase credentials
FIREBASE_CREDENTIAL_TYPE=service_account
FIREBASE_CREDENTIAL_PROJECT_ID=your-project-id
FIREBASE_CREDENTIAL_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_CREDENTIAL_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour-private-key-here\n-----END PRIVATE KEY-----\n"
FIREBASE_CREDENTIAL_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_CREDENTIAL_CLIENT_ID=your-client-id
FIREBASE_CREDENTIAL_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_CREDENTIAL_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_CREDENTIAL_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CREDENTIAL_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40your-project.iam.gserviceaccount.com
FIREBASE_CREDENTIAL_UNIVERSE_DOMAIN=googleapis.com
```

**⚠️ Important**: 
- Wrap `FIREBASE_CREDENTIAL_PRIVATE_KEY` in double quotes
- Keep all newlines (`\n`) in the private key
- Never commit real credentials to version control

## 🏗️ Architecture Overview

### Before: Database per Service + Auth DB
```
┌─────────────┐ ┌─────────────────┐ ┌─────────────┐ ┌─────────────┐
│  Auth DB    │ │  Campaigns DB   │ │  Users DB   │ │   Redis     │
│ Port: 5435  │ │   Port: 5434    │ │ Port: 5433  │ │ Port: 6379  │
└─────────────┘ └─────────────────┘ └─────────────┘ └─────────────┘
       ↑               ↑                   ↑               ↑
   ┌───┴──┐       ┌────┴─────┐         ┌───┴────┐     ┌────┴────┐
   │ Auth │       │Campaigns │         │ Users  │     │ Cache   │
   │Service│       │ Service  │         │Service │     │ Service │
   └──────┘       └──────────┘         └────────┘     └─────────┘
```

### After: Firebase Authentication
```
     ☁️ Firebase Authentication ☁️
                     ↓
   ┌─────────────────────────────────────┐
   │        Auth Service                 │
   │    (No Database Needed)             │
   └─────────────────────────────────────┘
                     ↓
┌─────────────────┐ ┌─────────────┐ ┌─────────────┐
│  Campaigns DB   │ │  Users DB   │ │   Redis     │
│   Port: 5434    │ │ Port: 5433  │ │ Port: 6379  │
└─────────────────┘ └─────────────┘ └─────────────┘
       ↑                   ↑               ↑
  ┌────┴─────┐         ┌───┴────┐     ┌────┴────┐
  │Campaigns │         │ Users  │     │ Cache   │
  │ Service  │         │Service │     │ Service │
  └──────────┘         └────────┘     └─────────┘
```

## 🔧 API Usage

### 1. Start Auth Service

```bash
# Start only databases (no auth DB needed)
docker-compose up users-db campaigns-db

# Start auth service
npm run start:dev auth
```

### 2. Test Authentication

#### Health Check
```bash
curl http://localhost:8080/auth/health
```

#### Verify Firebase Token
```bash
curl -X POST http://localhost:8080/auth/verify \
  -H "Content-Type: application/json" \
  -d '{"idToken": "YOUR_FIREBASE_ID_TOKEN"}'
```

#### Access Protected Route
```bash
curl http://localhost:8080/auth/protected \
  -H "Authorization: Bearer YOUR_FIREBASE_ID_TOKEN"
```

#### Get User Profile
```bash
curl http://localhost:8080/auth/profile \
  -H "Authorization: Bearer YOUR_FIREBASE_ID_TOKEN"
```

## 🔐 Authentication Flow

### Frontend Integration

1. **User signs in with Firebase SDK:**
```javascript
import { signInWithEmailAndPassword } from 'firebase/auth';

const user = await signInWithEmailAndPassword(auth, email, password);
const idToken = await user.user.getIdToken();
```

2. **Send token to backend:**
```javascript
const response = await fetch('/auth/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ idToken })
});
```

3. **Use token for protected routes:**
```javascript
const response = await fetch('/auth/profile', {
  headers: { 'Authorization': `Bearer ${idToken}` }
});
```

### Backend Validation

1. **Token verification** happens automatically via Passport strategy
2. **User info** is extracted from Firebase token
3. **Request object** gets populated with user data
4. **Business logic** can access user via `req.user`

## 🛡️ Security Features

### Token Validation
- ✅ **Signature verification** using Firebase public keys
- ✅ **Expiration checking** (default 1 hour)
- ✅ **Issuer validation** (must be from your Firebase project)
- ✅ **Audience validation** (must match your project ID)

### User Information
```typescript
interface FirebaseUser {
  uid: string;                    // Firebase User ID
  email: string;                  // User email
  emailVerified: boolean;         // Email verification status
  name?: string;                  // Display name
  picture?: string;               // Profile picture URL
  provider: string;               // Auth provider (google, password, etc.)
  customClaims?: Record<string, any>; // Custom claims
  firebaseUser: {                // Full Firebase user object
    uid: string;
    email: string;
    displayName: string;
    photoURL: string;
    disabled: boolean;
    metadata: UserMetadata;
    customClaims?: object;
  }
}
```

## 🔌 Integration with Other Services

### Users Service Integration
```typescript
// In users service resolver
@Resolver()
export class UsersResolver {
  @Query(() => UserSchema)
  @UseGuards(FirebaseGraphQLGuard)
  async getMyProfile(@Context() context) {
    const firebaseUser = context.req.user;
    // Find user in users database by Firebase UID
    return this.usersService.findByFirebaseUid(firebaseUser.uid);
  }
}
```

### Campaigns Service Integration
```typescript
// In campaigns service
@Resolver()
export class CampaignsResolver {
  @Mutation(() => CampaignSchema)
  @UseGuards(FirebaseGraphQLGuard)
  async createCampaign(
    @Args('input') input: CreateCampaignInput,
    @Context() context
  ) {
    const firebaseUser = context.req.user;
    // Use Firebase UID as creator ID
    return this.campaignsService.create({
      ...input,
      creatorId: firebaseUser.uid
    });
  }
}
```

## 📱 Client SDK Setup

### Web (React/Vue/Angular)
```bash
npm install firebase
```

```javascript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  // ... other config
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
```

### Mobile (React Native)
```bash
npm install @react-native-firebase/app @react-native-firebase/auth
```

```javascript
import auth from '@react-native-firebase/auth';

// Sign in
const user = await auth().signInWithEmailAndPassword(email, password);
const idToken = await user.user.getIdToken();
```

## 🔧 Troubleshooting

### Common Issues

1. **"Invalid Firebase token"**
   - Check if Firebase credentials are correct
   - Verify token hasn't expired
   - Ensure project ID matches

2. **"Service account not found"**
   - Verify all Firebase environment variables are set
   - Check private key format (should include `\n` characters)
   - Ensure service account has proper permissions

3. **"Token verification failed"**
   - Token might be from different Firebase project
   - Check if Authentication is enabled in Firebase Console
   - Verify token is not corrupted during transmission

### Debug Mode
```typescript
// Enable debug logging
private readonly logger = new Logger(FirebaseAdminService.name);

constructor() {
  this.logger.debug('Initializing Firebase Admin with project:', 
    envConfig().firebase.credential.projectId);
}
```

### Testing with curl
```bash
# Get token from Firebase Auth (use Firebase Console or SDK)
TOKEN="eyJhbGciOiJSUzI1NiIsImtpZCI6..."

# Test protected endpoint
curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:8080/auth/profile
```

## 🚀 Production Deployment

### Security Checklist
- ✅ Use strong Firebase project security rules
- ✅ Enable only required authentication providers
- ✅ Set up proper CORS origins
- ✅ Use environment variables for all credentials
- ✅ Never commit service account keys to version control
- ✅ Rotate service account keys regularly
- ✅ Monitor authentication events in Firebase Console

### Performance Tips
- Token validation is cached by Firebase Admin SDK
- Consider implementing token refresh strategy on frontend
- Use appropriate token expiration times
- Monitor Firebase quotas and usage

## 📚 Related Documentation

- [Firebase Authentication Docs](https://firebase.google.com/docs/auth)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Passport Firebase JWT](https://www.npmjs.com/package/passport-firebase-jwt)
- [Environment Configuration](./ENV-CONFIGURATION.md)
