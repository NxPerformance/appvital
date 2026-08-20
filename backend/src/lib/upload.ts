import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import multer from "multer";
import { env } from "../config/env.js";

export function ensureUploadSubdir(subdir = ""): string {
  const dir = path.resolve(env.UPLOAD_DIR, subdir);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function extFromMime(mimetype: string): string {
  switch (mimetype) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/gif":
      return ".gif";
    default:
      return "";
  }
}

const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const TRAINER_DOC_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function imageFileFilter(allowed: Set<string>, errorMessage: string) {
  return (_req: unknown, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (!allowed.has(file.mimetype)) {
      cb(new Error(errorMessage));
      return;
    }
    cb(null, true);
  };
}

export const avatarUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, ensureUploadSubdir()),
    filename: (req, file, cb) => {
      const userId = (req as unknown as { auth?: { userId: string } }).auth?.userId ?? "unknown";
      cb(null, `${userId}-avatar${extFromMime(file.mimetype)}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFileFilter(IMAGE_MIME_TYPES, "Tipo de arquivo nao permitido"),
});

export const bodyProgressUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, ensureUploadSubdir("body-progress")),
    filename: (req, file, cb) => {
      const userId = (req as unknown as { auth?: { userId: string } }).auth?.userId ?? "unknown";
      cb(null, `${userId}-${Date.now()}${extFromMime(file.mimetype)}`);
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: imageFileFilter(IMAGE_MIME_TYPES, "Tipo de arquivo nao permitido"),
});

export const trainerApplicationUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, ensureUploadSubdir("trainer-applications")),
    filename: (_req, file, cb) => {
      cb(null, `${crypto.randomUUID()}${extFromMime(file.mimetype)}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFileFilter(TRAINER_DOC_MIME_TYPES, "Envie imagens JPG, PNG ou WebP para a comprovacao do personal"),
});

export function deleteUploadedFileSafe(relativeOrAbsolutePath: string | null | undefined) {
  if (!relativeOrAbsolutePath) return;
  const filePath = relativeOrAbsolutePath.startsWith("/uploads/")
    ? path.resolve(env.UPLOAD_DIR, relativeOrAbsolutePath.replace("/uploads/", ""))
    : relativeOrAbsolutePath;
  fs.unlink(filePath, () => undefined);
}
