export interface WorkoutStartSet {
  reps: number;
  weight: number;
  completed?: boolean;
}

export interface WorkoutStartExercise {
  name: string;
  group?: string;
  category?: string;
  location?: string;
  previous?: string[];
  sets: WorkoutStartSet[];
}

export interface WorkoutStartState {
  source: "trainer" | "suggested";
  objective: string;
  trainerName?: string;
  calories?: number | null;
  exercises: WorkoutStartExercise[];
}

const setPattern = /(\d{1,2})\s*(?:x|X|\u00d7)\s*(\d{1,3})/;
const weightPattern = /(\d{1,3}(?:[,.]\d{1,2})?)\s*kg/i;
const defaultSetCount = 3;
const defaultReps = 12;

function stripAccents(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function cleanPlanLine(line: string) {
  return line
    .replace(/^\s*(?:[-*]|\u2022)\s*/, "")
    .replace(/^\s*\d+\s*[).:-]\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isInstructionLine(line: string) {
  const normalized = stripAccents(line).toLowerCase();
  const instructionStarts = [
    "descanso",
    "intervalo",
    "observacao",
    "observacoes",
    "obs",
    "nota",
    "notas",
    "aquecimento",
    "alongamento",
    "finalizacao",
  ];

  return instructionStarts.some((word) => normalized === word || normalized.startsWith(`${word}:`));
}

function createSets(count = defaultSetCount, reps = defaultReps, weight = 0): WorkoutStartSet[] {
  const safeCount = Math.max(1, Math.min(8, Math.round(count) || defaultSetCount));
  const safeReps = Math.max(1, Math.min(200, Math.round(reps) || defaultReps));
  const safeWeight = Number.isFinite(weight) && weight > 0 ? weight : 0;

  return Array.from({ length: safeCount }, () => ({
    weight: safeWeight,
    reps: safeReps,
    completed: false,
  }));
}

function normalizeExerciseName(value: string) {
  const withoutTrailingSeparators = value.replace(/[:|\-\u2013\u2014]+$/g, "").trim();
  const colonParts = withoutTrailingSeparators.split(":").map((part) => part.trim()).filter(Boolean);
  const name = colonParts.length > 1 && stripAccents(colonParts[0]).toLowerCase().includes("exercicio")
    ? colonParts[colonParts.length - 1]
    : withoutTrailingSeparators;

  return name ? name.charAt(0).toUpperCase() + name.slice(1) : "";
}

function parseExerciseWithSets(line: string): WorkoutStartExercise | null {
  const cleanedLine = cleanPlanLine(line);
  if (!cleanedLine || isInstructionLine(cleanedLine)) return null;

  const setMatch = cleanedLine.match(setPattern);
  if (!setMatch || typeof setMatch.index !== "number") return null;

  const rawName = cleanedLine.slice(0, setMatch.index).replace(/[|\-\u2013\u2014]+$/g, "").trim();
  const name = normalizeExerciseName(rawName);
  if (name.length < 3) return null;

  const weightMatch = cleanedLine.match(weightPattern);
  const weight = weightMatch ? Number(weightMatch[1].replace(",", ".")) : 0;

  return {
    name,
    group: "Prescricao do personal",
    location: "Academia",
    sets: createSets(Number(setMatch[1]), Number(setMatch[2]), weight),
  };
}

function parseExerciseNameOnly(line: string): WorkoutStartExercise | null {
  const cleanedLine = cleanPlanLine(line);
  if (!cleanedLine || isInstructionLine(cleanedLine)) return null;
  if (setPattern.test(cleanedLine)) return null;

  const nameCandidate = cleanedLine
    .split(/[|\-\u2013\u2014]/)[0]
    .replace(/^(treino|dia)\s+[a-z0-9]+\s*[:\-\u2013\u2014]\s*/i, "")
    .trim();
  const normalized = stripAccents(nameCandidate).toLowerCase();
  const wordCount = nameCandidate.split(/\s+/).filter(Boolean).length;

  if (nameCandidate.length < 3 || nameCandidate.length > 60) return null;
  if (normalized.startsWith("treino ") && !normalized.includes("agachamento")) return null;
  if (wordCount > 7 && /[.!?]/.test(nameCandidate)) return null;

  return {
    name: normalizeExerciseName(nameCandidate),
    group: "Prescricao do personal",
    location: "Academia",
    sets: createSets(),
  };
}

function getPlanLines(planText: string) {
  return planText
    .split(/\n|;/)
    .flatMap((line) => (!setPattern.test(line) && line.includes(",") ? line.split(",") : [line]))
    .map(cleanPlanLine)
    .filter(Boolean);
}

function getPlanTitle(planText: string) {
  const firstLine = cleanPlanLine(planText.split(/\n/)[0] ?? "");
  if (firstLine && firstLine.length <= 64 && !setPattern.test(firstLine) && !isInstructionLine(firstLine)) {
    return normalizeExerciseName(firstLine);
  }

  return "Treino do personal";
}

export function buildWorkoutStartFromTrainerPlan(planText: string, trainerName?: string): WorkoutStartState {
  const lines = getPlanLines(planText);
  const parsedWithSets = lines.map(parseExerciseWithSets).filter(Boolean) as WorkoutStartExercise[];
  const exercises = parsedWithSets.length
    ? parsedWithSets
    : (lines.map(parseExerciseNameOnly).filter(Boolean) as WorkoutStartExercise[]);

  return {
    source: "trainer",
    objective: getPlanTitle(planText),
    trainerName,
    calories: null,
    exercises: exercises.length
      ? exercises.slice(0, 12)
      : [
          {
            name: "Prescricao do personal",
            group: "Prescricao do personal",
            location: "Academia",
            sets: createSets(),
          },
        ],
  };
}

function normalizeStartSet(value: unknown): WorkoutStartSet | null {
  if (!value || typeof value !== "object") return null;
  const set = value as Partial<WorkoutStartSet>;
  const reps = Number(set.reps);
  const weight = Number(set.weight);

  if (!Number.isFinite(reps) || reps <= 0) return null;

  return {
    reps: Math.round(reps),
    weight: Number.isFinite(weight) && weight > 0 ? weight : 0,
    completed: Boolean(set.completed),
  };
}

function normalizeStartExercise(value: unknown): WorkoutStartExercise | null {
  if (!value || typeof value !== "object") return null;
  const exercise = value as Partial<WorkoutStartExercise>;
  const name = typeof exercise.name === "string" ? exercise.name.trim() : "";
  if (name.length < 2) return null;

  const sets = Array.isArray(exercise.sets)
    ? exercise.sets.map(normalizeStartSet).filter(Boolean) as WorkoutStartSet[]
    : [];

  return {
    name,
    group: typeof exercise.group === "string" ? exercise.group : undefined,
    category: typeof exercise.category === "string" ? exercise.category : undefined,
    location: typeof exercise.location === "string" ? exercise.location : undefined,
    previous: Array.isArray(exercise.previous)
      ? exercise.previous.filter((item): item is string => typeof item === "string")
      : undefined,
    sets: sets.length ? sets : createSets(),
  };
}

export function normalizeWorkoutStartState(value: unknown): WorkoutStartState | null {
  if (!value || typeof value !== "object") return null;
  const state = value as Partial<WorkoutStartState>;
  const exercises = Array.isArray(state.exercises)
    ? state.exercises.map(normalizeStartExercise).filter(Boolean) as WorkoutStartExercise[]
    : [];

  if (!exercises.length) return null;

  return {
    source: state.source === "trainer" ? "trainer" : "suggested",
    objective: typeof state.objective === "string" && state.objective.trim()
      ? state.objective.trim()
      : "Treino do dia",
    trainerName: typeof state.trainerName === "string" ? state.trainerName : undefined,
    calories: typeof state.calories === "number" && Number.isFinite(state.calories) ? state.calories : null,
    exercises,
  };
}
