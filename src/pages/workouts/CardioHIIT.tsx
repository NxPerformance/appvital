import { useState, useEffect } from 'react';
import { ArrowLeft, Zap, Clock, Flame, Pause } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { TabataTimer, TabataConfig } from '@/components/TabataTimer';
import { EMOMTimer } from '@/components/EMOMTimer';
import { AMRAPTimer } from '@/components/AMRAPTimer';
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning';
import { UnsavedChangesDialog } from '@/components/UnsavedChangesDialog';
import { useWorkoutDraft } from '@/hooks/useWorkoutDraft';
import { handleIntegerKeyDown } from '@/lib/inputValidation';

interface HIITDraft {
  hiitType: string;
  durationSec: number | '';
  restSec: number | '';
  calories: number | '';
  notes: string;
  completedRounds: number;
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

const hiitTypes = [
  { value: 'tabata', label: 'Tabata', description: '20s trabalho / 10s descanso' },
  { value: 'emom', label: 'EMOM', description: 'Every Minute On the Minute' },
  { value: 'amrap', label: 'AMRAP', description: 'As Many Rounds As Possible' },
];

export default function CardioHIIT() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const today = new Date();

  const [hiitType, setHiitType] = useState<string>('');
  const [durationSec, setDurationSec] = useState<number | ''>('');
  const [restSec, setRestSec] = useState<number | ''>('');
  const [calories, setCalories] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [completedRounds, setCompletedRounds] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [pendingHiitType, setPendingHiitType] = useState<string | null>(null);
  const [showTypeChangeDialog, setShowTypeChangeDialog] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);

  const { saveDraft, loadDraft, clearDraft } = useWorkoutDraft<HIITDraft>('hiit');

  // Check if there are unsaved changes (only real workout data, not just type selection)
  const hasUnsavedChanges = !!(durationSec || calories || notes.trim() || isTimerActive);

  const { isBlocked, proceed, reset } = useUnsavedChangesWarning({
    hasUnsavedChanges
  });

  // Load draft on mount
  useEffect(() => {
    const draft = loadDraft();
    if (draft) {
      setHiitType(draft.hiitType || '');
      setDurationSec(draft.durationSec ?? '');
      setRestSec(draft.restSec ?? '');
      setCalories(draft.calories ?? '');
      setNotes(draft.notes || '');
      setCompletedRounds(draft.completedRounds || 0);
      if (draft.hiitType || draft.durationSec || draft.calories || draft.notes) {
        toast.info('Rascunho recuperado automaticamente');
      }
    }
    setDraftLoaded(true);
  }, [loadDraft]);

  // Auto-save draft on changes (only when not timer active)
  useEffect(() => {
    if (!draftLoaded) return;
    if (!isTimerActive && (hiitType || durationSec || calories || notes.trim())) {
      saveDraft({ hiitType, durationSec, restSec, calories, notes, completedRounds });
    }
  }, [hiitType, durationSec, restSec, calories, notes, completedRounds, isTimerActive, draftLoaded, saveDraft]);

  // Format seconds to display string
  const formatTime = (totalSec: number | '') => {
    if (totalSec === '' || totalSec === 0) return null;
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    if (min === 0) return `${sec} segundos`;
    if (sec === 0) return `${min} ${min === 1 ? 'minuto' : 'minutos'}`;
    return `${min} ${min === 1 ? 'minuto' : 'minutos'} ${sec} segundos`;
  };

  const handleTabataComplete = (totalSeconds: number, config: TabataConfig) => {
    setDurationSec(totalSeconds);
    // Total rest: each round except last has rest period
    const totalRestSeconds = (config.rounds - 1) * config.restTime;
    setRestSec(totalRestSeconds);
    setCompletedRounds(config.rounds);
    toast.success('Tabata completo! 🎉');
  };

  const handleTabataEarlyEnd = (totalSeconds: number, currentRound: number, config: TabataConfig) => {
    setDurationSec(totalSeconds);
    // Rest based on completed rounds
    const completedRestRounds = Math.max(0, currentRound - 1);
    const totalRestSeconds = completedRestRounds * config.restTime;
    setRestSec(totalRestSeconds);
    setCompletedRounds(currentRound);
    toast.info('Treino encerrado');
  };

  const handleEMOMComplete = (totalSeconds: number, rounds: number) => {
    setDurationSec(totalSeconds);
    // EMOM: rest time is the remaining time in each minute after completing work
    // Since we don't track work time specifically, leave rest as 0
    setRestSec(0);
    setCompletedRounds(rounds);
    toast.success('EMOM completo! 💪');
  };

  const handleEMOMEarlyEnd = (totalSeconds: number, rounds: number) => {
    setDurationSec(totalSeconds);
    setRestSec(0);
    setCompletedRounds(rounds);
    toast.info('Treino encerrado');
  };

  const handleAMRAPComplete = (totalSeconds: number, rounds: number) => {
    setDurationSec(totalSeconds);
    // AMRAP doesn't have fixed rest periods
    setRestSec(0);
    setCompletedRounds(rounds);
    toast.success('AMRAP completo! 🎯');
  };

  const handleAMRAPEarlyEnd = (totalSeconds: number, rounds: number) => {
    setDurationSec(totalSeconds);
    setRestSec(0);
    setCompletedRounds(rounds);
    toast.info('Treino encerrado');
  };

  // Handle HIIT type change with confirmation if timer is active
  const handleHiitTypeChange = (newType: string) => {
    if (isTimerActive && newType !== hiitType) {
      setPendingHiitType(newType);
      setShowTypeChangeDialog(true);
      return;
    }
    setHiitType(newType);
  };

  const confirmTypeChange = () => {
    if (pendingHiitType) {
      setHiitType(pendingHiitType);
      setIsTimerActive(false);
      setPendingHiitType(null);
      setShowTypeChangeDialog(false);
      // Clear previous workout data
      setDurationSec('');
      setRestSec('');
      setCompletedRounds(0);
    }
  };

  const cancelTypeChange = () => {
    setPendingHiitType(null);
    setShowTypeChangeDialog(false);
  };

  const handleSave = async () => {
    if (!user) {
      toast.error('Você precisa estar logado');
      return;
    }

    if (!hiitType) {
      toast.error('Selecione o tipo de treino HIIT');
      return;
    }

    if (!durationSec && durationSec !== 0) {
      toast.error('Informe a duração do treino');
      return;
    }

    setSaving(true);
    try {
      // Convert seconds to minutes (round up for storage)
      const durationMinutes = Math.ceil((durationSec || 0) / 60);
      
      const notesText = hiitType.toUpperCase() + 
        (completedRounds > 0 ? ` (${completedRounds} rounds)` : '') +
        (notes.trim() ? ` - ${notes.trim()}` : '');

      await api.post('/workouts/cardio', {
        date: today.toISOString().split('T')[0],
        workout_type: 'hiit',
        duration_min: durationMinutes,
        calories: calories || null,
        notes: notesText
      });

      toast.success('Treino HIIT salvo com sucesso!');
      clearDraft();
      setHiitType('');
      setDurationSec('');
      setRestSec('');
      setCalories('');
      setNotes('');
      setCompletedRounds(0);
      
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

  const selectedHiitType = hiitTypes.find(t => t.value === hiitType);

  return (
    <div className="p-4 pb-24 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/workouts" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center">
            <Zap className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">HIIT</h1>
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
            <Zap className="w-4 h-4 text-accent" />
            <Label className="text-sm">Tipo de Treino</Label>
          </div>
          <Select value={hiitType} onValueChange={handleHiitTypeChange}>
            <SelectTrigger className="bg-background border-border">
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              {hiitTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedHiitType && (
            <p className="text-xs text-muted-foreground">{selectedHiitType.description}</p>
          )}
        </div>

        {/* Tabata Timer */}
        {hiitType === 'tabata' && (
          <TabataTimer 
            onComplete={handleTabataComplete} 
            onEarlyEnd={handleTabataEarlyEnd}
            onTimerStateChange={setIsTimerActive}
          />
        )}

        {/* EMOM Timer */}
        {hiitType === 'emom' && (
          <EMOMTimer
            minutesPerRound={1}
            defaultRounds={10}
            onComplete={handleEMOMComplete}
            onEarlyEnd={handleEMOMEarlyEnd}
            onTimerStateChange={setIsTimerActive}
          />
        )}

        {/* AMRAP Timer */}
        {hiitType === 'amrap' && (
          <AMRAPTimer
            defaultMinutes={10}
            onComplete={handleAMRAPComplete}
            onEarlyEnd={handleAMRAPEarlyEnd}
            onTimerStateChange={setIsTimerActive}
          />
        )}

        {/* Campos aparecem apenas quando um tipo é selecionado */}
        {hiitType && (
          <>
            {/* Duração Total - Somente leitura */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-accent" />
                <Label className="text-sm">Duração Total</Label>
              </div>
              <div className="bg-background border border-border rounded-md p-3 text-lg font-medium">
                {formatTime(durationSec) || (
                  <span className="text-muted-foreground text-base font-normal">
                    Complete o treino ou encerre para registrar
                  </span>
                )}
              </div>
            </div>

            {/* Tempo de Descanso - Somente leitura, apenas para Tabata */}
            {hiitType === 'tabata' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Pause className="w-4 h-4 text-green-500" />
                  <Label className="text-sm">Tempo de Descanso</Label>
                </div>
                <div className="bg-background border border-border rounded-md p-3 text-lg font-medium">
                  {formatTime(restSec) || (
                    <span className="text-muted-foreground text-base font-normal">
                      Complete o treino ou encerre para registrar
                    </span>
                  )}
                </div>
              </div>
            )}

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
                placeholder="Exercícios realizados, rounds completados..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="bg-background border-border min-h-[80px]"
              />
            </div>
          </>
        )}
      </div>

      {/* Save Button - apenas quando tipo selecionado */}
      {hiitType && (
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-accent text-accent-foreground hover:bg-accent/90 py-6 text-lg font-semibold"
        >
          {saving ? 'Salvando...' : 'Salvar Treino'}
        </Button>
      )}

      {/* Unsaved Changes Dialog */}
      <UnsavedChangesDialog
        open={isBlocked}
        onDiscard={proceed}
        onSave={handleSaveAndNavigate}
        onContinue={reset}
        saving={saving}
      />

      {/* Type Change Confirmation Dialog */}
      <AlertDialog open={showTypeChangeDialog} onOpenChange={setShowTypeChangeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Treino em andamento</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem um treino {hiitType.toUpperCase()} em andamento. 
              Se mudar agora, perderá o progresso atual.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelTypeChange}>
              Continuar treino
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmTypeChange}>
              Descartar e mudar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
