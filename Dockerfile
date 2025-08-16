# -------- Base image (small + up-to-date) --------
FROM node:22-alpine AS base
WORKDIR /app
ENV NODE_ENV=production \
    NODE_OPTIONS=--enable-source-maps

# Install tini for proper PID 1 signal handling
RUN apk add --no-cache tini

# Create non-root user
RUN addgroup -S app && adduser -S -D -H -u 10001 app -G app

# -------- Dependencies layer (leverage Docker cache) --------
FROM base AS deps
# Only copy manifest files to maximize layer cache hits
COPY package.json package-lock.json* ./
# Install production deps only; keep it deterministic & fast
RUN npm ci --omit=dev

# -------- Runtime image --------
FROM base AS runtime
# Copy installed node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy the application (only what’s needed at runtime)
COPY src ./src
COPY public ./public
COPY views ./views
# If you have migrations or seeds, include them:
# COPY migrations ./migrations

# Tighten permissions
RUN chown -R app:app /app
USER app

# Listen on 3000 (matches your app’s default)
EXPOSE 3000

# Healthcheck hits your existing /health route
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health || exit 1

# Run with tini as PID 1; then Node
ENTRYPOINT ["/sbin/tini","--"]

# Start the server (adjust if you prefer npm run start)
CMD ["node","src/server.js"]
