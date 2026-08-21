import { env } from "../config/env.js";
import { HttpError } from "../middleware/error-handler.js";

interface AnovatorApiResponse {
  STATUS: boolean;
  CODE: number;
  INFO: string;
  DATA?: Record<string, unknown>;
}

// Campos que a API da Anovator nao cobre (medidas corporais e postura) -
// permanecem apenas de preenchimento manual ate existir outra fonte de dados.
const UNAVAILABLE_FIELDS = [
  "muscle_mass_kg",
  "fat_weight_kg",
  "waist_cm",
  "hip_cm",
  "arm_cm",
  "thigh_cm",
  "shoulder_imbalance_cm",
  "spine_curvature_cm",
  "head_tilt_degrees",
  "trunk_curvature_degrees",
  "pelvis_tilt_degrees",
  "head_forward_degrees",
];

export async function fetchAnovatorExam(examId: string) {
  if (!env.ANOVATOR_API_KEY || !env.ANOVATOR_GYM_ID) {
    throw new HttpError(
      501,
      "Integração com a Anovator ainda não configurada. Configure ANOVATOR_API_KEY e ANOVATOR_GYM_ID, ou preencha os dados manualmente.",
    );
  }

  const url = `${env.ANOVATOR_BASE_URL}/open/OpenAPI!getExamById.m?apiKey=${encodeURIComponent(
    env.ANOVATOR_API_KEY,
  )}&id=${encodeURIComponent(examId)}&gymId=${encodeURIComponent(env.ANOVATOR_GYM_ID)}`;

  const response = await fetch(url);
  const body = (await response.json()) as AnovatorApiResponse;

  if (!body.STATUS || !body.DATA) {
    throw new HttpError(502, body.INFO || "Erro ao consultar a Anovator");
  }

  const d = body.DATA;

  const data = {
    weight_kg: d.weight ?? null,
    body_fat_percent: d.fat ?? null,
    muscle_percent: d.muscle ?? null,
    water_percent: d.water ?? null,
    visceral_fat: d.inFat ?? null,
    subcutaneous_fat_percent: d.subFat ?? null,
    protein_percent: d.protein ?? null,
    bone_mass_kg: d.bone ?? null,
    bmi: d.bmi ?? null,
    bmr_kcal: d.bmr ?? null,
    ideal_weight_kg: d.perfectWeight ?? null,
    weight_control_tip: d.weightControl ?? null,
    fat_control_tip: d.fatControl ?? null,
    muscle_control_tip: d.muscleControl ?? null,
    daily_calories: d.caloriesInput ?? null,
    // wc -> relacao cintura-quadril e um mapeamento "melhor esforco" a partir
    // da documentacao; precisa ser confirmado quando houver dados reais.
    waist_hip_ratio: d.wc ?? null,
    date:
      typeof d.gmtCreate === "number" ? new Date(d.gmtCreate).toISOString().slice(0, 10) : null,
  };

  return { data, unavailableFields: UNAVAILABLE_FIELDS };
}
