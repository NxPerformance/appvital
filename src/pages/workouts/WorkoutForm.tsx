import { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  Delete,
  Dumbbell,
  Flame,
  Flag,
  Home,
  MoreVertical,
  NotebookText,
  PersonStanding,
  Plus,
  Repeat2,
  Search,
  Target,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useUnsavedChangesWarning } from "@/hooks/useUnsavedChangesWarning";
import { useWorkoutDraft } from "@/hooks/useWorkoutDraft";
import { UnsavedChangesDialog } from "@/components/UnsavedChangesDialog";
import { normalizeWorkoutStartState, type WorkoutStartExercise } from "@/lib/workoutStart";
import {
  fetchExerciseLibrary,
  fetchExerciseEquipmentOptions,
  groupExercisesByMuscleGroup,
  MUSCLE_GROUP_OPTIONS,
  type LibraryExerciseApi,
} from "@/lib/exerciseLibrary";
import { toast } from "sonner";

interface ExerciseSet {
  reps: number;
  weight: number;
  completed?: boolean;
}

interface Exercise {
  name: string;
  group?: string;
  category?: string;
  location?: string;
  previous?: string[];
  sets: ExerciseSet[];
}

interface WorkoutDraftData {
  objective: string;
  addedExercises: Exercise[];
  calories: number | "";
}

type NumpadTarget =
  | { kind: "set"; exerciseIndex: number; setIndex: number; field: "weight" | "reps" }
  | { kind: "calories" };

type FlowPhase = "muscle-select" | "exercise-picker" | "logging";

const workoutTypeConfig: Record<string, { label: string; icon: LucideIcon; defaultFocus: string }> = {
  academia: { label: "Academia", icon: Dumbbell, defaultFocus: "Peitoral" },
  "em-casa": { label: "Em Casa", icon: Home, defaultFocus: "Peitoral" },
  crossfit: { label: "CrossFit", icon: Flame, defaultFocus: "Full body" },
  calistenia: { label: "Calistenia", icon: PersonStanding, defaultFocus: "Peso corporal" },
};

function createExerciseFromWorkoutStart(exercise: WorkoutStartExercise): Exercise {
  return {
    name: exercise.name,
    group: exercise.group,
    category: exercise.category,
    location: exercise.location,
    previous: exercise.previous || exercise.sets.map(() => "—"),
    sets: exercise.sets.map((set) => ({
      weight: Number(set.weight) || 0,
      reps: Math.round(Number(set.reps)) || 0,
      completed: Boolean(set.completed),
    })),
  };
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function createExerciseFromLibraryItem(item: LibraryExerciseApi): Exercise {
  return {
    name: item.name,
    group: item.primary_muscles.map(capitalize).join(" · ") || undefined,
    category: item.equipment ? capitalize(item.equipment) : undefined,
    sets: [
      { weight: 0, reps: 0, completed: false },
      { weight: 0, reps: 0, completed: false },
      { weight: 0, reps: 0, completed: false },
    ],
  };
}

function getCompletedSets(exercise: Exercise) {
  return exercise.sets.filter((set) => set.completed && Number(set.reps) > 0);
}

function getSaveSets(exercise: Exercise) {
  return exercise.sets
    .map((set) => ({
      reps: Number(set.reps) || 0,
      weight: Number(set.weight) || 0,
    }))
    .filter((set) => set.reps > 0);
}

function normalizeExercise(exercise: Exercise): Exercise {
  return {
    name: exercise.name.trim(),
    sets: getSaveSets(exercise),
  };
}

function formatTimerDisplay(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function formatWeight(value: number) {
  if (!value) return "—";
  return Number.isInteger(value) ? String(value) : String(value).replace(".", ",");
}

function formatNumberValue(value: number | "") {
  if (value === "" || value === 0) return "—";
  return String(value);
}

function getMaxWeight(exercises: Exercise[]) {
  return exercises.reduce((max, exercise) => {
    const exerciseMax = exercise.sets.reduce((setMax, set) => Math.max(setMax, Number(set.weight) || 0), 0);
    return Math.max(max, exerciseMax);
  }, 0);
}

function MetaIcon({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
      <Icon className="h-3.5 w-3.5 text-primary" />
      {children}
    </span>
  );
}

export default function WorkoutForm() {
  const { type = "academia" } = useParams<{ type: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const config = workoutTypeConfig[type] || workoutTypeConfig.academia;
  const workoutStartState = useMemo(() => normalizeWorkoutStartState(location.state), [location.state]);

  const { saveDraft, loadDraft, clearDraft } = useWorkoutDraft<WorkoutDraftData>(type);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [objective, setObjective] = useState(config.defaultFocus);
  const [addedExercises, setAddedExercises] = useState<Exercise[]>([]);
  const [calories, setCalories] = useState<number | "">("");
  const [saving, setSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [restTime] = useState(60);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [flowPhase, setFlowPhase] = useState<FlowPhase>("muscle-select");
  const [selectedMuscleGroups, setSelectedMuscleGroups] = useState<Set<string>>(new Set());
  const [exercisePickerOpen, setExercisePickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const [pickerEquipment, setPickerEquipment] = useState<string | null>(null);
  const [selectedLibraryIds, setSelectedLibraryIds] = useState<Set<string>>(new Set());
  const [brokenImageIds, setBrokenImageIds] = useState<Set<string>>(new Set());
  const [numpadTarget, setNumpadTarget] = useState<NumpadTarget | null>(null);
  const [numpadValue, setNumpadValue] = useState("");
  const savePressLockRef = useRef(false);

  const isInitialPickerFlow = flowPhase === "exercise-picker";
  const pickerVisible = isInitialPickerFlow || exercisePickerOpen;

  const [debouncedPickerQuery, setDebouncedPickerQuery] = useState("");
  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedPickerQuery(pickerQuery.trim()), 300);
    return () => window.clearTimeout(timeout);
  }, [pickerQuery]);

  const { data: equipmentOptions } = useQuery({
    queryKey: ["exercise-equipment-options", type],
    queryFn: () => fetchExerciseEquipmentOptions(type),
    enabled: pickerVisible,
    staleTime: Infinity,
  });

  const { data: libraryResults, isLoading: libraryLoading } = useQuery({
    queryKey: ["exercise-library", type, debouncedPickerQuery, pickerEquipment, Array.from(selectedMuscleGroups).sort().join(",")],
    queryFn: () =>
      fetchExerciseLibrary({
        search: debouncedPickerQuery || undefined,
        equipment: pickerEquipment || undefined,
        workoutType: type,
        muscleGroups: selectedMuscleGroups.size > 0 ? Array.from(selectedMuscleGroups) : undefined,
      }),
    enabled: pickerVisible,
  });

  useEffect(() => {
    if (flowPhase !== "logging") return;

    const interval = window.setInterval(() => {
      setElapsedSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [flowPhase]);

  useEffect(() => {
    if (workoutStartState) {
      setObjective(workoutStartState.objective || config.defaultFocus);
      setAddedExercises(workoutStartState.exercises.map(createExerciseFromWorkoutStart));
      setCalories(workoutStartState.calories || "");
      setFlowPhase("logging");
      clearDraft();
      setDraftLoaded(true);
      toast.success(
        workoutStartState.source === "trainer"
          ? "Treino do personal carregado"
          : "Sugestão de treino carregada",
      );
      return;
    }

    const draft = loadDraft();
    if (draft) {
      setObjective(draft.objective || config.defaultFocus);
      if (draft.addedExercises?.length) {
        setAddedExercises(draft.addedExercises);
        setFlowPhase("logging");
      }
      setCalories(draft.calories || "");
      toast.info("Rascunho recuperado automaticamente");
    }
    setDraftLoaded(true);
  }, [clearDraft, config.defaultFocus, loadDraft, workoutStartState]);

  const hasUnsavedChanges = Boolean(
    addedExercises.length > 0 || calories || (objective.trim() && objective.trim() !== config.defaultFocus),
  );

  useEffect(() => {
    if (!draftLoaded) return;
    if (!hasUnsavedChanges) return;

    saveDraft({
      objective,
      addedExercises,
      calories,
    });
  }, [addedExercises, calories, draftLoaded, hasUnsavedChanges, objective, saveDraft]);

  useEffect(() => {
    if (!endTime) return;

    const updateRest = () => {
      const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
      setTimeLeft(remaining);

      if (remaining <= 0) {
        setIsResting(false);
        setEndTime(null);
        if ("vibrate" in navigator) navigator.vibrate([120, 80, 120]);
      }
    };

    updateRest();
    const interval = window.setInterval(updateRest, 250);
    return () => window.clearInterval(interval);
  }, [endTime]);

  const { isBlocked, proceed, reset } = useUnsavedChangesWarning({
    hasUnsavedChanges,
  });

  const totalCompletedSets = addedExercises.reduce((sum, exercise) => sum + getCompletedSets(exercise).length, 0);
  const totalSets = addedExercises.reduce((sum, exercise) => sum + exercise.sets.length, 0);
  const maxWeight = getMaxWeight(addedExercises);
  const completedExerciseCount = addedExercises.filter((exercise) => getCompletedSets(exercise).length > 0).length;
  const title = `${objective || config.defaultFocus} — Treino livre`;

  const startRest = () => {
    setEndTime(Date.now() + restTime * 1000);
    setTimeLeft(restTime);
    setIsResting(true);
  };

  const openNumpad = (target: NumpadTarget) => {
    setNumpadTarget(target);

    if (target.kind === "calories") {
      setNumpadValue(calories ? String(calories) : "");
      return;
    }

    const set = addedExercises[target.exerciseIndex]?.sets[target.setIndex];
    const value = target.field === "weight" ? set?.weight : set?.reps;
    setNumpadValue(value ? String(value) : "");
  };

  const closeNumpad = () => {
    setNumpadTarget(null);
    setNumpadValue("");
  };

  const confirmNumpad = () => {
    if (!numpadTarget) return;
    const numericValue = Number(numpadValue.replace(",", "."));

    if (numpadTarget.kind === "calories") {
      setCalories(Number.isFinite(numericValue) && numericValue > 0 ? Math.round(numericValue) : "");
      closeNumpad();
      return;
    }

    setAddedExercises((current) =>
      current.map((exercise, exerciseIndex) => {
        if (exerciseIndex !== numpadTarget.exerciseIndex) return exercise;

        return {
          ...exercise,
          sets: exercise.sets.map((set, setIndex) => {
            if (setIndex !== numpadTarget.setIndex) return set;
            return {
              ...set,
              [numpadTarget.field]: numpadTarget.field === "reps" ? Math.round(numericValue) || 0 : numericValue || 0,
            };
          }),
        };
      }),
    );
    closeNumpad();
  };

  const handleNumpadInput = (value: string) => {
    if (value === "." && numpadValue.includes(".")) return;
    if (numpadValue.length >= 6) return;
    setNumpadValue((current) => `${current}${value}`);
  };

  const addSeries = (exerciseIndex: number) => {
    setAddedExercises((current) =>
      current.map((exercise, index) =>
        index === exerciseIndex
          ? {
              ...exercise,
              previous: [...(exercise.previous || []), "—"],
              sets: [...exercise.sets, { weight: 0, reps: 0, completed: false }],
            }
          : exercise,
      ),
    );
  };

  const toggleSetCompleted = (exerciseIndex: number, setIndex: number) => {
    setAddedExercises((current) =>
      current.map((exercise, index) => {
        if (index !== exerciseIndex) return exercise;

        return {
          ...exercise,
          sets: exercise.sets.map((set, currentSetIndex) =>
            currentSetIndex === setIndex
              ? {
                  ...set,
                  completed: !set.completed,
                }
              : set,
          ),
        };
      }),
    );

    const targetSet = addedExercises[exerciseIndex]?.sets[setIndex];
    if (!targetSet?.completed) startRest();
  };

  const removeExercise = (exerciseIndex: number) => {
    setAddedExercises((current) => current.filter((_, index) => index !== exerciseIndex));
    toast.success("Exercício removido");
  };

  const openExercisePicker = () => {
    setPickerQuery("");
    setPickerEquipment(null);
    setSelectedMuscleGroups(new Set());
    setSelectedLibraryIds(new Set());
    setExercisePickerOpen(true);
  };

  const proceedToExercisePicker = () => {
    setPickerQuery("");
    setPickerEquipment(null);
    setSelectedLibraryIds(new Set());
    setFlowPhase("exercise-picker");
  };

  const toggleMuscleGroup = (slug: string) => {
    setSelectedMuscleGroups((current) => {
      const next = new Set(current);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return next;
    });
  };

  const toggleLibrarySelection = (id: string) => {
    setSelectedLibraryIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAllVisibleExercises = () => {
    const alreadyAddedNames = new Set(addedExercises.map((exercise) => exercise.name));
    const selectableIds = (libraryResults ?? [])
      .filter((item) => !alreadyAddedNames.has(item.name))
      .map((item) => item.id);
    setSelectedLibraryIds(new Set(selectableIds));
  };

  const confirmExerciseSelection = () => {
    const alreadyAddedNames = new Set(addedExercises.map((exercise) => exercise.name));
    const toAdd = (libraryResults ?? [])
      .filter((item) => selectedLibraryIds.has(item.id) && !alreadyAddedNames.has(item.name))
      .map(createExerciseFromLibraryItem);

    setAddedExercises((current) => [...current, ...toAdd]);
    setSelectedLibraryIds(new Set());

    if (isInitialPickerFlow) {
      setFlowPhase("logging");
    } else {
      setExercisePickerOpen(false);
    }
  };

  const handleSaveWorkout = async (durationMinutes: number) => {
    setSaveFeedback(null);

    if (!user) {
      const message = "Você precisa estar logado novamente para salvar o treino";
      setSaveFeedback({ type: "error", message });
      toast.error(message);
      return false;
    }

    const workoutObjective = objective.trim() || config.defaultFocus;
    const exercisesToSave = addedExercises.map(normalizeExercise).filter((exercise) => exercise.name && exercise.sets.length > 0);

    if (exercisesToSave.length === 0) {
      const message = "Complete ao menos uma série antes de finalizar";
      setSaveFeedback({ type: "error", message });
      toast.error(message);
      return false;
    }

    setSaving(true);
    try {
      const response = await api.post<{ workout?: { id?: string } }>("/workouts/strength", {
        date: new Date().toISOString().split("T")[0],
        objective: workoutObjective,
        duration_min: durationMinutes,
        calories: calories || null,
        exercises: exercisesToSave.map((exercise) => ({
          name: exercise.name,
          sets: exercise.sets,
        })),
        workout_type: type,
      });

      if (!response.workout?.id) {
        throw new Error("A API nao confirmou o treino salvo");
      }

      toast.success("Treino salvo com sucesso!");
      setSaveFeedback({ type: "success", message: "Treino salvo com sucesso." });
      clearDraft();
      // Clear the fields that drive hasUnsavedChanges synchronously, so the
      // navigation right after this doesn't trip useBlocker and reopen the
      // unsaved-changes dialog on an already-saved workout (which caused
      // duplicate saves if the user pressed "Salvar" on that dialog too).
      flushSync(() => {
        setObjective("");
        setAddedExercises([]);
        setCalories("");
      });
      return true;
    } catch (error: any) {
      const message = `Não foi possível salvar o treino: ${error?.message || "tente novamente em alguns instantes"}`;
      setSaveFeedback({ type: "error", message });
      toast.error(message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const finishWorkout = () => {
    if (saving || savePressLockRef.current) return;

    savePressLockRef.current = true;
    const durationMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
    void handleSaveWorkout(durationMinutes).then((saved) => {
      if (saved) navigate("/workouts");
    }).finally(() => {
      window.setTimeout(() => {
        savePressLockRef.current = false;
      }, 300);
    });
  };

  const handleSaveAndNavigate = async () => {
    const saved = await handleSaveWorkout(Math.max(1, Math.round(elapsedSeconds / 60)));
    if (saved) proceed();
  };

  const handleDiscardAndNavigate = () => {
    clearDraft();
    proceed();
  };

  if (flowPhase === "muscle-select") {
    return (
      <>
      <div className="min-h-full bg-[hsl(var(--background))]">
        <div className="mx-auto flex min-h-full w-full max-w-[430px] flex-col gap-5 px-5 pb-40 pt-6 md:max-w-[1180px] md:px-7">
          <header className="grid grid-cols-[42px_1fr_42px] items-center gap-3">
            <Link
              to="/workouts"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary"
              aria-label="Cancelar"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-center text-xl font-black">{config.label}</h1>
            <span />
          </header>

          <div className="flex flex-col items-center gap-2 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Target className="h-7 w-7" />
            </span>
            <h2 className="text-lg font-black text-foreground">Qual grupo você vai treinar?</h2>
            <p className="max-w-[280px] text-sm text-muted-foreground">
              Selecione um ou mais grupos musculares para ver os exercícios certos.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {MUSCLE_GROUP_OPTIONS.map((group) => {
              const selected = selectedMuscleGroups.has(group.slug);
              return (
                <button
                  key={group.slug}
                  type="button"
                  onClick={() => toggleMuscleGroup(group.slug)}
                  className={`flex h-14 items-center justify-center rounded-[1rem] border px-3 text-sm font-black transition-colors ${
                    selected ? "border-primary bg-primary/15 text-primary" : "border-white/10 bg-card text-foreground"
                  }`}
                >
                  {group.label}
                </button>
              );
            })}
          </div>
        </div>

        <footer className="fixed bottom-0 left-1/2 z-50 w-full max-w-[430px] -translate-x-1/2 border-t border-white/10 bg-[hsl(var(--background-strong)/0.98)] px-5 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] pt-3 backdrop-blur md:max-w-[1180px] md:px-7">
          <button
            type="button"
            onClick={proceedToExercisePicker}
            disabled={selectedMuscleGroups.size === 0}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-black text-primary-foreground disabled:opacity-40"
          >
            Continuar
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedMuscleGroups(new Set());
              proceedToExercisePicker();
            }}
            className="mt-2 h-9 w-full text-center text-xs font-bold text-muted-foreground"
          >
            Ver todos os exercícios
          </button>
        </footer>
      </div>
      <UnsavedChangesDialog
        open={isBlocked}
        onDiscard={handleDiscardAndNavigate}
        onSave={handleSaveAndNavigate}
        onContinue={reset}
        saving={saving}
      />
      </>
    );
  }

  if (pickerVisible) {
    return (
      <>
      <div className="min-h-full bg-[hsl(var(--background))]">
        <div className="mx-auto flex min-h-full w-full max-w-[430px] flex-col gap-4 px-5 pb-40 pt-6 md:max-w-[1180px] md:px-7">
          <header className="grid grid-cols-[42px_1fr_42px] items-center gap-3">
            <button
              type="button"
              onClick={() => (isInitialPickerFlow ? setFlowPhase("muscle-select") : setExercisePickerOpen(false))}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary"
              aria-label="Voltar"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-center text-xl font-black">Exercícios</h1>
            <span />
          </header>

          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={pickerQuery}
              onChange={(event) => setPickerQuery(event.target.value)}
              placeholder="Pesquisar exercício..."
              className="h-12 w-full rounded-xl border border-white/10 bg-card pl-11 pr-4 text-sm font-semibold outline-none placeholder:text-muted-foreground focus:border-primary"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
            {MUSCLE_GROUP_OPTIONS.map((group) => {
              const selected = selectedMuscleGroups.has(group.slug);
              return (
                <button
                  key={group.slug}
                  type="button"
                  onClick={() => toggleMuscleGroup(group.slug)}
                  className={`h-9 shrink-0 rounded-full border px-4 text-xs font-black transition-colors ${
                    selected ? "border-primary bg-primary text-primary-foreground" : "border-white/10 bg-card text-muted-foreground"
                  }`}
                >
                  {group.label}
                </button>
              );
            })}
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
            <button
              type="button"
              onClick={() => setPickerEquipment(null)}
              className={`h-9 shrink-0 rounded-full border px-4 text-xs font-black capitalize transition-colors ${
                pickerEquipment === null
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-white/10 bg-card text-muted-foreground"
              }`}
            >
              Todos
            </button>
            {(equipmentOptions ?? []).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setPickerEquipment(option)}
                className={`h-9 shrink-0 rounded-full border px-4 text-xs font-black capitalize transition-colors ${
                  pickerEquipment === option
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-white/10 bg-card text-muted-foreground"
                }`}
              >
                {option}
              </button>
            ))}
          </div>

          {libraryLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Carregando exercícios...</p>
          ) : (libraryResults ?? []).length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhum exercício encontrado.</p>
          ) : (
            <>
              <div className="flex justify-end">
                <button type="button" onClick={selectAllVisibleExercises} className="text-xs font-bold text-primary">
                  Selecionar todos
                </button>
              </div>
              {groupExercisesByMuscleGroup(libraryResults ?? [], Array.from(selectedMuscleGroups)).map((group) => (
                <div key={group.slug ?? "outros"} className="flex flex-col gap-3">
                  {group.label ? (
                    <h2 className="text-xs font-black uppercase tracking-[0.1em] text-muted-foreground">{group.label}</h2>
                  ) : null}
                  <section className="grid grid-cols-2 gap-3">
                    {group.exercises.map((exercise) => {
                      const selected = selectedLibraryIds.has(exercise.id);
                      const alreadyAdded = addedExercises.some((added) => added.name === exercise.name);

                      return (
                        <button
                          key={exercise.id}
                          type="button"
                          disabled={alreadyAdded}
                          onClick={() => toggleLibrarySelection(exercise.id)}
                          className={`relative overflow-hidden rounded-[1rem] border bg-card text-left shadow-elegant transition-transform ${
                            alreadyAdded ? "opacity-40" : "hover:-translate-y-0.5"
                          } ${selected ? "border-primary" : "border-white/10"}`}
                        >
                          {exercise.images[0] && !brokenImageIds.has(exercise.id) ? (
                            <img
                              src={exercise.images[0]}
                              alt={exercise.name}
                              loading="lazy"
                              className="h-20 w-full object-cover"
                              onError={() => setBrokenImageIds((current) => new Set(current).add(exercise.id))}
                            />
                          ) : (
                            <div className="flex h-20 items-center justify-center bg-secondary/40 text-muted-foreground">
                              <Dumbbell className="h-6 w-6" />
                            </div>
                          )}
                          <span
                            className={`absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full ${
                              selected ? "bg-primary text-primary-foreground" : "bg-primary/15 text-primary/50"
                            }`}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </span>
                          <div className="p-3">
                            {exercise.equipment ? (
                              <span className="inline-flex rounded-full bg-primary/15 px-2 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-primary">
                                {exercise.equipment}
                              </span>
                            ) : null}
                            <h3 className="mt-2 text-sm font-black leading-tight text-foreground">{exercise.name}</h3>
                            {exercise.primary_muscles.length > 0 ? (
                              <p className="mt-1 truncate text-[11px] text-muted-foreground">
                                {exercise.primary_muscles.join(", ")}
                              </p>
                            ) : null}
                            {alreadyAdded ? (
                              <p className="mt-1 text-[10px] font-bold text-primary">Já no treino</p>
                            ) : null}
                          </div>
                        </button>
                      );
                    })}
                  </section>
                </div>
              ))}
            </>
          )}
        </div>

        {selectedLibraryIds.size > 0 ? (
          <button
            type="button"
            onClick={confirmExerciseSelection}
            className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+4.6rem)] left-1/2 z-50 flex h-12 w-[calc(100%-2.5rem)] max-w-[390px] -translate-x-1/2 items-center justify-center gap-2 rounded-xl border border-white/10 bg-[hsl(var(--background-strong)/0.96)] text-sm font-black text-foreground shadow-elegant backdrop-blur"
          >
            <Plus className="h-5 w-5 text-primary" />
            Adicionar ao treino — {selectedLibraryIds.size} exercício(s)
          </button>
        ) : null}
      </div>
      <UnsavedChangesDialog
        open={isBlocked}
        onDiscard={handleDiscardAndNavigate}
        onSave={handleSaveAndNavigate}
        onContinue={reset}
        saving={saving}
      />
      </>
    );
  }

  return (
    <div className="min-h-full bg-[hsl(var(--background))]">
      <div className="mx-auto flex min-h-full w-full max-w-[430px] flex-col pb-[9.5rem] md:max-w-[1180px]">
        <div className="border-b border-white/10 bg-[linear-gradient(135deg,hsl(var(--card))_0%,hsl(var(--background-strong))_100%)] px-5 pb-4 pt-3">
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>10:25</span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-3 rounded-sm border border-muted-foreground/70" />
              <span className="h-2 w-2 rounded-full border border-muted-foreground/70" />
            </span>
          </div>

          <div className="mb-3 flex items-center justify-between gap-3">
            <h1 className="min-w-0 truncate text-base font-black text-foreground">{title}</h1>
            <Link to="/workouts" className="shrink-0 text-sm font-medium text-muted-foreground">
              Cancelar
            </Link>
          </div>

          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="font-mono text-[34px] font-black leading-none tracking-[0.12em] text-primary">
                {formatTimerDisplay(elapsedSeconds)}
              </p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Tempo de treino</p>
            </div>
            <div className="flex shrink-0 gap-5 text-center">
              <div>
                <p className="text-lg font-black text-primary">{addedExercises.length}</p>
                <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Exerc.</p>
              </div>
              <div>
                <p className="text-lg font-black text-primary">{totalCompletedSets}</p>
                <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Séries</p>
              </div>
              <div>
                <p className="text-lg font-black text-primary">{maxWeight ? `${formatWeight(maxWeight)}kg` : "—"}</p>
                <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Peso máx</p>
              </div>
            </div>
          </div>
        </div>

        {isResting ? (
          <button
            type="button"
            onClick={() => {
              setIsResting(false);
              setEndTime(null);
            }}
            className="mx-5 mt-3 flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-left"
          >
            <Repeat2 className="h-5 w-5 text-primary" />
            <span className="flex-1 text-sm font-bold text-primary">Descansando...</span>
            <span className="font-mono text-lg font-black text-primary">{formatTimerDisplay(timeLeft)}</span>
          </button>
        ) : null}

        <main className="flex-1 overflow-y-auto px-5 py-3 hide-scrollbar">
          <div className="space-y-3">
            {addedExercises.map((exercise, exerciseIndex) => {
              const max = getMaxWeight([exercise]);

              return (
                <section
                  key={`${exercise.name}-${exerciseIndex}`}
                  className={`overflow-hidden rounded-[1rem] border bg-card shadow-elegant ${
                    exerciseIndex === addedExercises.length - 1 ? "border-primary/60" : "border-white/10"
                  }`}
                >
                  <div className="flex items-center gap-3 border-b border-white/5 px-4 py-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Dumbbell className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-sm font-black text-foreground">{exercise.name}</h2>
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{exercise.group || objective}</p>
                    </div>
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-black text-primary">
                      Máx: {max ? `${formatWeight(max)}kg` : "—"}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeExercise(exerciseIndex)}
                      className="flex h-8 w-6 items-center justify-center text-muted-foreground"
                      aria-label="Remover exercício"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-[34px_1fr_1fr_1fr_36px] gap-1 px-4 py-2 text-center text-[9px] font-black uppercase tracking-[0.12em] text-muted-foreground">
                    <span className="text-left">Série</span>
                    <span>Peso kg</span>
                    <span>Reps</span>
                    <span>Anterior</span>
                    <span />
                  </div>

                  {exercise.sets.map((set, setIndex) => {
                    const isCurrent = !set.completed && exerciseIndex === addedExercises.length - 1;

                    return (
                      <div
                        key={setIndex}
                        className={`grid grid-cols-[34px_1fr_1fr_1fr_36px] items-center gap-1 px-4 py-2 ${
                          isCurrent ? "bg-primary/5" : ""
                        }`}
                      >
                        <span className={`text-xs font-black ${isCurrent ? "text-primary" : "text-muted-foreground"}`}>{setIndex + 1}</span>
                        <button
                          type="button"
                          onClick={() => openNumpad({ kind: "set", exerciseIndex, setIndex, field: "weight" })}
                          className={`h-9 rounded-lg border text-sm font-black ${
                            isCurrent ? "border-primary bg-background text-foreground" : "border-white/10 bg-secondary text-foreground"
                          }`}
                        >
                          {formatWeight(set.weight)}
                        </button>
                        <button
                          type="button"
                          onClick={() => openNumpad({ kind: "set", exerciseIndex, setIndex, field: "reps" })}
                          className={`h-9 rounded-lg border text-sm font-black ${
                            isCurrent ? "border-primary bg-background text-foreground" : "border-white/10 bg-secondary text-foreground"
                          }`}
                        >
                          {set.reps || "—"}
                        </button>
                        <span className="text-center text-[11px] font-bold text-muted-foreground/45">{exercise.previous?.[setIndex] || "—"}</span>
                        <button
                          type="button"
                          onClick={() => toggleSetCompleted(exerciseIndex, setIndex)}
                          className={`mx-auto flex h-8 w-8 items-center justify-center rounded-lg ${
                            set.completed ? "bg-primary text-primary-foreground" : "border border-white/10 bg-secondary text-muted-foreground/50"
                          }`}
                          aria-label="Concluir série"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => addSeries(exerciseIndex)}
                    className="flex h-11 w-full items-center justify-center gap-2 border-t border-white/5 text-sm font-black text-primary"
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar série
                  </button>
                </section>
              );
            })}

            <button
              type="button"
              onClick={openExercisePicker}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-[1rem] border-2 border-dashed border-white/10 bg-card text-sm font-black text-muted-foreground"
            >
              <Plus className="h-5 w-5 text-primary" />
              Adicionar exercício
            </button>

            <button
              type="button"
              className="flex h-11 w-full items-center gap-3 rounded-xl border border-white/10 bg-card px-4 text-sm text-muted-foreground/55"
            >
              <NotebookText className="h-4 w-4 text-muted-foreground" />
              Adicionar nota ao treino...
            </button>

            <button
              type="button"
              onClick={() => openNumpad({ kind: "calories" })}
              className="flex w-full items-center gap-4 rounded-[1rem] border border-white/10 bg-card p-4 text-left"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Flame className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold text-muted-foreground">Calorias gastas</span>
                <span className="mt-2 flex items-center gap-2">
                  <span className="inline-flex h-10 min-w-24 items-center justify-center rounded-lg bg-secondary px-4 text-xl font-black text-primary">
                    {formatNumberValue(calories)}
                  </span>
                  <span className="text-sm font-bold text-muted-foreground">kcal</span>
                </span>
                <span className="mt-1 block text-[10px] text-muted-foreground/50">Informe pelo seu smartwatch ou estimativa</span>
              </span>
            </button>

            {saveFeedback ? (
              <p className={`rounded-xl border px-3 py-2 text-sm font-medium ${
                saveFeedback.type === "success"
                  ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                  : "border-destructive/30 bg-destructive/10 text-destructive"
              }`}>
                {saveFeedback.message}
              </p>
            ) : null}
          </div>
        </main>
      </div>

      <footer className="fixed bottom-0 left-1/2 z-50 w-full max-w-[430px] -translate-x-1/2 border-t border-white/10 bg-[hsl(var(--background-strong)/0.98)] px-5 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] pt-3 backdrop-blur md:max-w-[1180px] md:px-7">
        <button
          type="button"
          onClick={finishWorkout}
          disabled={saving}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-transparent text-sm font-black text-foreground disabled:opacity-60"
        >
          <Flag className="h-5 w-5" />
          {saving ? "Finalizando..." : "Finalizar treino"}
        </button>
        <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
          <MetaIcon icon={Repeat2}>{formatTimerDisplay(elapsedSeconds)}</MetaIcon>
          <MetaIcon icon={Trophy}>Máx: {maxWeight ? `${formatWeight(maxWeight)}kg` : "—"}</MetaIcon>
          <MetaIcon icon={Repeat2}>{totalCompletedSets || totalSets} séries</MetaIcon>
          <MetaIcon icon={Flame}>{formatNumberValue(calories)} kcal</MetaIcon>
        </div>
      </footer>

      {numpadTarget ? (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60" onClick={closeNumpad}>
          <div
            className="w-full max-w-[430px] rounded-t-[1.5rem] border border-white/10 bg-card px-5 pb-[calc(env(safe-area-inset-bottom,0px)+1.25rem)] pt-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-secondary" />
            <p className="text-center text-xs font-semibold text-muted-foreground">
              {numpadTarget.kind === "calories"
                ? "Calorias gastas (kcal)"
                : numpadTarget.field === "weight"
                  ? "Peso (kg)"
                  : "Repetições"}
            </p>
            <p className="my-4 min-h-12 text-center font-mono text-4xl font-black text-primary">
              {numpadValue || "0"}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0"].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleNumpadInput(value)}
                  className="h-14 rounded-xl border border-white/10 bg-secondary text-xl font-black text-foreground"
                >
                  {value}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setNumpadValue((current) => current.slice(0, -1))}
                className="flex h-14 items-center justify-center rounded-xl border border-white/10 bg-secondary text-primary"
              >
                <Delete className="h-5 w-5" />
              </button>
            </div>
            <button
              type="button"
              onClick={confirmNumpad}
              className="mt-3 h-12 w-full rounded-xl bg-primary text-sm font-black text-primary-foreground"
            >
              Confirmar
            </button>
          </div>
        </div>
      ) : null}

      <UnsavedChangesDialog
        open={isBlocked}
        onDiscard={handleDiscardAndNavigate}
        onSave={handleSaveAndNavigate}
        onContinue={reset}
        saving={saving}
      />
    </div>
  );
}
