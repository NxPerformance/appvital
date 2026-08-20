import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Plus, Minus, Settings, Square } from 'lucide-react';
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

export interface TabataConfig {
  workTime: number;
  restTime: number;
  rounds: number;
  sets: number;
}

interface TabataTimerProps {
  onComplete?: (totalTime: number, config: TabataConfig) => void;
  onEarlyEnd?: (totalTime: number, currentRound: number, config: TabataConfig, currentSet?: number) => void;
  onTimerStateChange?: (isActive: boolean) => void;
}

type Phase = 'idle' | 'countdown' | 'work' | 'rest' | 'complete';

export function TabataTimer({ onComplete, onEarlyEnd, onTimerStateChange }: TabataTimerProps) {
  // Configurable settings
  const [customWorkTime, setCustomWorkTime] = useState(20);
  const [customRestTime, setCustomRestTime] = useState(10);
  const [customRounds, setCustomRounds] = useState(8);
  const [customSets, setCustomSets] = useState(1);
  
  const [phase, setPhase] = useState<Phase>('idle');
  const [currentRound, setCurrentRound] = useState(1);
  const [currentSet, setCurrentSet] = useState(1);
  const [timeLeft, setTimeLeft] = useState(customWorkTime);
  const [isRunning, setIsRunning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [totalElapsed, setTotalElapsed] = useState(0);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [countdownValue, setCountdownValue] = useState(3);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialize audio context on first interaction
  const initAudio = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  // Play beep sound
  const playBeep = useCallback((frequency: number, duration: number, type: 'work' | 'rest' | 'complete') => {
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
      
      // Play multiple beeps for phase changes
      if (type === 'complete') {
        setTimeout(() => playBeep(880, 0.2, 'work'), 200);
        setTimeout(() => playBeep(1100, 0.3, 'work'), 400);
      }
    } catch (e) {
      console.log('Audio not available');
    }
  }, [soundEnabled, initAudio]);

  // Countdown beeps (3, 2, 1)
  const playCountdownBeep = useCallback(() => {
    if (!soundEnabled) return;
    playBeep(440, 0.1, 'work');
  }, [soundEnabled, playBeep]);

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
          playCountdownBeep();
        }

        if (prev <= 1) {
          // Time's up for current phase
          if (phase === 'work') {
            if (currentRound >= customRounds) {
              // All rounds of current set complete
              if (currentSet >= customSets) {
                // All sets complete - workout done!
                setPhase('complete');
                setIsRunning(false);
                playBeep(660, 0.3, 'complete');
                onTimerStateChange?.(false);
                if (onComplete) {
                  onComplete(totalElapsed + 1, {
                    workTime: customWorkTime,
                    restTime: customRestTime,
                    rounds: customRounds,
                    sets: customSets
                  });
                }
                return 0;
              } else {
                // Start next set immediately (no set-rest)
                setCurrentSet((s) => s + 1);
                setCurrentRound(1);
                setPhase('work');
                playBeep(660, 0.3, 'work');
                return customWorkTime;
              }
            } else {
              // Switch to rest
              setPhase('rest');
              playBeep(330, 0.3, 'rest');
              return customRestTime;
            }
          } else if (phase === 'rest') {
            // Switch to work
            setCurrentRound((r) => r + 1);
            setPhase('work');
            playBeep(660, 0.3, 'work');
            return customWorkTime;
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
  }, [isRunning, phase, currentRound, currentSet, customRounds, customSets, customWorkTime, customRestTime, playBeep, playCountdownBeep, onComplete, onTimerStateChange, totalElapsed]);

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
        playBeep(660, 0.15, 'work');
      } else if (count === 0) {
        setCountdownValue(0);
        playBeep(880, 0.2, 'work');
      } else {
        clearInterval(countdownInterval);
        setPhase('work');
        setCurrentRound(1);
        setCurrentSet(1);
        setTimeLeft(customWorkTime);
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
    setCurrentSet(1);
    setTimeLeft(customWorkTime);
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
      onEarlyEnd(totalElapsed, currentRound, {
        workTime: customWorkTime,
        restTime: customRestTime,
        rounds: customRounds,
        sets: customSets
      }, currentSet);
    }
    
    // Reset to idle
    setPhase('idle');
    setCurrentRound(1);
    setCurrentSet(1);
    setTimeLeft(customWorkTime);
    setTotalElapsed(0);
    onTimerStateChange?.(false);
  };

  // Config adjusters
  const adjustWorkTime = (delta: number) => {
    setCustomWorkTime((prev) => Math.max(5, Math.min(60, prev + delta)));
    if (phase === 'idle') {
      setTimeLeft((prev) => Math.max(5, Math.min(60, prev + delta)));
    }
  };

  const adjustRestTime = (delta: number) => {
    setCustomRestTime((prev) => Math.max(5, Math.min(30, prev + delta)));
  };

  const adjustRounds = (delta: number) => {
    setCustomRounds((prev) => Math.max(1, Math.min(20, prev + delta)));
  };

  const adjustSets = (delta: number) => {
    setCustomSets((prev) => Math.max(1, Math.min(10, prev + delta)));
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getPhaseColor = () => {
    switch (phase) {
      case 'work':
        return 'text-red-500';
      case 'rest':
        return 'text-green-500';
      case 'complete':
        return 'text-accent';
      default:
        return 'text-muted-foreground';
    }
  };

  const getPhaseLabel = () => {
    switch (phase) {
      case 'work':
        return 'TRABALHO';
      case 'rest':
        return 'DESCANSO';
      case 'complete':
        return 'COMPLETO!';
      default:
        return 'PRONTO?';
    }
  };

  const progress = phase === 'work' 
    ? ((customWorkTime - timeLeft) / customWorkTime) * 100
    : phase === 'rest'
      ? ((customRestTime - timeLeft) / customRestTime) * 100
      : 0;

  const isConfigurable = phase === 'idle';
  const showEndButton = phase === 'work' || phase === 'rest';

  // Estimated total time in seconds
  const estimatedTime = customSets * customRounds * (customWorkTime + customRestTime);

  return (
    <div className="bg-card rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          ⏱️ Cronômetro Tabata
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

      {/* Configuration Section */}
      {isConfigurable && (
        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Configurações
            </div>
            <div className="text-xs">
              ~{Math.round(estimatedTime / 60)} min
            </div>
          </div>
          
          {/* All controls in one row */}
          <div className="grid grid-cols-4 gap-2">
            {/* Work Time */}
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-2">Trabalho</div>
              <div className="flex flex-col items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => adjustWorkTime(5)}
                  disabled={customWorkTime >= 60}
                  className="h-7 w-7 p-0"
                >
                  <Plus className="w-3 h-3" />
                </Button>
                <span className="text-lg font-mono font-bold text-red-500">
                  {customWorkTime}s
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => adjustWorkTime(-5)}
                  disabled={customWorkTime <= 5}
                  className="h-7 w-7 p-0"
                >
                  <Minus className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {/* Rest Time */}
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-2">Descanso</div>
              <div className="flex flex-col items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => adjustRestTime(5)}
                  disabled={customRestTime >= 30}
                  className="h-7 w-7 p-0"
                >
                  <Plus className="w-3 h-3" />
                </Button>
                <span className="text-lg font-mono font-bold text-green-500">
                  {customRestTime}s
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => adjustRestTime(-5)}
                  disabled={customRestTime <= 5}
                  className="h-7 w-7 p-0"
                >
                  <Minus className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {/* Rounds */}
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-2">Rounds</div>
              <div className="flex flex-col items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => adjustRounds(1)}
                  disabled={customRounds >= 20}
                  className="h-7 w-7 p-0"
                >
                  <Plus className="w-3 h-3" />
                </Button>
                <span className="text-lg font-mono font-bold text-accent">
                  {customRounds}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => adjustRounds(-1)}
                  disabled={customRounds <= 1}
                  className="h-7 w-7 p-0"
                >
                  <Minus className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {/* Sets */}
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-2">Sets</div>
              <div className="flex flex-col items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => adjustSets(1)}
                  disabled={customSets >= 10}
                  className="h-7 w-7 p-0"
                >
                  <Plus className="w-3 h-3" />
                </Button>
                <span className="text-lg font-mono font-bold text-blue-500">
                  {customSets}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => adjustSets(-1)}
                  disabled={customSets <= 1}
                  className="h-7 w-7 p-0"
                >
                  <Minus className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Timer Display */}
      <div className="text-center py-6">
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
            <div className={cn("text-lg font-bold mb-2", getPhaseColor())}>
              {getPhaseLabel()}
            </div>
            <div className={cn("text-6xl font-mono font-bold tabular-nums", getPhaseColor())}>
              {formatTime(timeLeft)}
            </div>
            <div className="text-muted-foreground mt-2 space-y-1">
              {customSets > 1 && (
                <div className="text-sm font-medium">
                  Set {currentSet} / {customSets}
                </div>
              )}
              <div>
                Round {currentRound} / {customRounds}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className={cn(
            "h-full transition-all duration-1000 ease-linear",
            phase === 'work' ? 'bg-red-500' : 
            phase === 'rest' ? 'bg-green-500' : 
            'bg-accent'
          )}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Set and Round Indicators */}
      <div className="space-y-2">
        {/* Set Indicators (if more than 1 set) */}
        {customSets > 1 && (
          <div className="flex justify-center gap-3">
            {Array.from({ length: customSets }).map((_, i) => (
              <div
                key={`set-${i}`}
                className={cn(
                  "w-4 h-4 rounded-full transition-colors border-2",
                  i + 1 < currentSet 
                    ? "bg-blue-500 border-blue-500" 
                    : i + 1 === currentSet 
                      ? "border-blue-500 bg-transparent"
                      : "border-muted bg-transparent"
                )}
              />
            ))}
          </div>
        )}
        
        {/* Round Indicators */}
        <div className="flex justify-center gap-1.5 flex-wrap">
          {Array.from({ length: customRounds }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-3 h-3 rounded-full transition-colors",
                i + 1 < currentRound 
                  ? "bg-accent" 
                  : i + 1 === currentRound 
                    ? phase === 'work' ? "bg-red-500" : phase === 'rest' ? "bg-green-500" : "bg-accent"
                    : "bg-muted"
              )}
            />
          ))}
        </div>
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
      <div className="flex justify-center gap-4 text-sm text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          {customWorkTime}s trabalho
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          {customRestTime}s descanso
        </span>
        {customSets > 1 && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            {customSets} sets
          </span>
        )}
      </div>

      {/* End Workout Confirmation Dialog */}
      <AlertDialog open={showEndConfirm} onOpenChange={setShowEndConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Encerrar treino?</AlertDialogTitle>
            <AlertDialogDescription>
              {customSets > 1 
                ? `Você está no set ${currentSet}/${customSets}, round ${currentRound}/${customRounds}.`
                : `Você completou ${currentRound - 1} de ${customRounds} rounds.`
              }
              {' '}Tem certeza que deseja encerrar o treino agora?
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
