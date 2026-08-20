import crypto from "node:crypto";
import { PaymentProvider } from "@prisma/client";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";

const SECRET_VERSION = "v1";

export interface GatewaySecrets {
  provider: PaymentProvider;
  publishableKey?: string;
  secretKey?: string;
  webhookSecret?: string;
}

function encryptionKey() {
  return crypto.createHash("sha256").update(env.JWT_SECRET).digest();
}

function encryptSecret(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [SECRET_VERSION, iv.toString("base64"), tag.toString("base64"), encrypted.toString("base64")].join(":");
}

function decryptSecret(value: string | null) {
  if (!value) return undefined;

  const [version, iv, tag, encrypted] = value.split(":");
  if (version !== SECRET_VERSION || !iv || !tag || !encrypted) return undefined;

  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

function maskSecret(value: string | undefined) {
  if (!value) return null;
  const suffix = value.slice(-4);
  return `configurada (final ${suffix})`;
}

export async function getActivePaymentProvider() {
  const activeSetting = await prisma.paymentGatewaySetting.findFirst({
    where: { isActive: true },
    orderBy: { updatedAt: "desc" },
  });

  return activeSetting?.provider ?? envProviderToPrisma(env.PAYMENT_PROVIDER);
}

export async function getStripeSecrets(): Promise<GatewaySecrets> {
  const setting = await prisma.paymentGatewaySetting.findUnique({
    where: { provider: PaymentProvider.STRIPE },
  });

  return {
    provider: PaymentProvider.STRIPE,
    publishableKey: setting?.publishableKey ?? undefined,
    secretKey: decryptSecret(setting?.secretKeyEncrypted ?? null) ?? env.STRIPE_SECRET_KEY,
    webhookSecret: decryptSecret(setting?.webhookSecretEncrypted ?? null) ?? env.STRIPE_WEBHOOK_SECRET ?? env.PAYMENT_WEBHOOK_SECRET,
  };
}

export async function getPaymentGatewaySettingsSummary() {
  const setting = await prisma.paymentGatewaySetting.findUnique({
    where: { provider: PaymentProvider.STRIPE },
  });
  const secrets = await getStripeSecrets();

  return {
    provider: "stripe",
    is_active: setting?.isActive ?? env.PAYMENT_PROVIDER === "stripe",
    publishable_key: setting?.publishableKey ?? "",
    has_secret_key: Boolean(secrets.secretKey),
    has_webhook_secret: Boolean(secrets.webhookSecret),
    secret_key_preview: maskSecret(secrets.secretKey),
    webhook_secret_preview: maskSecret(secrets.webhookSecret),
    source: setting ? "database" : "environment",
    updated_at: setting?.updatedAt ?? null,
  };
}

export async function saveStripeGatewaySettings(input: {
  isActive: boolean;
  publishableKey?: string | null;
  secretKey?: string | null;
  webhookSecret?: string | null;
}) {
  if (input.isActive) {
    await prisma.paymentGatewaySetting.updateMany({
      where: { provider: { not: PaymentProvider.STRIPE } },
      data: { isActive: false },
    });
  }

  const data = {
    isActive: input.isActive,
    publishableKey: input.publishableKey?.trim() || null,
    ...(input.secretKey?.trim() ? { secretKeyEncrypted: encryptSecret(input.secretKey.trim()) } : {}),
    ...(input.webhookSecret?.trim()
      ? { webhookSecretEncrypted: encryptSecret(input.webhookSecret.trim()) }
      : {}),
  };

  await prisma.paymentGatewaySetting.upsert({
    where: { provider: PaymentProvider.STRIPE },
    update: data,
    create: {
      provider: PaymentProvider.STRIPE,
      ...data,
    },
  });

  return getPaymentGatewaySettingsSummary();
}

function envProviderToPrisma(provider: typeof env.PAYMENT_PROVIDER) {
  const map: Record<typeof env.PAYMENT_PROVIDER, PaymentProvider> = {
    manual: PaymentProvider.MANUAL,
    mercado_pago: PaymentProvider.MERCADO_PAGO,
    stripe: PaymentProvider.STRIPE,
    pagarme: PaymentProvider.PAGARME,
    asaas: PaymentProvider.ASAAS,
  };

  return map[provider];
}
