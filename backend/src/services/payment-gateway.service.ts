import crypto from "node:crypto";
import { PaymentMethod, PaymentProvider, type BillingCycle } from "@prisma/client";
import Stripe from "stripe";
import { env } from "../config/env.js";
import { getActivePaymentProvider, getStripeSecrets } from "./payment-gateway-settings.service.js";

export interface CheckoutRequest {
  orderId: string;
  paymentId: string;
  amountCents: number;
  currency: string;
  method: PaymentMethod;
  customerEmail: string;
  description: string;
  productName?: string;
  billingCycle?: BillingCycle;
  userId?: string;
}

export interface CheckoutResponse {
  provider: PaymentProvider;
  providerPaymentId?: string;
  providerPreferenceId?: string;
  checkoutUrl?: string;
  pixQrCode?: string;
  pixCopyPaste?: string;
  expiresAt?: Date;
}

const stripeClients = new Map<string, Stripe>();

function getStripeClient(secretKey: string | undefined) {
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY nao configurada");
  }

  const existing = stripeClients.get(secretKey);
  if (existing) return existing;

  const stripe = new Stripe(secretKey);
  stripeClients.set(secretKey, stripe);
  return stripe;
}

function buildAppUrl(path: string, extraParams?: Record<string, string>) {
  const url = new URL(path, env.APP_URL);

  for (const [key, value] of Object.entries(extraParams ?? {})) {
    url.searchParams.set(key, value);
  }

  return url.toString();
}

function getStripePaymentMethodTypes(method: PaymentMethod): Array<"card" | "pix"> | undefined {
  if (method === PaymentMethod.CREDIT_CARD) return ["card"];
  if (method === PaymentMethod.PIX) return ["pix"];
  return undefined;
}

export async function getConfiguredPaymentProvider() {
  return getActivePaymentProvider();
}

export async function createGatewayCheckout(request: CheckoutRequest): Promise<CheckoutResponse> {
  const provider = await getConfiguredPaymentProvider();

  if (provider === PaymentProvider.MANUAL) {
    return {
      provider,
      providerPaymentId: `manual_${request.paymentId}`,
      checkoutUrl: `${env.APP_URL}/premium?payment=pending&order_id=${request.orderId}`,
      expiresAt: new Date(Date.now() + 1000 * 60 * 30),
    };
  }

  if (provider === PaymentProvider.STRIPE) {
    const stripeSecrets = await getStripeSecrets();
    const stripe = getStripeClient(stripeSecrets.secretKey);
    const paymentMethodTypes = getStripePaymentMethodTypes(request.method);
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        client_reference_id: request.orderId,
        customer_email: request.customerEmail,
        locale: "pt-BR",
        payment_method_types: paymentMethodTypes,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: request.currency.toLowerCase(),
              unit_amount: request.amountCents,
              product_data: {
                name: request.productName ?? request.description,
                description: request.description,
              },
            },
          },
        ],
        metadata: {
          order_id: request.orderId,
          payment_id: request.paymentId,
          user_id: request.userId ?? "",
        },
        payment_intent_data: {
          metadata: {
            order_id: request.orderId,
            payment_id: request.paymentId,
            user_id: request.userId ?? "",
          },
        },
        success_url: buildAppUrl(env.PAYMENT_SUCCESS_PATH, {
          session_id: "{CHECKOUT_SESSION_ID}",
          order_id: request.orderId,
        }),
        cancel_url: buildAppUrl(env.PAYMENT_CANCEL_PATH, {
          order_id: request.orderId,
        }),
      },
      {
        idempotencyKey: `checkout_${request.paymentId}`,
      },
    );

    return {
      provider,
      providerPaymentId: typeof session.payment_intent === "string" ? session.payment_intent : undefined,
      providerPreferenceId: session.id,
      checkoutUrl: session.url ?? undefined,
      expiresAt: session.expires_at ? new Date(session.expires_at * 1000) : undefined,
    };
  }

  throw new Error(
    `Gateway ${provider} ainda nao foi conectado. Configure o adapter em payment-gateway.service.ts.`,
  );
}

export async function constructStripeWebhookEvent(rawBody: Buffer | undefined, signature: string | undefined) {
  const stripeSecrets = await getStripeSecrets();
  const webhookSecret = stripeSecrets.webhookSecret;

  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET nao configurado");
  }

  if (!rawBody || !signature) {
    throw new Error("Webhook Stripe sem corpo bruto ou assinatura");
  }

  return getStripeClient(stripeSecrets.secretKey).webhooks.constructEvent(rawBody, signature, webhookSecret);
}

export async function retrieveStripeCheckoutSession(sessionId: string) {
  const stripeSecrets = await getStripeSecrets();
  const stripe = getStripeClient(stripeSecrets.secretKey);

  return stripe.checkout.sessions.retrieve(sessionId);
}

export function verifyWebhookSignature(rawBody: Buffer | undefined, signature: string | undefined) {
  if (!env.PAYMENT_WEBHOOK_SECRET) {
    return env.NODE_ENV !== "production";
  }

  if (!rawBody || !signature) {
    return false;
  }

  const expected = crypto
    .createHmac("sha256", env.PAYMENT_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");

  const received = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");

  return received.length === expectedBuffer.length && crypto.timingSafeEqual(received, expectedBuffer);
}
