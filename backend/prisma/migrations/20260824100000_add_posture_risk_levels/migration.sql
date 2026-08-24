-- AlterTable
ALTER TABLE "BioimpedanceRecord" ADD COLUMN     "shoulderRiskLevel" INTEGER,
ADD COLUMN     "humpbackRiskLevel" INTEGER,
ADD COLUMN     "legRiskType" TEXT,
ADD COLUMN     "pelvisRiskLevel" INTEGER,
ADD COLUMN     "spineRiskLevel" INTEGER,
ADD COLUMN     "headRiskLevel" INTEGER,
ADD COLUMN     "kneeRiskLevel" INTEGER,
ADD COLUMN     "frontHeadRiskLevel" INTEGER,
ADD COLUMN     "bodyShapeRiskLevel" INTEGER,
ADD COLUMN     "postureRiskLevel" INTEGER;
