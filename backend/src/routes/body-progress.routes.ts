import fs from "node:fs";
import path from "node:path";
import { BodyProgressPhotoPose } from "@prisma/client";
import multer from "multer";
import { Router } from "express";
import { z } from "zod";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async-handler.js";
import { getRouteParam } from "../utils/params.js";

const router = Router();
const uploadDir = path.resolve(env.UPLOAD_DIR, "body-progress");

fs.mkdirSync(uploadDir, { recursive: true });

const imageExtensions: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

const allowedImageTypes = new Set(Object.keys(imageExtensions));

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, uploadDir),
  filename: (req: AuthenticatedRequest, file, callback) => {
    const ext = (imageExtensions[file.mimetype] ?? path.extname(file.originalname)) || ".jpg";
    callback(null, `${req.auth!.userId}-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!allowedImageTypes.has(file.mimetype)) {
      callback(new Error("Tipo de arquivo nao permitido"));
      return;
    }

    callback(null, true);
  },
});

const createSchema = z.object({
  pose: z.nativeEnum(BodyProgressPhotoPose),
  label: z.string().trim().max(80).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
  taken_at: z.string().datetime(),
});

function serializePhoto(photo: {
  id: string;
  userId: string;
  imageUrl: string;
  pose: BodyProgressPhotoPose;
  label: string | null;
  notes: string | null;
  takenAt: Date;
  createdAt: Date;
}) {
  return {
    id: photo.id,
    user_id: photo.userId,
    image_url: photo.imageUrl,
    pose: photo.pose.toLowerCase(),
    label: photo.label,
    notes: photo.notes,
    taken_at: photo.takenAt,
    created_at: photo.createdAt,
  };
}

function removeUploadedFile(file: Express.Multer.File | undefined) {
  if (!file) return;

  if (fs.existsSync(file.path)) {
    fs.unlinkSync(file.path);
  }
}

router.get(
  "/photos",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const photos = await prisma.bodyProgressPhoto.findMany({
      where: { userId: req.auth!.userId },
      orderBy: [{ takenAt: "desc" }, { createdAt: "desc" }],
    });

    return res.json({ photos: photos.map(serializePhoto) });
  }),
);

router.post(
  "/photos",
  requireAuth,
  upload.single("image"),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "Arquivo nao enviado" });
    }

    let data: z.infer<typeof createSchema>;
    try {
      data = createSchema.parse(req.body);
    } catch (error) {
      removeUploadedFile(req.file);
      throw error;
    }

    const photo = await prisma.bodyProgressPhoto
      .create({
        data: {
          userId: req.auth!.userId,
          imageUrl: `/uploads/body-progress/${req.file.filename}`,
          pose: data.pose,
          label: data.label ?? null,
          notes: data.notes ?? null,
          takenAt: new Date(data.taken_at),
        },
      })
      .catch((error: unknown) => {
        removeUploadedFile(req.file);
        throw error;
      });

    return res.status(201).json({ photo: serializePhoto(photo) });
  }),
);

router.delete(
  "/photos/:id",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const photoId = getRouteParam(req.params.id, "id");
    const photo = await prisma.bodyProgressPhoto.findUnique({
      where: { id: photoId },
    });

    if (!photo) {
      return res.status(404).json({ message: "Foto nao encontrada" });
    }

    if (photo.userId !== req.auth!.userId) {
      return res.status(403).json({ message: "Sem permissao para remover esta foto" });
    }

    await prisma.bodyProgressPhoto.delete({
      where: { id: photoId },
    });

    const absolutePath = path.resolve(uploadDir, path.basename(photo.imageUrl));
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }

    return res.status(204).send();
  }),
);

export { router as bodyProgressRouter };
