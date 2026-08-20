CREATE TYPE "WearableProvider" AS ENUM ('APPLE_HEALTH', 'GOOGLE_FIT', 'GARMIN', 'FITBIT');

CREATE TYPE "WearableConnectionStatus" AS ENUM ('CONNECTED', 'DISCONNECTED', 'NEEDS_REAUTH');

CREATE TYPE "WearableNotificationType" AS ENUM ('HEART_RATE', 'RECOVERY', 'SLEEP', 'SYNC', 'CONSENT');

CREATE TYPE "WearableNotificationSeverity" AS ENUM ('INFO', 'SUCCESS', 'WARNING', 'CRITICAL');

CREATE TABLE "WearableConnection" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "provider" "WearableProvider" NOT NULL,
  "status" "WearableConnectionStatus" NOT NULL DEFAULT 'CONNECTED',
  "deviceName" TEXT,
  "externalAccountLabel" TEXT,
  "accessTokenEncrypted" TEXT,
  "refreshTokenEncrypted" TEXT,
  "tokenExpiresAt" TIMESTAMP(3),
  "scopes" JSONB,
  "consentVersion" TEXT NOT NULL DEFAULT 'v1',
  "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSyncAt" TIMESTAMP(3),
  "disconnectedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "WearableConnection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WearableReading" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "connectionId" UUID,
  "provider" "WearableProvider" NOT NULL,
  "recordedAt" TIMESTAMP(3) NOT NULL,
  "heartRateBpm" INTEGER,
  "restingHeartRateBpm" INTEGER,
  "hrvMs" INTEGER,
  "spo2Percent" DECIMAL(5,2),
  "activeCalories" INTEGER,
  "steps" INTEGER,
  "sleepMinutes" INTEGER,
  "recoveryScore" INTEGER,
  "stressScore" INTEGER,
  "batteryPercent" INTEGER,
  "rawSummary" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "WearableReading_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WearableNotification" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "type" "WearableNotificationType" NOT NULL,
  "severity" "WearableNotificationSeverity" NOT NULL DEFAULT 'INFO',
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "readAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "WearableNotification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WearableConnection_userId_provider_key" ON "WearableConnection"("userId", "provider");
CREATE INDEX "WearableConnection_userId_status_idx" ON "WearableConnection"("userId", "status");
CREATE INDEX "WearableConnection_provider_idx" ON "WearableConnection"("provider");
CREATE INDEX "WearableReading_userId_recordedAt_idx" ON "WearableReading"("userId", "recordedAt");
CREATE INDEX "WearableReading_connectionId_idx" ON "WearableReading"("connectionId");
CREATE INDEX "WearableReading_provider_recordedAt_idx" ON "WearableReading"("provider", "recordedAt");
CREATE INDEX "WearableNotification_userId_isRead_createdAt_idx" ON "WearableNotification"("userId", "isRead", "createdAt");
CREATE INDEX "WearableNotification_type_idx" ON "WearableNotification"("type");
CREATE INDEX "WearableNotification_severity_idx" ON "WearableNotification"("severity");

ALTER TABLE "WearableConnection" ADD CONSTRAINT "WearableConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WearableReading" ADD CONSTRAINT "WearableReading_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WearableReading" ADD CONSTRAINT "WearableReading_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "WearableConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WearableNotification" ADD CONSTRAINT "WearableNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
