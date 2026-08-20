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
  muscle_percent: number | null;
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
  // Avaliação Postural
  shoulder_imbalance_cm: number | null;
  spine_curvature_cm: number | null;
  head_tilt_degrees: number | null;
  trunk_curvature_degrees: number | null;
  pelvis_tilt_degrees: number | null;
  head_forward_degrees: number | null;
  notes: string | null;
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
          muscle_percent: record.musclePercent ? Number(record.musclePercent) : null,
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
          shoulder_imbalance_cm: record.shoulderImbalanceCm ? Number(record.shoulderImbalanceCm) : null,
          spine_curvature_cm: record.spineCurvatureCm ? Number(record.spineCurvatureCm) : null,
          head_tilt_degrees: record.headTiltDegrees ? Number(record.headTiltDegrees) : null,
          trunk_curvature_degrees: record.trunkCurvatureDegrees ? Number(record.trunkCurvatureDegrees) : null,
          pelvis_tilt_degrees: record.pelvisTiltDegrees ? Number(record.pelvisTiltDegrees) : null,
          head_forward_degrees: record.headForwardDegrees ? Number(record.headForwardDegrees) : null,
          notes: record.notes,
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
