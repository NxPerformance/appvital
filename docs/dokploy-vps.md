# Deploy na VPS com Compose

Este guia considera a tela do painel com opcoes `Aplicativo`, `Postgres` e `Compose`.

## Opcao recomendada

Use `Compose`, porque o projeto precisa subir tres partes juntas:

- `postgres`: banco de dados
- `backend`: API Node/Express
- `frontend`: React servido por Nginx

O arquivo preparado para isso e:

```txt
docker-compose.prod.yml
```

## Variaveis

No servico Compose, configure estas variaveis de ambiente:

```env
POSTGRES_DB=vitalissy
POSTGRES_USER=vitalissy
POSTGRES_PASSWORD=troque-por-uma-senha-forte-do-postgres

JWT_SECRET=troque-por-um-segredo-muito-forte-com-mais-de-32-caracteres
JWT_EXPIRES_IN=7d

CORS_ORIGIN=http://SEU_IP_DA_VPS
APP_URL=http://SEU_IP_DA_VPS
FRONTEND_PORT=80

PAYMENT_PROVIDER=stripe
PAYMENT_WEBHOOK_SECRET=troque-quando-configurar-o-gateway
STRIPE_SECRET_KEY=COLOQUE_A_CHAVE_SECRETA_DA_STRIPE_NO_EASYPANEL
STRIPE_WEBHOOK_SECRET=COLOQUE_O_SEGREDO_DO_WEBHOOK_DA_STRIPE_NO_EASYPANEL
PAYMENT_SUCCESS_PATH=/premium?payment=success
PAYMENT_CANCEL_PATH=/premium?payment=cancelled
```

Quando tiver dominio e SSL, troque:

```env
APP_URL=https://app.vitalissy.com.br
CORS_ORIGIN=https://app.vitalissy.com.br
```

Para manter mais de um dominio funcionando no login/API, separe as origens por virgula:

```env
CORS_ORIGIN=https://app.vitalissy.com.br
```

## Primeira subida

1. Crie o servico como `Compose`.
2. Aponte para o repositorio do projeto.
3. Use `docker-compose.prod.yml` como arquivo Compose.
4. Cole as variaveis acima.
5. Execute o deploy.

Na primeira subida, o backend executa automaticamente:

```sh
npm run prisma:deploy
npm run prisma:seed
npm run start
```

Isso cria as tabelas e cadastra:

- admin: `erykdeveloper@gmail.com`
- senha inicial: `Admin123456`
- produto: `Vitalissy Premium`, `R$ 19,90`

## Testes rapidos

Depois do deploy, valide:

```txt
http://SEU_IP_DA_VPS/api/health
```

Resposta esperada:

```json
{"status":"ok"}
```

Depois acesse:

```txt
http://SEU_IP_DA_VPS
```

## Importante

- Troque a senha do admin depois do primeiro login.
- Troque `POSTGRES_PASSWORD` e `JWT_SECRET` antes de usar com usuarios reais.
- O gateway de pagamento ainda fica em modo `manual` ate conectar Mercado Pago, Asaas, Pagar.me ou Stripe.
- Nao exponha a porta `5432` do Postgres publicamente.
