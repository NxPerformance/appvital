-- AlterTable
ALTER TABLE "TrainerClient"
ADD COLUMN "goals" TEXT,
ADD COLUMN "trainingPlan" TEXT;

-- CreateTable
CREATE TABLE "TrainerClientLog" (
    "id" UUID NOT NULL,
    "trainerClientId" UUID NOT NULL,
    "trainerId" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainerClientLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrainerClientLog_trainerClientId_createdAt_idx" ON "TrainerClientLog"("trainerClientId", "createdAt");

-- CreateIndex
CREATE INDEX "TrainerClientLog_trainerId_clientId_createdAt_idx" ON "TrainerClientLog"("trainerId", "clientId", "createdAt");

-- AddForeignKey
ALTER TABLE "TrainerClientLog" ADD CONSTRAINT "TrainerClientLog_trainerClientId_fkey" FOREIGN KEY ("trainerClientId") REFERENCES "TrainerClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
