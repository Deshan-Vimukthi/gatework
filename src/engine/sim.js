import { ST, HK } from './state.js';
import { G2, cur, pins } from './model.js';

export /* ---- simulation ---- */
const inst = c => c._in || (c._in = JSON.parse(JSON.stringify(ST.P.c[c.ref])));
export function step(C, sync) {
  const m = {},
    o = {},
    sn = {};
  C.comps.forEach(c => {
    m[c.id] = c;
    sn[c.id] = c._o;
  });
  C.wires.forEach(w => o[w.b + ':' + w.j] = [w.a, w.i]);
  const rd = (c, i, L) => {
    const q = o[c.id + ':' + i];
    if (!q || !m[q[0]]) return 0;
    return ((L && !sync ? m[q[0]]._o : sn[q[0]]) || [])[q[1]] | 0;
  };
  let sig = '';
  for (const c of C.comps) {
    const t = c.t,
      pv = c._o + '|' + c._v,
      g = i => rd(c, i, 1),
      h = i => rd(c, i, 0),
      a = g(0),
      b = g(1);
    if (t == 'IN' || t == 'CLK' || t == 'KEY' || t == 'CONST') c._o = [c.v | 0];else if (t == 'OUT') {
      c._o = [];
      c._v = a;
    } else if (t == 'DFF') {
      const ck = h(1);
      if (ck && !c._pc) c._q = h(0);
      c._pc = ck;
      c._o = [c._q | 0, 1 - (c._q | 0)];
    } else if (t == 'REG') {
      const ck = h(2);
      if (ck && !c._pc && h(1)) c._q = h(0) & 255;
      c._pc = ck;
      c._o = [c._q | 0];
    } else if (t == 'CNT') {
      const ck = h(0);
      if (ck && !c._pc) {
        if (h(4)) c._q = 0;else if (h(2)) c._q = h(3) & 255;else if (h(1)) c._q = (c._q | 0) + 1 & 255;
      }
      c._pc = ck;
      c._o = [c._q | 0];
    } else if (t == 'ROM' || t == 'RAM') {
      const M = c._m || (c._m = (c.init || Array(16).fill(0)).slice()),
        ck = h(3);
      if (t == 'RAM' && ck && !c._pc && h(2)) M[h(0) & 15] = h(1) & 255;
      c._pc = ck;
      c._o = [M[a & 15] | 0];
    } else if (t == 'DELAY') {
      const n = c.cfg[0] || 1,
        d = c._d || (c._d = Array(n).fill(0));
      d.push(h(0));
      c._o = [d.shift() | 0];
    } else if (t == 'SEG7') {
      c._o = [];
      c._b = c.cfg[0] == 1 ? Array.from({
        length: 8
      }, (_, i) => a >> i & 1) : Array.from({
        length: 8
      }, (_, i) => g(i));
    } else if (t == 'MUX') c._o = [g(2) ? b : a];else if (t == 'DEC') c._o = Array.from({
      length: c.cfg[0]
    }, (_, i) => +(a == i));else if (t == 'SPLIT') {
      let q = 0;
      c._o = c.cfg.map(w => {
        const v = a >> q & (1 << w) - 1;
        q += w;
        return v;
      });
    } else if (t == 'JOIN') {
      let q = 0;
      c._o = [c.cfg.reduce((r, w, i) => {
        const v = (g(i) & (1 << w) - 1) << q;
        q += w;
        return r | v;
      }, 0)];
    } else if (t == 'SUB') {
      const I = inst(c),
        PI = I._pi || (I._pi = pins(I, 'IN')),
        PO = I._po || (I._po = pins(I, 'OUT')),
        iv = PI.map((p, i) => g(i)),
        kk = iv.join();
      if (c._k === kk && c._ok) c._o = c._co;else {
        PI.forEach((p, i) => p.v = iv[i]);
        c._ok = settle(I);
        c._k = kk;
        c._co = PO.map(p => p._v | 0);
        c._o = c._co;
      }
    } else c._o = [G2[t](a, b)];
    if (c._o + '|' + c._v != pv) c._fl = Date.now();
    sig += c._o + '|' + (c._v | 0) + (c._d || '') + (c._b || '') + ';';
  }
  return sig;
}
export function settle(C) {
  let s = '',
    p,
    n = 0;
  do {
    p = s;
    s = step(C);
  } while (s != p && ++n < 40);
  return s == p;
}
export function reset() {
  Object.values(ST.P.c).forEach(d => d.comps.forEach(c => {
    c._in = null;
    c._q = 0;
    c._pc = 0;
    c._m = null;
    c._d = null;
    c._k = null;
  }));
  settle(cur());
}
export function kick() {
  clearTimeout(ST.tm);
  ST.lastS = '';
  ST.nn = 0;
  if (ST.slow == 0) settle(cur());else if (ST.slow > 0) prop();
}
export function prop() {
  const s = step(cur(), 1);
  if (s != ST.lastS && ++ST.nn < 80) {
    ST.lastS = s;
    ST.tm = setTimeout(prop, ST.slow);
  }
}
/* ---- drawing ---- */
