import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  Pencil,
  Plus,
  ShieldCheck,
  Sparkles,
  Syringe,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import type { ElementType } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { PremiumPreviewGate } from '@/components/PremiumPreviewGate';
import { toast } from 'sonner';
import { ptBR } from 'date-fns/locale';
import { InjectablesAnalytics } from '@/components/injectables/InjectablesAnalytics';
import { formatDateSafe, toDateOnlyString } from '@/lib/dateUtils';

const locationLabels: Record<string, string> = {
  abdomen: 'Abdômen',
  coxa: 'Coxa',
  braco: 'Braço',
};

const bodyLocations = [
  { value: 'abdomen', label: 'Abdômen' },
  { value: 'coxa', label: 'Coxa' },
  { value: 'braco', label: 'Braço' },
];

interface Injectable {
  id: string;
  user_id: string;
  medication: string;
  dose: string;
  date: string;
  time: string;
  location: string;
  notes: string | null;
  created_at: string;
}

function formatInjectableDate(value: string) {
  return formatDateSafe(value, "dd 'de' MMM", { locale: ptBR, noon: true });
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: ElementType;
}) {
  return (
    <div className="rounded-2xl border border-white/5 bg-card/85 p-4 shadow-elegant">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

export default function Injectables() {
  const { profile, loading } = useProfile();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [editingInjectable, setEditingInjectable] = useState<Injectable | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Edit form state
  const [editMedication, setEditMedication] = useState('');
  const [editDose, setEditDose] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const { data: injectables, isLoading: loadingInjectables } = useQuery({
    queryKey: ['injectables'],
    queryFn: async () => {
      const response = await api.get<{ injectables: Injectable[] }>('/injectables');
      return response.injectables.map((injectable) => ({
        ...injectable,
        date: toDateOnlyString(injectable.date),
      }));
    },
    enabled: Boolean(profile?.is_premium),
  });

  const sortedInjectables = useMemo(() => {
    return [...(injectables ?? [])].sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time || '00:00'}`).getTime();
      const dateB = new Date(`${b.date}T${b.time || '00:00'}`).getTime();
      return dateB - dateA;
    });
  }, [injectables]);

  const latestInjectable = sortedInjectables[0] ?? null;
  const uniqueMedications = new Set(sortedInjectables.map((item) => item.medication)).size;
  const lastLocation = latestInjectable ? locationLabels[latestInjectable.location] || latestInjectable.location : '--';

  const updateMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/injectables/${id}`, {
          medication: editMedication,
          dose: editDose,
          date: editDate,
          time: editTime,
          location: editLocation,
          notes: editNotes || null,
        });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['injectables'] });
      toast.success('Aplicação atualizada!');
      setEditingInjectable(null);
    },
    onError: (error) => {
      toast.error('Erro ao atualizar: ' + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/injectables/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['injectables'] });
      toast.success('Aplicação excluída!');
      setDeleteId(null);
    },
    onError: (error) => {
      toast.error('Erro ao excluir: ' + error.message);
    },
  });

  const openEditModal = (injectable: Injectable) => {
    setEditMedication(injectable.medication);
    setEditDose(injectable.dose);
    setEditDate(toDateOnlyString(injectable.date));
    setEditTime(injectable.time);
    setEditLocation(injectable.location);
    setEditNotes(injectable.notes || '');
    setEditingInjectable(injectable);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInjectable) return;
    if (!editMedication || !editDose || !editDate || !editTime || !editLocation) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    updateMutation.mutate(editingInjectable.id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
      </div>
    );
  }

  if (!profile?.is_premium) {
    return (
      <div className="min-h-full bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--background-strong))_100%)]">
        <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-6 px-4 pb-28 pt-4 md:px-7 md:pb-8 md:pt-7">
          <header className="rounded-[2rem] border border-white/5 bg-card/90 p-6 shadow-elegant">
            <div className="flex items-center gap-4">
              <Link to="/" className="h-11 w-11 items-center justify-center rounded-full bg-secondary/80 text-muted-foreground transition-colors hover:text-foreground inline-flex">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Monitoramento de Injetáveis</h1>
                <p className="text-sm text-muted-foreground">Prévia do histórico, consistência e organização das aplicações.</p>
              </div>
            </div>
          </header>

          <PremiumPreviewGate
            title="Organize suas aplicações com segurança"
            description="No Premium, você registra medicamentos, doses, horários, locais de aplicação e acompanha consistência em um painel privado."
          >
            <div className="space-y-5 p-5">
              <section className="grid gap-3 md:grid-cols-3">
                <StatCard label="Aplicações registradas" value={8} icon={Syringe} />
                <StatCard label="Medicamentos no histórico" value={2} icon={ShieldCheck} />
                <StatCard label="Último local aplicado" value="Abdômen" icon={MapPin} />
              </section>

              <section className="rounded-[2rem] border border-white/5 bg-card/85 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold">Histórico</h2>
                    <p className="text-sm text-muted-foreground">Registros mais recentes primeiro.</p>
                  </div>
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div className="grid gap-3 lg:grid-cols-2">
                  {[
                    { medication: "Aplicação exemplo", dose: "0,5 ml", location: "Abdômen", date: "Hoje" },
                    { medication: "Rotina semanal", dose: "1 dose", location: "Coxa", date: "Segunda" },
                  ].map((item) => (
                    <div key={item.medication} className="rounded-2xl border border-white/5 bg-card/85 p-4 shadow-elegant">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15">
                          <Syringe className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{item.medication}</h3>
                          <p className="text-sm text-muted-foreground">{item.dose}</p>
                        </div>
                      </div>
                      <div className="mt-4 grid gap-2 rounded-2xl bg-secondary/55 p-3 text-sm text-muted-foreground sm:grid-cols-2">
                        <span>{item.date}</span>
                        <span>{item.location}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </PremiumPreviewGate>
        </div>
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
          <h1 className="text-base font-bold">Injetáveis</h1>
          <Button
            size="icon"
            onClick={() => navigate('/injectables/new')}
            className="absolute right-0 h-10 w-10 rounded-full bg-primary text-primary-foreground shadow-glow"
            aria-label="Adicionar aplicação"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </header>

        <header className="rounded-[2rem] border border-white/5 bg-card/90 p-6 shadow-elegant">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl space-y-3">
              <Link to="/" className="hidden h-11 w-11 items-center justify-center rounded-full bg-secondary/80 text-muted-foreground transition-colors hover:text-foreground md:inline-flex">
              <ArrowLeft className="h-5 w-5" />
            </Link>
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
                <Sparkles className="h-4 w-4" />
                Recurso Premium
              </div>
              <h1 className="hidden text-4xl font-bold leading-tight tracking-normal md:block md:text-5xl">Monitoramento de Injetáveis</h1>
              <p className="text-base leading-relaxed text-muted-foreground md:text-lg">Gerencie aplicações, acompanhe consistência e mantenha um histórico organizado.</p>
            </div>
            <Button
              onClick={() => navigate('/injectables/new')}
              className="hidden h-14 rounded-2xl bg-gradient-primary px-6 text-base font-bold text-primary-foreground shadow-glow hover:opacity-95 md:inline-flex"
            >
              <Plus className="mr-2 h-5 w-5" />
              Adicionar aplicação
            </Button>
          </div>
        </header>

        <section className="grid gap-3 md:grid-cols-3">
          <StatCard label="Aplicações registradas" value={sortedInjectables.length} icon={Syringe} />
          <StatCard label="Medicamentos no histórico" value={uniqueMedications} icon={ShieldCheck} />
          <StatCard label="Último local aplicado" value={lastLocation} icon={MapPin} />
        </section>

      {/* Analytics Section */}
      {injectables && <InjectablesAnalytics injectables={injectables} />}

      {/* List */}
      {loadingInjectables ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent"></div>
        </div>
      ) : sortedInjectables.length > 0 ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold">Histórico</h2>
              <p className="text-sm text-muted-foreground">Registros mais recentes primeiro.</p>
            </div>
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
          {sortedInjectables.map((injectable) => (
            <div key={injectable.id} className="rounded-2xl border border-white/5 bg-card/85 p-4 shadow-elegant">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15">
                    <Syringe className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{injectable.medication}</h3>
                    <p className="text-sm text-muted-foreground">{injectable.dose}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={() => openEditModal(injectable)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={() => setDeleteId(injectable.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>

              <div className="mt-4 grid gap-2 rounded-2xl bg-secondary/55 p-3 text-sm text-muted-foreground sm:grid-cols-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{formatInjectableDate(injectable.date)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{injectable.time}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>{locationLabels[injectable.location] || injectable.location}</span>
                </div>
              </div>

              {injectable.notes && (
                <p className="text-sm text-muted-foreground border-t border-white/10 pt-2">
                  {injectable.notes}
                </p>
              )}
            </div>
          ))}
          </div>
        </section>
      ) : (
        <div className="rounded-[2rem] border border-white/5 bg-card/85 p-8 text-center space-y-4">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <Syringe className="w-10 h-10 text-primary" />
          </div>
          <h3 className="text-lg font-semibold">Nenhuma aplicação registrada</h3>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto">
            Comece a registrar suas aplicações para acompanhar seu histórico.
          </p>
        </div>
      )}

      {/* Edit Modal */}
      <Dialog open={!!editingInjectable} onOpenChange={(open) => !open && setEditingInjectable(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Aplicação</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-medication">Medicamento *</Label>
              <Input
                id="edit-medication"
                value={editMedication}
                onChange={(e) => setEditMedication(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-dose">Dose *</Label>
              <Input
                id="edit-dose"
                value={editDose}
                onChange={(e) => setEditDose(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-date">Data *</Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-time">Horário *</Label>
                <Input
                  id="edit-time"
                  type="time"
                  value={editTime}
                  onChange={(e) => setEditTime(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-location">Local de Aplicação *</Label>
              <Select value={editLocation} onValueChange={setEditLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o local" />
                </SelectTrigger>
                <SelectContent>
                  {bodyLocations.map((loc) => (
                    <SelectItem key={loc.value} value={loc.value}>
                      {loc.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Observações</Label>
              <Textarea
                id="edit-notes"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setEditingInjectable(null)}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-95" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir aplicação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A aplicação será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </div>
  );
}
