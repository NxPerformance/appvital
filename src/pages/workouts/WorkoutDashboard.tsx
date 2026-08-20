import { useMemo, useState } from "react";
import { ArrowLeft, BarChart3, Crown, Flame, Footprints, TimerReset, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { ptBR } from "date-fns/locale";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PremiumPreviewGate } from "@/components/PremiumPreviewGate";
import { formatDateSafe } from "@/lib/dateUtils";
import { useProfile } from "@/hooks/useProfile";
import { useReports, type ReportPeriod } from "@/hooks/useReports";

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function formatDistance(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 1,
  }).format(value);
}

function formatTimelineLabel(label: string, period: ReportPeriod) {
  if (period === "weekly") {
    return formatDateSafe(label, "dd/MM", { locale: ptBR, noon: true, fallback: label });
  }

  if (period === "monthly") {
    const [year, month] = label.split("-");
    const date = new Date(Number(year), Number(month) - 1, 1);
    return formatDateSafe(date, "MMM", { locale: ptBR, fallback: label });
  }

  return label;
}

export default function WorkoutDashboard() {
  const { profile, loading: profileLoading } = useProfile();
  const [period, setPeriod] = useState<ReportPeriod>("weekly");
  const hasPaidStatsAccess = Boolean(profile?.is_premium);
  const { report, loading, error } = useReports(period, hasPaidStatsAccess);

  const chartData = useMemo(() => {
    if (!report) return [];

    return report.timeline.map((item) => ({
      ...item,
      shortLabel: formatTimelineLabel(item.label, period),
    }));
  }, [period, report]);

  if (profileLoading || loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-primary" />
      </div>
    );
  }

  if (!hasPaidStatsAccess) {
    const previewData = [
      { shortLabel: "Seg", calories: 240, active_minutes: 35, workouts: 1, distance_km: 3.2 },
      { shortLabel: "Ter", calories: 380, active_minutes: 52, workouts: 2, distance_km: 0 },
      { shortLabel: "Qua", calories: 180, active_minutes: 28, workouts: 1, distance_km: 2.4 },
      { shortLabel: "Qui", calories: 420, active_minutes: 60, workouts: 2, distance_km: 4.1 },
      { shortLabel: "Sex", calories: 310, active_minutes: 45, workouts: 1, distance_km: 0 },
    ];

    return (
      <div className="min-h-full bg-[linear-gradient(180deg,#2a1035_0%,#31123f_100%)]">
        <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-6 px-4 pb-28 pt-4 md:px-7 md:pb-8 md:pt-7">
          <header className="rounded-[2rem] border border-white/5 bg-[rgba(50,17,67,0.96)] px-6 py-6 shadow-elegant">
            <div className="flex items-center gap-4">
              <Link to="/workouts" className="rounded-full bg-[hsl(var(--secondary))] p-3 text-muted-foreground transition-colors hover:text-foreground">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Estatísticas Premium</h1>
                <p className="text-sm text-muted-foreground">O caderno de treinos é gratuito. As análises semanais, mensais e anuais são pagas.</p>
              </div>
            </div>
          </header>

          <PremiumPreviewGate
            title="Desbloqueie suas estatísticas avançadas"
            description="Veja uma prévia dos gráficos de calorias, minutos ativos, distância e frequência. Com o Premium, esses dados viram acompanhamento real da sua evolução."
          >
            <div className="space-y-5 p-5 md:p-6">
              <section className="grid gap-4 md:grid-cols-3">
                <div className="rounded-[1.75rem] border border-white/5 bg-[hsl(var(--card))] p-5">
                  <p className="text-sm text-muted-foreground">Treinos no período</p>
                  <p className="mt-2 text-4xl font-semibold">7</p>
                </div>
                <div className="rounded-[1.75rem] border border-white/5 bg-[hsl(var(--card))] p-5">
                  <p className="text-sm text-muted-foreground">Calorias</p>
                  <p className="mt-2 text-4xl font-semibold">1.530</p>
                </div>
                <div className="rounded-[1.75rem] border border-white/5 bg-[hsl(var(--card))] p-5">
                  <p className="text-sm text-muted-foreground">Minutos ativos</p>
                  <p className="mt-2 text-4xl font-semibold">220</p>
                </div>
              </section>

              <section className="rounded-[2rem] border border-white/5 bg-[hsl(var(--card))] p-5">
                <p className="mb-4 text-lg font-semibold">Tendência semanal</p>
                <ChartContainer config={{ calories: { label: "Calorias", color: "hsl(var(--primary))" } }} className="h-[260px]">
                  <AreaChart data={previewData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="shortLabel" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area type="monotone" dataKey="calories" stroke="var(--color-calories)" fill="var(--color-calories)" fillOpacity={0.25} />
                  </AreaChart>
                </ChartContainer>
              </section>
            </div>
          </PremiumPreviewGate>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[linear-gradient(180deg,#2a1035_0%,#31123f_100%)]">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-4 pb-28 pt-4 md:px-7 md:pb-8 md:pt-7">
        <header className="rounded-[2rem] border border-white/5 bg-[rgba(50,17,67,0.96)] px-6 py-6 shadow-elegant">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <Link to="/workouts" className="rounded-full bg-[hsl(var(--secondary))] p-3 text-muted-foreground transition-colors hover:text-foreground">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Estatísticas Premium</h1>
                <p className="text-sm text-muted-foreground">Acompanhe sua evolução por semana, mês ou ano com dados consolidados.</p>
              </div>
            </div>

            <div className="flex gap-2">
              {[
                { value: "weekly", label: "Semanal" },
                { value: "monthly", label: "Mensal" },
                { value: "yearly", label: "Anual" },
              ].map((item) => (
                <Button
                  key={item.value}
                  type="button"
                  variant={period === item.value ? "default" : "outline"}
                  className={period === item.value ? "" : "border-white/10 bg-[hsl(var(--secondary))]"}
                  onClick={() => setPeriod(item.value as ReportPeriod)}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </div>
        </header>

        {error || !report ? (
          <section className="rounded-[2rem] border border-red-400/20 bg-[rgba(50,17,67,0.96)] p-8 text-center shadow-elegant">
            <p className="text-lg font-semibold">Não foi possível carregar o relatório.</p>
            <p className="mt-2 text-sm text-muted-foreground">{error || "Tente novamente em instantes."}</p>
          </section>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="gold-highlight rounded-[2rem] px-6 py-6 shadow-glow">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-primary-foreground/80">Treinos</p>
                    <p className="mt-2 text-4xl font-semibold">{formatNumber(report.totals.workouts)}</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-primary-foreground" />
                </div>
              </div>

              <div className="rounded-[2rem] border border-white/5 bg-[hsl(var(--card))] p-6 shadow-elegant">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Calorias</p>
                    <p className="mt-2 text-4xl font-semibold">{formatNumber(report.totals.calories)}</p>
                  </div>
                  <Flame className="h-8 w-8 text-primary" />
                </div>
              </div>

              <div className="rounded-[2rem] border border-white/5 bg-[hsl(var(--card))] p-6 shadow-elegant">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Minutos ativos</p>
                    <p className="mt-2 text-4xl font-semibold">{formatNumber(report.totals.active_minutes)}</p>
                  </div>
                  <TimerReset className="h-8 w-8 text-primary" />
                </div>
              </div>

              <div className="rounded-[2rem] border border-white/5 bg-[hsl(var(--card))] p-6 shadow-elegant">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Distância</p>
                    <p className="mt-2 text-4xl font-semibold">{formatDistance(report.totals.distance_km)} km</p>
                  </div>
                  <Footprints className="h-8 w-8 text-primary" />
                </div>
              </div>
            </section>

            <section className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
              <div className="rounded-[2rem] border border-white/5 bg-[hsl(var(--card))] p-6 shadow-elegant">
                <div className="mb-6 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold">Volume de treinos</h2>
                    <p className="text-sm text-muted-foreground">Distribuição por período selecionado.</p>
                  </div>
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>

                <ChartContainer
                  className="h-[300px] w-full"
                  config={{
                    workouts: { label: "Treinos", color: "hsl(var(--primary))" },
                  }}
                >
                  <BarChart data={chartData}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="shortLabel" tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="workouts" fill="var(--color-workouts)" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </div>

              <div className="rounded-[2rem] border border-white/5 bg-[hsl(var(--card))] p-6 shadow-elegant">
                <div className="mb-5">
                  <h2 className="text-xl font-semibold">Composição do período</h2>
                  <p className="text-sm text-muted-foreground">Leitura rápida do que você acumulou.</p>
                </div>

                <div className="space-y-4">
                  <div className="rounded-[1.5rem] bg-[hsl(var(--secondary))] p-4">
                    <p className="text-sm text-muted-foreground">Musculação</p>
                    <p className="mt-1 text-3xl font-semibold">{report.totals.strength_workouts}</p>
                  </div>
                  <div className="rounded-[1.5rem] bg-[hsl(var(--secondary))] p-4">
                    <p className="text-sm text-muted-foreground">Cardio</p>
                    <p className="mt-1 text-3xl font-semibold">{report.totals.cardio_workouts}</p>
                  </div>
                  <div className="rounded-[1.5rem] bg-[hsl(var(--secondary))] p-4">
                    <p className="text-sm text-muted-foreground">Fotos de evolução</p>
                    <p className="mt-1 text-3xl font-semibold">{report.totals.body_progress_photos}</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
              <div className="rounded-[2rem] border border-white/5 bg-[hsl(var(--card))] p-6 shadow-elegant">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold">Energia e minutos ativos</h2>
                  <p className="text-sm text-muted-foreground">Comparativo de calorias e volume de atividade.</p>
                </div>

                <ChartContainer
                  className="h-[300px] w-full"
                  config={{
                    calories: { label: "Calorias", color: "hsl(var(--primary))" },
                    minutes: { label: "Minutos", color: "hsl(var(--muted-foreground))" },
                  }}
                >
                  <AreaChart data={chartData}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="shortLabel" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                      type="monotone"
                      dataKey="calories"
                      stroke="var(--color-calories)"
                      fill="var(--color-calories)"
                      fillOpacity={0.25}
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="minutes"
                      stroke="var(--color-minutes)"
                      fill="var(--color-minutes)"
                      fillOpacity={0.12}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ChartContainer>
              </div>

              <div className="rounded-[2rem] border border-white/5 bg-[hsl(var(--card))] p-6 shadow-elegant">
                <div className="mb-5">
                  <h2 className="text-xl font-semibold">Último snapshot corporal</h2>
                  <p className="text-sm text-muted-foreground">Dados mais recentes de composição registrados.</p>
                </div>

                {report.latest_body_metrics ? (
                  <div className="space-y-4">
                    <div className="rounded-[1.5rem] bg-[hsl(var(--secondary))] p-4">
                      <p className="text-sm text-muted-foreground">Registro</p>
                      <p className="mt-1 text-lg font-semibold">
                        {formatDateSafe(report.latest_body_metrics.date, "dd 'de' MMMM yyyy", {
                          locale: ptBR,
                          noon: true,
                        })}
                      </p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
                      <div className="rounded-[1.5rem] bg-[hsl(var(--secondary))] p-4">
                        <p className="text-sm text-muted-foreground">Peso</p>
                        <p className="mt-1 text-2xl font-semibold">
                          {report.latest_body_metrics.weight_kg ?? "--"} kg
                        </p>
                      </div>
                      <div className="rounded-[1.5rem] bg-[hsl(var(--secondary))] p-4">
                        <p className="text-sm text-muted-foreground">Gordura corporal</p>
                        <p className="mt-1 text-2xl font-semibold">
                          {report.latest_body_metrics.body_fat_percent ?? "--"}%
                        </p>
                      </div>
                      <div className="rounded-[1.5rem] bg-[hsl(var(--secondary))] p-4">
                        <p className="text-sm text-muted-foreground">Massa muscular</p>
                        <p className="mt-1 text-2xl font-semibold">
                          {report.latest_body_metrics.muscle_mass_kg ?? "--"} kg
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex min-h-[220px] items-center justify-center rounded-[1.5rem] bg-[hsl(var(--secondary))] text-center text-muted-foreground">
                    <p className="max-w-xs text-sm">Assim que você tiver bioimpedância registrada, o snapshot corporal aparece aqui.</p>
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
