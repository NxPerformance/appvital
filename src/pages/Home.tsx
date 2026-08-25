import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Bell,
  Camera,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Flame,
  HeartPulse,
  Lock,
  MessageCircle,
  RotateCcw,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { differenceInCalendarDays, endOfWeek, format, parseISO, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { WeeklyCaloriesChart } from "@/components/home/WeeklyCaloriesChart";
import { useAchievements } from "@/hooks/useAchievements";
import { useProfile } from "@/hooks/useProfile";
import { useBodyProgress } from "@/hooks/useBodyProgress";
import { useBioimpedance } from "@/hooks/useBioimpedance";
import { api, resolveUploadUrl } from "@/lib/api";
import { fetchStrengthWorkouts, findActiveWorkoutDraft, type ActiveWorkoutDraft } from "@/lib/workoutApi";
import { cn } from "@/lib/utils";

interface AppointmentEntry {
  id: string;
  type: string;
  status: string;
  scheduled_date: string | null;
  scheduled_time: string | null;
  admin_notes: string | null;
  updated_at: string;
}

const appointmentTypeLabels: Record<string, string> = {
  consulta_online: "Consulta online",
  consulta_presencial: "Consulta presencial",
  bioimpedancia: "Bioimpedância",
};

interface WorkoutLink {
  to: string;
  label: string;
  description: string;
  icon: LucideIcon;
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

function getGreeting(hour: number) {
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function formatHomeDate(date: Date) {
  const formatted = format(date, "EEEE '·' d MMM yyyy", { locale: ptBR }).replace(".", "");
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function formatWeight(value: number) {
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value);
}

function formatUnlockedAt(value?: string) {
  if (!value) return "Continue cuidando da sua saúde";

  const unlockedAt = parseISO(value);
  if (Number.isNaN(unlockedAt.getTime())) return "Conquista desbloqueada";

  const days = differenceInCalendarDays(new Date(), unlockedAt);
  if (days <= 0) return "Desbloqueada hoje";
  if (days === 1) return "Desbloqueada há 1 dia";
  return `Desbloqueada há ${days} dias`;
}

function formatUpdatedAgo(value: string) {
  const updatedAt = parseISO(value);
  if (Number.isNaN(updatedAt.getTime())) return "";

  const days = differenceInCalendarDays(new Date(), updatedAt);
  if (days <= 0) return "Atualizado hoje";
  if (days === 1) return "Atualizado há 1 dia";
  return `Atualizado há ${days} dias`;
}

function SectionLabel({ children }: { children: string }) {
  return (
    <h2 className="px-1 text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
      {children}
    </h2>
  );
}

const SLIDE_CLASS =
  "w-[85%] shrink-0 snap-center rounded-[1.35rem] shadow-elegant sm:w-[340px]";

export default function Home() {
  const { profile, loading, error: profileError } = useProfile();
  const { achievements, userAchievements, latestAchievement } = useAchievements();
  const { photos } = useBodyProgress();
  const { latestRecord: latestBio, previousRecord: previousBio } = useBioimpedance();
  const today = useMemo(() => new Date(), []);
  const [activeDraft, setActiveDraft] = useState<ActiveWorkoutDraft | null>(null);
  const summaryCarouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActiveDraft(findActiveWorkoutDraft());
  }, []);

  const { data: appointments } = useQuery({
    queryKey: ["home", "appointments"],
    queryFn: async () => (await api.get<{ appointments: AppointmentEntry[] }>("/appointments/mine")).appointments,
  });

  const { data: strengthWorkouts } = useQuery({
    queryKey: ["home", "workouts-strength"],
    queryFn: fetchStrengthWorkouts,
  });

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
        <div className="mx-auto flex min-h-full w-full max-w-[430px] flex-col px-5 pb-28 pt-6 md:max-w-[1180px] md:px-7 md:pb-8 md:pt-7">
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
  const greeting = getGreeting(today.getHours());

  const nextAppointment = (appointments ?? [])
    .filter((appointment) => appointment.status !== "cancelled" && appointment.status !== "completed")
    .sort((a, b) => {
      if (!a.scheduled_date) return 1;
      if (!b.scheduled_date) return -1;
      return parseISO(a.scheduled_date).getTime() - parseISO(b.scheduled_date).getTime();
    })[0];

  const latestPhoto = photos[0] ?? null;

  const unlockedAchievementIds = new Set(userAchievements.map((ua) => ua.achievement_id));
  const nextAchievement = [...achievements]
    .sort((a, b) => a.sort_order - b.sort_order)
    .find((achievement) => !unlockedAchievementIds.has(achievement.id));
  const daysSinceAchievement = latestAchievement
    ? differenceInCalendarDays(today, parseISO(latestAchievement.unlocked_at))
    : null;
  const showRecentAchievement = latestAchievement != null && daysSinceAchievement != null && daysSinceAchievement <= 3;

  const weekStart = startOfWeek(today, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 0 });
  const last30Start = new Date(today);
  last30Start.setDate(last30Start.getDate() - 29);

  const workoutDates = (strengthWorkouts ?? []).map((workout) => parseISO(`${workout.date}T12:00:00`));
  const dateKey = (date: Date) => format(date, "yyyy-MM-dd");

  const weekWorkoutDays = new Set(
    workoutDates.filter((date) => date >= weekStart && date <= weekEnd).map(dateKey),
  ).size;
  const weeklyGoal = profile?.weekly_workout_goal ?? null;
  const weeklyGoalPercent = weeklyGoal ? Math.min(100, Math.round((weekWorkoutDays / weeklyGoal) * 100)) : null;

  const workoutsLast30 = workoutDates.filter((date) => date >= last30Start && date <= today);
  const activeDaysLast30 = new Set(workoutsLast30.map(dateKey)).size;

  const latestWeight = latestBio?.weight_kg ?? null;
  const previousWeight = previousBio?.weight_kg ?? null;
  const weightDelta = latestWeight != null && previousWeight != null ? latestWeight - previousWeight : null;
  const weightGoal = profile?.weight_goal_kg ?? null;
  const movingTowardGoal =
    weightDelta == null
      ? null
      : weightGoal != null && latestWeight != null
        ? (latestWeight > weightGoal && weightDelta < 0) || (latestWeight < weightGoal && weightDelta > 0)
        // Sem meta cadastrada, perda de peso já conta como progresso (maioria dos pacientes
        // está em acompanhamento de emagrecimento); ganho de peso fica neutro, já que não
        // sabemos se o paciente está buscando ganho de massa.
        : weightDelta < 0
          ? true
          : null;

  const workoutLinks: WorkoutLink[] = [
    { to: "/workouts", label: "Caderno de exercícios", description: "Registro de musculação", icon: Dumbbell },
    { to: "/workouts/dashboard", label: "Desempenho", description: "Estatísticas e progresso", icon: BarChart3 },
    ...(activeDraft
      ? [
          {
            to: `/workouts/musculacao/${activeDraft.type}`,
            label: "Continuar treino",
            description: "Retome de onde parou",
            icon: RotateCcw,
          },
        ]
      : []),
  ];

  return (
    <div className="min-h-full bg-[hsl(var(--background))]">
      <div className="mx-auto flex min-h-full w-full max-w-[430px] flex-col gap-4 px-5 pb-28 pt-6 md:max-w-[1180px] md:px-7 md:pb-8 md:pt-7">
        <header className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="mt-1 text-xs text-muted-foreground">{formatHomeDate(today)}</p>
            <h1 className="mt-1 truncate text-[21px] font-extrabold leading-tight text-foreground">
              {greeting}, {firstName} <span aria-hidden="true">👋</span>
            </h1>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              to="/notifications"
              aria-label="Notificações"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-card/85 text-muted-foreground shadow-elegant hover:text-foreground"
            >
              <Bell className="h-5 w-5" />
            </Link>
            <Link to="/profile" aria-label="Abrir perfil">
              <Avatar className="h-11 w-11 border border-primary/30 shadow-glow">
                <AvatarImage src={profile?.avatar_url || undefined} alt={fullName} />
                <AvatarFallback className="bg-gradient-primary text-sm font-extrabold text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Link>
          </div>
        </header>

        {weeklyGoal ? (
          <div className="rounded-[1.15rem] border border-white/10 bg-card p-4 shadow-elegant">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <Target className="h-4 w-4" />
                </span>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Sua semana</p>
              </div>
              <span className="shrink-0 text-sm font-extrabold text-foreground">
                {weekWorkoutDays} de {weeklyGoal} treinos
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary/50">
              <div
                className="h-full rounded-full bg-gradient-primary transition-all"
                style={{ width: `${weeklyGoalPercent}%` }}
              />
            </div>
            <Link
              to="/settings?edit=weekly_goal"
              className="mt-2 inline-block text-[11px] font-semibold text-muted-foreground/70 hover:text-muted-foreground"
            >
              Alterar meta
            </Link>
          </div>
        ) : null}

        <WeeklyCaloriesChart
          entries={(strengthWorkouts ?? []).map((workout) => ({ date: workout.date, calories: workout.calories }))}
        />

        <div className="grid grid-cols-2 gap-3">
          <Link
            to="/workouts/dashboard"
            className="flex flex-col gap-2 rounded-[1.15rem] border border-white/10 bg-card p-4 shadow-elegant transition-transform hover:-translate-y-0.5"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Flame className="h-4 w-4" />
            </span>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted-foreground">Consistência</p>
            <p className="text-lg font-black leading-tight text-foreground">
              {activeDaysLast30} {activeDaysLast30 === 1 ? "dia ativo" : "dias ativos"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {workoutsLast30.length} {workoutsLast30.length === 1 ? "treino" : "treinos"} nos últimos 30 dias
            </p>
          </Link>

          <Link
            to="/body-progress"
            className="flex flex-col gap-2 rounded-[1.15rem] border border-white/10 bg-card p-4 shadow-elegant transition-transform hover:-translate-y-0.5"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
              {weightDelta != null && weightDelta < 0 ? (
                <TrendingDown className="h-4 w-4" />
              ) : (
                <TrendingUp className="h-4 w-4" />
              )}
            </span>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted-foreground">Evolução</p>
            {latestWeight != null ? (
              <>
                <p className="text-lg font-black leading-tight text-foreground">{formatWeight(latestWeight)} kg</p>
                {weightDelta != null ? (
                  <p className="text-[11px] font-semibold text-muted-foreground">
                    <span
                      className={cn(
                        movingTowardGoal == null ? "" : movingTowardGoal ? "text-emerald-300" : "text-amber-300",
                      )}
                    >
                      {weightDelta < 0 ? "↓" : weightDelta > 0 ? "↑" : "="} {formatWeight(Math.abs(weightDelta))}
                    </span>{" "}
                    kg desde a última pesagem
                  </p>
                ) : (
                  <p className="text-[11px] text-muted-foreground">Ainda sem comparação</p>
                )}
              </>
            ) : (
              <p className="text-sm font-bold leading-snug text-foreground">Registre seu peso pra acompanhar</p>
            )}
          </Link>
        </div>

        <section className="space-y-3">
          <SectionLabel>Seu resumo</SectionLabel>
          <div className="relative">
            <div
              ref={summaryCarouselRef}
              className="hide-scrollbar flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory"
            >
            <Link
              to="/body-progress"
              className={cn(SLIDE_CLASS, "flex flex-col justify-between gap-4 border border-white/10 bg-card p-5")}
            >
              <div className="flex items-center gap-4">
                {latestPhoto ? (
                  <img
                    src={resolveUploadUrl(latestPhoto.image_url) ?? undefined}
                    alt="Última foto de evolução"
                    className="h-14 w-14 shrink-0 rounded-2xl object-cover"
                  />
                ) : (
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                    <Camera className="h-6 w-6" />
                  </span>
                )}
                <div className="min-w-0">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-primary">
                    {latestPhoto ? format(parseISO(latestPhoto.taken_at), "d 'de' MMMM", { locale: ptBR }) : "Evolução visual"}
                  </p>
                  <p className="mt-1 truncate text-lg font-black text-foreground">
                    {latestPhoto ? "Ver sua evolução" : "Registre sua primeira foto"}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {latestPhoto ? "Compare com fotos anteriores" : "Acompanhe visualmente sua mudança ao longo do tempo"}
              </p>
            </Link>

            <Link
              to="/appointments"
              className={cn(SLIDE_CLASS, "flex flex-col justify-between gap-4 border border-white/10 bg-card p-5")}
            >
              <div className="flex items-center gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                  <HeartPulse className="h-6 w-6" />
                </span>
                <div className="min-w-0">
                  {nextAppointment ? (
                    <>
                      <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-primary">
                        {nextAppointment.scheduled_date
                          ? format(parseISO(nextAppointment.scheduled_date), "d 'de' MMMM", { locale: ptBR })
                          : "Aguardando confirmação"}
                      </p>
                      <p className="mt-1 truncate text-lg font-black text-foreground">
                        {appointmentTypeLabels[nextAppointment.type] ?? nextAppointment.type}
                      </p>
                    </>
                  ) : (
                    <p className="mt-1 truncate text-lg font-black text-foreground">Nenhuma consulta agendada</p>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {nextAppointment && nextAppointment.scheduled_time
                  ? nextAppointment.scheduled_time
                  : "Toque para agendar com a Dra. Gabriela"}
              </p>
              {nextAppointment?.admin_notes ? (
                <div className="mt-1 rounded-xl border border-dashed border-primary/45 bg-primary/10 p-2.5">
                  <p className="flex items-center gap-1.5 text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-primary">
                    <MessageCircle className="h-3 w-3" />
                    Recado da consulta
                  </p>
                  <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-foreground">
                    "{nextAppointment.admin_notes}"
                  </p>
                  <p className="mt-1 text-[10px] text-muted-foreground">{formatUpdatedAgo(nextAppointment.updated_at)}</p>
                </div>
              ) : null}
            </Link>

            <Link
              to="/profile"
              className={cn(SLIDE_CLASS, "flex flex-col justify-between gap-4 border border-primary bg-card p-5")}
            >
              <div className="flex items-center gap-4">
                {showRecentAchievement ? (
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground">
                    <Trophy className="h-6 w-6" />
                  </span>
                ) : (
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                    <Lock className="h-6 w-6" />
                  </span>
                )}
                <div className="min-w-0">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-primary">
                    {showRecentAchievement
                      ? formatUnlockedAt(latestAchievement?.unlocked_at)
                      : nextAchievement
                        ? "Continue registrando para desbloquear"
                        : "Comece hoje"}
                  </p>
                  <p className="mt-1 truncate text-lg font-black text-foreground">
                    {showRecentAchievement
                      ? latestAchievement?.achievement.name
                      : nextAchievement?.name ?? "Primeira conquista te espera"}
                  </p>
                </div>
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {showRecentAchievement
                  ? latestAchievement?.achievement.description
                  : nextAchievement?.description ?? "Registre uma aplicação ou um treino para começar sua sequência."}
              </p>
            </Link>
            </div>
            <button
              type="button"
              onClick={() => summaryCarouselRef.current?.scrollBy({ left: -260, behavior: "smooth" })}
              aria-label="Ver anterior no resumo"
              className="absolute left-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-card text-foreground shadow-elegant"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => summaryCarouselRef.current?.scrollBy({ left: 260, behavior: "smooth" })}
              aria-label="Ver mais no resumo"
              className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-card text-foreground shadow-elegant"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </section>

        <section className="space-y-3">
          <SectionLabel>Treino</SectionLabel>
          <div className="space-y-3">
            {workoutLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="group flex items-center gap-4 rounded-[1.15rem] border border-white/10 bg-card px-4 py-4 shadow-elegant transition-transform hover:-translate-y-0.5"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <link.icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-extrabold text-foreground">{link.label}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">{link.description}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/45 transition-transform group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
