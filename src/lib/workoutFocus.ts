export const workoutFocusOptions = [
  "Peito",
  "Costas",
  "Ombros",
  "Bíceps",
  "Tríceps",
  "Pernas",
  "Quadríceps",
  "Posterior",
  "Glúteos",
  "Panturrilha",
  "Abdômen",
  "Full body",
];

const normalizeFocusLabel = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export const getSelectedWorkoutFocusLabels = (objective: string) => {
  const selectedParts = objective
    .split(/[/,+]/)
    .flatMap((part) => part.split(/\s+e\s+/i))
    .map(normalizeFocusLabel)
    .filter(Boolean);
  const selectedSet = new Set(selectedParts);

  return workoutFocusOptions.filter((option) => selectedSet.has(normalizeFocusLabel(option)));
};

export const formatWorkoutFocusObjective = (selectedLabels: string[]) =>
  workoutFocusOptions.filter((option) => selectedLabels.includes(option)).join("/");
