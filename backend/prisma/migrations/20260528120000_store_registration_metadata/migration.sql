-- Store registration choices that were previously used only by the frontend flow.
ALTER TABLE "Profile"
ADD COLUMN "accountType" TEXT NOT NULL DEFAULT 'client',
ADD COLUMN "selectedPlan" TEXT,
ADD COLUMN "initialPaymentMethod" TEXT,
ADD COLUMN "termsAcceptedAt" TIMESTAMP(3);

UPDATE "Profile"
SET "termsAcceptedAt" = COALESCE("entryDate", "createdAt")
WHERE "termsAcceptedAt" IS NULL;
