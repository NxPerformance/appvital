import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../middleware/error-handler.js";
import { getRouteParam } from "../utils/params.js";
import { logAudit } from "../services/audit.service.js";
import { bioimpedanceReportUpload, deleteUploadedFileSafe } from "../lib/upload.js";
import { fetchAnovatorExam, fetchAnovatorPhoto } from "../services/anovator.service.js";

export const bioimpedanceRouter = Router();

bioimpedanceRouter.use(requireAuth);

const numericFields = {
  weight_kg: "weightKg",
  body_fat_percent: "bodyFatPercent",
  body_fat_standard_low: "bodyFatStandardLow",
  body_fat_standard_high: "bodyFatStandardHigh",
  muscle_percent: "musclePercent",
  muscle_standard_low: "muscleStandardLow",
  muscle_standard_high: "muscleStandardHigh",
  water_percent: "waterPercent",
  visceral_fat: "visceralFat",
  subcutaneous_fat_percent: "subcutaneousFatPercent",
  fat_free_mass_kg: "fatFreeMassKg",
  protein_percent: "proteinPercent",
  bone_mass_kg: "boneMassKg",
  muscle_mass_kg: "muscleMassKg",
  bmi: "bmi",
  fat_weight_kg: "fatWeightKg",
  waist_hip_ratio: "waistHipRatio",
  ideal_weight_kg: "idealWeightKg",
  weight_control_tip: "weightControlTip",
  fat_control_tip: "fatControlTip",
  muscle_control_tip: "muscleControlTip",
  waist_cm: "waistCm",
  hip_cm: "hipCm",
  arm_cm: "armCm",
  thigh_cm: "thighCm",
  shoulder_imbalance_cm: "shoulderImbalanceCm",
  spine_curvature_cm: "spineCurvatureCm",
  head_tilt_degrees: "headTiltDegrees",
  trunk_curvature_degrees: "trunkCurvatureDegrees",
  pelvis_tilt_degrees: "pelvisTiltDegrees",
  head_forward_degrees: "headForwardDegrees",
  // Medidas corporais estendidas (cm)
  head_length_cm: "headLengthCm",
  upper_body_length_cm: "upperBodyLengthCm",
  lower_body_length_cm: "lowerBodyLengthCm",
  calf_length_cm: "calfLengthCm",
  thigh_length_cm: "thighLengthCm",
  arm_span_cm: "armSpanCm",
  shoulder_width_cm: "shoulderWidthCm",
  shoulder_ear_distance_cm: "shoulderEarDistanceCm",
  foot_length_cm: "footLengthCm",
  // Análise segmentada - músculo/gordura por região (kg)
  muscle_left_arm_kg: "muscleLeftArmKg",
  muscle_right_arm_kg: "muscleRightArmKg",
  fat_left_arm_kg: "fatLeftArmKg",
  fat_right_arm_kg: "fatRightArmKg",
  muscle_trunk_kg: "muscleTrunkKg",
  fat_trunk_kg: "fatTrunkKg",
  muscle_left_leg_kg: "muscleLeftLegKg",
  muscle_right_leg_kg: "muscleRightLegKg",
  fat_left_leg_kg: "fatLeftLegKg",
  fat_right_leg_kg: "fatRightLegKg",
} as const;

const integerFields = {
  bmr_kcal: "bmrKcal",
  daily_calories: "dailyCalories",
  aerobic_calories_kcal: "aerobicCaloriesKcal",
  endurance_calories_kcal: "enduranceCaloriesKcal",
  anaerobic_calories_kcal: "anaerobicCaloriesKcal",
  // Classificação de risco postural (nível 1-5, importado automaticamente da Anovator)
  shoulder_risk_level: "shoulderRiskLevel",
  humpback_risk_level: "humpbackRiskLevel",
  pelvis_risk_level: "pelvisRiskLevel",
  spine_risk_level: "spineRiskLevel",
  head_risk_level: "headRiskLevel",
  knee_risk_level: "kneeRiskLevel",
  front_head_risk_level: "frontHeadRiskLevel",
  body_shape_risk_level: "bodyShapeRiskLevel",
  posture_risk_level: "postureRiskLevel",
  // Classificação corporal (importado automaticamente da Anovator)
  body_shape: "bodyShape",
  score: "score",
  body_age: "bodyAge",
} as const;

const stringFields = {
  leg_risk_type: "legRiskType",
  // Key de arquivo da foto na Anovator (não é URL - ver GET /photo/:id/:side)
  body_image_key: "bodyImageKey",
  side_image_key: "sideImageKey",
} as const;

const numericShape = Object.fromEntries(
  Object.keys(numericFields).map((key) => [key, z.coerce.number().nullable().optional()]),
);
const integerShape = Object.fromEntries(
  Object.keys(integerFields).map((key) => [key, z.coerce.number().int().nullable().optional()]),
);
const stringShape = Object.fromEntries(
  Object.keys(stringFields).map((key) => [key, z.string().nullable().optional()]),
);

const baseSchema = z.object({
  date: z.string().min(1),
  notes: z.string().nullable().optional(),
  anovator_exam_id: z.string().nullable().optional(),
  ...numericShape,
  ...integerShape,
  ...stringShape,
});

const createSchema = baseSchema.extend({ user_id: z.string().uuid() });
const updateSchema = baseSchema.partial();

const anovatorLookupSchema = z.object({
  exam_id: z.string().min(1),
});

function toPrismaData(data: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [snakeKey, camelKey] of Object.entries(numericFields)) {
    if (snakeKey in data) out[camelKey] = data[snakeKey];
  }
  for (const [snakeKey, camelKey] of Object.entries(integerFields)) {
    if (snakeKey in data) out[camelKey] = data[snakeKey];
  }
  for (const [snakeKey, camelKey] of Object.entries(stringFields)) {
    if (snakeKey in data) out[camelKey] = data[snakeKey];
  }
  if ("notes" in data) out.notes = data.notes;
  if ("anovator_exam_id" in data) out.anovatorExamId = data.anovator_exam_id;
  return out;
}

bioimpedanceRouter.get(
  "/mine",
  asyncHandler(async (req, res) => {
    const records = await prisma.bioimpedanceRecord.findMany({
      where: { userId: req.auth!.userId },
      orderBy: { date: "desc" },
    });
    res.json({ records });
  }),
);

// Proxy pra foto guardada na Anovator - nunca expomos a apiKey no frontend,
// nem dependemos de anovator.com aceitar hotlink direto de <img src>. Acesso
// liberado pro dono do exame (paciente vendo o próprio histórico) ou admin.
bioimpedanceRouter.get(
  "/photo/:id/:side",
  asyncHandler(async (req, res) => {
    const id = getRouteParam(req.params.id, "id");
    const side = getRouteParam(req.params.side, "side");
    if (side !== "front" && side !== "side") {
      throw new HttpError(400, "Parametro 'side' invalido - use 'front' ou 'side'");
    }

    const record = await prisma.bioimpedanceRecord.findUnique({ where: { id } });
    if (!record) {
      throw new HttpError(404, "Registro nao encontrado");
    }

    const isOwner = record.userId === req.auth!.userId;
    const isAdmin = req.auth!.roles.includes("ADMIN");
    if (!isOwner && !isAdmin) {
      throw new HttpError(403, "Acesso negado");
    }

    const key = side === "front" ? record.bodyImageKey : record.sideImageKey;
    if (!key) {
      throw new HttpError(404, "Foto nao disponivel para este exame");
    }

    const { buffer, contentType } = await fetchAnovatorPhoto(key);
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "private, max-age=86400");
    res.send(buffer);
  }),
);

bioimpedanceRouter.get(
  "/admin/user/:userId",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const userId = getRouteParam(req.params.userId, "userId");
    const records = await prisma.bioimpedanceRecord.findMany({
      where: { userId },
      orderBy: { date: "desc" },
    });
    res.json({ records });
  }),
);

bioimpedanceRouter.get(
  "/admin/record/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = getRouteParam(req.params.id, "id");
    const record = await prisma.bioimpedanceRecord.findUnique({ where: { id } });
    if (!record) {
      throw new HttpError(404, "Registro nao encontrado");
    }
    res.json({ record });
  }),
);

bioimpedanceRouter.post(
  "/admin/anovator-lookup",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { exam_id } = anovatorLookupSchema.parse(req.body);
    const { data, unavailableFields } = await fetchAnovatorExam(exam_id);
    res.json({ data, unavailable_fields: unavailableFields });
  }),
);

bioimpedanceRouter.post(
  "/admin",
  requireAdmin,
  bioimpedanceReportUpload.single("report"),
  asyncHandler(async (req, res) => {
    try {
      const data = createSchema.parse(req.body);

      const record = await prisma.bioimpedanceRecord.create({
        data: {
          userId: data.user_id,
          date: new Date(data.date),
          ...toPrismaData(data),
          sourcePdfUrl: req.file ? `/uploads/bioimpedance-reports/${req.file.filename}` : undefined,
        },
      });

      await logAudit({
        actorUserId: req.auth!.userId,
        targetUserId: data.user_id,
        action: "create_bioimpedance_record",
        entityType: "BioimpedanceRecord",
        entityId: record.id,
        details: data,
      });

      res.status(201).json({ record });
    } catch (err) {
      if (req.file) deleteUploadedFileSafe(req.file.path);
      throw err;
    }
  }),
);

bioimpedanceRouter.patch(
  "/admin/:id",
  requireAdmin,
  bioimpedanceReportUpload.single("report"),
  asyncHandler(async (req, res) => {
    const id = getRouteParam(req.params.id, "id");

    try {
      const data = updateSchema.parse(req.body);

      const existing = await prisma.bioimpedanceRecord.findUnique({ where: { id } });
      if (!existing) {
        throw new HttpError(404, "Registro nao encontrado");
      }

      const record = await prisma.bioimpedanceRecord.update({
        where: { id },
        data: {
          date: data.date ? new Date(data.date) : undefined,
          ...toPrismaData(data),
          sourcePdfUrl: req.file ? `/uploads/bioimpedance-reports/${req.file.filename}` : undefined,
        },
      });

      if (req.file && existing.sourcePdfUrl) {
        deleteUploadedFileSafe(existing.sourcePdfUrl);
      }

      await logAudit({
        actorUserId: req.auth!.userId,
        targetUserId: record.userId,
        action: "update_bioimpedance_record",
        entityType: "BioimpedanceRecord",
        entityId: record.id,
        details: data,
      });

      res.json({ record });
    } catch (err) {
      if (req.file) deleteUploadedFileSafe(req.file.path);
      throw err;
    }
  }),
);

bioimpedanceRouter.delete(
  "/admin/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = getRouteParam(req.params.id, "id");

    const existing = await prisma.bioimpedanceRecord.findUnique({ where: { id } });
    if (!existing) {
      throw new HttpError(404, "Registro nao encontrado");
    }

    await prisma.bioimpedanceRecord.delete({ where: { id } });

    await logAudit({
      actorUserId: req.auth!.userId,
      targetUserId: existing.userId,
      action: "delete_bioimpedance_record",
      entityType: "BioimpedanceRecord",
      entityId: id,
      details: {},
    });

    res.status(204).send();
  }),
);
