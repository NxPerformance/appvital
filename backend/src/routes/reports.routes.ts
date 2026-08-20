import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async-handler.js";

const router = Router();

const reportQuerySchema = z.object({
  period: z.enum(["weekly", "monthly", "yearly"]).default("weekly"),
});

function getDateRange(period: "weekly" | "monthly" | "yearly") {
  const now = new Date();
  const end = new Date(now);
  const start = new Date(now);

  if (period === "weekly") {
    start.setDate(now.getDate() - 6);
  } else if (period === "monthly") {
    start.setMonth(now.getMonth() - 1);
    start.setDate(start.getDate() + 1);
  } else {
    start.setFullYear(now.getFullYear() - 1);
    start.setDate(start.getDate() + 1);
  }

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function getBucketKey(date: Date, period: "weekly" | "monthly" | "yearly") {
  if (period === "weekly") {
    return date.toISOString().slice(0, 10);
  }

  if (period === "monthly") {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  }

  return String(date.getUTCFullYear());
}

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { period } = reportQuerySchema.parse(req.query);
    const profile = await prisma.profile.findUnique({
      where: { userId: req.auth!.userId },
      select: { isPremium: true },
    });

    if (!profile?.isPremium) {
      return res.status(403).json({ message: "Relatorios avancados disponiveis apenas para usuarios premium" });
    }

    const { start, end } = getDateRange(period);
    const [strengthWorkouts, cardioWorkouts, bodyPhotos, latestBioimpedance] = await Promise.all([
      prisma.workout.findMany({
        where: {
          userId: req.auth!.userId,
          date: { gte: start, lte: end },
        },
        select: {
          id: true,
          date: true,
          durationMin: true,
          calories: true,
        },
        orderBy: { date: "asc" },
      }),
      prisma.cardioWorkout.findMany({
        where: {
          userId: req.auth!.userId,
          date: { gte: start, lte: end },
        },
        select: {
          id: true,
          date: true,
          durationMin: true,
          calories: true,
          distanceKm: true,
        },
        orderBy: { date: "asc" },
      }),
      prisma.bodyProgressPhoto.count({
        where: {
          userId: req.auth!.userId,
          takenAt: { gte: start, lte: end },
        },
      }),
      prisma.bioimpedanceRecord.findFirst({
        where: {
          userId: req.auth!.userId,
          date: { lte: end },
        },
        orderBy: { date: "desc" },
        select: {
          date: true,
          weightKg: true,
          bodyFatPercent: true,
          muscleMassKg: true,
        },
      }),
    ]);

    const allWorkouts = [
      ...strengthWorkouts.map((item) => ({
        date: item.date,
        durationMin: item.durationMin ?? 0,
        calories: item.calories ?? 0,
        distanceKm: 0,
        type: "strength",
      })),
      ...cardioWorkouts.map((item) => ({
        date: item.date,
        durationMin: item.durationMin ? Number(item.durationMin) : 0,
        calories: item.calories ?? 0,
        distanceKm: item.distanceKm ? Number(item.distanceKm) : 0,
        type: "cardio",
      })),
    ].sort((a, b) => a.date.getTime() - b.date.getTime());

    const grouped = new Map<string, { workouts: number; calories: number; minutes: number; distance_km: number }>();

    for (const workout of allWorkouts) {
      const key = getBucketKey(workout.date, period);
      const previous = grouped.get(key) ?? { workouts: 0, calories: 0, minutes: 0, distance_km: 0 };
      grouped.set(key, {
        workouts: previous.workouts + 1,
        calories: previous.calories + workout.calories,
        minutes: previous.minutes + workout.durationMin,
        distance_km: previous.distance_km + workout.distanceKm,
      });
    }

    const totalStrengthWorkouts = strengthWorkouts.length;
    const totalCardioWorkouts = cardioWorkouts.length;
    const totalWorkouts = allWorkouts.length;
    const totalCalories = allWorkouts.reduce((sum, item) => sum + item.calories, 0);
    const totalMinutes = allWorkouts.reduce((sum, item) => sum + item.durationMin, 0);
    const totalDistanceKm = allWorkouts.reduce((sum, item) => sum + item.distanceKm, 0);

    return res.json({
      report: {
        period,
        start_date: start,
        end_date: end,
        totals: {
          workouts: totalWorkouts,
          strength_workouts: totalStrengthWorkouts,
          cardio_workouts: totalCardioWorkouts,
          calories: totalCalories,
          active_minutes: totalMinutes,
          distance_km: Number(totalDistanceKm.toFixed(2)),
          body_progress_photos: bodyPhotos,
        },
        timeline: Array.from(grouped.entries()).map(([label, values]) => ({
          label,
          ...values,
          distance_km: Number(values.distance_km.toFixed(2)),
        })),
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

export { router as reportsRouter };
