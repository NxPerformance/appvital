import { useState, useEffect } from 'react';
import { ArrowLeft, Clock, MapPin, Flame, FileText, Activity } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning';
import { UnsavedChangesDialog } from '@/components/UnsavedChangesDialog';
import { useWorkoutDraft } from '@/hooks/useWorkoutDraft';
import { handleIntegerKeyDown } from '@/lib/inputValidation';

interface OtherCardioDraft {
  activityName: string;
  hours: number;
  minutes: number;
  seconds: number;
  distance: string;
  calories: string;
  notes: string;
}

const getDayOfWeek = (date: Date): string => {
  const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  return days[date.getDay()];
};

const formatDate = (date: Date): string => {
  const day = date.getDate();
  const month = date.toLocaleDateString('pt-BR', { month: 'long' });
  const year = date.getFullYear();
  return `${day} de ${month} de ${year}`;
};

export default function CardioOther() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const today = new Date();

  const [activityName, setActivityName] = useState('');
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [distance, setDistance] = useState('');
  const [calories, setCalories] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);

  const { saveDraft, loadDraft, clearDraft } = useWorkoutDraft<OtherCardioDraft>('outros');

  const hasUnsavedChanges = activityName !== '' || hours > 0 || minutes > 0 || seconds > 0 || 
                            distance !== '' || calories !== '' || notes !== '';

  const { isBlocked, proceed, reset } = useUnsavedChangesWarning({ hasUnsavedChanges });

  // Load draft on mount
  useEffect(() => {
    const draft = loadDraft();
    if (draft) {
      setActivityName(draft.activityName || '');
      setHours(draft.hours || 0);
      setMinutes(draft.minutes || 0);
      setSeconds(draft.seconds || 0);
      setDistance(draft.distance || '');
      setCalories(draft.calories || '');
      setNotes(draft.notes || '');
      toast.info('Rascunho recuperado automaticamente');
    }
    setDraftLoaded(true);
  }, [loadDraft]);

  // Auto-save draft on changes
  useEffect(() => {
    if (!draftLoaded) return;
    if (hasUnsavedChanges) {
      saveDraft({ activityName, hours, minutes, seconds, distance, calories, notes });
    }
  }, [activityName, hours, minutes, seconds, distance, calories, notes, hasUnsavedChanges, draftLoaded, saveDraft]);

  const handleSave = async (): Promise<boolean> => {
    if (!user) {
      toast.error('Você precisa estar logado');
      return false;
    }

    if (!activityName.trim()) {
      toast.error('Informe o nome da atividade');
      return false;
    }

    const totalMinutes = hours * 60 + minutes + seconds / 60;
    if (totalMinutes <= 0) {
      toast.error('Informe a duração da atividade');
      return false;
    }

    setIsSaving(true);

    try {
      await api.post('/workouts/cardio', {
        workout_type: activityName.trim(),
        duration_min: totalMinutes,
        distance_km: distance ? parseFloat(distance.replace(',', '.')) : null,
        calories: calories ? parseInt(calories) : null,
        notes: notes.trim() || null,
        date: today.toISOString().split('T')[0],
      });

      toast.success('Atividade salva com sucesso!');
      clearDraft();
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
      setIsSaving(false);
    }
  };

  const handleSaveAndGoBack = async () => {
    const success = await handleSave();
    if (success) {
      navigate('/workouts');
    }
  };

  const handleDiscardAndLeave = () => {
    proceed();
  };

  const handleSaveAndLeave = async () => {
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
        <div>
          <h1 className="text-2xl font-bold">Outras Atividades</h1>
          <p className="text-muted-foreground text-sm">
            {getDayOfWeek(today)}, {formatDate(today)}
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-card rounded-xl p-4 space-y-5">
        {/* Activity Name */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-accent" />
            Nome da Atividade *
          </Label>
          <Input
            placeholder="Ex: Natação, Boxe, Esteira, Muay Thai..."
            value={activityName}
            onChange={(e) => setActivityName(e.target.value)}
            className="bg-background"
          />
        </div>

        {/* Duration */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-accent" />
            Duração *
          </Label>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Horas</Label>
              <Input
                type="text"
                inputMode="numeric"
                maxLength={2}
                value={hours || ''}
                onKeyDown={handleIntegerKeyDown}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  setHours(Math.max(0, Math.min(23, parseInt(value) || 0)));
                }}
                className="bg-background text-center"
                placeholder="0"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Minutos</Label>
              <Input
                type="text"
                inputMode="numeric"
                maxLength={2}
                value={minutes || ''}
                onKeyDown={handleIntegerKeyDown}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  setMinutes(Math.max(0, Math.min(59, parseInt(value) || 0)));
                }}
                className="bg-background text-center"
                placeholder="0"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Segundos</Label>
              <Input
                type="text"
                inputMode="numeric"
                maxLength={2}
                value={seconds || ''}
                onKeyDown={handleIntegerKeyDown}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  setSeconds(Math.max(0, Math.min(59, parseInt(value) || 0)));
                }}
                className="bg-background text-center"
                placeholder="0"
              />
            </div>
          </div>
        </div>

        {/* Distance */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-accent" />
            Distância (km) - opcional
          </Label>
          <Input
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
            className="bg-background"
          />
        </div>

        {/* Calories */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-accent" />
            Calorias
          </Label>
          <Input
            type="text"
            inputMode="numeric"
            placeholder="0"
            maxLength={5}
            value={calories}
            onKeyDown={handleIntegerKeyDown}
            onChange={(e) => {
              const value = e.target.value.replace(/[^0-9]/g, '');
              setCalories(value);
            }}
            className="bg-background"
          />
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-accent" />
            Observações
          </Label>
          <Textarea
            placeholder="Anotações sobre a atividade..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="bg-background min-h-[80px]"
          />
        </div>
      </div>

      {/* Save Button */}
      <Button
        className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
        size="lg"
        onClick={handleSaveAndGoBack}
        disabled={isSaving}
      >
        {isSaving ? 'Salvando...' : 'Salvar Atividade'}
      </Button>

      {/* Unsaved Changes Dialog */}
      <UnsavedChangesDialog
        open={isBlocked}
        onDiscard={handleDiscardAndLeave}
        onSave={handleSaveAndLeave}
        onContinue={reset}
        saving={isSaving}
      />
    </div>
  );
}
