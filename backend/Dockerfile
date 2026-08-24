FROM node:20-alpine AS build

WORKDIR /app

COPY backend/package*.json ./
RUN npm install

COPY backend/. .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma

EXPOSE 3001

CMD ["sh", "-c", "npm run prisma:deploy && npm run prisma:seed && npm run start"]
