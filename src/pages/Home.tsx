import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  Calendar,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  Dumbbell,
  Flame,
  Lock,
  Trophy,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import {
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  parseISO,
  startOfMonth,
  startOfYear,
  startOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useAchievements } from "@/hooks/useAchievements";
import { useProfile } from "@/hooks/useProfile";
import { useMyTrainerAssignment } from "@/hooks/useTrainer";
import { fetchCardioWorkouts, fetchStrengthWorkouts, type CardioWorkoutApi, type StrengthWorkoutApi } from "@/lib/workoutApi";
import { buildWorkoutStartFromTrainerPlan, type WorkoutStartState } from "@/lib/workoutStart";
import { cn } from "@/lib/utils";

type WorkoutEntry = StrengthWorkoutApi | CardioWorkoutApi;
type PeriodKey = "week" | "month" | "year" | "custom";

interface PeriodSummary {
  calories: number;
  workouts: number;
  minutes: number;
  workoutDays: number;
}

interface DashboardData {
  weeklyMinutes: number[];
  weeklyWorkoutCounts: number[];
  todayWorkouts: number;
  todayMinutes: number;
  weeklyCalories: number;
  weeklyWorkouts: number;
  weeklyWorkoutDays: number;
  previousWeekWorkouts: number;
  periodSummaries: Record<PeriodKey, PeriodSummary>;
}

const emptyPeriodSummary: PeriodSummary = {
  calories: 0,
  workouts: 0,
  minutes: 0,
  workoutDays: 0,
};

const initialDashboardData: DashboardData = {
  weeklyMinutes: [0, 0, 0, 0, 0, 0, 0],
  weeklyWorkoutCounts: [0, 0, 0, 0, 0, 0, 0],
  todayWorkouts: 0,
  todayMinutes: 0,
  weeklyCalories: 0,
  weeklyWorkouts: 0,
  weeklyWorkoutDays: 0,
  previousWeekWorkouts: 0,
  periodSummaries: {
    week: emptyPeriodSummary,
    month: emptyPeriodSummary,
    year: emptyPeriodSummary,
    custom: emptyPeriodSummary,
  },
};

const weekDayLabels = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const periodOptions: Array<{ key: PeriodKey; label: string; icon: LucideIcon; requiresPremium?: boolean }> = [
  { key: "week", label: "Esta semana", icon: CalendarDays },
  { key: "month", label: "Este mês", icon: CalendarRange, requiresPremium: true },
  { key: "year", label: "Este ano", icon: Calendar, requiresPremium: true },
  { key: "custom", label: "Período personalizado", icon: CalendarClock, requiresPremium: true },
];

interface HomeDailyWorkout {
  to: string;
  state?: WorkoutStartState;
  badge: string;
  title: string;
  duration: string;
  trainer: string;
  action: string;
  description?: string;
  locked?: boolean;
}

const premiumSuggestedWorkoutStart: WorkoutStartState = {
  source: "suggested",
  objective: "Full Body Queima Total",
  trainerName: "Plano Premium Vitalissy",
  calories: 480,
  exercises: [
    {
      name: "Agachamento livre",
      group: "Pernas e glúteos",
      category: "Peso corpo",
      location: "Academia",
      sets: [
        { weight: 0, reps: 12, completed: false },
        { weight: 0, reps: 12, completed: false },
        { weight: 0, reps: 10, completed: false },
      ],
    },
    {
      name: "Remada baixa",
      group: "Costas e bíceps",
      category: "Máquina",
      location: "Academia",
      sets: [
        { weight: 25, reps: 12, completed: false },
        { weight: 30, reps: 10, completed: false },
        { weight: 30, reps: 10, completed: false },
      ],
    },
    {
      name: "Bike HIIT",
      group: "Cardio",
      category: "Máquina",
      location: "Academia",
      sets: [
        { weight: 0, reps: 10, completed: false },
        { weight: 0, reps: 10, completed: false },
        { weight: 0, reps: 10, completed: false },
      ],
    },
  ],
};

function getWorkoutDate(workout: WorkoutEntry) {
  return parseISO(workout.date);
}

function isWorkoutOnDay(workout: WorkoutEntry, day: Date) {
  const workoutDate = getWorkoutDate(workout);
  return !Number.isNaN(workoutDate.getTime()) && isSameDay(workoutDate, day);
}

function sumCalories(workouts: WorkoutEntry[]) {
  return workouts.reduce((sum, workout) => sum + (workout.calories ?? 0), 0);
}

function sumMinutes(workouts: WorkoutEntry[]) {
  return workouts.reduce((sum, workout) => sum + (workout.duration_min ?? 0), 0);
}

function countUniqueWorkoutDays(workouts: WorkoutEntry[]) {
  return new Set(workouts.map((workout) => workout.date.slice(0, 10))).size;
}

function summarizeWorkouts(workouts: WorkoutEntry[]): PeriodSummary {
  return {
    calories: sumCalories(workouts),
    workouts: workouts.length,
    minutes: sumMinutes(workouts),
    workoutDays: countUniqueWorkoutDays(workouts),
  };
}

function clampPercentage(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(Math.round(value));
}

function formatMinutesCompact(minutes: number) {
  const roundedMinutes = Math.max(0, Math.round(minutes));
  const hours = Math.floor(roundedMinutes / 60);
  const remainder = roundedMinutes % 60;

  if (hours === 0) return `${remainder}min`;
  if (remainder === 0) return `${hours}h`;
  return `${hours}h${String(remainder).padStart(2, "0")}`;
}

function getInitials(name?: string | null): string {
  return (
    name
      ?.split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "PA"
  );
}

function formatHomeDate(date: Date) {
  const formatted = format(date, "EEEE '·' d MMM yyyy", { locale: ptBR }).replace(".", "");
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function formatUnlockedAt(value?: string) {
  if (!value) return "Continue treinando";

  const unlockedAt = parseISO(value);
  if (Number.isNaN(unlockedAt.getTime())) return "Conquista desbloqueada";

  const days = differenceInCalendarDays(new Date(), unlockedAt);
  if (days <= 0) return "Desbloqueada hoje";
  if (days === 1) return "Desbloqueada há 1 dia";
  return `Desbloqueada há ${days} dias`;
}

function StatCard({
  icon: Icon,
  value,
  label,
}: {
  icon: LucideIcon;
  value: string;
  label: string;
}) {
  return (
    <div className="min-w-0 rounded-[1rem] border border-white/10 bg-card px-3 py-4 text-center shadow-elegant">
      <Icon className="mx-auto h-4 w-4 text-primary" />
      <p className="mt-2 truncate text-lg font-extrabold leading-none text-primary">{value}</p>
      <p className="mt-2 text-[10px] leading-tight text-muted-foreground">{label}</p>
    </div>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <h2 className="px-1 text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
      {children}
    </h2>
  );
}

function PeriodOption({
  icon: Icon,
  label,
  active,
  locked,
  onSelect,
}: {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  locked?: boolean;
  onSelect?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={locked}
      onClick={onSelect}
      className={cn(
        "flex h-12 w-full items-center justify-between rounded-xl border px-4 text-left transition-colors",
        active
          ? "border-primary bg-primary/10"
          : "border-white/10 bg-secondary/80 hover:border-primary/40",
        locked ? "cursor-default hover:border-white/10" : ""
      )}
    >
      <span className="flex min-w-0 items-center gap-3">
        <Icon className="h-4 w-4 shrink-0 text-primary" />
        <span className="truncate text-sm font-bold text-foreground">{label}</span>
      </span>

      {active ? (
        <Check className="h-4 w-4 text-primary" />
      ) : locked ? (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold text-primary">
          <Lock className="h-3 w-3" />
          Premium
        </span>
      ) : null}
    </button>
  );
}

export default function Home() {
  const { profile, loading, error: profileError } = useProfile();
  const { latestAchievement } = useAchievements();
  const { data: trainerAssignment, isLoading: trainerAssignmentLoading } = useMyTrainerAssignment(Boolean(profile));
  const [dashboardData, setDashboardData] = useState<DashboardData>(initialDashboardData);
  const [dashboardError, setDashboardError] = useState(false);
  const [periodOpen, setPeriodOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodKey>("week");
  const today = useMemo(() => new Date(), []);

  useEffect(() => {
    let active = true;

    const loadDashboardData = async () => {
      try {
        const [strengthWorkouts, cardioWorkouts] = await Promise.all([
          fetchStrengthWorkouts(),
          fetchCardioWorkouts(),
        ]);

        if (!active) return;

        const combined = [...strengthWorkouts, ...cardioWorkouts];
        const now = new Date();
        const dayStart = new Date(now);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(now);
        dayEnd.setHours(23, 59, 59, 999);
        const weekStart = startOfWeek(now, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
        const monthStart = startOfMonth(now);
        const monthEnd = endOfMonth(now);
        const yearStart = startOfYear(now);
        const previousWeekStart = new Date(weekStart);
        previousWeekStart.setDate(previousWeekStart.getDate() - 7);
        const previousWeekEnd = new Date(weekEnd);
        previousWeekEnd.setDate(previousWeekEnd.getDate() - 7);
        const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

        const todayWorkouts = combined.filter((workout) => {
          const workoutDate = getWorkoutDate(workout);
          return !Number.isNaN(workoutDate.getTime()) && workoutDate >= dayStart && workoutDate <= dayEnd;
        });
        const weekWorkouts = combined.filter((workout) => {
          const workoutDate = getWorkoutDate(workout);
          return !Number.isNaN(workoutDate.getTime()) && workoutDate >= weekStart && workoutDate <= weekEnd;
        });
        const previousWeekWorkouts = combined.filter((workout) => {
          const workoutDate = getWorkoutDate(workout);
          return !Number.isNaN(workoutDate.getTime()) && workoutDate >= previousWeekStart && workoutDate <= previousWeekEnd;
        });
        const monthWorkouts = combined.filter((workout) => {
          const workoutDate = getWorkoutDate(workout);
          return !Number.isNaN(workoutDate.getTime()) && workoutDate >= monthStart && workoutDate <= monthEnd;
        });
        const yearWorkouts = combined.filter((workout) => {
          const workoutDate = getWorkoutDate(workout);
          return !Number.isNaN(workoutDate.getTime()) && workoutDate >= yearStart && workoutDate <= now;
        });

        const weeklyMinutes = weekDays.map((day) =>
          combined
            .filter((workout) => isWorkoutOnDay(workout, day))
            .reduce((sum, workout) => sum + (workout.duration_min ?? 0), 0)
        );
        const weeklyWorkoutCounts = weekDays.map((day) =>
          combined.filter((workout) => isWorkoutOnDay(workout, day)).length
        );

        setDashboardData({
          weeklyMinutes,
          weeklyWorkoutCounts,
          todayWorkouts: todayWorkouts.length,
          todayMinutes: sumMinutes(todayWorkouts),
          weeklyCalories: sumCalories(weekWorkouts),
          weeklyWorkouts: weekWorkouts.length,
          weeklyWorkoutDays: countUniqueWorkoutDays(weekWorkouts),
          previousWeekWorkouts: previousWeekWorkouts.length,
          periodSummaries: {
            week: summarizeWorkouts(weekWorkouts),
            month: summarizeWorkouts(monthWorkouts),
            year: summarizeWorkouts(yearWorkouts),
            custom: summarizeWorkouts(monthWorkouts),
          },
        });
        setDashboardError(false);
      } catch {
        if (active) {
          setDashboardData(initialDashboardData);
          setDashboardError(true);
        }
      }
    };

    loadDashboardData();

    return () => {
      active = false;
    };
  }, []);

  const trainerName = trainerAssignment?.trainer?.full_name || "Seu personal";
  const trainerPlan = trainerAssignment?.training_plan?.trim() ?? "";
  const trainerWorkoutStart = useMemo(
    () => (trainerPlan ? buildWorkoutStartFromTrainerPlan(trainerPlan, trainerName) : null),
    [trainerName, trainerPlan],
  );

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center bg-[hsl(var(--background))]">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-primary" />
      </div>
    );
  }

  if (profileError) {
    return (
      <div className="min-h-full bg-[hsl(var(--background))]">
        <div className="mx-auto flex min-h-full w-full max-w-[430px] flex-col px-5 pb-28 pt-6">
          <div className="mt-24 rounded-[1.25rem] border border-white/10 bg-card p-5 text-center shadow-elegant">
            <p className="text-lg font-black text-foreground">Não foi possível carregar a tela inicial</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Verifique sua conexão e tente abrir o app novamente.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const firstName = profile?.full_name?.split(" ")[0] || "Paciente";
  const fullName = profile?.full_name || "Paciente";
  const initials = getInitials(fullName);
  const hasPremiumAccess = Boolean(profile?.is_premium || profile?.is_admin || profile?.is_personal_trainer);
  const hasPersonalTrainer = Boolean(trainerAssignment);
  const hasPersonalWorkoutToday = Boolean(trainerWorkoutStart);
  const selectedPeriodOption = periodOptions.find((option) => option.key === selectedPeriod) ?? periodOptions[0];
  const selectedPeriodSummary = dashboardData.periodSummaries[selectedPeriod] ?? dashboardData.periodSummaries.week;
  const currentWeekDay = Math.max(0, Math.min(6, today.getDay() === 0 ? 6 : today.getDay() - 1));
  const weeklyChartValues = dashboardData.weeklyMinutes.map((minutes, index) =>
    minutes > 0 ? minutes : dashboardData.weeklyWorkoutCounts[index] > 0 ? 25 : 0
  );
  const maxChartValue = Math.max(...weeklyChartValues, 1);
  const weeklyGoalDays = 5;
  const weeklyGoalProgress = clampPercentage((dashboardData.weeklyWorkoutDays / weeklyGoalDays) * 100);
  const weeklyDelta = dashboardData.weeklyWorkouts - dashboardData.previousWeekWorkouts;
  const weeklyDeltaAbs = Math.abs(weeklyDelta);
  const WeeklyDeltaIcon = weeklyDelta < 0 ? ArrowDown : ArrowUp;
  const weeklyPillLabel = `${weeklyDelta >= 0 ? "+" : "-"}${weeklyDeltaAbs} ${
    weeklyDeltaAbs === 1 ? "treino" : "treinos"
  } essa semana`;
  let dailyWorkout: HomeDailyWorkout;

  if (trainerAssignmentLoading) {
    dailyWorkout = {
      to: "/workouts",
      badge: "Treino do dia",
      title: "Carregando prescrição",
      duration: "--",
      trainer: "Vitalissy",
      action: "Abrir",
    };
  } else if (hasPersonalWorkoutToday && trainerWorkoutStart) {
    dailyWorkout = {
      to: "/workouts/musculacao/academia",
      state: trainerWorkoutStart,
      badge: "Do seu personal",
      title: trainerWorkoutStart.objective,
      duration: `${trainerWorkoutStart.exercises.length} exercícios`,
      trainer: trainerName,
      action: "Iniciar",
      description: "Prescrição liberada para hoje.",
    };
  } else if (hasPersonalTrainer) {
    dailyWorkout = {
      to: "/workouts",
      badge: "Do seu personal",
      title: "Aguardando treino de hoje",
      duration: "--",
      trainer: trainerName,
      action: "Ver treinos",
      description: "Seu personal ainda não enviou uma prescrição.",
    };
  } else if (hasPremiumAccess) {
    dailyWorkout = {
      to: "/workouts/musculacao/academia",
      state: premiumSuggestedWorkoutStart,
      badge: "Premium sugerido",
      title: "Full Body Queima Total",
      duration: "45 min",
      trainer: "Plano Premium Vitalissy",
      action: "Iniciar",
      description: "Sugestão de treino do dia.",
    };
  } else {
    dailyWorkout = {
      to: "/premium",
      badge: "Premium sugerido",
      title: "Full Body Queima Total",
      duration: "45 min",
      trainer: "Plano Premium Vitalissy",
      action: "Iniciar",
      description: "Toque em Iniciar para assinar o Premium.",
      locked: true,
    };
  }
  const latestAchievementTitle = latestAchievement?.achievement.name || "Primeira conquista te espera";
  const latestAchievementDescription = latestAchievement?.achievement.description || "Registre um treino para começar sua sequência.";
  const latestAchievementEyebrow = latestAchievement ? formatUnlockedAt(latestAchievement.unlocked_at) : "Comece hoje";

  return (
    <div className="min-h-full bg-[hsl(var(--background))]">
      <div className="mx-auto flex min-h-full w-full max-w-[430px] flex-col gap-4 px-5 pb-28 pt-6">
        <header className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Vitalissy</p>
            <h1 className="mt-1 truncate text-[21px] font-extrabold leading-tight text-foreground">
              Olá, {firstName} <span aria-hidden="true">👋</span>
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">{formatHomeDate(today)}</p>
          </div>

          <Link to="/profile" aria-label="Abrir perfil" className="shrink-0">
            <Avatar className="h-11 w-11 border border-primary/30 shadow-glow">
              <AvatarImage src={profile?.avatar_url || undefined} alt={fullName} />
              <AvatarFallback className="bg-gradient-primary text-sm font-extrabold text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Link>
        </header>

        <section className="relative overflow-hidden rounded-[1.35rem] bg-gradient-primary px-5 py-5 text-primary-foreground shadow-glow">
          <span className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary-foreground/10" aria-hidden="true" />
          <div className="relative">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-primary-foreground/75">
                Semana ativa
              </p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-[42px] font-black leading-none tracking-tight">
                  {dashboardData.weeklyWorkoutDays}
                </span>
                <span className="text-base font-bold text-primary-foreground/80">/ 7 dias</span>
              </div>
              <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 py-1 pl-1 pr-3 text-[11px] font-extrabold">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-foreground text-primary">
                  <WeeklyDeltaIcon className="h-3 w-3" />
                </span>
                {weeklyPillLabel}
              </div>
            </div>

            <div className="mt-6 flex items-end justify-between gap-2">
              {weekDayLabels.map((day, index) => {
                const hasWorkout = dashboardData.weeklyWorkoutCounts[index] > 0;
                const isToday = index === currentWeekDay;
                const height = hasWorkout
                  ? Math.max(12, Math.round((weeklyChartValues[index] / maxChartValue) * 36))
                  : 4;

                return (
                  <div key={day} className="flex flex-1 flex-col items-center gap-1.5">
                    <div className="flex h-9 w-full items-end justify-center">
                      <span
                        className={cn(
                          "block w-[72%] max-w-8 rounded-t-[4px]",
                          hasWorkout ? "bg-primary-foreground/40" : "rounded-full bg-primary-foreground/15",
                          hasWorkout && isToday ? "bg-primary-foreground" : ""
                        )}
                        style={{ height: `${height}px` }}
                      />
                    </div>
                    <span
                      className={cn(
                        "text-[10px] font-extrabold",
                        isToday ? "text-primary-foreground" : "text-primary-foreground/70"
                      )}
                    >
                      {day}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-primary-foreground/15">
              <div className="h-full rounded-full bg-primary-foreground" style={{ width: `${weeklyGoalProgress}%` }} />
            </div>
            <div className="mt-2 flex items-center justify-between gap-3 text-[11px] font-bold text-primary-foreground/75">
              <span>Meta: {weeklyGoalDays} dias / semana</span>
              <span>{Math.min(dashboardData.weeklyWorkoutDays, weeklyGoalDays)} de {weeklyGoalDays} completos</span>
            </div>
          </div>
        </section>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setPeriodOpen(true)}
            className="inline-flex h-8 items-center gap-2 rounded-full border border-white/10 bg-secondary px-4 text-xs font-bold text-primary"
          >
            <CalendarDays className="h-3.5 w-3.5" />
            {selectedPeriodOption.label}
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>

        {dashboardError ? (
          <div className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-xs font-semibold leading-relaxed text-primary">
            Não foi possível atualizar os dados de treino agora. Mantivemos a tela em modo seguro.
          </div>
        ) : null}

        <section className="grid grid-cols-3 gap-3">
          <StatCard icon={Flame} value={formatNumber(selectedPeriodSummary.calories)} label="Kcal queimadas" />
          <StatCard icon={Clock3} value={formatMinutesCompact(selectedPeriodSummary.minutes)} label="Tempo de treino" />
          <StatCard icon={Activity} value={formatNumber(selectedPeriodSummary.workouts)} label="Atividades" />
        </section>

        <section className="space-y-3">
          <SectionLabel>Treino do dia</SectionLabel>
          <Link
            to={dailyWorkout.to}
            state={dailyWorkout.state}
            className={cn(
              "relative block overflow-hidden rounded-[1.15rem] border bg-card shadow-elegant transition-transform hover:-translate-y-0.5",
              dailyWorkout.locked ? "border-primary/30" : "border-white/10"
            )}
          >
            <div className="relative flex h-20 items-center justify-center overflow-hidden bg-[hsl(var(--background-strong))]">
              <div
                className={cn(
                  "absolute inset-0 bg-cover bg-center opacity-20",
                  dailyWorkout.locked ? "scale-105 blur-[3px]" : ""
                )}
                style={{ backgroundImage: "url('/images/workout-examples-ai.jpg')" }}
              />
              <div className="absolute inset-0 bg-[repeating-linear-gradient(-45deg,transparent,transparent_10px,hsl(var(--primary)/0.04)_10px,hsl(var(--primary)/0.04)_20px)]" />
              <Dumbbell className={cn("relative h-9 w-9 text-primary/25", dailyWorkout.locked ? "blur-[1px]" : "")} />
              <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-primary/15 px-3 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-primary">
                <Zap className="h-3 w-3 fill-primary" />
                {dailyWorkout.badge}
              </span>
              {dailyWorkout.locked ? (
                <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-background/90 px-3 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-primary shadow-elegant">
                  <Lock className="h-3 w-3" />
                  Premium
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <h3 className={cn("truncate text-sm font-extrabold text-foreground", dailyWorkout.locked ? "blur-[3px]" : "")}>
                  {dailyWorkout.title}
                </h3>
                <div className={cn(
                  "mt-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground",
                  dailyWorkout.locked ? "blur-[3px]" : ""
                )}>
                  <span className="inline-flex items-center gap-1">
                    <Clock3 className="h-3 w-3 text-primary" />
                    {dailyWorkout.duration}
                  </span>
                  <span className="inline-flex min-w-0 items-center gap-1">
                    <Users className="h-3 w-3 shrink-0 text-primary" />
                    <span className="truncate">{dailyWorkout.trainer}</span>
                  </span>
                </div>
                {dailyWorkout.description ? (
                  <p className={cn(
                    "mt-2 truncate text-[11px] font-semibold",
                    dailyWorkout.locked ? "text-primary" : "text-muted-foreground"
                  )}>
                    {dailyWorkout.description}
                  </p>
                ) : null}
              </div>
              <span className="inline-flex h-9 shrink-0 items-center justify-center rounded-xl bg-primary px-4 text-xs font-extrabold text-primary-foreground">
                {dailyWorkout.action}
              </span>
            </div>
          </Link>
        </section>

        <section className="space-y-3">
          <SectionLabel>Sua última conquista</SectionLabel>
          <Link
            to={latestAchievement ? "/premium" : "/workouts"}
            className="flex items-center gap-4 rounded-[1.15rem] border border-primary bg-card px-4 py-4 shadow-elegant transition-transform hover:-translate-y-0.5"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground">
              <Trophy className="h-6 w-6" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-primary">
                {latestAchievementEyebrow}
              </span>
              <span className="mt-1 block truncate text-sm font-extrabold text-foreground">
                {latestAchievementTitle}
              </span>
              <span className="mt-1 block truncate text-[11px] text-muted-foreground">
                {latestAchievementDescription}
              </span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground/45" />
          </Link>
        </section>
      </div>

      <Drawer open={periodOpen} onOpenChange={setPeriodOpen}>
        <DrawerContent className="mx-auto max-w-[430px] rounded-t-[1.5rem] border border-white/10 bg-[hsl(var(--background))] px-5 pb-[calc(env(safe-area-inset-bottom,0px)+2rem)] pt-0 text-foreground [&>div:first-child]:mt-5 [&>div:first-child]:h-1 [&>div:first-child]:w-10 [&>div:first-child]:bg-secondary">
          <DrawerHeader className="px-0 pb-2 pt-5 text-left">
            <DrawerTitle className="text-base font-extrabold">Selecionar período</DrawerTitle>
          </DrawerHeader>

          <div className="grid gap-2">
            {periodOptions.map((option) => {
              const locked = Boolean(option.requiresPremium && !hasPremiumAccess);

              return (
                <PeriodOption
                  key={option.key}
                  icon={option.icon}
                  label={option.label}
                  active={selectedPeriod === option.key}
                  locked={locked}
                  onSelect={() => {
                    if (locked) return;
                    setSelectedPeriod(option.key);
                    setPeriodOpen(false);
                  }}
                />
              );
            })}
          </div>

          {!hasPremiumAccess ? (
            <Link
              to="/premium"
              onClick={() => setPeriodOpen(false)}
              className="mt-4 block rounded-[1rem] bg-gradient-primary px-4 py-4 text-center text-primary-foreground shadow-glow"
            >
              <span className="block text-sm font-black">Desbloquear Premium</span>
              <span className="mt-1 block text-xs text-primary-foreground/75">
                Veja sua evolução completa por qualquer período
              </span>
            </Link>
          ) : null}
        </DrawerContent>
      </Drawer>
    </div>
  );
}
