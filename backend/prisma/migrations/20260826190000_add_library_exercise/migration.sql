-- CreateTable
CREATE TABLE "LibraryExercise" (
    "id" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "namePt" TEXT NOT NULL,
    "force" TEXT,
    "level" TEXT,
    "mechanic" TEXT,
    "equipment" TEXT,
    "category" TEXT NOT NULL,
    "primaryMuscles" TEXT[],
    "secondaryMuscles" TEXT[],
    "instructions" TEXT[],
    "images" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LibraryExercise_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LibraryExercise_category_idx" ON "LibraryExercise"("category");

-- CreateIndex
CREATE INDEX "LibraryExercise_equipment_idx" ON "LibraryExercise"("equipment");
