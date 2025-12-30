# Frontend Dockerfile
FROM node:20-alpine AS deps

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY next.config.js ./
COPY postcss.config.js ./
COPY tailwind.config.js ./

# Install dependencies with retry logic and increased timeout
RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm install || (sleep 10 && npm install) || (sleep 20 && npm install)

# Builder stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Set build-time environment variables
ARG NEXT_PUBLIC_BACKEND_URL
ENV NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL

# Build the application
# Note: Fonts may fail to load during Docker build if network is unavailable
# This is OK - fonts will load at runtime from Google Fonts CDN
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy necessary files from builder
# Create public directory (it may be empty, which is fine)
RUN mkdir -p ./public
# Copy public directory if it exists in builder
RUN --mount=from=builder,source=/app,target=/builder-source \
    if [ -d /builder-source/public ] && [ "$(ls -A /builder-source/public 2>/dev/null)" ]; then \
        cp -r /builder-source/public/* ./public/; \
    fi
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Next.js standalone output creates a server.js in the root
CMD ["node", "server.js"]

