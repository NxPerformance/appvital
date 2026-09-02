-- AlterTable
ALTER TABLE "BioimpedanceRecord" ADD COLUMN     "bodyImageKey" TEXT,
ADD COLUMN     "sideImageKey" TEXT,
ADD COLUMN     "bodyShape" INTEGER,
ADD COLUMN     "score" INTEGER,
ADD COLUMN     "bodyAge" INTEGER;
