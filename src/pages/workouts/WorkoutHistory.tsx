import { useState, useMemo } from 'react';
import { ArrowLeft, Calendar, Clock, Flame, Eye, Trash2, Pencil, Dumbbell, Plus, Home, PersonStanding, Footprints, Bike, Zap, MapPin, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';
import { formatDuration } from '@/lib/formatDuration';
import { api } from '@/lib/api';
import { formatDateSafe, parseDateValue } from '@/lib/dateUtils';
import { formatWorkoutFocusObjective, getSelectedWorkoutFocusLabels, workoutFocusOptions } from '@/lib/workoutFocus';
import { fetchCardioWorkouts, fetchStrengthWorkouts } from '@/lib/workoutApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { handleIntegerKeyDown, handleDecimalKeyDown } from '@/lib/inputValidation';

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
  duration_min: number | null;
  calories: number | null;
  exercises: Exercise[];
  created_at: string;
  workout_type?: string;
}

interface CardioWorkout {
  id: string;
  date: string;
  workout_type: string;
  duration_min: number | null;
  distance_km: number | null;
  calories: number | null;
  notes: string | null;
  created_at: string;
}

type FilterType = 'todos' | 'musculacao' | 'cardio';

const workoutTypeIcons: Record<string, React.ElementType> = {
  academia: Dumbbell,
  'em-casa': Home,
  crossfit: Flame,
  calistenia: PersonStanding,
  corrida: Footprints,
  ciclismo: Bike,
  hiit: Zap,
};

const workoutTypeLabels: Record<string, string> = {
  academia: 'Academia',
  'em-casa': 'Em Casa',
  crossfit: 'CrossFit',
  calistenia: 'Calistenia',
  corrida: 'Corrida',
  ciclismo: 'Ciclismo',
  hiit: 'HIIT',
};

// For "Outras" activities, get icon and label dynamically
const getCardioIcon = (workoutType: string): React.ElementType => {
  return workoutTypeIcons[workoutType] || Activity;
};

const getCardioLabel = (workoutType: string): string => {
  return workoutTypeLabels[workoutType] || workoutType;
};

const formatDate = (dateString: string): string => {
  return formatDateSafe(dateString, 'dd MMM yyyy', {
    locale: ptBR,
    noon: true,
    fallback: 'Data indisponivel',
  });
};

const formatTimestamp = (timestamp: string): string => {
  return formatDateSafe(timestamp, "dd MMM yyyy, HH:mm", {
    locale: ptBR,
    fallback: 'Data indisponivel',
  });
};

const getSortableDate = (primary: unknown, fallback: unknown) =>
  parseDateValue(primary) ?? parseDateValue(fallback, { noon: true }) ?? new Date(0);

export default function WorkoutHistory() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterType>('todos');
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null);
  const [deleteWorkout, setDeleteWorkout] = useState<Workout | null>(null);
  const [selectedCardio, setSelectedCardio] = useState<CardioWorkout | null>(null);
  const [deleteCardio, setDeleteCardio] = useState<CardioWorkout | null>(null);

  // Edit form state
  const [editObjective, setEditObjective] = useState('');
  const [editExercises, setEditExercises] = useState<Exercise[]>([]);
  const [editDuration, setEditDuration] = useState<number | ''>('');
  const [editCalories, setEditCalories] = useState<number | ''>('');
  const selectedEditFocusLabels = getSelectedWorkoutFocusLabels(editObjective);
  const hasLegacyEditObjective = Boolean(editObjective.trim()) && selectedEditFocusLabels.length === 0;

  const toggleEditWorkoutFocus = (focus: string) => {
    const selectedSet = new Set(selectedEditFocusLabels);

    if (selectedSet.has(focus)) {
      selectedSet.delete(focus);
    } else {
      selectedSet.add(focus);
    }

    setEditObjective(formatWorkoutFocusObjective(Array.from(selectedSet)));
  };

  const { data: workouts, isLoading } = useQuery({
    queryKey: ['workouts', user?.id],
    queryFn: async () => {
      if (!user) return [];
      return fetchStrengthWorkouts() as Promise<Workout[]>;
    },
    enabled: !!user
  });

  const { data: cardioWorkouts } = useQuery({
    queryKey: ['cardio_workouts', user?.id],
    queryFn: async () => {
      if (!user) return [];
      return fetchCardioWorkouts() as Promise<CardioWorkout[]>;
    },
    enabled: !!user
  });

  // Filter workouts based on selected filter
  const filteredWorkouts = useMemo(() => (workouts ?? []).filter(w => {
    if (filter === 'todos') return true;
    if (filter === 'musculacao') return true; // All workouts in workouts table are musculação
    return false;
  }), [filter, workouts]);

  const filteredCardio = useMemo(() => (cardioWorkouts ?? []).filter(w => {
    if (filter === 'todos') return true;
    if (filter === 'cardio') return true;
    return false;
  }), [cardioWorkouts, filter]);

  const totalCount = (filter === 'todos' 
    ? (workouts?.length || 0) + (cardioWorkouts?.length || 0)
    : filter === 'musculacao' 
      ? (workouts?.length || 0)
      : (cardioWorkouts?.length || 0));

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/workouts/strength/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
      toast.success('Treino excluído com sucesso');
      setDeleteWorkout(null);
    },
    onError: (error: any) => {
      toast.error('Erro ao excluir: ' + error.message);
    }
  });

  const deleteCardioMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/workouts/cardio/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cardio_workouts'] });
      toast.success('Treino cardio excluído com sucesso');
      setDeleteCardio(null);
    },
    onError: (error: any) => {
      toast.error('Erro ao excluir: ' + error.message);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (workout: { id: string; objective: string; exercises: Exercise[]; duration_min: number | null; calories: number | null }) => {
      await api.patch(`/workouts/strength/${workout.id}`, {
          objective: workout.objective,
          exercises: workout.exercises,
          duration_min: workout.duration_min,
          calories: workout.calories,
          workout_type: editingWorkout?.workout_type || 'academia',
        });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
      toast.success('Treino atualizado com sucesso');
      setEditingWorkout(null);
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar: ' + error.message);
    }
  });

  const openEditModal = (workout: Workout) => {
    setEditObjective(workout.objective);
    setEditExercises(workout.exercises.length > 0 ? workout.exercises : [{ name: '', sets: [{ reps: 0, weight: 0 }] }]);
    setEditDuration(workout.duration_min || '');
    setEditCalories(workout.calories || '');
    setEditingWorkout(workout);
  };

  const handleSaveEdit = () => {
    if (!editingWorkout) return;
    if (!editObjective.trim()) {
      toast.error('Informe o tipo de treino');
      return;
    }
    const validExercises = editExercises.filter(e => e.name.trim());
    if (validExercises.length === 0) {
      toast.error('Adicione pelo menos um exercício');
      return;
    }
    updateMutation.mutate({
      id: editingWorkout.id,
      objective: editObjective.trim(),
      exercises: validExercises,
      duration_min: editDuration || null,
      calories: editCalories || null
    });
  };

  const addExercise = () => {
    setEditExercises([...editExercises, { name: '', sets: [{ reps: 0, weight: 0 }] }]);
  };

  const removeExercise = (index: number) => {
    if (editExercises.length > 1) {
      setEditExercises(editExercises.filter((_, i) => i !== index));
    }
  };

  const updateExerciseName = (index: number, name: string) => {
    const updated = [...editExercises];
    updated[index].name = name;
    setEditExercises(updated);
  };

  const addSet = (exerciseIndex: number) => {
    const updated = [...editExercises];
    updated[exerciseIndex].sets.push({ reps: 0, weight: 0 });
    setEditExercises(updated);
  };

  const removeSet = (exerciseIndex: number, setIndex: number) => {
    const updated = [...editExercises];
    if (updated[exerciseIndex].sets.length > 1) {
      updated[exerciseIndex].sets = updated[exerciseIndex].sets.filter((_, i) => i !== setIndex);
      setEditExercises(updated);
    }
  };

  const updateSet = (exerciseIndex: number, setIndex: number, field: keyof ExerciseSet, value: number) => {
    const updated = [...editExercises];
    updated[exerciseIndex].sets[setIndex][field] = value;
    setEditExercises(updated);
  };

  // Combine and sort all workouts by date
  const combinedWorkouts = useMemo(() => {
    const musculacao = (filteredWorkouts || []).map(w => ({
      ...w,
      itemType: 'musculacao' as const,
      sortDate: getSortableDate(w.created_at, w.date)
    }));
    
    const cardio = (filteredCardio || []).map(c => ({
      ...c,
      itemType: 'cardio' as const,
      sortDate: getSortableDate(c.created_at, c.date)
    }));
    
    return [...musculacao, ...cardio].sort((a, b) => 
      b.sortDate.getTime() - a.sortDate.getTime()
    );
  }, [filteredWorkouts, filteredCardio]);

  return (
    <div className="p-4 pb-24 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/workouts" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Histórico de Treinos</h1>
          <p className="text-muted-foreground text-sm">
            {totalCount} treinos registrados
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Button
          variant={filter === 'todos' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('todos')}
          className={cn(
            filter === 'todos' 
              ? 'bg-accent text-accent-foreground' 
              : 'border-border'
          )}
        >
          Todos
        </Button>
        <Button
          variant={filter === 'musculacao' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('musculacao')}
          className={cn(
            filter === 'musculacao' 
              ? 'bg-accent text-accent-foreground' 
              : 'border-border'
          )}
        >
          <Dumbbell className="w-4 h-4 mr-1" />
          Musculação
        </Button>
        <Button
          variant={filter === 'cardio' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('cardio')}
          className={cn(
            filter === 'cardio' 
              ? 'bg-accent text-accent-foreground' 
              : 'border-border'
          )}
        >
          <Footprints className="w-4 h-4 mr-1" />
          Cardio
        </Button>
      </div>

      {/* Workout List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-card rounded-xl p-4 animate-pulse">
              <div className="h-5 bg-muted rounded w-1/3 mb-2" />
              <div className="h-4 bg-muted rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : totalCount === 0 ? (
        <div className="bg-card rounded-xl p-8 text-center">
          <Dumbbell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Nenhum treino registrado ainda</p>
          <Link to="/workouts">
            <Button className="mt-4 bg-accent text-accent-foreground hover:bg-accent/90">
              Registrar Primeiro Treino
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {combinedWorkouts.map((item) => {
            if (item.itemType === 'musculacao') {
              const workout = item as typeof item & Workout;
              const TypeIcon = workoutTypeIcons[workout.workout_type || 'academia'] || Dumbbell;
              return (
                <div key={`workout-${workout.id}`} className="bg-card rounded-xl p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center shrink-0 mt-1">
                      <TypeIcon className="w-5 h-5 text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg truncate">{workout.objective}</h3>
                      <div className="flex items-center gap-2 text-muted-foreground text-sm flex-wrap">
                        <Calendar className="w-4 h-4 shrink-0" />
                        <span>{formatDate(workout.date)}</span>
                        <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full">
                          {workoutTypeLabels[workout.workout_type || 'academia'] || 'Academia'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 text-sm flex-wrap">
                      {workout.duration_min && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="w-4 h-4 text-accent" />
                          <span>{formatDuration(workout.duration_min)}</span>
                        </div>
                      )}
                      {workout.calories && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Flame className="w-4 h-4 text-accent" />
                          <span>{workout.calories} kcal</span>
                        </div>
                      )}
                      <div className="text-muted-foreground">
                        {workout.exercises.length} exerc.
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(workout)}
                        className="text-muted-foreground hover:text-accent h-8 w-8 p-0"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteWorkout(workout)}
                        className="text-muted-foreground hover:text-destructive h-8 w-8 p-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedWorkout(workout)}
                        className="border-accent text-accent hover:bg-accent hover:text-accent-foreground h-8 px-2"
                      >
                        <Eye className="w-4 h-4" />
                        <span className="hidden sm:inline ml-1">Detalhes</span>
                      </Button>
                    </div>
                  </div>
                </div>
              );
            } else {
              const cardio = item as typeof item & CardioWorkout;
              const TypeIcon = getCardioIcon(cardio.workout_type);
              return (
                <div key={`cardio-${cardio.id}`} className="bg-card rounded-xl p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center shrink-0 mt-1">
                      <TypeIcon className="w-5 h-5 text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg truncate">
                        {getCardioLabel(cardio.workout_type)}
                      </h3>
                      <div className="flex items-center gap-2 text-muted-foreground text-sm flex-wrap">
                        <Calendar className="w-4 h-4 shrink-0" />
                        <span>{formatDate(cardio.date)}</span>
                        <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full">
                          Cardio
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 text-sm flex-wrap">
                      {cardio.duration_min && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="w-4 h-4 text-accent" />
                          <span>{formatDuration(cardio.duration_min)}</span>
                        </div>
                      )}
                      {cardio.distance_km && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <MapPin className="w-4 h-4 text-accent" />
                          <span>{Number(cardio.distance_km).toFixed(2)} km</span>
                        </div>
                      )}
                      {cardio.calories && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Flame className="w-4 h-4 text-accent" />
                          <span>{cardio.calories} kcal</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteCardio(cardio)}
                        className="text-muted-foreground hover:text-destructive h-8 w-8 p-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedCardio(cardio)}
                        className="border-accent text-accent hover:bg-accent hover:text-accent-foreground h-8 px-2"
                      >
                        <Eye className="w-4 h-4" />
                        <span className="hidden sm:inline ml-1">Detalhes</span>
                      </Button>
                    </div>
                  </div>
                </div>
              );
            }
          })}
        </div>
      )}

      {/* View Details Modal */}
      <Dialog open={!!selectedWorkout} onOpenChange={() => setSelectedWorkout(null)}>
        <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">{selectedWorkout?.objective}</DialogTitle>
          </DialogHeader>
          
          {selectedWorkout && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {formatDate(selectedWorkout.date)}
                </div>
                {selectedWorkout.duration_min && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4 text-accent" />
                    {formatDuration(selectedWorkout.duration_min)}
                  </div>
                )}
                {selectedWorkout.calories && (
                  <div className="flex items-center gap-1">
                    <Flame className="w-4 h-4 text-accent" />
                    {selectedWorkout.calories} kcal
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold">Exercícios</h4>
                {selectedWorkout.exercises.map((exercise, idx) => (
                  <div key={idx} className="bg-background rounded-lg p-3">
                    <h5 className="font-medium mb-2">{exercise.name}</h5>
                    <div className="space-y-1">
                      {exercise.sets.map((set, setIdx) => (
                        <div key={setIdx} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="text-xs w-6">#{setIdx + 1}</span>
                          <span>{set.reps} reps</span>
                          <span>×</span>
                          <span>{set.weight} kg</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-xs text-muted-foreground pt-2 border-t border-border">
                Criado em: {formatTimestamp(selectedWorkout.created_at)}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={!!editingWorkout} onOpenChange={() => setEditingWorkout(null)}>
        <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Editar Treino</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Foco do treino</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {workoutFocusOptions.map((focus) => {
                  const selected = selectedEditFocusLabels.includes(focus);

                  return (
                    <button
                      key={focus}
                      type="button"
                      onClick={() => toggleEditWorkoutFocus(focus)}
                      className={cn(
                        'flex min-h-10 items-center justify-center rounded-xl border px-3 py-2 text-sm font-semibold transition-colors',
                        selected
                          ? 'border-accent/45 bg-accent/15 text-accent'
                          : 'border-white/5 bg-background text-muted-foreground hover:bg-secondary hover:text-foreground'
                      )}
                    >
                      {focus}
                    </button>
                  );
                })}
              </div>
              {(editObjective || hasLegacyEditObjective) && (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-background px-3 py-2">
                  <span className="min-w-0 truncate text-sm font-medium text-foreground">
                    {editObjective || 'Nenhum foco selecionado'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setEditObjective('')}
                    className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    Limpar
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Exercícios</Label>
                <Button
                  onClick={addExercise}
                  variant="outline"
                  size="sm"
                  className="border-accent text-accent hover:bg-accent hover:text-accent-foreground"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar
                </Button>
              </div>

              {editExercises.map((exercise, exerciseIndex) => (
                <div key={exerciseIndex} className="bg-background rounded-lg p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Exercício {exerciseIndex + 1}</span>
                    {editExercises.length > 1 && (
                      <button type="button" onClick={() => removeExercise(exerciseIndex)} className="text-destructive hover:text-destructive/80">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <Input
                    placeholder="Nome do exercício"
                    value={exercise.name}
                    onChange={(e) => updateExerciseName(exerciseIndex, e.target.value)}
                    className="bg-card border-border"
                  />
                  <div className="space-y-2">
                    {exercise.sets.map((set, setIndex) => (
                      <div key={setIndex} className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-6">{setIndex + 1}.</span>
                        <Input
                          type="text"
                          inputMode="numeric"
                          placeholder="Reps"
                          maxLength={4}
                          value={set.reps || ''}
                          onKeyDown={handleIntegerKeyDown}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9]/g, '');
                            updateSet(exerciseIndex, setIndex, 'reps', Number(value) || 0);
                          }}
                          className="bg-card border-border text-sm"
                        />
                        <div className="relative flex-1">
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder="Peso"
                            maxLength={6}
                            value={set.weight || ''}
                            onKeyDown={handleDecimalKeyDown}
                            onChange={(e) => {
                              const sanitized = e.target.value.replace(/[^0-9,]/g, '');
                              const numValue = parseFloat(sanitized.replace(',', '.')) || 0;
                              updateSet(exerciseIndex, setIndex, 'weight', numValue);
                            }}
                            className="bg-card border-border text-sm pr-8"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">kg</span>
                        </div>
                        {exercise.sets.length > 1 && (
                          <button type="button" onClick={() => removeSet(exerciseIndex, setIndex)} className="text-destructive/60 hover:text-destructive p-1">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                    <Button onClick={() => addSet(exerciseIndex)} variant="ghost" size="sm" className="w-full text-accent hover:text-accent hover:bg-accent/10">
                      <Plus className="w-3 h-3 mr-1" />
                      Adicionar Série
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-accent" />
                  <Label className="text-sm">Duração (min)</Label>
                </div>
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  value={editDuration}
                  onKeyDown={handleIntegerKeyDown}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, '');
                    setEditDuration(value ? Number(value) : '');
                  }}
                  className="bg-background border-border"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-accent" />
                  <Label className="text-sm">Calorias</Label>
                </div>
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={5}
                  value={editCalories}
                  onKeyDown={handleIntegerKeyDown}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, '');
                    setEditCalories(value ? Number(value) : '');
                  }}
                  className="bg-background border-border"
                />
              </div>
            </div>

            <Button
              onClick={handleSaveEdit}
              disabled={updateMutation.isPending}
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {updateMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteWorkout} onOpenChange={() => setDeleteWorkout(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir treino?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O treino "{deleteWorkout?.objective}" será permanentemente excluído.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteWorkout && deleteMutation.mutate(deleteWorkout.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Cardio Confirmation */}
      <AlertDialog open={!!deleteCardio} onOpenChange={() => setDeleteCardio(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir treino cardio?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O treino "{workoutTypeLabels[deleteCardio?.workout_type || ''] || 'Cardio'}" será permanentemente excluído.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteCardio && deleteCardioMutation.mutate(deleteCardio.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteCardioMutation.isPending ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cardio Details Modal */}
      <Dialog open={!!selectedCardio} onOpenChange={() => setSelectedCardio(null)}>
        <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {workoutTypeLabels[selectedCardio?.workout_type || ''] || 'Cardio'}
            </DialogTitle>
          </DialogHeader>
          
          {selectedCardio && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {formatDate(selectedCardio.date)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {selectedCardio.duration_min && (
                  <div className="bg-background rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-4 h-4 text-accent" />
                      <span className="text-sm text-muted-foreground">Duração</span>
                    </div>
                    <p className="text-lg font-semibold">{formatDuration(selectedCardio.duration_min)}</p>
                  </div>
                )}
                {selectedCardio.distance_km && (
                  <div className="bg-background rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className="w-4 h-4 text-accent" />
                      <span className="text-sm text-muted-foreground">Distância</span>
                    </div>
                    <p className="text-lg font-semibold">{Number(selectedCardio.distance_km).toFixed(2)} km</p>
                  </div>
                )}
                {selectedCardio.calories && (
                  <div className="bg-background rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Flame className="w-4 h-4 text-accent" />
                      <span className="text-sm text-muted-foreground">Calorias</span>
                    </div>
                    <p className="text-lg font-semibold">{selectedCardio.calories} kcal</p>
                  </div>
                )}
              </div>

              {selectedCardio.notes && (
                <div className="bg-background rounded-lg p-3">
                  <h4 className="font-semibold mb-2">Observações</h4>
                  <p className="text-sm text-muted-foreground">{selectedCardio.notes}</p>
                </div>
              )}

              <div className="text-xs text-muted-foreground pt-2 border-t border-border">
                Criado em: {formatTimestamp(selectedCardio.created_at)}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
