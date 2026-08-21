import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, CalendarCheck, CalendarPlus, Droplets, ExternalLink, Flame, Flag, GitCompare, Gauge, Scale, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EvolutionChart } from '@/components/bioimpedance/EvolutionChart';
import { MetricRow } from '@/components/bioimpedance/MetricRow';
import { PostureAnalysis } from '@/components/bioimpedance/PostureAnalysis';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBioimpedance, type BioimpedanceRecord } from '@/hooks/useBioimpedance';
import { useProfile } from '@/hooks/useProfile';
import { formatDateSafe } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';
import { ptBR } from 'date-fns/locale';

const BMI_GAUGE_MIN = 15;
const BMI_GAUGE_MAX = 45;

function bmiClassification(bmi: number): { label: string; className: string } {
  if (bmi < 18.5) return { label: 'Abaixo do peso', className: 'text-blue-300' };
  if (bmi < 25) return { label: 'Peso saudável', className: 'text-emerald-300' };
  if (bmi < 30) return { label: 'Sobrepeso', className: 'text-amber-300' };
  if (bmi < 35) return { label: 'Obesidade grau I', className: 'text-orange-300' };
  if (bmi < 40) return { label: 'Obesidade grau II', className: 'text-red-300' };
  return { label: 'Obesidade grau III', className: 'text-red-400' };
}

function bmiGaugePosition(bmi: number) {
  const clamped = Math.min(Math.max(bmi, BMI_GAUGE_MIN), BMI_GAUGE_MAX);
  return ((clamped - BMI_GAUGE_MIN) / (BMI_GAUGE_MAX - BMI_GAUGE_MIN)) * 100;
}

function BmiGauge({ currentBmi, goalBmi }: { currentBmi: number; goalBmi: number | null }) {
  const current = bmiClassification(currentBmi);
  const goal = goalBmi != null ? bmiClassification(goalBmi) : null;

  return (
    <section className="rounded-[2rem] border border-white/5 bg-card/85 p-5 shadow-elegant">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Índice de Massa Corporal</h2>
          <p className="text-sm text-muted-foreground">Sua faixa de IMC atual comparada com a meta.</p>
        </div>
        <Gauge className="h-5 w-5 text-primary" />
      </div>

      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">IMC atual</p>
          <p className="text-3xl font-bold">{currentBmi.toFixed(1)}</p>
          <p className={cn('text-xs font-semibold', current.className)}>{current.label}</p>
        </div>
        {goal ? (
          <div className="text-right">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">IMC meta</p>
            <p className="text-3xl font-bold">{goalBmi!.toFixed(1)}</p>
            <p className={cn('text-xs font-semibold', goal.className)}>{goal.label}</p>
          </div>
        ) : null}
      </div>

      <div className="relative pt-3">
        <div
          className="h-2.5 w-full rounded-full"
          style={{
            background: 'linear-gradient(to right, #60a5fa, #34d399, #fbbf24, #fb923c, #f87171)',
          }}
        />
        <div
          className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
          style={{ left: `${bmiGaugePosition(currentBmi)}%` }}
        >
          <div className="h-4 w-4 rounded-full border-2 border-background bg-primary shadow" />
        </div>
        {goal ? (
          <div
            className="absolute top-0 flex -translate-x-1/2 flex-col items-center opacity-70"
            style={{ left: `${bmiGaugePosition(goalBmi!)}%` }}
          >
            <div className="h-4 w-4 rounded-full border-2 border-background bg-foreground/60 shadow" />
          </div>
        ) : null}
        <div className="mt-3 flex justify-between text-[11px] text-muted-foreground">
          <span>{BMI_GAUGE_MIN}</span>
          <span>{BMI_GAUGE_MAX}+</span>
        </div>
      </div>

      {!goal ? (
        <Link to="/settings?edit=bmi" className="mt-4 inline-block text-xs font-semibold text-primary hover:underline">
          Definir meta de peso para comparar
        </Link>
      ) : null}
    </section>
  );
}

function estimateGoalDate(records: BioimpedanceRecord[], goalWeightKg: number): Date | null {
  if (records.length < 2) return null;

  const withWeight = [...records]
    .filter((r) => typeof r.weight_kg === 'number')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (withWeight.length < 2) return null;

  const first = withWeight[0];
  const last = withWeight[withWeight.length - 1];
  const daysElapsed = (new Date(last.date).getTime() - new Date(first.date).getTime()) / (1000 * 60 * 60 * 24);
  if (daysElapsed <= 0) return null;

  const ratePerDay = (first.weight_kg! - last.weight_kg!) / daysElapsed;
  const remaining = last.weight_kg! - goalWeightKg;

  // Only project when the trend is actually heading toward the goal.
  if (remaining === 0) return new Date();
  if ((remaining > 0 && ratePerDay <= 0) || (remaining < 0 && ratePerDay >= 0)) return null;

  const daysToGoal = remaining / ratePerDay;
  if (!Number.isFinite(daysToGoal) || daysToGoal <= 0) return null;

  const estimated = new Date();
  estimated.setDate(estimated.getDate() + Math.round(daysToGoal));
  return estimated;
}

function WeightTimeline({
  records,
  currentWeight,
  goalWeightKg,
}: {
  records: BioimpedanceRecord[];
  currentWeight: number;
  goalWeightKg: number;
}) {
  const initialWeight = useMemo(() => {
    const withWeight = records.filter((r) => typeof r.weight_kg === 'number');
    return withWeight.length > 0 ? withWeight[withWeight.length - 1].weight_kg! : currentWeight;
  }, [records, currentWeight]);

  const estimatedDate = useMemo(() => estimateGoalDate(records, goalWeightKg), [records, goalWeightKg]);

  const totalDistance = Math.abs(initialWeight - goalWeightKg);
  const progressed = Math.abs(initialWeight - currentWeight);
  const progressPercent = totalDistance === 0 ? 100 : Math.min(100, Math.max(0, (progressed / totalDistance) * 100));

  return (
    <section className="rounded-[2rem] border border-white/5 bg-card/85 p-5 shadow-elegant">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Linha do Tempo</h2>
          <p className="text-sm text-muted-foreground">
            {estimatedDate
              ? `Data estimada: ${formatDateSafe(estimatedDate.toISOString(), "d 'de' MMM 'de' yyyy", { locale: ptBR })}`
              : 'Continue registrando o peso para estimarmos uma data'}
          </p>
        </div>
        <Flag className="h-5 w-5 text-primary" />
      </div>

      <div className="mb-3 flex items-center justify-between text-sm">
        <div>
          <p className="font-bold">{initialWeight.toFixed(1)} kg</p>
          <p className="text-[11px] text-muted-foreground">Inicial</p>
        </div>
        <div className="text-center">
          <p className="font-bold text-primary">{currentWeight.toFixed(1)} kg</p>
          <p className="text-[11px] text-muted-foreground">Hoje</p>
        </div>
        <div className="text-right">
          <p className="font-bold">{goalWeightKg.toFixed(1)} kg</p>
          <p className="text-[11px] text-muted-foreground">Meta</p>
        </div>
      </div>

      <div className="relative h-2 w-full rounded-full bg-secondary/70">
        <div className="h-2 rounded-full bg-gradient-primary" style={{ width: `${progressPercent}%` }} />
        <div
          className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-primary shadow"
          style={{ left: `${progressPercent}%` }}
        />
      </div>
    </section>
  );
}

function resolveUploadUrl(url: string) {
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const base = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/api\/?$/, '');
  return `${base}${url}`;
}

interface CompareField {
  key: keyof BioimpedanceRecord;
  label: string;
  unit: string;
  isLowerBetter?: boolean;
}

const COMPARE_FIELDS: CompareField[] = [
  { key: 'weight_kg', label: 'Peso', unit: 'kg', isLowerBetter: true },
  { key: 'body_fat_percent', label: 'Gordura Corporal', unit: '%', isLowerBetter: true },
  { key: 'muscle_percent', label: 'Massa Muscular', unit: '%' },
  { key: 'water_percent', label: 'Água Corporal', unit: '%' },
  { key: 'visceral_fat', label: 'Gordura Visceral', unit: '', isLowerBetter: true },
  { key: 'subcutaneous_fat_percent', label: 'Gordura Subcutânea', unit: '%', isLowerBetter: true },
  { key: 'fat_free_mass_kg', label: 'Massa Livre de Gordura', unit: 'kg' },
  { key: 'protein_percent', label: 'Proteína', unit: '%' },
  { key: 'bone_mass_kg', label: 'Massa Óssea', unit: 'kg' },
  { key: 'muscle_mass_kg', label: 'Peso Muscular', unit: 'kg' },
  { key: 'bmi', label: 'IMC', unit: '', isLowerBetter: true },
  { key: 'fat_weight_kg', label: 'Peso da Gordura', unit: 'kg', isLowerBetter: true },
  { key: 'waist_hip_ratio', label: 'Relação Cintura-Quadril', unit: '', isLowerBetter: true },
  { key: 'bmr_kcal', label: 'TMB', unit: 'kcal' },
  { key: 'ideal_weight_kg', label: 'Peso Ideal', unit: 'kg' },
  { key: 'weight_control_tip', label: 'Controle de Peso', unit: 'kg' },
  { key: 'fat_control_tip', label: 'Controle de Gordura', unit: 'kg' },
  { key: 'muscle_control_tip', label: 'Ganho de Massa', unit: 'kg' },
  { key: 'daily_calories', label: 'Calorias Diárias', unit: '' },
  { key: 'waist_cm', label: 'Cintura', unit: 'cm', isLowerBetter: true },
  { key: 'hip_cm', label: 'Quadril', unit: 'cm' },
  { key: 'arm_cm', label: 'Braço', unit: 'cm' },
  { key: 'thigh_cm', label: 'Coxa', unit: 'cm' },
  { key: 'shoulder_imbalance_cm', label: 'Desnível Ombros', unit: 'cm', isLowerBetter: true },
  { key: 'spine_curvature_cm', label: 'Curvatura Coluna', unit: 'cm', isLowerBetter: true },
  { key: 'head_tilt_degrees', label: 'Inclinação Cabeça', unit: '°', isLowerBetter: true },
  { key: 'trunk_curvature_degrees', label: 'Curvatura Tronco', unit: '°', isLowerBetter: true },
  { key: 'pelvis_tilt_degrees', label: 'Inclinação Pelve', unit: '°', isLowerBetter: true },
  { key: 'head_forward_degrees', label: 'Projeção Cabeça', unit: '°', isLowerBetter: true },
];

function CompareSection({ records }: { records: BioimpedanceRecord[] }) {
  const [idA, setIdA] = useState(records[1]?.id ?? records[0].id);
  const [idB, setIdB] = useState(records[0].id);

  const recordA = useMemo(() => records.find((r) => r.id === idA) ?? records[0], [records, idA]);
  const recordB = useMemo(() => records.find((r) => r.id === idB) ?? records[0], [records, idB]);

  return (
    <section className="rounded-[2rem] border border-white/5 bg-card/85 p-5 shadow-elegant">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Comparar por data</h2>
          <p className="text-sm text-muted-foreground">Compare todos os indicadores entre dois exames.</p>
        </div>
        <GitCompare className="h-5 w-5 text-primary" />
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Exame A</p>
          <Select value={idA} onValueChange={setIdA}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {records.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {formatDate(r.date)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Exame B</p>
          <Select value={idB} onValueChange={setIdB}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {records.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {formatDate(r.date)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/5">
        <table className="w-full min-w-[480px] border-collapse text-sm">
          <thead>
            <tr className="bg-secondary/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="p-3 font-medium">Métrica</th>
              <th className="p-3 font-medium">{formatDate(recordA.date)}</th>
              <th className="p-3 font-medium">{formatDate(recordB.date)}</th>
              <th className="p-3 font-medium text-right">Diferença</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {COMPARE_FIELDS.map((field) => {
              const valueA = recordA[field.key] as number | null;
              const valueB = recordB[field.key] as number | null;
              const hasDiff = typeof valueA === 'number' && typeof valueB === 'number';
              const diff = hasDiff ? Number((valueB - valueA).toFixed(2)) : null;
              const isGood = diff !== null && diff !== 0 ? (field.isLowerBetter ? diff < 0 : diff > 0) : null;

              return (
                <tr key={String(field.key)}>
                  <td className="p-3 text-muted-foreground">{field.label}</td>
                  <td className="p-3">{formatNumber(valueA, field.unit)}</td>
                  <td className="p-3">{formatNumber(valueB, field.unit)}</td>
                  <td className="p-3 text-right">
                    {diff !== null ? (
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium',
                          diff === 0
                            ? 'bg-secondary/70 text-muted-foreground'
                            : isGood
                              ? 'bg-emerald-400/15 text-emerald-300'
                              : 'bg-red-400/15 text-red-300',
                        )}
                      >
                        {diff !== 0 ? (diff > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : null}
                        {diff > 0 ? '+' : ''}
                        {diff}
                        {field.unit}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">--</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

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

export function BioimpedanciaTab() {
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
  const { profile } = useProfile();

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-primary" />
      </div>
    );
  }

  if (!hasRecords) {
    return (
      <div className="space-y-6">
        {error ? (
          <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">{error}</div>
        ) : null}

        <section className="relative overflow-hidden rounded-[2rem] bg-gradient-primary px-6 py-8 text-primary-foreground shadow-glow">
          <span className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary-foreground/10" aria-hidden="true" />
          <div className="relative max-w-lg space-y-3">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-primary-foreground/75">
              Bioimpedância
            </p>
            <h2 className="text-2xl font-black leading-tight md:text-3xl">Nenhum exame registrado ainda</h2>
            <p className="text-sm leading-relaxed text-primary-foreground/85">
              A avaliação de bioimpedância é feita pela equipe da Dra. Gabriela em consulta. Agende a sua para começar
              a acompanhar composição corporal, medidas e postura ao longo do tempo.
            </p>
            <Link
              to="/appointments"
              className="mt-2 inline-flex h-11 items-center gap-2 rounded-xl bg-primary-foreground px-5 text-sm font-black text-primary"
            >
              <CalendarPlus className="h-4 w-4" />
              Agendar bioimpedância
            </Link>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold">Como se preparar</h2>
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
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm leading-relaxed text-muted-foreground">
        Composição corporal, comparativos e orientações a partir dos exames cadastrados pela equipe.
      </p>

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

      {(() => {
        const currentWeight = latestRecord?.weight_kg ?? null;
        const goalWeightKg = profile?.weight_goal_kg ?? null;
        const currentBmi = latestRecord?.bmi ?? (currentWeight != null && profile?.height_cm
          ? currentWeight / ((profile.height_cm / 100) ** 2)
          : null);
        const goalBmi = goalWeightKg != null && profile?.height_cm
          ? goalWeightKg / ((profile.height_cm / 100) ** 2)
          : null;

        return (
          <div className="grid gap-4 lg:grid-cols-2">
            {currentWeight != null && goalWeightKg != null ? (
              <WeightTimeline records={records} currentWeight={currentWeight} goalWeightKg={goalWeightKg} />
            ) : null}
            {currentBmi != null ? <BmiGauge currentBmi={currentBmi} goalBmi={goalBmi} /> : null}
          </div>
        );
      })()}

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
              {latestRecord?.source_pdf_url ? (
                <a
                  href={resolveUploadUrl(latestRecord.source_pdf_url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  Ver laudo em PDF
                </a>
              ) : null}
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

      {hasComparison ? <CompareSection records={records} /> : null}

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
  );
}
