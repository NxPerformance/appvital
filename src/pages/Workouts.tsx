import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Crown,
  Dumbbell,
  Flame,
  Footprints,
  Info,
  Lock,
  Pencil,
  Play,
  Plus,
  Search,
  Trophy,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { addMonths, endOfMonth, format, isAfter, isSameMonth, parseISO, startOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { useProfile } from '@/hooks/useProfile';
import { fetchCardioWorkouts, fetchStrengthWorkouts, type CardioWorkoutApi, type StrengthWorkoutApi } from '@/lib/workoutApi';
import type { WorkoutStartState } from '@/lib/workoutStart';
import { cn } from '@/lib/utils';

type WorkoutSource = 'free' | 'personal' | 'suggested';
type WorkoutLevel = 'Médio' | 'Avançado' | 'Leve';
type ActiveTab = 'library' | 'mine' | 'history';
type FreeWorkoutStep = 'muscle' | 'exercises' | 'active' | 'done';

interface WorkoutSet {
  id: string;
  reps: number;
  weightKg: number;
  completed?: boolean;
}

interface Exercise {
  id: string;
  name: string;
  muscleGroup: string;
  equipment: string;
  durationMin?: number;
  calories?: number;
  animationLabel: string;
  premiumOnly?: boolean;
}

interface WorkoutExercise {
  id: string;
  exercise: Exercise;
  order: number;
  sets: WorkoutSet[];
  notes?: string;
}

interface Workout {
  id: string;
  title: string;
  trainerName: string;
  source: WorkoutSource;
  level: WorkoutLevel;
  durationMin: number;
  calories: number;
  exercises: WorkoutExercise[];
  muscleFocus: string;
  route: string;
  premiumOnly?: boolean;
  highlight?: boolean;
}

interface MuscleGroup {
  id: string;
  label: string;
  count: string;
  route: string;
  icon: LucideIcon;
  tone: string;
}

interface HistoryWorkout {
  id: string;
  date: Date;
  title: string;
  durationMin: number;
  calories: number;
  liftedKg: number;
  series: number;
  exercises: number;
  type: 'strength' | 'cardio';
}

const tabs: Array<{ id: ActiveTab; label: string }> = [
  { id: 'library', label: 'Biblioteca' },
  { id: 'mine', label: 'Meus Treinos' },
  { id: 'history', label: 'Histórico' },
];

type CommonExerciseGroup = MuscleGroup & {
  exercises: string[];
};

const strengthWorkoutRoute = '/workouts/musculacao/academia';

const commonExerciseGroups: CommonExerciseGroup[] = [
  {
    id: 'peito',
    label: 'Peito',
    count: '5 exercícios',
    route: strengthWorkoutRoute,
    icon: Dumbbell,
    tone: 'from-primary/18 to-primary/5',
    exercises: ['Supino reto', 'Supino inclinado', 'Crucifixo', 'Crossover', 'Flexão de braços'],
  },
  {
    id: 'costas',
    label: 'Costas',
    count: '5 exercícios',
    route: strengthWorkoutRoute,
    icon: Dumbbell,
    tone: 'from-sky-500/18 to-sky-500/5',
    exercises: ['Puxada frontal', 'Barra fixa', 'Remada curvada', 'Remada baixa', 'Remada unilateral'],
  },
  {
    id: 'ombros',
    label: 'Ombros',
    count: '5 exercícios',
    route: strengthWorkoutRoute,
    icon: Activity,
    tone: 'from-violet-500/18 to-violet-500/5',
    exercises: ['Desenvolvimento', 'Elevação lateral', 'Elevação frontal', 'Crucifixo inverso', 'Face pull'],
  },
  {
    id: 'biceps',
    label: 'Bíceps',
    count: '5 exercícios',
    route: strengthWorkoutRoute,
    icon: Dumbbell,
    tone: 'from-emerald-500/18 to-emerald-500/5',
    exercises: ['Rosca direta', 'Rosca alternada', 'Rosca martelo', 'Rosca Scott', 'Rosca concentrada'],
  },
  {
    id: 'triceps',
    label: 'Tríceps',
    count: '5 exercícios',
    route: strengthWorkoutRoute,
    icon: Dumbbell,
    tone: 'from-orange-500/18 to-orange-500/5',
    exercises: ['Tríceps pulley', 'Tríceps corda', 'Tríceps testa', 'Tríceps francês', 'Paralelas'],
  },
  {
    id: 'quadriceps',
    label: 'Quadríceps',
    count: '5 exercícios',
    route: strengthWorkoutRoute,
    icon: Footprints,
    tone: 'from-amber-500/18 to-amber-500/5',
    exercises: ['Agachamento livre', 'Leg press', 'Cadeira extensora', 'Agachamento búlgaro', 'Afundo'],
  },
  {
    id: 'posterior_de_coxa',
    label: 'Posterior de coxa',
    count: '4 exercícios',
    route: strengthWorkoutRoute,
    icon: Footprints,
    tone: 'from-rose-500/18 to-rose-500/5',
    exercises: ['Stiff', 'Levantamento terra romeno', 'Mesa flexora', 'Cadeira flexora'],
  },
  {
    id: 'gluteos',
    label: 'Glúteos',
    count: '5 exercícios',
    route: strengthWorkoutRoute,
    icon: Activity,
    tone: 'from-fuchsia-500/18 to-fuchsia-500/5',
    exercises: ['Elevação pélvica', 'Hip thrust', 'Agachamento sumô', 'Coice no cabo', 'Cadeira abdutora'],
  },
  {
    id: 'panturrilhas',
    label: 'Panturrilhas',
    count: '3 exercícios',
    route: strengthWorkoutRoute,
    icon: Footprints,
    tone: 'from-teal-500/18 to-teal-500/5',
    exercises: ['Panturrilha em pé', 'Panturrilha sentada', 'Panturrilha no leg press'],
  },
  {
    id: 'abdomen',
    label: 'Abdômen',
    count: '5 exercícios',
    route: strengthWorkoutRoute,
    icon: Activity,
    tone: 'from-lime-500/18 to-lime-500/5',
    exercises: ['Abdominal tradicional', 'Abdominal infra', 'Prancha', 'Abdominal bicicleta', 'Elevação de pernas'],
  },
];

const muscleGroups: MuscleGroup[] = commonExerciseGroups.map((group) => ({
  id: group.id,
  label: group.label,
  count: group.count,
  route: group.route,
  icon: group.icon,
  tone: group.tone,
}));

const groupExerciseDefaults: Record<string, { equipment: string; durationMin: number; calories: number }> = {
  peito: { equipment: 'Máquina ou peso livre', durationMin: 8, calories: 58 },
  costas: { equipment: 'Máquina ou peso livre', durationMin: 8, calories: 60 },
  ombros: { equipment: 'Halteres', durationMin: 7, calories: 48 },
  biceps: { equipment: 'Halteres ou barra', durationMin: 7, calories: 42 },
  triceps: { equipment: 'Polia ou halteres', durationMin: 7, calories: 44 },
  quadriceps: { equipment: 'Máquina ou peso livre', durationMin: 10, calories: 82 },
  posterior_de_coxa: { equipment: 'Máquina ou barra', durationMin: 9, calories: 72 },
  gluteos: { equipment: 'Máquina ou peso livre', durationMin: 10, calories: 78 },
  panturrilhas: { equipment: 'Máquina', durationMin: 6, calories: 34 },
  abdomen: { equipment: 'Solo', durationMin: 6, calories: 32 },
};

const exerciseEquipment: Record<string, string> = {
  'Supino reto': 'Barra',
  'Supino inclinado': 'Halteres',
  Crucifixo: 'Halteres',
  Crossover: 'Polia',
  'Flexão de braços': 'Peso corporal',
  'Puxada frontal': 'Polia',
  'Barra fixa': 'Peso corporal',
  'Remada curvada': 'Barra',
  'Remada baixa': 'Cabo',
  'Remada unilateral': 'Halter',
  Desenvolvimento: 'Halteres',
  'Elevação lateral': 'Halteres',
  'Elevação frontal': 'Halteres',
  'Crucifixo inverso': 'Halteres',
  'Face pull': 'Corda',
  'Rosca direta': 'Barra',
  'Rosca alternada': 'Halteres',
  'Rosca martelo': 'Halteres',
  'Rosca Scott': 'Banco Scott',
  'Rosca concentrada': 'Halter',
  'Tríceps pulley': 'Polia',
  'Tríceps corda': 'Corda',
  'Tríceps testa': 'Barra W',
  'Tríceps francês': 'Halter',
  Paralelas: 'Peso corporal',
  'Agachamento livre': 'Barra',
  'Leg press': 'Máquina',
  'Cadeira extensora': 'Máquina',
  'Agachamento búlgaro': 'Halteres',
  Afundo: 'Halteres',
  Stiff: 'Barra',
  'Levantamento terra romeno': 'Barra',
  'Mesa flexora': 'Máquina',
  'Cadeira flexora': 'Máquina',
  'Elevação pélvica': 'Barra',
  'Hip thrust': 'Barra',
  'Agachamento sumô': 'Halter',
  'Coice no cabo': 'Cabo',
  'Cadeira abdutora': 'Máquina',
  'Panturrilha em pé': 'Máquina',
  'Panturrilha sentada': 'Máquina',
  'Panturrilha no leg press': 'Leg press',
  'Abdominal tradicional': 'Solo',
  'Abdominal infra': 'Solo',
  Prancha: 'Solo',
  'Abdominal bicicleta': 'Solo',
  'Elevação de pernas': 'Solo',
};

function slugifyExerciseName(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function createExerciseFromName(group: CommonExerciseGroup, name: string): Exercise {
  const defaults = groupExerciseDefaults[group.id] ?? { equipment: 'Academia', durationMin: 8, calories: 50 };

  return {
    id: slugifyExerciseName(name),
    name,
    muscleGroup: group.id,
    equipment: exerciseEquipment[name] ?? defaults.equipment,
    durationMin: defaults.durationMin,
    calories: defaults.calories,
    animationLabel: `Execute ${name.toLowerCase()} com controle, amplitude segura e respiração constante.`,
  };
}

const exerciseLibrary: Exercise[] = [
  ...commonExerciseGroups.flatMap((group) => group.exercises.map((exercise) => createExerciseFromName(group, exercise))),
  {
    id: 'corrida-intervalada',
    name: 'Corrida intervalada',
    muscleGroup: 'corrida',
    equipment: 'Esteira',
    durationMin: 18,
    calories: 180,
    animationLabel: 'Alterne esforço forte e recuperação leve.',
  },
  {
    id: 'mobilidade-quadril',
    name: 'Mobilidade de quadril',
    muscleGroup: 'mobilidade',
    equipment: 'Solo',
    durationMin: 12,
    calories: 35,
    animationLabel: 'Mantenha respiração longa e amplitude confortável.',
  },
  {
    id: 'bike-hiit',
    name: 'Bike HIIT',
    muscleGroup: 'cardio',
    equipment: 'Bike',
    durationMin: 20,
    calories: 220,
    animationLabel: 'Acelere em blocos curtos com recuperação ativa.',
    premiumOnly: true,
  },
];

function buildCategoryWorkoutStart(group: CommonExerciseGroup): WorkoutStartState {
  const exercises = exerciseLibrary.filter((exercise) => exercise.muscleGroup === group.id);

  return {
    source: 'suggested',
    objective: group.label,
    trainerName: 'Biblioteca Vitalissy',
    calories: exercises.reduce((sum, exercise) => sum + (exercise.calories ?? 0), 0),
    exercises: exercises.map((exercise) => ({
      name: exercise.name,
      group: group.label,
      category: exercise.equipment,
      location: 'Academia',
      sets: [
        { weight: 0, reps: 12, completed: false },
        { weight: 0, reps: 10, completed: false },
        { weight: 0, reps: 8, completed: false },
      ],
    })),
  };
}

const makeWorkoutExercise = (exerciseId: string, order: number): WorkoutExercise => {
  const exercise = exerciseLibrary.find((item) => item.id === exerciseId) ?? exerciseLibrary[0];

  return {
    id: `${exerciseId}-${order}`,
    exercise,
    order,
    sets: [
      { id: `${exerciseId}-1`, reps: 12, weightKg: order % 2 === 0 ? 22 : 18 },
      { id: `${exerciseId}-2`, reps: 10, weightKg: order % 2 === 0 ? 24 : 20 },
      { id: `${exerciseId}-3`, reps: 8, weightKg: order % 2 === 0 ? 26 : 22 },
    ],
  };
};

const personalWorkouts: Workout[] = [
  {
    id: 'personal-peito-triceps',
    title: 'Peito & Tríceps - Seg/Qui',
    trainerName: 'João Silva',
    source: 'personal',
    level: 'Médio',
    durationMin: 50,
    calories: 420,
    exercises: [makeWorkoutExercise('supino-reto', 1), makeWorkoutExercise('triceps-corda', 2), makeWorkoutExercise('remada-baixa', 3)],
    muscleFocus: 'Peito e tríceps',
    route: '/workouts/musculacao/academia',
  },
  {
    id: 'personal-costas-biceps',
    title: 'Costas & Bíceps - Ter/Sex',
    trainerName: 'João Silva',
    source: 'personal',
    level: 'Médio',
    durationMin: 45,
    calories: 380,
    exercises: [makeWorkoutExercise('remada-baixa', 1), makeWorkoutExercise('supino-reto', 2)],
    muscleFocus: 'Costas e bíceps',
    route: '/workouts/musculacao/academia',
  },
  {
    id: 'personal-pernas-gluteos',
    title: 'Pernas & Glúteos - Qua',
    trainerName: 'João Silva',
    source: 'personal',
    level: 'Avançado',
    durationMin: 60,
    calories: 510,
    exercises: [makeWorkoutExercise('agachamento-livre', 1), makeWorkoutExercise('mobilidade-quadril', 2)],
    muscleFocus: 'Pernas e glúteos',
    route: '/workouts/musculacao/academia',
  },
];

const suggestedWorkouts: Workout[] = [
  {
    id: 'full-body-burn',
    title: 'Full Body Queima Total',
    trainerName: 'Rafael Zulu',
    source: 'suggested',
    level: 'Médio',
    durationMin: 45,
    calories: 480,
    exercises: [makeWorkoutExercise('agachamento-livre', 1), makeWorkoutExercise('remada-baixa', 2), makeWorkoutExercise('bike-hiit', 3)],
    muscleFocus: 'Corpo inteiro',
    route: '/workouts/cardio/hiit',
    highlight: true,
  },
  {
    id: 'peito-triceps-hypertrophy',
    title: 'Peito & Tríceps Hipertrofia',
    trainerName: 'João Marão',
    source: 'suggested',
    level: 'Médio',
    durationMin: 50,
    calories: 390,
    exercises: [makeWorkoutExercise('supino-reto', 1), makeWorkoutExercise('triceps-corda', 2)],
    muscleFocus: 'Peito e tríceps',
    route: '/workouts/musculacao/academia',
  },
  {
    id: 'hiit-metabolico',
    title: 'HIIT Metabólico 30x30',
    trainerName: 'Rafael Zulu',
    source: 'suggested',
    level: 'Avançado',
    durationMin: 30,
    calories: 420,
    exercises: [makeWorkoutExercise('bike-hiit', 1), makeWorkoutExercise('corrida-intervalada', 2)],
    muscleFocus: 'Cardio',
    route: '/workouts/cardio/hiit',
    premiumOnly: true,
  },
];

function formatNumber(value: number) {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(Math.round(value));
}

function formatDuration(minutes: number) {
  const rounded = Math.max(0, Math.round(minutes));
  const hours = Math.floor(rounded / 60);
  const rest = rounded % 60;

  if (hours === 0) return `${rest} min`;
  if (rest === 0) return `${hours}h`;
  return `${hours}h${String(rest).padStart(2, '0')}`;
}

function parseWorkoutDate(date: string) {
  const parsed = parseISO(date);
  return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getStrengthVolume(exercises: unknown[]) {
  return exercises.reduce((total, exercise: any) => {
    const sets = Array.isArray(exercise?.sets) ? exercise.sets : [];

    return total + sets.reduce((setTotal: number, set: any) => {
      const reps = Number(set?.reps) || 0;
      const weight = Number(set?.weight ?? set?.weightKg) || 0;
      return setTotal + reps * weight;
    }, 0);
  }, 0);
}

function getSeriesCount(exercises: unknown[]) {
  return exercises.reduce((total, exercise: any) => total + (Array.isArray(exercise?.sets) ? exercise.sets.length : 0), 0);
}

function toHistoryWorkout(workout: StrengthWorkoutApi): HistoryWorkout {
  return {
    id: `strength-${workout.id}`,
    date: parseWorkoutDate(workout.date),
    title: workout.objective || 'Treino de força',
    durationMin: workout.duration_min ?? 0,
    calories: workout.calories ?? 0,
    liftedKg: getStrengthVolume(workout.exercises),
    series: getSeriesCount(workout.exercises),
    exercises: workout.exercises.length,
    type: 'strength',
  };
}

function toHistoryCardio(workout: CardioWorkoutApi): HistoryWorkout {
  const labels: Record<string, string> = {
    corrida: 'Corrida',
    ciclismo: 'Ciclismo',
    hiit: 'HIIT',
    outras: 'Cardio',
  };

  return {
    id: `cardio-${workout.id}`,
    date: parseWorkoutDate(workout.date),
    title: labels[workout.workout_type] || workout.workout_type || 'Cardio',
    durationMin: workout.duration_min ?? 0,
    calories: workout.calories ?? 0,
    liftedKg: 0,
    series: 0,
    exercises: 1,
    type: 'cardio',
  };
}

function SectionTitle({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-base font-extrabold tracking-tight text-foreground">{title}</h2>
      {action}
    </div>
  );
}

function MetaItem({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
      <Icon className="h-3.5 w-3.5 text-primary" />
      {children}
    </span>
  );
}

function TabButton({
  id,
  label,
  activeTab,
  onChange,
}: {
  id: ActiveTab;
  label: string;
  activeTab: ActiveTab;
  onChange: (tab: ActiveTab) => void;
}) {
  const active = id === activeTab;

  return (
    <button
      type="button"
      onClick={() => onChange(id)}
      className={cn(
        'h-9 flex-1 rounded-xl text-xs font-extrabold transition-colors',
        active ? 'bg-primary text-primary-foreground shadow-glow' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {label}
    </button>
  );
}

function IconTile({
  icon: Icon,
  className,
}: {
  icon: LucideIcon;
  className?: string;
}) {
  return (
    <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary', className)}>
      <Icon className="h-5 w-5" />
    </span>
  );
}

function WorkoutPreviewCard({
  workout,
  locked,
  compact = false,
  onOpen,
  onInfo,
}: {
  workout: Workout;
  locked?: boolean;
  compact?: boolean;
  onOpen: () => void;
  onInfo?: (exercise: Exercise) => void;
}) {
  const Icon = workout.level === 'Avançado' ? Zap : Dumbbell;

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'group relative overflow-hidden rounded-[1rem] border border-white/10 bg-card text-left shadow-elegant transition-transform hover:-translate-y-0.5',
        compact ? 'min-h-[176px]' : 'w-full',
      )}
    >
      {compact ? (
        <div className={cn('flex h-[92px] items-center justify-center', workout.level === 'Avançado' ? 'bg-orange-700/45' : 'bg-secondary')}>
          <Icon className={cn('h-8 w-8', workout.level === 'Avançado' ? 'text-orange-300' : 'text-primary/65')} />
        </div>
      ) : null}

      <div className={cn('relative', compact ? 'p-3' : 'flex items-center gap-3 p-4')}>
        {!compact ? <IconTile icon={Icon} className="bg-primary/10" /> : null}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <span
                className={cn(
                  'mb-1 inline-flex rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em]',
                  workout.level === 'Avançado' ? 'bg-orange-500/20 text-orange-300' : 'bg-primary/15 text-primary',
                )}
              >
                {workout.level}
              </span>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-primary">{workout.trainerName}</p>
              <h3 className={cn('mt-0.5 font-extrabold leading-tight text-foreground', compact ? 'text-sm' : 'text-base')}>
                {workout.title}
              </h3>
            </div>

            {locked ? (
              <Lock className="h-4 w-4 shrink-0 text-primary" />
            ) : !compact ? (
              <Play className="h-5 w-5 shrink-0 text-primary" />
            ) : null}
          </div>

          <div className={cn('mt-2 flex flex-wrap items-center gap-x-3 gap-y-1', compact ? 'text-[10px]' : '')}>
            <MetaItem icon={Clock3}>{formatDuration(workout.durationMin)}</MetaItem>
            <MetaItem icon={Flame}>{formatNumber(workout.calories)} kcal</MetaItem>
            {!compact ? <MetaItem icon={Dumbbell}>{workout.exercises.length} exercícios</MetaItem> : null}
          </div>
        </div>

        {onInfo ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onInfo(workout.exercises[0].exercise);
            }}
            className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
            aria-label="Ver animação do exercício"
          >
            <Info className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
    </button>
  );
}

function SummaryMetric({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-[0.9rem] border border-white/10 bg-card px-3 py-4 text-center">
      <p className="truncate text-lg font-black leading-none text-primary">{value}</p>
      <p className="mt-2 text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function FreeWorkoutDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const [step, setStep] = useState<FreeWorkoutStep>('muscle');
  const [selectedMuscle, setSelectedMuscle] = useState(muscleGroups[0].id);
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>(['supino-reto', 'supino-inclinado']);

  const currentMuscle = muscleGroups.find((item) => item.id === selectedMuscle) ?? muscleGroups[0];
  const availableExercises = exerciseLibrary.filter((exercise) => exercise.muscleGroup === selectedMuscle);
  const selectedExercises = exerciseLibrary.filter((exercise) => selectedExerciseIds.includes(exercise.id));
  const totalMinutes = selectedExercises.reduce((sum, exercise) => sum + (exercise.durationMin ?? 0), 0);
  const totalCalories = selectedExercises.reduce((sum, exercise) => sum + (exercise.calories ?? 0), 0);

  const toggleExercise = (exerciseId: string) => {
    setSelectedExerciseIds((current) =>
      current.includes(exerciseId)
        ? current.filter((item) => item !== exerciseId)
        : [...current, exerciseId],
    );
  };

  const closeFlow = () => {
    onOpenChange(false);
    window.setTimeout(() => setStep('muscle'), 180);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto max-w-[430px] rounded-t-[1.5rem] border border-white/10 bg-[hsl(var(--background))] px-5 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] pt-0 text-foreground [&>div:first-child]:mt-5 [&>div:first-child]:h-1 [&>div:first-child]:w-10 [&>div:first-child]:bg-secondary">
        <DrawerHeader className="px-0 pb-2 pt-5 text-left">
          <DrawerTitle className="text-base font-extrabold">
            {step === 'muscle' ? 'Treino livre' : step === 'exercises' ? currentMuscle.label : step === 'active' ? 'Treino ativo' : 'Treino concluído'}
          </DrawerTitle>
        </DrawerHeader>

        {step === 'muscle' ? (
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-muted-foreground">Escolha o foco muscular para montar um treino rápido.</p>
            <div className="grid grid-cols-2 gap-3">
              {muscleGroups.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => {
                    setSelectedMuscle(group.id);
                    setSelectedExerciseIds(
                      exerciseLibrary
                        .filter((exercise) => exercise.muscleGroup === group.id)
                        .slice(0, 2)
                        .map((exercise) => exercise.id),
                    );
                  }}
                  className={cn(
                    'rounded-[1rem] border bg-gradient-to-br p-4 text-left transition-colors',
                    group.tone,
                    selectedMuscle === group.id ? 'border-primary' : 'border-white/10',
                  )}
                >
                  <IconTile icon={group.icon} className="mb-4 h-9 w-9" />
                  <p className="font-extrabold">{group.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{group.count}</p>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setStep('exercises')}
              className="h-12 w-full rounded-xl bg-primary text-sm font-black text-primary-foreground"
            >
              Selecionar exercícios
            </button>
          </div>
        ) : null}

        {step === 'exercises' ? (
          <div className="space-y-4">
            <div className="grid gap-2">
              {availableExercises.map((exercise) => {
                const selected = selectedExerciseIds.includes(exercise.id);

                return (
                  <button
                    key={exercise.id}
                    type="button"
                    onClick={() => toggleExercise(exercise.id)}
                    className={cn(
                      'flex items-center gap-3 rounded-xl border p-3 text-left transition-colors',
                      selected ? 'border-primary bg-primary/10' : 'border-white/10 bg-card',
                    )}
                  >
                    <span className={cn('flex h-9 w-9 items-center justify-center rounded-xl', selected ? 'bg-primary text-primary-foreground' : 'bg-secondary text-primary')}>
                      {selected ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-extrabold">{exercise.name}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{exercise.equipment} · {exercise.durationMin} min</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setStep('muscle')}
                className="h-12 rounded-xl border border-white/10 bg-secondary text-sm font-bold text-foreground"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={selectedExerciseIds.length === 0}
                onClick={() => setStep('active')}
                className="h-12 rounded-xl bg-primary text-sm font-black text-primary-foreground disabled:opacity-50"
              >
                Iniciar
              </button>
            </div>
          </div>
        ) : null}

        {step === 'active' ? (
          <div className="space-y-4">
            <div className="rounded-[1rem] border border-primary/30 bg-primary/10 p-4 text-center">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-primary">Em andamento</p>
              <p className="mt-2 text-4xl font-black text-foreground">00:00</p>
              <p className="mt-1 text-xs text-muted-foreground">{selectedExercises.length} exercícios · {formatDuration(totalMinutes)}</p>
            </div>
            <div className="grid gap-2">
              {selectedExercises.map((exercise, index) => (
                <div key={exercise.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-card p-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-xs font-black text-primary">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{exercise.name}</span>
                    <span className="text-xs text-muted-foreground">3 séries sugeridas</span>
                  </span>
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setStep('done')}
              className="h-12 w-full rounded-xl bg-primary text-sm font-black text-primary-foreground"
            >
              Concluir treino
            </button>
          </div>
        ) : null}

        {step === 'done' ? (
          <div className="space-y-4">
            <div className="rounded-[1rem] border border-primary/30 bg-card p-5 text-center">
              <Trophy className="mx-auto h-10 w-10 text-primary" />
              <h3 className="mt-3 text-lg font-black">Treino finalizado</h3>
              <p className="mt-1 text-sm text-muted-foreground">Finalize o registro completo para salvar séries, cargas e observações.</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <SummaryMetric value={String(selectedExercises.length)} label="Exercícios" />
              <SummaryMetric value={formatDuration(totalMinutes)} label="Tempo" />
              <SummaryMetric value={formatNumber(totalCalories)} label="Kcal" />
            </div>
            <button
              type="button"
              onClick={() => navigate(currentMuscle.route)}
              className="h-12 w-full rounded-xl bg-primary text-sm font-black text-primary-foreground"
            >
              Registrar completo
            </button>
            <button
              type="button"
              onClick={closeFlow}
              className="h-11 w-full rounded-xl border border-white/10 bg-secondary text-sm font-bold text-foreground"
            >
              Fechar
            </button>
          </div>
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}

export default function Workouts() {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const hasPremiumAccess = Boolean(profile?.is_premium || profile?.is_admin || profile?.is_personal_trainer);
  const [activeTab, setActiveTab] = useState<ActiveTab>('library');
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [freeFlowOpen, setFreeFlowOpen] = useState(false);
  const [previewWorkout, setPreviewWorkout] = useState<Workout | null>(null);
  const [animationExercise, setAnimationExercise] = useState<Exercise | null>(null);
  const [premiumDialogOpen, setPremiumDialogOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => startOfMonth(new Date()));
  const [historyWorkouts, setHistoryWorkouts] = useState<HistoryWorkout[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    let active = true;

    const loadHistory = async () => {
      setHistoryLoading(true);
      try {
        const [strengthWorkouts, cardioWorkouts] = await Promise.all([
          fetchStrengthWorkouts(),
          fetchCardioWorkouts(),
        ]);

        if (!active) return;

        setHistoryWorkouts(
          [
            ...strengthWorkouts.map(toHistoryWorkout),
            ...cardioWorkouts.map(toHistoryCardio),
          ].sort((a, b) => b.date.getTime() - a.date.getTime()),
        );
      } catch {
        if (active) setHistoryWorkouts([]);
      } finally {
        if (active) setHistoryLoading(false);
      }
    };

    loadHistory();

    return () => {
      active = false;
    };
  }, []);

  const normalizedQuery = query.trim().toLowerCase();
  const currentMonth = startOfMonth(new Date());
  const monthStart = startOfMonth(selectedMonth);
  const monthEnd = endOfMonth(selectedMonth);
  const canGoNextMonth = !isSameMonth(selectedMonth, currentMonth) && !isAfter(addMonths(selectedMonth, 1), currentMonth);

  const filteredSuggested = useMemo(() => {
    if (!normalizedQuery) return suggestedWorkouts;
    return suggestedWorkouts.filter((workout) =>
      `${workout.title} ${workout.trainerName} ${workout.muscleFocus}`.toLowerCase().includes(normalizedQuery),
    );
  }, [normalizedQuery]);

  const filteredPersonal = useMemo(() => {
    if (!normalizedQuery) return personalWorkouts;
    return personalWorkouts.filter((workout) =>
      `${workout.title} ${workout.trainerName} ${workout.muscleFocus}`.toLowerCase().includes(normalizedQuery),
    );
  }, [normalizedQuery]);

  const monthWorkouts = useMemo(() => {
    const items = historyWorkouts.filter((workout) => workout.date >= monthStart && workout.date <= monthEnd);
    return hasPremiumAccess ? items : items.slice(0, 5);
  }, [hasPremiumAccess, historyWorkouts, monthEnd, monthStart]);

  const hiddenHistoryCount = useMemo(() => {
    if (hasPremiumAccess) return 0;
    const total = historyWorkouts.filter((workout) => workout.date >= monthStart && workout.date <= monthEnd).length;
    return Math.max(0, total - 5);
  }, [hasPremiumAccess, historyWorkouts, monthEnd, monthStart]);

  const monthSummary = useMemo(() => ({
    count: monthWorkouts.length,
    duration: monthWorkouts.reduce((sum, workout) => sum + workout.durationMin, 0),
    calories: monthWorkouts.reduce((sum, workout) => sum + workout.calories, 0),
    liftedKg: monthWorkouts.reduce((sum, workout) => sum + workout.liftedKg, 0),
  }), [monthWorkouts]);

  const openWorkoutPreview = (workout: Workout) => {
    if (workout.premiumOnly && !hasPremiumAccess) {
      setPremiumDialogOpen(true);
      return;
    }

    setPreviewWorkout(workout);
  };

  const handlePreviousMonth = () => {
    if (!hasPremiumAccess) {
      setPremiumDialogOpen(true);
      return;
    }
    setSelectedMonth((month) => subMonths(month, 1));
  };

  const handleNextMonth = () => {
    if (!hasPremiumAccess) {
      setPremiumDialogOpen(true);
      return;
    }
    if (canGoNextMonth) setSelectedMonth((month) => addMonths(month, 1));
  };

  const featuredWorkout = suggestedWorkouts.find((workout) => workout.highlight) ?? suggestedWorkouts[0];

  return (
    <div className="min-h-full bg-[hsl(var(--background))]">
      <div className="mx-auto flex min-h-full w-full max-w-[430px] flex-col gap-5 px-5 pb-28 pt-6">
        <header className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-black tracking-tight text-foreground">Treinos</h1>
          <button
            type="button"
            onClick={() => setSearchOpen((open) => !open)}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-secondary text-primary shadow-elegant"
            aria-label="Buscar treino"
          >
            <Search className="h-5 w-5" />
          </button>
        </header>

        {searchOpen ? (
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por treino, personal ou categoria"
              className="h-12 w-full rounded-xl border border-white/10 bg-card pl-11 pr-4 text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/50"
            />
          </div>
        ) : null}

        <nav className="flex rounded-xl border border-white/10 bg-card p-1">
          {tabs.map((tab) => (
            <TabButton key={tab.id} {...tab} activeTab={activeTab} onChange={setActiveTab} />
          ))}
        </nav>

        {activeTab === 'library' ? (
          <div className="space-y-6">
            <button
              type="button"
              onClick={() => openWorkoutPreview(featuredWorkout)}
              className="relative min-h-[160px] w-full overflow-hidden rounded-[1.35rem] border border-white/10 bg-card p-5 text-left shadow-elegant"
            >
              <div
                className="absolute inset-0 bg-cover bg-center opacity-25"
                style={{ backgroundImage: "url('/images/workout-examples-ai.jpg')" }}
              />
              <div className="absolute inset-0 bg-[repeating-linear-gradient(-45deg,transparent,transparent_12px,hsl(var(--primary)/0.04)_12px,hsl(var(--primary)/0.04)_24px)]" />
              <div className="relative">
                <p className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-primary">
                  <Zap className="h-3.5 w-3.5 fill-primary" />
                  Destaque da semana
                </p>
                <h2 className="mt-3 max-w-[12rem] text-2xl font-black leading-tight text-foreground">{featuredWorkout.title}</h2>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
                  <MetaItem icon={Clock3}>{formatDuration(featuredWorkout.durationMin)}</MetaItem>
                  <MetaItem icon={Flame}>{formatNumber(featuredWorkout.calories)} kcal</MetaItem>
                  <MetaItem icon={Footprints}>{featuredWorkout.trainerName}</MetaItem>
                </div>
                <span className="mt-4 inline-flex h-9 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-black text-primary-foreground">
                  <Play className="h-3.5 w-3.5" />
                  Iniciar treino
                </span>
              </div>
            </button>

            <section className="space-y-3">
              <SectionTitle
                title="Sugeridos para você"
                action={
                  <button type="button" onClick={() => setPremiumDialogOpen(true)} className="text-xs font-black text-primary">
                    Ver todos
                  </button>
                }
              />
              <div className="grid grid-cols-2 gap-3">
                {filteredSuggested.filter((workout) => !workout.highlight).map((workout) => (
                  <WorkoutPreviewCard
                    key={workout.id}
                    workout={workout}
                    compact
                    locked={workout.premiumOnly && !hasPremiumAccess}
                    onOpen={() => openWorkoutPreview(workout)}
                  />
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <SectionTitle title="Explorar categorias" />
              <div className="grid grid-cols-2 gap-3">
                {commonExerciseGroups.map((group) => (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => navigate(group.route, { state: buildCategoryWorkoutStart(group) })}
                    className={cn('rounded-[1rem] border border-white/10 bg-gradient-to-br p-4 text-left shadow-elegant transition-transform hover:-translate-y-0.5', group.tone)}
                    aria-label={`Abrir treinos de ${group.label}`}
                  >
                    <IconTile icon={group.icon} className="h-8 w-8" />
                    <h3 className="mt-4 text-sm font-black leading-none text-foreground">{group.label}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">{group.count}</p>
                  </button>
                ))}
              </div>
            </section>
          </div>
        ) : null}

        {activeTab === 'mine' ? (
          <div className="space-y-6">
            <section className="space-y-3">
              <SectionTitle title="Do seu personal" />
              <div className="space-y-3">
                {filteredPersonal.map((workout) => (
                  <WorkoutPreviewCard
                    key={workout.id}
                    workout={workout}
                    onOpen={() => openWorkoutPreview(workout)}
                    onInfo={setAnimationExercise}
                  />
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <SectionTitle title="Criados por mim" />
              <button
                type="button"
                onClick={() => setFreeFlowOpen(true)}
                className="flex w-full items-center gap-3 rounded-[1rem] border border-white/10 bg-card p-4 text-left shadow-elegant transition-transform hover:-translate-y-0.5"
              >
                <IconTile icon={Pencil} className="border border-dashed border-primary/30 bg-primary/8" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Treino livre</span>
                  <span className="mt-1 block truncate text-base font-black text-foreground">Meu treino de ombro</span>
                  <span className="mt-1 block text-xs text-muted-foreground">4 exercícios · ~35 min</span>
                </span>
                <Play className="h-5 w-5 text-primary" />
              </button>
            </section>
          </div>
        ) : null}

        {activeTab === 'history' ? (
          <div className="space-y-4">
            <section className="rounded-[1rem] border border-white/10 bg-card p-4 shadow-elegant">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handlePreviousMonth}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-primary"
                  aria-label="Mês anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="text-center">
                  <h2 className="text-lg font-black">{capitalize(format(selectedMonth, 'MMMM yyyy', { locale: ptBR }))}</h2>
                  <p className="text-xs text-muted-foreground">
                    {hasPremiumAccess ? 'Toque nas setas para selecionar outro mês' : 'Premium libera meses anteriores'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  disabled={hasPremiumAccess && !canGoNextMonth}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-primary disabled:opacity-40"
                  aria-label="Próximo mês"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-black text-primary">{monthSummary.count} treinos</span>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-black text-primary">{formatDuration(monthSummary.duration)}</span>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-black text-primary">{formatNumber(monthSummary.calories)} kcal</span>
              </div>
            </section>

            <section className="grid grid-cols-3 gap-3">
              <SummaryMetric value={String(monthSummary.count)} label="Treinos" />
              <SummaryMetric value={formatDuration(monthSummary.duration)} label="Tempo total" />
              <SummaryMetric value={`${formatNumber(monthSummary.liftedKg / 1000)}k`} label="Kg levantados" />
            </section>

            {!hasPremiumAccess ? (
              <button
                type="button"
                onClick={() => setPremiumDialogOpen(true)}
                className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/10 p-3 text-left"
              >
                <Crown className="h-5 w-5 shrink-0 text-primary" />
                <span className="min-w-0">
                  <span className="block text-sm font-black text-foreground">Histórico completo é Premium</span>
                  <span className="block text-xs text-muted-foreground">Plano gratuito mostra o mês atual com limite de registros.</span>
                </span>
              </button>
            ) : null}

            {historyLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="h-24 animate-pulse rounded-[1rem] bg-card" />
                ))}
              </div>
            ) : monthWorkouts.length > 0 ? (
              <div className="space-y-3">
                {monthWorkouts.map((workout, index) => {
                  const dateLabel = index === 0 && isSameMonth(workout.date, new Date())
                    ? `${format(workout.date, 'dd MMM', { locale: ptBR })}`
                    : format(workout.date, 'dd MMM · EEE', { locale: ptBR });

                  return (
                    <div key={workout.id} className="space-y-2">
                      <p className="px-1 text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                        {dateLabel.replace('.', '')}
                      </p>
                      <div className="rounded-[1rem] border border-white/10 bg-card p-4 shadow-elegant">
                        <div className="flex items-start gap-3">
                          <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <h3 className="truncate text-sm font-black text-foreground">{workout.title}</h3>
                              <span className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-black text-primary">Completo</span>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                              <MetaItem icon={Clock3}>{formatDuration(workout.durationMin)}</MetaItem>
                              {workout.type === 'strength' ? <MetaItem icon={Dumbbell}>{formatNumber(workout.liftedKg)} kg</MetaItem> : null}
                              {workout.calories ? <MetaItem icon={Flame}>{formatNumber(workout.calories)} kcal</MetaItem> : null}
                              {workout.series ? <MetaItem icon={Activity}>{workout.series} séries</MetaItem> : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {hiddenHistoryCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => setPremiumDialogOpen(true)}
                    className="w-full rounded-xl border border-primary/30 bg-primary/10 p-3 text-sm font-bold text-primary"
                  >
                    {hiddenHistoryCount} registro(s) ocultos no plano gratuito
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="rounded-[1rem] border border-white/10 bg-card p-6 text-center">
                <Dumbbell className="mx-auto h-9 w-9 text-primary" />
                <p className="mt-3 text-sm font-bold">Nenhum treino neste mês</p>
                <p className="mt-1 text-xs text-muted-foreground">Use o botão de adicionar para registrar seu próximo treino.</p>
              </div>
            )}
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => setFreeFlowOpen(true)}
        className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+5.1rem)] right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow md:hidden"
        aria-label="Criar treino livre"
      >
        <Plus className="h-7 w-7" />
      </button>

      <FreeWorkoutDrawer open={freeFlowOpen} onOpenChange={setFreeFlowOpen} />

      <Dialog open={!!previewWorkout} onOpenChange={() => setPreviewWorkout(null)}>
        <DialogContent className="max-w-[380px] rounded-[1.5rem] border-white/10 bg-[hsl(var(--background))] p-5 text-foreground">
          <DialogHeader>
            <DialogTitle className="text-lg font-black">{previewWorkout?.title}</DialogTitle>
          </DialogHeader>
          {previewWorkout ? (
            <div className="space-y-4">
              <div className="rounded-[1rem] border border-white/10 bg-card p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">
                  {previewWorkout.source === 'personal' ? `Personal · ${previewWorkout.trainerName}` : previewWorkout.trainerName}
                </p>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
                  <MetaItem icon={Dumbbell}>{previewWorkout.exercises.length} exercícios</MetaItem>
                  <MetaItem icon={Clock3}>{formatDuration(previewWorkout.durationMin)}</MetaItem>
                  <MetaItem icon={Flame}>{formatNumber(previewWorkout.calories)} kcal</MetaItem>
                </div>
              </div>

              <div className="space-y-2">
                {previewWorkout.exercises.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setAnimationExercise(item.exercise)}
                    className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-card p-3 text-left"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-xs font-black text-primary">
                      {item.order}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">{item.exercise.name}</span>
                      <span className="text-xs text-muted-foreground">{item.sets.length} séries · {item.exercise.equipment}</span>
                    </span>
                    <Info className="h-4 w-4 text-primary" />
                  </button>
                ))}
              </div>

              <Link
                to={previewWorkout.route}
                onClick={() => setPreviewWorkout(null)}
                className="flex h-12 w-full items-center justify-center rounded-xl bg-primary text-sm font-black text-primary-foreground"
              >
                Iniciar treino
              </Link>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={!!animationExercise} onOpenChange={() => setAnimationExercise(null)}>
        <DialogContent className="max-w-[360px] rounded-[1.5rem] border-white/10 bg-[hsl(var(--background))] p-5 text-foreground">
          <DialogHeader>
            <DialogTitle className="text-lg font-black">{animationExercise?.name}</DialogTitle>
          </DialogHeader>
          {animationExercise ? (
            <div className="space-y-4">
              <div className="relative flex h-40 items-center justify-center overflow-hidden rounded-[1rem] border border-primary/20 bg-card">
                <div className="absolute inset-0 bg-[repeating-linear-gradient(-45deg,transparent,transparent_12px,hsl(var(--primary)/0.06)_12px,hsl(var(--primary)/0.06)_24px)]" />
                <Dumbbell className="relative h-16 w-16 animate-float-soft text-primary/60" />
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">{animationExercise.animationLabel}</p>
              <button
                type="button"
                onClick={() => setAnimationExercise(null)}
                className="h-11 w-full rounded-xl bg-primary text-sm font-black text-primary-foreground"
              >
                Entendi
              </button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={premiumDialogOpen} onOpenChange={setPremiumDialogOpen}>
        <DialogContent className="max-w-[360px] rounded-[1.5rem] border-primary/30 bg-[hsl(var(--background))] p-5 text-foreground">
          <DialogHeader>
            <DialogTitle className="text-lg font-black">Desbloquear Premium</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-[1rem] border border-primary/30 bg-primary/10 p-4">
              <Crown className="h-8 w-8 text-primary" />
              <p className="mt-3 text-sm font-bold">Acesso Premium libera biblioteca completa, treinos sugeridos avançados e histórico de qualquer mês.</p>
            </div>
            <Link
              to="/premium"
              onClick={() => setPremiumDialogOpen(false)}
              className="flex h-12 w-full items-center justify-center rounded-xl bg-primary text-sm font-black text-primary-foreground"
            >
              Ver Premium
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
