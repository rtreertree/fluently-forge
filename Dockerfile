# Stage 1: Install dependencies and build the app
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source files
COPY . .

RUN npx prisma generate

# Build the Next.js app
RUN npm run build

# Install production dependencies only
RUN npm prune --production

# Stage 2: Create minimal production image
FROM node:18-alpine AS runner

# Set environment variables
ENV NODE_ENV=production

# Create app directory
WORKDIR /app

# Copy production dependencies and build output from builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# Expose Next.js default port
EXPOSE 3000

# Start the app
CMD ["npm", "start"]
