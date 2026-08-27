FROM node:20-alpine AS build

WORKDIR /app

# Grava o commit atual em GIT_SHA (lido pelo endpoint /health) para dar pra
# confirmar, sem acesso ao painel de deploy, se o build rodando em produção
# corresponde mesmo ao último merge. Nunca falha o build: se o contexto não
# tiver .git (alguns fluxos de deploy exportam só os arquivos), cai em
# "unknown" em vez de quebrar tudo.
RUN apk add --no-cache git
COPY . /repo
RUN (cd /repo && git rev-parse --short HEAD) > /app/GIT_SHA 2>/dev/null || echo "unknown" > /app/GIT_SHA
RUN rm -rf /repo

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
COPY --from=build /app/GIT_SHA ./GIT_SHA

EXPOSE 3001

CMD ["sh", "-c", "npm run prisma:deploy && npm run prisma:seed && npm run prisma:seed:exercises && npm run start"]
