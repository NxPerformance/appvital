import fs from "node:fs";
import path from "node:path";
import { Router } from "express";
import { Prisma, UserRole } from "@prisma/client";
import multer from "multer";
import { z } from "zod";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async-handler.js";
import { serializeProfile } from "../utils/serializers.js";

const router = Router();

fs.mkdirSync(env.UPLOAD_DIR, { recursive: true });

const imageExtensions: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

const allowedImageTypes = new Set(Object.keys(imageExtensions));

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, env.UPLOAD_DIR),
  filename: (req: AuthenticatedRequest, file, callback) => {
    const ext = (imageExtensions[file.mimetype] ?? path.extname(file.originalname)) || ".jpg";
    callback(null, `${req.auth!.userId}-avatar${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!allowedImageTypes.has(file.mimetype)) {
      callback(new Error("Tipo de arquivo nao permitido"));
      return;
    }

    callback(null, true);
  },
});

function normalizeOptionalPhone(value: unknown) {
  if (typeof value !== "string") return value;

  const digits = value.replace(/\D/g, "");
  return digits || null;
}

const updateSchema = z.object({
  full_name: z.string().min(3).optional(),
  phone: z.preprocess(
    normalizeOptionalPhone,
    z.string().regex(/^\d{10,11}$/, "Telefone deve ter 10 ou 11 numeros com DDD").optional().nullable(),
  ),
  age: z.coerce.number().int().positive().optional(),
  height_cm: z.coerce.number().int().positive().optional(),
  weight_kg: z.coerce.number().positive().optional(),
  notification_preferences: z.record(z.boolean()).optional(),
});

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.auth!.userId },
      include: { profile: true, roles: true, trainerApplication: true },
    });

    if (!user?.profile) {
      return res.status(404).json({ message: "Perfil nao encontrado" });
    }

    return res.json({
      profile: serializeProfile(
        user.profile,
        user.email,
        {
          isAdmin: user.roles.some((role) => role.role === UserRole.ADMIN),
          isPersonalTrainer: user.roles.some((role) => role.role === UserRole.PERSONAL_TRAINER),
          trainerApplicationStatus: user.trainerApplication?.status ?? null,
          trainerApplicationId: user.trainerApplication?.id ?? null,
        },
      ),
    });
  }),
);

router.patch(
  "/me",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const data = updateSchema.parse(req.body);
    const profile = await prisma.profile.update({
      where: { userId: req.auth!.userId },
      data: {
        fullName: data.full_name,
        phone: data.phone,
        age: data.age,
        heightCm: data.height_cm,
        weightKg: data.weight_kg?.toString(),
        notificationPreferences: data.notification_preferences as Prisma.InputJsonValue | undefined,
      },
    });

    return res.json({
      profile: serializeProfile(profile, req.auth!.email, {
        isAdmin: req.auth!.roles.includes(UserRole.ADMIN),
        isPersonalTrainer: req.auth!.roles.includes(UserRole.PERSONAL_TRAINER),
      }),
    });
  }),
);

router.post(
  "/avatar",
  requireAuth,
  upload.single("avatar"),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "Arquivo nao enviado" });
    }

    const avatarUrl = `/uploads/${req.file.filename}`;
    const currentProfile = await prisma.profile.findUnique({
      where: { userId: req.auth!.userId },
      select: { avatarUrl: true },
    });
    const previousAvatarPath = currentProfile?.avatarUrl
      ? path.resolve(env.UPLOAD_DIR, path.basename(currentProfile.avatarUrl))
      : null;

    const profile = await prisma.profile
      .update({
        where: { userId: req.auth!.userId },
        data: { avatarUrl },
      })
      .catch((error: unknown) => {
        if (previousAvatarPath !== req.file?.path && fs.existsSync(req.file!.path)) {
          fs.unlinkSync(req.file!.path);
        }

        throw error;
      });

    if (previousAvatarPath && previousAvatarPath !== req.file.path && fs.existsSync(previousAvatarPath)) {
      fs.unlinkSync(previousAvatarPath);
    }

    return res.json({
      profile: serializeProfile(profile, req.auth!.email, {
        isAdmin: req.auth!.roles.includes(UserRole.ADMIN),
        isPersonalTrainer: req.auth!.roles.includes(UserRole.PERSONAL_TRAINER),
      }),
    });
  }),
);

export { router as profileRouter };
