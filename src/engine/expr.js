import { ST, HK } from './state.js';
import { cur, pins } from './model.js';
import { sp } from './geometry.js';

export function qm(n, on, dc) {
  let c = new Map([...on, ...dc].map(m => [m + '_0', {
      v: m,
      k: 0
    }])),
    pr = [];
  while (c.size) {
    const A = [...c.values()],
      u = new Set(),
      nx = new Map();
    A.forEach((a, i) => A.forEach((b, j) => {
      if (j > i && a.k == b.k) {
        const d = a.v ^ b.v;
        if (d && !(d & d - 1)) {
          u.add(a);
          u.add(b);
          const t = {
            v: a.v & ~d,
            k: a.k | d
          };
          nx.set(t.v + '_' + t.k, t);
        }
      }
    }));
    A.forEach(a => u.has(a) || pr.push(a));
    c = nx;
  }
  const cov = (p, m) => (m & ~p.k) == p.v;
  let left = [...on],
    sl = [];
  on.forEach(m => {
    const q = pr.filter(p => cov(p, m));
    if (q.length == 1 && !sl.includes(q[0])) sl.push(q[0]);
  });
  sl.forEach(p => left = left.filter(m => !cov(p, m)));
  while (left.length) {
    let best,
      bn = 0;
    pr.forEach(p => {
      const t = left.filter(m => cov(p, m)).length;
      if (t > bn) {
        bn = t;
        best = p;
      }
    });
    sl.push(best);
    left = left.filter(m => !cov(best, m));
  }
  return sl.map(p => ({
    ...p,
    cov: m => cov(p, m)
  }));
}
export const term = p => {
  let s = '';
  for (let i = 0; i < ST.K.n; i++) {
    const b = ST.K.n - 1 - i;
    if (!(p.k >> b & 1)) s += ST.K.nm[i] + (p.v >> b & 1 ? '' : '′');
  }
  return s || '1';
};
export function ex(C, id, oi, env, seen, dp = 0) {
  if (++ST.exN > 500) return {
    a: '…'
  };
  const c = C.comps.find(q => q.id == id);
  if (!c) return {
    a: '?'
  };
  const k = id + ':' + oi;
  if (seen.includes(k)) return {
    a: '…'
  };
  seen = [...seen, k];
  const inp = i => {
      const w = C.wires.find(w => w.b == id && w.j == i);
      return w ? ex(C, w.a, w.i, env, seen, dp) : {
        a: '0'
      };
    },
    t = c.t,
    two = o => ({
      op: o,
      x: [inp(0), inp(1)]
    });
  if (t == 'CONST') return {
    a: String(c.v | 0)
  };
  if (t == 'IN' || t == 'KEY' || t == 'CLK') {
    const v = env && env[id];
    return v ? typeof v == 'function' ? v() : v : {
      a: c.l || t
    };
  }
  if (t == 'NOT') return {
    op: 'NOT',
    x: [inp(0)]
  };
  if (t == 'BUF') return inp(0);
  if (t == 'AND' || t == 'OR' || t == 'XOR') return two(t);
  if (t == 'NAND' || t == 'NOR' || t == 'XNOR') return {
    op: 'NOT',
    x: [two({
      NAND: 'AND',
      NOR: 'OR',
      XNOR: 'XOR'
    }[t])]
  };
  if (t == 'SUB' && dp < 2) {
    const D = ST.P.c[c.ref],
      e2 = {},
      o = pins(D, 'OUT')[oi];
    pins(D, 'IN').forEach((p, i) => e2[p.id] = () => inp(i));
    if (!o) return {
      a: '?'
    };
    const w = D.wires.find(w => w.b == o.id);
    return w ? ex(D, w.a, w.i, e2, [], dp + 1) : {
      a: '0'
    };
  }
  if (t == 'DFF' || t == 'REG' || t == 'CNT' || t == 'RAM') return {
    a: t + '#' + c.id
  };
  return {
    op: 'F',
    n: (t == 'SUB' ? c.ref : t) + (oi ? '.' + oi : ''),
    x: Array.from({
      length: sp(c).ni
    }, (_, i) => inp(i))
  };
}
export function fmt(n) {
  if (n.a != null) return n.a;
  if (n.op == 'NOT') {
    const q = n.x[0];
    return q.a != null ? q.a + '′' : '(' + fmt(q) + ')′';
  }
  if (n.op == 'F') return n.n + '(' + n.x.map(fmt).join(', ') + ')';
  const fl = [],
    ad = q => q.op == n.op ? q.x.forEach(ad) : fl.push(q);
  n.x.forEach(ad);
  return fl.map(q => {
    const t = fmt(q);
    return q.op && q.op != 'NOT' && q.op != 'F' ? '(' + t + ')' : t;
  }).join({
    AND: '·',
    OR: ' + ',
    XOR: ' ⊕ '
  }[n.op]);
}
export const sigC = () => JSON.stringify(cur().wires.map(w => [w.a, w.i, w.b, w.j])) + cur().comps.map(c => c.id + c.t).join();
