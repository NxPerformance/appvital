import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from './useAuth';

export interface BioimpedanceRecord {
  id: string;
  user_id: string;
  date: string;
  created_at: string;
  // Composição Corporal
  weight_kg: number | null;
  body_fat_percent: number | null;
  body_fat_standard_low: number | null;
  body_fat_standard_high: number | null;
  muscle_percent: number | null;
  muscle_standard_low: number | null;
  muscle_standard_high: number | null;
  water_percent: number | null;
  visceral_fat: number | null;
  subcutaneous_fat_percent: number | null;
  fat_free_mass_kg: number | null;
  protein_percent: number | null;
  bone_mass_kg: number | null;
  muscle_mass_kg: number | null;
  // Análise de Obesidade
  bmi: number | null;
  fat_weight_kg: number | null;
  waist_hip_ratio: number | null;
  bmr_kcal: number | null;
  // Recomendações
  ideal_weight_kg: number | null;
  weight_control_tip: number | null;
  fat_control_tip: number | null;
  muscle_control_tip: number | null;
  daily_calories: number | null;
  // Medidas Corporais
  waist_cm: number | null;
  hip_cm: number | null;
  arm_cm: number | null;
  thigh_cm: number | null;
  // Medidas Corporais Estendidas
  head_length_cm: number | null;
  upper_body_length_cm: number | null;
  lower_body_length_cm: number | null;
  calf_length_cm: number | null;
  thigh_length_cm: number | null;
  arm_span_cm: number | null;
  shoulder_width_cm: number | null;
  shoulder_ear_distance_cm: number | null;
  foot_length_cm: number | null;
  // Análise Segmentada
  muscle_left_arm_kg: number | null;
  muscle_right_arm_kg: number | null;
  fat_left_arm_kg: number | null;
  fat_right_arm_kg: number | null;
  muscle_trunk_kg: number | null;
  fat_trunk_kg: number | null;
  muscle_left_leg_kg: number | null;
  muscle_right_leg_kg: number | null;
  fat_left_leg_kg: number | null;
  fat_right_leg_kg: number | null;
  // Metas de Exercício
  aerobic_calories_kcal: number | null;
  endurance_calories_kcal: number | null;
  anaerobic_calories_kcal: number | null;
  // Avaliação Postural
  shoulder_imbalance_cm: number | null;
  spine_curvature_cm: number | null;
  head_tilt_degrees: number | null;
  trunk_curvature_degrees: number | null;
  pelvis_tilt_degrees: number | null;
  head_forward_degrees: number | null;
  // Classificação de Risco Postural (importado automaticamente da Anovator)
  shoulder_risk_level: number | null;
  humpback_risk_level: number | null;
  leg_risk_type: string | null;
  pelvis_risk_level: number | null;
  spine_risk_level: number | null;
  head_risk_level: number | null;
  knee_risk_level: number | null;
  front_head_risk_level: number | null;
  body_shape_risk_level: number | null;
  posture_risk_level: number | null;
  notes: string | null;
  source_pdf_url: string | null;
}

export function useBioimpedance() {
  const { user } = useAuth();
  const [records, setRecords] = useState<BioimpedanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setRecords([]);
      setLoading(false);
      return;
    }

    const fetchRecords = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get<{ records: any[] }>('/bioimpedance/mine');
        setRecords(response.records.map((record) => ({
          id: record.id,
          user_id: record.userId,
          date: record.date,
          created_at: record.createdAt,
          weight_kg: record.weightKg ? Number(record.weightKg) : null,
          body_fat_percent: record.bodyFatPercent ? Number(record.bodyFatPercent) : null,
          body_fat_standard_low: record.bodyFatStandardLow ? Number(record.bodyFatStandardLow) : null,
          body_fat_standard_high: record.bodyFatStandardHigh ? Number(record.bodyFatStandardHigh) : null,
          muscle_percent: record.musclePercent ? Number(record.musclePercent) : null,
          muscle_standard_low: record.muscleStandardLow ? Number(record.muscleStandardLow) : null,
          muscle_standard_high: record.muscleStandardHigh ? Number(record.muscleStandardHigh) : null,
          water_percent: record.waterPercent ? Number(record.waterPercent) : null,
          visceral_fat: record.visceralFat ? Number(record.visceralFat) : null,
          subcutaneous_fat_percent: record.subcutaneousFatPercent ? Number(record.subcutaneousFatPercent) : null,
          fat_free_mass_kg: record.fatFreeMassKg ? Number(record.fatFreeMassKg) : null,
          protein_percent: record.proteinPercent ? Number(record.proteinPercent) : null,
          bone_mass_kg: record.boneMassKg ? Number(record.boneMassKg) : null,
          muscle_mass_kg: record.muscleMassKg ? Number(record.muscleMassKg) : null,
          bmi: record.bmi ? Number(record.bmi) : null,
          fat_weight_kg: record.fatWeightKg ? Number(record.fatWeightKg) : null,
          waist_hip_ratio: record.waistHipRatio ? Number(record.waistHipRatio) : null,
          bmr_kcal: record.bmrKcal,
          ideal_weight_kg: record.idealWeightKg ? Number(record.idealWeightKg) : null,
          weight_control_tip: record.weightControlTip ? Number(record.weightControlTip) : null,
          fat_control_tip: record.fatControlTip ? Number(record.fatControlTip) : null,
          muscle_control_tip: record.muscleControlTip ? Number(record.muscleControlTip) : null,
          daily_calories: record.dailyCalories,
          waist_cm: record.waistCm ? Number(record.waistCm) : null,
          hip_cm: record.hipCm ? Number(record.hipCm) : null,
          arm_cm: record.armCm ? Number(record.armCm) : null,
          thigh_cm: record.thighCm ? Number(record.thighCm) : null,
          head_length_cm: record.headLengthCm ? Number(record.headLengthCm) : null,
          upper_body_length_cm: record.upperBodyLengthCm ? Number(record.upperBodyLengthCm) : null,
          lower_body_length_cm: record.lowerBodyLengthCm ? Number(record.lowerBodyLengthCm) : null,
          calf_length_cm: record.calfLengthCm ? Number(record.calfLengthCm) : null,
          thigh_length_cm: record.thighLengthCm ? Number(record.thighLengthCm) : null,
          arm_span_cm: record.armSpanCm ? Number(record.armSpanCm) : null,
          shoulder_width_cm: record.shoulderWidthCm ? Number(record.shoulderWidthCm) : null,
          shoulder_ear_distance_cm: record.shoulderEarDistanceCm ? Number(record.shoulderEarDistanceCm) : null,
          foot_length_cm: record.footLengthCm ? Number(record.footLengthCm) : null,
          muscle_left_arm_kg: record.muscleLeftArmKg ? Number(record.muscleLeftArmKg) : null,
          muscle_right_arm_kg: record.muscleRightArmKg ? Number(record.muscleRightArmKg) : null,
          fat_left_arm_kg: record.fatLeftArmKg ? Number(record.fatLeftArmKg) : null,
          fat_right_arm_kg: record.fatRightArmKg ? Number(record.fatRightArmKg) : null,
          muscle_trunk_kg: record.muscleTrunkKg ? Number(record.muscleTrunkKg) : null,
          fat_trunk_kg: record.fatTrunkKg ? Number(record.fatTrunkKg) : null,
          muscle_left_leg_kg: record.muscleLeftLegKg ? Number(record.muscleLeftLegKg) : null,
          muscle_right_leg_kg: record.muscleRightLegKg ? Number(record.muscleRightLegKg) : null,
          fat_left_leg_kg: record.fatLeftLegKg ? Number(record.fatLeftLegKg) : null,
          fat_right_leg_kg: record.fatRightLegKg ? Number(record.fatRightLegKg) : null,
          aerobic_calories_kcal: record.aerobicCaloriesKcal,
          endurance_calories_kcal: record.enduranceCaloriesKcal,
          anaerobic_calories_kcal: record.anaerobicCaloriesKcal,
          shoulder_imbalance_cm: record.shoulderImbalanceCm ? Number(record.shoulderImbalanceCm) : null,
          spine_curvature_cm: record.spineCurvatureCm ? Number(record.spineCurvatureCm) : null,
          head_tilt_degrees: record.headTiltDegrees ? Number(record.headTiltDegrees) : null,
          trunk_curvature_degrees: record.trunkCurvatureDegrees ? Number(record.trunkCurvatureDegrees) : null,
          pelvis_tilt_degrees: record.pelvisTiltDegrees ? Number(record.pelvisTiltDegrees) : null,
          head_forward_degrees: record.headForwardDegrees ? Number(record.headForwardDegrees) : null,
          shoulder_risk_level: record.shoulderRiskLevel ?? null,
          humpback_risk_level: record.humpbackRiskLevel ?? null,
          leg_risk_type: record.legRiskType ?? null,
          pelvis_risk_level: record.pelvisRiskLevel ?? null,
          spine_risk_level: record.spineRiskLevel ?? null,
          head_risk_level: record.headRiskLevel ?? null,
          knee_risk_level: record.kneeRiskLevel ?? null,
          front_head_risk_level: record.frontHeadRiskLevel ?? null,
          body_shape_risk_level: record.bodyShapeRiskLevel ?? null,
          posture_risk_level: record.postureRiskLevel ?? null,
          notes: record.notes,
          source_pdf_url: record.sourcePdfUrl ?? null,
        })));
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : 'Erro ao carregar bioimpedância');
        setRecords([]);
      }

      setLoading(false);
    };

    fetchRecords();
  }, [user]);

  const latestRecord = records.length > 0 ? records[0] : null;
  const previousRecord = records.length > 1 ? records[1] : null;

  // Calculate difference between two values
  const getDifference = (current: number | null, previous: number | null): number | null => {
    if (current === null || previous === null) return null;
    return Number((current - previous).toFixed(2));
  };

  return {
    records,
    latestRecord,
    previousRecord,
    loading,
    error,
    getDifference,
    hasRecords: records.length > 0,
    hasComparison: records.length > 1,
  };
}
