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
import { X } from 'lucide-react';

interface UnsavedChangesDialogProps {
  open: boolean;
  onDiscard: () => void;
  onSave: () => void;
  onContinue?: () => void;
  saving?: boolean;
}

export function UnsavedChangesDialog({
  open,
  onDiscard,
  onSave,
  onContinue,
  saving = false
}: UnsavedChangesDialogProps) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="w-[calc(100%-2rem)] max-w-[430px] rounded-2xl border-white/10 bg-card p-5 text-center shadow-elegant">
        {onContinue && (
          <button
            type="button"
            onClick={onContinue}
            disabled={saving}
            className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
            aria-label="Continuar treino"
          >
            <X className="h-5 w-5" />
          </button>
        )}
        <AlertDialogHeader className="pr-8 text-center sm:text-center">
          <AlertDialogTitle className="text-2xl font-bold">Treino não salvo</AlertDialogTitle>
          <AlertDialogDescription className="text-base leading-relaxed text-muted-foreground">
            Você tem um treino registrado que não foi salvo. Se sair agora, perderá esses dados.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="grid gap-3 sm:grid-cols-1 sm:space-x-0">
          {onContinue && (
            <AlertDialogCancel
              onClick={onContinue}
              disabled={saving}
              className="mt-0 h-12 w-full rounded-xl border-white/10 bg-secondary/60 text-base font-semibold"
            >
              Continuar treino
            </AlertDialogCancel>
          )}
          <AlertDialogAction
            onClick={onSave}
            disabled={saving}
            className="h-12 w-full rounded-xl bg-gradient-primary text-base font-bold text-primary-foreground shadow-glow hover:opacity-95"
          >
            {saving ? 'Salvando...' : 'Salvar Treino'}
          </AlertDialogAction>
          <AlertDialogAction
            onClick={onDiscard}
            disabled={saving}
            className="h-12 w-full rounded-xl border border-white/10 bg-transparent text-base font-semibold text-foreground shadow-none hover:bg-secondary/50"
          >
            Sair sem salvar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
