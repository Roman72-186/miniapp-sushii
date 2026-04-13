# Stage 1: Build React
FROM node:20-alpine AS build
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:20-alpine
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY --from=build /app/build ./build
COPY --from=build /app/api ./api
COPY --from=build /app/config ./config
COPY --from=build /app/public ./public
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/server.js .
COPY --from=build /app/package*.json ./
RUN npm ci --omit=dev && apk del python3 make g++
RUN mkdir -p data/users data/gifts
EXPOSE 3001
CMD ["node", "server.js"]
