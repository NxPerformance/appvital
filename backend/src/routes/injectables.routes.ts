import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async-handler.js";
import { getRouteParam } from "../utils/params.js";

const router = Router();

const injectableSchema = z.object({
  medication: z.string().min(1),
  dose: z.string().min(1),
  date: z.string().min(1),
  time: z.string().min(1),
  location: z.string().min(1),
  notes: z.string().nullable().optional(),
});

router.get(
  "/",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const injectables = await prisma.injectable.findMany({
      where: { userId: req.auth!.userId },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });

    return res.json({ injectables });
  }),
);

router.post(
  "/",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const data = injectableSchema.parse(req.body);
    const injectable = await prisma.injectable.create({
      data: {
        userId: req.auth!.userId,
        medication: data.medication,
        dose: data.dose,
        date: new Date(data.date),
        time: data.time,
        location: data.location,
        notes: data.notes ?? null,
      },
    });

    return res.status(201).json({ injectable });
  }),
);

router.patch(
  "/:id",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const injectableId = getRouteParam(req.params.id, "id");
    const data = injectableSchema.parse(req.body);
    const existing = await prisma.injectable.findUnique({
      where: { id: injectableId },
    });

    if (!existing) {
      return res.status(404).json({ message: "Aplicacao nao encontrada" });
    }

    if (existing.userId !== req.auth!.userId) {
      return res.status(403).json({ message: 'Sem permissao para editar esta aplicacao' });
    }

    const injectable = await prisma.injectable.update({
      where: { id: injectableId },
      data: {
        medication: data.medication,
        dose: data.dose,
        date: new Date(data.date),
        time: data.time,
        location: data.location,
        notes: data.notes ?? null,
      },
    });

    return res.json({ injectable });
  }),
);

router.delete(
  "/:id",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const injectableId = getRouteParam(req.params.id, "id");
    const injectable = await prisma.injectable.findUnique({
      where: { id: injectableId },
    });

    if (!injectable) {
      return res.status(404).json({ message: 'Aplicacao nao encontrada' });
    }

    if (injectable.userId !== req.auth!.userId) {
      return res.status(403).json({ message: 'Sem permissao para excluir esta aplicacao' });
    }

    await prisma.injectable.deleteMany({
      where: {
        id: injectableId,
        userId: req.auth!.userId,
      },
    });

    return res.status(204).send();
  }),
);

export { router as injectablesRouter };
