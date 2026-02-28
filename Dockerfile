# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:22-alpine AS runner

WORKDIR /app

# Set to production
ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy MCP server
COPY mcp-server.js ./
COPY package.json ./

# Install production dependencies for MCP server
RUN npm install express cors dotenv @supabase/supabase-js date-fns --save

# Change ownership
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000 4000

# Start Next.js app and MCP HTTP server
CMD ["sh", "-c", "node server.js & node mcp-server.js & wait"]
