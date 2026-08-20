import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async-handler.js";

export const paymentsRouter = Router();

paymentsRouter.use(requireAuth);

const BILLING_CYCLE_TO_CLIENT: Record<string, string> = {
  ONE_TIME: "one_time",
  MONTHLY: "monthly",
};

paymentsRouter.get(
  "/products",
  asyncHandler(async (_req, res) => {
    const products = await prisma.product.findMany({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
    });

    res.json({
      products: products.map((product) => ({
        id: product.id,
        name: product.name,
        description: product.description,
        price_cents: product.priceCents,
        currency: product.currency,
        billing_cycle: BILLING_CYCLE_TO_CLIENT[product.billingCycle] ?? product.billingCycle.toLowerCase(),
        grants_premium: product.grantsPremium,
      })),
    });
  }),
);

paymentsRouter.post(
  "/checkout",
  asyncHandler(async (_req, res) => {
    res.status(503).json({ message: "Pagamentos ainda não configurados nesta versão. Em breve." });
  }),
);
