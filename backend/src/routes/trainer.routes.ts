import { TrainerClientStatus, UserRole } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async-handler.js";
import { getRouteParam } from "../utils/params.js";
import { serializeProfile } from "../utils/serializers.js";

const router = Router();

const assignmentSchema = z.object({
  client_id: z.string().uuid(),
  notes: z.string().trim().max(500).nullable().optional(),
});

const updateAssignmentSchema = z.object({
  status: z.nativeEnum(TrainerClientStatus).optional(),
  notes: z.string().trim().max(500).nullable().optional(),
  goals: z.string().trim().max(2000).nullable().optional(),
  training_plan: z.string().trim().max(4000).nullable().optional(),
});

const searchUsersSchema = z.object({
  q: z.string().trim().min(2),
});

const createLogSchema = z.object({
  title: z.string().trim().min(2).max(120),
  content: z.string().trim().min(2).max(5000),
});

router.use(requireAuth);

router.get(
  "/my-assignment",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const assignment = await prisma.trainerClient.findFirst({
      where: {
        clientId: req.auth!.userId,
        status: TrainerClientStatus.ACTIVE,
      },
      include: {
        trainer: {
          include: {
            profile: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    if (!assignment) {
      return res.json({ assignment: null });
    }

    return res.json({
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
              id: assignment.trainerId,
              full_name: assignment.trainer.profile.fullName,
              avatar_url: assignment.trainer.profile.avatarUrl,
            }
          : null,
      },
    });
  }),
);

router.use(requireRole(UserRole.PERSONAL_TRAINER, "Acesso restrito a personal trainers"));

router.get(
  "/search-users",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { q } = searchUsersSchema.parse(req.query);

    const users = await prisma.user.findMany({
      where: {
        id: { not: req.auth!.userId },
        OR: [
          { email: { contains: q, mode: "insensitive" } },
          { profile: { fullName: { contains: q, mode: "insensitive" } } },
        ],
      },
      include: {
        profile: true,
        roles: true,
      },
      take: 10,
      orderBy: { createdAt: "desc" },
    });

    return res.json({
      users: users
        .filter((user) => user.profile)
        .map((user) => ({
          profile: serializeProfile(user.profile!, user.email, {
            isAdmin: user.roles.some((role) => role.role === UserRole.ADMIN),
            isPersonalTrainer: user.roles.some((role) => role.role === UserRole.PERSONAL_TRAINER),
          }),
        }))
        .filter((item) => !item.profile.is_admin && !item.profile.is_personal_trainer),
    });
  }),
);

router.get(
  "/clients",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const assignments = await prisma.trainerClient.findMany({
      where: { trainerId: req.auth!.userId },
      include: {
        client: {
          include: {
            profile: true,
            roles: true,
          },
        },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });

    return res.json({
      clients: assignments
        .filter((assignment) => assignment.client.profile)
        .map((assignment) => ({
          id: assignment.id,
          status: assignment.status.toLowerCase(),
          notes: assignment.notes,
          goals: assignment.goals,
          training_plan: assignment.trainingPlan,
          created_at: assignment.createdAt,
          profile: serializeProfile(
            assignment.client.profile!,
            assignment.client.email,
            {
              isAdmin: assignment.client.roles.some((role) => role.role === UserRole.ADMIN),
              isPersonalTrainer: assignment.client.roles.some((role) => role.role === UserRole.PERSONAL_TRAINER),
            },
          ),
        })),
    });
  }),
);

router.post(
  "/clients",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const data = assignmentSchema.parse(req.body);

    if (data.client_id === req.auth!.userId) {
      return res.status(400).json({ message: "Voce nao pode se vincular como proprio cliente" });
    }

    const client = await prisma.user.findUnique({
      where: { id: data.client_id },
      include: {
        profile: true,
        roles: true,
      },
    });

    if (!client?.profile) {
      return res.status(404).json({ message: "Cliente nao encontrado" });
    }

    const assignment = await prisma.trainerClient.upsert({
      where: {
        trainerId_clientId: {
          trainerId: req.auth!.userId,
          clientId: data.client_id,
        },
      },
      update: {
        status: TrainerClientStatus.ACTIVE,
        notes: data.notes ?? null,
        goals: null,
        trainingPlan: null,
      },
      create: {
        trainerId: req.auth!.userId,
        clientId: data.client_id,
        notes: data.notes ?? null,
        goals: null,
        trainingPlan: null,
      },
    });

    return res.status(201).json({
      assignment: {
        id: assignment.id,
        status: assignment.status.toLowerCase(),
        notes: assignment.notes,
        goals: assignment.goals,
        training_plan: assignment.trainingPlan,
      },
    });
  }),
);

router.patch(
  "/clients/:assignmentId",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const assignmentId = getRouteParam(req.params.assignmentId, "assignmentId");
    const data = updateAssignmentSchema.parse(req.body);
    const existing = await prisma.trainerClient.findUnique({
      where: { id: assignmentId },
    });

    if (!existing) {
      return res.status(404).json({ message: "Vinculo nao encontrado" });
    }

    if (existing.trainerId !== req.auth!.userId) {
      return res.status(403).json({ message: "Sem permissao para editar este vinculo" });
    }

    const assignment = await prisma.trainerClient.update({
      where: { id: assignmentId },
      data: {
        status: data.status,
        notes: data.notes,
        goals: data.goals,
        trainingPlan: data.training_plan,
      },
    });

    return res.json({
      assignment: {
        id: assignment.id,
        status: assignment.status.toLowerCase(),
        notes: assignment.notes,
        goals: assignment.goals,
        training_plan: assignment.trainingPlan,
        updated_at: assignment.updatedAt,
      },
    });
  }),
);

router.get(
  "/clients/:clientId/summary",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const clientId = getRouteParam(req.params.clientId, "clientId");
    const assignment = await prisma.trainerClient.findUnique({
      where: {
        trainerId_clientId: {
          trainerId: req.auth!.userId,
          clientId,
        },
      },
    });

    if (!assignment || assignment.status !== TrainerClientStatus.ACTIVE) {
      return res.status(404).json({ message: "Cliente nao vinculado a este personal" });
    }

    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const [client, fullAssignment, strengthCount, cardioCount, latestPhoto, latestBioimpedance] = await Promise.all([
      prisma.user.findUnique({
        where: { id: clientId },
        include: {
          profile: true,
          roles: true,
        },
      }),
      prisma.trainerClient.findUnique({
        where: {
          trainerId_clientId: {
            trainerId: req.auth!.userId,
            clientId,
          },
        },
        include: {
          logs: {
            orderBy: { createdAt: "desc" },
            take: 20,
          },
        },
      }),
      prisma.workout.count({
        where: {
          userId: clientId,
          date: { gte: last30Days },
        },
      }),
      prisma.cardioWorkout.count({
        where: {
          userId: clientId,
          date: { gte: last30Days },
        },
      }),
      prisma.bodyProgressPhoto.findFirst({
        where: { userId: clientId },
        orderBy: { takenAt: "desc" },
      }),
      prisma.bioimpedanceRecord.findFirst({
        where: { userId: clientId },
        orderBy: { date: "desc" },
      }),
    ]);

    if (!client?.profile) {
      return res.status(404).json({ message: "Cliente nao encontrado" });
    }

    if (!fullAssignment) {
      return res.status(404).json({ message: "Vinculo nao encontrado" });
    }

    return res.json({
      client: serializeProfile(client.profile, client.email, {
        isAdmin: client.roles.some((role) => role.role === UserRole.ADMIN),
        isPersonalTrainer: client.roles.some((role) => role.role === UserRole.PERSONAL_TRAINER),
      }),
      summary: {
        assignment: {
          id: fullAssignment.id,
          status: fullAssignment.status.toLowerCase(),
          notes: fullAssignment.notes,
          goals: fullAssignment.goals,
          training_plan: fullAssignment.trainingPlan,
          created_at: fullAssignment.createdAt,
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
        logs: fullAssignment.logs.map((log) => ({
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

router.post(
  "/clients/:clientId/logs",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const clientId = getRouteParam(req.params.clientId, "clientId");
    const data = createLogSchema.parse(req.body);

    const assignment = await prisma.trainerClient.findUnique({
      where: {
        trainerId_clientId: {
          trainerId: req.auth!.userId,
          clientId,
        },
      },
    });

    if (!assignment || assignment.status !== TrainerClientStatus.ACTIVE) {
      return res.status(404).json({ message: "Cliente nao vinculado a este personal" });
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

    return res.status(201).json({
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

export { router as trainerRouter };
