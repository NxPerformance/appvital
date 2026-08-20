import { Router } from "express";
import { TrainerApplicationStatus, UserRole } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAdmin, requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async-handler.js";
import { logAudit } from "../services/audit.service.js";
import {
  getPaymentGatewaySettingsSummary,
  saveStripeGatewaySettings,
} from "../services/payment-gateway-settings.service.js";
import { serializeProfile } from "../utils/serializers.js";
import { getRouteParam } from "../utils/params.js";

const router = Router();

const premiumSchema = z.object({
  is_premium: z.boolean(),
});

const roleSchema = z.object({
  is_admin: z.boolean(),
});

const trainerRoleSchema = z.object({
  is_personal_trainer: z.boolean(),
});

const reviewTrainerApplicationSchema = z.object({
  decision: z.enum(["approve", "reject"]),
  rejection_reason: z.string().trim().max(500).optional().nullable(),
});

const stripeGatewaySettingsSchema = z.object({
  is_active: z.boolean(),
  publishable_key: z.string().trim().max(500).optional().nullable(),
  secret_key: z.string().trim().max(500).optional().nullable(),
  webhook_secret: z.string().trim().max(500).optional().nullable(),
});

router.use(requireAuth, requireAdmin);

router.get(
  "/payment-gateway-settings",
  asyncHandler(async (_req, res) => {
    const settings = await getPaymentGatewaySettingsSummary();
    return res.json({ settings });
  }),
);

router.put(
  "/payment-gateway-settings/stripe",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const data = stripeGatewaySettingsSchema.parse(req.body);
    const settings = await saveStripeGatewaySettings({
      isActive: data.is_active,
      publishableKey: data.publishable_key,
      secretKey: data.secret_key,
      webhookSecret: data.webhook_secret,
    });

    await logAudit({
      actorUserId: req.auth!.userId,
      action: "update_payment_gateway_settings",
      entityType: "payment_gateway",
      entityId: "stripe",
      details: {
        provider: "stripe",
        is_active: settings.is_active,
        publishable_key_configured: Boolean(settings.publishable_key),
        secret_key_configured: settings.has_secret_key,
        webhook_secret_configured: settings.has_webhook_secret,
      },
    });

    return res.json({ settings });
  }),
);

router.get(
  "/users",
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      include: {
        profile: true,
        roles: true,
        trainerApplication: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.json({
      users: users
        .filter((user) => user.profile)
        .map((user) =>
          serializeProfile(
            user.profile!,
            user.email,
            {
              isAdmin: user.roles.some((role) => role.role === UserRole.ADMIN),
              isPersonalTrainer: user.roles.some((role) => role.role === UserRole.PERSONAL_TRAINER),
              trainerApplicationStatus: user.trainerApplication?.status ?? null,
              trainerApplicationId: user.trainerApplication?.id ?? null,
            },
          ),
        ),
    });
  }),
);

router.patch(
  "/users/:userId/premium",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const data = premiumSchema.parse(req.body);
    const userId = getRouteParam(req.params.userId, "userId");
    const profile = await prisma.profile.update({
      where: { userId },
      data: { isPremium: data.is_premium },
      include: { user: { include: { roles: true } } },
    });

    await logAudit({
      actorUserId: req.auth!.userId,
      targetUserId: profile.userId,
      action: "update_premium",
      entityType: "profile",
      entityId: profile.userId,
      details: data,
    });

    return res.json({
      profile: serializeProfile(
        profile,
        profile.user.email,
        {
          isAdmin: profile.user.roles.some((role) => role.role === UserRole.ADMIN),
          isPersonalTrainer: profile.user.roles.some((role) => role.role === UserRole.PERSONAL_TRAINER),
        },
      ),
    });
  }),
);

router.patch(
  "/users/:userId/admin-role",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const data = roleSchema.parse(req.body);
    const targetUserId = getRouteParam(req.params.userId, "userId");

    if (targetUserId === req.auth!.userId && !data.is_admin) {
      return res.status(400).json({ message: "Voce nao pode remover seu proprio acesso admin" });
    }

    if (data.is_admin) {
      await prisma.userRoleAssignment.upsert({
        where: {
          userId_role: {
            userId: targetUserId,
            role: UserRole.ADMIN,
          },
        },
        update: {},
        create: {
          userId: targetUserId,
          role: UserRole.ADMIN,
          createdBy: req.auth!.userId,
        },
      });
    } else {
      await prisma.userRoleAssignment.deleteMany({
        where: {
          userId: targetUserId,
          role: UserRole.ADMIN,
        },
      });
    }

    await logAudit({
      actorUserId: req.auth!.userId,
      targetUserId,
      action: data.is_admin ? "grant_role" : "revoke_role",
      entityType: "user_role",
      entityId: targetUserId,
      details: { role: "ADMIN" },
    });

    return res.status(204).send();
  }),
);

router.patch(
  "/users/:userId/trainer-role",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const data = trainerRoleSchema.parse(req.body);
    const targetUserId = getRouteParam(req.params.userId, "userId");

    if (data.is_personal_trainer) {
      await prisma.userRoleAssignment.upsert({
        where: {
          userId_role: {
            userId: targetUserId,
            role: UserRole.PERSONAL_TRAINER,
          },
        },
        update: {},
        create: {
          userId: targetUserId,
          role: UserRole.PERSONAL_TRAINER,
          createdBy: req.auth!.userId,
        },
      });
    } else {
      await prisma.userRoleAssignment.deleteMany({
        where: {
          userId: targetUserId,
          role: UserRole.PERSONAL_TRAINER,
        },
      });
    }

    await logAudit({
      actorUserId: req.auth!.userId,
      targetUserId,
      action: data.is_personal_trainer ? "grant_role" : "revoke_role",
      entityType: "user_role",
      entityId: targetUserId,
      details: { role: "PERSONAL_TRAINER" },
    });

    return res.status(204).send();
  }),
);

router.get(
  "/trainer-applications",
  asyncHandler(async (_req, res) => {
    const applications = await prisma.trainerApplication.findMany({
      include: {
        user: {
          include: {
            profile: true,
            roles: true,
          },
        },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });

    return res.json({
      applications: applications.map((application) => ({
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
        user: application.user.profile
          ? serializeProfile(application.user.profile, application.user.email, {
              isAdmin: application.user.roles.some((role) => role.role === UserRole.ADMIN),
              isPersonalTrainer: application.user.roles.some((role) => role.role === UserRole.PERSONAL_TRAINER),
              trainerApplicationStatus: application.status,
              trainerApplicationId: application.id,
            })
          : null,
      })),
    });
  }),
);

router.patch(
  "/trainer-applications/:applicationId/review",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const applicationId = getRouteParam(req.params.applicationId, "applicationId");
    const data = reviewTrainerApplicationSchema.parse(req.body);
    const application = await prisma.trainerApplication.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      return res.status(404).json({ message: "Solicitacao de personal nao encontrada" });
    }

    if (data.decision === "approve") {
      if (!application.selfPhotoUrl || !application.documentPhotoUrl) {
        return res.status(400).json({ message: "A solicitacao precisa ter foto do personal e foto do documento" });
      }

      await prisma.$transaction([
        prisma.trainerApplication.update({
          where: { id: applicationId },
          data: {
            status: TrainerApplicationStatus.APPROVED,
            rejectionReason: null,
            reviewedAt: new Date(),
            reviewedBy: req.auth!.userId,
          },
        }),
        prisma.userRoleAssignment.upsert({
          where: {
            userId_role: {
              userId: application.userId,
              role: UserRole.PERSONAL_TRAINER,
            },
          },
          update: {},
          create: {
            userId: application.userId,
            role: UserRole.PERSONAL_TRAINER,
            createdBy: req.auth!.userId,
          },
        }),
        prisma.profile.update({
          where: { userId: application.userId },
          data: {
            isPremium: true,
          },
        }),
      ]);
    } else {
      await prisma.$transaction([
        prisma.trainerApplication.update({
          where: { id: applicationId },
          data: {
            status: TrainerApplicationStatus.REJECTED,
            rejectionReason: data.rejection_reason ?? "Cadastro recusado",
            reviewedAt: new Date(),
            reviewedBy: req.auth!.userId,
          },
        }),
        prisma.userRoleAssignment.deleteMany({
          where: {
            userId: application.userId,
            role: UserRole.PERSONAL_TRAINER,
          },
        }),
      ]);
    }

    await logAudit({
      actorUserId: req.auth!.userId,
      targetUserId: application.userId,
      action: data.decision === "approve" ? "approve_trainer_application" : "reject_trainer_application",
      entityType: "trainer_application",
      entityId: applicationId,
      details: {
        rejection_reason: data.rejection_reason ?? null,
      },
    });

    return res.status(204).send();
  }),
);

router.get(
  "/audit-logs",
  asyncHandler(async (_req, res) => {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return res.json({ logs });
  }),
);

router.get(
  "/orders",
  asyncHandler(async (_req, res) => {
    const orders = await prisma.order.findMany({
      include: {
        user: {
          include: {
            profile: true,
          },
        },
        items: true,
        payments: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return res.json({
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

router.get(
  "/products",
  asyncHandler(async (_req, res) => {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: "desc" },
    });

    return res.json({
      products: products.map((product) => ({
        id: product.id,
        slug: product.slug,
        name: product.name,
        description: product.description,
        price_cents: product.priceCents,
        currency: product.currency,
        status: product.status.toLowerCase(),
        billing_cycle: product.billingCycle.toLowerCase(),
        grants_premium: product.grantsPremium,
        metadata: product.metadata,
        created_at: product.createdAt,
        updated_at: product.updatedAt,
      })),
    });
  }),
);

router.delete(
  "/users/:userId",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const targetUserId = getRouteParam(req.params.userId, "userId");

    if (targetUserId === req.auth!.userId) {
      return res.status(400).json({ message: "Voce nao pode excluir sua propria conta admin" });
    }

    await logAudit({
      actorUserId: req.auth!.userId,
      targetUserId,
      action: "delete_user",
      entityType: "user",
      entityId: targetUserId,
    });

    await prisma.user.delete({
      where: { id: targetUserId },
    });

    return res.status(204).send();
  }),
);

export { router as adminRouter };
