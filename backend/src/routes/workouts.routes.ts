import { Router } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async-handler.js";
import { getRouteParam } from "../utils/params.js";

const router = Router();

const workoutSchema = z.object({
  date: z.string().optional(),
  objective: z.string().min(1),
  duration_min: z.number().int().positive().nullable().optional(),
  calories: z.number().int().positive().nullable().optional(),
  workout_type: z.string().default("academia"),
  exercises: z.array(z.record(z.unknown())),
});

const cardioSchema = z.object({
  date: z.string().optional(),
  workout_type: z.string().min(1),
  duration_min: z.number().nullable().optional(),
  distance_km: z.number().nullable().optional(),
  calories: z.number().int().nullable().optional(),
  avg_pace: z.string().nullable().optional(),
  avg_speed: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
});

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

async function awardAchievementByName(userId: string, name: string) {
  const achievement = await prisma.achievement.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
    select: { id: true },
  });

  if (!achievement) return;

  await prisma.userAchievement.upsert({
    where: {
      userId_achievementId: {
        userId,
        achievementId: achievement.id,
      },
    },
    update: {},
    create: {
      userId,
      achievementId: achievement.id,
    },
  });
}

async function awardFirstWorkoutAchievementIfNeeded(userId: string) {
  const [strengthCount, cardioCount] = await Promise.all([
    prisma.workout.count({ where: { userId } }),
    prisma.cardioWorkout.count({ where: { userId } }),
  ]);

  if (strengthCount + cardioCount === 1) {
    await awardAchievementByName(userId, "Primeiro Treino");
  }
}

router.get(
  "/strength",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const workouts = await prisma.workout.findMany({
      where: { userId: req.auth!.userId },
      orderBy: { date: "desc" },
    });

    return res.json({ workouts });
  }),
);

router.post(
  "/strength",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const startedAt = Date.now();
    const data = workoutSchema.parse(req.body);
    const workout = await prisma.workout.create({
      data: {
        userId: req.auth!.userId,
        date: data.date ? new Date(data.date) : new Date(),
        objective: data.objective,
        durationMin: data.duration_min ?? null,
        calories: data.calories ?? null,
        workoutType: data.workout_type,
        exercises: toJsonValue(data.exercises),
      },
    });

    const response = res.status(201).json({ workout });

    console.info(`[workouts] strength saved id=${workout.id} in ${Date.now() - startedAt}ms`);
    setImmediate(() => void awardFirstWorkoutAchievementIfNeeded(req.auth!.userId).catch((error) => {
      console.error("[workouts] failed to award first workout achievement", error);
    }));

    return response;
  }),
);

router.patch(
  "/strength/:id",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const workoutId = getRouteParam(req.params.id, "id");
    const data = workoutSchema.parse(req.body);
    const existing = await prisma.workout.findUnique({
      where: { id: workoutId },
    });

    if (!existing) {
      return res.status(404).json({ message: 'Treino nao encontrado' });
    }

    if (existing.userId !== req.auth!.userId) {
      return res.status(403).json({ message: 'Sem permissao para editar este treino' });
    }

    const workout = await prisma.workout.update({
      where: { id: workoutId },
      data: {
        date: data.date ? new Date(data.date) : existing.date,
        objective: data.objective,
        durationMin: data.duration_min ?? null,
        calories: data.calories ?? null,
        workoutType: data.workout_type,
        exercises: toJsonValue(data.exercises),
      },
    });

    return res.json({ workout });
  }),
);

router.delete(
  "/strength/:id",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const workoutId = getRouteParam(req.params.id, "id");
    const workout = await prisma.workout.findUnique({
      where: { id: workoutId },
    });

    if (!workout) {
      return res.status(404).json({ message: 'Treino nao encontrado' });
    }

    if (workout.userId !== req.auth!.userId) {
      return res.status(403).json({ message: 'Sem permissao para excluir este treino' });
    }

    await prisma.workout.deleteMany({
      where: {
        id: workoutId,
        userId: req.auth!.userId,
      },
    });

    return res.status(204).send();
  }),
);

router.get(
  "/cardio",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const cardioWorkouts = await prisma.cardioWorkout.findMany({
      where: { userId: req.auth!.userId },
      orderBy: { date: "desc" },
    });

    return res.json({ cardio_workouts: cardioWorkouts });
  }),
);

router.post(
  "/cardio",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const startedAt = Date.now();
    const data = cardioSchema.parse(req.body);
    const cardioWorkout = await prisma.cardioWorkout.create({
      data: {
        userId: req.auth!.userId,
        date: data.date ? new Date(data.date) : new Date(),
        workoutType: data.workout_type,
        durationMin: data.duration_min?.toString(),
        distanceKm: data.distance_km?.toString(),
        calories: data.calories ?? null,
        avgPace: data.avg_pace ?? null,
        avgSpeed: data.avg_speed?.toString(),
        notes: data.notes ?? null,
      },
    });

    const response = res.status(201).json({ cardio_workout: cardioWorkout });

    console.info(`[workouts] cardio saved id=${cardioWorkout.id} in ${Date.now() - startedAt}ms`);
    setImmediate(() => void awardFirstWorkoutAchievementIfNeeded(req.auth!.userId).catch((error) => {
      console.error("[workouts] failed to award first workout achievement", error);
    }));

    return response;
  }),
);

router.patch(
  "/cardio/:id",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const cardioWorkoutId = getRouteParam(req.params.id, "id");
    const data = cardioSchema.parse(req.body);
    const existing = await prisma.cardioWorkout.findUnique({
      where: { id: cardioWorkoutId },
    });

    if (!existing) {
      return res.status(404).json({ message: 'Treino cardio nao encontrado' });
    }

    if (existing.userId !== req.auth!.userId) {
      return res.status(403).json({ message: 'Sem permissao para editar este treino cardio' });
    }

    const cardioWorkout = await prisma.cardioWorkout.update({
      where: { id: cardioWorkoutId },
      data: {
        date: data.date ? new Date(data.date) : existing.date,
        workoutType: data.workout_type,
        durationMin: data.duration_min?.toString() ?? null,
        distanceKm: data.distance_km?.toString() ?? null,
        calories: data.calories ?? null,
        avgPace: data.avg_pace ?? null,
        avgSpeed: data.avg_speed?.toString() ?? null,
        notes: data.notes ?? null,
      },
    });

    return res.json({ cardio_workout: cardioWorkout });
  }),
);

router.delete(
  "/cardio/:id",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const cardioWorkoutId = getRouteParam(req.params.id, "id");
    const cardioWorkout = await prisma.cardioWorkout.findUnique({
      where: { id: cardioWorkoutId },
    });

    if (!cardioWorkout) {
      return res.status(404).json({ message: 'Treino cardio nao encontrado' });
    }

    if (cardioWorkout.userId !== req.auth!.userId) {
      return res.status(403).json({ message: 'Sem permissao para excluir este treino cardio' });
    }

    await prisma.cardioWorkout.deleteMany({
      where: {
        id: cardioWorkoutId,
        userId: req.auth!.userId,
      },
    });

    return res.status(204).send();
  }),
);

export { router as workoutsRouter };
