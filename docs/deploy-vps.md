# Deploy VPS

## Visao geral

Arquitetura recomendada na VPS:

- `frontend` buildado em `dist/`
- `backend` Node rodando em `127.0.0.1:3001`
- `postgresql`
- `nginx` fazendo proxy de `/api` e servindo o frontend

## Opcao 1: subir rapido com Docker Compose

Na raiz do projeto:

```sh
docker compose up -d
```

Observacao:

- Troque `JWT_SECRET` no [docker-compose.yml](/Users/wrstore/Documents/vital-app-main/docker-compose.yml:1) antes de producao.
- Ajuste `CORS_ORIGIN` para seu dominio real. Para o app principal, use `https://app.vitalissy.com.br`.

## Opcao 2: deploy manual com PM2 + Nginx

### 1. Backend

```sh
cd /var/www/vital-app-main/backend
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:deploy
npm run prisma:seed
npm run build
pm2 start ecosystem.config.cjs
pm2 save
```

### 2. Frontend

Na raiz:

```sh
cp .env.example .env
```

Configure:

```sh
VITE_API_URL=https://app.vitalissy.com.br/api
```

Depois:

```sh
npm install
npm run build
```

### 3. Nginx

Use [nginx.production.conf](/Users/wrstore/Documents/vital-app-main/nginx.production.conf:1) como base e ajuste:

- `server_name`
- caminho do `root`

## Checklist de validacao

1. `GET /api/health` responde `{"status":"ok"}`
2. cadastro e login funcionam
3. avatar sobe em `/uploads`
4. area admin abre com usuario admin
5. CRUD de treinos, agendamentos e injetaveis responde sem erro
