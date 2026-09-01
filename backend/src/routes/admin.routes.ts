import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../middleware/error-handler.js";
import { getRouteParam } from "../utils/params.js";
import { logAudit } from "../services/audit.service.js";
import { serializeProfile } from "../utils/serializers.js";
import type { Profile, TrainerApplication, User, UserRoleAssignment } from "@prisma/client";

export const adminRouter = Router();

adminRouter.use(requireAuth, requireAdmin);

function serializeAdminProfile(
  user: User & { profile: Profile | null; roles: UserRoleAssignment[]; trainerApplication: TrainerApplication | null },
) {
  if (!user.profile) return null;
  const roles = user.roles.map((assignment) => assignment.role);
  // Reuses the same field set/logic (and created_at source) as the
  // self-service profile view, so the two never drift apart again -
  // only email is admin-view-specific (the self view gets it from the
  // sibling `user` object instead of the profile payload).
  return { email: user.email, ...serializeProfile(user.profile, roles, user.trainerApplication) };
}

function serializeTrainerApplication(
  application: TrainerApplication & { user: (User & { profile: Profile | null; roles: UserRoleAssignment[]; trainerApplication: TrainerApplication | null }) | null },
) {
  return {
    id: application.id,
    status: application.status.toLowerCase(),
    full_name: application.fullName,
    cref: application.cref,
    cref_state: application.crefState,
    specialties: application.specialties,
    experience_years: application.experienceYears,
    instagram_handle: application.instagramHandle,
    proof_notes: application.proofNotes,
    self_photo_url: application.selfPhotoUrl,
    document_photo_url: application.documentPhotoUrl,
    rejection_reason: application.rejectionReason,
    created_at: application.createdAt,
    reviewed_at: application.reviewedAt,
    user: application.user ? serializeAdminProfile(application.user) : null,
  };
}

adminRouter.get(
  "/users",
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      include: { profile: true, roles: true, trainerApplication: true },
      orderBy: { createdAt: "desc" },
    });

    res.json({ users: users.map(serializeAdminProfile).filter((item) => item !== null) });
  }),
);

const premiumSchema = z.object({ is_premium: z.boolean() });

adminRouter.patch(
  "/users/:userId/premium",
  asyncHandler(async (req, res) => {
    const userId = getRouteParam(req.params.userId, "userId");
    const { is_premium } = premiumSchema.parse(req.body);

    const profile = await prisma.profile.update({ where: { userId }, data: { isPremium: is_premium } });

    await logAudit({
      actorUserId: req.auth!.userId,
      targetUserId: userId,
      action: "update_premium",
      entityType: "Profile",
      entityId: userId,
      details: { is_premium },
    });

    res.json({ profile });
  }),
);

const adminRoleSchema = z.object({ is_admin: z.boolean() });

adminRouter.patch(
  "/users/:userId/admin-role",
  asyncHandler(async (req, res) => {
    const userId = getRouteParam(req.params.userId, "userId");
    const { is_admin } = adminRoleSchema.parse(req.body);

    if (userId === req.auth!.userId && !is_admin) {
      throw new HttpError(400, "Voce nao pode remover seu proprio acesso de administrador");
    }

    if (is_admin) {
      await prisma.userRoleAssignment.upsert({
        where: { userId_role: { userId, role: "ADMIN" } },
        create: { userId, role: "ADMIN", createdBy: req.auth!.userId },
        update: {},
      });
    } else {
      await prisma.userRoleAssignment.deleteMany({ where: { userId, role: "ADMIN" } });
    }

    await logAudit({
      actorUserId: req.auth!.userId,
      targetUserId: userId,
      action: is_admin ? "grant_role" : "revoke_role",
      entityType: "UserRoleAssignment",
      entityId: userId,
      details: { role: "ADMIN" },
    });

    res.status(204).send();
  }),
);

const trainerRoleSchema = z.object({ is_personal_trainer: z.boolean() });

adminRouter.patch(
  "/users/:userId/trainer-role",
  asyncHandler(async (req, res) => {
    const userId = getRouteParam(req.params.userId, "userId");
    const { is_personal_trainer } = trainerRoleSchema.parse(req.body);

    if (is_personal_trainer) {
      await prisma.userRoleAssignment.upsert({
        where: { userId_role: { userId, role: "PERSONAL_TRAINER" } },
        create: { userId, role: "PERSONAL_TRAINER", createdBy: req.auth!.userId },
        update: {},
      });
    } else {
      await prisma.userRoleAssignment.deleteMany({ where: { userId, role: "PERSONAL_TRAINER" } });
    }

    await logAudit({
      actorUserId: req.auth!.userId,
      targetUserId: userId,
      action: is_personal_trainer ? "grant_role" : "revoke_role",
      entityType: "UserRoleAssignment",
      entityId: userId,
      details: { role: "PERSONAL_TRAINER" },
    });

    res.status(204).send();
  }),
);

adminRouter.get(
  "/trainer-applications",
  asyncHandler(async (_req, res) => {
    const applications = await prisma.trainerApplication.findMany({
      include: { user: { include: { profile: true, roles: true, trainerApplication: true } } },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });

    res.json({ applications: applications.map(serializeTrainerApplication) });
  }),
);

const reviewSchema = z.object({
  decision: z.enum(["approve", "reject"]),
  rejection_reason: z.string().nullable().optional(),
});

adminRouter.patch(
  "/trainer-applications/:applicationId/review",
  asyncHandler(async (req, res) => {
    const applicationId = getRouteParam(req.params.applicationId, "applicationId");
    const { decision, rejection_reason } = reviewSchema.parse(req.body);

    const application = await prisma.trainerApplication.findUnique({ where: { id: applicationId } });
    if (!application) {
      throw new HttpError(404, "Aplicacao nao encontrada");
    }

    if (decision === "approve") {
      if (!application.selfPhotoUrl || !application.documentPhotoUrl) {
        throw new HttpError(400, "Aplicacao incompleta, sem fotos de comprovacao");
      }

      await prisma.$transaction([
        prisma.trainerApplication.update({
          where: { id: applicationId },
          data: { status: "APPROVED", reviewedAt: new Date(), reviewedBy: req.auth!.userId, rejectionReason: null },
        }),
        prisma.userRoleAssignment.upsert({
          where: { userId_role: { userId: application.userId, role: "PERSONAL_TRAINER" } },
          create: { userId: application.userId, role: "PERSONAL_TRAINER", createdBy: req.auth!.userId },
          update: {},
        }),
        prisma.profile.update({ where: { userId: application.userId }, data: { isPremium: true } }),
      ]);

      await logAudit({
        actorUserId: req.auth!.userId,
        targetUserId: application.userId,
        action: "approve_trainer_application",
        entityType: "TrainerApplication",
        entityId: applicationId,
        details: {},
      });
    } else {
      await prisma.$transaction([
        prisma.trainerApplication.update({
          where: { id: applicationId },
          data: {
            status: "REJECTED",
            reviewedAt: new Date(),
            reviewedBy: req.auth!.userId,
            rejectionReason: rejection_reason ?? "Cadastro recusado",
          },
        }),
        prisma.userRoleAssignment.deleteMany({ where: { userId: application.userId, role: "PERSONAL_TRAINER" } }),
      ]);

      await logAudit({
        actorUserId: req.auth!.userId,
        targetUserId: application.userId,
        action: "reject_trainer_application",
        entityType: "TrainerApplication",
        entityId: applicationId,
        details: { rejection_reason: rejection_reason ?? "Cadastro recusado" },
      });
    }

    res.status(204).send();
  }),
);

adminRouter.get(
  "/audit-logs",
  asyncHandler(async (_req, res) => {
    const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
    res.json({ logs });
  }),
);

adminRouter.get(
  "/orders",
  asyncHandler(async (_req, res) => {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { items: true, payments: true },
    });

    res.json({
      orders: orders.map((order) => ({
        id: order.id,
        status: order.status.toLowerCase(),
        total_cents: order.totalCents,
        currency: order.currency,
        customer_email: order.customerEmail,
        customer_name: order.customerName,
        user_id: order.userId,
        created_at: order.createdAt,
        paid_at: order.paidAt,
        items: order.items.map((item) => ({
          product_name: item.productName,
          quantity: item.quantity,
          total_cents: item.totalCents,
        })),
        payments: order.payments.map((payment) => ({
          id: payment.id,
          provider: payment.provider.toLowerCase(),
          method: payment.method.toLowerCase(),
          status: payment.status.toLowerCase(),
          amount_cents: payment.amountCents,
          provider_payment_id: payment.providerPaymentId,
          created_at: payment.createdAt,
        })),
      })),
    });
  }),
);

adminRouter.get(
  "/products",
  asyncHandler(async (_req, res) => {
    const products = await prisma.product.findMany({ orderBy: { createdAt: "desc" } });
    res.json({ products });
  }),
);

adminRouter.delete(
  "/users/:userId",
  asyncHandler(async (req, res) => {
    const userId = getRouteParam(req.params.userId, "userId");

    if (userId === req.auth!.userId) {
      throw new HttpError(400, "Voce nao pode excluir sua propria conta");
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new HttpError(404, "Usuario nao encontrado");
    }

    await logAudit({
      actorUserId: req.auth!.userId,
      targetUserId: userId,
      action: "delete_user",
      entityType: "User",
      entityId: userId,
      details: { email: user.email },
    });

    await prisma.user.delete({ where: { id: userId } });

    res.status(204).send();
  }),
);
