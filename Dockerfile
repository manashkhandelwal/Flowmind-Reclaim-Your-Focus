# ─── STAGE 1: BUILD ───────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install dependencies (clean install including devDependencies)
RUN npm ci

# Copy codebase
COPY . .

# Build the production bundle
RUN npm run build

# Remove development dependencies to keep production image light
RUN npm prune --production

# ─── STAGE 2: RUN ────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

# Install production env defaults
ENV NODE_ENV=production
ENV PORT=3000

# Copy manifests
COPY package*.json ./

# Copy installed production node_modules from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy compiled frontend and backend assets from builder
COPY --from=builder /app/dist ./dist

# Expose the server port
EXPOSE 3000

# Start production server
CMD ["npm", "start"]
