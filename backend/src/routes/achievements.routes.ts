import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async-handler.js";

const router = Router();

router.get(
  "/catalog",
  requireAuth,
  asyncHandler(async (_req, res) => {
    const achievements = await prisma.achievement.findMany({
      orderBy: { sortOrder: "asc" },
    });

    return res.json({ achievements });
  }),
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const achievements = await prisma.userAchievement.findMany({
      where: { userId: req.auth!.userId },
      include: { achievement: true },
      orderBy: { unlockedAt: "asc" },
    });

    return res.json({ achievements });
  }),
);

export { router as achievementsRouter };
