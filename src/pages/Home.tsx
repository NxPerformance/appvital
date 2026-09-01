import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Bell,
  ChevronRight,
  Dumbbell,
  Flame,
  Home as HomeIcon,
  Moon,
  PersonStanding,
  RotateCcw,
  Sparkles,
  Sun,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { WeeklyCaloriesChart } from "@/components/home/WeeklyCaloriesChart";
import { useProfile } from "@/hooks/useProfile";
import { useTheme } from "@/hooks/useTheme";
import { fetchStrengthWorkouts, findActiveWorkoutDraft, type ActiveWorkoutDraft } from "@/lib/workoutApi";
import { cn } from "@/lib/utils";

function getGreeting(hour: number) {
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function formatHomeDate(date: Date) {
  const formatted = format(date, "EEEE '·' d MMM yyyy", { locale: ptBR }).replace(".", "");
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function SectionLabel({ children }: { children: string }) {
  return (
    <h2 className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
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

interface HomePlan {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  available: boolean;
}

// Planos reais da Vitalissy. Os marcados como "available: false" ainda não têm
// página própria — aparecem como "Em breve" em vez de linkar pra algo que não existe.
const homePlans: HomePlan[] = [
  {
    title: "Vital 360°",
    description: "Consultas e bioimpedância com a Dra. Gabriela ao longo do ano.",
    icon: Sparkles,
    href: "/vital-360",
    available: true,
  },
  {
    title: "Ganho de Músculo",
    description: "Hipertrofia com acompanhamento de treino e nutrição.",
    icon: Dumbbell,
    href: "/vital-360",
    available: false,
  },
  {
    title: "Protocolo Glúteos",
    description: "Bioestimuladores com acompanhamento clínico completo.",
    icon: Zap,
    href: "/vital-360",
    available: false,
  },
];

const exampleWorkouts: Array<{
  title: string;
  meta: string;
  type: string;
  icon: LucideIcon;
  imagePosition: string;
}> = [
  { title: "Academia", meta: "45 min · Intermediário", type: "academia", icon: Dumbbell, imagePosition: "left top" },
  { title: "HIIT Full Body", meta: "30 min · Avançado", type: "crossfit", icon: Flame, imagePosition: "center top" },
  { title: "Treino em Casa", meta: "20 min · Iniciante", type: "em-casa", icon: HomeIcon, imagePosition: "right top" },
  { title: "Calistenia", meta: "25 min · Intermediário", type: "calistenia", icon: PersonStanding, imagePosition: "center bottom" },
];

export default function Home() {
  const { profile, loading, error: profileError } = useProfile();
  const { theme, setTheme } = useTheme();
  const today = useMemo(() => new Date(), []);
  const [activeDraft, setActiveDraft] = useState<ActiveWorkoutDraft | null>(null);

  useEffect(() => {
    setActiveDraft(findActiveWorkoutDraft());
  }, []);

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

  return (
    <div className="min-h-full bg-[hsl(var(--background))]">
      <div className="mx-auto flex min-h-full w-full max-w-[430px] flex-col px-5 pb-28 pt-6 md:max-w-[1180px] md:px-7 md:pb-8 md:pt-7">
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

        <div className="mt-4">
          <WeeklyCaloriesChart
            entries={(strengthWorkouts ?? []).map((workout) => ({ date: workout.date, calories: workout.calories }))}
          />
        </div>

        <section className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <SectionLabel>Planos</SectionLabel>
            <Link to="/vital-360" className="flex shrink-0 items-center gap-0.5 text-xs font-extrabold text-primary">
              Ver todos
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="hide-scrollbar flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory">
            {homePlans.map((plan) => {
              const cardClassName = cn(
                "flex aspect-[303/168] w-[92%] shrink-0 snap-center flex-col justify-between gap-2.5 rounded-[1.35rem] border border-white/10 bg-gradient-primary p-3.5 shadow-elegant",
                plan.available ? "transition-transform hover:-translate-y-0.5" : "opacity-70",
              );

              const content = (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-primary-foreground">
                      <plan.icon className="h-5 w-5" />
                    </span>
                    {!plan.available ? (
                      <span className="shrink-0 rounded-full bg-black/25 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-primary-foreground/85">
                        Em breve
                      </span>
                    ) : null}
                  </div>
                  <div>
                    <p className="text-base font-extrabold text-primary-foreground">{plan.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-primary-foreground/75">{plan.description}</p>
                  </div>
                  {plan.available ? (
                    <span className="inline-flex items-center gap-0.5 text-xs font-bold text-primary-foreground">
                      Ver plano
                      <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  ) : null}
                </>
              );

              return plan.available ? (
                <Link key={plan.title} to={plan.href} className={cardClassName}>
                  {content}
                </Link>
              ) : (
                <div key={plan.title} className={cardClassName}>
                  {content}
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
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
                className="relative h-[190px] w-[154px] shrink-0 overflow-hidden rounded-[1.15rem] border border-white/10 bg-cover transition-transform hover:-translate-y-0.5"
                style={{
                  backgroundImage: "url('/images/workout-examples-ai.jpg')",
                  backgroundPosition: workout.imagePosition,
                  backgroundSize: "220% auto",
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/55 to-transparent" />
                <span className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg bg-background/70 text-primary backdrop-blur">
                  <workout.icon className="h-4 w-4" />
                </span>
                <div className="absolute inset-x-3 bottom-3">
                  <p className="text-[13px] font-extrabold leading-tight text-white">{workout.title}</p>
                  <p className="mt-1 text-[10.5px] text-white/70">{workout.meta}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
