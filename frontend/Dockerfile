    FROM node:20-alpine AS deps
    WORKDIR /app
    COPY package*.json ./
    RUN npm ci
    
    FROM node:20-alpine AS build
    WORKDIR /app
    COPY --from=deps /app/node_modules ./node_modules
    COPY . .
    RUN npm run build
    
    FROM node:20-alpine AS runner
    WORKDIR /app
    ENV NODE_ENV=production
    ENV PORT=5000
    ENV HOST=0.0.0.0
    COPY --from=build /app ./
    EXPOSE 5000
    CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "5000"]
    