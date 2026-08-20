import { Router } from "express";
import {
  OrderStatus,
  PaymentMethod,
  PaymentProvider,
  PaymentStatus,
  ProductStatus,
  type Prisma,
} from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async-handler.js";
import { getRouteParam } from "../utils/params.js";
import {
  createGatewayCheckout,
  constructStripeWebhookEvent,
  getConfiguredPaymentProvider,
  retrieveStripeCheckoutSession,
  verifyWebhookSignature,
} from "../services/payment-gateway.service.js";
import { markPaymentAsPaid } from "../services/payments.service.js";
import { logAudit } from "../services/audit.service.js";

const router = Router();

const checkoutSchema = z.object({
  product_id: z.string().uuid(),
  payment_method: z.enum(["pix", "credit_card"]),
});

const confirmCheckoutSchema = z.object({
  session_id: z.string().min(1).optional(),
  order_id: z.string().uuid().optional(),
}).refine((data) => data.session_id || data.order_id, {
  message: "Informe session_id ou order_id",
});

const webhookSchema = z
  .object({
    event_id: z.string().optional(),
    event_type: z.string().default("payment.updated"),
    payment_id: z.string().uuid().optional(),
    provider_payment_id: z.string().optional(),
    status: z.enum(["pending", "processing", "paid", "failed", "cancelled", "refunded"]),
  })
  .refine((data) => data.payment_id || data.provider_payment_id, {
    message: "Informe payment_id ou provider_payment_id",
  });

const methodMap: Record<z.infer<typeof checkoutSchema>["payment_method"], PaymentMethod> = {
  pix: PaymentMethod.PIX,
  credit_card: PaymentMethod.CREDIT_CARD,
};

const statusMap: Record<z.infer<typeof webhookSchema>["status"], PaymentStatus> = {
  pending: PaymentStatus.PENDING,
  processing: PaymentStatus.PROCESSING,
  paid: PaymentStatus.PAID,
  failed: PaymentStatus.FAILED,
  cancelled: PaymentStatus.CANCELLED,
  refunded: PaymentStatus.REFUNDED,
};

const providerMap: Record<string, PaymentProvider> = {
  manual: PaymentProvider.MANUAL,
  mercado_pago: PaymentProvider.MERCADO_PAGO,
  stripe: PaymentProvider.STRIPE,
  pagarme: PaymentProvider.PAGARME,
  asaas: PaymentProvider.ASAAS,
};

function serializeProduct(product: {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  priceCents: number;
  currency: string;
  billingCycle: string;
  grantsPremium: boolean;
}) {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description,
    price_cents: product.priceCents,
    currency: product.currency,
    billing_cycle: product.billingCycle.toLowerCase(),
    grants_premium: product.grantsPremium,
  };
}

function serializeOrder(order: {
  id: string;
  status: OrderStatus;
  totalCents: number;
  currency: string;
  createdAt: Date;
  paidAt: Date | null;
  items: Array<{ productName: string; quantity: number; totalCents: number }>;
  payments: Array<{
    id: string;
    method: PaymentMethod;
    status: PaymentStatus;
    checkoutUrl: string | null;
    pixQrCode: string | null;
    pixCopyPaste: string | null;
    createdAt: Date;
  }>;
}) {
  return {
    id: order.id,
    status: order.status.toLowerCase(),
    total_cents: order.totalCents,
    currency: order.currency,
    created_at: order.createdAt,
    paid_at: order.paidAt,
    items: order.items.map((item) => ({
      product_name: item.productName,
      quantity: item.quantity,
      total_cents: item.totalCents,
    })),
    payments: order.payments.map((payment) => ({
      id: payment.id,
      method: payment.method.toLowerCase(),
      status: payment.status.toLowerCase(),
      checkout_url: payment.checkoutUrl,
      pix_qr_code: payment.pixQrCode,
      pix_copy_paste: payment.pixCopyPaste,
      created_at: payment.createdAt,
    })),
  };
}

router.get(
  "/products",
  asyncHandler(async (_req, res) => {
    const products = await prisma.product.findMany({
      where: { status: ProductStatus.ACTIVE },
      orderBy: { priceCents: "asc" },
    });

    return res.json({ products: products.map(serializeProduct) });
  }),
);

router.get(
  "/orders",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orders = await prisma.order.findMany({
      where: { userId: req.auth!.userId },
      include: { items: true, payments: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return res.json({ orders: orders.map(serializeOrder) });
  }),
);

router.get(
  "/orders/:orderId",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orderId = getRouteParam(req.params.orderId, "orderId");
    const order = await prisma.order.findFirst({
      where: { id: orderId, userId: req.auth!.userId },
      include: { items: true, payments: true },
    });

    if (!order) {
      return res.status(404).json({ message: "Pedido nao encontrado" });
    }

    return res.json({ order: serializeOrder(order) });
  }),
);

router.post(
  "/checkout",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const data = checkoutSchema.parse(req.body);
    const product = await prisma.product.findFirst({
      where: {
        id: data.product_id,
        status: ProductStatus.ACTIVE,
      },
    });

    if (!product) {
      return res.status(404).json({ message: "Produto indisponivel" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.auth!.userId },
      include: { profile: true },
    });

    if (!user?.profile) {
      return res.status(400).json({ message: "Complete seu perfil antes de comprar" });
    }

    const method = methodMap[data.payment_method];
    const paymentProvider = await getConfiguredPaymentProvider();
    const order = await prisma.order.create({
      data: {
        userId: user.id,
        subtotalCents: product.priceCents,
        totalCents: product.priceCents,
        currency: product.currency,
        customerEmail: user.email,
        customerName: user.profile.fullName,
        expiresAt: new Date(Date.now() + 1000 * 60 * 30),
        items: {
          create: {
            productId: product.id,
            productName: product.name,
            quantity: 1,
            unitPriceCents: product.priceCents,
            totalCents: product.priceCents,
            grantsPremium: product.grantsPremium,
          },
        },
        payments: {
          create: {
            userId: user.id,
            provider: paymentProvider,
            method,
            amountCents: product.priceCents,
            currency: product.currency,
            status: PaymentStatus.PENDING,
          },
        },
      },
      include: { items: true, payments: true },
    });

    const payment = order.payments[0];
    let updatedPayment = payment;

    try {
      const checkout = await createGatewayCheckout({
        orderId: order.id,
        paymentId: payment.id,
        amountCents: payment.amountCents,
        currency: payment.currency,
        method,
        customerEmail: user.email,
        description: product.name,
        productName: product.name,
        billingCycle: product.billingCycle,
        userId: user.id,
      });

      updatedPayment = await prisma.payment.update({
        where: { id: payment.id },
        data: {
          provider: checkout.provider,
          providerPaymentId: checkout.providerPaymentId,
          providerPreferenceId: checkout.providerPreferenceId,
          checkoutUrl: checkout.checkoutUrl,
          pixQrCode: checkout.pixQrCode,
          pixCopyPaste: checkout.pixCopyPaste,
          expiresAt: checkout.expiresAt,
        },
      });
    } catch (error) {
      await prisma.$transaction([
        prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.FAILED,
            failureReason: error instanceof Error ? error.message : "gateway_error",
          },
        }),
        prisma.order.update({
          where: { id: order.id },
          data: {
            status: OrderStatus.CANCELLED,
            cancelledAt: new Date(),
          },
        }),
      ]);

      return res.status(503).json({
        message: "Gateway de pagamento ainda nao esta disponivel. Configure o provedor antes de aceitar compras reais.",
      });
    }

    await logAudit({
      actorUserId: user.id,
      targetUserId: user.id,
      action: "create_checkout",
      entityType: "payment",
      entityId: updatedPayment.id,
      details: {
        order_id: order.id,
        product_id: product.id,
        method: data.payment_method,
        provider: updatedPayment.provider,
      },
    });

    return res.status(201).json({
      order: serializeOrder({ ...order, payments: [updatedPayment] }),
      checkout: {
        payment_id: updatedPayment.id,
        status: updatedPayment.status.toLowerCase(),
        checkout_url: updatedPayment.checkoutUrl,
        pix_qr_code: updatedPayment.pixQrCode,
        pix_copy_paste: updatedPayment.pixCopyPaste,
      },
    });
  }),
);

router.post(
  "/checkout/confirm",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const data = confirmCheckoutSchema.parse(req.body);
    let orderId = data.order_id ?? null;
    let providerPaymentId: string | null = null;
    let providerPreferenceId: string | null = data.session_id ?? null;
    let metadataPaymentId: string | null = null;
    let nextStatus: PaymentStatus | null = null;
    let providerPayload: Prisma.InputJsonValue | undefined;

    if (data.session_id) {
      const session = await retrieveStripeCheckoutSession(data.session_id);
      providerPayload = session as unknown as Prisma.InputJsonValue;
      providerPreferenceId = session.id;
      providerPaymentId = typeof session.payment_intent === "string" ? session.payment_intent : null;
      metadataPaymentId = session.metadata?.payment_id ?? null;
      orderId = session.client_reference_id ?? session.metadata?.order_id ?? orderId;

      if (session.payment_status === "paid") {
        nextStatus = PaymentStatus.PAID;
      } else if (session.status === "expired") {
        nextStatus = PaymentStatus.CANCELLED;
      } else {
        nextStatus = PaymentStatus.PROCESSING;
      }
    }

    if (!orderId) {
      return res.status(400).json({ message: "Pedido nao identificado no checkout" });
    }

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId: req.auth!.userId,
      },
      include: { items: true, payments: true },
    });

    if (!order) {
      return res.status(404).json({ message: "Pedido nao encontrado" });
    }

    const payment = order.payments.find((item) =>
      Boolean(
        (metadataPaymentId && item.id === metadataPaymentId) ||
          (providerPaymentId && item.providerPaymentId === providerPaymentId) ||
          (providerPreferenceId && item.providerPreferenceId === providerPreferenceId),
      ),
    ) ?? order.payments[0];

    if (!payment) {
      return res.status(404).json({ message: "Pagamento nao encontrado" });
    }

    if (providerPayload && nextStatus === PaymentStatus.PAID) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          providerPaymentId: providerPaymentId ?? payment.providerPaymentId,
          providerPreferenceId: providerPreferenceId ?? payment.providerPreferenceId,
        },
      });
      await markPaymentAsPaid(payment.id, providerPayload);
    } else if (providerPayload && nextStatus) {
      const shouldCancelOrder = nextStatus === PaymentStatus.CANCELLED;
      await prisma.$transaction([
        prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: nextStatus,
            providerPaymentId: providerPaymentId ?? payment.providerPaymentId,
            providerPreferenceId: providerPreferenceId ?? payment.providerPreferenceId,
            rawProviderPayload: providerPayload,
          },
        }),
        ...(shouldCancelOrder
          ? [
              prisma.order.update({
                where: { id: order.id },
                data: {
                  status: OrderStatus.CANCELLED,
                  cancelledAt: new Date(),
                },
              }),
            ]
          : []),
      ]);
    }

    const updatedOrder = await prisma.order.findFirstOrThrow({
      where: { id: order.id, userId: req.auth!.userId },
      include: { items: true, payments: true },
    });

    return res.json({ order: serializeOrder(updatedOrder) });
  }),
);

router.post(
  "/webhooks/:provider",
  asyncHandler(async (req, res) => {
    const providerParam = getRouteParam(req.params.provider, "provider");
    const provider = providerMap[providerParam];

    if (!provider) {
      return res.status(404).json({ message: "Gateway nao suportado" });
    }

    const rawBody = (req as typeof req & { rawBody?: Buffer }).rawBody;

    if (provider === PaymentProvider.STRIPE) {
      const signature = req.header("stripe-signature");
      let event;

      try {
        event = await constructStripeWebhookEvent(rawBody, signature);
      } catch {
        return res.status(401).json({ message: "Assinatura Stripe invalida" });
      }

      const existing = await prisma.paymentWebhookEvent.findUnique({
        where: {
          provider_providerEventId: {
            provider,
            providerEventId: event.id,
          },
        },
      });

      if (existing?.processedAt) {
        return res.status(204).send();
      }

      const payload = event as unknown as Prisma.InputJsonValue;
      const webhookEvent =
        existing ??
        (await prisma.paymentWebhookEvent.create({
          data: {
            provider,
            providerEventId: event.id,
            eventType: event.type,
            payload,
          },
        }));

      let providerPaymentId: string | null = null;
      let providerPreferenceId: string | null = null;
      let metadataPaymentId: string | null = null;
      let nextStatus: PaymentStatus | null = null;

      if (
        event.type === "checkout.session.completed" ||
        event.type === "checkout.session.async_payment_succeeded" ||
        event.type === "checkout.session.async_payment_failed" ||
        event.type === "checkout.session.expired"
      ) {
        const session = event.data.object;
        providerPreferenceId = session.id;
        providerPaymentId = typeof session.payment_intent === "string" ? session.payment_intent : null;
        metadataPaymentId = session.metadata?.payment_id ?? null;

        if (event.type === "checkout.session.expired") {
          nextStatus = PaymentStatus.CANCELLED;
        } else if (event.type === "checkout.session.async_payment_failed") {
          nextStatus = PaymentStatus.FAILED;
        } else if (session.payment_status === "paid") {
          nextStatus = PaymentStatus.PAID;
        } else {
          nextStatus = PaymentStatus.PROCESSING;
        }
      } else if (event.type === "payment_intent.succeeded" || event.type === "payment_intent.payment_failed") {
        const paymentIntent = event.data.object;
        providerPaymentId = paymentIntent.id;
        metadataPaymentId = paymentIntent.metadata?.payment_id ?? null;
        nextStatus = event.type === "payment_intent.succeeded" ? PaymentStatus.PAID : PaymentStatus.FAILED;
      } else {
        await prisma.paymentWebhookEvent.update({
          where: { id: webhookEvent.id },
          data: { processedAt: new Date() },
        });

        return res.status(204).send();
      }

      const payment = await prisma.payment.findFirst({
        where: {
          provider,
          OR: [
            metadataPaymentId ? { id: metadataPaymentId } : undefined,
            providerPaymentId ? { providerPaymentId } : undefined,
            providerPreferenceId ? { providerPreferenceId } : undefined,
          ].filter(Boolean) as Array<{ id: string } | { providerPaymentId: string } | { providerPreferenceId: string }>,
        },
      });

      if (!payment) {
        return res.status(404).json({ message: "Pagamento Stripe nao encontrado" });
      }

      await prisma.paymentWebhookEvent.update({
        where: { id: webhookEvent.id },
        data: { paymentId: payment.id },
      });

      if (nextStatus === PaymentStatus.PAID) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            providerPaymentId: providerPaymentId ?? payment.providerPaymentId,
            providerPreferenceId: providerPreferenceId ?? payment.providerPreferenceId,
          },
        });
        await markPaymentAsPaid(payment.id, payload);
      } else {
        const shouldCancelOrder = nextStatus === PaymentStatus.CANCELLED;
        await prisma.$transaction([
          prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: nextStatus,
              providerPaymentId: providerPaymentId ?? payment.providerPaymentId,
              providerPreferenceId: providerPreferenceId ?? payment.providerPreferenceId,
              rawProviderPayload: payload,
              failureReason: nextStatus === PaymentStatus.FAILED ? event.type : undefined,
            },
          }),
          ...(shouldCancelOrder
            ? [
                prisma.order.update({
                  where: { id: payment.orderId },
                  data: {
                    status: OrderStatus.CANCELLED,
                    cancelledAt: new Date(),
                  },
                }),
              ]
            : []),
        ]);
      }

      await prisma.paymentWebhookEvent.update({
        where: { id: webhookEvent.id },
        data: { processedAt: new Date() },
      });

      return res.status(204).send();
    }

    const signature = req.header("x-payment-signature");

    if (!verifyWebhookSignature(rawBody, signature)) {
      return res.status(401).json({ message: "Assinatura invalida" });
    }

    const data = webhookSchema.parse(req.body);
    const payload = req.body as Prisma.InputJsonValue;

    if (data.event_id) {
      const existing = await prisma.paymentWebhookEvent.findUnique({
        where: {
          provider_providerEventId: {
            provider,
            providerEventId: data.event_id,
          },
        },
      });

      if (existing?.processedAt) {
        return res.status(204).send();
      }
    }

    const payment = await prisma.payment.findFirst({
      where: {
        provider,
        OR: [
          data.payment_id ? { id: data.payment_id } : undefined,
          data.provider_payment_id ? { providerPaymentId: data.provider_payment_id } : undefined,
        ].filter(Boolean) as Array<{ id: string } | { providerPaymentId: string }>,
      },
    });

    if (!payment) {
      return res.status(404).json({ message: "Pagamento nao encontrado" });
    }

    const webhookEvent = await prisma.paymentWebhookEvent.create({
      data: {
        provider,
        providerEventId: data.event_id,
        eventType: data.event_type,
        paymentId: payment.id,
        payload,
      },
    });

    const nextStatus = statusMap[data.status];

    if (nextStatus === PaymentStatus.PAID) {
      await markPaymentAsPaid(payment.id, payload);
    } else {
      const shouldStoreFailureReason =
        nextStatus === PaymentStatus.FAILED || nextStatus === PaymentStatus.CANCELLED;

      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: nextStatus,
          rawProviderPayload: payload,
          failureReason: shouldStoreFailureReason ? data.status : undefined,
        },
      });

      if (shouldStoreFailureReason) {
        await prisma.order.update({
          where: { id: payment.orderId },
          data: {
            status: nextStatus === PaymentStatus.CANCELLED ? OrderStatus.CANCELLED : OrderStatus.PENDING,
          },
        });
      }
    }

    await prisma.paymentWebhookEvent.update({
      where: { id: webhookEvent.id },
      data: { processedAt: new Date() },
    });

    return res.status(204).send();
  }),
);

export { router as paymentsRouter };
