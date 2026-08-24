import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../middleware/error-handler.js";
import { getRouteParam } from "../utils/params.js";
import { logAudit } from "../services/audit.service.js";
import {
  APPOINTMENT_STATUS_TO_DB,
  APPOINTMENT_TYPE_TO_DB,
  serializeAppointment,
} from "../utils/serializers.js";

export const appointmentsRouter = Router();

appointmentsRouter.use(requireAuth);

appointmentsRouter.get(
  "/mine",
  asyncHandler(async (req, res) => {
    const appointments = await prisma.appointment.findMany({
      where: { userId: req.auth!.userId },
      orderBy: { createdAt: "desc" },
    });
    res.json({ appointments: appointments.map((appointment) => serializeAppointment(appointment)) });
  }),
);

const createSchema = z.object({
  type: z.enum(["consulta_online", "consulta_presencial", "bioimpedancia"]),
});

appointmentsRouter.post(
  "/mine",
  asyncHandler(async (req, res) => {
    const { type } = createSchema.parse(req.body);

    const appointment = await prisma.appointment.create({
      data: {
        userId: req.auth!.userId,
        type: APPOINTMENT_TYPE_TO_DB[type],
        status: "PENDING",
      },
    });

    res.status(201).json({ appointment: serializeAppointment(appointment) });
  }),
);

appointmentsRouter.delete(
  "/mine/:id",
  asyncHandler(async (req, res) => {
    const id = getRouteParam(req.params.id, "id");

    const appointment = await prisma.appointment.findUnique({ where: { id } });
    if (!appointment || appointment.userId !== req.auth!.userId) {
      throw new HttpError(404, "Agendamento nao encontrado");
    }
    if (appointment.status !== "PENDING") {
      throw new HttpError(400, "Apenas agendamentos pendentes podem ser cancelados");
    }

    await prisma.appointment.delete({ where: { id } });
    res.status(204).send();
  }),
);

appointmentsRouter.get(
  "/admin",
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const appointments = await prisma.appointment.findMany({
      orderBy: { createdAt: "desc" },
      include: { user: { include: { profile: true } } },
    });

    res.json({
      appointments: appointments.map((appointment) =>
        serializeAppointment(appointment, appointment.user.profile ? { fullName: appointment.user.profile.fullName, phone: appointment.user.profile.phone, user: { email: appointment.user.email } } : null),
      ),
    });
  }),
);

const updateSchema = z.object({
  scheduled_date: z.string().nullable().optional(),
  scheduled_time: z.string().nullable().optional(),
  status: z.enum(["pending", "confirmed", "completed", "cancelled"]).optional(),
  admin_notes: z.string().nullable().optional(),
});

appointmentsRouter.patch(
  "/admin/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = getRouteParam(req.params.id, "id");
    const data = updateSchema.parse(req.body);

    const existing = await prisma.appointment.findUnique({ where: { id } });
    if (!existing) {
      throw new HttpError(404, "Agendamento nao encontrado");
    }

    const appointment = await prisma.appointment.update({
      where: { id },
      data: {
        scheduledDate: data.scheduled_date === undefined ? undefined : data.scheduled_date === null ? null : new Date(`${data.scheduled_date}T12:00:00.000Z`),
        scheduledTime: data.scheduled_time,
        status: data.status ? APPOINTMENT_STATUS_TO_DB[data.status] : undefined,
        adminNotes: data.admin_notes,
      },
    });

    await logAudit({
      actorUserId: req.auth!.userId,
      targetUserId: appointment.userId,
      action: "update_appointment",
      entityType: "Appointment",
      entityId: appointment.id,
      details: data,
    });

    res.json({ appointment: serializeAppointment(appointment) });
  }),
);
