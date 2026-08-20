import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Plus, Minus, Volume2, VolumeX, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

interface AMRAPTimerProps {
  defaultMinutes?: number;
  onComplete?: (totalSeconds: number, rounds: number) => void;
  onEarlyEnd?: (totalSeconds: number, rounds: number) => void;
  onTimerStateChange?: (isActive: boolean) => void;
}

export const AMRAPTimer = ({ 
  defaultMinutes = 10,
  onComplete,
  onEarlyEnd,
  onTimerStateChange
}: AMRAPTimerProps) => {
  const [targetMinutes, setTargetMinutes] = useState(defaultMinutes);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [rounds, setRounds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdownValue, setCountdownValue] = useState(3);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const targetSeconds = targetMinutes * 60;

  const initAudio = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }, []);

  const playBeep = useCallback((frequency: number, duration: number, type: 'round' | 'warning' | 'complete' = 'round') => {
    if (!soundEnabled || !audioContextRef.current) return;
    
    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);

    if (type === 'complete') {
      // Play victory sound sequence
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.frequency.value = 880;
        osc2.type = 'sine';
        gain2.gain.setValueAtTime(0.3, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc2.start(ctx.currentTime);
        osc2.stop(ctx.currentTime + 0.3);
      }, 150);
      setTimeout(() => {
        const osc3 = ctx.createOscillator();
        const gain3 = ctx.createGain();
        osc3.connect(gain3);
        gain3.connect(ctx.destination);
        osc3.frequency.value = 1046;
        osc3.type = 'sine';
        gain3.gain.setValueAtTime(0.3, ctx.currentTime);
        gain3.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc3.start(ctx.currentTime);
        osc3.stop(ctx.currentTime + 0.5);
      }, 300);
    }
  }, [soundEnabled]);

  useEffect(() => {
    if (isRunning && !isComplete) {
      intervalRef.current = setInterval(() => {
        setTimeElapsed(prev => {
          const newTime = prev + 1;
          
          // Warning beeps at 30, 10, 5 seconds remaining
          const remaining = targetSeconds - newTime;
          if (remaining === 30 || remaining === 10) {
            playBeep(440, 0.2, 'warning');
          }
          if (remaining <= 5 && remaining > 0) {
            playBeep(660, 0.15, 'warning');
          }
          
          // Time's up
          if (newTime >= targetSeconds) {
            setIsRunning(false);
            setIsComplete(true);
            playBeep(523, 0.4, 'complete');
            onTimerStateChange?.(false);
            onComplete?.(newTime, rounds);
            return targetSeconds;
          }
          
          return newTime;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, isComplete, targetSeconds, rounds, onComplete, onTimerStateChange, playBeep]);

  const startCountdown = () => {
    initAudio();
    setIsCountingDown(true);
    setCountdownValue(3);
    onTimerStateChange?.(true);
    
    let count = 3;
    const countdownInterval = setInterval(() => {
      count--;
      if (count > 0) {
        setCountdownValue(count);
        playBeep(660, 0.15, 'round');
      } else if (count === 0) {
        setCountdownValue(0);
        playBeep(880, 0.2, 'round');
      } else {
        clearInterval(countdownInterval);
        setIsCountingDown(false);
        setIsRunning(true);
      }
    }, 1000);
  };

  const handleStart = () => {
    initAudio();
    if (timeElapsed === 0 && !isRunning) {
      startCountdown();
      return;
    }
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeElapsed(0);
    setRounds(0);
    setIsComplete(false);
    onTimerStateChange?.(false);
  };

  const handleEndWorkout = () => {
    setIsRunning(false);
    setShowEndConfirm(true);
  };

  const confirmEndWorkout = () => {
    setIsRunning(false);
    setShowEndConfirm(false);
    
    if (onEarlyEnd) {
      onEarlyEnd(timeElapsed, rounds);
    }
    
    // Reset
    setTimeElapsed(0);
    setRounds(0);
    setIsComplete(false);
    onTimerStateChange?.(false);
  };

  const handleAddRound = () => {
    const newRounds = rounds + 1;
    setRounds(newRounds);
    playBeep(880, 0.15, 'round');
  };

  const handleRemoveRound = () => {
    if (rounds > 0) {
      setRounds(rounds - 1);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = (timeElapsed / targetSeconds) * 100;
  const timeRemaining = targetSeconds - timeElapsed;
  const showEndButton = isRunning || (timeElapsed > 0 && !isComplete);

  return (
    <div className="bg-card rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          Cronômetro AMRAP
        </h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="h-8 w-8"
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </Button>
      </div>

      {/* Time Target Config - Centralizado igual EMOM */}
      {!isRunning && timeElapsed === 0 && !isCountingDown && (
        <div className="flex items-center justify-center gap-4 py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTargetMinutes(m => Math.max(1, m - 1))}
            disabled={targetMinutes <= 1}
            className="h-10 w-10 rounded-full"
          >
            <Minus className="w-4 h-4" />
          </Button>
          <div className="text-center min-w-[80px]">
            <div className="text-3xl font-bold">{targetMinutes}</div>
            <div className="text-xs text-muted-foreground">minutos</div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTargetMinutes(m => Math.min(60, m + 1))}
            disabled={targetMinutes >= 60}
            className="h-10 w-10 rounded-full"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Timer Display */}
      <div className="text-center space-y-2">
        {!isRunning && !isComplete && timeElapsed === 0 && !isCountingDown ? (
          <>
            <div className="text-xl font-bold mb-4 text-muted-foreground">Pronto?</div>
            <button
              type="button"
              onClick={startCountdown}
              className="text-7xl transition-all duration-300 hover:scale-110 active:scale-95"
            >
              🖐️
            </button>
            <div className="text-sm text-muted-foreground mt-4">
              Toque aqui para iniciar
            </div>
          </>
        ) : isCountingDown ? (
          <>
            <div className="text-lg font-bold mb-2 text-accent">PREPARAR...</div>
            <div className="text-8xl font-mono font-bold text-accent animate-bounce">
              {countdownValue > 0 ? countdownValue : 'VAI!'}
            </div>
          </>
        ) : (
          <>
            <div className="text-5xl font-mono font-bold text-foreground">
              {formatTime(timeElapsed)}
            </div>
            <div className="text-sm text-muted-foreground">
              Restante: {formatTime(timeRemaining)}
            </div>
          </>
        )}
      </div>

      {/* Progress Bar */}
      <div className="h-3 bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full bg-accent transition-all duration-1000 ease-linear"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>

      {/* Rounds Counter */}
      <div className="flex items-center justify-center gap-4 py-4">
        <Button
          variant="outline"
          size="icon"
          onClick={handleRemoveRound}
          disabled={rounds === 0 || isComplete}
          className="h-12 w-12 rounded-full"
        >
          <Minus className="w-5 h-5" />
        </Button>
        
        <div className="text-center min-w-[100px]">
          <div className="text-4xl font-bold text-accent">{rounds}</div>
          <div className="text-sm text-muted-foreground">rounds</div>
        </div>
        
        <Button
          variant="outline"
          size="icon"
          onClick={handleAddRound}
          disabled={isComplete}
          className="h-12 w-12 rounded-full bg-accent/20 border-accent hover:bg-accent/30"
        >
          <Plus className="w-5 h-5 text-accent" />
        </Button>
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-3">
        {(!isRunning && !isComplete && timeElapsed === 0) || isCountingDown ? null : !isRunning && !isComplete ? (
          <Button
            onClick={handleStart}
            className="bg-accent text-accent-foreground hover:bg-accent/90 px-8"
          >
            <Play className="w-5 h-5 mr-2" />
            Continuar
          </Button>
        ) : !isComplete ? (
          <Button
            onClick={handlePause}
            variant="outline"
            className="px-8"
          >
            <Pause className="w-5 h-5 mr-2" />
            Pausar
          </Button>
        ) : null}
        
        {showEndButton && !isComplete && (
          <Button
            variant="destructive"
            onClick={handleEndWorkout}
            className="px-6"
          >
            <Square className="w-5 h-5 mr-2" />
            Encerrar
          </Button>
        )}
        
        {(timeElapsed > 0 || isComplete) && (
          <Button
            onClick={handleReset}
            variant="outline"
            className="px-6 py-6 border-border"
          >
            <RotateCcw className="w-5 h-5" />
          </Button>
        )}
      </div>

      {/* Completion Message */}
      {isComplete && (
        <div className="text-center py-2 bg-accent/20 rounded-lg">
          <p className="font-semibold text-accent">Tempo esgotado! 🎯</p>
          <p className="text-sm text-muted-foreground">
            Você completou {rounds} round{rounds !== 1 ? 's' : ''} em {targetMinutes} minutos
          </p>
        </div>
      )}

      {/* Info */}
      <p className="text-xs text-muted-foreground text-center">
        Toque no + para registrar cada round completado
      </p>

      {/* End Workout Confirmation Dialog */}
      <AlertDialog open={showEndConfirm} onOpenChange={setShowEndConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Encerrar treino?</AlertDialogTitle>
            <AlertDialogDescription>
              Você completou {rounds} round{rounds !== 1 ? 's' : ''} em {formatTime(timeElapsed)}. 
              Tem certeza que deseja encerrar o treino agora?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowEndConfirm(false);
              setIsRunning(true);
            }}>
              Não, continuar
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmEndWorkout}>
              Sim, encerrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
