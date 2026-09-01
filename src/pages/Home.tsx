import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Bell,
  Calendar,
  Camera,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Flame,
  Home as HomeIcon,
  MessageCircle,
  Moon,
  PersonStanding,
  RotateCcw,
  Sun,
  Target,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { differenceInCalendarDays, endOfWeek, format, parseISO, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { WeeklyCaloriesChart } from "@/components/home/WeeklyCaloriesChart";
import { APPOINTMENT_TYPE_LABELS, APPOINTMENT_STATUS_LABELS } from "@/lib/appointmentLabels";
import { useProfile } from "@/hooks/useProfile";
import { useTheme } from "@/hooks/useTheme";
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

function SectionLabel({ children }: { children: string }) {
  return (
    <h2 className="px-1 text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
      {children}
    </h2>
  );
}

const workoutCategories: Array<{ type: string; label: string; icon: LucideIcon }> = [
  { type: "academia", label: "Academia", icon: Dumbbell },
  { type: "em-casa", label: "Em Casa", icon: HomeIcon },
  { type: "crossfit", label: "CrossFit", icon: Flame },
  { type: "calistenia", label: "Calistenia", icon: PersonStanding },
];

// Casos reais de pacientes (placeholder até termos fotos e depoimentos autorizados).
const vital360Cases: Array<{ name: string; plan: string }> = [
  { name: "Marina", plan: "Essencial" },
  { name: "Rodrigo", plan: "Completo" },
  { name: "Camila", plan: "Essencial" },
  { name: "Bruno", plan: "Completo" },
];

const exampleWorkouts: Array<{ title: string; meta: string; type: string; icon: LucideIcon }> = [
  { title: "Peito e Tríceps", meta: "45 min · Intermediário", type: "academia", icon: Dumbbell },
  { title: "HIIT Full Body", meta: "30 min · Avançado", type: "crossfit", icon: Flame },
  { title: "Treino em Casa", meta: "20 min · Iniciante", type: "em-casa", icon: HomeIcon },
  { title: "Calistenia Base", meta: "25 min · Intermediário", type: "calistenia", icon: PersonStanding },
];

const SLIDE_CLASS =
  "w-[327px] h-[155px] shrink-0 snap-center overflow-hidden rounded-[1.35rem] shadow-elegant";

export default function Home() {
  const { profile, loading, error: profileError } = useProfile();
  const { theme, setTheme } = useTheme();
  const { photos } = useBodyProgress();
  const { latestRecord: latestBio, previousRecord: previousBio, getDifference } = useBioimpedance();
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
  const greeting = getGreeting(today.getHours());

  const nextAppointment = (appointments ?? [])
    .filter((appointment) => appointment.status !== "cancelled" && appointment.status !== "completed")
    .sort((a, b) => {
      if (!a.scheduled_date) return 1;
      if (!b.scheduled_date) return -1;
      return parseISO(a.scheduled_date).getTime() - parseISO(b.scheduled_date).getTime();
    })[0];

  const daysUntilAppointment = nextAppointment?.scheduled_date
    ? differenceInCalendarDays(parseISO(nextAppointment.scheduled_date), today)
    : null;

  const latestPhoto = photos[0] ?? null;
  const previousPhoto = photos[1] ?? null;

  const weekStart = startOfWeek(today, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 0 });

  const workoutDates = (strengthWorkouts ?? []).map((workout) => parseISO(`${workout.date}T12:00:00`));
  const dateKey = (date: Date) => format(date, "yyyy-MM-dd");

  const weekWorkoutDays = new Set(
    workoutDates.filter((date) => date >= weekStart && date <= weekEnd).map(dateKey),
  ).size;
  const weeklyGoal = profile?.weekly_workout_goal ?? null;
  const weeklyGoalPercent = weeklyGoal ? Math.min(100, Math.round((weekWorkoutDays / weeklyGoal) * 100)) : null;

  const latestWeight = latestBio?.weight_kg ?? null;
  const previousWeight = previousBio?.weight_kg ?? null;
  const weightDelta = getDifference(latestWeight, previousWeight);
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

  return (
    <div className="min-h-full bg-[hsl(var(--background))]">
      <div className="mx-auto flex min-h-full w-full max-w-[430px] flex-col gap-4 px-5 pb-28 pt-6 md:max-w-[1180px] md:px-7 md:pb-8 md:pt-7">
        <header className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="mt-1 text-xs text-muted-foreground">{formatHomeDate(today)}</p>
            <h1 className="mt-1 truncate text-[21px] font-extrabold leading-tight text-foreground">
              {greeting}, {firstName}
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
            <button
              type="button"
              onClick={() => setTheme(theme === "roxo" ? "preto" : "roxo")}
              aria-label={theme === "roxo" ? "Mudar para tema escuro" : "Mudar para tema claro"}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-card/85 text-muted-foreground shadow-elegant hover:text-foreground"
            >
              {theme === "roxo" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </button>
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

        <section className="space-y-3">
          <SectionLabel>Acompanhamento</SectionLabel>
          <div className="relative">
            <div
              ref={summaryCarouselRef}
              className="hide-scrollbar flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory"
            >
            <Link
              to="/body-progress"
              className={cn(SLIDE_CLASS, "flex flex-col gap-1.5 border border-white/10 bg-card px-4 py-3.5")}
            >
              <div className="flex items-center gap-2">
                <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  {weightDelta != null && weightDelta < 0 ? (
                    <TrendingDown className="h-3.5 w-3.5" />
                  ) : (
                    <TrendingUp className="h-3.5 w-3.5" />
                  )}
                </span>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary">Evolução</p>
              </div>
              <div className="flex min-h-0 flex-1 flex-col justify-center">
                {latestWeight != null ? (
                  <>
                    <p className="text-[26px] font-black leading-none text-foreground">
                      {formatWeight(latestWeight)} kg
                    </p>
                    {weightDelta != null ? (
                      <p className="mt-1.5 text-xs font-semibold text-muted-foreground">
                        <span
                          className={cn(
                            movingTowardGoal == null ? "" : movingTowardGoal ? "text-emerald-300" : "text-amber-300",
                          )}
                        >
                          {weightDelta < 0 ? "↓" : weightDelta > 0 ? "↑" : "="} {formatWeight(Math.abs(weightDelta))} kg
                        </span>{" "}
                        desde a última pesagem
                      </p>
                    ) : (
                      <p className="mt-1.5 text-xs text-muted-foreground">Ainda sem comparação</p>
                    )}
                  </>
                ) : (
                  <p className="text-sm font-bold leading-snug text-foreground">Registre seu peso pra acompanhar</p>
                )}
              </div>
            </Link>

            <Link
              to="/body-progress"
              className={cn(SLIDE_CLASS, "flex flex-col gap-1.5 border border-white/10 bg-card px-4 py-3.5")}
            >
              <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-primary">Evolução visual</p>
              <div className="flex min-h-0 flex-1 gap-2">
                {[previousPhoto, latestPhoto].map((photo, index) =>
                  photo ? (
                    <img
                      key={photo.id}
                      src={resolveUploadUrl(photo.image_url) ?? undefined}
                      alt="Foto de evolução"
                      className="h-full flex-1 rounded-xl object-cover"
                    />
                  ) : (
                    <div
                      key={`empty-${index}`}
                      className="flex h-full flex-1 items-center justify-center rounded-xl border border-dashed border-white/15 text-muted-foreground"
                    >
                      <Camera className="h-5 w-5" />
                    </div>
                  ),
                )}
              </div>
            </Link>

            <Link
              to="/appointments"
              className={cn(SLIDE_CLASS, "flex flex-col gap-1 border border-white/10 bg-card px-4 py-3.5")}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    <Calendar className="h-3.5 w-3.5" />
                  </span>
                  <p className="truncate text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary">
                    Agendamento
                  </p>
                </div>
                {nextAppointment
                  ? (() => {
                      const status = APPOINTMENT_STATUS_LABELS[nextAppointment.status] ?? APPOINTMENT_STATUS_LABELS.pending;
                      const StatusIcon = status.icon;
                      return (
                        <span
                          className={cn(
                            "flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold",
                            status.className,
                          )}
                        >
                          <StatusIcon className="h-2.5 w-2.5" />
                          {status.label}
                        </span>
                      );
                    })()
                  : null}
              </div>

              <div className="flex min-h-0 flex-1 flex-col justify-center gap-0.5">
                {nextAppointment ? (
                  <>
                    <p className="truncate text-base font-black leading-tight text-foreground">
                      {APPOINTMENT_TYPE_LABELS[nextAppointment.type] ?? nextAppointment.type}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {nextAppointment.scheduled_date
                        ? format(parseISO(nextAppointment.scheduled_date), "d 'de' MMMM", { locale: ptBR })
                        : "A combinar"}
                      {" · "}
                      {nextAppointment.scheduled_time ?? "A combinar"}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-base font-black leading-tight text-foreground">Nenhuma consulta agendada</p>
                    <p className="text-xs text-muted-foreground">Toque para agendar com a Dra. Gabriela</p>
                  </>
                )}
              </div>

              {nextAppointment?.admin_notes ? (
                <p className="flex items-center gap-1.5 text-[10.5px] font-bold text-primary">
                  <MessageCircle className="h-3.5 w-3.5 shrink-0" />
                  Novo recado da consulta
                </p>
              ) : nextAppointment && daysUntilAppointment != null && daysUntilAppointment >= 0 ? (
                <p className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
                  <Bell className="h-3.5 w-3.5 shrink-0 text-primary" />
                  {daysUntilAppointment === 0 ? (
                    <span className="font-bold text-foreground">Hoje é sua consulta!</span>
                  ) : (
                    <>
                      Faltam {daysUntilAppointment} {daysUntilAppointment === 1 ? "dia" : "dias"} ·{" "}
                      <span className="font-bold text-foreground">Estamos te esperando!</span>
                    </>
                  )}
                </p>
              ) : null}
            </Link>
            </div>
            <button
              type="button"
              onClick={() => summaryCarouselRef.current?.scrollBy({ left: -260, behavior: "smooth" })}
              aria-label="Ver anterior no resumo"
              className="absolute left-1 top-[27px] flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-card text-foreground shadow-elegant"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => summaryCarouselRef.current?.scrollBy({ left: 260, behavior: "smooth" })}
              aria-label="Ver mais no resumo"
              className="absolute right-1 top-[27px] flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-card text-foreground shadow-elegant"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div>
              <SectionLabel>Vital 360°</SectionLabel>
              <p className="mt-1 text-[11px] text-muted-foreground">Acompanhamento anual com a Dra. Gabriela</p>
            </div>
            <Link to="/vital-360" className="flex shrink-0 items-center gap-0.5 text-xs font-extrabold text-primary">
              Ver planos
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="hide-scrollbar flex gap-3 overflow-x-auto pb-1">
            {vital360Cases.map((item) => (
              <Link
                key={item.name}
                to="/vital-360"
                className="w-[150px] shrink-0 overflow-hidden rounded-[1.15rem] border border-white/10 bg-card shadow-elegant transition-transform hover:-translate-y-0.5"
              >
                <div className="flex aspect-square items-center justify-center bg-[linear-gradient(160deg,hsl(270_45%_32%),hsl(270_40%_22%))] text-muted-foreground">
                  <Camera className="h-6 w-6" />
                </div>
                <p className="truncate px-2.5 py-2 text-[11.5px] font-bold text-foreground">
                  {item.name} · {item.plan}
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <SectionLabel>Treinos</SectionLabel>
            <Link to="/workouts" className="flex shrink-0 items-center gap-0.5 text-xs font-extrabold text-primary">
              Ver todos
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {activeDraft ? (
            <Link
              to={`/workouts/musculacao/${activeDraft.type}`}
              className="group flex items-center gap-4 rounded-[1.15rem] border border-white/10 bg-card px-4 py-4 shadow-elegant transition-transform hover:-translate-y-0.5"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <RotateCcw className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-extrabold text-foreground">Continuar treino</span>
                <span className="block truncate text-[11px] text-muted-foreground">Retome de onde parou</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/45 transition-transform group-hover:translate-x-0.5" />
            </Link>
          ) : null}

          <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-1">
            <Link
              to="/workouts"
              className="flex h-11 shrink-0 items-center gap-2 rounded-full bg-gradient-primary px-4 text-sm font-bold text-primary-foreground shadow-glow"
            >
              Todos
            </Link>
            {workoutCategories.map((category) => (
              <Link
                key={category.type}
                to={`/workouts/musculacao/${category.type}`}
                className="flex h-11 shrink-0 items-center gap-2 rounded-full border border-white/10 bg-card px-4 text-sm font-bold text-foreground shadow-elegant transition-transform hover:-translate-y-0.5"
              >
                <category.icon className="h-4 w-4 text-primary" />
                {category.label}
              </Link>
            ))}
          </div>

          <div className="hide-scrollbar flex gap-3 overflow-x-auto pb-1">
            {exampleWorkouts.map((workout) => (
              <Link
                key={workout.title}
                to={`/workouts/musculacao/${workout.type}`}
                className="w-[170px] shrink-0 overflow-hidden rounded-[1.15rem] border border-white/10 bg-card shadow-elegant transition-transform hover:-translate-y-0.5"
              >
                <div className="flex h-[100px] items-center justify-center bg-[linear-gradient(160deg,hsl(270_45%_34%),hsl(270_40%_20%))] text-primary">
                  <workout.icon className="h-6 w-6" />
                </div>
                <div className="p-2.5">
                  <p className="truncate text-[12.5px] font-extrabold text-foreground">{workout.title}</p>
                  <p className="mt-0.5 text-[10.5px] text-muted-foreground">{workout.meta}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
