# Vitalissy Backend

Express + TypeScript + Prisma + PostgreSQL. Reconstruido a partir de `docs/backend-legacy-audit.md`.

## Rodando localmente

1. Copie `.env.example` para `.env` e ajuste `DATABASE_URL`/`JWT_SECRET` (ou use o `.env` ja presente para dev local).
2. Instale as dependencias:
   ```
   npm install
   ```
3. Gere o client do Prisma e aplique as migrations:
   ```
   npm run prisma:generate
   npx prisma migrate dev --name init
   ```
4. Rode o seed (cria usuario admin, conquistas e o produto Premium):
   ```
   npm run prisma:seed
   ```
5. Suba o servidor em modo desenvolvimento:
   ```
   npm run dev
   ```

O servidor sobe em `http://localhost:3001` (`GET /api/health` para checar).

## Build de producao

```
npm run build
npm run prisma:deploy
npm run prisma:seed
npm run start
```

## Usuario admin de desenvolvimento

- E-mail: `admin@vitalissy.dev`
- Senha: `VitalissyDev2026!`
