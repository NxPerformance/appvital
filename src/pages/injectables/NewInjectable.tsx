import { ArrowLeft, Calendar, Clock, MapPin, Pill, ShieldCheck, Syringe } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const bodyLocations = [
  { value: 'abdomen', label: 'Abdômen' },
  { value: 'coxa', label: 'Coxa' },
  { value: 'braco', label: 'Braço' },
];

const medications = [
  'Mounjaro (Tirzepatida)',
  'Ozempic (Semaglutida)',
  'Wegovy (Semaglutida)',
  'Saxenda (Liraglutida)',
  'Trizepatide (Compounded)',
  'Testosterone Cipionate',
  'Testosterone Enanthate',
  'Deposteron',
  'Durateston',
  'Oxandrolona (Compounded)',
  'Nandrolona (Deca)',
  'Boldenona',
  'Vitamin B12 (Cyanocobalamin)',
  'Vitamin D3 Injectable',
  'Complexo B',
  'Glutathione',
  'L-Carnitine Injectable',
  'Lipotropic IM',
  'Metabolic Blend IM',
  'Detox Blend IM',
];

export default function NewInjectable() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedMedication, setSelectedMedication] = useState('');
  const [customMedication, setCustomMedication] = useState('');
  const [dose, setDose] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');

  const medication = selectedMedication === 'other' ? customMedication : selectedMedication;

  const createMutation = useMutation({
    mutationFn: async () => {
      await api.post('/injectables', {
        medication,
        dose,
        date,
        time,
        location,
        notes: notes || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['injectables'] });
      toast.success('Aplicação registrada com sucesso!');
      navigate('/injectables');
    },
    onError: (error) => {
      toast.error('Erro ao salvar aplicação: ' + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!medication || !dose || !date || !time || !location) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    createMutation.mutate();
  };

  return (
    <div className="min-h-full bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--background-strong))_100%)]">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pb-28 pt-4 md:px-7 md:pb-8 md:pt-7">
        <header className="relative flex h-12 items-center justify-center md:hidden">
          <Link
            to="/injectables"
            className="absolute left-0 flex h-10 w-10 items-center justify-center rounded-full bg-card/85 text-muted-foreground shadow-elegant hover:text-foreground"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-base font-bold">Nova aplicação</h1>
        </header>

        <header className="rounded-[2rem] border border-white/5 bg-card/90 p-6 shadow-elegant">
          <div className="flex items-start gap-4">
            <Link to="/injectables" className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary/80 text-muted-foreground transition-colors hover:text-foreground md:flex">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="space-y-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <Syringe className="h-6 w-6" />
              </div>
              <h1 className="hidden text-4xl font-bold leading-tight tracking-normal md:block">Nova aplicação</h1>
              <p className="text-base leading-relaxed text-muted-foreground">Registre dose, horário e local de aplicação com segurança.</p>
            </div>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/5 bg-card/85 p-4 shadow-elegant">
            <Pill className="mb-3 h-5 w-5 text-primary" />
            <p className="truncate text-sm font-semibold">{medication || 'Medicamento'}</p>
            <p className="text-xs text-muted-foreground">Seleção atual</p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-card/85 p-4 shadow-elegant">
            <Calendar className="mb-3 h-5 w-5 text-primary" />
            <p className="truncate text-sm font-semibold">{date || '--'}</p>
            <p className="text-xs text-muted-foreground">Data</p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-card/85 p-4 shadow-elegant">
            <MapPin className="mb-3 h-5 w-5 text-primary" />
            <p className="truncate text-sm font-semibold">{bodyLocations.find((item) => item.value === location)?.label || 'Local'}</p>
            <p className="text-xs text-muted-foreground">Aplicação</p>
          </div>
        </section>

      {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4 rounded-[2rem] border border-white/5 bg-card/85 p-6 shadow-elegant">
            <div className="mb-1 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-semibold">Dados da aplicação</h2>
                <p className="text-sm text-muted-foreground">Campos com * são obrigatórios.</p>
              </div>
            </div>

          <div className="space-y-2">
            <Label htmlFor="medication">Medicamento *</Label>
            <Select value={selectedMedication} onValueChange={setSelectedMedication}>
              <SelectTrigger className="h-14 rounded-xl border-white/5 bg-secondary/70 text-base">
                <SelectValue placeholder="Selecione o medicamento" />
              </SelectTrigger>
              <SelectContent>
                {medications.map((med) => (
                  <SelectItem key={med} value={med}>
                    {med}
                  </SelectItem>
                ))}
                <SelectItem value="other">Outro (digitar manualmente)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedMedication === 'other' && (
            <div className="space-y-2">
              <Label htmlFor="customMedication">Nome do Medicamento *</Label>
              <Input
                id="customMedication"
                placeholder="Digite o nome do medicamento"
                value={customMedication}
                onChange={(e) => setCustomMedication(e.target.value)}
                className="h-14 rounded-xl border-white/5 bg-secondary/70 text-base focus-visible:ring-offset-0"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="dose">Dose *</Label>
            <Input
              id="dose"
              placeholder="Ex: 0.5ml, 100mg"
              value={dose}
              onChange={(e) => setDose(e.target.value)}
              className="h-14 rounded-xl border-white/5 bg-secondary/70 text-base focus-visible:ring-offset-0"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date" className="inline-flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Data *
              </Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-14 rounded-xl border-white/5 bg-secondary/70 text-base focus-visible:ring-offset-0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time" className="inline-flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Horário *
              </Label>
              <Input
                id="time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="h-14 rounded-xl border-white/5 bg-secondary/70 text-base focus-visible:ring-offset-0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Local de Aplicação *</Label>
            <Select value={location} onValueChange={setLocation}>
              <SelectTrigger className="h-14 rounded-xl border-white/5 bg-secondary/70 text-base">
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
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              placeholder="Notas adicionais (opcional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[120px] rounded-xl border-white/5 bg-secondary/70 text-base focus-visible:ring-offset-0"
            />
          </div>
          </div>

        <Button 
          type="submit" 
          className="h-14 w-full rounded-2xl bg-gradient-primary text-base font-bold text-primary-foreground shadow-glow hover:opacity-95"
          disabled={createMutation.isPending}
        >
          {createMutation.isPending ? 'Salvando...' : 'Salvar Aplicação'}
        </Button>
      </form>
      </div>
    </div>
  );
}
