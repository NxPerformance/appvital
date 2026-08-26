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

export async function fetchExerciseLibrary(params: { search?: string; equipment?: string }) {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.equipment) query.set("equipment", params.equipment);
  const qs = query.toString();

  const response = await api.get<{ exercises: LibraryExerciseApi[] }>(`/exercises${qs ? `?${qs}` : ""}`);
  return response.exercises;
}

export async function fetchExerciseEquipmentOptions() {
  const response = await api.get<{ equipment: string[] }>("/exercises/equipment");
  return response.equipment;
}
