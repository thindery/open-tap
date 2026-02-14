FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy relay server
COPY relay/server.js ./relay/.

EXPOSE 3000

CMD ["node", "relay/server.js"]
