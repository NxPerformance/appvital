import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, User, Phone } from 'lucide-react';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatDateSafe, parseDateValue } from '@/lib/dateUtils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useAllAppointments, useUpdateAppointment, Appointment } from '@/hooks/useAppointments';
import { useToast } from '@/hooks/use-toast';

const typeLabels: Record<string, string> = {
  consulta_online: 'Consulta Online',
  consulta_presencial: 'Consulta Presencial',
  bioimpedancia: 'Bioimpedância',
};

const statusOptions = [
  { value: 'pending', label: 'Pendente' },
  { value: 'confirmed', label: 'Agendado' },
  { value: 'completed', label: 'Concluído' },
  { value: 'cancelled', label: 'Cancelado' },
];

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400',
  confirmed: 'bg-green-500/20 text-green-400',
  completed: 'bg-blue-500/20 text-blue-400',
  cancelled: 'bg-red-500/20 text-red-400',
};

export default function AdminAppointments() {
  const { data: appointments = [], isLoading } = useAllAppointments();
  const updateAppointment = useUpdateAppointment();
  const { toast } = useToast();

  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [formDate, setFormDate] = useState<Date | undefined>();
  const [formTime, setFormTime] = useState('');
  const [formStatus, setFormStatus] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const openEditDialog = (appointment: Appointment) => {
    const scheduledDate = parseDateValue(appointment.scheduled_date, { noon: true });

    setEditingAppointment(appointment);
    setFormDate(scheduledDate ?? undefined);
    setFormTime(appointment.scheduled_time?.slice(0, 5) || '');
    setFormStatus(appointment.status);
    setFormNotes(appointment.admin_notes || '');
  };

  const handleSave = async () => {
    if (!editingAppointment) return;

    try {
      await updateAppointment.mutateAsync({
        id: editingAppointment.id,
        scheduled_date: formDate ? formatDateSafe(formDate, 'yyyy-MM-dd', { fallback: '' }) || null : null,
        scheduled_time: formTime || null,
        status: formStatus,
        admin_notes: formNotes || null,
      });

      toast({
        title: 'Consulta atualizada!',
        description: 'As alterações foram salvas com sucesso.',
      });

      setEditingAppointment(null);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar',
        description: err.message,
      });
    }
  };

  const filterByStatus = (status: string) => {
    return appointments.filter((a) => a.status === status);
  };

  const formatPhoneForWhatsApp = (phone: string | null | undefined) => {
    if (!phone) return null;
    // Remove tudo que não é número
    return phone.replace(/\D/g, '');
  };

  const renderAppointmentCard = (appointment: Appointment) => {
    const statusColor = statusColors[appointment.status] || statusColors.pending;
    const userName = appointment.profiles?.full_name || 'Usuário desconhecido';
    const userPhone = appointment.profiles?.phone;
    const whatsappNumber = formatPhoneForWhatsApp(userPhone);

    return (
      <Card
        key={appointment.id}
        className="cursor-pointer hover:bg-accent/5 transition-colors"
        onClick={() => openEditDialog(appointment)}
      >
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{userName}</span>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor}`}>
              {statusOptions.find((s) => s.value === appointment.status)?.label || appointment.status}
            </span>
          </div>

          {/* Telefone com link WhatsApp */}
          {userPhone && (
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-green-500" />
              <a
                href={`https://wa.me/${whatsappNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-green-500 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {userPhone}
              </a>
            </div>
          )}

          <div className="text-sm">
            <span className="font-medium">
              {typeLabels[appointment.type] || appointment.type}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDateSafe(appointment.created_at, "dd/MM/yyyy 'às' HH:mm", {
                locale: ptBR,
                fallback: 'Data indisponivel',
              })}
            </div>
            {appointment.scheduled_date && (
              <div className="flex items-center gap-1 text-accent">
                <Clock className="w-3 h-3" />
                Agendado: {formatDateSafe(appointment.scheduled_date, 'dd/MM', {
                  locale: ptBR,
                  noon: true,
                  fallback: 'Data indisponivel',
                })}
                {appointment.scheduled_time && ` às ${appointment.scheduled_time.slice(0, 5)}`}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-24 space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/admin">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Gerenciar Consultas</h1>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending" className="text-xs">
            Pendentes ({filterByStatus('pending').length})
          </TabsTrigger>
          <TabsTrigger value="confirmed" className="text-xs">
            Confirmadas ({filterByStatus('confirmed').length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="text-xs">
            Concluídas ({filterByStatus('completed').length})
          </TabsTrigger>
          <TabsTrigger value="cancelled" className="text-xs">
            Canceladas ({filterByStatus('cancelled').length})
          </TabsTrigger>
        </TabsList>

        {statusOptions.map((status) => (
          <TabsContent key={status.value} value={status.value} className="space-y-3 mt-4">
            {filterByStatus(status.value).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma consulta {status.label.toLowerCase()}
              </div>
            ) : (
              filterByStatus(status.value).map(renderAppointmentCard)
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={!!editingAppointment} onOpenChange={() => setEditingAppointment(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Consulta</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* User Info */}
            <div className="bg-muted/50 rounded-lg p-3 space-y-1">
              <p className="font-medium">{editingAppointment?.profiles?.full_name}</p>
              <p className="text-sm text-muted-foreground">
                {typeLabels[editingAppointment?.type || ''] || editingAppointment?.type}
              </p>
              {editingAppointment?.profiles?.phone && (
                <a
                  href={`https://wa.me/${formatPhoneForWhatsApp(editingAppointment.profiles.phone)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-green-500 hover:underline"
                >
                  <Phone className="w-4 h-4" />
                  {editingAppointment.profiles.phone}
                </a>
              )}
            </div>

            {/* Date Picker */}
            <div className="space-y-2">
              <Label>Data Agendada</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !formDate && 'text-muted-foreground'
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {formDate
                      ? formatDateSafe(formDate, 'PPP', { locale: ptBR, fallback: 'Data invalida' })
                      : 'Selecionar data'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={formDate}
                    onSelect={setFormDate}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Time Input */}
            <div className="space-y-2">
              <Label>Horário</Label>
              <Input
                type="time"
                value={formTime}
                onChange={(e) => setFormTime(e.target.value)}
              />
            </div>

            {/* Status Select */}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formStatus} onValueChange={setFormStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Admin Notes */}
            <div className="space-y-2">
              <Label>Observações (Admin)</Label>
              <Textarea
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Notas internas..."
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setEditingAppointment(null)}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1"
                onClick={handleSave}
                disabled={updateAppointment.isPending}
              >
                {updateAppointment.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
