import { useCallback } from 'react';

interface DraftBase {
  savedAt: number;
}

export function useWorkoutDraft<T extends object>(workoutType: string) {
  const key = `workout-draft-${workoutType}`;

  const saveDraft = useCallback((data: T) => {
    const draft = {
      ...data,
      savedAt: Date.now()
    };
    try {
      localStorage.setItem(key, JSON.stringify(draft));
    } catch (e) {
      console.log('Erro ao salvar rascunho local');
    }
  }, [key]);

  const loadDraft = useCallback((): (T & DraftBase) | null => {
    try {
      const saved = localStorage.getItem(key);
      if (!saved) return null;
      
      const draft = JSON.parse(saved) as T & DraftBase;
      
      // Expirar drafts com mais de 24h
      if (Date.now() - draft.savedAt > 24 * 60 * 60 * 1000) {
        localStorage.removeItem(key);
        return null;
      }
      
      return draft;
    } catch (e) {
      return null;
    }
  }, [key]);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.log('Erro ao limpar rascunho');
    }
  }, [key]);

  return { saveDraft, loadDraft, clearDraft };
}
