FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
ARG VITE_STEAM_API_KEY
ARG VITE_BASE_URL
ARG NODE_ENV
ENV VITE_STEAM_API_KEY=$VITE_STEAM_API_KEY
ENV VITE_BASE_URL=$VITE_BASE_URL
ENV NODE_ENV=$NODE_ENV
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000
ENV HOST=0.0.0.0
COPY --from=build /app ./
EXPOSE 5000
CMD ["npm","run","preview","--","--host","0.0.0.0","--port","5000"]
