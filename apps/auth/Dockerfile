# syntax=docker/dockerfile:1

ARG NODE_VERSION=20.18.0

# Build Stage
FROM node:${NODE_VERSION}-alpine AS build

WORKDIR /usr/src/app

# Copy only necessary files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm ci 

# Copy remaining source code and build the application
COPY . .
RUN npx nest build auth

# Production Stage (final image)
FROM node:${NODE_VERSION}-alpine AS production

WORKDIR /usr/src/app

# Copy only the build output (NestJS bundles everything into main.js)
COPY --from=build /usr/src/app/dist/apps/auth .

# Copy package.json for production dependencies
COPY --from=build /usr/src/app/package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Run as non-root user
USER node

EXPOSE 8002

# Start the application
CMD ["node", "main.js"]