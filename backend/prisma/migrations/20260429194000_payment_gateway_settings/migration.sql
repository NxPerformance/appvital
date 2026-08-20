CREATE TABLE "PaymentGatewaySetting" (
  "id" UUID NOT NULL,
  "provider" "PaymentProvider" NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "publishableKey" TEXT,
  "secretKeyEncrypted" TEXT,
  "webhookSecretEncrypted" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PaymentGatewaySetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PaymentGatewaySetting_provider_key" ON "PaymentGatewaySetting"("provider");
CREATE INDEX "PaymentGatewaySetting_isActive_idx" ON "PaymentGatewaySetting"("isActive");
