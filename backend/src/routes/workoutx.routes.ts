import crypto from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { env } from "../config/env.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async-handler.js";
import { getRouteParam } from "../utils/params.js";

const router = Router();
const WORKOUTX_BASE_URL = "https://api.workoutxapp.com/v1";
const exerciseCache = new Map<string, WorkoutXExercise | null>();
const mediaAuth = env.NODE_ENV === "development" ? [] : [requireAuth];

const exerciseSchema = z.object({
  id: z.string(),
  name: z.string(),
  bodyPart: z.string().optional(),
  target: z.string().optional(),
  equipment: z.string().optional(),
  category: z.string().optional(),
  difficulty: z.string().optional(),
  description: z.string().optional(),
  instructions: z.array(z.string()).optional(),
  gifUrl: z.string().optional(),
});

type WorkoutXExercise = z.infer<typeof exerciseSchema> & {
  proxyGifUrl: string;
};

function signGifId(id: string) {
  return crypto
    .createHmac("sha256", env.JWT_SECRET)
    .update(id)
    .digest("base64url")
    .slice(0, 32);
}

function timingSafeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function getWorkoutXHeaders() {
  return {
    "X-WorkoutX-Key": env.WORKOUTX_API_KEY ?? "",
  };
}

function normalizeExercise(data: unknown): WorkoutXExercise | null {
  const responseData = data && typeof data === "object" && "data" in data
    ? (data as { data?: unknown }).data
    : data;
  const firstExercise = Array.isArray(responseData) ? responseData[0] : responseData;
  const parsed = exerciseSchema.safeParse(firstExercise);

  if (!parsed.success) return null;

  return {
    ...parsed.data,
    proxyGifUrl: `/api/workoutx/gifs/${encodeURIComponent(parsed.data.id)}?sig=${signGifId(parsed.data.id)}`,
  };
}

async function fetchExerciseByName(query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return null;
  if (exerciseCache.has(normalizedQuery)) return exerciseCache.get(normalizedQuery) ?? null;

  const response = await fetch(`${WORKOUTX_BASE_URL}/exercises/name/${encodeURIComponent(query)}`, {
    headers: getWorkoutXHeaders(),
  });

  if (!response.ok) {
    exerciseCache.set(normalizedQuery, null);
    return null;
  }

  const exercise = normalizeExercise(await response.json());
  exerciseCache.set(normalizedQuery, exercise);
  return exercise;
}

router.get(
  "/media",
  ...mediaAuth,
  asyncHandler(async (req, res) => {
    if (!env.WORKOUTX_API_KEY) {
      return res.json({ configured: false, exercises: {} });
    }

    const queryParam = typeof req.query.queries === "string" ? req.query.queries : "";
    const queries = Array.from(
      new Set(
        queryParam
          .split(",")
          .map((query) => query.trim())
          .filter(Boolean)
          .slice(0, 30),
      ),
    );

    const entries = await Promise.all(
      queries.map(async (query) => [query, await fetchExerciseByName(query)] as const),
    );

    return res.json({
      configured: true,
      exercises: Object.fromEntries(entries),
    });
  }),
);

router.get(
  "/gifs/:id",
  asyncHandler(async (req, res) => {
    if (!env.WORKOUTX_API_KEY) {
      return res.status(404).json({ message: "WorkoutX nao configurado" });
    }

    const id = getRouteParam(req.params.id, "id");
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      return res.status(400).json({ message: "ID invalido" });
    }

    const signature = typeof req.query.sig === "string" ? req.query.sig : "";
    if (!signature || !timingSafeEqual(signature, signGifId(id))) {
      return res.status(403).json({ message: "Assinatura invalida" });
    }

    const response = await fetch(`${WORKOUTX_BASE_URL}/gifs/${encodeURIComponent(id)}`, {
      headers: getWorkoutXHeaders(),
    });

    if (!response.ok) {
      return res.status(response.status).json({ message: "GIF nao encontrado" });
    }

    const contentType = response.headers.get("content-type") ?? "image/gif";
    const imageBuffer = Buffer.from(await response.arrayBuffer());

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.send(imageBuffer);
  }),
);

export { router as workoutxRouter };
