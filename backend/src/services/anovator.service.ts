import { env } from "../config/env.js";
import { HttpError } from "../middleware/error-handler.js";

interface AnovatorApiResponse {
  STATUS: boolean;
  CODE: number;
  INFO: string;
  DATA?: Record<string, unknown>;
  standard?: Record<string, unknown>;
}

// Campos que a API da Anovator nao cobre - permanecem apenas de preenchimento
// manual ate existir outra fonte de dados. Sao todos de avaliacao postural:
// a API ja devolve uma classificacao de risco (nivel 1-5) pra essas categorias
// (ver shoulder_risk_level etc. abaixo, importados automaticamente), mas nao o
// valor exato em cm/graus mostrado no PDF (que e calculado pela Anovator a
// partir de coordenadas de imagem, sem formula documentada pra nos replicarmos).
// (peso muscular, peso da gordura, massa livre de gordura e as medidas
// corporais - cintura/quadril/braco/coxa - NAO entram aqui: vem prontas ou
// sao calculadas a partir do que a API ja devolve.)
const UNAVAILABLE_FIELDS = [
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
  const standard = body.standard;

  const readStandardBound = (key: string, bound: "fewer" | "more"): number | null => {
    const entry = standard?.[key];
    if (!entry || typeof entry !== "object") return null;
    const value = (entry as Record<string, unknown>)[bound];
    return typeof value === "number" ? value : null;
  };

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
    // Faixa saudavel personalizada (bloco "standard" da resposta, fora do DATA)
    // - mesmo range que a Anovator mostra como "Padrao: X% ~ Y%" no PDF.
    body_fat_standard_low: readStandardBound("fatStandard", "fewer"),
    body_fat_standard_high: readStandardBound("fatStandard", "more"),
    muscle_percent: d.muscle ?? null,
    muscle_standard_low: readStandardBound("muscleStandard", "fewer"),
    muscle_standard_high: readStandardBound("muscleStandard", "more"),
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
    // Bloco "Body dimension data" da API - so vem preenchido em aparelhos com
    // camera de escaneamento corporal (nem todo modelo devolve esses campos).
    waist_cm: d.waist ?? null,
    hip_cm: d.hips ?? null,
    arm_cm: d.armDim ?? null,
    // thighDim (nao thigh_dim) - confirmado na resposta crua da API, a doc usava
    // snake_case mas o campo real e camelCase, como o resto do payload.
    thigh_cm: d.thighDim ?? null,
    // Medidas corporais estendidas (cm) - mesmo bloco "Body dimension data" acima.
    head_length_cm: d.head ?? null,
    upper_body_length_cm: d.upperBody ?? null,
    lower_body_length_cm: d.lowerBody ?? null,
    calf_length_cm: d.shank ?? null,
    thigh_length_cm: d.thigh ?? null,
    arm_span_cm: d.armSpan ?? null,
    // shoulderWidth/occipitalSpace (nao shoulder_width/occipital_space) - mesmo
    // caso do thighDim acima, confirmado na resposta crua.
    shoulder_width_cm: d.shoulderWidth ?? null,
    shoulder_ear_distance_cm: d.occipitalSpace ?? null,
    foot_length_cm: d.footLength ?? null,
    // Análise segmentada - músculo/gordura por região (kg)
    muscle_left_arm_kg: d.muscleLeftArm ?? null,
    muscle_right_arm_kg: d.muscleRightArm ?? null,
    fat_left_arm_kg: d.fatLeftArm ?? null,
    fat_right_arm_kg: d.fatRightArm ?? null,
    muscle_trunk_kg: d.muscleTrunk ?? null,
    fat_trunk_kg: d.fatTrunk ?? null,
    muscle_left_leg_kg: d.muscleLeftLeg ?? null,
    muscle_right_leg_kg: d.muscleRightLeg ?? null,
    fat_left_leg_kg: d.fatLeftLeg ?? null,
    fat_right_leg_kg: d.fatRightLeg ?? null,
    // Metas de exercício (kcal)
    aerobic_calories_kcal: d.aerobicGoal ?? null,
    endurance_calories_kcal: d.enduGoal ?? null,
    anaerobic_calories_kcal: d.anaGoal ?? null,
    // Foto (frontal/lateral) + classificação corporal - bodyImage/sideImage sao
    // o "key" de arquivo da Anovator (nao uma URL), resolvido depois via proxy
    // (GET /bioimpedance/photo/:id/:side) usando a interface 6 (loadFile.msg).
    body_image_key: typeof d.bodyImage === "string" ? d.bodyImage : null,
    side_image_key: typeof d.sideImage === "string" ? d.sideImage : null,
    body_shape: typeof d.bodyShape === "number" ? d.bodyShape : null,
    score: typeof d.score === "number" ? d.score : null,
    body_age: typeof d.bodyAge === "number" ? d.bodyAge : null,
    // Classificação de risco postural (nível 1-5, importado automaticamente da Anovator)
    shoulder_risk_level: d.shoulderRisk ?? null,
    humpback_risk_level: d.humpbackRisk ?? null,
    leg_risk_type: typeof d.legRisk === "string" ? d.legRisk : null,
    pelvis_risk_level: d.pelvisRisk ?? null,
    spine_risk_level: d.spineRisk ?? null,
    head_risk_level: d.headRisk ?? null,
    knee_risk_level: d.kneeRisk ?? null,
    front_head_risk_level: d.frontHeadRisk ?? null,
    body_shape_risk_level: d.bodyShapeRisk ?? null,
    posture_risk_level: d.postureRisk ?? null,
    date:
      typeof d.gmtCreate === "number" ? new Date(d.gmtCreate).toISOString().slice(0, 10) : null,
  };

  return { data, unavailableFields: UNAVAILABLE_FIELDS };
}

// Interface 6 da documentação ("photo display path interface") - recebe o
// "key" de arquivo devolvido em bodyImage/sideImage (ex:
// "2019-10-15/1571108144859500400.jpg") e retorna os bytes da foto. Usado
// como proxy (ver bioimpedance.routes.ts) pra nunca expor a apiKey no
// frontend nem depender de anovator.com aceitar hotlink direto de <img>.
export async function fetchAnovatorPhoto(key: string): Promise<{ buffer: Buffer; contentType: string }> {
  if (!env.ANOVATOR_API_KEY) {
    throw new HttpError(
      501,
      "Integração com a Anovator ainda não configurada. Configure ANOVATOR_API_KEY.",
    );
  }

  const url = `${env.ANOVATOR_BASE_URL}/file/FileAction!loadFile.msg?key=${encodeURIComponent(
    key,
  )}&apiKey=${encodeURIComponent(env.ANOVATOR_API_KEY)}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);

  let response: Response;
  try {
    response = await fetch(url, { signal: controller.signal });
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === "AbortError";
    console.error("[anovator] falha ao buscar foto:", error);
    throw new HttpError(
      502,
      isTimeout ? "Tempo esgotado ao buscar a foto na Anovator." : "Não foi possível buscar a foto na Anovator.",
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new HttpError(502, `Anovator retornou HTTP ${response.status} ao buscar a foto`);
  }

  const contentType = response.headers.get("content-type") || "image/jpeg";
  if (!contentType.startsWith("image/")) {
    throw new HttpError(502, "Resposta da Anovator não é uma imagem");
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  return { buffer, contentType };
}
