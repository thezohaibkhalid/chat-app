    FROM node:20-alpine AS fe-build
    WORKDIR /app/frontend
    COPY frontend/package*.json ./
    RUN npm ci
    ARG VITE_BASE_URL
    ENV VITE_BASE_URL=$VITE_BASE_URL
    ARG VITE_STREAM_API_KEY
    ENV VITE_STREAM_API_KEY=$VITE_STREAM_API_KEY
    COPY frontend/ .
    RUN npm run build
    
    FROM node:20-alpine AS be-deps
    WORKDIR /app/backend
    COPY backend/package*.json ./
    RUN npm ci --omit=dev
    
    FROM node:20-alpine
    ENV NODE_ENV=production
    ENV PORT=3000
    WORKDIR /app/backend
    
    COPY --from=be-deps /app/backend/node_modules ./node_modules
    COPY backend/ ./
    
    RUN mkdir -p /app/frontend/dist
    COPY --from=fe-build /app/frontend/dist /app/frontend/dist
    
    EXPOSE 3000
    CMD ["node","src/server.js"]
    