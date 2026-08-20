-- CreateEnum
CREATE TYPE "TrainerClientStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "BodyProgressPhotoPose" AS ENUM ('FRONT', 'SIDE', 'BACK', 'CUSTOM');

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'PERSONAL_TRAINER';

-- CreateTable
CREATE TABLE "TrainerClient" (
    "id" UUID NOT NULL,
    "trainerId" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "status" "TrainerClientStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainerClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BodyProgressPhoto" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "pose" "BodyProgressPhotoPose" NOT NULL,
    "label" TEXT,
    "notes" TEXT,
    "takenAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BodyProgressPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TrainerClient_trainerId_clientId_key" ON "TrainerClient"("trainerId", "clientId");

-- CreateIndex
CREATE INDEX "TrainerClient_trainerId_status_idx" ON "TrainerClient"("trainerId", "status");

-- CreateIndex
CREATE INDEX "TrainerClient_clientId_status_idx" ON "TrainerClient"("clientId", "status");

-- CreateIndex
CREATE INDEX "BodyProgressPhoto_userId_takenAt_idx" ON "BodyProgressPhoto"("userId", "takenAt");

-- CreateIndex
CREATE INDEX "BodyProgressPhoto_pose_idx" ON "BodyProgressPhoto"("pose");

-- AddForeignKey
ALTER TABLE "TrainerClient" ADD CONSTRAINT "TrainerClient_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainerClient" ADD CONSTRAINT "TrainerClient_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BodyProgressPhoto" ADD CONSTRAINT "BodyProgressPhoto_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
