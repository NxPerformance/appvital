import { useEffect, useMemo } from "react";
import { ptBR } from "date-fns/locale";
import {
  Activity,
  ArrowLeft,
  Bluetooth,
  CheckCircle2,
  FileText,
  Gauge,
  HeartPulse,
  Moon,
  Printer,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Watch,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useBioimpedance } from "@/hooks/useBioimpedance";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import { useWearables, type WearableProvider } from "@/hooks/useWearables";
import { formatDateSafe } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";

const providers: Array<{
  id: WearableProvider;
  name: string;
  description: string;
  deviceName: string;
}> = [
  {
    id: "apple_health",
    name: "Apple Health",
    description: "Apple Watch e dados do app Saúde.",
    deviceName: "Apple Watch",
  },
  {
    id: "google_fit",
    name: "Google Fit",
    description: "Relógios Wear OS e Android.",
    deviceName: "Wear OS",
  },
  {
    id: "garmin",
    name: "Garmin",
    description: "Forerunner, Venu e Connect.",
    deviceName: "Garmin Watch",
  },
  {
    id: "fitbit",
    name: "Fitbit",
    description: "Fitbit Sense, Versa e Charge.",
    deviceName: "Fitbit",
  },
];

function formatDateTime(value?: string | null) {
  if (!value) return "--";
  return formatDateSafe(value, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

function formatMetric(value?: number | null, suffix = "") {
  if (value === null || value === undefined) return "--";
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value)}${suffix}`;
}

function getBmiLabel(value?: number | null) {
  if (!value) return "Sem registro";
  if (value < 18.5) return "Abaixo do peso";
  if (value < 25) return "Faixa adequada";
  if (value < 30) return "Sobrepeso";
  return "Atenção clínica";
}

function formatSleep(minutes?: number | null) {
  if (!minutes) return "--";
  return `${(minutes / 60).toFixed(1)} h`;
}

function getSeverityClass(severity: string) {
  const classes: Record<string, string> = {
    success: "border-emerald-400/20 bg-emerald-400/10 text-emerald-100",
    warning: "border-amber-300/20 bg-amber-300/10 text-amber-100",
    critical: "border-red-400/20 bg-red-400/10 text-red-100",
    info: "border-white/5 bg-background/20 text-foreground",
  };

  return classes[severity] ?? classes.info;
}

function ReportMetric({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-950">{value}</p>
      {helper ? <p className="mt-1 text-xs text-slate-500">{helper}</p> : null}
    </div>
  );
}

function VitalCard({
  icon: Icon,
  label,
  value,
  helper,
  progress,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  helper: string;
  progress: number;
}) {
  return (
    <div className="rounded-[1.5rem] border border-white/5 bg-[hsl(var(--card))] p-5 shadow-elegant">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">
          ao vivo
        </span>
      </div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-2 text-sm text-muted-foreground">{helper}</p>
      <Progress value={progress} className="mt-5 h-2 bg-[hsl(var(--muted))] [&>div]:bg-primary" />
    </div>
  );
}

export default function Wearables() {
  const { profile, loading: profileLoading } = useProfile();
  const { latestRecord, previousRecord, loading: bioLoading, getDifference } = useBioimpedance();
  const {
    connection,
    latestReading,
    notifications,
    unreadCount,
    loading: wearableLoading,
    syncing,
    saving,
    connect,
    connectFitbit,
    sync,
    disconnect,
    markNotificationRead,
    markAllNotificationsRead,
  } = useWearables();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const selectedProvider = providers.find((provider) => provider.id === connection?.provider);
  const weightDiff = getDifference(latestRecord?.weight_kg ?? null, previousRecord?.weight_kg ?? null);
  const fatDiff = getDifference(latestRecord?.body_fat_percent ?? null, previousRecord?.body_fat_percent ?? null);
  const reportDate = useMemo(() => new Date(), []);
  const currentHeartRate = latestReading?.heart_rate_bpm ?? null;
  const restingHeartRate = latestReading?.resting_heart_rate_bpm ?? null;
  const heartRateVariability = latestReading?.hrv_ms ?? null;
  const oxygenSaturation = latestReading?.spo2_percent ?? null;
  const activeCalories = latestReading?.active_calories ?? null;
  const steps = latestReading?.steps ?? null;
  const sleepMinutes = latestReading?.sleep_minutes ?? null;
  const recoveryScore = latestReading?.recovery_score ?? null;
  const stressScore = latestReading?.stress_score ?? null;
  const battery = latestReading?.battery_percent ?? null;

  const handleConnect = async (provider: (typeof providers)[number]) => {
    if (provider.id === "fitbit") {
      const result = await connectFitbit();

      if (result.error) {
        toast({
          variant: "destructive",
          title: "Erro ao iniciar Fitbit",
          description: result.error,
        });
      }

      return;
    }

    const result = await connect({
      provider: provider.id,
      device_name: provider.deviceName,
    });

    if (result.error) {
      toast({
        variant: "destructive",
        title: "Erro ao conectar relógio",
        description: result.error,
      });
      return;
    }

    toast({
      title: "Relógio conectado",
      description: `${provider.name} foi salvo no banco e sincronizado com segurança.`,
    });
  };

  useEffect(() => {
    const fitbitStatus = searchParams.get("fitbit");
    if (fitbitStatus === "connected") {
      toast({
        title: "Fitbit conectado",
        description: "A autorizacao foi concluida e os dados foram sincronizados.",
      });
    }
    if (fitbitStatus === "error" || fitbitStatus === "denied") {
      toast({
        variant: "destructive",
        title: "Fitbit nao conectado",
        description: searchParams.get("error") || "A autorizacao nao foi concluida.",
      });
    }
  }, [searchParams, toast]);

  const handleDisconnect = async () => {
    const result = await disconnect();

    if (result.error) {
      toast({
        variant: "destructive",
        title: "Erro ao remover conexão",
        description: result.error,
      });
      return;
    }

    toast({
      title: "Conexão removida",
      description: "Tokens foram apagados e a permissão ficou registrada no histórico.",
    });
  };

  const handleSync = async () => {
    const result = await sync();

    if (result.error) {
      toast({
        variant: "destructive",
        title: "Erro ao sincronizar",
        description: result.error,
      });
      return;
    }

    toast({
      title: "Sincronização concluída",
      description: "As métricas vitais e notificações foram atualizadas no banco.",
    });
  };

  if (profileLoading || bioLoading || wearableLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[linear-gradient(180deg,#2a1035_0%,#31123f_100%)]">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #wearable-report, #wearable-report * { visibility: visible; }
          #wearable-report {
            position: absolute;
            inset: 0;
            width: 100%;
            background: white;
            color: #0f172a;
            padding: 28px;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="no-print mx-auto flex w-full max-w-[1500px] flex-col gap-6 px-4 pb-28 pt-4 md:px-7 md:pb-8 md:pt-7">
        <header className="flex flex-col gap-5 rounded-[2rem] border border-white/5 bg-[rgba(50,17,67,0.96)] px-6 py-6 shadow-elegant lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              Voltar para dashboard
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Relógio e Ficha Vital</h1>
              <p className="mt-2 max-w-2xl text-base leading-relaxed text-muted-foreground">
                Conecte o relógio do paciente, acompanhe batimentos e gere uma ficha limpa para consulta ou impressão.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="secondary" onClick={handleSync} disabled={!connection || syncing}>
              <RefreshCw className={cn("mr-2 h-4 w-4", syncing ? "animate-spin" : "")} />
              Sincronizar
            </Button>
            <Button type="button" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" />
              Gerar ficha
            </Button>
          </div>
        </header>

        <section className="grid gap-4 xl:grid-cols-[1.1fr_1.9fr]">
          <div className="rounded-[2rem] border border-white/5 bg-[hsl(var(--card))] p-6 shadow-elegant">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold">Conexão</h2>
                <p className="text-base text-muted-foreground">Escolha a origem dos dados vitais.</p>
              </div>
              <Watch className="h-6 w-6 text-primary" />
            </div>

            {connection ? (
              <div className="space-y-4">
                <div className="rounded-[1.5rem] border border-emerald-400/20 bg-emerald-400/10 p-5">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                    <div>
                      <p className="font-semibold text-emerald-100">{connection.provider_label} conectado</p>
                      <p className="text-sm text-emerald-100/70">{connection.device_name}</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center justify-between rounded-2xl bg-background/20 px-4 py-3">
                    <span>Última sincronização</span>
                    <span className="text-foreground">{formatDateTime(connection.last_sync_at)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-background/20 px-4 py-3">
                    <span>Bateria</span>
                    <span className="text-foreground">{formatMetric(battery, "%")}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-background/20 px-4 py-3">
                    <span>Notificações não lidas</span>
                    <span className="text-foreground">{unreadCount}</span>
                  </div>
                </div>

                <Button type="button" variant="outline" className="w-full" onClick={handleDisconnect} disabled={saving}>
                  Remover conexão
                </Button>
              </div>
            ) : (
              <div className="grid gap-3">
                {providers.map((provider) => (
                  <button
                    key={provider.id}
                    type="button"
                    onClick={() => void handleConnect(provider)}
                    disabled={saving}
                    className="flex items-center justify-between gap-4 rounded-[1.4rem] border border-white/5 bg-background/20 p-4 text-left transition-colors hover:bg-[hsl(var(--secondary))]"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                        <Bluetooth className="h-5 w-5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block font-semibold">{provider.name}</span>
                        <span className="block text-sm text-muted-foreground">{provider.description}</span>
                      </span>
                    </span>
                    <Smartphone className="h-5 w-5 shrink-0 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <VitalCard
              icon={HeartPulse}
              label="Batimentos"
              value={currentHeartRate ? `${currentHeartRate} bpm` : "--"}
              helper={restingHeartRate ? `repouso ${restingHeartRate} bpm` : "aguardando sincronização"}
              progress={currentHeartRate ?? 0}
            />
            <VitalCard
              icon={Activity}
              label="Variabilidade"
              value={heartRateVariability ? `${heartRateVariability} ms` : "--"}
              helper="indicador de recuperação"
              progress={heartRateVariability ?? 0}
            />
            <VitalCard
              icon={Moon}
              label="Sono"
              value={formatSleep(sleepMinutes)}
              helper="última noite registrada"
              progress={sleepMinutes ? Math.min(100, (sleepMinutes / 480) * 100) : 0}
            />
            <VitalCard
              icon={Gauge}
              label="Recuperação"
              value={recoveryScore ? `${recoveryScore}%` : "--"}
              helper="pronto para treino moderado"
              progress={recoveryScore ?? 0}
            />
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-[2rem] border border-white/5 bg-[hsl(var(--card))] p-6 shadow-elegant lg:col-span-2">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold">Leitura Clínica</h2>
                <p className="text-base text-muted-foreground">Resumo objetivo para acompanhamento.</p>
              </div>
              <FileText className="h-6 w-6 text-primary" />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-[1.4rem] bg-background/20 p-5">
                <p className="text-sm text-muted-foreground">Peso atual</p>
                <p className="mt-1 text-3xl font-semibold">{formatMetric(latestRecord?.weight_kg, " kg")}</p>
                <p className={cn("mt-2 text-sm", weightDiff && weightDiff < 0 ? "text-emerald-300" : "text-muted-foreground")}>
                  {weightDiff === null ? "sem comparativo" : `${weightDiff > 0 ? "+" : ""}${weightDiff} kg desde o exame anterior`}
                </p>
              </div>
              <div className="rounded-[1.4rem] bg-background/20 p-5">
                <p className="text-sm text-muted-foreground">Gordura corporal</p>
                <p className="mt-1 text-3xl font-semibold">{formatMetric(latestRecord?.body_fat_percent, "%")}</p>
                <p className={cn("mt-2 text-sm", fatDiff && fatDiff < 0 ? "text-emerald-300" : "text-muted-foreground")}>
                  {fatDiff === null ? "sem comparativo" : `${fatDiff > 0 ? "+" : ""}${fatDiff}% desde o exame anterior`}
                </p>
              </div>
              <div className="rounded-[1.4rem] bg-background/20 p-5">
                <p className="text-sm text-muted-foreground">IMC</p>
                <p className="mt-1 text-3xl font-semibold">{formatMetric(latestRecord?.bmi)}</p>
                <p className="mt-2 text-sm text-muted-foreground">{getBmiLabel(latestRecord?.bmi)}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/5 bg-[hsl(var(--card))] p-6 shadow-elegant">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold">Privacidade</h2>
                <p className="text-base text-muted-foreground">Dados sensíveis protegidos.</p>
              </div>
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="rounded-2xl bg-background/20 p-4">Permissões podem ser removidas pelo paciente a qualquer momento.</div>
              <div className="rounded-2xl bg-background/20 p-4">A ficha mostra apenas dados úteis para acompanhamento físico e clínico.</div>
              <div className="rounded-2xl bg-background/20 p-4">Integrações reais devem usar OAuth e consentimento explícito.</div>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/5 bg-[hsl(var(--card))] p-6 shadow-elegant">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Notificações do Relógio</h2>
              <p className="text-base text-muted-foreground">Alertas ficam salvos no banco e podem ser revisados com segurança.</p>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void markAllNotificationsRead()}
              disabled={unreadCount === 0}
            >
              Marcar tudo como lido
            </Button>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => void markNotificationRead(notification.id)}
                  className={cn(
                    "rounded-[1.25rem] border p-4 text-left transition-transform hover:-translate-y-0.5",
                    getSeverityClass(notification.severity),
                    notification.is_read ? "opacity-65" : ""
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold">{notification.title}</p>
                      <p className="mt-1 text-sm leading-relaxed opacity-75">{notification.message}</p>
                    </div>
                    {!notification.is_read ? (
                      <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
                    ) : null}
                  </div>
                  <p className="mt-3 text-xs opacity-60">{formatDateTime(notification.created_at)}</p>
                </button>
              ))
            ) : (
              <div className="rounded-[1.25rem] border border-white/5 bg-background/20 p-5 text-sm text-muted-foreground">
                Nenhuma notificação do relógio ainda.
              </div>
            )}
          </div>
        </section>
      </div>

      <section id="wearable-report" className="mx-auto hidden max-w-5xl bg-white p-8 text-slate-950 print:block">
        <div className="border-b border-slate-200 pb-6">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Vitalissy</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight">Ficha de Acompanhamento Vital</h1>
              <p className="mt-2 text-sm text-slate-500">Emitida em {formatDateTime(reportDate.toISOString())}</p>
            </div>
            <div className="rounded-xl border border-slate-200 px-4 py-3 text-right">
              <p className="text-xs uppercase tracking-wide text-slate-500">Fonte</p>
              <p className="font-semibold">{connection?.provider_label ?? selectedProvider?.name ?? "Relógio não conectado"}</p>
              <p className="text-xs text-slate-500">{connection ? formatDateTime(connection.last_sync_at) : "Sem sincronização"}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <ReportMetric label="Paciente" value={profile?.full_name ?? "Paciente"} helper={`Altura: ${profile?.height_cm ?? "--"} cm`} />
          <ReportMetric label="Peso" value={formatMetric(latestRecord?.weight_kg ?? Number(profile?.weight_kg), " kg")} helper="último dado disponível" />
          <ReportMetric label="IMC" value={formatMetric(latestRecord?.bmi)} helper={getBmiLabel(latestRecord?.bmi)} />
        </div>

        <div className="mt-6">
          <h2 className="text-lg font-semibold">Sinais do Relógio</h2>
          <div className="mt-3 grid grid-cols-4 gap-3">
            <ReportMetric label="Batimento atual" value={currentHeartRate ? `${currentHeartRate} bpm` : "--"} helper={restingHeartRate ? `repouso ${restingHeartRate} bpm` : undefined} />
            <ReportMetric label="VFC" value={heartRateVariability ? `${heartRateVariability} ms` : "--"} helper="variabilidade cardíaca" />
            <ReportMetric label="Oxigenação" value={oxygenSaturation ? `${oxygenSaturation}%` : "--"} helper="SpO2 estimado" />
            <ReportMetric label="Sono" value={formatSleep(sleepMinutes)} helper="última noite" />
            <ReportMetric label="Passos" value={formatMetric(steps)} helper="dia atual" />
            <ReportMetric label="Calorias ativas" value={activeCalories ? `${activeCalories} kcal` : "--"} helper="dia atual" />
            <ReportMetric label="Recuperação" value={recoveryScore ? `${recoveryScore}%` : "--"} helper="prontidão geral" />
            <ReportMetric label="Estresse" value={stressScore ? `${stressScore}%` : "--"} helper="carga estimada" />
          </div>
        </div>

        <div className="mt-6">
          <h2 className="text-lg font-semibold">Composição Corporal</h2>
          <div className="mt-3 grid grid-cols-4 gap-3">
            <ReportMetric label="Gordura corporal" value={formatMetric(latestRecord?.body_fat_percent, "%")} />
            <ReportMetric label="Massa muscular" value={formatMetric(latestRecord?.muscle_mass_kg, " kg")} />
            <ReportMetric label="Água corporal" value={formatMetric(latestRecord?.water_percent, "%")} />
            <ReportMetric label="Gordura visceral" value={formatMetric(latestRecord?.visceral_fat)} />
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h2 className="text-lg font-semibold">Observações</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Ficha resumida para acompanhamento de evolução. Os dados de relógio devem ser interpretados como apoio à rotina e não substituem avaliação médica, exame físico ou análise profissional.
          </p>
        </div>
      </section>
    </div>
  );
}
