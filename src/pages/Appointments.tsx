import { useState } from 'react';
import type { ElementType } from 'react';
import {
  ArrowLeft,
  Calendar,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Mail,
  MapPin,
  Phone,
  Scale,
  Trash2,
  UserRound,
  Video,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMyAppointments, useCreateAppointment, useDeleteAppointment, type Appointment } from '@/hooks/useAppointments';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { formatDateSafe } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';

const typeLabels: Record<string, string> = {
  consulta_online: 'Consulta online',
  consulta_presencial: 'Consulta presencial',
  bioimpedancia: 'Bioimpedância',
};

const statusLabels: Record<string, { label: string; className: string }> = {
  pending: { label: 'Aguardando contato', className: 'bg-yellow-500/15 text-yellow-300' },
  confirmed: { label: 'Agendado', className: 'bg-emerald-400/15 text-emerald-300' },
  completed: { label: 'Concluído', className: 'bg-sky-400/15 text-sky-300' },
  cancelled: { label: 'Cancelado', className: 'bg-red-400/15 text-red-300' },
};

const appointmentTypes = [
  {
    id: 'consulta_online',
    title: 'Online',
    description: 'Atendimento por videochamada com orientação personalizada.',
    duration: '45 min',
    price: 'Incluso',
    icon: Video,
  },
  {
    id: 'consulta_presencial',
    title: 'Presencial',
    description: 'Consulta em consultório para acompanhamento completo.',
    duration: '60 min',
    price: 'Confirmar',
    icon: MapPin,
  },
  {
    id: 'bioimpedancia',
    title: 'Bioimpedância',
    description: 'Avaliação de composição corporal e evolução clínica.',
    duration: '30 min',
    price: 'Confirmar',
    icon: Scale,
  },
];

function InfoRow({ label, value, icon: Icon }: { label: string; value?: string | null; icon: ElementType }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{label}</span>
      </span>
      <span className="max-w-[58%] truncate text-right text-sm font-medium text-foreground">{value || '-'}</span>
    </div>
  );
}

export default function Appointments() {
  const { data: appointments = [], isLoading } = useMyAppointments();
  const { profile } = useProfile();
  const createAppointment = useCreateAppointment();
  const deleteAppointment = useDeleteAppointment();
  const { toast } = useToast();
  const [loadingType, setLoadingType] = useState<string | null>(null);
  const [selectedTypeId, setSelectedTypeId] = useState(appointmentTypes[0].id);

  const selectedType = appointmentTypes.find((type) => type.id === selectedTypeId) || appointmentTypes[0];
  const SelectedTypeIcon = selectedType.icon;

  const handleDelete = async (id: string) => {
    try {
      await deleteAppointment.mutateAsync(id);
      toast({
        title: 'Solicitação cancelada',
        description: 'A consulta foi removida com sucesso.',
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao cancelar',
        description: err.message,
      });
    }
  };

  const handleSchedule = async (type: typeof appointmentTypes[0]) => {
    setLoadingType(type.id);

    try {
      await createAppointment.mutateAsync(type.id);

      toast({
        title: 'Solicitação enviada!',
        description: 'Entraremos em contato pelo WhatsApp para confirmar.',
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao solicitar',
        description: err.message,
      });
    } finally {
      setLoadingType(null);
    }
  };

  const formatDate = (dateString: string) => {
    return formatDateSafe(dateString, 'dd/MM/yyyy', {
      fallback: 'Data indisponivel',
    });
  };

  const formatScheduledInfo = (appointment: Appointment) => {
    if (appointment.scheduled_date && appointment.scheduled_time) {
      const formattedDate = formatDateSafe(appointment.scheduled_date, 'dd/MM', {
        noon: true,
        fallback: 'Data indisponivel',
      });
      return `${formattedDate} às ${appointment.scheduled_time.slice(0, 5)}`;
    }
    return null;
  };

  if (isLoading) {
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
          <h1 className="text-base font-bold">Área Médica Vital</h1>
        </header>

        <section className="rounded-2xl border border-white/5 bg-card/90 p-5 shadow-elegant md:rounded-[2rem] md:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
                <CalendarCheck className="h-4 w-4" />
                Área Médica Vital
              </div>
              <h1 className="hidden text-4xl font-bold leading-tight tracking-normal md:block md:text-5xl">
                Área Médica Vital
              </h1>
              <p className="text-sm leading-relaxed text-muted-foreground md:text-lg">
                Escolha o atendimento com a Dra. Gabriela, revise seus dados e envie a solicitação. A equipe confirma data e horário pelo WhatsApp.
              </p>
            </div>
            <div className="rounded-2xl bg-secondary/70 px-5 py-4 text-sm text-muted-foreground">
              <span className="block font-semibold text-foreground">{appointments.length}</span>
              solicitações no histórico
            </div>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1fr_380px]">
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Tipo de atendimento</h2>
            <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-1">
          {appointmentTypes.map((type) => {
            const Icon = type.icon;
                const isSelected = selectedType.id === type.id;

            return (
              <button
                key={type.id}
                type="button"
                    className={cn(
                      'group flex min-h-[132px] flex-col justify-between rounded-2xl border p-5 text-left shadow-elegant transition-all hover:-translate-y-0.5',
                      isSelected
                        ? 'border-primary/45 bg-primary/10'
                        : 'border-white/5 bg-card/85 hover:bg-secondary'
                    )}
                    onClick={() => setSelectedTypeId(type.id)}
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                    <Icon className="h-6 w-6" />
                  </span>
                      {isSelected && <CheckCircle2 className="h-5 w-5 text-primary" />}
                </div>
                <span>
                  <span className="block text-xl font-semibold">{type.title}</span>
                  <span className="mt-2 block text-sm leading-relaxed text-muted-foreground">{type.description}</span>
                      <span className="mt-3 flex items-center gap-3 text-xs font-medium text-muted-foreground">
                        <span>{type.duration}</span>
                        <span className="h-1 w-1 rounded-full bg-muted-foreground/50" />
                        <span>{type.price}</span>
                      </span>
                </span>
              </button>
            );
          })}
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-white/5 bg-card/85 p-4 shadow-elegant">
              <div className="flex gap-4">
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <SelectedTypeIcon className="h-7 w-7" />
                </span>
                <div className="min-w-0">
                  <p className="font-bold">{typeLabels[selectedType.id]}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{selectedType.description}</p>
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    {selectedType.duration}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3 rounded-2xl border border-white/5 bg-card/85 p-4 shadow-elegant">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold">Dados do paciente</h2>
                <Link to="/settings" className="text-sm font-semibold text-primary">Alterar</Link>
              </div>
              <InfoRow label="Nome" value={profile?.full_name} icon={UserRound} />
              <InfoRow label="Email" value={profile?.email} icon={Mail} />
              <InfoRow label="Telefone" value={profile?.phone} icon={Phone} />
            </div>

            <Button
              onClick={() => void handleSchedule(selectedType)}
              className="h-14 w-full rounded-xl bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-95"
              disabled={loadingType === selectedType.id}
            >
              {loadingType === selectedType.id ? 'Enviando...' : 'Solicitar agendamento'}
            </Button>
          </aside>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-2xl font-semibold">Histórico</h2>
          </div>

          {appointments.length === 0 ? (
            <div className="rounded-[2rem] border border-white/5 bg-card/85 p-8 text-center shadow-elegant">
              <Calendar className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <p className="font-semibold">Nenhum agendamento ainda</p>
              <p className="mt-1 text-sm text-muted-foreground">Solicite sua primeira consulta acima.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {appointments.map((appointment) => {
                const status = statusLabels[appointment.status] || statusLabels.pending;
                const scheduledInfo = formatScheduledInfo(appointment);

                return (
                  <div key={appointment.id} className="rounded-2xl border border-white/5 bg-card/85 p-4 shadow-elegant">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-2">
                        <h3 className="font-semibold">{typeLabels[appointment.type] || appointment.type}</h3>
                        {scheduledInfo ? (
                          <div className="flex items-center gap-2 text-sm font-medium text-primary">
                            <Clock className="h-4 w-4" />
                            Agendado: {scheduledInfo}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            Solicitado em {formatDate(appointment.created_at)}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={cn('shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium', status.className)}>
                          {status.label}
                        </span>
                        {appointment.status === 'pending' && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Cancelar solicitação?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação não pode ser desfeita. A solicitação de consulta será removida.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Voltar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => void handleDelete(appointment.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Cancelar consulta
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
