# Environment Configuration Guide

Complete guide for configuring environment variables in FoodFund Microservices.

## 📋 Quick Setup

1. **Copy environment template:**
   ```bash
   cp env.example .env
   ```

2. **Edit required variables:**
   ```bash
   # Essential variables to change
   JWT_SECRET=your-unique-jwt-secret-key
   SESSION_SECRET=your-unique-session-secret
   CIPHER_SECRET=your-unique-cipher-secret
   ```

3. **For Database per Service setup:**
   ```bash
   # Run setup script to initialize databases
   npm run db:setup-per-service
   ```

## 🏗️ Environment Configuration Structure

### 📊 Service Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Auth Service  │    │ Users Subgraph  │    │Campaigns Service│
│   Port: 8080    │    │   Port: 8082    │    │   Port: 8083    │
│   Health: 8081  │    │   Health: 8083  │    │   Health: 8084  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Auth DB       │    │   Users DB      │    │ Campaigns DB    │
│ Port: 5435      │    │ Port: 5433      │    │ Port: 5434      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📝 Environment Variables Reference

### 🚀 Service Configuration

#### Service Ports & Health Checks
```bash
# Auth Service
AUTH_HOST=localhost
AUTH_PORT=8080
AUTH_HEALTH_CHECK_PORT=8081

# GraphQL Gateway  
GRAPHQL_GATEWAY_HOST=localhost
GRAPHQL_GATEWAY_PORT=8081
GRAPHQL_GATEWAY_HEALTH_CHECK_PORT=8082

# Users Subgraph
USERS_SUBGRAPH_HOST=localhost
USERS_SUBGRAPH_PORT=8082
USERS_SUBGRAPH_HEALTH_CHECK_PORT=8083

# Campaigns Subgraph
CAMPAIGNS_SUBGRAPH_HOST=localhost
CAMPAIGNS_SUBGRAPH_PORT=8083
CAMPAIGNS_SUBGRAPH_HEALTH_CHECK_PORT=8084

# Donations Subgraph
DONATIONS_SUBGRAPH_HOST=localhost
DONATIONS_SUBGRAPH_PORT=8084
DONATIONS_SUBGRAPH_HEALTH_CHECK_PORT=8085
```

### 🗄️ Database Configuration (Database per Service)

#### Users Database
```bash
USERS_DATABASE_HOST=localhost
USERS_DATABASE_PORT=5433
USERS_DATABASE_USERNAME=root
USERS_DATABASE_PASSWORD=foodfund
USERS_DATABASE_NAME=users_db
```

#### Campaigns Database
```bash
CAMPAIGNS_DATABASE_HOST=localhost
CAMPAIGNS_DATABASE_PORT=5434
CAMPAIGNS_DATABASE_USERNAME=root
CAMPAIGNS_DATABASE_PASSWORD=foodfund
CAMPAIGNS_DATABASE_NAME=campaigns_db
```

#### Auth Database
```bash
AUTH_DATABASE_HOST=localhost
AUTH_DATABASE_PORT=5435
AUTH_DATABASE_USERNAME=root
AUTH_DATABASE_PASSWORD=foodfund
AUTH_DATABASE_NAME=auth_db
```

### 🔐 Security Configuration

#### JWT Configuration
```bash
JWT_SECRET=your-super-secret-jwt-key-here
JWT_ACCESS_TOKEN_EXPIRATION=15m
JWT_REFRESH_TOKEN_EXPIRATION=30d
```

#### Session & Encryption
```bash
SESSION_SECRET=your-session-secret-key-here
CIPHER_SECRET=your-cipher-secret-key-here
BCRYPT_SALT=10
```

### 📦 Redis Configuration

#### Cache Redis
```bash
CACHE_REDIS_HOST=localhost
CACHE_REDIS_PORT=6379
CACHE_REDIS_PASSWORD=
CACHE_REDIS_CLUSTER_ENABLED=false
```

#### Session Redis
```bash
SESSION_REDIS_HOST=localhost
SESSION_REDIS_PORT=6380
SESSION_REDIS_PASSWORD=
```

#### Job Redis
```bash
JOB_REDIS_HOST=localhost
JOB_REDIS_PORT=6381
JOB_REDIS_PASSWORD=
```

### 🌐 CORS Configuration

#### GraphQL Gateway CORS
```bash
GRAPHQL_ALLOW_ORIGIN_1=http://localhost:3000
GRAPHQL_ALLOW_ORIGIN_2=http://localhost:3001
# ... up to GRAPHQL_ALLOW_ORIGIN_10
```

#### Auth Service CORS
```bash
AUTH_ALLOW_ORIGIN_1=http://localhost:3000
AUTH_ALLOW_ORIGIN_2=http://localhost:3001
# ... up to AUTH_ALLOW_ORIGIN_10
```

### ⚡ Performance Configuration

#### Cache Timeouts
```bash
REDIS_CACHE_TIMEOUT_MS=60000
POSTGRESQL_CACHE_TIMEOUT_MS=60000
GRAPHQL_CACHE_TIMEOUT_MS=60000
```

### 📨 Message Broker (Kafka)
```bash
KAFKA_HOST=localhost
KAFKA_PORT=9092
KAFKA_SASL_ENABLED=false
KAFKA_SASL_USERNAME=
KAFKA_SASL_PASSWORD=
```

## 🌍 Environment-Specific Configurations

### 🔧 Development Environment
```bash
NODE_ENV=development
E2E_ENABLED=false
PRODUCTION_URL=

# Use default localhost configurations
# Weak secrets are acceptable for development
JWT_SECRET=dev-jwt-secret
SESSION_SECRET=dev-session-secret
```

### 🚀 Production Environment
```bash
NODE_ENV=production
E2E_ENABLED=false
PRODUCTION_URL=https://your-production-domain.com

# Strong secrets required
JWT_SECRET=your-256-bit-production-jwt-secret
SESSION_SECRET=your-production-session-secret
CIPHER_SECRET=your-production-cipher-secret

# Production database credentials
USERS_DATABASE_PASSWORD=your-secure-users-db-password
CAMPAIGNS_DATABASE_PASSWORD=your-secure-campaigns-db-password
AUTH_DATABASE_PASSWORD=your-secure-auth-db-password

# Redis passwords
CACHE_REDIS_PASSWORD=your-cache-redis-password
SESSION_REDIS_PASSWORD=your-session-redis-password
JOB_REDIS_PASSWORD=your-job-redis-password
```

### 🧪 Test Environment
```bash
NODE_ENV=test
E2E_ENABLED=true

# Test database configurations
USERS_DATABASE_NAME=users_db_test
CAMPAIGNS_DATABASE_NAME=campaigns_db_test
AUTH_DATABASE_NAME=auth_db_test
```

## ☁️ External Services (Optional)

### AWS S3
```bash
S3_BUCKET_NAME=your-s3-bucket
S3_ENDPOINT=
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=your-access-key
S3_SECRET_ACCESS_KEY=your-secret-key
```

### Firebase
```bash
FIREBASE_CREDENTIAL_TYPE=service_account
FIREBASE_CREDENTIAL_PROJECT_ID=your-project-id
FIREBASE_CREDENTIAL_PRIVATE_KEY=your-private-key
FIREBASE_CREDENTIAL_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
```

### Google Cloud OAuth
```bash
GOOGLE_CLOUD_OAUTH_CLIENT_ID=your-oauth-client-id
GOOGLE_CLOUD_OAUTH_CLIENT_SECRET=your-oauth-secret
GOOGLE_CLOUD_OAUTH_REDIRECT_URI=http://localhost:8080/auth/google/callback
```

## 🔒 Security Best Practices

### 1. JWT Secrets
- **Development**: Can use simple secrets
- **Production**: Use 256-bit random strings
- **Rotation**: Change secrets regularly

### 2. Database Passwords
- Use strong, unique passwords for each database
- Never commit real passwords to version control
- Use environment-specific credentials

### 3. CORS Configuration
- Only allow necessary origins
- Use specific URLs, avoid wildcards in production
- Review CORS settings regularly

### 4. Redis Security
- Use passwords in production
- Consider Redis AUTH
- Secure network access

## 🚀 Docker Configuration

### Development with Docker Compose
```bash
# Override default ports if running in Docker
USERS_DATABASE_HOST=users-db
CAMPAIGNS_DATABASE_HOST=campaigns-db
AUTH_DATABASE_HOST=auth-db

CACHE_REDIS_HOST=cache-redis
SESSION_REDIS_HOST=session-redis
```

### Production with Docker
```bash
# Use internal Docker network hostnames
USERS_DATABASE_HOST=users-postgres-db
CAMPAIGNS_DATABASE_HOST=campaigns-postgres-db
AUTH_DATABASE_HOST=auth-postgres-db
```

## 🔧 Troubleshooting

### Common Issues

1. **Service can't connect to database**
   ```bash
   # Check if ports are correct
   USERS_DATABASE_PORT=5433  # Not 5432
   CAMPAIGNS_DATABASE_PORT=5434
   AUTH_DATABASE_PORT=5435
   ```

2. **JWT tokens invalid**
   ```bash
   # Ensure JWT_SECRET is set and consistent across services
   JWT_SECRET=your-secret-key
   ```

3. **CORS errors**
   ```bash
   # Add your frontend URL to allowed origins
   GRAPHQL_ALLOW_ORIGIN_1=http://localhost:3000
   ```

4. **Redis connection failed**
   ```bash
   # Check Redis is running and ports are correct
   CACHE_REDIS_PORT=6379
   SESSION_REDIS_PORT=6380
   ```

### Environment Validation

The environment configuration includes automatic validation. Check logs for:
- Missing required variables
- Invalid port numbers
- Invalid boolean values
- Database connection issues

### Default Values

If environment variables are not set, the system uses these defaults:
- Ports: 8080, 8081, 8082, etc.
- Database ports: 5433, 5434, 5435
- Redis ports: 6379, 6380, 6381
- Cache timeout: 60000ms (1 minute)
- JWT expiration: 15m access, 30d refresh

## 📚 Related Documentation

- [Database per Service Setup](./DATABASE-PER-SERVICE.md)
- [JWT Configuration](./libs/jwt/README.md)
- [Docker Setup Guide](./docker-compose.yaml)
- [Service Architecture](./README.md)
