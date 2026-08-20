# Pagamentos

Esta base deixa a plataforma pronta para conectar um gateway de terceiros com PIX e cartao sem expor dados sensiveis no Vitalissy.

## Fluxo

1. O usuario escolhe o plano Premium.
2. O frontend chama `POST /api/payments/checkout`.
3. O backend cria `Order`, `OrderItem` e `Payment`.
4. O adapter do gateway cria o checkout externo ou pagamento PIX.
5. O frontend redireciona para o checkout seguro do gateway ou exibe o PIX.
6. O gateway chama `POST /api/payments/webhooks/:provider`.
7. O backend valida assinatura, marca o pagamento como pago e libera Premium.

## Segurança

- Nao salvar numero de cartao, CVV ou validade no banco.
- Usar checkout hospedado ou tokenizacao oficial do gateway.
- Validar assinatura de webhook com `PAYMENT_WEBHOOK_SECRET`.
- Confirmar Premium apenas pelo webhook/backend, nunca apenas pelo retorno do navegador.
- Manter `JWT_SECRET` e segredos do gateway somente na VPS.

## Onde plugar o gateway

O ponto central e:

```txt
backend/src/services/payment-gateway.service.ts
```

Ali ficam as chamadas oficiais do provedor escolhido. A integracao Stripe ja cria uma Checkout Session no backend e processa webhooks assinados.

Variaveis principais:

```env
PAYMENT_PROVIDER="stripe"
PAYMENT_WEBHOOK_SECRET="segredo-forte"
STRIPE_SECRET_KEY="COLOQUE_A_CHAVE_SECRETA_DA_STRIPE_NO_EASYPANEL"
STRIPE_WEBHOOK_SECRET="COLOQUE_O_SEGREDO_DO_WEBHOOK_DA_STRIPE_NO_EASYPANEL"
APP_URL="https://app.vitalissy.com.br"
PAYMENT_SUCCESS_PATH="/premium?payment=success"
PAYMENT_CANCEL_PATH="/premium?payment=cancelled"
```

Webhook Stripe em producao:

```txt
https://app.vitalissy.com.br/api/payments/webhooks/stripe
```

Eventos recomendados: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `payment_intent.succeeded` e `payment_intent.payment_failed`.

## Endpoints

- `GET /api/payments/products`
- `POST /api/payments/checkout`
- `GET /api/payments/orders`
- `GET /api/payments/orders/:orderId`
- `POST /api/payments/webhooks/:provider`
- `GET /api/admin/orders`
- `GET /api/admin/products`

## Modelos adicionados

- `Product`
- `Order`
- `OrderItem`
- `Payment`
- `PaymentWebhookEvent`

O seed cria o produto `vitalissy-premium-monthly` por `R$ 19,90`.
