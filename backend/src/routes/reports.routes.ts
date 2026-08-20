import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../middleware/error-handler.js";

export const reportsRouter = Router();

reportsRouter.use(requireAuth);

type Period = "weekly" | "monthly" | "yearly";

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function computeRange(period: Period): { start: Date; end: Date } {
  const today = new Date();
  const end = endOfDay(today);

  if (period === "weekly") {
    const start = startOfDay(today);
    start.setDate(start.getDate() - 6);
    return { start, end };
  }

  if (period === "monthly") {
    const start = startOfDay(today);
    start.setMonth(start.getMonth() - 1);
    start.setDate(start.getDate() + 1);
    return { start, end };
  }

  const start = startOfDay(today);
  start.setFullYear(start.getFullYear() - 1);
  start.setDate(start.getDate() + 1);
  return { start, end };
}

function bucketKeyFor(date: Date, period: Period): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  if (period === "weekly") return `${year}-${month}-${day}`;
  if (period === "monthly") return `${year}-${month}`;
  return `${year}`;
}

const querySchema = z.object({
  period: z.enum(["weekly", "monthly", "yearly"]).default("weekly"),
});

reportsRouter.get(
  "/me",
  asyncHandler(async (req, res) => {
    const profile = await prisma.profile.findUnique({ where: { userId: req.auth!.userId } });
    if (!profile?.isPremium) {
      throw new HttpError(403, "Recurso exclusivo para assinantes Premium");
    }

    const { period } = querySchema.parse(req.query);
    const { start, end } = computeRange(period);

    const [strengthWorkouts, cardioWorkouts, bodyProgressPhotosCount, latestBioimpedance] = await Promise.all([
      prisma.workout.findMany({ where: { userId: req.auth!.userId, date: { gte: start, lte: end } } }),
      prisma.cardioWorkout.findMany({ where: { userId: req.auth!.userId, date: { gte: start, lte: end } } }),
      prisma.bodyProgressPhoto.count({ where: { userId: req.auth!.userId, takenAt: { gte: start, lte: end } } }),
      prisma.bioimpedanceRecord.findFirst({
        where: { userId: req.auth!.userId, date: { lte: end } },
        orderBy: { date: "desc" },
      }),
    ]);

    const timelineMap = new Map<string, { workouts: number; calories: number; minutes: number; distance_km: number }>();
    const order: string[] = [];

    for (const cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
      const key = bucketKeyFor(cursor, period);
      if (!timelineMap.has(key)) {
        timelineMap.set(key, { workouts: 0, calories: 0, minutes: 0, distance_km: 0 });
        order.push(key);
      }
    }

    let totalCalories = 0;
    let totalMinutes = 0;
    let totalDistanceKm = 0;

    for (const workout of strengthWorkouts) {
      const key = bucketKeyFor(workout.date, period);
      const bucket = timelineMap.get(key) ?? { workouts: 0, calories: 0, minutes: 0, distance_km: 0 };
      bucket.workouts += 1;
      bucket.calories += workout.calories ?? 0;
      bucket.minutes += workout.durationMin ?? 0;
      timelineMap.set(key, bucket);

      totalCalories += workout.calories ?? 0;
      totalMinutes += workout.durationMin ?? 0;
    }

    for (const workout of cardioWorkouts) {
      const key = bucketKeyFor(workout.date, period);
      const bucket = timelineMap.get(key) ?? { workouts: 0, calories: 0, minutes: 0, distance_km: 0 };
      const minutes = workout.durationMin ? Number(workout.durationMin) : 0;
      const distanceKm = workout.distanceKm ? Number(workout.distanceKm) : 0;
      bucket.workouts += 1;
      bucket.calories += workout.calories ?? 0;
      bucket.minutes += minutes;
      bucket.distance_km += distanceKm;
      timelineMap.set(key, bucket);

      totalCalories += workout.calories ?? 0;
      totalMinutes += minutes;
      totalDistanceKm += distanceKm;
    }

    const timeline = order.map((key) => ({ label: key, ...timelineMap.get(key)! }));

    res.json({
      report: {
        period,
        start_date: start,
        end_date: end,
        totals: {
          workouts: strengthWorkouts.length + cardioWorkouts.length,
          strength_workouts: strengthWorkouts.length,
          cardio_workouts: cardioWorkouts.length,
          calories: totalCalories,
          active_minutes: totalMinutes,
          distance_km: totalDistanceKm,
          body_progress_photos: bodyProgressPhotosCount,
        },
        timeline,
        latest_body_metrics: latestBioimpedance
          ? {
              date: latestBioimpedance.date,
              weight_kg: latestBioimpedance.weightKg ? Number(latestBioimpedance.weightKg) : null,
              body_fat_percent: latestBioimpedance.bodyFatPercent ? Number(latestBioimpedance.bodyFatPercent) : null,
              muscle_mass_kg: latestBioimpedance.muscleMassKg ? Number(latestBioimpedance.muscleMassKg) : null,
            }
          : null,
      },
    });
  }),
);
