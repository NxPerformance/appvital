# Vitalissy

Projeto dividido em:

- `frontend`: app React/Vite na raiz deste repositório
- `backend`: API Node/Express com Prisma em [backend/README.md](backend/README.md)

## Stack atual

- Frontend: Vite, React, TypeScript, shadcn-ui, Tailwind
- Backend: Node, Express, Prisma, PostgreSQL, JWT
- Pagamentos: base pronta para checkout externo com PIX e cartao

## Rodando localmente

### 1. Frontend

```sh
npm install
cp .env.example .env
npm run dev
```

Variável obrigatória no frontend:

```sh
VITE_API_URL=http://localhost:3001/api
```

### 2. Backend

```sh
cd backend
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

## Deploy na VPS

Ordem recomendada:

1. Subir PostgreSQL
2. Subir backend Node
3. Rodar migrations e seed do Prisma
4. Configurar `VITE_API_URL` do frontend apontando para o backend publicado
5. Gerar build do frontend e servir com Nginx

## Observações

- O frontend já foi migrado para consumir a API própria.
- A antiga integração com Supabase foi removida da aplicação (a pasta `supabase/` também foi removida do repositório).
- Para deploy na Hostinger VPS, use também [docs/hostinger-vps.md](docs/hostinger-vps.md).
- Para deploy pelo painel com Compose, use [docs/dokploy-vps.md](docs/dokploy-vps.md).
- Para conectar um gateway de pagamento, use [docs/payments-readiness.md](docs/payments-readiness.md).
