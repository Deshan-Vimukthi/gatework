import { useEffect, useState } from 'react';

const initial = () => localStorage.getItem('gw.theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
export function useTheme() {
  const [theme, setTheme] = useState(initial);
  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem('gw.theme', theme); }, [theme]);
  return [theme, setTheme];
}
