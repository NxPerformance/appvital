import { useState, useEffect } from 'react';
import { ArrowLeft, Footprints, Clock, Flame, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning';
import { UnsavedChangesDialog } from '@/components/UnsavedChangesDialog';
import { useWorkoutDraft } from '@/hooks/useWorkoutDraft';
import { handleIntegerKeyDown } from '@/lib/inputValidation';

interface RunningDraft {
  durationHours: number;
  durationMin: number;
  durationSec: number;
  distanceKm: string;
  calories: number | '';
  notes: string;
}

const getDayOfWeek = (date: Date): string => {
  const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  return days[date.getDay()];
};

const formatDate = (date: Date): string => {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
};

export default function CardioRunning() {
  const { user } = useAuth();
  const today = new Date();

  const [durationHours, setDurationHours] = useState<number>(0);
  const [durationMin, setDurationMin] = useState<number>(0);
  const [durationSec, setDurationSec] = useState<number>(0);
  const [distanceKm, setDistanceKm] = useState<string>('');
  const [calories, setCalories] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);

  const { saveDraft, loadDraft, clearDraft } = useWorkoutDraft<RunningDraft>('corrida');

  // Check if there are unsaved changes
  const hasUnsavedChanges = !!(durationHours || durationMin || durationSec || distanceKm || calories || notes.trim());

  const { isBlocked, proceed, reset } = useUnsavedChangesWarning({
    hasUnsavedChanges
  });

  // Load draft on mount
  useEffect(() => {
    const draft = loadDraft();
    if (draft) {
      setDurationHours(draft.durationHours || 0);
      setDurationMin(draft.durationMin || 0);
      setDurationSec(draft.durationSec || 0);
      setDistanceKm(draft.distanceKm || '');
      setCalories(draft.calories ?? '');
      setNotes(draft.notes || '');
      toast.info('Rascunho recuperado automaticamente');
    }
    setDraftLoaded(true);
  }, [loadDraft]);

  // Auto-save draft on changes
  useEffect(() => {
    if (!draftLoaded) return;
    if (hasUnsavedChanges) {
      saveDraft({ durationHours, durationMin, durationSec, distanceKm, calories, notes });
    }
  }, [durationHours, durationMin, durationSec, distanceKm, calories, notes, hasUnsavedChanges, draftLoaded, saveDraft]);

  const handleSave = async () => {
    if (!user) {
      toast.error('Você precisa estar logado');
      return false;
    }

    // Calculate total minutes (with decimals for seconds)
    const totalMinutes = durationHours * 60 + durationMin + durationSec / 60;

    if (!totalMinutes && !distanceKm) {
      toast.error('Informe pelo menos a duração ou distância');
      return false;
    }

    setSaving(true);
    try {
      const distance = distanceKm ? parseFloat(distanceKm.replace(',', '.')) : null;
      
      await api.post('/workouts/cardio', {
        date: today.toISOString().split('T')[0],
        workout_type: 'corrida',
        duration_min: totalMinutes > 0 ? Math.round(totalMinutes * 100) / 100 : null,
        distance_km: distance,
        calories: calories || null,
        notes: notes.trim() || null
      });

      toast.success('Atividade salva com sucesso!');
      clearDraft();
      setDurationHours(0);
      setDurationMin(0);
      setDurationSec(0);
      setDistanceKm('');
      setCalories('');
      setNotes('');
      return true;
    } catch (error: any) {
      const message = error.message || '';
      if (message.includes('Load Failed') || message.includes('NetworkError') || message.includes('fetch') || message.includes('network')) {
        toast.error('Erro de conexão. Dados salvos localmente. Tente novamente.');
      } else {
        toast.error('Erro ao salvar: ' + message);
      }
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndNavigate = async () => {
    const success = await handleSave();
    if (success) {
      proceed();
    }
  };

  return (
    <div className="p-4 pb-24 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/workouts" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center">
            <Footprints className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Corrida</h1>
            <p className="text-muted-foreground text-sm">
              {getDayOfWeek(today)}, {formatDate(today)}
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="bg-card rounded-xl p-4 space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-accent" />
            <Label className="text-sm">Duração</Label>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Horas</Label>
              <Input
                type="number"
                min="0"
                max="23"
                value={durationHours || ''}
                onKeyDown={(e) => {
                  if (['e', 'E', '+', '-', '.', ','].includes(e.key)) {
                    e.preventDefault();
                  }
                }}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  setDurationHours(Math.max(0, Math.min(23, parseInt(value) || 0)));
                }}
                className="bg-background border-border text-center"
                placeholder="0"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Minutos</Label>
              <Input
                type="number"
                min="0"
                max="59"
                value={durationMin || ''}
                onKeyDown={(e) => {
                  if (['e', 'E', '+', '-', '.', ','].includes(e.key)) {
                    e.preventDefault();
                  }
                }}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  setDurationMin(Math.max(0, Math.min(59, parseInt(value) || 0)));
                }}
                className="bg-background border-border text-center"
                placeholder="0"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Segundos</Label>
              <Input
                type="number"
                min="0"
                max="59"
                value={durationSec || ''}
                onKeyDown={(e) => {
                  if (['e', 'E', '+', '-', '.', ','].includes(e.key)) {
                    e.preventDefault();
                  }
                }}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  setDurationSec(Math.max(0, Math.min(59, parseInt(value) || 0)));
                }}
                className="bg-background border-border text-center"
                placeholder="0"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-accent" />
            <Label className="text-sm">Distância (km)</Label>
          </div>
          <Input
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            value={distanceKm}
            onChange={(e) => setDistanceKm(e.target.value.replace(/[^0-9,]/g, ''))}
            className="bg-background border-border"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-accent" />
            <Label className="text-sm">Calorias</Label>
          </div>
          <Input
            type="text"
            inputMode="numeric"
            placeholder="0"
            maxLength={5}
            value={calories}
            onKeyDown={handleIntegerKeyDown}
            onChange={(e) => {
              const value = e.target.value.replace(/[^0-9]/g, '');
              setCalories(value ? Number(value) : '');
            }}
            className="bg-background border-border"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm">Observações</Label>
          <Textarea
            placeholder="Como foi sua atividade?"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="bg-background border-border min-h-[80px]"
          />
        </div>
      </div>

      {/* Save Button */}
      <Button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-accent text-accent-foreground hover:bg-accent/90 py-6 text-lg font-semibold"
      >
        {saving ? 'Salvando...' : 'Salvar Atividade'}
      </Button>

      {/* Unsaved Changes Dialog */}
      <UnsavedChangesDialog
        open={isBlocked}
        onDiscard={proceed}
        onSave={handleSaveAndNavigate}
        onContinue={reset}
        saving={saving}
      />
    </div>
  );
}
