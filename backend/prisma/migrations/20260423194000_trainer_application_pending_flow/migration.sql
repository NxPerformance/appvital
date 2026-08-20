-- CreateEnum
CREATE TYPE "TrainerApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "TrainerApplication" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "status" "TrainerApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "fullName" TEXT NOT NULL,
    "cref" TEXT NOT NULL,
    "crefState" TEXT NOT NULL,
    "specialties" TEXT,
    "experienceYears" INTEGER,
    "instagramHandle" TEXT,
    "proofNotes" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" UUID,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainerApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TrainerApplication_userId_key" ON "TrainerApplication"("userId");

-- CreateIndex
CREATE INDEX "TrainerApplication_status_createdAt_idx" ON "TrainerApplication"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "TrainerApplication" ADD CONSTRAINT "TrainerApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
