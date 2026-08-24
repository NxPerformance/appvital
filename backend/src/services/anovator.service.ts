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
// (peso muscular, peso da gordura e massa livre de gordura NAO entram aqui:
// sao calculados a partir do peso e dos percentuais que a API ja devolve.)
const UNAVAILABLE_FIELDS = [
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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);

  let response: Response;
  try {
    response = await fetch(url, { signal: controller.signal });
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === "AbortError";
    console.error("[anovator] falha ao conectar:", error);
    throw new HttpError(
      502,
      isTimeout
        ? "Tempo esgotado ao conectar com a Anovator. Verifique a conexao do servidor ou tente novamente."
        : "Nao foi possivel conectar com a Anovator.",
    );
  } finally {
    clearTimeout(timeoutId);
  }

  let body: AnovatorApiResponse;
  try {
    body = (await response.json()) as AnovatorApiResponse;
  } catch (error) {
    console.error("[anovator] resposta invalida (status", response.status, "):", error);
    throw new HttpError(502, `Resposta invalida da Anovator (HTTP ${response.status})`);
  }

  if (!body.STATUS || !body.DATA) {
    console.error("[anovator] resposta com erro:", body);
    throw new HttpError(502, body.INFO || "Erro ao consultar a Anovator");
  }

  const d = body.DATA;

  const weight = typeof d.weight === "number" ? d.weight : null;
  const fatPercent = typeof d.fat === "number" ? d.fat : null;
  const musclePercent = typeof d.muscle === "number" ? d.muscle : null;

  const fatWeightKg = weight != null && fatPercent != null ? weight * (fatPercent / 100) : null;
  const muscleMassKg = weight != null && musclePercent != null ? weight * (musclePercent / 100) : null;
  const fatFreeMassKg = weight != null && fatWeightKg != null ? weight - fatWeightKg : null;

  const round = (value: number | null) => (value != null ? Number(value.toFixed(2)) : null);

  const data = {
    weight_kg: d.weight ?? null,
    body_fat_percent: d.fat ?? null,
    muscle_percent: d.muscle ?? null,
    water_percent: d.water ?? null,
    // Calculados a partir do peso e dos percentuais - a API nao devolve o valor absoluto.
    muscle_mass_kg: round(muscleMassKg),
    fat_weight_kg: round(fatWeightKg),
    fat_free_mass_kg: round(fatFreeMassKg),
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
