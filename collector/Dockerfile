FROM node:20-alpine

WORKDIR /app

# better-sqlite3 needs build tools
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm install --production

COPY src ./src

EXPOSE 3100

# Use dev mode for auto-reload with node --watch
CMD ["npm", "run", "dev"]
