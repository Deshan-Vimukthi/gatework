import { ST, HK } from './state.js';
import { cur, save } from './model.js';
import { gp, pl, pp, route, sp } from './geometry.js';

export function crossings(C) {
  const m = {};
  C.comps.forEach(c => m[c.id] = c);
  const S = [];
  C.wires.forEach((w, k) => {
    const r = route(w, m);
    if (!r) return;
    for (let i = 0; i < r.length - 1; i++) S.push([r[i], r[i + 1], w.a + '.' + w.i, k]);
  });
  let n = 0;
  for (let i = 0; i < S.length; i++) for (let j = i + 1; j < S.length; j++) {
    const A = S[i],
      B = S[j];
    if (A[2] == B[2] || A[3] == B[3]) continue;
    const ah = A[0][1] == A[1][1],
      bh = B[0][1] == B[1][1];
    if (ah == bh) continue;
    const H = ah ? A : B,
      W = ah ? B : A,
      hx0 = Math.min(H[0][0], H[1][0]),
      hx1 = Math.max(H[0][0], H[1][0]),
      vy0 = Math.min(W[0][1], W[1][1]),
      vy1 = Math.max(W[0][1], W[1][1]),
      vx = W[0][0],
      hy = H[0][1];
    if (vx > hx0 && vx < hx1 && hy > vy0 && hy < vy1) n++;
  }
  return n;
}
export function layout(C) {
  const sn = v => Math.round(v / 10) * 10,
    by = new Map(C.comps.map(c => [c.id, c])),
    E = C.wires.filter(w => by.has(w.a) && by.has(w.b) && w.a != w.b);
  C.comps.forEach(c => c.r = 0);
  const ow = new Map(),
    iw = new Map();
  C.comps.forEach(c => {
    ow.set(c.id, []);
    iw.set(c.id, []);
  });
  E.forEach(w => {
    ow.get(w.a).push(w);
    iw.get(w.b).push(w);
  });
  const st = {},
    back = new Set(),
    dfs = u => {
      st[u] = 1;
      ow.get(u).forEach(w => {
        if (st[w.b] == 1) back.add(w);else if (!st[w.b]) dfs(w.b);
      });
      st[u] = 2;
    };
  [...C.comps].sort((a, b) => iw.get(a.id).length - iw.get(b.id).length || a.y - b.y).forEach(c => {
    if (!st[c.id]) dfs(c.id);
  });
  const fw = E.filter(w => !back.has(w)),
    L = {},
    lay = u => {
      if (L[u] != null) return L[u];
      const p = fw.filter(w => w.b == u);
      return L[u] = p.length ? 1 + Math.max(...p.map(w => lay(w.a))) : 0;
    };
  C.comps.forEach(c => lay(c.id));
  C.comps.forEach(c => {
    if (c.t == 'CONST' || c.t == 'CLK') {
      const o = fw.filter(w => w.a == c.id);
      if (o.length) L[c.id] = Math.max(0, Math.min(...o.map(w => L[w.b])) - 1);
    }
  });
  const mx = Math.max(0, ...C.comps.filter(c => c.t != 'OUT').map(c => L[c.id]));
  C.comps.forEach(c => {
    if (c.t == 'OUT') L[c.id] = Math.max(L[c.id], mx + 1);
  });
  const n = Math.max(...Object.values(L)) + 1,
    lays = Array.from({
      length: n
    }, () => []);
  [...C.comps].sort((a, b) => a.y - b.y || a.x - b.x).forEach(c => lays[L[c.id]].push(c));
  const idx = new Map(),
    upd = () => lays.forEach(l => l.forEach((c, i) => idx.set(c.id, l.length > 1 ? i / (l.length - 1) : .5)));
  upd();
  const nbs = (c, dir) => E.filter(w => dir > 0 ? w.b == c.id && L[w.a] < L[c.id] : w.a == c.id && L[w.b] > L[c.id]).map(w => dir > 0 ? w.a : w.b);
  for (let p = 0; p < 10; p++) {
    const dir = p % 2 ? -1 : 1,
      ord = [...lays.keys()];
    (dir > 0 ? ord : ord.reverse()).forEach(li => {
      lays[li] = lays[li].map(c => {
        const q = nbs(c, dir).map(i => idx.get(i));
        return [c, q.length ? q.reduce((a, b) => a + b) / q.length : idx.get(c.id)];
      }).sort((a, b) => a[1] - b[1]).map(q => q[0]);
      upd();
    });
  }
  const lanes = lays.map((l, li) => {
      const q = new Set();
      fw.forEach(w => {
        if (L[w.b] == li) q.add(w.a + '.' + w.i);
      });
      return q.size;
    }),
    W = lays.map(l => Math.max(60, ...l.map(c => sp(c).w))),
    X = [];
  let xx = 40;
  lays.forEach((l, li) => {
    xx += li ? 24 + 10 * lanes[li] : 0;
    X[li] = xx;
    xx += W[li];
  });
  lays.forEach((l, li) => l.forEach(c => c.x = sn(X[li])));
  const place = (li, dir) => {
    let y0 = 40;
    lays[li].forEach((c, ci) => {
      const ys = [];
      fw.forEach(w => {
        if (dir > 0 && w.b == c.id && L[w.a] < li) ys.push(pp(by.get(w.a), w.i, 1)[1] - pl(c, w.j, 0)[1]);
        if (dir < 0 && w.a == c.id && L[w.b] > li) ys.push(pp(by.get(w.b), w.j, 0)[1] - pl(c, w.i, 1)[1]);
      });
      let y = ys.length ? ys.reduce((a, b) => a + b) / ys.length : y0;
      y = Math.max(y, y0);
      c.y = sn(y);
      y0 = c.y + sp(c).h + Math.max(gp(c), lays[li][ci + 1] ? gp(lays[li][ci + 1]) : 0);
    });
  };
  lays.forEach((l, li) => {
    let y = 40;
    l.forEach((c, ci) => {
      c.y = y;
      y += sp(c).h + Math.max(gp(c), l[ci + 1] ? gp(l[ci + 1]) : 0);
    });
  });
  for (let li = 0; li < n; li++) place(li, 1);
  for (let li = n - 1; li >= 0; li--) place(li, -1);
  for (let li = 0; li < n; li++) place(li, 1);
  for (let li = 1; li < n; li++) {
    const g = new Map();
    fw.forEach(w => {
      if (L[w.b] == li) {
        const k = w.a + '.' + w.i;
        if (!g.has(k)) g.set(k, []);
        g.get(k).push(w);
      }
    });
    const arr = [...g.values()].map(a => {
      const p = pp(by.get(a[0].a), a[0].i, 1),
        dy = a.reduce((t, w) => t + pp(by.get(w.b), w.j, 0)[1] - p[1], 0) / a.length;
      return {
        a,
        py: p[1],
        dy
      };
    });
    const dn = arr.filter(q => q.dy > 1).sort((u, v) => v.py - u.py),
      up = arr.filter(q => q.dy < -1).sort((u, v) => u.py - v.py),
      fl = arr.filter(q => Math.abs(q.dy) <= 1),
      gap = 24 + 10 * lanes[li];
    [...dn, ...up, ...fl].forEach((q, k) => q.a.forEach(w => {
      w.xs = [sn(X[li] - gap + 12 + 10 * k)];
      w.ys = [];
    }));
  }
  back.forEach(w => {
    delete w.xs;
    delete w.ys;
  });
}
export const tidy=() => {
  const C = cur(),
    m = {},
    G = {};
  C.comps.forEach(c => m[c.id] = c);
  C.wires.forEach(w => {
    const A = m[w.a],
      B = m[w.b];
    if (!A || !B) return;
    (G[B.id] = G[B.id] || []).push([w, pp(A, w.i, 1), pp(B, w.j, 0)]);
  });
  Object.values(G).forEach(L => {
    L.sort((u, v) => u[1][1] - v[1][1]);
    L.forEach(([w, p, q], i) => {
      const hi = q[0] - 20 - (L.length - 1 - i) * 10;
      w.ys = [];
      w.xs = [Math.round((q[0] > p[0] + 40 ? Math.max(p[0] + 20, hi) : p[0] + 20 + i * 10) / 10) * 10];
    });
  });
  save();
  HK.flash('Wires spread out – drag any selected wire to fine-tune');
};

