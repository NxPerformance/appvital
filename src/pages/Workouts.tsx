import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BarChart3,
  Clock3,
  Dumbbell,
  Flame,
  History,
  Home as HomeIcon,
  PersonStanding,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { fetchStrengthWorkouts, type StrengthWorkoutApi } from '@/lib/workoutApi';
import { cn } from '@/lib/utils';

interface WorkoutTypeOption {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

const workoutTypes: WorkoutTypeOption[] = [
  { id: 'academia', label: 'Academia', description: 'Musculação com pesos e máquinas', icon: Dumbbell },
  { id: 'em-casa', label: 'Em casa', description: 'Peso corporal ou halteres', icon: HomeIcon },
  { id: 'crossfit', label: 'CrossFit', description: 'Treino funcional de alta intensidade', icon: Flame },
  { id: 'calistenia', label: 'Calistenia', description: 'Força com o peso do corpo', icon: PersonStanding },
];

function formatNumber(value: number) {
  return new Intl.NumberFormat('pt-BR').format(Math.round(value));
}

export default function Workouts() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [recentWorkouts, setRecentWorkouts] = useState<StrengthWorkoutApi[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let active = true;

    fetchStrengthWorkouts()
      .then((workouts) => {
        if (active) setRecentWorkouts(workouts);
      })
      .catch(() => {
        if (active) setRecentWorkouts([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user]);

  const totalWorkouts = recentWorkouts.length;
  const totalCalories = recentWorkouts.reduce((sum, workout) => sum + (workout.calories ?? 0), 0);
  const totalMinutes = recentWorkouts.reduce((sum, workout) => sum + (workout.duration_min ?? 0), 0);

  return (
    <div className="min-h-full bg-[hsl(var(--background))]">
      <div className="mx-auto flex min-h-full w-full max-w-[430px] flex-col gap-5 px-5 pb-28 pt-6">
        <header className="flex items-center gap-4">
          <Link
            to="/profile"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/80 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Complemento</p>
            <h1 className="text-xl font-black tracking-tight text-foreground">Caderno de exercícios</h1>
          </div>
        </header>

        <p className="text-sm leading-relaxed text-muted-foreground">
          Registre suas sessões de musculação: exercícios, séries, cargas e evolução ao longo do tempo.
        </p>

        {!loading ? (
          <section className="grid grid-cols-3 gap-3">
            <div className="rounded-[1rem] border border-white/10 bg-card px-3 py-4 text-center shadow-elegant">
              <Dumbbell className="mx-auto h-4 w-4 text-primary" />
              <p className="mt-2 text-lg font-extrabold leading-none text-primary">{formatNumber(totalWorkouts)}</p>
              <p className="mt-2 text-[10px] leading-tight text-muted-foreground">Treinos</p>
            </div>
            <div className="rounded-[1rem] border border-white/10 bg-card px-3 py-4 text-center shadow-elegant">
              <Flame className="mx-auto h-4 w-4 text-primary" />
              <p className="mt-2 text-lg font-extrabold leading-none text-primary">{formatNumber(totalCalories)}</p>
              <p className="mt-2 text-[10px] leading-tight text-muted-foreground">Kcal</p>
            </div>
            <div className="rounded-[1rem] border border-white/10 bg-card px-3 py-4 text-center shadow-elegant">
              <Clock3 className="mx-auto h-4 w-4 text-primary" />
              <p className="mt-2 text-lg font-extrabold leading-none text-primary">{formatNumber(totalMinutes)}</p>
              <p className="mt-2 text-[10px] leading-tight text-muted-foreground">Minutos</p>
            </div>
          </section>
        ) : null}

        <section className="space-y-3">
          <h2 className="px-1 text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
            Novo registro
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {workoutTypes.map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() => navigate(`/workouts/musculacao/${type.id}`)}
                className="rounded-[1rem] border border-white/10 bg-card p-4 text-left shadow-elegant transition-transform hover:-translate-y-0.5"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/12 text-primary">
                  <type.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-3 text-sm font-black leading-none text-foreground">{type.label}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{type.description}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="px-1 text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
            Acompanhar
          </h2>
          <div className="grid gap-3">
            <Link
              to="/workouts/history"
              className={cn(
                'flex items-center gap-3 rounded-[1rem] border border-white/10 bg-card p-4 shadow-elegant transition-transform hover:-translate-y-0.5',
              )}
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                <History className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-black text-foreground">Histórico</span>
                <span className="block text-xs text-muted-foreground">Todos os treinos registrados</span>
              </span>
            </Link>

            <Link
              to="/workouts/dashboard"
              className="flex items-center gap-3 rounded-[1rem] border border-white/10 bg-card p-4 shadow-elegant transition-transform hover:-translate-y-0.5"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                <BarChart3 className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-black text-foreground">Desempenho</span>
                <span className="block text-xs text-muted-foreground">Estatísticas e progresso</span>
              </span>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
