import { useCallback, useEffect, useState } from 'react';

export type AppTheme = 'roxo' | 'preto';

const THEME_STORAGE_KEY = 'vitalissy-theme';
const DEFAULT_THEME: AppTheme = 'roxo';

function readStoredTheme(): AppTheme {
  if (typeof window === 'undefined') return DEFAULT_THEME;
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return stored === 'preto' ? 'preto' : DEFAULT_THEME;
}

function applyTheme(theme: AppTheme) {
  if (theme === DEFAULT_THEME) {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<AppTheme>(readStoredTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback((next: AppTheme) => {
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
    setThemeState(next);
  }, []);

  return { theme, setTheme };
}
