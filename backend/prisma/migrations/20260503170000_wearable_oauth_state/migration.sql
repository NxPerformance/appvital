CREATE TABLE "WearableOAuthState" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "provider" "WearableProvider" NOT NULL,
  "state" TEXT NOT NULL,
  "codeVerifier" TEXT NOT NULL,
  "redirectPath" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "WearableOAuthState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WearableOAuthState_state_key" ON "WearableOAuthState"("state");
CREATE INDEX "WearableOAuthState_userId_provider_expiresAt_idx" ON "WearableOAuthState"("userId", "provider", "expiresAt");
CREATE INDEX "WearableOAuthState_expiresAt_idx" ON "WearableOAuthState"("expiresAt");

ALTER TABLE "WearableOAuthState" ADD CONSTRAINT "WearableOAuthState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
