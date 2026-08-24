import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async-handler.js";

export const achievementsRouter = Router();

achievementsRouter.use(requireAuth);

achievementsRouter.get(
  "/catalog",
  asyncHandler(async (_req, res) => {
    const achievements = await prisma.achievement.findMany({ orderBy: { sortOrder: "asc" } });
    res.json({ achievements });
  }),
);

achievementsRouter.get(
  "/me",
  asyncHandler(async (req, res) => {
    const achievements = await prisma.userAchievement.findMany({
      where: { userId: req.auth!.userId },
      include: { achievement: true },
      orderBy: { unlockedAt: "asc" },
    });
    res.json({ achievements });
  }),
);
