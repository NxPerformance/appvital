import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../middleware/error-handler.js";
import { getRouteParam } from "../utils/params.js";
import { assertOwner } from "../utils/ownership.js";

export const injectablesRouter = Router();

injectablesRouter.use(requireAuth);

function serializeInjectable(injectable: {
  id: string;
  userId: string;
  medication: string;
  dose: string;
  date: Date;
  time: string;
  location: string;
  notes: string | null;
  createdAt: Date;
}) {
  return {
    id: injectable.id,
    user_id: injectable.userId,
    medication: injectable.medication,
    dose: injectable.dose,
    date: injectable.date,
    time: injectable.time,
    location: injectable.location,
    notes: injectable.notes,
    created_at: injectable.createdAt,
  };
}

injectablesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const injectables = await prisma.injectable.findMany({
      where: { userId: req.auth!.userId },
      orderBy: { date: "desc" },
    });
    res.json({ injectables: injectables.map(serializeInjectable) });
  }),
);

const createSchema = z.object({
  medication: z.string().min(1),
  dose: z.string().min(1),
  date: z.string().min(1),
  time: z.string().min(1),
  location: z.string().min(1),
  notes: z.string().nullable().optional(),
});

injectablesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = createSchema.parse(req.body);

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

    res.status(201).json({ injectable: serializeInjectable(injectable) });
  }),
);

const updateSchema = createSchema.partial();

injectablesRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = getRouteParam(req.params.id, "id");
    const data = updateSchema.parse(req.body);

    const existing = await prisma.injectable.findUnique({ where: { id } });
    if (!existing) {
      throw new HttpError(404, "Registro nao encontrado");
    }
    assertOwner(existing.userId, req.auth!.userId);

    const injectable = await prisma.injectable.update({
      where: { id },
      data: {
        medication: data.medication,
        dose: data.dose,
        date: data.date ? new Date(data.date) : undefined,
        time: data.time,
        location: data.location,
        notes: data.notes,
      },
    });

    res.json({ injectable: serializeInjectable(injectable) });
  }),
);

injectablesRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = getRouteParam(req.params.id, "id");

    const existing = await prisma.injectable.findUnique({ where: { id } });
    if (!existing) {
      throw new HttpError(404, "Registro nao encontrado");
    }
    assertOwner(existing.userId, req.auth!.userId);

    await prisma.injectable.delete({ where: { id } });
    res.status(204).send();
  }),
);
