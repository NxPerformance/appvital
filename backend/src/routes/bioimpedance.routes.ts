import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAdmin, requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async-handler.js";
import { logAudit } from "../services/audit.service.js";
import { getRouteParam } from "../utils/params.js";

const router = Router();

const numericField = z.number().nullable().optional();
const recordSchema = z.object({
  user_id: z.string().uuid(),
  date: z.string(),
  weight_kg: numericField,
  body_fat_percent: numericField,
  muscle_percent: numericField,
  water_percent: numericField,
  visceral_fat: numericField,
  subcutaneous_fat_percent: numericField,
  fat_free_mass_kg: numericField,
  protein_percent: numericField,
  bone_mass_kg: numericField,
  muscle_mass_kg: numericField,
  bmi: numericField,
  fat_weight_kg: numericField,
  waist_hip_ratio: numericField,
  bmr_kcal: z.number().int().nullable().optional(),
  ideal_weight_kg: numericField,
  weight_control_tip: numericField,
  fat_control_tip: numericField,
  muscle_control_tip: numericField,
  daily_calories: z.number().int().nullable().optional(),
  waist_cm: numericField,
  hip_cm: numericField,
  arm_cm: numericField,
  thigh_cm: numericField,
  shoulder_imbalance_cm: numericField,
  spine_curvature_cm: numericField,
  head_tilt_degrees: numericField,
  trunk_curvature_degrees: numericField,
  pelvis_tilt_degrees: numericField,
  head_forward_degrees: numericField,
  notes: z.string().nullable().optional(),
});

function decimalValue(value?: number | null) {
  return value === undefined || value === null ? null : value.toString();
}

router.get(
  "/mine",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const records = await prisma.bioimpedanceRecord.findMany({
      where: { userId: req.auth!.userId },
      orderBy: { date: "desc" },
    });

    return res.json({ records });
  }),
);

router.get(
  "/admin/user/:userId",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const userId = getRouteParam(req.params.userId, "userId");
    const records = await prisma.bioimpedanceRecord.findMany({
      where: { userId },
      orderBy: { date: "desc" },
    });

    return res.json({ records });
  }),
);

router.get(
  "/admin/record/:id",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const recordId = getRouteParam(req.params.id, "id");
    const record = await prisma.bioimpedanceRecord.findUnique({
      where: { id: recordId },
    });

    if (!record) {
      return res.status(404).json({ message: "Registro nao encontrado" });
    }

    return res.json({ record });
  }),
);

router.post(
  "/admin",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const data = recordSchema.parse(req.body);
    const record = await prisma.bioimpedanceRecord.create({
      data: {
        userId: data.user_id,
        date: new Date(data.date),
        weightKg: decimalValue(data.weight_kg),
        bodyFatPercent: decimalValue(data.body_fat_percent),
        musclePercent: decimalValue(data.muscle_percent),
        waterPercent: decimalValue(data.water_percent),
        visceralFat: decimalValue(data.visceral_fat),
        subcutaneousFatPercent: decimalValue(data.subcutaneous_fat_percent),
        fatFreeMassKg: decimalValue(data.fat_free_mass_kg),
        proteinPercent: decimalValue(data.protein_percent),
        boneMassKg: decimalValue(data.bone_mass_kg),
        muscleMassKg: decimalValue(data.muscle_mass_kg),
        bmi: decimalValue(data.bmi),
        fatWeightKg: decimalValue(data.fat_weight_kg),
        waistHipRatio: decimalValue(data.waist_hip_ratio),
        bmrKcal: data.bmr_kcal ?? null,
        idealWeightKg: decimalValue(data.ideal_weight_kg),
        weightControlTip: decimalValue(data.weight_control_tip),
        fatControlTip: decimalValue(data.fat_control_tip),
        muscleControlTip: decimalValue(data.muscle_control_tip),
        dailyCalories: data.daily_calories ?? null,
        waistCm: decimalValue(data.waist_cm),
        hipCm: decimalValue(data.hip_cm),
        armCm: decimalValue(data.arm_cm),
        thighCm: decimalValue(data.thigh_cm),
        shoulderImbalanceCm: decimalValue(data.shoulder_imbalance_cm),
        spineCurvatureCm: decimalValue(data.spine_curvature_cm),
        headTiltDegrees: decimalValue(data.head_tilt_degrees),
        trunkCurvatureDegrees: decimalValue(data.trunk_curvature_degrees),
        pelvisTiltDegrees: decimalValue(data.pelvis_tilt_degrees),
        headForwardDegrees: decimalValue(data.head_forward_degrees),
        notes: data.notes ?? null,
      },
    });

    await logAudit({
      actorUserId: req.auth!.userId,
      targetUserId: data.user_id,
      action: "create_bioimpedance_record",
      entityType: "bioimpedance_record",
      entityId: record.id,
    });

    return res.status(201).json({ record });
  }),
);

router.patch(
  "/admin/:id",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const recordId = getRouteParam(req.params.id, "id");
    const data = recordSchema.partial().parse(req.body);
    const record = await prisma.bioimpedanceRecord.update({
      where: { id: recordId },
      data: {
        ...(data.user_id ? { userId: data.user_id } : {}),
        ...(data.date ? { date: new Date(data.date) } : {}),
        ...(data.weight_kg !== undefined ? { weightKg: decimalValue(data.weight_kg) } : {}),
        ...(data.body_fat_percent !== undefined ? { bodyFatPercent: decimalValue(data.body_fat_percent) } : {}),
        ...(data.muscle_percent !== undefined ? { musclePercent: decimalValue(data.muscle_percent) } : {}),
        ...(data.water_percent !== undefined ? { waterPercent: decimalValue(data.water_percent) } : {}),
        ...(data.visceral_fat !== undefined ? { visceralFat: decimalValue(data.visceral_fat) } : {}),
        ...(data.subcutaneous_fat_percent !== undefined ? { subcutaneousFatPercent: decimalValue(data.subcutaneous_fat_percent) } : {}),
        ...(data.fat_free_mass_kg !== undefined ? { fatFreeMassKg: decimalValue(data.fat_free_mass_kg) } : {}),
        ...(data.protein_percent !== undefined ? { proteinPercent: decimalValue(data.protein_percent) } : {}),
        ...(data.bone_mass_kg !== undefined ? { boneMassKg: decimalValue(data.bone_mass_kg) } : {}),
        ...(data.muscle_mass_kg !== undefined ? { muscleMassKg: decimalValue(data.muscle_mass_kg) } : {}),
        ...(data.bmi !== undefined ? { bmi: decimalValue(data.bmi) } : {}),
        ...(data.fat_weight_kg !== undefined ? { fatWeightKg: decimalValue(data.fat_weight_kg) } : {}),
        ...(data.waist_hip_ratio !== undefined ? { waistHipRatio: decimalValue(data.waist_hip_ratio) } : {}),
        ...(data.bmr_kcal !== undefined ? { bmrKcal: data.bmr_kcal } : {}),
        ...(data.ideal_weight_kg !== undefined ? { idealWeightKg: decimalValue(data.ideal_weight_kg) } : {}),
        ...(data.weight_control_tip !== undefined ? { weightControlTip: decimalValue(data.weight_control_tip) } : {}),
        ...(data.fat_control_tip !== undefined ? { fatControlTip: decimalValue(data.fat_control_tip) } : {}),
        ...(data.muscle_control_tip !== undefined ? { muscleControlTip: decimalValue(data.muscle_control_tip) } : {}),
        ...(data.daily_calories !== undefined ? { dailyCalories: data.daily_calories } : {}),
        ...(data.waist_cm !== undefined ? { waistCm: decimalValue(data.waist_cm) } : {}),
        ...(data.hip_cm !== undefined ? { hipCm: decimalValue(data.hip_cm) } : {}),
        ...(data.arm_cm !== undefined ? { armCm: decimalValue(data.arm_cm) } : {}),
        ...(data.thigh_cm !== undefined ? { thighCm: decimalValue(data.thigh_cm) } : {}),
        ...(data.shoulder_imbalance_cm !== undefined ? { shoulderImbalanceCm: decimalValue(data.shoulder_imbalance_cm) } : {}),
        ...(data.spine_curvature_cm !== undefined ? { spineCurvatureCm: decimalValue(data.spine_curvature_cm) } : {}),
        ...(data.head_tilt_degrees !== undefined ? { headTiltDegrees: decimalValue(data.head_tilt_degrees) } : {}),
        ...(data.trunk_curvature_degrees !== undefined ? { trunkCurvatureDegrees: decimalValue(data.trunk_curvature_degrees) } : {}),
        ...(data.pelvis_tilt_degrees !== undefined ? { pelvisTiltDegrees: decimalValue(data.pelvis_tilt_degrees) } : {}),
        ...(data.head_forward_degrees !== undefined ? { headForwardDegrees: decimalValue(data.head_forward_degrees) } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
      },
    });

    await logAudit({
      actorUserId: req.auth!.userId,
      targetUserId: record.userId,
      action: "update_bioimpedance_record",
      entityType: "bioimpedance_record",
      entityId: record.id,
    });

    return res.json({ record });
  }),
);

router.delete(
  "/admin/:id",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const recordId = getRouteParam(req.params.id, "id");
    const record = await prisma.bioimpedanceRecord.delete({
      where: { id: recordId },
    });

    await logAudit({
      actorUserId: req.auth!.userId,
      targetUserId: record.userId,
      action: "delete_bioimpedance_record",
      entityType: "bioimpedance_record",
      entityId: record.id,
    });

    return res.status(204).send();
  }),
);

export { router as bioimpedanceRouter };
