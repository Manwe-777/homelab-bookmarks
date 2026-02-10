FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3101

# Use dev mode for auto-reload with node --watch
CMD ["npm", "run", "dev"]
