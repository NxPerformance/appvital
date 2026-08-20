# Vitalissy Backend

Backend Node/TypeScript criado para substituir o uso atual de Supabase por uma API propria hospedada na sua VPS.

## Stack

- Express
- Prisma
- PostgreSQL
- JWT
- Multer para upload de avatar

## Modulos incluidos

- autenticacao com email e senha
- perfil do usuario
- conquistas
- agendamentos
- treinos musculacao e cardio
- injetaveis
- bioimpedancia
- pagamentos com base pronta para PIX e cartao
- area admin
- auditoria administrativa

## Como rodar

1. Entre em `backend`
2. Copie `.env.example` para `.env`
3. Instale dependencias com `npm install`
4. Gere o Prisma Client com `npm run prisma:generate`
5. Rode as migrations com `npm run prisma:migrate`
6. Suba o seed com `npm run prisma:seed`
7. Inicie com `npm run dev`

## Pagamentos

A API ja possui a base para compras internas com PIX e cartao:

- `GET /api/payments/products`: lista produtos ativos.
- `POST /api/payments/checkout`: cria pedido/pagamento e retorna URL/PIX do gateway.
- `POST /api/payments/webhooks/:provider`: recebe confirmacoes assinadas do gateway.
- `GET /api/payments/orders`: lista pedidos do usuario autenticado.
- `GET /api/admin/orders`: lista pedidos para administradores.
- `GET /api/admin/products`: lista produtos cadastrados para administradores.

Por seguranca, o backend nao recebe nem salva dados de cartao. A integracao Stripe usa Checkout hospedado, salva apenas IDs externos/status e libera Premium somente depois do webhook assinado.

Configure em producao:

```env
PAYMENT_PROVIDER="stripe"
PAYMENT_WEBHOOK_SECRET="segredo-forte-do-webhook"
STRIPE_SECRET_KEY="COLOQUE_A_CHAVE_SECRETA_DA_STRIPE_NO_EASYPANEL"
STRIPE_WEBHOOK_SECRET="COLOQUE_O_SEGREDO_DO_WEBHOOK_DA_STRIPE_NO_EASYPANEL"
APP_URL="https://seu-dominio.com"
```

No painel da Stripe, configure o webhook para `https://seu-dominio.com/api/payments/webhooks/stripe`.

## Deploy

Arquivos de apoio criados no projeto:

- [docker-compose.yml](/Users/wrstore/Documents/vital-app-main/docker-compose.yml:1)
- [backend/ecosystem.config.cjs](/Users/wrstore/Documents/vital-app-main/backend/ecosystem.config.cjs:1)
- [nginx.production.conf](/Users/wrstore/Documents/vital-app-main/nginx.production.conf:1)
- [docs/deploy-vps.md](/Users/wrstore/Documents/vital-app-main/docs/deploy-vps.md:1)

## Observacoes

- O frontend ja foi migrado para consumir `/api`.
- O backend ja compila e o schema Prisma esta valido.
- A validacao final ponta a ponta depende de banco rodando e migrations aplicadas no ambiente.
