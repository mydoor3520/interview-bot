# ── Stage 1: Dependencies ──
FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && cp -R node_modules /prod_node_modules
RUN npm ci

# ── Stage 2: Build ──
FROM node:20-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules

# Chromium install before COPY . . so it's cached across code changes
ENV PLAYWRIGHT_BROWSERS_PATH=/app/.cache/ms-playwright
RUN npx playwright install chromium

COPY . .
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
ENV JWT_SECRET="build-time-dummy-secret-not-used-in-production"
RUN npx prisma generate
RUN npm run build

# ── Stage 3: Production ──
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PLAYWRIGHT_BROWSERS_PATH=/app/.cache/ms-playwright

# Chromium system dependencies + Korean fonts
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 libatk1.0-0 libatk-bridge2.0-0 libxkbcommon0 \
    libpango-1.0-0 libgbm1 libasound2 libxrandr2 libxcomposite1 \
    libxdamage1 libcups2 libdrm2 libxshmfence1 libxfixes3 fonts-noto-cjk \
    poppler-utils poppler-data \
    && rm -rf /var/lib/apt/lists/*

# Debian-compatible user creation
RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma

# Production node_modules (includes playwright core)
COPY --from=deps /prod_node_modules ./node_modules

# Prisma generated files (must override prod node_modules)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/.bin/prisma ./node_modules/.bin/prisma

# Chromium binaries (installed in builder, copied to runner)
COPY --from=builder /app/.cache/ms-playwright ./.cache/ms-playwright

COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

# Create uploads directory with nextjs ownership (before USER switch)
RUN mkdir -p /app/public/uploads/photos && chown -R nextjs:nodejs /app/public/uploads

# Prisma needs write access to @prisma/engines during migrate deploy
RUN chown -R nextjs:nodejs /app/node_modules/@prisma/engines /app/node_modules/.prisma

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["/app/entrypoint.sh"]
