// Project-level operations: init, circuits, local slots.
import { ST, HK } from './state.js';
import { clean, cur, save } from './model.js';
import { reset } from './sim.js';
import { open, loadP } from './editor.js';

export const defaultProject = () => ({ name: 'project', cur: 'Main', c: { Main: { comps: [], wires: [] } } });
const safe = (n) => String(n).replace(/[^\p{L}\p{N}_ -]/gu, '').trim();

export function initProject(storage = globalThis.localStorage) {
  let P = null;
  try { P = JSON.parse(storage.getItem('gw1')); } catch (e) { /* first run */ }
  ST.P = P && P.c && Object.keys(P.c).length ? P : defaultProject();
  if (!ST.P.c[ST.P.cur]) ST.P.cur = Object.keys(ST.P.c)[0];
  Object.values(ST.P.c).forEach((d) => d.comps.forEach((c) => { ST.seq = Math.max(ST.seq, c.id); }));
  reset(); HK.changed();
}
export function newCircuit(name) {
  let i = Object.keys(ST.P.c).length + 1;
  let n = safe(name || '') || 'Circuit ' + i;
  while (ST.P.c[n]) n = 'Circuit ' + ++i;
  ST.P.c[n] = { comps: [], wires: [] };
  open(n);
  return n;
}
export function renameCircuit(a, b) {
  b = safe(b);
  if (!b || ST.P.c[b] || !ST.P.c[a]) return false;
  ST.P.c[b] = ST.P.c[a]; delete ST.P.c[a];
  Object.values(ST.P.c).forEach((d) => d.comps.forEach((c) => { if (c.ref === a) c.ref = b; }));
  if (ST.P.cur === a) ST.P.cur = b;
  save(); HK.ui(); return true;
}
export const circuitUses = (n) => Object.values(ST.P.c).reduce((a, d) => a + d.comps.filter((c) => c.t === 'SUB' && c.ref === n).length, 0);
export function deleteCircuit(n) {
  if (Object.keys(ST.P.c).length < 2 || !ST.P.c[n]) return false;
  delete ST.P.c[n];
  Object.values(ST.P.c).forEach((d) => {
    const ids = new Set(d.comps.filter((c) => c.t === 'SUB' && c.ref === n).map((c) => c.id));
    d.comps = d.comps.filter((c) => !ids.has(c.id));
    d.wires = d.wires.filter((w) => !ids.has(w.a) && !ids.has(w.b));
  });
  open(Object.keys(ST.P.c)[0]);
  return true;
}
export const slots = (storage = globalThis.localStorage) => { try { return JSON.parse(storage.getItem('gwslots')) || {}; } catch (e) { return {}; } };
export function saveSlot(name, storage = globalThis.localStorage) {
  const n = safe(name) || 'project';
  ST.P.name = n;
  const s = slots(storage); s[n] = clean(ST.P);
  storage.setItem('gwslots', JSON.stringify(s)); save();
  return n;
}
export function loadSlot(name, storage = globalThis.localStorage) { const s = slots(storage)[name]; if (s) loadP(s); return !!s; }
export function removeSlot(name, storage = globalThis.localStorage) { const s = slots(storage); delete s[name]; storage.setItem('gwslots', JSON.stringify(s)); }
export { loadP, cur };

/** Adds circuits (e.g. from a single-circuit JSON) to the open project, renaming on clashes. Returns the new names. */
export function circuitsMerge(circuits) {
  return Object.entries(circuits).map(([k, v]) => {
    let n = k;
    while (ST.P.c[n]) n += '_';
    ST.P.c[n] = v;
    v.comps.forEach((c) => { ST.seq = Math.max(ST.seq, c.id); });
    return n;
  });
}

/** Circuit by name. */
export const P_ = (name) => ST.P.c[name];
