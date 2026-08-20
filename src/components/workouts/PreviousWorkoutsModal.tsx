import { useState, useEffect, useCallback } from "react";
import { ptBR } from "date-fns/locale";
import { Search, Dumbbell, X, Check } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { fetchStrengthWorkouts } from "@/lib/workoutApi";
import { formatDateSafe } from "@/lib/dateUtils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ExerciseSet {
  reps: number;
  weight: number;
}

interface Exercise {
  name: string;
  sets: ExerciseSet[];
}

interface Workout {
  id: string;
  date: string;
  objective: string;
  exercises: Exercise[];
  duration_min: number | null;
  calories: number | null;
}

interface PreviousWorkoutsModalProps {
  open: boolean;
  onClose: () => void;
  onSelectWorkout: (workout: Workout) => void;
  workoutType: string;
}

export function PreviousWorkoutsModal({
  open,
  onClose,
  onSelectWorkout,
  workoutType,
}: PreviousWorkoutsModalProps) {
  const { user } = useAuth();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchWorkouts = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const workouts = await fetchStrengthWorkouts();
      setWorkouts(
        workouts
          .filter((workout) => workout.workout_type === workoutType)
          .slice(0, 30) as Workout[],
      );
    } catch (error) {
      console.error("Erro ao buscar treinos:", error);
    } finally {
      setLoading(false);
    }
  }, [user, workoutType]);

  useEffect(() => {
    if (open && user) {
      void fetchWorkouts();
    }
  }, [fetchWorkouts, open, user]);

  const filteredWorkouts = workouts.filter((w) =>
    w.objective.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (workout: Workout) => {
    onSelectWorkout(workout);
    onClose();
  };

  const formatWorkoutDate = (dateStr: string) => {
    return formatDateSafe(dateStr, "dd/MM/yyyy (EEEE)", {
      locale: ptBR,
      noon: true,
      fallback: "Data indisponivel",
    });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-accent" />
            Treinos Anteriores
          </DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por treino (ex: Pernas)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Workouts List */}
        <ScrollArea className="flex-1 -mx-6 px-6">
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">
              Carregando...
            </div>
          ) : filteredWorkouts.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              {searchTerm
                ? "Nenhum treino encontrado"
                : "Nenhum treino anterior"}
            </div>
          ) : (
            <div className="space-y-3 py-2">
              {filteredWorkouts.map((workout) => (
                <div
                  key={workout.id}
                  className="bg-muted/50 rounded-lg p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{workout.objective}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatWorkoutDate(workout.date)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleSelect(workout)}
                      className="shrink-0"
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Usar
                    </Button>
                  </div>

                  {/* Exercise Preview */}
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium">
                      {workout.exercises.length} exercícios:
                    </span>{" "}
                    {workout.exercises
                      .slice(0, 3)
                      .map((e) => e.name)
                      .join(", ")}
                    {workout.exercises.length > 3 && "..."}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
