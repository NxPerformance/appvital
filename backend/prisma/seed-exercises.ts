// Importa/atualiza o catálogo de exercícios (LibraryExercise) a partir de
// prisma/seed-data/exercises.json — dataset traduzido do free-exercise-db
// (github.com/yuhonas/free-exercise-db, MIT license). Seguro rodar de novo:
// substitui o conteúdo da tabela por completo a cada execução.
//
// Uso: npx tsx prisma/seed-exercises.ts

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
