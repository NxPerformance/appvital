import { api } from "@/lib/api";

export interface LibraryExerciseApi {
  id: string;
  name: string;
  name_en: string;
  force: string | null;
  level: string | null;
  mechanic: string | null;
  equipment: string | null;
  category: string;
  primary_muscles: string[];
  secondary_muscles: string[];
  instructions: string[];
  images: string[];
}

export type WorkoutType = "academia" | "em-casa" | "crossfit" | "calistenia";

export const MUSCLE_GROUP_OPTIONS: { slug: string; label: string }[] = [
  { slug: "peito", label: "Peito" },
  { slug: "costas", label: "Costas" },
  { slug: "ombros", label: "Ombros" },
  { slug: "biceps", label: "Bíceps" },
  { slug: "triceps", label: "Tríceps" },
  { slug: "pernas", label: "Pernas" },
  { slug: "gluteos", label: "Glúteos" },
  { slug: "abdomen", label: "Abdômen" },
];

export async function fetchExerciseLibrary(params: {
  search?: string;
  equipment?: string;
  workoutType?: string;
  muscleGroups?: string[];
}) {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.equipment) query.set("equipment", params.equipment);
  if (params.workoutType) query.set("workoutType", params.workoutType);
  if (params.muscleGroups && params.muscleGroups.length > 0) query.set("muscleGroups", params.muscleGroups.join(","));
  const qs = query.toString();

  const response = await api.get<{ exercises: LibraryExerciseApi[] }>(`/exercises${qs ? `?${qs}` : ""}`);
  return response.exercises;
}

export async function fetchExerciseEquipmentOptions(workoutType?: string) {
  const qs = workoutType ? `?workoutType=${encodeURIComponent(workoutType)}` : "";
  const response = await api.get<{ equipment: string[] }>(`/exercises/equipment${qs}`);
  return response.equipment;
}
