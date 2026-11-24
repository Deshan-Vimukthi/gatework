// K-map helpers shared by the Simplify panel.
import { ST, cur, mk, pins, settle, un, qm } from '../engine/index.js';

/** Reads the truth table of the open circuit into ST.K (2-4 single-bit inputs). */
export function readCircuit() {
  const C = cur(), I = [...pins(C, 'IN'), ...pins(C, 'KEY')], O = pins(C, 'OUT');
  if (I.length < 2 || I.length > 4 || !O.length) return false;
  const n = I.length, old = I.map((p) => p.v), K = ST.K;
  K.n = n; K.nm = I.map((p) => p.l); K.fs = O.map((o) => ({ l: o.l, v: [] }));
  for (let m = 0; m < 1 << n; m++) {
    I.forEach((p, i) => { p.v = (m >> (n - 1 - i)) & 1; });
    settle(C);
    O.forEach((o, j) => { K.fs[j].v[m] = o._v ? 1 : 0; });
  }
  I.forEach((p, i) => { p.v = old[i]; });
  settle(C);
  K.v = K.fs[0].v.slice();
  return true;
}
/** Builds a new circuit (NOT + AND chains + OR chain) from prime implicants. */
export function buildSimplified(n, names, pr) {
  const nodes = [], ins = names.slice(0, n);
  let cnt = 0;
  const lit = (i, neg) => { if (!neg) return ins[i]; const k = 'n' + ins[i]; if (!nodes.some((a) => a[0] === k)) nodes.push([k, 'NOT', ins[i]]); return k; };
  const chain = (t, l) => { let a = l[0]; for (let i = 1; i < l.length; i++) { const k = t + ++cnt; nodes.push([k, t, a, l[i]]); a = k; } return a; };
  let out;
  if (!pr.length) { nodes.push(['zero', 'AND', lit(0), lit(0, 1)]); out = 'zero'; }
  else {
    const prods = pr.map((p) => {
      const l = [];
      for (let i = 0; i < n; i++) { const b = n - 1 - i; if (!((p.k >> b) & 1)) l.push(lit(i, !((p.v >> b) & 1))); }
      if (!l.length) { if (!nodes.some((a) => a[0] === 'one')) nodes.push(['one', 'OR', lit(0), lit(0, 1)]); return 'one'; }
      return chain('AND', l);
    });
    out = chain('OR', prods);
  }
  return mk(un('Simplified'), ins, nodes, { F: out });
}
/** Minimal sum-of-products for every single-bit output (<= 6 single-bit inputs). */
export function minimalForms(C = cur()) {
  const I = [...pins(C, 'IN'), ...pins(C, 'KEY')].filter((c) => !(c.w > 1)), O = pins(C, 'OUT').filter((c) => !(c.w > 1)), n = I.length;
  if (n < 1 || n > 6 || !O.length) return null;
  const old = I.map((p) => p.v), tt = O.map(() => []), out = {};
  for (let q = 0; q < 1 << n; q++) { I.forEach((p, i) => { p.v = (q >> (n - 1 - i)) & 1; }); settle(C); O.forEach((o, j) => { tt[j][q] = o._v ? 1 : 0; }); }
  I.forEach((p, i) => { p.v = old[i]; }); settle(C);
  const K0 = ST.K; ST.K = { n, nm: I.map((p) => p.l) };
  const term = (p) => { let s = ''; for (let i = 0; i < n; i++) { const b = n - 1 - i; if (!((p.k >> b) & 1)) s += ST.K.nm[i] + ((p.v >> b) & 1 ? '' : '′'); } return s || '1'; };
  O.forEach((o, j) => { const on = []; tt[j].forEach((v, q) => { if (v) on.push(q); }); out[o.id] = on.length ? qm(n, on, []).map(term).join(' + ') : '0'; });
  ST.K = K0;
  return out;
}
