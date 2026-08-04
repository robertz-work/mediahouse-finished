# ───────────────────────────────────────────────
# Multi-stage Dockerfile for Next.js on Railway
# ───────────────────────────────────────────────
 
# ── Stage 1: Install dependencies ──────────────
FROM node:18-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
 
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts
 
# ── Stage 2: Build the application ─────────────
FROM node:18-alpine AS builder
WORKDIR /app
 
COPY --from=deps /app/node_modules ./node_modules
COPY . .
 
ENV NEXT_TELEMETRY_DISABLED=1
 
RUN npm run build
 
# ── Stage 3: Production image ──────────────────
FROM node:18-alpine AS runner
WORKDIR /app
 
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
 
# su-exec lets the entrypoint drop from root → nextjs after volume setup
RUN apk add --no-cache su-exec
 
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
 
# Copy public assets
RUN mkdir -p ./public
COPY --from=builder /app/public ./public
 
# Copy standalone server output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
 
# Copy default data files for first-deploy seeding
COPY --from=builder --chown=nextjs:nodejs /app/data ./data.defaults
 
# Copy the entrypoint script
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh
 
# Create runtime directories (volume will overlay these)
RUN mkdir -p /app/data /app/public/uploads && \
    chown -R nextjs:nodejs /app/data /app/public/uploads /app/data.defaults
 
# NOTE: No USER directive — entrypoint runs as root, drops to nextjs via su-exec
 
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
 
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]