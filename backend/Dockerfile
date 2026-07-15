# SkillForge backend — NestJS API
# Neon Postgres stays external (DATABASE_URL via env_file)

FROM node:22-alpine AS build
WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --legacy-peer-deps \
  && npm cache clean --force \
  && apk del python3 make g++

COPY --from=build /app/dist ./dist

RUN mkdir -p uploads/certificates

EXPOSE 3000

CMD ["node", "dist/main.js"]
