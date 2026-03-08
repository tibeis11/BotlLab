'use client';

import { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'system' | 'dark' | 'light';
type ResolvedTheme = 'dark' | 'light';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  resolved: ResolvedTheme;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'system',
  setTheme: () => {},
  resolved: 'dark',
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolved, setResolved] = useState<ResolvedTheme>('dark');

  // On mount: load persisted preference
  useEffect(() => {
    const stored = localStorage.getItem('botllab-theme') as Theme | null;
    if (stored === 'dark' || stored === 'light' || stored === 'system') {
      setThemeState(stored);
    }
  }, []);

  // Apply data-theme attribute and resolve whenever theme changes
  useEffect(() => {
    const root = document.documentElement;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');

    if (theme === 'system') {
      root.removeAttribute('data-theme');
      setResolved(mq.matches ? 'dark' : 'light');
    } else {
      root.setAttribute('data-theme', theme);
      setResolved(theme);
    }

    localStorage.setItem('botllab-theme', theme);
  }, [theme]);

  // Listen for system preference changes while in 'system' mode
  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setResolved(e.matches ? 'dark' : 'light');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme: setThemeState, resolved }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
