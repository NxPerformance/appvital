import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowDown, ArrowUp, CalendarCheck, CalendarPlus, Droplets, ExternalLink, Flame, Flag, GitCompare, Gauge, Minus, Scale, ThumbsUp, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EvolutionChart } from '@/components/bioimpedance/EvolutionChart';
import { MetricRow } from '@/components/bioimpedance/MetricRow';
import { PostureAnalysis } from '@/components/bioimpedance/PostureAnalysis';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBioimpedance, type BioimpedanceRecord } from '@/hooks/useBioimpedance';
import { useProfile } from '@/hooks/useProfile';
import { formatDateSafe } from '@/lib/dateUtils';
import { resolveUploadUrl } from '@/lib/api';
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

interface SegmentalRow {
  label: string;
  muscleKg: number | null;
  fatKg: number | null;
}

function SegmentalAnalysis({ record }: { record: BioimpedanceRecord }) {
  const rows: SegmentalRow[] = [
    { label: 'Braço Esquerdo', muscleKg: record.muscle_left_arm_kg, fatKg: record.fat_left_arm_kg },
    { label: 'Tronco', muscleKg: record.muscle_trunk_kg, fatKg: record.fat_trunk_kg },
    { label: 'Braço Direito', muscleKg: record.muscle_right_arm_kg, fatKg: record.fat_right_arm_kg },
    { label: 'Perna Esquerda', muscleKg: record.muscle_left_leg_kg, fatKg: record.fat_left_leg_kg },
    { label: 'Perna Direita', muscleKg: record.muscle_right_leg_kg, fatKg: record.fat_right_leg_kg },
  ];

  const availableRows = rows.filter((row) => row.muscleKg !== null || row.fatKg !== null);
  if (availableRows.length === 0) return null;

  return (
    <section className="rounded-[2rem] border border-white/5 bg-card/85 p-5 shadow-elegant">
      <div className="mb-5">
        <h2 className="text-xl font-semibold">Análise Segmentada</h2>
        <p className="text-sm text-muted-foreground">
          Distribuição de músculo e gordura por região do corpo no exame mais recente.
        </p>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-white/5">
        <table className="w-full min-w-[360px] border-collapse text-sm">
          <thead>
            <tr className="bg-secondary/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="p-3 font-medium">Região</th>
              <th className="p-3 font-medium">Músculo (kg)</th>
              <th className="p-3 font-medium">Gordura (kg)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {availableRows.map((row) => (
              <tr key={row.label}>
                <td className="p-3 text-muted-foreground">{row.label}</td>
                <td className="p-3">{formatNumber(row.muscleKg)}</td>
                <td className="p-3">{formatNumber(row.fatKg)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

interface SimpleMetric {
  label: string;
  value: number | null;
  unit: string;
}

function SimpleMetricsCard({ title, description, metrics }: { title: string; description: string; metrics: SimpleMetric[] }) {
  const availableMetrics = metrics.filter((metric) => metric.value !== null);
  if (availableMetrics.length === 0) return null;

  return (
    <section className="rounded-[2rem] border border-white/5 bg-card/85 p-5 shadow-elegant">
      <div className="mb-5">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="divide-y divide-white/10">
        {availableMetrics.map((metric) => (
          <MetricRow key={metric.label} label={metric.label} value={metric.value} unit={metric.unit} showDifference={false} />
        ))}
      </div>
    </section>
  );
}

interface BestPhaseResult {
  record: BioimpedanceRecord;
  diffKg: number;
}

function findBestPhase(records: BioimpedanceRecord[]): BestPhaseResult | null {
  let best: BestPhaseResult | null = null;

  for (const record of records) {
    if (typeof record.weight_kg !== 'number' || typeof record.ideal_weight_kg !== 'number') continue;

    const diffKg = Math.abs(record.weight_kg - record.ideal_weight_kg);
    if (best === null || diffKg < best.diffKg) {
      best = { record, diffKg };
    }
  }

  return best;
}

function BestPhaseCard({ records, onSelect }: { records: BioimpedanceRecord[]; onSelect: (id: string) => void }) {
  const best = useMemo(() => findBestPhase(records), [records]);
  if (!best) return null;

  return (
    <section className="rounded-[2rem] border border-primary/20 bg-primary/10 p-5 shadow-elegant">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-primary">Sua melhor fase</p>
          <h2 className="mt-1 text-xl font-semibold">{formatDate(best.record.date)}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {best.diffKg < 0.1
              ? 'Seu peso bateu exatamente com o peso ideal calculado pela bioimpedância nesse exame.'
              : `A ${best.diffKg.toFixed(1)}kg do peso ideal calculado pela bioimpedância nesse exame — a menor distância registrada.`}
          </p>
        </div>
        <ThumbsUp className="h-5 w-5 shrink-0 text-primary" />
      </div>
      <button
        type="button"
        onClick={() => onSelect(best.record.id)}
        className="mt-4 inline-flex h-9 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-black text-primary-foreground"
      >
        Ver esse exame
      </button>
    </section>
  );
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
  { key: 'thigh_cm', label: 'Coxa (circunferência)', unit: 'cm' },
  { key: 'head_length_cm', label: 'Comprimento da Cabeça', unit: 'cm' },
  { key: 'upper_body_length_cm', label: 'Comprimento do Tronco Superior', unit: 'cm' },
  { key: 'lower_body_length_cm', label: 'Comprimento do Tronco Inferior', unit: 'cm' },
  { key: 'calf_length_cm', label: 'Comprimento da Panturrilha', unit: 'cm' },
  { key: 'thigh_length_cm', label: 'Comprimento da Coxa', unit: 'cm' },
  { key: 'arm_span_cm', label: 'Envergadura', unit: 'cm' },
  { key: 'shoulder_width_cm', label: 'Largura dos Ombros', unit: 'cm' },
  { key: 'shoulder_ear_distance_cm', label: 'Distância Ombro-Orelha', unit: 'cm' },
  { key: 'foot_length_cm', label: 'Comprimento do Pé', unit: 'cm' },
  { key: 'muscle_left_arm_kg', label: 'Músculo - Braço Esquerdo', unit: 'kg' },
  { key: 'muscle_right_arm_kg', label: 'Músculo - Braço Direito', unit: 'kg' },
  { key: 'fat_left_arm_kg', label: 'Gordura - Braço Esquerdo', unit: 'kg', isLowerBetter: true },
  { key: 'fat_right_arm_kg', label: 'Gordura - Braço Direito', unit: 'kg', isLowerBetter: true },
  { key: 'muscle_trunk_kg', label: 'Músculo - Tronco', unit: 'kg' },
  { key: 'fat_trunk_kg', label: 'Gordura - Tronco', unit: 'kg', isLowerBetter: true },
  { key: 'muscle_left_leg_kg', label: 'Músculo - Perna Esquerda', unit: 'kg' },
  { key: 'muscle_right_leg_kg', label: 'Músculo - Perna Direita', unit: 'kg' },
  { key: 'fat_left_leg_kg', label: 'Gordura - Perna Esquerda', unit: 'kg', isLowerBetter: true },
  { key: 'fat_right_leg_kg', label: 'Gordura - Perna Direita', unit: 'kg', isLowerBetter: true },
  { key: 'aerobic_calories_kcal', label: 'Meta de Exercício Aeróbico', unit: '' },
  { key: 'endurance_calories_kcal', label: 'Meta de Exercício de Resistência', unit: '' },
  { key: 'anaerobic_calories_kcal', label: 'Meta de Exercício Anaeróbico', unit: '' },
  { key: 'shoulder_imbalance_cm', label: 'Desnível Ombros', unit: 'cm', isLowerBetter: true },
  { key: 'spine_curvature_cm', label: 'Curvatura Coluna', unit: 'cm', isLowerBetter: true },
  { key: 'head_tilt_degrees', label: 'Inclinação Cabeça', unit: '°', isLowerBetter: true },
  { key: 'trunk_curvature_degrees', label: 'Curvatura Tronco', unit: '°', isLowerBetter: true },
  { key: 'pelvis_tilt_degrees', label: 'Inclinação Pelve', unit: '°', isLowerBetter: true },
  { key: 'head_forward_degrees', label: 'Projeção Cabeça', unit: '°', isLowerBetter: true },
  // Classificação de risco postural importada automaticamente da Anovator
  // (nível 1-5). leg_risk_type fica de fora por ser texto, não diferenciável.
  { key: 'shoulder_risk_level', label: 'Risco de Ombro', unit: '', isLowerBetter: true },
  { key: 'humpback_risk_level', label: 'Risco de Cifose', unit: '', isLowerBetter: true },
  { key: 'pelvis_risk_level', label: 'Risco de Pelve', unit: '', isLowerBetter: true },
  { key: 'spine_risk_level', label: 'Risco de Escoliose', unit: '', isLowerBetter: true },
  { key: 'head_risk_level', label: 'Risco de Inclinação de Cabeça', unit: '', isLowerBetter: true },
  { key: 'knee_risk_level', label: 'Risco de Joelho', unit: '', isLowerBetter: true },
  { key: 'front_head_risk_level', label: 'Risco de Cabeça Projetada', unit: '', isLowerBetter: true },
  { key: 'body_shape_risk_level', label: 'Risco de Forma Corporal', unit: '', isLowerBetter: true },
  { key: 'posture_risk_level', label: 'Risco Postural Geral', unit: '', isLowerBetter: true },
];

const HEADLINE_METRICS: { key: keyof BioimpedanceRecord; label: string; unit: string; isLowerBetter: boolean }[] = [
  { key: 'weight_kg', label: 'peso', unit: 'kg', isLowerBetter: true },
  { key: 'body_fat_percent', label: 'gordura corporal', unit: '%', isLowerBetter: true },
  { key: 'muscle_percent', label: 'massa muscular', unit: '%', isLowerBetter: false },
];

function buildComparisonSummary(recordA: BioimpedanceRecord, recordB: BioimpedanceRecord) {
  const parts: { label: string; diff: number; unit: string; favorable: boolean }[] = [];

  for (const metric of HEADLINE_METRICS) {
    const valueA = recordA[metric.key] as number | null;
    const valueB = recordB[metric.key] as number | null;
    if (typeof valueA !== 'number' || typeof valueB !== 'number') continue;

    const diff = Number((valueB - valueA).toFixed(2));
    if (diff === 0) continue;

    parts.push({ label: metric.label, diff, unit: metric.unit, favorable: metric.isLowerBetter ? diff < 0 : diff > 0 });
  }

  if (parts.length === 0) return null;

  const favorableCount = parts.filter((p) => p.favorable).length;
  const unfavorableCount = parts.length - favorableCount;
  const verdict: 'positive' | 'negative' | 'neutral' =
    favorableCount > unfavorableCount ? 'positive' : favorableCount < unfavorableCount ? 'negative' : 'neutral';

  const sentence = parts.map((p) => `${p.diff > 0 ? '+' : ''}${p.diff}${p.unit} de ${p.label}`).join(', ');

  return { verdict, sentence };
}

const VERDICT_META = {
  positive: { icon: ThumbsUp, title: 'Evolução positiva', className: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100' },
  negative: { icon: AlertTriangle, title: 'Vale atenção', className: 'border-red-400/30 bg-red-400/10 text-red-100' },
  neutral: { icon: Minus, title: 'Estável', className: 'border-white/10 bg-secondary/50 text-foreground' },
} as const;

function CompareSection({ records }: { records: BioimpedanceRecord[] }) {
  const [idA, setIdA] = useState(records[1]?.id ?? records[0].id);
  const [idB, setIdB] = useState(records[0].id);

  const recordA = useMemo(() => records.find((r) => r.id === idA) ?? records[0], [records, idA]);
  const recordB = useMemo(() => records.find((r) => r.id === idB) ?? records[0], [records, idB]);
  const summary = useMemo(() => buildComparisonSummary(recordA, recordB), [recordA, recordB]);

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

      {summary ? (
        <div className={cn('mb-4 flex items-start gap-3 rounded-2xl border p-4 text-sm', VERDICT_META[summary.verdict].className)}>
          {(() => {
            const Icon = VERDICT_META[summary.verdict].icon;
            return <Icon className="mt-0.5 h-5 w-5 shrink-0" />;
          })()}
          <div>
            <p className="font-semibold">{VERDICT_META[summary.verdict].title}</p>
            <p className="mt-0.5 text-muted-foreground">
              {summary.sentence} entre {formatDate(recordA.date)} e {formatDate(recordB.date)}.
            </p>
          </div>
        </div>
      ) : null}

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
            {COMPARE_FIELDS.filter(
              (field) => typeof recordA[field.key] === 'number' || typeof recordB[field.key] === 'number',
            ).map((field) => {
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
  // Arredonda pra 1 casa decimal, igual ao laudo em PDF da Anovator - o valor
  // bruto que a API devolve tem mais casas, o que gerava divergência visual
  // com o PDF (ex: 0.19 aqui vs 0.2 no laudo, mesmo dado).
  return `${value.toFixed(1)}${unit}`;
}

export function BioimpedanciaTab() {
  const {
    records,
    latestRecord,
    loading,
    error,
    hasRecords,
    hasComparison,
  } = useBioimpedance();
  const { profile } = useProfile();
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);

  const selectedRecord = useMemo(() => {
    if (!hasRecords) return null;
    return records.find((r) => r.id === selectedExamId) ?? latestRecord;
  }, [records, selectedExamId, latestRecord, hasRecords]);

  const selectedPreviousRecord = useMemo(() => {
    if (!selectedRecord) return null;
    const index = records.findIndex((r) => r.id === selectedRecord.id);
    return index >= 0 ? (records[index + 1] ?? null) : null;
  }, [records, selectedRecord]);

  const selectExam = (id: string) => {
    setSelectedExamId(id);
    document.getElementById('exame-selecionado')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

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

      {(() => {
        const currentWeight = latestRecord?.weight_kg ?? null;
        const goalWeightKg = profile?.weight_goal_kg ?? null;
        const currentBmi = latestRecord?.bmi ?? (currentWeight != null && profile?.height_cm
          ? currentWeight / ((profile.height_cm / 100) ** 2)
          : null);
        const goalBmi = goalWeightKg != null && profile?.height_cm
          ? goalWeightKg / ((profile.height_cm / 100) ** 2)
          : null;

        const showTimeline = currentWeight != null && goalWeightKg != null;
        const showBmi = currentBmi != null;
        if (!showTimeline && !showBmi) return null;

        return (
          <div className={cn('grid gap-4', showTimeline && showBmi ? 'lg:grid-cols-2' : 'lg:grid-cols-1')}>
            {showTimeline ? (
              <WeightTimeline records={records} currentWeight={currentWeight!} goalWeightKg={goalWeightKg!} />
            ) : null}
            {showBmi ? <BmiGauge currentBmi={currentBmi!} goalBmi={goalBmi} /> : null}
          </div>
        );
      })()}

      <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[2rem] border border-white/5 bg-card/85 p-5 shadow-elegant">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Evolução</h2>
              <p className="text-sm text-muted-foreground">
                {hasRecords ? `${records.length} exame(s) no histórico — toque num ponto pra ver o exame` : 'Nenhum exame cadastrado ainda'}
              </p>
            </div>
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <EvolutionChart records={records} selectedRecordId={selectedRecord?.id} onPointClick={setSelectedExamId} />
        </div>

        <div id="exame-selecionado" className="rounded-[2rem] border border-white/5 bg-card/85 p-5 shadow-elegant">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-semibold">{records.length > 1 ? 'Exame selecionado' : 'Último exame'}</h2>
              {records.length > 1 ? (
                <Select value={selectedRecord?.id} onValueChange={setSelectedExamId}>
                  <SelectTrigger className="mt-2 h-9 text-sm">
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
              ) : (
                <p className="text-sm text-muted-foreground">{formatDate(selectedRecord?.date)}</p>
              )}
              {selectedRecord?.source_pdf_url ? (
                <a
                  href={resolveUploadUrl(selectedRecord.source_pdf_url) ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  Ver laudo em PDF
                </a>
              ) : null}
            </div>
            <Flame className="h-5 w-5 shrink-0 text-primary" />
          </div>

          {hasRecords ? (
            <div className="divide-y divide-white/10">
              <MetricRow label="IMC" value={selectedRecord?.bmi ?? null} previousValue={selectedPreviousRecord?.bmi ?? null} standard="18.5 - 24.9" isLowerBetter />
              <MetricRow
                label="Peso"
                value={selectedRecord?.weight_kg ?? null}
                unit="kg"
                previousValue={selectedPreviousRecord?.weight_kg ?? null}
                standard={
                  selectedRecord?.ideal_weight_kg
                    ? `Ideal: ${selectedRecord.ideal_weight_kg}kg`
                    : profile?.weight_goal_kg
                      ? `Meta: ${profile.weight_goal_kg}kg`
                      : '--'
                }
                isLowerBetter
              />
              <MetricRow label="Gordura corporal" value={selectedRecord?.body_fat_percent ?? null} unit="%" previousValue={selectedPreviousRecord?.body_fat_percent ?? null} standard="11% - 20%" isLowerBetter />
              <MetricRow label="Massa muscular" value={selectedRecord?.muscle_percent ?? null} unit="%" previousValue={selectedPreviousRecord?.muscle_percent ?? null} standard="42,9% - 52,4%" />
            </div>
          ) : (
            <div className="rounded-2xl bg-secondary/60 p-5 text-center text-sm text-muted-foreground">
              Quando a equipe cadastrar seu exame, os detalhes aparecem aqui.
            </div>
          )}
        </div>
      </section>

      {records.length > 1 ? <BestPhaseCard records={records} onSelect={selectExam} /> : null}

      {hasRecords && selectedRecord ? (
        <SimpleMetricsCard
          title="Composição Corporal"
          description="Detalhamento completo do exame selecionado."
          metrics={[
            { label: 'Peso', value: selectedRecord.weight_kg, unit: 'kg' },
            { label: 'Gordura Corporal', value: selectedRecord.body_fat_percent, unit: '%' },
            { label: 'Massa Muscular', value: selectedRecord.muscle_percent, unit: '%' },
            { label: 'Água', value: selectedRecord.water_percent, unit: '%' },
            { label: 'Gordura Visceral', value: selectedRecord.visceral_fat, unit: '' },
            { label: 'Gordura Subcutânea', value: selectedRecord.subcutaneous_fat_percent, unit: '%' },
            { label: 'Massa Livre de Gordura', value: selectedRecord.fat_free_mass_kg, unit: 'kg' },
            { label: 'Proteína', value: selectedRecord.protein_percent, unit: '%' },
            { label: 'Massa Óssea', value: selectedRecord.bone_mass_kg, unit: 'kg' },
            { label: 'Peso Muscular', value: selectedRecord.muscle_mass_kg, unit: 'kg' },
          ]}
        />
      ) : null}

      {hasRecords && selectedRecord ? (
        <SimpleMetricsCard
          title="Controle de Peso"
          description="Metas e recomendações calculadas a partir do exame selecionado."
          metrics={[
            { label: 'Peso Ideal', value: selectedRecord.ideal_weight_kg, unit: 'kg' },
            { label: 'Controle de Peso', value: selectedRecord.weight_control_tip, unit: 'kg' },
            { label: 'Controle de Gordura', value: selectedRecord.fat_control_tip, unit: 'kg' },
            { label: 'Ganho de Massa', value: selectedRecord.muscle_control_tip, unit: 'kg' },
          ]}
        />
      ) : null}

      {hasRecords && selectedRecord ? (
        <SimpleMetricsCard
          title="Análise de Obesidade"
          description="Indicadores de risco calculados a partir do exame selecionado."
          metrics={[
            { label: 'IMC', value: selectedRecord.bmi, unit: '' },
            { label: 'Peso da Gordura', value: selectedRecord.fat_weight_kg, unit: 'kg' },
            { label: 'Relação Cintura-Quadril', value: selectedRecord.waist_hip_ratio, unit: '' },
            { label: 'TMB', value: selectedRecord.bmr_kcal, unit: 'kcal' },
          ]}
        />
      ) : null}

      {hasRecords && selectedRecord ? (
        <SimpleMetricsCard
          title="Controle Calórico"
          description="Ingestão diária e metas de exercício por tipo, calculadas a partir do exame selecionado."
          metrics={[
            { label: 'Calorias Diárias', value: selectedRecord.daily_calories, unit: 'kcal' },
            { label: 'Meta de Exercício Aeróbico', value: selectedRecord.aerobic_calories_kcal, unit: 'kcal' },
            { label: 'Meta de Exercício de Resistência', value: selectedRecord.endurance_calories_kcal, unit: 'kcal' },
            { label: 'Meta de Exercício Anaeróbico', value: selectedRecord.anaerobic_calories_kcal, unit: 'kcal' },
          ]}
        />
      ) : null}

      {hasRecords && selectedRecord ? <SegmentalAnalysis record={selectedRecord} /> : null}

      {hasRecords && selectedRecord ? (
        <SimpleMetricsCard
          title="Medidas Corporais"
          description="Comprimentos e larguras adicionais capturados pelo scanner corporal, no exame selecionado."
          metrics={[
            { label: 'Comprimento da Cabeça', value: selectedRecord.head_length_cm, unit: 'cm' },
            { label: 'Comprimento do Tronco Superior', value: selectedRecord.upper_body_length_cm, unit: 'cm' },
            { label: 'Comprimento do Tronco Inferior', value: selectedRecord.lower_body_length_cm, unit: 'cm' },
            { label: 'Comprimento da Panturrilha', value: selectedRecord.calf_length_cm, unit: 'cm' },
            { label: 'Comprimento da Coxa', value: selectedRecord.thigh_length_cm, unit: 'cm' },
            { label: 'Envergadura', value: selectedRecord.arm_span_cm, unit: 'cm' },
            { label: 'Largura dos Ombros', value: selectedRecord.shoulder_width_cm, unit: 'cm' },
            { label: 'Distância Ombro-Orelha', value: selectedRecord.shoulder_ear_distance_cm, unit: 'cm' },
            { label: 'Comprimento do Pé', value: selectedRecord.foot_length_cm, unit: 'cm' },
          ]}
        />
      ) : null}

      {hasRecords ? (
        <section className="rounded-[2rem] border border-white/5 bg-card/85 p-5 shadow-elegant">
          <div className="mb-5">
            <h2 className="text-xl font-semibold">Análise postural</h2>
            <p className="text-sm text-muted-foreground">
              Indicadores de assimetria e postura do exame selecionado.
            </p>
          </div>
          <PostureAnalysis record={selectedRecord} previousRecord={selectedPreviousRecord} />
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
