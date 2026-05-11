import { useCallback, useEffect, useState } from 'react';

const KEY = 'dash:theme';

function readInitial() {
  if (typeof window === 'undefined') return 'light';
  const stored = localStorage.getItem(KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function apply(theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = theme;
}

export function useTheme() {
  const [theme, setTheme] = useState(readInitial);

  useEffect(() => {
    apply(theme);
    try { localStorage.setItem(KEY, theme); } catch { /* ignore */ }
  }, [theme]);

  useEffect(() => {
    const stored = localStorage.getItem(KEY);
    if (stored) return;
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;
    const onChange = (e) => setTheme(e.matches ? 'dark' : 'light');
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  const toggle = useCallback(() => setTheme(t => t === 'dark' ? 'light' : 'dark'), []);

  return { theme, setTheme, toggle };
}
