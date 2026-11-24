// Bridge between the imperative canvas engine and React: the engine calls HK.* hooks, React subscribes.
import { useEffect, useReducer, useSyncExternalStore } from 'react';
import { HK } from '../engine/index.js';

let ver = 0, pending = false, toastTimer = 0;
const subs = new Set();
export const ui = { toast: '', pv: null, tab: 'ctl' };

export const bump = () => {
  if (pending) return;
  pending = true;
  requestAnimationFrame(() => { pending = false; ver++; subs.forEach((f) => f()); });
};
Object.assign(HK, {
  changed: bump, ui: bump, keysUI: bump, pinsUI: bump, refreshMem: bump, logic: bump, kmap: bump,
  flash: (t) => { ui.toast = t; bump(); clearTimeout(toastTimer); toastTimer = setTimeout(() => { ui.toast = ''; bump(); }, 4500); },
  preview: (p) => { ui.pv = p; bump(); },
  selectTab: (t) => { ui.tab = t; bump(); },
});
export const useEngine = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => ver);
/** Re-render every `ms` milliseconds (for live values such as monitors). */
export function useTick(ms = 120, active = true) {
  const [, f] = useReducer((x) => x + 1, 0);
  useEffect(() => { if (!active) return undefined; const i = setInterval(f, ms); return () => clearInterval(i); }, [ms, active]);
}
