# Multi-stage Dockerfile for Murabha Cloud Backend
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root and backend package definitions
COPY package*.json ./
COPY backend/package*.json ./backend/

# Install dependencies
RUN npm ci --workspace=backend

# Copy backend source code
COPY backend/ ./backend/

# Build backend bundle
RUN npm run build -w backend

# Production runtime stage
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Install runtime tools
RUN apk add --no-cache curl

# Copy production package manifests and install prod-only dependencies
COPY package*.json ./
COPY backend/package*.json ./backend/
RUN npm ci --omit=dev --workspace=backend

# Copy built artifact and seed scripts from builder
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/src/scripts ./backend/src/scripts

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["npm", "start", "-w", "backend"]
