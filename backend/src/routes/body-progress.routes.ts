import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../middleware/error-handler.js";
import { getRouteParam } from "../utils/params.js";
import { serializeBodyProgressPhoto } from "../utils/serializers.js";
import { bodyProgressUpload, deleteUploadedFileSafe } from "../lib/upload.js";

export const bodyProgressRouter = Router();

bodyProgressRouter.use(requireAuth);

bodyProgressRouter.get(
  "/photos",
  asyncHandler(async (req, res) => {
    const photos = await prisma.bodyProgressPhoto.findMany({
      where: { userId: req.auth!.userId },
      orderBy: [{ takenAt: "desc" }, { createdAt: "desc" }],
    });
    res.json({ photos: photos.map(serializeBodyProgressPhoto) });
  }),
);

const createSchema = z.object({
  pose: z.enum(["FRONT", "SIDE", "BACK", "CUSTOM"]),
  label: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  taken_at: z.string().min(1),
});

bodyProgressRouter.post(
  "/photos",
  bodyProgressUpload.single("image"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new HttpError(400, "Nenhum arquivo enviado");
    }

    try {
      const data = createSchema.parse(req.body);

      const photo = await prisma.bodyProgressPhoto.create({
        data: {
          userId: req.auth!.userId,
          imageUrl: `/uploads/body-progress/${req.file.filename}`,
          pose: data.pose,
          label: data.label ?? null,
          notes: data.notes ?? null,
          takenAt: new Date(data.taken_at),
        },
      });

      res.status(201).json({ photo: serializeBodyProgressPhoto(photo) });
    } catch (err) {
      deleteUploadedFileSafe(req.file.path);
      throw err;
    }
  }),
);

bodyProgressRouter.delete(
  "/photos/:id",
  asyncHandler(async (req, res) => {
    const id = getRouteParam(req.params.id, "id");

    const existing = await prisma.bodyProgressPhoto.findUnique({ where: { id } });
    if (!existing) {
      throw new HttpError(404, "Foto nao encontrada");
    }
    if (existing.userId !== req.auth!.userId) {
      throw new HttpError(403, "Acesso negado");
    }

    await prisma.bodyProgressPhoto.delete({ where: { id } });
    deleteUploadedFileSafe(existing.imageUrl);

    res.status(204).send();
  }),
);
