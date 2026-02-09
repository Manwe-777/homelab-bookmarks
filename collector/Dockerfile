FROM node:20-alpine

WORKDIR /app

# better-sqlite3 needs build tools
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm install --production

COPY src ./src

EXPOSE 3100

CMD ["node", "src/index.js"]
