// Enums
export enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test'
}

export enum Container {
  Auth = 'auth',
  GraphQLGateway = 'graphql-gateway',
  UsersSubgraph = 'users-subgraph',
  CampaignsSubgraph = 'campaigns-subgraph',
  DonationsSubgraph = 'donations-subgraph'
}

export enum RedisType {
  Cache = 'cache',
  Session = 'session',
  Job = 'job'
}

export enum Brokers {
  Kafka = 'kafka'
}

export enum DatabaseType {
  PostgreSQL = 'postgresql',
  MongoDB = 'mongodb'
}

// Container configuration interfaces
export interface ContainerConfig {
  host: string;
  port?: number;
  healthCheckPort: number;
}

export interface DatabaseConfig {
  host: string;
  port: number;
  username?: string;
  password?: string;
  databaseName?: string;
  url?: string;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  cluster?: {
    enabled: boolean;
    runInDocker?: boolean;
    dockerNetworkName?: string;
  };
}

export interface KafkaConfig {
  host: string;
  port: number;
  sasl?: {
    enabled: boolean;
    username?: string;
    password?: string;
  };
}

export interface JwtConfig {
  secret: string;
  accessTokenExpiration: string;
  refreshTokenExpiration: string;
}

export interface CorsConfig {
  origins: string[];
}

export interface CacheConfig {
  timeoutMs: number;
}

// Main environment configuration interface
export interface EnvironmentConfig {
  nodeEnv: NodeEnv;
  
  // Cache configurations
  cache: {
    [key: string]: CacheConfig;
  };
  
  // CORS configurations
  cors: {
    [key: string]: CorsConfig;
  };
  
  // Container configurations
  containers: {
    [key in Container]?: ContainerConfig;
  };
  
  // Database configurations
  databases: {
    postgresql?: DatabaseConfig;
    redis?: {
      [key in RedisType]?: RedisConfig;
    };
  };
  
  // Message broker configurations
  brokers: {
    [key in Brokers]?: KafkaConfig;
  };
  
  // Authentication & Security
  jwt: JwtConfig;
  session?: {
    secret: string;
  };
  crypto?: {
    cipher?: {
      secret: string;
    };
    bcrypt?: {
      salt: string;
    };
  };
  
  // External services (optional for future expansion)
  s3?: any;
  firebase?: any;
  googleCloud?: any;
  backup?: {
    dir: string;
  };
  
  // Development & debugging
  productionUrl?: string;
  e2eEnabled?: boolean;
}

export interface EnvModuleOptions {
  isGlobal?: boolean;
}
