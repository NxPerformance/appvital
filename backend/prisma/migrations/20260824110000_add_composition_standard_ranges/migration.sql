-- AlterTable
ALTER TABLE "BioimpedanceRecord" ADD COLUMN     "bodyFatStandardLow" DECIMAL(10,2),
ADD COLUMN     "bodyFatStandardHigh" DECIMAL(10,2),
ADD COLUMN     "muscleStandardLow" DECIMAL(10,2),
ADD COLUMN     "muscleStandardHigh" DECIMAL(10,2);
