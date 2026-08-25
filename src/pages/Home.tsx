import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Bell,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock,
  Dumbbell,
  Flame,
  HeartPulse,
  Lock,
  RotateCcw,
  Syringe,
  Target,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { differenceInCalendarDays, format, isSameMonth, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { WeeklyCaloriesChart } from "@/components/home/WeeklyCaloriesChart";
import { useAchievements } from "@/hooks/useAchievements";
import { useProfile } from "@/hooks/useProfile";
import { useBodyProgress } from "@/hooks/useBodyProgress";
import { api, resolveUploadUrl } from "@/lib/api";
import { fetchStrengthWorkouts, findActiveWorkoutDraft, type ActiveWorkoutDraft } from "@/lib/workoutApi";
import { cn } from "@/lib/utils";

interface InjectableEntry {
  id: string;
  medication: string;
  dose: string;
  date: string;
  time: string;
  location: string;
}

interface BioimpedanceRecordApi {
  id: string;
  date: string;
  weightKg: number | string | null;
  idealWeightKg: number | string | null;
}

interface AppointmentEntry {
  id: string;
  type: string;
  status: string;
  scheduled_date: string | null;
  scheduled_time: string | null;
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

function formatUnlockedAt(value?: string) {
  if (!value) return "Continue cuidando da sua saúde";

  const unlockedAt = parseISO(value);
  if (Number.isNaN(unlockedAt.getTime())) return "Conquista desbloqueada";

  const days = differenceInCalendarDays(new Date(), unlockedAt);
  if (days <= 0) return "Desbloqueada hoje";
  if (days === 1) return "Desbloqueada há 1 dia";
  return `Desbloqueada há ${days} dias`;
}

function formatWeight(value: number) {
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value);
}

function daysSinceLabel(days: number) {
  if (days <= 0) return "Aplicada hoje";
  if (days === 1) return "Há 1 dia";
  return `Há ${days} dias`;
}

type Tone = "default" | "positive" | "warning";

const bannerToneClasses: Record<Tone, string> = {
  default: "border-white/10 bg-card text-foreground",
  positive: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
  warning: "border-amber-300/25 bg-amber-300/10 text-amber-200",
};

const goalBadgeToneClasses: Record<Tone, string> = {
  default: "bg-primary/15 text-primary",
  positive: "bg-emerald-400/15 text-emerald-300",
  warning: "bg-amber-300/15 text-amber-300",
};

function SectionLabel({ children }: { children: string }) {
  return (
    <h2 className="px-1 text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
      {children}
    </h2>
  );
}

function getConsistencyInfo(days: number | null): { title: string; subtitle: string; tone: Tone; icon: LucideIcon } {
  if (days === null) {
    return {
      title: "Comece sua jornada",
      subtitle: "Registre algo pra abrir seu acompanhamento.",
      tone: "default",
      icon: Flame,
    };
  }
  if (days <= 0) {
    return {
      title: "Você já treinou hoje!",
      subtitle: "Continue assim, sua consistência importa.",
      tone: "positive",
      icon: Flame,
    };
  }
  if (days === 1) {
    return {
      title: "Continue firme!",
      subtitle: "Última atividade foi ontem.",
      tone: "positive",
      icon: Flame,
    };
  }
  if (days <= 3) {
    return {
      title: "Você está no caminho certo!",
      subtitle: `Já fazem ${days} dias desde seu último registro.`,
      tone: "default",
      icon: Flame,
    };
  }
  return {
    title: "Vamos retomar?",
    subtitle: `Já fazem ${days} dias sem nenhum registro.`,
    tone: "warning",
    icon: Clock,
  };
}

const SLIDE_CLASS =
  "w-[85%] shrink-0 snap-center rounded-[1.35rem] shadow-elegant sm:w-[340px]";

export default function Home() {
  const { profile, loading, error: profileError } = useProfile();
  const { achievements, userAchievements, latestAchievement } = useAchievements();
  const { photos } = useBodyProgress();
  const today = useMemo(() => new Date(), []);
  const [activeDraft, setActiveDraft] = useState<ActiveWorkoutDraft | null>(null);
  const summaryCarouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActiveDraft(findActiveWorkoutDraft());
  }, []);

  const { data: injectables } = useQuery({
    queryKey: ["home", "injectables"],
    queryFn: async () => (await api.get<{ injectables: InjectableEntry[] }>("/injectables")).injectables,
  });

  const { data: bioimpedanceRecords } = useQuery({
    queryKey: ["home", "bioimpedance"],
    queryFn: async () => (await api.get<{ records: BioimpedanceRecordApi[] }>("/bioimpedance/mine")).records,
  });

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

  const latestInjectable = injectables?.[0];
  const daysSinceInjectable = latestInjectable
    ? differenceInCalendarDays(today, parseISO(latestInjectable.date))
    : null;
  const injectablesThisMonth = (injectables ?? []).filter((item) => {
    const date = parseISO(item.date);
    return !Number.isNaN(date.getTime()) && isSameMonth(date, today);
  }).length;

  const sortedBioimpedance = [...(bioimpedanceRecords ?? [])].sort(
    (a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime(),
  );
  const latestWeight = sortedBioimpedance[0]?.weightKg != null ? Number(sortedBioimpedance[0].weightKg) : null;
  const previousWeight = sortedBioimpedance[1]?.weightKg != null ? Number(sortedBioimpedance[1].weightKg) : null;
  const weightDelta = latestWeight != null && previousWeight != null ? latestWeight - previousWeight : null;
  const latestIdealWeight =
    sortedBioimpedance[0]?.idealWeightKg != null ? Number(sortedBioimpedance[0].idealWeightKg) : null;

  const goalWeight = profile?.weight_goal_kg ?? latestIdealWeight;
  const weightToGoal = goalWeight != null && latestWeight != null ? latestWeight - goalWeight : null;
  const atGoal = weightToGoal != null && Math.abs(weightToGoal) < 0.5;
  const movingTowardGoal =
    weightDelta != null && weightToGoal != null
      ? (weightToGoal > 0 && weightDelta < 0) || (weightToGoal < 0 && weightDelta > 0)
      : null;

  let goalValue = "--";
  let goalTone: Tone = "default";
  let GoalIcon: LucideIcon = Target;

  if (weightToGoal != null) {
    if (atGoal) {
      goalValue = "Na meta!";
      goalTone = "positive";
      GoalIcon = CheckCircle2;
    } else {
      goalValue = `${formatWeight(Math.abs(weightToGoal))} kg para a meta`;
      goalTone = movingTowardGoal === false ? "warning" : "default";
    }
  }

  const nextAppointment = (appointments ?? [])
    .filter((appointment) => appointment.status !== "cancelled" && appointment.status !== "completed")
    .sort((a, b) => {
      if (!a.scheduled_date) return 1;
      if (!b.scheduled_date) return -1;
      return parseISO(a.scheduled_date).getTime() - parseISO(b.scheduled_date).getTime();
    })[0];

  const latestPhoto = photos[0] ?? null;

  const lastActivityTimestamps = [latestInjectable?.date, sortedBioimpedance[0]?.date, latestPhoto?.taken_at]
    .filter((value): value is string => Boolean(value))
    .map((value) => parseISO(value).getTime())
    .filter((time) => !Number.isNaN(time));
  const daysSinceActivity =
    lastActivityTimestamps.length > 0
      ? differenceInCalendarDays(today, new Date(Math.max(...lastActivityTimestamps)))
      : null;
  const consistency = getConsistencyInfo(daysSinceActivity);

  const unlockedAchievementIds = new Set(userAchievements.map((ua) => ua.achievement_id));
  const nextAchievement = [...achievements]
    .sort((a, b) => a.sort_order - b.sort_order)
    .find((achievement) => !unlockedAchievementIds.has(achievement.id));
  const daysSinceAchievement = latestAchievement
    ? differenceInCalendarDays(today, parseISO(latestAchievement.unlocked_at))
    : null;
  const showRecentAchievement = latestAchievement != null && daysSinceAchievement != null && daysSinceAchievement <= 3;

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

        <WeeklyCaloriesChart
          entries={(strengthWorkouts ?? []).map((workout) => ({ date: workout.date, calories: workout.calories }))}
        />

        <Link
          to="/body-progress"
          className={cn(
            "flex items-center gap-4 rounded-[1rem] border px-4 py-3 transition-transform hover:-translate-y-0.5",
            bannerToneClasses[consistency.tone],
          )}
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-current/30">
            <consistency.icon className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-extrabold leading-snug">{consistency.title}</span>
            <span className="mt-0.5 block truncate text-xs opacity-80">{consistency.subtitle}</span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 opacity-60" />
        </Link>

        <section className="space-y-3">
          <SectionLabel>Seu resumo</SectionLabel>
          <div className="relative">
            <div
              ref={summaryCarouselRef}
              className="hide-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5 pb-1 snap-x snap-mandatory md:-mx-7 md:px-7"
            >
            <div className={cn(SLIDE_CLASS, "relative overflow-hidden bg-gradient-primary px-5 py-5 text-primary-foreground")}>
              <span className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary-foreground/10" aria-hidden="true" />
              <div className="relative">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-primary-foreground/75">
                  {latestInjectable ? "Última aplicação" : "Injetáveis"}
                </p>

                {latestInjectable ? (
                  <>
                    <h2 className="mt-1 truncate text-2xl font-black leading-tight">{latestInjectable.medication}</h2>
                    <p className="mt-1 text-sm font-semibold text-primary-foreground/85">
                      {daysSinceLabel(daysSinceInjectable ?? 0)} · {latestInjectable.dose}
                    </p>
                    <p className="mt-1 text-xs text-primary-foreground/70">{injectablesThisMonth} aplicações este mês</p>
                  </>
                ) : (
                  <h2 className="mt-1 text-2xl font-black leading-tight">Registre sua primeira aplicação</h2>
                )}

                <Link
                  to="/injectables/new"
                  className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-primary-foreground px-4 text-xs font-black text-primary"
                >
                  <Syringe className="h-4 w-4" />
                  Registrar aplicação
                </Link>
              </div>
            </div>

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

            <div className={cn(SLIDE_CLASS, "flex flex-col justify-between gap-4 border border-white/10 bg-card p-5")}>
              <div className="flex items-center gap-4">
                <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", goalBadgeToneClasses[goalTone])}>
                  <GoalIcon className="h-6 w-6" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-primary">Rumo à meta</p>
                  <p className="mt-1 truncate text-lg font-black text-foreground">{goalValue}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {latestWeight != null ? `Peso atual: ${formatWeight(latestWeight)} kg` : "Registre seu peso pra acompanhar"}
              </p>
            </div>

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
          <div className="rounded-[1.15rem] border border-white/10 bg-card shadow-elegant">
            {workoutLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="group flex items-center gap-4 border-b border-white/10 px-4 py-4 last:border-b-0 transition-transform hover:-translate-y-0.5"
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
