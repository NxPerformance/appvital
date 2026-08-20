import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Plus, Minus, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
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

interface EMOMTimerProps {
  minutesPerRound?: number;
  defaultRounds?: number;
  onComplete?: (totalTime: number, roundsCompleted: number) => void;
  onEarlyEnd?: (totalTime: number, roundsCompleted: number) => void;
  onTimerStateChange?: (isActive: boolean) => void;
}

type Phase = 'idle' | 'countdown' | 'running' | 'complete';

export function EMOMTimer({
  minutesPerRound = 1,
  defaultRounds = 10,
  onComplete,
  onEarlyEnd,
  onTimerStateChange
}: EMOMTimerProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [totalRounds, setTotalRounds] = useState(defaultRounds);
  const [currentRound, setCurrentRound] = useState(1);
  const [timeLeft, setTimeLeft] = useState(minutesPerRound * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [totalElapsed, setTotalElapsed] = useState(0);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [countdownValue, setCountdownValue] = useState(3);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const secondsPerRound = minutesPerRound * 60;

  // Initialize audio context
  const initAudio = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  // Play beep sound
  const playBeep = useCallback((frequency: number, duration: number) => {
    if (!soundEnabled) return;
    
    try {
      const ctx = initAudio();
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
    } catch (e) {
      console.log('Audio not available');
    }
  }, [soundEnabled, initAudio]);

  // Play start round sound (3 beeps)
  const playStartRound = useCallback(() => {
    playBeep(880, 0.15);
    setTimeout(() => playBeep(880, 0.15), 150);
    setTimeout(() => playBeep(1100, 0.25), 300);
  }, [playBeep]);

  // Play complete sound
  const playComplete = useCallback(() => {
    playBeep(660, 0.2);
    setTimeout(() => playBeep(880, 0.2), 200);
    setTimeout(() => playBeep(1100, 0.3), 400);
  }, [playBeep]);

  // Handle timer logic
  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        // Countdown beeps for last 3 seconds
        if (prev <= 4 && prev > 1) {
          playBeep(440, 0.1);
        }

        if (prev <= 1) {
          if (currentRound >= totalRounds) {
            // Workout complete
            setPhase('complete');
            setIsRunning(false);
            playComplete();
            onTimerStateChange?.(false);
            if (onComplete) {
              onComplete(totalElapsed + 1, totalRounds);
            }
            return 0;
          } else {
            // Next round
            setCurrentRound((r) => r + 1);
            playStartRound();
            return secondsPerRound;
          }
        }
        
        setTotalElapsed((t) => t + 1);
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, currentRound, totalRounds, secondsPerRound, playBeep, playStartRound, playComplete, onComplete, onTimerStateChange, totalElapsed]);

  const startCountdown = () => {
    initAudio();
    setPhase('countdown');
    setCountdownValue(3);
    onTimerStateChange?.(true);
    
    let count = 3;
    const countdownInterval = setInterval(() => {
      count--;
      if (count > 0) {
        setCountdownValue(count);
        playBeep(660, 0.15);
      } else if (count === 0) {
        setCountdownValue(0);
        playBeep(880, 0.2);
      } else {
        clearInterval(countdownInterval);
        setPhase('running');
        setCurrentRound(1);
        setTimeLeft(secondsPerRound);
        setTotalElapsed(0);
        setIsRunning(true);
      }
    }, 1000);
  };

  const handleStart = () => {
    initAudio();
    if (phase === 'idle' || phase === 'complete') {
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
    setPhase('idle');
    setCurrentRound(1);
    setTimeLeft(secondsPerRound);
    setTotalElapsed(0);
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
      onEarlyEnd(totalElapsed, currentRound - 1);
    }
    
    // Reset to idle
    setPhase('idle');
    setCurrentRound(1);
    setTimeLeft(secondsPerRound);
    setTotalElapsed(0);
    onTimerStateChange?.(false);
  };

  const adjustRounds = (delta: number) => {
    if (phase !== 'idle') return;
    setTotalRounds((prev) => Math.max(1, Math.min(30, prev + delta)));
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((secondsPerRound - timeLeft) / secondsPerRound) * 100;
  const totalProgress = ((currentRound - 1 + progress / 100) / totalRounds) * 100;
  const showEndButton = phase === 'running';

  return (
    <div className="bg-card rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          ⏱️ Cronômetro EMOM
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="text-muted-foreground"
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </Button>
      </div>

      {/* Rounds Selector */}
      {phase === 'idle' && (
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => adjustRounds(-1)}
            disabled={totalRounds <= 1}
            className="border-border"
          >
            <Minus className="w-4 h-4" />
          </Button>
          <div className="text-center">
            <div className="text-3xl font-bold">{totalRounds}</div>
            <div className="text-xs text-muted-foreground">rounds</div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => adjustRounds(1)}
            disabled={totalRounds >= 30}
            className="border-border"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Timer Display */}
      <div className="text-center py-4">
        {phase === 'idle' ? (
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
        ) : phase === 'countdown' ? (
          <>
            <div className="text-lg font-bold mb-2 text-accent">PREPARAR...</div>
            <div className="text-8xl font-mono font-bold text-accent animate-bounce">
              {countdownValue > 0 ? countdownValue : 'VAI!'}
            </div>
          </>
        ) : (
          <>
            <div className={cn(
              "text-lg font-bold mb-2",
              phase === 'complete' ? "text-accent" : "text-primary"
            )}>
              {phase === 'complete' ? 'COMPLETO!' : 'A CADA MINUTO'}
            </div>
            <div className={cn(
              "text-6xl font-mono font-bold tabular-nums",
              timeLeft <= 10 && phase === 'running' ? "text-red-500" : "text-foreground"
            )}>
              {formatTime(timeLeft)}
            </div>
            <div className="text-muted-foreground mt-2 text-lg">
              Round <span className="font-bold text-foreground">{currentRound}</span> / {totalRounds}
            </div>
          </>
        )}
      </div>

      {/* Current Round Progress */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Progresso do round</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className={cn(
              "h-full transition-all duration-1000 ease-linear",
              timeLeft <= 10 ? "bg-red-500" : "bg-accent"
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Total Progress */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Progresso total</span>
          <span>{Math.round(totalProgress)}%</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-accent/60 transition-all duration-1000 ease-linear"
            style={{ width: `${totalProgress}%` }}
          />
        </div>
      </div>

      {/* Round Indicators */}
      <div className="flex justify-center flex-wrap gap-1.5">
        {Array.from({ length: totalRounds }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "w-3 h-3 rounded-full transition-colors",
              i + 1 < currentRound 
                ? "bg-accent" 
                : i + 1 === currentRound 
                  ? timeLeft <= 10 ? "bg-red-500" : "bg-accent animate-pulse"
                  : "bg-muted"
            )}
          />
        ))}
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-3">
        {phase === 'idle' || phase === 'countdown' ? null : !isRunning ? (
          <Button
            onClick={handleStart}
            className={cn(
              "px-8 py-6 text-lg font-semibold",
              phase === 'complete' 
                ? "bg-accent text-accent-foreground hover:bg-accent/90"
                : "bg-green-600 text-white hover:bg-green-700"
            )}
          >
            <Play className="w-5 h-5 mr-2" />
            {phase === 'complete' ? 'Reiniciar' : 'Continuar'}
          </Button>
        ) : (
          <Button
            onClick={handlePause}
            className="px-8 py-6 text-lg font-semibold bg-yellow-600 text-white hover:bg-yellow-700"
          >
            <Pause className="w-5 h-5 mr-2" />
            Pausar
          </Button>
        )}
        
        {showEndButton && (
          <Button
            variant="destructive"
            onClick={handleEndWorkout}
            className="px-6 py-6"
          >
            <Square className="w-5 h-5 mr-2" />
            Encerrar
          </Button>
        )}
        
        <Button
          variant="outline"
          onClick={handleReset}
          className="px-6 py-6 border-border"
        >
          <RotateCcw className="w-5 h-5" />
        </Button>
      </div>

      {/* Info */}
      <p className="text-center text-xs text-muted-foreground">
        Execute o exercício no início de cada minuto e descanse pelo tempo restante
      </p>

      {/* End Workout Confirmation Dialog */}
      <AlertDialog open={showEndConfirm} onOpenChange={setShowEndConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Encerrar treino?</AlertDialogTitle>
            <AlertDialogDescription>
              Você completou {currentRound - 1} de {totalRounds} rounds. 
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
}
