// Controller / monitor / debugging helpers. Pure functions over the engine, no React.
import { cur, pins, reset, settle } from '../engine/index.js';

export const defaultUI = () => ({ ctl: {}, mon: {}, probes: [], cols: 2, tests: [], bf: { inputs: null, outputs: null, expected: {}, sig: '', resetEach: false } });
export const getUI = (C = cur()) => { C.ui = C.ui || defaultUI(); return C.ui; };

/** Inputs the user can drive from the controller: IN pins and push-button keys. */
export const ctlList = (C = cur()) => [...pins(C, 'IN'), ...pins(C, 'KEY')];
/** Everything that can be watched: OUT pins plus user-added probes on any block output. */
export function monList(C = cur()) {
  const ui = getUI(C);
  return [
    ...pins(C, 'OUT').map((o) => ({ key: 'o' + o.id, label: o.l, w: o.w || 1, get: () => o._v | 0 })),
    ...ui.probes.map((p) => ({
      key: 'p' + p.id, label: p.name, w: p.w || 1, probe: p,
      get: () => { const c = C.comps.find((q) => q.id === p.comp); return c && c._o ? c._o[p.pin] | 0 : 0; },
    })),
  ];
}
export const widthOf = (c) => c.w || 1;
export const readInputs = (C = cur()) => Object.fromEntries(ctlList(C).map((c) => [c.id, c.v | 0]));
export function setInputs(C, vals) { ctlList(C).forEach((c) => { if (vals[c.id] != null) c.v = vals[c.id] | 0; }); }
export const readMonitors = (C = cur()) => Object.fromEntries(monList(C).map((m) => [m.key, m.get()]));

/** Apply inputs, settle, and return the monitor values. */
export function runCase(C, inputs, { resetFirst = false } = {}) {
  if (resetFirst) reset();
  setInputs(C, inputs);
  settle(C);
  return readMonitors(C);
}

/** Expected-vs-actual for one test case (expected values are optional "don't care" when blank). */
export function judge(expected, actual) {
  const keys = Object.keys(expected).filter((k) => expected[k] !== '' && expected[k] != null);
  if (!keys.length) return 'untested';
  return keys.every((k) => Number(expected[k]) === actual[k]) ? 'pass' : 'fail';
}
export function runTests(C) {
  const ui = getUI(C), saved = readInputs(C);
  ui.tests.forEach((t) => { t.actual = runCase(C, t.inputs); t.status = judge(t.expected || {}, t.actual); });
  setInputs(C, saved); settle(C);
}

export const comboCount = (ins) => 1 << ins.reduce((a, c) => a + widthOf(c), 0);
/**
 * Brute force every combination of the chosen inputs (first input = most significant bit)
 * and record the chosen monitors. Inputs are restored afterwards.
 */
export function bruteForce(C, { inputs, outputs, resetEach = false, limit = 4096 }) {
  const ins = ctlList(C).filter((c) => inputs.includes(c.id));
  const mons = monList(C).filter((m) => outputs.includes(m.key));
  const total = comboCount(ins);
  if (!ins.length) throw new Error('no-inputs');
  if (total > limit) throw new Error('too-many');
  const saved = readInputs(C), rows = [];
  for (let n = 0; n < total; n++) {
    let sh = Math.log2(total);
    const vals = {};
    ins.forEach((c) => { const w = widthOf(c); sh -= w; vals[c.id] = (n >> sh) & ((1 << w) - 1); });
    const res = runCase(C, vals, { resetFirst: resetEach });
    rows.push({ n, in: ins.map((c) => vals[c.id]), out: mons.map((m) => res[m.key]) });
  }
  setInputs(C, saved); settle(C);
  return { ins, mons, rows };
}
export const bfSig = (res) => res.ins.map((c) => c.id).join(',') + '|' + res.mons.map((m) => m.key).join(',');
export function toCSV(res, expected = {}) {
  const head = [...res.ins.map((c) => c.l), ...res.mons.map((m) => m.label), ...res.mons.map((m) => m.label + ' (expected)')];
  const lines = res.rows.map((r) => [...r.in, ...r.out, ...res.mons.map((m, i) => (expected[r.n] || {})[m.key] ?? '')].join(','));
  return [head.join(','), ...lines].join('\n');
}
