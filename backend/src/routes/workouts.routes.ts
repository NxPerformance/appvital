import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../middleware/error-handler.js";
import { getRouteParam } from "../utils/params.js";

export const workoutsRouter = Router();

workoutsRouter.use(requireAuth);

async function grantFirstWorkoutAchievementIfNeeded(userId: string) {
  try {
    const [strengthCount, cardioCount] = await Promise.all([
      prisma.workout.count({ where: { userId } }),
      prisma.cardioWorkout.count({ where: { userId } }),
    ]);

    if (strengthCount + cardioCount !== 1) return;

    const achievement = await prisma.achievement.findUnique({ where: { name: "Primeiro Treino" } });
    if (!achievement) return;

    await prisma.userAchievement.upsert({
      where: { userId_achievementId: { userId, achievementId: achievement.id } },
      create: { userId, achievementId: achievement.id },
      update: {},
    });
  } catch (err) {
    console.error("Falha ao conceder conquista 'Primeiro Treino':", err);
  }
}

const strengthCreateSchema = z.object({
  date: z.coerce.date().optional(),
  objective: z.string().min(1),
  duration_min: z.coerce.number().int().nullable().optional(),
  calories: z.coerce.number().int().nullable().optional(),
  workout_type: z.string().optional(),
  exercises: z.array(z.record(z.any())),
});

workoutsRouter.get(
  "/strength",
  asyncHandler(async (req, res) => {
    const workouts = await prisma.workout.findMany({
      where: { userId: req.auth!.userId },
      orderBy: { date: "desc" },
    });
    res.json({ workouts });
  }),
);

workoutsRouter.post(
  "/strength",
  asyncHandler(async (req, res) => {
    const data = strengthCreateSchema.parse(req.body);

    const workout = await prisma.workout.create({
      data: {
        userId: req.auth!.userId,
        date: data.date ?? new Date(),
        objective: data.objective,
        durationMin: data.duration_min ?? null,
        calories: data.calories ?? null,
        workoutType: data.workout_type ?? "academia",
        exercises: data.exercises,
      },
    });

    setImmediate(() => {
      void grantFirstWorkoutAchievementIfNeeded(req.auth!.userId);
    });

    res.status(201).json({ workout });
  }),
);

const strengthUpdateSchema = strengthCreateSchema.partial();

workoutsRouter.patch(
  "/strength/:id",
  asyncHandler(async (req, res) => {
    const id = getRouteParam(req.params.id, "id");
    const data = strengthUpdateSchema.parse(req.body);

    const existing = await prisma.workout.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, "Treino nao encontrado");
    if (existing.userId !== req.auth!.userId) throw new HttpError(403, "Acesso negado");

    const workout = await prisma.workout.update({
      where: { id },
      data: {
        date: data.date,
        objective: data.objective,
        durationMin: data.duration_min,
        calories: data.calories,
        workoutType: data.workout_type,
        exercises: data.exercises,
      },
    });

    res.json({ workout });
  }),
);

workoutsRouter.delete(
  "/strength/:id",
  asyncHandler(async (req, res) => {
    const id = getRouteParam(req.params.id, "id");

    const existing = await prisma.workout.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, "Treino nao encontrado");
    if (existing.userId !== req.auth!.userId) throw new HttpError(403, "Acesso negado");

    await prisma.workout.delete({ where: { id } });
    res.status(204).send();
  }),
);

const cardioCreateSchema = z.object({
  date: z.coerce.date().optional(),
  workout_type: z.string().min(1),
  duration_min: z.coerce.number().nullable().optional(),
  distance_km: z.coerce.number().nullable().optional(),
  calories: z.coerce.number().int().nullable().optional(),
  avg_pace: z.string().nullable().optional(),
  avg_speed: z.coerce.number().nullable().optional(),
  notes: z.string().nullable().optional(),
});

workoutsRouter.get(
  "/cardio",
  asyncHandler(async (req, res) => {
    const workouts = await prisma.cardioWorkout.findMany({
      where: { userId: req.auth!.userId },
      orderBy: { date: "desc" },
    });
    res.json({ workouts });
  }),
);

workoutsRouter.post(
  "/cardio",
  asyncHandler(async (req, res) => {
    const data = cardioCreateSchema.parse(req.body);

    const workout = await prisma.cardioWorkout.create({
      data: {
        userId: req.auth!.userId,
        date: data.date ?? new Date(),
        workoutType: data.workout_type,
        durationMin: data.duration_min ?? null,
        distanceKm: data.distance_km ?? null,
        calories: data.calories ?? null,
        avgPace: data.avg_pace ?? null,
        avgSpeed: data.avg_speed ?? null,
        notes: data.notes ?? null,
      },
    });

    setImmediate(() => {
      void grantFirstWorkoutAchievementIfNeeded(req.auth!.userId);
    });

    res.status(201).json({ workout });
  }),
);

const cardioUpdateSchema = cardioCreateSchema.partial();

workoutsRouter.patch(
  "/cardio/:id",
  asyncHandler(async (req, res) => {
    const id = getRouteParam(req.params.id, "id");
    const data = cardioUpdateSchema.parse(req.body);

    const existing = await prisma.cardioWorkout.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, "Treino nao encontrado");
    if (existing.userId !== req.auth!.userId) throw new HttpError(403, "Acesso negado");

    const workout = await prisma.cardioWorkout.update({
      where: { id },
      data: {
        date: data.date,
        workoutType: data.workout_type,
        durationMin: data.duration_min,
        distanceKm: data.distance_km,
        calories: data.calories,
        avgPace: data.avg_pace,
        avgSpeed: data.avg_speed,
        notes: data.notes,
      },
    });

    res.json({ workout });
  }),
);

workoutsRouter.delete(
  "/cardio/:id",
  asyncHandler(async (req, res) => {
    const id = getRouteParam(req.params.id, "id");

    const existing = await prisma.cardioWorkout.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, "Treino nao encontrado");
    if (existing.userId !== req.auth!.userId) throw new HttpError(403, "Acesso negado");

    await prisma.cardioWorkout.delete({ where: { id } });
    res.status(204).send();
  }),
);
