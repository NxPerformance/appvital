import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Bike,
  CheckCircle2,
  Clock,
  Dumbbell,
  Flame,
  Footprints,
  Home,
  PersonStanding,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface ExerciseMedia {
  label: string;
  src: string;
  credit: string;
  sourceUrl: string;
  license: string;
  workoutxQuery: string;
}

interface WorkoutXExercise {
  id: string;
  name: string;
  proxyGifUrl: string;
  bodyPart?: string;
  target?: string;
  equipment?: string;
  category?: string;
  difficulty?: string;
  description?: string;
  instructions?: string[];
}

interface WorkoutXMediaResponse {
  configured: boolean;
  exercises: Record<string, WorkoutXExercise | null>;
}

interface PopularWorkout {
  id: string;
  category: string;
  icon: React.ElementType;
  title: string;
  label: string;
  level: string;
  duration: string;
  calories: string;
  summary: string;
  hero: ExerciseMedia;
  logTo: string;
  steps: ExerciseMedia[];
}

const media = {
  running: {
    label: "Corrida",
    src: "/exercises/running.gif",
    credit: "Eadweard Muybridge",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Descriptive_Zoopraxography_Athletes_Running_Animated_12.gif",
    license: "Domínio público",
    workoutxQuery: "run",
  },
  squat: {
    label: "Agachamento",
    src: "/exercises/squats.gif",
    credit: "Wensceslao",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Squats.gif",
    license: "CC BY-SA 4.0",
    workoutxQuery: "squat",
  },
  bench: {
    label: "Supino na máquina Smith",
    src: "/exercises/smith-machine-bench-press.gif",
    credit: "Mohamed Ouda",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:SmithMachineBenchPress.gif",
    license: "CC BY-SA 3.0",
    workoutxQuery: "bench press",
  },
  pushup: {
    label: "Flexão",
    src: "/exercises/pushups.gif",
    credit: "Wensceslao",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Pushups.gif",
    license: "CC BY-SA 4.0",
    workoutxQuery: "push up",
  },
  plank: {
    label: "Prancha",
    src: "/exercises/plank.svg",
    credit: "Pk0001",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Plank_exercise.svg",
    license: "CC BY-SA 4.0",
    workoutxQuery: "plank",
  },
  jumpingJacks: {
    label: "Polichinelo",
    src: "/exercises/jumpingjacks.gif",
    credit: "Wensceslao",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Jumpingjacks.gif",
    license: "CC BY-SA 4.0",
    workoutxQuery: "jumping jack",
  },
  skierJacks: {
    label: "Skier jacks",
    src: "/exercises/skierjacks.gif",
    credit: "Wensceslao",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Skierjacks.gif",
    license: "CC BY-SA 4.0",
    workoutxQuery: "skier",
  },
  crunch: {
    label: "Abdominal",
    src: "/exercises/crunch.gif",
    credit: "Zimmermanns",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Sit-ups_or_Crunch.gif",
    license: "CC BY 3.0",
    workoutxQuery: "crunch",
  },
  pullup: {
    label: "Barra fixa",
    src: "/exercises/pullup.gif",
    credit: "Extremistpullup",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Pullup.gif",
    license: "CC BY-SA",
    workoutxQuery: "pull up",
  },
  bike: {
    label: "Bike ergométrica",
    src: "/exercises/exercise-bike.gif",
    credit: "Videoplasty.com",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Man_on_an_Exercise_Bike_GIF_Animation_Loop.gif",
    license: "CC BY-SA 4.0",
    workoutxQuery: "stationary bike",
  },
  lunge: {
    label: "Afundo",
    src: "/exercises/lunge.gif",
    credit: "CDC",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Lunge-CDC_strength_training_for_older_adults.gif",
    license: "Domínio público",
    workoutxQuery: "lunge",
  },
} satisfies Record<string, ExerciseMedia>;

const filters = [
  { value: "todos", label: "Todos" },
  { value: "academia", label: "Academia" },
  { value: "corrida", label: "Corrida" },
  { value: "casa", label: "Em casa" },
  { value: "hiit", label: "HIIT" },
  { value: "bike", label: "Bike" },
];

const popularWorkouts: PopularWorkout[] = [
  {
    id: "corrida-intervalada",
    category: "corrida",
    icon: Footprints,
    title: "Corrida intervalada leve",
    label: "Cardio",
    level: "Iniciante",
    duration: "24 min",
    calories: "180 kcal",
    summary: "Alterna caminhada e corrida para melhorar ritmo sem exagerar na carga.",
    hero: media.running,
    logTo: "/workouts/cardio/corrida",
    steps: [
      { ...media.running, label: "5 min caminhada rápida" },
      { ...media.running, label: "8x 1 min corrida + 90s caminhada" },
      { ...media.running, label: "4 min desaquecimento" },
    ],
  },
  {
    id: "academia-full-body",
    category: "academia",
    icon: Dumbbell,
    title: "Full body na academia",
    label: "Força",
    level: "Intermediário",
    duration: "45 min",
    calories: "260 kcal",
    summary: "Base completa com movimentos grandes para peito, costas, pernas e core.",
    hero: media.bench,
    logTo: "/workouts/musculacao/academia",
    steps: [
      { ...media.squat, label: "Agachamento 3x10" },
      { ...media.bench, label: "Supino 3x10" },
      { ...media.pullup, label: "Puxada/barra 3x8" },
      { ...media.plank, label: "Prancha 3x30s" },
    ],
  },
  {
    id: "casa-sem-equipamento",
    category: "casa",
    icon: Home,
    title: "Treino em casa sem equipamento",
    label: "Funcional",
    level: "Iniciante",
    duration: "28 min",
    calories: "170 kcal",
    summary: "Sequência simples para manter constância usando apenas peso corporal.",
    hero: media.pushup,
    logTo: "/workouts/musculacao/em-casa",
    steps: [
      { ...media.jumpingJacks, label: "Polichinelo 3x40s" },
      { ...media.squat, label: "Agachamento 3x15" },
      { ...media.pushup, label: "Flexão adaptada 3x8" },
      { ...media.crunch, label: "Abdominal 3x15" },
    ],
  },
  {
    id: "hiit-baixo-impacto",
    category: "hiit",
    icon: Zap,
    title: "HIIT baixo impacto",
    label: "Intenso",
    level: "Intermediário",
    duration: "18 min",
    calories: "210 kcal",
    summary: "Blocos curtos para elevar frequência cardíaca preservando articulações.",
    hero: media.jumpingJacks,
    logTo: "/workouts/cardio/hiit",
    steps: [
      { ...media.jumpingJacks, label: "30s polichinelo" },
      { ...media.squat, label: "30s agachamento" },
      { ...media.skierJacks, label: "30s skier jacks" },
      { ...media.plank, label: "30s prancha ou descanso ativo" },
    ],
  },
  {
    id: "bike-resistencia",
    category: "bike",
    icon: Bike,
    title: "Bike de resistência",
    label: "Cardio",
    level: "Todos",
    duration: "35 min",
    calories: "240 kcal",
    summary: "Pedalada contínua com variação de carga para ganhar resistência.",
    hero: media.bike,
    logTo: "/workouts/cardio/ciclismo",
    steps: [
      { ...media.bike, label: "7 min aquecimento" },
      { ...media.bike, label: "20 min ritmo moderado" },
      { ...media.bike, label: "5 min carga alta" },
      { ...media.bike, label: "3 min leve" },
    ],
  },
  {
    id: "calistenia-base",
    category: "academia",
    icon: PersonStanding,
    title: "Calistenia base",
    label: "Controle",
    level: "Iniciante",
    duration: "32 min",
    calories: "190 kcal",
    summary: "Exemplo focado em domínio corporal, postura e progressão segura.",
    hero: media.pullup,
    logTo: "/workouts/musculacao/calistenia",
    steps: [
      { ...media.lunge, label: "Mobilidade com afundo 5 min" },
      { ...media.pushup, label: "Flexão 4x6" },
      { ...media.pullup, label: "Barra/puxada 4x8" },
      { ...media.plank, label: "Prancha lateral 3x25s" },
    ],
  },
];

function getWorkoutXQueries(workouts: PopularWorkout[]) {
  return Array.from(
    new Set(
      workouts
        .flatMap((workout) => [workout.hero, ...workout.steps])
        .map((item) => item.workoutxQuery)
        .filter(Boolean),
    ),
  );
}

function resolveExerciseMedia(item: ExerciseMedia, workoutxMedia: Record<string, WorkoutXExercise | null>): ExerciseMedia {
  const workoutxExercise = workoutxMedia[item.workoutxQuery];
  if (!workoutxExercise?.proxyGifUrl) return item;

  return {
    ...item,
    src: workoutxExercise.proxyGifUrl,
    credit: "WorkoutX",
    sourceUrl: "https://workoutxapp.com/",
    license: `via WorkoutX API (${workoutxExercise.name})`,
  };
}

function PopularWorkoutCard({
  workout,
  workoutxMedia,
  workoutxConfigured,
}: {
  workout: PopularWorkout;
  workoutxMedia: Record<string, WorkoutXExercise | null>;
  workoutxConfigured: boolean;
}) {
  const Icon = workout.icon;
  const hero = resolveExerciseMedia(workout.hero, workoutxMedia);
  const steps = workout.steps.map((step) => resolveExerciseMedia(step, workoutxMedia));
  const usesWorkoutX = [hero, ...steps].some((item) => item.credit === "WorkoutX");

  return (
    <article className="overflow-hidden rounded-[2rem] border border-white/5 bg-card/85 shadow-elegant">
      <div className="relative p-3">
        <div className="relative min-h-[230px] overflow-hidden rounded-[1.5rem] bg-background">
          <img
            src={hero.src}
            alt={`Demonstração animada de ${hero.label}`}
            className="h-[230px] w-full object-contain"
            loading="lazy"
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground shadow-glow">
              <Icon className="h-3.5 w-3.5" />
              {workout.label}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div className="flex items-start gap-3">
          <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-2xl font-bold">{workout.title}</h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{workout.summary}</p>
            <p className="mt-2 text-xs font-medium text-primary">
              {usesWorkoutX ? "Animações carregadas via WorkoutX" : workoutxConfigured ? "Fallback local aplicado" : "Fallback local: configure a chave WorkoutX no backend"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl bg-secondary/55 p-3">
            <Target className="mx-auto mb-1 h-4 w-4 text-primary" />
            <p className="text-xs text-muted-foreground">nível</p>
            <p className="text-sm font-semibold">{workout.level}</p>
          </div>
          <div className="rounded-2xl bg-secondary/55 p-3">
            <Clock className="mx-auto mb-1 h-4 w-4 text-primary" />
            <p className="text-xs text-muted-foreground">tempo</p>
            <p className="text-sm font-semibold">{workout.duration}</p>
          </div>
          <div className="rounded-2xl bg-secondary/55 p-3">
            <Flame className="mx-auto mb-1 h-4 w-4 text-primary" />
            <p className="text-xs text-muted-foreground">gasto</p>
            <p className="text-sm font-semibold">{workout.calories}</p>
          </div>
        </div>

        <div className="space-y-2">
          {steps.map((step) => (
            <div key={step.label} className="flex items-center gap-3 rounded-2xl bg-secondary/35 p-2 text-sm text-muted-foreground">
              <img
                src={step.src}
                alt={`Demonstração de ${step.label}`}
                className="h-16 w-20 shrink-0 rounded-xl bg-background object-contain"
                loading="lazy"
              />
              <span className="flex min-w-0 items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{step.label}</span>
              </span>
            </div>
          ))}
        </div>

        <details className="rounded-2xl border border-white/5 bg-background/25 px-4 py-3 text-xs text-muted-foreground">
          <summary className="cursor-pointer font-medium text-foreground">Créditos das animações</summary>
          <div className="mt-3 space-y-2">
            {Array.from(new Map([hero, ...steps].map((item) => [item.src, item])).values()).map((item) => (
              <a
                key={item.src}
                href={item.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="block underline-offset-4 hover:text-primary hover:underline"
              >
                {item.label}: {item.credit} ({item.license})
              </a>
            ))}
          </div>
        </details>

        <div className="grid gap-2">
          <Button asChild className="h-12 rounded-xl bg-gradient-primary font-bold text-primary-foreground shadow-glow">
            <Link to={workout.logTo}>Registrar no caderno</Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

export default function PopularWorkouts() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [workoutxMedia, setWorkoutxMedia] = useState<Record<string, WorkoutXExercise | null>>({});
  const [workoutxConfigured, setWorkoutxConfigured] = useState(false);
  const activeFilter = searchParams.get("categoria") || "todos";

  const visibleWorkouts = useMemo(() => {
    if (activeFilter === "todos") return popularWorkouts;
    return popularWorkouts.filter((workout) => workout.category === activeFilter);
  }, [activeFilter]);

  useEffect(() => {
    let active = true;
    const queries = getWorkoutXQueries(popularWorkouts);

    const loadWorkoutXMedia = async () => {
      try {
        const params = new URLSearchParams({ queries: queries.join(",") });
        const response = await api.get<WorkoutXMediaResponse>(`/workoutx/media?${params.toString()}`);

        if (!active) return;
        setWorkoutxConfigured(response.configured);
        setWorkoutxMedia(response.exercises || {});
      } catch {
        if (!active) return;
        setWorkoutxConfigured(false);
        setWorkoutxMedia({});
      }
    };

    loadWorkoutXMedia();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-full bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--background-strong))_100%)]">
      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-6 px-4 pb-28 pt-4 md:px-7 md:pb-8 md:pt-7">
        <header className="grid h-14 grid-cols-[44px_1fr_44px] items-center md:hidden">
          <Link
            to="/workouts"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary/70 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-center text-lg font-bold">Exemplos rápidos</h1>
        </header>

        <section className="overflow-hidden rounded-[2rem] border border-white/5 bg-card/90 shadow-elegant">
          <div className="relative p-6 md:p-7">
            <div
              className="absolute inset-0 bg-cover bg-center opacity-30"
              style={{ backgroundImage: "url('/images/workout-examples-ai.jpg')" }}
            />
            <div className="absolute inset-0 bg-gradient-to-br from-background/35 via-background/80 to-background" />
            <div className="relative max-w-3xl space-y-4">
              <Link
                to="/workouts"
                className="hidden h-11 w-11 items-center justify-center rounded-full bg-secondary/80 text-muted-foreground transition-colors hover:text-foreground md:inline-flex"
                aria-label="Voltar"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
                <Sparkles className="h-4 w-4" />
                Exemplos com GIFs
              </div>
              <h1 className="text-4xl font-bold leading-tight tracking-normal md:text-5xl">Exemplos rápidos</h1>
              <p className="text-base leading-relaxed text-muted-foreground md:text-lg">
                Veja ideias de treino com GIFs e séries rápidas, depois registre sua execução no Caderno.
              </p>
            </div>
          </div>
        </section>

        <section className="flex gap-3 overflow-x-auto pb-1 hide-scrollbar">
          {filters.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setSearchParams(filter.value === "todos" ? {} : { categoria: filter.value })}
              className={cn(
                "h-10 shrink-0 rounded-xl border px-5 text-sm font-medium transition-colors",
                activeFilter === filter.value
                  ? "border-primary bg-primary text-primary-foreground shadow-glow"
                  : "border-white/5 bg-card/75 text-muted-foreground hover:text-foreground",
              )}
            >
              {filter.label}
            </button>
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          {visibleWorkouts.map((workout) => (
            <PopularWorkoutCard
              key={workout.id}
              workout={workout}
              workoutxMedia={workoutxMedia}
              workoutxConfigured={workoutxConfigured}
            />
          ))}
        </section>
      </div>
    </div>
  );
}
