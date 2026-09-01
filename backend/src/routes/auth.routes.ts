import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { signJwt } from "../lib/jwt.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../middleware/error-handler.js";
import { requireAuth, requireTrustedOrigin } from "../middleware/auth.js";
import { clearAuthCookies, setAuthCookies } from "../lib/auth-cookies.js";
import { serializeUser, serializeProfile, DEFAULT_NOTIFICATION_PREFERENCES } from "../utils/serializers.js";
import { trainerApplicationUpload, deleteUploadedFileSafe } from "../lib/upload.js";

export const authRouter = Router();

const BR_STATES = new Set([
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
]);

const CREF_REGEX = /^\d{4,6}(-[A-Z])?\/([A-Z]{2})$/i;

function isValidCref(cref: string, crefState: string): boolean {
  const match = CREF_REGEX.exec(cref.trim());
  const uf = crefState.trim().toUpperCase();
  if (!match) return false;
  if (!BR_STATES.has(uf)) return false;
  const crefUf = match[2]?.toUpperCase();
  return crefUf === uf;
}

const boolish = z.preprocess((value) => {
  if (typeof value === "string") {
    if (value === "true") return true;
    if (value === "false") return false;
  }
  return value;
}, z.boolean());

const trainerApplicationSchema = z.object({
  cref: z.string().min(1),
  cref_state: z.string().min(1),
  specialties: z.string().nullable().optional(),
  experience_years: z.coerce.number().int().nullable().optional(),
  instagram_handle: z.string().nullable().optional(),
  proof_notes: z.string().nullable().optional(),
});

const emptyToUndefined = (value: unknown) => (value === "" || value === null ? undefined : value);

const registerSchema = z.object({
  full_name: z.string().min(1, "Nome obrigatorio"),
  email: z.string().email("E-mail invalido"),
  phone: z.preprocess(emptyToUndefined, z.string().optional()),
  age: z.coerce.number().int().positive(),
  height_cm: z.coerce.number().int().positive(),
  weight_kg: z.coerce.number().positive(),
  weekly_workout_goal: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).max(14).optional()),
  password: z.string().min(6, "Senha deve ter ao menos 6 caracteres"),
  terms_accepted: boolish,
  account_type: z.preprocess(emptyToUndefined, z.enum(["client", "personal"]).default("client")),
  selected_plan: z.preprocess(emptyToUndefined, z.enum(["essential", "premium"]).default("essential")),
  initial_payment_method: z.preprocess(emptyToUndefined, z.enum(["pix", "credit_card"]).optional()),
  trainer_application: z.preprocess((value) => {
    if (typeof value === "string") {
      if (!value) return undefined;
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  }, trainerApplicationSchema.optional()),
});

function normalizePhone(phone?: string): string | undefined {
  if (!phone) return undefined;
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 0) return undefined;
  if (digits.length < 10 || digits.length > 11) {
    throw new HttpError(400, "Telefone invalido, informe DDD + numero");
  }
  return digits;
}

authRouter.post(
  "/register",
  requireTrustedOrigin,
  trainerApplicationUpload.fields([
    { name: "self_photo", maxCount: 1 },
    { name: "document_photo", maxCount: 1 },
  ]),
  asyncHandler(async (req, res) => {
    const files = req.files as { self_photo?: Express.Multer.File[]; document_photo?: Express.Multer.File[] } | undefined;
    const selfPhoto = files?.self_photo?.[0];
    const documentPhoto = files?.document_photo?.[0];

    try {
      const data = registerSchema.parse(req.body);

      if (!data.terms_accepted) {
        throw new HttpError(400, "E necessario aceitar os termos de uso");
      }

      const phone = normalizePhone(data.phone);

      const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
      if (existing) {
        throw new HttpError(409, "E-mail ja cadastrado");
      }

      if (data.account_type === "personal") {
        if (!data.trainer_application) {
          throw new HttpError(400, "Dados de aplicacao de personal trainer obrigatorios");
        }
        if (!isValidCref(data.trainer_application.cref, data.trainer_application.cref_state)) {
          throw new HttpError(400, "CREF invalido");
        }
        if (!selfPhoto || !documentPhoto) {
          throw new HttpError(400, "Envie a foto pessoal e a foto do documento");
        }
      }

      const passwordHash = await bcrypt.hash(data.password, 10);
      const now = new Date();

      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: data.email.toLowerCase(),
            passwordHash,
          },
        });

        const profile = await tx.profile.create({
          data: {
            userId: user.id,
            fullName: data.full_name,
            phone: phone ?? null,
            age: data.age,
            heightCm: data.height_cm,
            weightKg: data.weight_kg,
            weeklyWorkoutGoal: data.weekly_workout_goal ?? null,
            accountType: data.account_type,
            selectedPlan: data.account_type === "client" ? data.selected_plan : null,
            initialPaymentMethod: data.initial_payment_method ?? null,
            termsAcceptedAt: now,
            notificationPreferences: DEFAULT_NOTIFICATION_PREFERENCES,
            entryDate: now,
          },
        });

        let trainerApplication = null;
        if (data.account_type === "personal" && data.trainer_application) {
          trainerApplication = await tx.trainerApplication.create({
            data: {
              userId: user.id,
              fullName: data.full_name,
              cref: data.trainer_application.cref.trim(),
              crefState: data.trainer_application.cref_state.trim().toUpperCase(),
              specialties: data.trainer_application.specialties ?? null,
              experienceYears: data.trainer_application.experience_years ?? null,
              instagramHandle: data.trainer_application.instagram_handle ?? null,
              proofNotes: data.trainer_application.proof_notes ?? null,
              selfPhotoUrl: `/uploads/trainer-applications/${selfPhoto!.filename}`,
              documentPhotoUrl: `/uploads/trainer-applications/${documentPhoto!.filename}`,
            },
          });
        }

        return { user, profile, trainerApplication };
      });

      const token = signJwt({ sub: result.user.id, email: result.user.email, roles: [] });
      setAuthCookies(res, token);

      res.status(201).json({
        user: serializeUser(result.user, []),
        profile: serializeProfile(result.profile, [], result.trainerApplication),
      });
    } catch (err) {
      deleteUploadedFileSafe(selfPhoto?.path);
      deleteUploadedFileSafe(documentPhoto?.path);
      throw err;
    }
  }),
);

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post(
  "/login",
  requireTrustedOrigin,
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { profile: true, roles: true, trainerApplication: true },
    });

    if (!user || !user.profile) {
      throw new HttpError(401, "Credenciais invalidas");
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      throw new HttpError(401, "Credenciais invalidas");
    }

    const roles = user.roles.map((assignment) => assignment.role);
    const token = signJwt({ sub: user.id, email: user.email, roles });
    setAuthCookies(res, token);

    res.json({
      user: serializeUser(user, roles),
      profile: serializeProfile(user.profile, roles, user.trainerApplication),
    });
  }),
);

authRouter.post(
  "/logout",
  asyncHandler(async (_req, res) => {
    clearAuthCookies(res);
    res.status(204).end();
  }),
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.auth!.userId },
      include: { profile: true, roles: true, trainerApplication: true },
    });

    if (!user || !user.profile) {
      throw new HttpError(404, "Usuario nao encontrado");
    }

    const roles = user.roles.map((assignment) => assignment.role);

    res.json({
      user: serializeUser(user, roles),
      profile: serializeProfile(user.profile, roles, user.trainerApplication),
    });
  }),
);
