# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./
RUN npm ci --only=production

# Copy backend code
COPY backend/. .

# Expose port
EXPOSE 8080

# Start server
CMD ["node", "server.js"]