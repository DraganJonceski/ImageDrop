# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./
RUN npm ci --omit=dev

# Copy backend code
COPY backend/. .

# Expose Railway port
EXPOSE 5000

# Start server
CMD ["node", "server.js"]
