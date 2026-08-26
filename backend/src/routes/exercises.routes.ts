import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async-handler.js";

export const exercisesRouter = Router();

exercisesRouter.use(requireAuth);

const listSchema = z.object({
  search: z.string().trim().optional(),
  equipment: z.string().trim().optional(),
  muscle: z.string().trim().optional(),
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
    const { search, equipment, muscle, limit } = listSchema.parse(req.query);

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
        ],
      },
      orderBy: { namePt: "asc" },
      take: limit,
    });

    res.json({ exercises: exercises.map(serializeExercise) });
  }),
);

exercisesRouter.get(
  "/equipment",
  asyncHandler(async (_req, res) => {
    const rows = await prisma.libraryExercise.findMany({
      distinct: ["equipment"],
      select: { equipment: true },
      where: { equipment: { not: null } },
      orderBy: { equipment: "asc" },
    });
    res.json({ equipment: rows.map((row) => row.equipment).filter(Boolean) });
  }),
);
