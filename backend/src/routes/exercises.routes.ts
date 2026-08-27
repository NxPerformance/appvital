import { Router } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async-handler.js";

export const exercisesRouter = Router();

exercisesRouter.use(requireAuth);

// Deriva o tipo de treino (aba do "Caderno de exercícios") a partir de
// category/equipment, sem precisar de uma coluna extra no banco. Ordem de
// prioridade importa: categorias de CrossFit (ex: Clean and Jerk) usam barra
// só como equipamento, mas pertencem ao CrossFit, não à Academia.
const CROSSFIT_CATEGORIES = ["levantamento olímpico", "pliometria", "powerlifting", "strongman"];
const STRETCH_CATEGORY = "alongamento";
const HOME_EQUIPMENT = ["elásticos", "bola suíça", "rolo de espuma"];
const BODYWEIGHT_EQUIPMENT = "peso corporal";

const WORKOUT_TYPES = ["academia", "em-casa", "crossfit", "calistenia"] as const;
type WorkoutType = (typeof WORKOUT_TYPES)[number];

function workoutTypeWhere(workoutType: WorkoutType): Prisma.LibraryExerciseWhereInput {
  if (workoutType === "crossfit") {
    return { category: { in: CROSSFIT_CATEGORIES } };
  }

  const notCrossfitOrStretch: Prisma.LibraryExerciseWhereInput = {
    category: { notIn: [...CROSSFIT_CATEGORIES, STRETCH_CATEGORY] },
  };

  if (workoutType === "calistenia") {
    return {
      AND: [notCrossfitOrStretch, { OR: [{ equipment: null }, { equipment: BODYWEIGHT_EQUIPMENT }] }],
    };
  }

  if (workoutType === "em-casa") {
    return { AND: [notCrossfitOrStretch, { equipment: { in: HOME_EQUIPMENT } }] };
  }

  // academia: qualquer equipamento de ginástica que não seja peso corporal
  // (Calistenia) nem elástico/bola suíça/rolo de espuma (Em Casa).
  return {
    AND: [
      notCrossfitOrStretch,
      { equipment: { notIn: [...HOME_EQUIPMENT, BODYWEIGHT_EQUIPMENT] } },
      { equipment: { not: null } },
    ],
  };
}

// Grupos musculares "de academia" (o que o usuário pensa como "treino de
// peito", "treino de tríceps"), agrupando os 17 valores granulares que vêm
// do dataset original em 8 categorias mais naturais para seleção.
const MUSCLE_GROUP_MUSCLES: Record<string, string[]> = {
  peito: ["peitoral"],
  costas: ["dorsais", "lombar", "meio das costas", "trapézio"],
  ombros: ["ombros", "pescoço"],
  biceps: ["bíceps"],
  triceps: ["tríceps", "antebraços"],
  pernas: ["quadríceps", "posteriores de coxa", "panturrilhas", "adutores", "abdutores"],
  gluteos: ["glúteos"],
  abdomen: ["abdômen"],
};

const listSchema = z.object({
  search: z.string().trim().optional(),
  equipment: z.string().trim().optional(),
  muscle: z.string().trim().optional(),
  muscleGroups: z.string().trim().optional(),
  workoutType: z.enum(WORKOUT_TYPES).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(40),
});

function serializeExercise(exercise: {
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
}) {
  return {
    id: exercise.id,
    name: exercise.namePt,
    name_en: exercise.nameEn,
    force: exercise.force,
    level: exercise.level,
    mechanic: exercise.mechanic,
    equipment: exercise.equipment,
    category: exercise.category,
    primary_muscles: exercise.primaryMuscles,
    secondary_muscles: exercise.secondaryMuscles,
    instructions: exercise.instructions,
    images: exercise.images,
  };
}

exercisesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { search, equipment, muscle, muscleGroups, workoutType, limit } = listSchema.parse(req.query);

    const groupMuscles = muscleGroups
      ? Array.from(
          new Set(
            muscleGroups
              .split(",")
              .map((slug) => slug.trim())
              .flatMap((slug) => MUSCLE_GROUP_MUSCLES[slug] ?? []),
          ),
        )
      : [];

    const exercises = await prisma.libraryExercise.findMany({
      where: {
        AND: [
          search
            ? {
                OR: [
                  { namePt: { contains: search, mode: "insensitive" } },
                  { nameEn: { contains: search, mode: "insensitive" } },
                ],
              }
            : {},
          equipment ? { equipment: { equals: equipment, mode: "insensitive" } } : {},
          muscle ? { primaryMuscles: { has: muscle } } : {},
          groupMuscles.length > 0 ? { primaryMuscles: { hasSome: groupMuscles } } : {},
          workoutType ? workoutTypeWhere(workoutType) : {},
        ],
      },
      orderBy: { namePt: "asc" },
      take: limit,
    });

    res.json({ exercises: exercises.map(serializeExercise) });
  }),
);

const equipmentQuerySchema = z.object({
  workoutType: z.enum(WORKOUT_TYPES).optional(),
});

exercisesRouter.get(
  "/equipment",
  asyncHandler(async (req, res) => {
    const { workoutType } = equipmentQuerySchema.parse(req.query);

    const rows = await prisma.libraryExercise.findMany({
      distinct: ["equipment"],
      select: { equipment: true },
      where: {
        AND: [{ equipment: { not: null } }, workoutType ? workoutTypeWhere(workoutType) : {}],
      },
      orderBy: { equipment: "asc" },
    });
    res.json({ equipment: rows.map((row) => row.equipment).filter(Boolean) });
  }),
);
