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

// Espelha backend/src/routes/exercises.routes.ts (MUSCLE_GROUP_MUSCLES) — usado
// só para agrupar visualmente os resultados por grupo selecionado (ver
// groupExercisesByMuscleGroup), não para filtrar (isso já vem pronto da API).
const MUSCLE_GROUP_MUSCLES: Record<string, string[]> = {
  peito: ["peitoral"],
  costas: ["dorsais", "lombar", "meio das costas", "trapézio"],
  ombros: ["ombros", "pescoço"],
  biceps: ["bíceps"],
  triceps: ["tríceps", "antebraços"],
  pernas: ["quadríceps", "posteriores de coxa", "panturrilhas", "adutores", "abdutores"],
  gluteos: ["glúteos"],
  abdomen: ["abdômen"],
};

// Quando mais de um grupo muscular está selecionado, a ordenação alfabética
// da API pode deixar um grupo com muito mais exercícios "engolir" o topo da
// lista, escondendo o outro grupo até o usuário rolar bastante. Separar em
// seções (uma por grupo selecionado, na mesma ordem dos chips) garante que
// cada grupo escolhido apareça visivelmente, sem depender de rolagem.
export function groupExercisesByMuscleGroup(exercises: LibraryExerciseApi[], selectedSlugs: string[]) {
  if (selectedSlugs.length <= 1) {
    return [{ slug: null, label: null, exercises }];
  }

  const remaining = new Set(exercises.map((exercise) => exercise.id));
  const sections = selectedSlugs
    .map((slug) => {
      const muscles = MUSCLE_GROUP_MUSCLES[slug] ?? [];
      const option = MUSCLE_GROUP_OPTIONS.find((item) => item.slug === slug);
      const matched = exercises.filter(
        (exercise) => remaining.has(exercise.id) && exercise.primary_muscles.some((muscle) => muscles.includes(muscle)),
      );
      matched.forEach((exercise) => remaining.delete(exercise.id));
      return { slug, label: option?.label ?? slug, exercises: matched };
    })
    .filter((section) => section.exercises.length > 0);

  const leftover = exercises.filter((exercise) => remaining.has(exercise.id));
  if (leftover.length > 0) {
    sections.push({ slug: null, label: null, exercises: leftover });
  }

  return sections;
}

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
