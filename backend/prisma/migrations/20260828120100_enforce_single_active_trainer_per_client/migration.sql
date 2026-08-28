-- New trainer-client links require the client's consent (see PENDING status
-- added in the previous migration), so default them to PENDING instead of
-- immediately-active.
ALTER TABLE "TrainerClient" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- Enforce at most one ACTIVE trainer per client at the DB level. This can't
-- be expressed in the Prisma schema DSL (no filtered/partial @@unique), so
-- it only exists here.
CREATE UNIQUE INDEX "TrainerClient_clientId_active_unique" ON "TrainerClient" ("clientId") WHERE "status" = 'ACTIVE';
