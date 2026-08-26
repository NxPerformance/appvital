// Importa/atualiza o catálogo de exercícios (LibraryExercise) a partir de
// prisma/seed-data/exercises.json — dataset traduzido do free-exercise-db
// (github.com/yuhonas/free-exercise-db, MIT license). Roda automaticamente
// a cada deploy (ver backend/Dockerfile); por padrão pula se a tabela já
// estiver populada, para não custar uma escrita de ~900 linhas a cada boot.
//
// Uso: npx tsx prisma/seed-exercises.ts [--force]
//   --force reimporta mesmo se a tabela já tiver dados (use depois de
//   atualizar o dicionário de tradução ou o dataset de origem).

import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const prisma = new PrismaClient();
const __dirname = dirname(fileURLToPath(import.meta.url));

interface TranslatedExercise {
  id: string;
  nameEn: string;
  namePt: string;
  force: string | null;
  level: string | null;
  mechanic: string | null;
  equipment: string | null;
  category: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  images: string[];
}

async function main() {
  const force = process.argv.includes("--force");

  const existingCount = await prisma.libraryExercise.count();
  if (existingCount > 0 && !force) {
    console.log(`LibraryExercise já populada (${existingCount} exercícios), pulando importação.`);
    return;
  }

  const raw = readFileSync(join(__dirname, "seed-data", "exercises.json"), "utf-8");
  const exercises: TranslatedExercise[] = JSON.parse(raw);

  await prisma.libraryExercise.deleteMany();

  const result = await prisma.libraryExercise.createMany({
    data: exercises.map((exercise) => ({
      id: exercise.id,
      nameEn: exercise.nameEn,
      namePt: exercise.namePt,
      force: exercise.force,
      level: exercise.level,
      mechanic: exercise.mechanic,
      equipment: exercise.equipment,
      category: exercise.category,
      primaryMuscles: exercise.primaryMuscles,
      secondaryMuscles: exercise.secondaryMuscles,
      instructions: exercise.instructions,
      images: exercise.images,
    })),
  });

  console.log(`Imported ${result.count} exercises`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
