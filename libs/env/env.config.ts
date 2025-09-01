import {
  EnvironmentConfig,
  NodeEnv,
  Container,
  RedisType,
  Brokers,
} from './types';
import {
  DEFAULT_CACHE_TIMEOUT_MS,
  DEFAULT_HEALTH_PORT,
  DEFAULT_KAFKA_PORT,
  DEFAULT_PORT,
  DEFAULT_REDIS_PORT,
  LOCALHOST,
  DEFAULT_JWT_REFRESH_TOKEN_EXPIRATION,
  DEFAULT_JWT_ACCESS_TOKEN_EXPIRATION,
} from './env.constants';

export const envConfig = (): EnvironmentConfig => ({
  nodeEnv: (process.env.NODE_ENV ?? NodeEnv.Development) as NodeEnv,

  // Cache configurations
  cache: {
    redis: {
      timeoutMs: process.env.REDIS_CACHE_TIMEOUT_MS
        ? Number.parseInt(process.env.REDIS_CACHE_TIMEOUT_MS)
        : DEFAULT_CACHE_TIMEOUT_MS,
    },
    postgresql: {
      timeoutMs: process.env.POSTGRESQL_CACHE_TIMEOUT_MS
        ? Number.parseInt(process.env.POSTGRESQL_CACHE_TIMEOUT_MS)
        : DEFAULT_CACHE_TIMEOUT_MS,
    },
    graphql: {
      timeoutMs: process.env.GRAPHQL_CACHE_TIMEOUT_MS
        ? Number.parseInt(process.env.GRAPHQL_CACHE_TIMEOUT_MS)
        : DEFAULT_CACHE_TIMEOUT_MS,
    },
  },

  // CORS configurations - support up to 10 origins for each service
  cors: {
    graphql: {
      origins: Array.from({ length: 10 }, (_, i) => {
        const origin = process.env[`GRAPHQL_ALLOW_ORIGIN_${i + 1}`];
        return origin ? [origin] : [];
      }).flat(),
    },
    auth: {
      origins: Array.from({ length: 10 }, (_, i) => {
        const origin = process.env[`AUTH_ALLOW_ORIGIN_${i + 1}`];
        return origin ? [origin] : [];
      }).flat(),
    },
  },

  // Container configurations
  containers: {
    [Container.Auth]: {
      host: process.env.AUTH_HOST ?? LOCALHOST,
      port: process.env.AUTH_PORT
        ? Number.parseInt(process.env.AUTH_PORT)
        : DEFAULT_PORT,
      healthCheckPort: process.env.AUTH_HEALTH_CHECK_PORT
        ? Number.parseInt(process.env.AUTH_HEALTH_CHECK_PORT)
        : DEFAULT_HEALTH_PORT,
    },
    [Container.GraphQLGateway]: {
      host: process.env.GRAPHQL_GATEWAY_HOST ?? LOCALHOST,
      port: process.env.GRAPHQL_GATEWAY_PORT
        ? Number.parseInt(process.env.GRAPHQL_GATEWAY_PORT)
        : DEFAULT_PORT + 1,
      healthCheckPort: process.env.GRAPHQL_GATEWAY_HEALTH_CHECK_PORT
        ? Number.parseInt(process.env.GRAPHQL_GATEWAY_HEALTH_CHECK_PORT)
        : DEFAULT_HEALTH_PORT + 1,
    },
    [Container.UsersSubgraph]: {
      host: process.env.USERS_SUBGRAPH_HOST ?? LOCALHOST,
      port: process.env.USERS_SUBGRAPH_PORT
        ? Number.parseInt(process.env.USERS_SUBGRAPH_PORT)
        : DEFAULT_PORT + 2,
      healthCheckPort: process.env.USERS_SUBGRAPH_HEALTH_CHECK_PORT
        ? Number.parseInt(process.env.USERS_SUBGRAPH_HEALTH_CHECK_PORT)
        : DEFAULT_HEALTH_PORT + 2,
    },
    [Container.CampaignsSubgraph]: {
      host: process.env.CAMPAIGNS_SUBGRAPH_HOST ?? LOCALHOST,
      port: process.env.CAMPAIGNS_SUBGRAPH_PORT
        ? Number.parseInt(process.env.CAMPAIGNS_SUBGRAPH_PORT)
        : DEFAULT_PORT + 3,
      healthCheckPort: process.env.CAMPAIGNS_SUBGRAPH_HEALTH_CHECK_PORT
        ? Number.parseInt(process.env.CAMPAIGNS_SUBGRAPH_HEALTH_CHECK_PORT)
        : DEFAULT_HEALTH_PORT + 3,
    },
    [Container.DonationsSubgraph]: {
      host: process.env.DONATIONS_SUBGRAPH_HOST ?? LOCALHOST,
      port: process.env.DONATIONS_SUBGRAPH_PORT
        ? Number.parseInt(process.env.DONATIONS_SUBGRAPH_PORT)
        : DEFAULT_PORT + 4,
      healthCheckPort: process.env.DONATIONS_SUBGRAPH_HEALTH_CHECK_PORT
        ? Number.parseInt(process.env.DONATIONS_SUBGRAPH_HEALTH_CHECK_PORT)
        : DEFAULT_HEALTH_PORT + 4,
    },
  },

  // Database configurations per service
  databases: {
    users: {
      host: process.env.USERS_DATABASE_HOST ?? LOCALHOST,
      port: process.env.USERS_DATABASE_PORT
        ? Number.parseInt(process.env.USERS_DATABASE_PORT)
        : 5433,
      username: process.env.USERS_DATABASE_USERNAME,
      password: process.env.USERS_DATABASE_PASSWORD,
      databaseName: process.env.USERS_DATABASE_NAME,
    },
    campaigns: {
      host: process.env.CAMPAIGNS_DATABASE_HOST ?? LOCALHOST,
      port: process.env.CAMPAIGNS_DATABASE_PORT
        ? Number.parseInt(process.env.CAMPAIGNS_DATABASE_PORT)
        : 5434,
      username: process.env.CAMPAIGNS_DATABASE_USERNAME,
      password: process.env.CAMPAIGNS_DATABASE_PASSWORD,
      databaseName: process.env.CAMPAIGNS_DATABASE_NAME,
    },
    // Auth service now uses Firebase Authentication (no database needed)
    redis: {
      [RedisType.Cache]: {
        host: process.env.CACHE_REDIS_HOST ?? LOCALHOST,
        port: process.env.CACHE_REDIS_PORT
          ? Number.parseInt(process.env.CACHE_REDIS_PORT)
          : DEFAULT_REDIS_PORT,
        password: process.env.CACHE_REDIS_PASSWORD,
        cluster: {
          enabled: process.env.CACHE_REDIS_CLUSTER_ENABLED === 'true',
          runInDocker: process.env.CACHE_REDIS_CLUSTER_RUN_IN_DOCKER === 'true',
          dockerNetworkName:
            process.env.CACHE_REDIS_CLUSTER_DOCKER_NETWORK_NAME,
        },
      },
      [RedisType.Session]: {
        host: process.env.SESSION_REDIS_HOST ?? LOCALHOST,
        port: process.env.SESSION_REDIS_PORT
          ? Number.parseInt(process.env.SESSION_REDIS_PORT)
          : DEFAULT_REDIS_PORT + 1,
        password: process.env.SESSION_REDIS_PASSWORD,
        cluster: {
          enabled: process.env.SESSION_REDIS_CLUSTER_ENABLED === 'true',
          runInDocker:
            process.env.SESSION_REDIS_CLUSTER_RUN_IN_DOCKER === 'true',
          dockerNetworkName:
            process.env.SESSION_REDIS_CLUSTER_DOCKER_NETWORK_NAME,
        },
      },
      [RedisType.Job]: {
        host: process.env.JOB_REDIS_HOST ?? LOCALHOST,
        port: process.env.JOB_REDIS_PORT
          ? Number.parseInt(process.env.JOB_REDIS_PORT)
          : DEFAULT_REDIS_PORT + 2,
        password: process.env.JOB_REDIS_PASSWORD,
        cluster: {
          enabled: process.env.JOB_REDIS_CLUSTER_ENABLED === 'true',
          runInDocker: process.env.JOB_REDIS_CLUSTER_RUN_IN_DOCKER === 'true',
          dockerNetworkName: process.env.JOB_REDIS_CLUSTER_DOCKER_NETWORK_NAME,
        },
      },
    },
  },

  // Message broker configurations
  brokers: {
    [Brokers.Kafka]: {
      host: process.env.KAFKA_HOST ?? LOCALHOST,
      port: process.env.KAFKA_PORT
        ? Number.parseInt(process.env.KAFKA_PORT)
        : DEFAULT_KAFKA_PORT,
      sasl: {
        enabled: process.env.KAFKA_SASL_ENABLED === 'true',
        username: process.env.KAFKA_SASL_USERNAME,
        password: process.env.KAFKA_SASL_PASSWORD,
      },
    },
  },

  // Authentication & Security
  jwt: {
    secret: process.env.JWT_SECRET ?? 'dev-jwt-secret',
    accessTokenExpiration:
      process.env.JWT_ACCESS_TOKEN_EXPIRATION ??
      DEFAULT_JWT_ACCESS_TOKEN_EXPIRATION,
    refreshTokenExpiration:
      process.env.JWT_REFRESH_TOKEN_EXPIRATION ??
      DEFAULT_JWT_REFRESH_TOKEN_EXPIRATION,
  },
  session: {
    secret: process.env.SESSION_SECRET ?? 'dev-session-secret',
  },

  crypto: {
    cipher: {
      secret: process.env.CIPHER_SECRET ?? 'dev-cipher-secret',
    },
    bcrypt: {
      salt: process.env.BCRYPT_SALT ?? '10',
    },
  },

  // External services (for future expansion)
  s3: {
    bucketName: process.env.S3_BUCKET_NAME,
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION,
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  },

  // AWS Cognito configuration
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    cognito: {
      region:
        process.env.AWS_COGNITO_REGION || process.env.AWS_REGION || 'us-east-1',
      userPoolId: process.env.AWS_COGNITO_USER_POOL_ID!,
      clientId: process.env.AWS_COGNITO_CLIENT_ID!,
      userPoolDomain: process.env.AWS_COGNITO_USER_POOL_DOMAIN,
    },
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },

  firebase: {
    credential: {
      type: process.env.FIREBASE_CREDENTIAL_TYPE,
      projectId: process.env.FIREBASE_CREDENTIAL_PROJECT_ID,
      privateKeyId: process.env.FIREBASE_CREDENTIAL_PRIVATE_KEY_ID,
      privateKey: process.env.FIREBASE_CREDENTIAL_PRIVATE_KEY,
      clientEmail: process.env.FIREBASE_CREDENTIAL_CLIENT_EMAIL,
      clientId: process.env.FIREBASE_CREDENTIAL_CLIENT_ID,
      authUri: process.env.FIREBASE_CREDENTIAL_AUTH_URI,
      tokenUri: process.env.FIREBASE_CREDENTIAL_TOKEN_URI,
      authProviderX509CertUrl:
        process.env.FIREBASE_CREDENTIAL_AUTH_PROVIDER_X509_CERT_URL,
      clientX509CertUrl: process.env.FIREBASE_CREDENTIAL_CLIENT_X509_CERT_URL,
      universeDomain: process.env.FIREBASE_CREDENTIAL_UNIVERSE_DOMAIN,
    },
  },

  googleCloud: {
    oauth: {
      clientId: process.env.GOOGLE_CLOUD_OAUTH_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLOUD_OAUTH_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_CLOUD_OAUTH_REDIRECT_URI,
    },
  },

  backup: {
    dir: process.env.BACKUP_DIR ?? './backups',
  },

  // Development & debugging
  productionUrl: process.env.PRODUCTION_URL,
  e2eEnabled: process.env.E2E_ENABLED === 'true',
});

// Backward compatibility function
export function parseEnvConfig(): EnvironmentConfig {
  return envConfig();
}

// Utility functions
export function isDevelopment(): boolean {
  return (
    process.env.NODE_ENV === 'development' ||
    process.env.NODE_ENV === NodeEnv.Development
  );
}

export function isProduction(): boolean {
  return (
    process.env.NODE_ENV === 'production' ||
    process.env.NODE_ENV === NodeEnv.Production
  );
}

export function isTest(): boolean {
  return (
    process.env.NODE_ENV === 'test' || process.env.NODE_ENV === NodeEnv.Test
  );
}
