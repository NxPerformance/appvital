import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../middleware/error-handler.js";
import { serializeProfile } from "../utils/serializers.js";
import { avatarUpload, deleteUploadedFileSafe } from "../lib/upload.js";
import { assertValidPhoneDigits } from "../utils/phone.js";

export const profileRouter = Router();

profileRouter.use(requireAuth);

profileRouter.get(
  "/me",
  asyncHandler(async (req, res) => {
    const [profile, trainerApplication] = await Promise.all([
      prisma.profile.findUnique({ where: { userId: req.auth!.userId } }),
      prisma.trainerApplication.findUnique({ where: { userId: req.auth!.userId } }),
    ]);

    if (!profile) {
      throw new HttpError(404, "Perfil nao encontrado");
    }

    res.json({ profile: serializeProfile(profile, req.auth!.roles, trainerApplication) });
  }),
);

const updateSchema = z.object({
  full_name: z.string().min(1).optional(),
  phone: z.string().nullable().optional(),
  age: z.coerce.number().int().positive().optional(),
  height_cm: z.coerce.number().int().positive().optional(),
  weight_kg: z.coerce.number().positive().optional(),
  weight_goal_kg: z.coerce.number().positive().nullable().optional(),
  weekly_workout_goal: z.coerce.number().int().min(1).max(14).nullable().optional(),
  notification_preferences: z.record(z.boolean()).optional(),
});

profileRouter.patch(
  "/me",
  asyncHandler(async (req, res) => {
    const data = updateSchema.parse(req.body);

    const current = await prisma.profile.findUnique({ where: { userId: req.auth!.userId } });
    if (!current) {
      throw new HttpError(404, "Perfil nao encontrado");
    }

    let phone = current.phone;
    if (data.phone !== undefined) {
      if (data.phone === null || data.phone === "") {
        phone = null;
      } else {
        const digits = data.phone.replace(/\D/g, "");
        assertValidPhoneDigits(digits);
        phone = digits;
      }
    }

    const notificationPreferences =
      data.notification_preferences !== undefined
        ? { ...((current.notificationPreferences as Record<string, boolean>) ?? {}), ...data.notification_preferences }
        : undefined;

    const updated = await prisma.profile.update({
      where: { userId: req.auth!.userId },
      data: {
        fullName: data.full_name,
        phone,
        age: data.age,
        heightCm: data.height_cm,
        weightKg: data.weight_kg,
        weightGoalKg: data.weight_goal_kg,
        weeklyWorkoutGoal: data.weekly_workout_goal,
        notificationPreferences,
      },
    });

    const trainerApplication = await prisma.trainerApplication.findUnique({ where: { userId: req.auth!.userId } });

    res.json({ profile: serializeProfile(updated, req.auth!.roles, trainerApplication) });
  }),
);

profileRouter.post(
  "/avatar",
  avatarUpload.single("avatar"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new HttpError(400, "Nenhum arquivo enviado");
    }

    const current = await prisma.profile.findUnique({ where: { userId: req.auth!.userId } });
    if (!current) {
      throw new HttpError(404, "Perfil nao encontrado");
    }

    const newUrl = `/uploads/${req.file.filename}`;
    if (current.avatarUrl && current.avatarUrl !== newUrl) {
      deleteUploadedFileSafe(current.avatarUrl);
    }

    const updated = await prisma.profile.update({
      where: { userId: req.auth!.userId },
      data: { avatarUrl: newUrl },
    });

    const trainerApplication = await prisma.trainerApplication.findUnique({ where: { userId: req.auth!.userId } });

    res.json({ profile: serializeProfile(updated, req.auth!.roles, trainerApplication) });
  }),
);
