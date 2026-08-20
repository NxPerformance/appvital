import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { Router } from "express";
import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";
import multer from "multer";
import { z } from "zod";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { signToken } from "../lib/jwt.js";
import { asyncHandler } from "../utils/async-handler.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { serializeProfile, serializeUser } from "../utils/serializers.js";

const router = Router();

const trainerProofUploadDir = path.join(env.UPLOAD_DIR, "trainer-applications");
fs.mkdirSync(trainerProofUploadDir, { recursive: true });

const proofImageExtensions: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const allowedProofMimeTypes = new Set(Object.keys(proofImageExtensions));
const defaultNotificationPreferences = {
  updates: true,
  reminders: true,
  account: true,
  wearables: true,
  email: true,
  whatsapp: false,
};

const trainerProofUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, trainerProofUploadDir),
    filename: (_req, file, callback) => {
      const ext = proofImageExtensions[file.mimetype] ?? ".jpg";
      callback(null, `${crypto.randomUUID()}${ext}`);
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_req, file, callback) => {
    if (!allowedProofMimeTypes.has(file.mimetype)) {
      callback(new Error("Envie imagens JPG, PNG ou WebP para a comprovacao do personal"));
      return;
    }

    callback(null, true);
  },
});

type TrainerProofFiles =
  | {
      self_photo?: Express.Multer.File[];
      document_photo?: Express.Multer.File[];
    }
  | undefined;

function removeTrainerProofFiles(files: TrainerProofFiles) {
  for (const fileList of Object.values(files ?? {})) {
    for (const file of fileList ?? []) {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    }
  }
}

function parseMaybeJson(value: unknown) {
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function parseBoolean(value: unknown) {
  return value === true || value === "true";
}

function normalizeOptionalPhone(value: unknown) {
  if (typeof value !== "string") return value;

  const digits = value.replace(/\D/g, "");
  return digits || null;
}

const validBrazilianStates = new Set([
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
]);

function validateCref(cref: string, state: string) {
  const normalizedCref = cref.trim().toUpperCase().replace(/\s+/g, "");
  const normalizedState = state.trim().toUpperCase();
  const match = normalizedCref.match(/^(\d{4,6})(?:-?[GP])?(?:\/([A-Z]{2}))?$/);

  return Boolean(
    match &&
      validBrazilianStates.has(normalizedState) &&
      (!match[2] || match[2] === normalizedState),
  );
}

const registerSchema = z.object({
  full_name: z.string().min(3),
  email: z.string().email(),
  phone: z.preprocess(
    normalizeOptionalPhone,
    z.string().regex(/^\d{10,11}$/, "Telefone deve ter 10 ou 11 numeros com DDD").optional().nullable(),
  ),
  age: z.coerce.number().int().positive(),
  height_cm: z.coerce.number().int().positive(),
  weight_kg: z.coerce.number().positive(),
  password: z.string().min(6),
  terms_accepted: z.preprocess(parseBoolean, z.literal(true, {
    errorMap: () => ({ message: "Aceite os Termos de Uso para criar sua conta" }),
  })),
  account_type: z.enum(["client", "personal"]).default("client"),
  selected_plan: z.enum(["essential", "premium"]).optional().default("essential"),
  initial_payment_method: z.enum(["pix", "credit_card"]).optional().nullable(),
  trainer_application: z.preprocess(parseMaybeJson, z
    .object({
      cref: z.string().min(3),
      cref_state: z.string().min(2).max(2),
      specialties: z.string().trim().max(200).optional().nullable(),
      experience_years: z.coerce.number().int().min(0).max(80).optional().nullable(),
      instagram_handle: z.string().trim().max(100).optional().nullable(),
      proof_notes: z.string().trim().max(500).optional().nullable(),
    })
    .optional()),
}).superRefine((data, ctx) => {
  if (data.account_type === "personal" && !data.trainer_application) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["trainer_application"],
      message: "Informe os dados para validar seu cadastro como personal",
    });
  }

  if (data.account_type === "personal" && data.trainer_application) {
    const { cref, cref_state: crefState } = data.trainer_application;
    if (!validateCref(cref, crefState)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["trainer_application", "cref"],
        message: "Informe um CREF valido com UF correspondente",
      });
    }
  }
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

router.post(
  "/register",
  trainerProofUpload.fields([
    { name: "self_photo", maxCount: 1 },
    { name: "document_photo", maxCount: 1 },
  ]),
  asyncHandler(async (req, res) => {
    const files = req.files as TrainerProofFiles;
    let data: z.infer<typeof registerSchema>;

    try {
      data = registerSchema.parse(req.body);
    } catch (error) {
      removeTrainerProofFiles(files);
      throw error;
    }

    const selfPhoto = files?.self_photo?.[0] ?? null;
    const documentPhoto = files?.document_photo?.[0] ?? null;

    if (data.account_type === "personal" && (!selfPhoto || !documentPhoto)) {
      removeTrainerProofFiles(files);
      return res.status(400).json({ message: "Envie sua foto e a foto do documento para validar o personal" });
    }

    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existing) {
      removeTrainerProofFiles(files);
      return res.status(409).json({ message: "Email ja cadastrado" });
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await prisma
      .$transaction(async (tx) => {
        return tx.user.create({
          data: {
            email: data.email.toLowerCase(),
            passwordHash,
            profile: {
              create: {
                fullName: data.full_name,
                phone: data.phone || null,
                age: data.age,
                heightCm: data.height_cm,
                weightKg: data.weight_kg.toString(),
                accountType: data.account_type,
                selectedPlan: data.account_type === "client" ? data.selected_plan : null,
                initialPaymentMethod:
                  data.account_type === "client" && data.selected_plan === "premium"
                    ? data.initial_payment_method ?? null
                    : null,
                termsAcceptedAt: new Date(),
                notificationPreferences: defaultNotificationPreferences,
                entryDate: new Date(),
              },
            },
            trainerApplication:
              data.account_type === "personal"
                ? {
                    create: {
                      fullName: data.full_name,
                      cref: data.trainer_application?.cref ?? "",
                      crefState: data.trainer_application?.cref_state ?? "",
                      specialties: data.trainer_application?.specialties ?? null,
                      experienceYears: data.trainer_application?.experience_years ?? null,
                      instagramHandle: data.trainer_application?.instagram_handle ?? null,
                      proofNotes: data.trainer_application?.proof_notes ?? null,
                      selfPhotoUrl: selfPhoto ? `/uploads/trainer-applications/${selfPhoto.filename}` : null,
                      documentPhotoUrl: documentPhoto ? `/uploads/trainer-applications/${documentPhoto.filename}` : null,
                    },
                  }
                : undefined,
          },
          include: {
            profile: true,
            roles: true,
            trainerApplication: true,
          },
        });
      })
      .catch((error: unknown) => {
        removeTrainerProofFiles(files);
        throw error;
      });

    const token = signToken({
      sub: user.id,
      email: user.email,
      roles: user.roles.map((role) => role.role),
    });

    return res.status(201).json({
      token,
      user: serializeUser(user, user.roles.map((role) => role.role)),
      profile: user.profile
        ? serializeProfile(user.profile, user.email, {
            isAdmin: user.roles.some((role) => role.role === UserRole.ADMIN),
            isPersonalTrainer: user.roles.some((role) => role.role === UserRole.PERSONAL_TRAINER),
            trainerApplicationStatus: user.trainerApplication?.status ?? null,
            trainerApplicationId: user.trainerApplication?.id ?? null,
          })
        : null,
    });
  }),
);

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const data = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
      include: {
        profile: true,
        roles: true,
        trainerApplication: true,
      },
    });

    if (!user) {
      return res.status(401).json({ message: "Credenciais invalidas" });
    }

    const matches = await bcrypt.compare(data.password, user.passwordHash);
    if (!matches) {
      return res.status(401).json({ message: "Credenciais invalidas" });
    }

    const roles = user.roles.map((entry) => entry.role);
    const token = signToken({
      sub: user.id,
      email: user.email,
      roles,
    });

    return res.json({
      token,
      user: serializeUser(user, roles),
      profile: user.profile
        ? serializeProfile(user.profile, user.email, {
            isAdmin: roles.includes(UserRole.ADMIN),
            isPersonalTrainer: roles.includes(UserRole.PERSONAL_TRAINER),
            trainerApplicationStatus: user.trainerApplication?.status ?? null,
            trainerApplicationId: user.trainerApplication?.id ?? null,
          })
        : null,
    });
  }),
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.auth!.userId },
      include: {
        profile: true,
        roles: true,
        trainerApplication: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: "Usuario nao encontrado" });
    }

    const roles = user.roles.map((entry) => entry.role);

    return res.json({
      user: serializeUser(user, roles),
      profile: user.profile
        ? serializeProfile(user.profile, user.email, {
            isAdmin: roles.includes(UserRole.ADMIN),
            isPersonalTrainer: roles.includes(UserRole.PERSONAL_TRAINER),
            trainerApplicationStatus: user.trainerApplication?.status ?? null,
            trainerApplicationId: user.trainerApplication?.id ?? null,
          })
        : null,
    });
  }),
);

export { router as authRouter };
