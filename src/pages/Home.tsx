import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock,
  Flame,
  HeartPulse,
  Lock,
  Scale,
  Syringe,
  Target,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { differenceInCalendarDays, format, isSameMonth, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAchievements } from "@/hooks/useAchievements";
import { useProfile } from "@/hooks/useProfile";
import { useBodyProgress } from "@/hooks/useBodyProgress";
import { api, resolveUploadUrl } from "@/lib/api";
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
  if (!value) return "Continue cuidando da sua saúde";

  const unlockedAt = parseISO(value);
  if (Number.isNaN(unlockedAt.getTime())) return "Conquista desbloqueada";

  const days = differenceInCalendarDays(new Date(), unlockedAt);
  if (days <= 0) return "Desbloqueada hoje";
  if (days === 1) return "Desbloqueada há 1 dia";
  return `Desbloqueada há ${days} dias`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(Math.round(value));
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

const toneTextClasses: Record<Tone, string> = {
  default: "text-primary",
  positive: "text-emerald-300",
  warning: "text-amber-300",
};

const bannerToneClasses: Record<Tone, string> = {
  default: "border-white/10 bg-card text-foreground",
  positive: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
  warning: "border-amber-300/25 bg-amber-300/10 text-amber-200",
};

function StatCard({
  icon: Icon,
  value,
  label,
  tone = "default",
}: {
  icon: LucideIcon;
  value: string;
  label: string;
  tone?: Tone;
}) {
  return (
    <div className="min-w-0 rounded-[1rem] border border-white/10 bg-card px-3 py-4 text-center shadow-elegant">
      <Icon className={cn("mx-auto h-4 w-4", toneTextClasses[tone])} />
      <p className={cn("mt-2 truncate text-lg font-extrabold leading-none", toneTextClasses[tone])}>{value}</p>
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

function getConsistencyInfo(days: number | null): { title: string; tone: Tone; icon: LucideIcon } {
  if (days === null) {
    return { title: "Comece hoje o seu acompanhamento — registre algo pra abrir sua jornada", tone: "default", icon: Flame };
  }
  if (days <= 0) {
    return { title: "Você já registrou algo hoje. Continue assim!", tone: "positive", icon: Flame };
  }
  if (days === 1) {
    return { title: "Última atividade: ontem. Bora manter o ritmo hoje?", tone: "positive", icon: Flame };
  }
  if (days <= 3) {
    return { title: `Já fazem ${days} dias desde seu último registro`, tone: "default", icon: Flame };
  }
  return { title: `Já fazem ${days} dias sem nenhum registro — vamos retomar?`, tone: "warning", icon: Clock };
}

export default function Home() {
  const { profile, loading, error: profileError } = useProfile();
  const { achievements, userAchievements, latestAchievement } = useAchievements();
  const { photos } = useBodyProgress();
  const today = useMemo(() => new Date(), []);

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
  let goalLabel = "Defina sua meta";
  let goalTone: Tone = "default";
  let GoalIcon: LucideIcon = Target;

  if (weightToGoal != null) {
    if (atGoal) {
      goalValue = "Na meta!";
      goalLabel = "Parabéns";
      goalTone = "positive";
      GoalIcon = CheckCircle2;
    } else {
      goalValue = `${formatWeight(Math.abs(weightToGoal))} kg`;
      goalLabel = "para a meta";
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

  return (
    <div className="min-h-full bg-[hsl(var(--background))]">
      <div className="mx-auto flex min-h-full w-full max-w-[430px] flex-col gap-4 px-5 pb-28 pt-6 md:max-w-[1180px] md:px-7 md:pb-8 md:pt-7">
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
            <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-primary-foreground/75">
              {latestInjectable ? "Última aplicação" : "Injetáveis"}
            </p>

            {latestInjectable ? (
              <>
                <h2 className="mt-1 truncate text-2xl font-black leading-tight">{latestInjectable.medication}</h2>
                <p className="mt-1 text-sm font-semibold text-primary-foreground/85">
                  {daysSinceLabel(daysSinceInjectable ?? 0)} · {latestInjectable.dose}
                </p>
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
        </section>

        <Link
          to="/body-progress"
          className={cn(
            "flex items-center gap-3 rounded-[1rem] border px-4 py-3 transition-transform hover:-translate-y-0.5",
            bannerToneClasses[consistency.tone],
          )}
        >
          <consistency.icon className="h-5 w-5 shrink-0" />
          <span className="min-w-0 flex-1 text-xs font-semibold leading-snug">{consistency.title}</span>
          <ChevronRight className="h-4 w-4 shrink-0 opacity-60" />
        </Link>

        <section className="grid grid-cols-3 gap-3">
          <StatCard icon={Scale} value={latestWeight != null ? `${formatWeight(latestWeight)} kg` : "--"} label="Peso atual" />
          <StatCard icon={GoalIcon} value={goalValue} label={goalLabel} tone={goalTone} />
          <StatCard icon={Syringe} value={formatNumber(injectablesThisMonth)} label="Aplicações no mês" />
        </section>

        <section className="space-y-3">
          <SectionLabel>Sua evolução visual</SectionLabel>
          <Link
            to="/body-progress"
            className="flex items-center gap-4 rounded-[1.15rem] border border-white/10 bg-card px-4 py-4 shadow-elegant transition-transform hover:-translate-y-0.5"
          >
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
            <span className="min-w-0 flex-1">
              {latestPhoto ? (
                <>
                  <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-primary">
                    {format(parseISO(latestPhoto.taken_at), "d 'de' MMMM", { locale: ptBR })}
                  </span>
                  <span className="mt-1 block truncate text-sm font-extrabold text-foreground">Ver sua evolução</span>
                  <span className="mt-1 block truncate text-[11px] text-muted-foreground">
                    Compare com fotos anteriores
                  </span>
                </>
              ) : (
                <>
                  <span className="block text-sm font-extrabold text-foreground">Registre sua primeira foto</span>
                  <span className="mt-1 block truncate text-[11px] text-muted-foreground">
                    Acompanhe visualmente sua mudança ao longo do tempo
                  </span>
                </>
              )}
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground/45" />
          </Link>
        </section>

        <section className="space-y-3">
          <SectionLabel>Próxima consulta</SectionLabel>
          <Link
            to="/appointments"
            className="flex items-center gap-4 rounded-[1.15rem] border border-white/10 bg-card px-4 py-4 shadow-elegant transition-transform hover:-translate-y-0.5"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <HeartPulse className="h-6 w-6" />
            </span>
            <span className="min-w-0 flex-1">
              {nextAppointment ? (
                <>
                  <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-primary">
                    {nextAppointment.scheduled_date
                      ? format(parseISO(nextAppointment.scheduled_date), "d 'de' MMMM", { locale: ptBR })
                      : "Aguardando confirmação"}
                  </span>
                  <span className="mt-1 block truncate text-sm font-extrabold text-foreground">
                    {appointmentTypeLabels[nextAppointment.type] ?? nextAppointment.type}
                  </span>
                  {nextAppointment.scheduled_time ? (
                    <span className="mt-1 block text-[11px] text-muted-foreground">{nextAppointment.scheduled_time}</span>
                  ) : null}
                </>
              ) : (
                <>
                  <span className="block text-sm font-extrabold text-foreground">Nenhuma consulta agendada</span>
                  <span className="mt-1 block text-[11px] text-muted-foreground">Toque para agendar com a Dra. Gabriela</span>
                </>
              )}
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground/45" />
          </Link>
        </section>

        <section className="space-y-3">
          <SectionLabel>{showRecentAchievement ? "Sua última conquista" : "Próxima conquista"}</SectionLabel>
          <Link
            to="/profile"
            className="flex items-center gap-4 rounded-[1.15rem] border border-primary bg-card px-4 py-4 shadow-elegant transition-transform hover:-translate-y-0.5"
          >
            {showRecentAchievement ? (
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground">
                <Trophy className="h-6 w-6" />
              </span>
            ) : (
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <Lock className="h-6 w-6" />
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-primary">
                {showRecentAchievement
                  ? formatUnlockedAt(latestAchievement?.unlocked_at)
                  : nextAchievement
                    ? "Continue registrando para desbloquear"
                    : "Comece hoje"}
              </span>
              <span className="mt-1 block truncate text-sm font-extrabold text-foreground">
                {showRecentAchievement
                  ? latestAchievement?.achievement.name
                  : nextAchievement?.name ?? "Primeira conquista te espera"}
              </span>
              <span className="mt-1 block truncate text-[11px] text-muted-foreground">
                {showRecentAchievement
                  ? latestAchievement?.achievement.description
                  : nextAchievement?.description ?? "Registre uma aplicação ou um treino para começar sua sequência."}
              </span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground/45" />
          </Link>
        </section>
      </div>
    </div>
  );
}
