# syntax=docker/dockerfile:1
ARG NODE_VERSION=20.18.0

# Build Stage
FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /usr/src/app
COPY package*.json ./
COPY apps/user/package*.json ./apps/user/
RUN npm ci
COPY . .
RUN cd apps/user && npx prisma generate
RUN npm run build:user

# Production Stage
FROM node:${NODE_VERSION}-alpine AS production
WORKDIR /usr/src/app
COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/package*.json ./
COPY --from=build /usr/src/app/apps/user/package*.json ./apps/user/
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/node_modules/.prisma ./node_modules/.prisma
# Also ensure the generated client is available under the @prisma/client package
# so that require('@prisma/client') -> default.js -> require('.prisma/client/default') works
RUN if [ -d /usr/src/app/node_modules/.prisma ]; then \
		mkdir -p /usr/src/app/node_modules/@prisma/client/.prisma && \
		cp -a /usr/src/app/node_modules/.prisma/. /usr/src/app/node_modules/@prisma/client/.prisma/; \
	fi
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001
USER nestjs
EXPOSE 8003
CMD ["node", "dist/apps/user/main.js"]