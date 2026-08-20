import {
  Activity,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CalendarCheck,
  Droplets,
  Flame,
  Scale,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { EvolutionChart } from '@/components/bioimpedance/EvolutionChart';
import { MetricRow } from '@/components/bioimpedance/MetricRow';
import { PostureAnalysis } from '@/components/bioimpedance/PostureAnalysis';
import { useBioimpedance } from '@/hooks/useBioimpedance';
import { formatDateSafe } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';

const prepItems = [
  {
    icon: CalendarCheck,
    title: 'Antes do exame',
    description: 'Evite exercícios intensos nas 24 horas anteriores para reduzir variações nos resultados.',
  },
  {
    icon: Droplets,
    title: 'Hidratação',
    description: 'Mantenha boa hidratação no dia anterior e evite álcool antes da avaliação.',
  },
  {
    icon: Scale,
    title: 'Jejum',
    description: 'Faça jejum de 4 horas, quando indicado pela equipe, para melhorar a leitura corporal.',
  },
];

function formatDate(value?: string | null) {
  if (!value) return '--';
  return formatDateSafe(value, "dd 'de' MMM yyyy", { locale: ptBR });
}

function formatNumber(value?: number | null, unit = '') {
  if (value === null || value === undefined) return '--';
  return `${value}${unit}`;
}

function MetricCard({
  label,
  value,
  difference,
  unit,
  isLowerBetter = false,
}: {
  label: string;
  value?: number | null;
  difference?: number | null;
  unit?: string;
  isLowerBetter?: boolean;
}) {
  const hasDifference = difference !== null && difference !== undefined && difference !== 0;
  const isGood = hasDifference ? (isLowerBetter ? difference < 0 : difference > 0) : null;

  return (
    <div className="rounded-2xl border border-white/5 bg-card/85 p-4 shadow-elegant">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-bold">{formatNumber(value, unit)}</p>
      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        {hasDifference ? (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-1 font-medium',
              isGood ? 'bg-emerald-400/15 text-emerald-300' : 'bg-red-400/15 text-red-300',
            )}
          >
            {difference > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
            {Math.abs(difference)}{unit}
          </span>
        ) : (
          <span className="rounded-full bg-secondary/70 px-2 py-1">Sem comparação</span>
        )}
      </div>
    </div>
  );
}

export default function Bioimpedancia() {
  const {
    records,
    latestRecord,
    previousRecord,
    loading,
    error,
    getDifference,
    hasRecords,
    hasComparison,
  } = useBioimpedance();

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--background-strong))_100%)]">
      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-6 px-4 pb-28 pt-4 md:px-7 md:pb-8 md:pt-7">
        <header className="relative flex h-12 items-center justify-center md:hidden">
          <Link
            to="/"
            className="absolute left-0 flex h-10 w-10 items-center justify-center rounded-full bg-card/85 text-muted-foreground shadow-elegant hover:text-foreground"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-base font-bold">Bioimpedância</h1>
        </header>

        <section className="rounded-[2rem] border border-white/5 bg-card/90 p-6 shadow-elegant">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl space-y-3">
              <Link
                to="/"
                className="hidden h-11 w-11 items-center justify-center rounded-full bg-secondary/80 text-muted-foreground transition-colors hover:text-foreground md:inline-flex"
                aria-label="Voltar"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
                <Sparkles className="h-4 w-4" />
                Avaliação corporal
              </div>
              <h1 className="hidden text-4xl font-bold leading-tight tracking-normal md:block md:text-5xl">Bioimpedância</h1>
              <p className="text-base leading-relaxed text-muted-foreground md:text-lg">
                Acompanhe composição corporal, comparativos e orientações a partir dos exames cadastrados pela equipe.
              </p>
            </div>
            <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-gradient-primary text-primary-foreground shadow-glow">
              <Activity className="h-8 w-8" />
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Peso atual"
            value={latestRecord?.weight_kg}
            difference={getDifference(latestRecord?.weight_kg ?? null, previousRecord?.weight_kg ?? null)}
            unit="kg"
            isLowerBetter
          />
          <MetricCard
            label="Gordura corporal"
            value={latestRecord?.body_fat_percent}
            difference={getDifference(latestRecord?.body_fat_percent ?? null, previousRecord?.body_fat_percent ?? null)}
            unit="%"
            isLowerBetter
          />
          <MetricCard
            label="Massa muscular"
            value={latestRecord?.muscle_mass_kg ?? latestRecord?.muscle_percent}
            difference={getDifference(
              latestRecord?.muscle_mass_kg ?? latestRecord?.muscle_percent ?? null,
              previousRecord?.muscle_mass_kg ?? previousRecord?.muscle_percent ?? null,
            )}
            unit={latestRecord?.muscle_mass_kg ? 'kg' : '%'}
          />
          <MetricCard
            label="Metabolismo basal"
            value={latestRecord?.bmr_kcal}
            difference={getDifference(latestRecord?.bmr_kcal ?? null, previousRecord?.bmr_kcal ?? null)}
            unit="kcal"
          />
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[2rem] border border-white/5 bg-card/85 p-5 shadow-elegant">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Evolução</h2>
                <p className="text-sm text-muted-foreground">
                  {hasRecords ? `${records.length} exame(s) no histórico` : 'Nenhum exame cadastrado ainda'}
                </p>
              </div>
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <EvolutionChart records={records} />
          </div>

          <div className="rounded-[2rem] border border-white/5 bg-card/85 p-5 shadow-elegant">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Último exame</h2>
                <p className="text-sm text-muted-foreground">{formatDate(latestRecord?.date)}</p>
              </div>
              <Flame className="h-5 w-5 text-primary" />
            </div>

            {hasRecords ? (
              <div className="divide-y divide-white/10">
                <MetricRow label="IMC" value={latestRecord?.bmi ?? null} previousValue={previousRecord?.bmi ?? null} standard="18.5 - 24.9" isLowerBetter />
                <MetricRow label="Água" value={latestRecord?.water_percent ?? null} unit="%" previousValue={previousRecord?.water_percent ?? null} standard="45% - 65%" />
                <MetricRow label="Gordura visceral" value={latestRecord?.visceral_fat ?? null} previousValue={previousRecord?.visceral_fat ?? null} standard="< 10" isLowerBetter />
                <MetricRow label="Cintura" value={latestRecord?.waist_cm ?? null} unit="cm" previousValue={previousRecord?.waist_cm ?? null} standard="Acompanhar" isLowerBetter />
                <MetricRow label="Quadril" value={latestRecord?.hip_cm ?? null} unit="cm" previousValue={previousRecord?.hip_cm ?? null} standard="Acompanhar" />
              </div>
            ) : (
              <div className="rounded-2xl bg-secondary/60 p-5 text-center text-sm text-muted-foreground">
                Quando a equipe cadastrar seu exame, os detalhes aparecem aqui.
              </div>
            )}
          </div>
        </section>

        {hasRecords ? (
          <section className="rounded-[2rem] border border-white/5 bg-card/85 p-5 shadow-elegant">
            <div className="mb-5">
              <h2 className="text-xl font-semibold">Análise postural</h2>
              <p className="text-sm text-muted-foreground">
                Indicadores de assimetria e postura do exame mais recente.
              </p>
            </div>
            <PostureAnalysis record={latestRecord} previousRecord={previousRecord} />
          </section>
        ) : null}

        {!hasComparison && hasRecords ? (
          <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4 text-sm text-primary">
            Com um segundo exame cadastrado, os comparativos passam a aparecer automaticamente.
          </div>
        ) : null}

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold">Orientações</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {prepItems.map((item) => (
              <div key={item.title} className="rounded-2xl border border-white/5 bg-card/85 p-5 shadow-elegant">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                  <item.icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
