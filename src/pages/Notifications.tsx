import {
  ArrowLeft,
  Bell,
  CalendarCheck,
  CheckCircle2,
  Crown,
  Flame,
  Mail,
  MoreVertical,
  Trophy,
  UserRound,
  Watch,
} from "lucide-react";
import type { ElementType } from "react";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAchievements } from "@/hooks/useAchievements";
import { useMyAppointments } from "@/hooks/useAppointments";
import { useProfile } from "@/hooks/useProfile";
import { useWearables, type WearableNotification } from "@/hooks/useWearables";
import { formatDateSafe } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  unread: boolean;
  icon: ElementType;
  tone: "primary" | "success" | "warning" | "muted";
  wearableId?: string;
}

function getToneClasses(tone: NotificationItem["tone"]) {
  if (tone === "success") return "bg-emerald-400/15 text-emerald-300 border-emerald-300/15";
  if (tone === "warning") return "bg-amber-300/15 text-amber-200 border-amber-200/15";
  if (tone === "primary") return "bg-primary text-primary-foreground border-primary/20";
  return "bg-secondary text-muted-foreground border-white/5";
}

function formatNotificationDate(value: string) {
  return formatDateSafe(value, "dd MMM, HH:mm", { locale: ptBR, fallback: "Agora" });
}

function mapWearableNotification(notification: WearableNotification): NotificationItem {
  const tone =
    notification.severity === "success"
      ? "success"
      : notification.severity === "warning" || notification.severity === "critical"
        ? "warning"
        : "primary";

  return {
    id: `wearable-${notification.id}`,
    wearableId: notification.id,
    title: notification.title,
    message: notification.message,
    createdAt: notification.created_at,
    unread: !notification.is_read,
    icon: notification.type === "sync" ? Watch : Bell,
    tone,
  };
}

function NotificationRow({
  notification,
  onMarkRead,
}: {
  notification: NotificationItem;
  onMarkRead?: (id: string) => void;
}) {
  const Icon = notification.icon;

  return (
    <button
      type="button"
      onClick={() => notification.wearableId && onMarkRead?.(notification.wearableId)}
      className={cn(
        "flex w-full items-start gap-4 rounded-2xl p-4 text-left transition-colors",
        notification.unread ? "bg-card/95 shadow-elegant" : "bg-transparent hover:bg-card/55",
      )}
    >
      <span
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border",
          getToneClasses(notification.tone),
        )}
      >
        <Icon className="h-5 w-5" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-3">
          <span className={cn("block text-sm font-bold", notification.unread ? "text-foreground" : "text-foreground/75")}>
            {notification.title}
          </span>
          {notification.unread ? <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" /> : null}
        </span>
        <span className={cn("mt-1 block text-xs leading-relaxed", notification.unread ? "text-foreground/75" : "text-muted-foreground")}>
          {notification.message}
        </span>
        <span className="mt-2 block text-xs text-muted-foreground">
          {formatNotificationDate(notification.createdAt)}
        </span>
      </span>
    </button>
  );
}

export default function Notifications() {
  const { profile } = useProfile();
  const { latestAchievement } = useAchievements();
  const { data: appointments = [] } = useMyAppointments();
  const {
    notifications: wearableNotifications,
    unreadCount,
    loading,
    markNotificationRead,
    markAllNotificationsRead,
  } = useWearables();

  const now = new Date().toISOString();
  const hasIncompleteProfile = Boolean(profile && (!profile.phone || !profile.height_cm || !profile.weight_kg));
  const pendingAppointments = appointments.filter((appointment) => appointment.status === "pending").length;
  const items: NotificationItem[] = [
    ...wearableNotifications.map(mapWearableNotification),
    hasIncompleteProfile
      ? {
          id: "profile-incomplete",
          title: "Complete seus dados",
          message: "Telefone, altura e peso ajudam a personalizar treinos, consultas e métricas.",
          createdAt: now,
          unread: false,
          icon: UserRound,
          tone: "warning" as const,
        }
      : null,
    pendingAppointments > 0
      ? {
          id: "appointments-pending",
          title: "Consulta em análise",
          message: `${pendingAppointments} solicitação(ões) aguardando confirmação da equipe.`,
          createdAt: appointments.find((appointment) => appointment.status === "pending")?.created_at || now,
          unread: false,
          icon: CalendarCheck,
          tone: "primary" as const,
        }
      : null,
    latestAchievement
      ? {
          id: `achievement-${latestAchievement.id}`,
          title: "Conquista desbloqueada",
          message: latestAchievement.achievement.description,
          createdAt: latestAchievement.unlocked_at,
          unread: false,
          icon: Trophy,
          tone: "success" as const,
        }
      : null,
    {
      id: "daily-reminder",
      title: "Lembrete diário",
      message: "Registre treino, medidas ou consulta para manter seu histórico atualizado.",
      createdAt: now,
      unread: false,
      icon: Flame,
      tone: "muted" as const,
    },
    {
      id: "premium-status",
      title: profile?.is_premium ? "Premium ativo" : "Premium disponível",
      message: profile?.is_premium
        ? "Seus relatórios avançados e recursos completos estão liberados."
        : "Desbloqueie relatórios avançados, histórico completo e conquistas.",
      createdAt: now,
      unread: false,
      icon: profile?.is_premium ? Crown : Mail,
      tone: profile?.is_premium ? "success" as const : "muted" as const,
    },
  ].filter(Boolean) as NotificationItem[];

  return (
    <div className="min-h-full bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--background-strong))_100%)]">
      <div className="mx-auto flex w-full max-w-[860px] flex-col gap-5 px-4 pb-28 pt-4 md:px-7 md:pb-8 md:pt-7">
        <header className="grid h-14 grid-cols-[44px_1fr_44px] items-center">
          <Link
            to="/"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary/70 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-center text-lg font-bold">Notificações</h1>
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary/70 text-muted-foreground">
            <MoreVertical className="h-5 w-5" />
          </span>
        </header>

        <section className="rounded-[2rem] border border-white/5 bg-card/90 p-5 shadow-elegant">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
                <Bell className="h-4 w-4" />
                Central Vitalissy
              </div>
              <h2 className="text-3xl font-bold leading-tight tracking-normal">Tudo importante em um lugar</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Alertas do relógio, progresso, conquistas e lembretes úteis para sua rotina.
              </p>
            </div>
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <CheckCircle2 className="h-7 w-7" />
            </span>
          </div>

          <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl bg-secondary/65 p-3">
            <span className="text-sm text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} não lida(s)` : "Tudo em dia"}
            </span>
            <Button
              type="button"
              variant="ghost"
              className="h-9 rounded-xl px-3 text-primary hover:bg-primary/10 hover:text-primary"
              disabled={unreadCount === 0}
              onClick={() => void markAllNotificationsRead()}
            >
              Marcar lidas
            </Button>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/5 bg-card/60 p-2 shadow-elegant">
          {loading ? (
            <div className="flex min-h-[260px] items-center justify-center">
              <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-t-2 border-primary" />
            </div>
          ) : items.length > 0 ? (
            <div className="grid gap-1">
              {items.map((notification) => (
                <NotificationRow
                  key={notification.id}
                  notification={notification}
                  onMarkRead={(id) => void markNotificationRead(id)}
                />
              ))}
            </div>
          ) : (
            <div className="flex min-h-[260px] flex-col items-center justify-center p-6 text-center">
              <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Bell className="h-7 w-7" />
              </span>
              <h2 className="text-xl font-bold">Nenhuma notificação</h2>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
                Quando houver novidades importantes, elas aparecem por aqui.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
