import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../middleware/error-handler.js";
import { getRouteParam } from "../utils/params.js";
import { serializeProfile } from "../utils/serializers.js";
import type { Profile, User, UserRoleAssignment } from "@prisma/client";

export const trainerRouter = Router();

trainerRouter.use(requireAuth);

// Deliberately narrower than the admin/self profile views: a trainer only
// sees what's relevant to coaching a consenting client, not account-settings
// fields (notification prefs, payment method, terms acceptance) or whether
// that client separately applied to become a trainer themselves. Sources its
// values from serializeProfile so they can't silently drift (e.g. created_at
// coming from a different DB column) even though the field set stays a pick.
function serializeTrainerProfile(user: User & { profile: Profile | null; roles: UserRoleAssignment[] }) {
  if (!user.profile) return null;
  const roles = user.roles.map((assignment) => assignment.role);
  const full = serializeProfile(user.profile, roles, null);
  return {
    id: full.id,
    full_name: full.full_name,
    email: user.email,
    phone: full.phone,
    age: full.age,
    height_cm: full.height_cm,
    weight_kg: full.weight_kg,
    is_premium: full.is_premium,
    entry_date: full.entry_date,
    avatar_url: full.avatar_url,
    is_admin: full.is_admin,
    is_personal_trainer: full.is_personal_trainer,
  };
}

trainerRouter.get(
  "/my-assignment",
  asyncHandler(async (req, res) => {
    // Prefer the active relationship; otherwise surface the most recent
    // pending request so the client can accept or reject it.
    const assignment =
      (await prisma.trainerClient.findFirst({
        where: { clientId: req.auth!.userId, status: "ACTIVE" },
        include: { trainer: { include: { profile: true } } },
      })) ??
      (await prisma.trainerClient.findFirst({
        where: { clientId: req.auth!.userId, status: "PENDING" },
        orderBy: { createdAt: "desc" },
        include: { trainer: { include: { profile: true } } },
      }));

    if (!assignment) {
      res.json({ assignment: null });
      return;
    }

    res.json({
      assignment: {
        id: assignment.id,
        status: assignment.status.toLowerCase(),
        notes: assignment.notes,
        goals: assignment.goals,
        training_plan: assignment.trainingPlan,
        created_at: assignment.createdAt,
        updated_at: assignment.updatedAt,
        trainer: assignment.trainer.profile
          ? {
              id: assignment.trainer.id,
              full_name: assignment.trainer.profile.fullName,
              avatar_url: assignment.trainer.profile.avatarUrl,
            }
          : null,
      },
    });
  }),
);

const respondToAssignmentSchema = z.object({
  action: z.enum(["accept", "reject", "revoke"]),
});

trainerRouter.patch(
  "/my-assignment",
  asyncHandler(async (req, res) => {
    const { action } = respondToAssignmentSchema.parse(req.body);
    const wantedStatus = action === "revoke" ? "ACTIVE" : "PENDING";

    const assignment = await prisma.trainerClient.findFirst({
      where: { clientId: req.auth!.userId, status: wantedStatus },
      orderBy: { createdAt: "desc" },
    });

    if (!assignment) {
      throw new HttpError(
        404,
        action === "revoke" ? "Nenhum personal trainer ativo encontrado" : "Nenhuma solicitacao pendente encontrada",
      );
    }

    if (action === "accept") {
      try {
        await prisma.trainerClient.update({ where: { id: assignment.id }, data: { status: "ACTIVE" } });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          throw new HttpError(409, "Voce ja tem um personal trainer ativo. Remova o vinculo atual antes de aceitar outro.");
        }
        throw error;
      }
    } else {
      await prisma.trainerClient.update({ where: { id: assignment.id }, data: { status: "ARCHIVED" } });
    }

    res.json({ ok: true });
  }),
);

trainerRouter.use(requireRole("PERSONAL_TRAINER", "Acesso restrito a personal trainers"));

trainerRouter.get(
  "/search-users",
  asyncHandler(async (req, res) => {
    const q = String(req.query.q ?? "").trim();
    if (q.length < 2) {
      res.json({ users: [] });
      return;
    }

    const users = await prisma.user.findMany({
      where: {
        id: { not: req.auth!.userId },
        roles: { none: { role: { in: ["ADMIN", "PERSONAL_TRAINER"] } } },
        OR: [
          { email: { contains: q, mode: "insensitive" } },
          { profile: { fullName: { contains: q, mode: "insensitive" } } },
        ],
      },
      include: { profile: true, roles: true },
      take: 10,
    });

    res.json({
      users: users
        .map((user) => ({ profile: serializeTrainerProfile(user) }))
        .filter((item) => item.profile !== null),
    });
  }),
);

trainerRouter.get(
  "/clients",
  asyncHandler(async (req, res) => {
    const clients = await prisma.trainerClient.findMany({
      where: { trainerId: req.auth!.userId },
      include: { client: { include: { profile: true, roles: true } } },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      clients: clients
        .map((assignment) => ({
          id: assignment.id,
          status: assignment.status.toLowerCase(),
          notes: assignment.notes,
          goals: assignment.goals,
          training_plan: assignment.trainingPlan,
          created_at: assignment.createdAt,
          profile: serializeTrainerProfile(assignment.client),
        }))
        .filter((item) => item.profile !== null),
    });
  }),
);

const assignSchema = z.object({
  client_id: z.string().uuid(),
  notes: z.string().nullable().optional(),
});

trainerRouter.post(
  "/clients",
  asyncHandler(async (req, res) => {
    const { client_id, notes } = assignSchema.parse(req.body);

    if (client_id === req.auth!.userId) {
      throw new HttpError(400, "Voce nao pode se vincular como seu proprio cliente");
    }

    const existing = await prisma.trainerClient.findUnique({
      where: { trainerId_clientId: { trainerId: req.auth!.userId, clientId: client_id } },
    });

    if (existing?.status === "ACTIVE") {
      throw new HttpError(409, "Este aluno ja esta vinculado a voce");
    }
    if (existing?.status === "PENDING") {
      throw new HttpError(409, "Solicitacao ja enviada, aguardando resposta do aluno");
    }

    const activeElsewhere = await prisma.trainerClient.findFirst({
      where: { clientId: client_id, status: "ACTIVE" },
    });
    if (activeElsewhere) {
      throw new HttpError(409, "Este aluno ja possui um personal trainer ativo");
    }

    // Requires the client's consent (see PATCH /my-assignment): this only
    // creates a PENDING request, it does not grant access by itself.
    const assignment = await prisma.trainerClient.upsert({
      where: { trainerId_clientId: { trainerId: req.auth!.userId, clientId: client_id } },
      create: { trainerId: req.auth!.userId, clientId: client_id, notes: notes ?? null, status: "PENDING" },
      update: { status: "PENDING", notes: notes ?? null, goals: null, trainingPlan: null },
    });

    res.status(201).json({
      assignment: {
        id: assignment.id,
        status: assignment.status.toLowerCase(),
        notes: assignment.notes,
        goals: assignment.goals,
        training_plan: assignment.trainingPlan,
        created_at: assignment.createdAt,
      },
    });
  }),
);

const updateSchema = z.object({
  // Only ARCHIVED is allowed here: a trainer can end a relationship
  // unilaterally, but (re)activating one requires the client's consent via
  // POST /clients (creates a PENDING request) + PATCH /my-assignment.
  status: z.literal("ARCHIVED").optional(),
  notes: z.string().nullable().optional(),
  goals: z.string().nullable().optional(),
  training_plan: z.string().nullable().optional(),
});

trainerRouter.patch(
  "/clients/:assignmentId",
  asyncHandler(async (req, res) => {
    const assignmentId = getRouteParam(req.params.assignmentId, "assignmentId");
    const data = updateSchema.parse(req.body);

    const existing = await prisma.trainerClient.findUnique({ where: { id: assignmentId } });
    if (!existing) throw new HttpError(404, "Vinculo nao encontrado");
    if (existing.trainerId !== req.auth!.userId) throw new HttpError(403, "Acesso negado");

    const assignment = await prisma.trainerClient.update({
      where: { id: assignmentId },
      data: {
        status: data.status,
        notes: data.notes,
        goals: data.goals,
        trainingPlan: data.training_plan,
      },
    });

    res.json({
      assignment: {
        id: assignment.id,
        status: assignment.status.toLowerCase(),
        notes: assignment.notes,
        goals: assignment.goals,
        training_plan: assignment.trainingPlan,
        created_at: assignment.createdAt,
      },
    });
  }),
);

trainerRouter.get(
  "/clients/:clientId/summary",
  asyncHandler(async (req, res) => {
    const clientId = getRouteParam(req.params.clientId, "clientId");

    const assignment = await prisma.trainerClient.findUnique({
      where: { trainerId_clientId: { trainerId: req.auth!.userId, clientId } },
      include: { client: { include: { profile: true, roles: true } } },
    });

    if (!assignment || assignment.status !== "ACTIVE") {
      throw new HttpError(403, "Vinculo inativo ou inexistente");
    }

    const since30Days = new Date();
    since30Days.setDate(since30Days.getDate() - 30);

    const [strengthCount, cardioCount, latestPhoto, latestBioimpedance, logs] = await Promise.all([
      prisma.workout.count({ where: { userId: clientId, date: { gte: since30Days } } }),
      prisma.cardioWorkout.count({ where: { userId: clientId, date: { gte: since30Days } } }),
      prisma.bodyProgressPhoto.findFirst({ where: { userId: clientId }, orderBy: { takenAt: "desc" } }),
      prisma.bioimpedanceRecord.findFirst({ where: { userId: clientId }, orderBy: { date: "desc" } }),
      prisma.trainerClientLog.findMany({
        where: { trainerClientId: assignment.id },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

    res.json({
      client: serializeTrainerProfile(assignment.client),
      summary: {
        assignment: {
          id: assignment.id,
          status: assignment.status.toLowerCase(),
          notes: assignment.notes,
          goals: assignment.goals,
          training_plan: assignment.trainingPlan,
          created_at: assignment.createdAt,
        },
        workouts_last_30_days: strengthCount + cardioCount,
        strength_workouts_last_30_days: strengthCount,
        cardio_workouts_last_30_days: cardioCount,
        latest_body_progress_photo: latestPhoto
          ? {
              id: latestPhoto.id,
              image_url: latestPhoto.imageUrl,
              pose: latestPhoto.pose.toLowerCase(),
              taken_at: latestPhoto.takenAt,
            }
          : null,
        latest_bioimpedance: latestBioimpedance
          ? {
              date: latestBioimpedance.date,
              weight_kg: latestBioimpedance.weightKg ? Number(latestBioimpedance.weightKg) : null,
              body_fat_percent: latestBioimpedance.bodyFatPercent ? Number(latestBioimpedance.bodyFatPercent) : null,
              muscle_mass_kg: latestBioimpedance.muscleMassKg ? Number(latestBioimpedance.muscleMassKg) : null,
            }
          : null,
        logs: logs.map((log) => ({
          id: log.id,
          title: log.title,
          content: log.content,
          created_at: log.createdAt,
          updated_at: log.updatedAt,
        })),
      },
    });
  }),
);

const logSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
});

trainerRouter.post(
  "/clients/:clientId/logs",
  asyncHandler(async (req, res) => {
    const clientId = getRouteParam(req.params.clientId, "clientId");
    const data = logSchema.parse(req.body);

    const assignment = await prisma.trainerClient.findUnique({
      where: { trainerId_clientId: { trainerId: req.auth!.userId, clientId } },
    });

    if (!assignment || assignment.status !== "ACTIVE") {
      throw new HttpError(403, "Vinculo inativo ou inexistente");
    }

    const log = await prisma.trainerClientLog.create({
      data: {
        trainerClientId: assignment.id,
        trainerId: req.auth!.userId,
        clientId,
        title: data.title,
        content: data.content,
      },
    });

    res.status(201).json({
      log: {
        id: log.id,
        title: log.title,
        content: log.content,
        created_at: log.createdAt,
        updated_at: log.updatedAt,
      },
    });
  }),
);
