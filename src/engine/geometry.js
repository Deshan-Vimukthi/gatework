import { ST, HK } from './state.js';
import { cur, pins, save } from './model.js';

export function sp(c) {
  const t = c.t;
  if (t == 'SUB') {
    const L = subLay(c);
    return {
      ni: L.ni,
      no: L.no,
      w: L.w,
      h: L.h
    };
  }
  let ni, no;
  if (t == 'IN' || t == 'CLK' || t == 'KEY' || t == 'CONST') {
    ni = 0;
    no = 1;
  } else if (t == 'OUT') {
    ni = 1;
    no = 0;
  } else if (t == 'DFF') {
    ni = 2;
    no = 2;
  } else if (t == 'SPLIT') {
    ni = 1;
    no = c.cfg.length;
  } else if (t == 'JOIN') {
    ni = c.cfg.length;
    no = 1;
  } else if (t == 'DEC') {
    ni = 1;
    no = c.cfg[0];
  } else if (t == 'SEG7') {
    ni = c.cfg[0];
    no = 0;
  } else if (PL[t]) {
    ni = PL[t][0].length;
    no = PL[t][1].length;
  } else if (t == 'SUB') {
    const d = ST.P.c[c.ref] || {
      comps: []
    };
    ni = pins(d, 'IN').length;
    no = pins(d, 'OUT').length;
  } else {
    ni = t == 'NOT' || t == 'BUF' ? 1 : 2;
    no = 1;
  }
  return {
    ni,
    no,
    w: t == 'SUB' ? 96 : t == 'IN' || t == 'OUT' ? c.w > 1 ? 84 : 56 : t == 'CLK' || t == 'CONST' ? 56 : t == 'SEG7' ? 100 : PL[t] || t == 'DEC' ? 84 : 64,
    h: Math.max(Math.max(ni, no, 1) * 20 + 16 + (t == 'SUB' ? 14 : 0), t == 'SEG7' ? 120 : 0)
  };
}
export const SD = {
  L: [-1, 0],
  R: [1, 0],
  T: [0, -1],
  B: [0, 1]
};
export const gp = c => c.t == 'SUB' && subLay(c).S.T.length + subLay(c).S.B.length ? 34 : 16;
export const lc = new Map();
export function subLay(c) {
  let L = lc.get(c.ref);
  if (!L) {
    L = subLay0(c);
    lc.set(c.ref, L);
  }
  return L;
}
export function subLay0(c) {
  const D = ST.P.c[c.ref] || {
      comps: []
    },
    I = pins(D, 'IN'),
    O = pins(D, 'OUT'),
    S = {
      L: [],
      R: [],
      T: [],
      B: []
    };
  I.forEach((p, i) => S[p.sd || 'L'].push('i' + i));
  O.forEach((p, i) => S[p.sd || 'R'].push('o' + i));
  const w = Math.max(110, S.T.length * 22 + 24, S.B.length * 22 + 24),
    h = Math.max(S.L.length, S.R.length, 1) * 20 + 30,
    pos = {},
    dir = {};
  [['L', 0], ['R', w]].forEach(([k, X]) => S[k].forEach((id, j) => {
    pos[id] = [X, h / 2 + 7 + (j - (S[k].length - 1) / 2) * 20];
    dir[id] = SD[k];
  }));
  [['T', 0], ['B', h]].forEach(([k, Y]) => S[k].forEach((id, j) => {
    pos[id] = [w / 2 + (j - (S[k].length - 1) / 2) * 22, Y];
    dir[id] = SD[k];
  }));
  return {
    ni: I.length,
    no: O.length,
    w,
    h,
    pos,
    dir,
    S,
    I,
    O
  };
}
export const pdir = (c, i, o) => {
  let d = o ? [1, 0] : [-1, 0];
  if (c.t == 'SUB') d = subLay(c).dir[(o ? 'o' : 'i') + i] || d;
  const [a, b] = [[d[0], d[1]], [-d[1], d[0]], [-d[0], -d[1]], [d[1], -d[0]]][(c.r | 0) & 3];
  return [a, b];
};
export const pl = (c, i, o) => {
  if (c.t == 'SUB') return subLay(c).pos[(o ? 'o' : 'i') + i] || [0, 0];
  const s = sp(c),
    n = o ? s.no : s.ni;
  return [o ? s.w : 0, s.h / 2 + (c.t == 'SUB' ? 7 : 0) + (i - (n - 1) / 2) * 20];
};
export const rt = (c, lx, ly) => {
  const s = sp(c),
    cx = s.w / 2,
    cy = s.h / 2,
    dx = lx - cx,
    dy = ly - cy,
    [a, b] = [[dx, dy], [-dy, dx], [-dx, -dy], [dy, -dx]][(c.r | 0) & 3];
  return [c.x + cx + a, c.y + cy + b];
};
export const pp = (c, i, o) => {
  const q = pl(c, i, o);
  return rt(c, q[0], q[1]);
};
export const inl = (c, p) => {
  const s = sp(c),
    cx = c.x + s.w / 2,
    cy = c.y + s.h / 2,
    dx = p[0] - cx,
    dy = p[1] - cy,
    [a, b] = [[dx, dy], [-dy, dx], [-dx, -dy], [dy, -dx]][4 - ((c.r | 0) & 3) & 3];
  return [cx + a, cy + b];
};
export const bb = c => {
  const s = sp(c),
    q = [[0, 0], [s.w, 0], [0, s.h], [s.w, s.h]].map(v => rt(c, v[0], v[1]));
  return [Math.min(...q.map(v => v[0])), Math.min(...q.map(v => v[1])), Math.max(...q.map(v => v[0])), Math.max(...q.map(v => v[1]))];
};
/* ---- simulation ---- */
export const PL = {
  DFF: [['D', 'CLK'], ['Q', 'Q̄']],
  REG: [['D', 'LD', 'CLK'], ['Q']],
  CNT: [['CLK', 'EN', 'LD', 'D', 'RST'], ['Q']],
  RAM: [['ADDR', 'DIN', 'WE', 'CLK'], ['DOUT']],
  ROM: [['ADDR'], ['DOUT']],
  DELAY: [['IN'], ['OUT']],
  MUX: [['A', 'B', 'SEL'], ['Y']]
};
export /* ---- wires ---- */
function route(w, m) {
  const A = m[w.a],
    B = m[w.b];
  if (!A || !B) return null;
  const p = pp(A, w.i, 1),
    q = pp(B, w.j, 0),
    dp = pdir(A, w.i, 1),
    dq = pdir(B, w.j, 0),
    so = !(dp[0] == 1 && dp[1] == 0),
    st = !(dq[0] == -1 && dq[1] == 0),
    S = 14,
    p2 = so ? [p[0] + dp[0] * S, p[1] + dp[1] * S] : p,
    q2 = st ? [q[0] + dq[0] * S, q[1] + dq[1] * S] : q,
    xs = w.xs || [w.mx != null ? w.mx : q2[0] > p2[0] + 30 ? (p2[0] + q2[0]) / 2 : p2[0] + 20],
    ys = w.ys || [],
    core = [p2];
  xs.forEach((X, i) => {
    core.push([X, i ? ys[i - 1] : p2[1]]);
    core.push([X, i < ys.length ? ys[i] : q2[1]]);
  });
  core.push(q2);
  const r = [...(so ? [p] : []), ...core, ...(st ? [q] : [])];
  r.o = so ? 1 : 0;
  r.t = st ? 1 : 0;
  return r;
}
export function wireXY(w) {
  if (!w.xs) {
    const C = cur(),
      m = {};
    C.comps.forEach(c => m[c.id] = c);
    const r = route(w, m);
    w.xs = [r[(r.o || 0) + 1][0]];
    w.ys = [];
  }
}
export function dragWire(d, p) {
  const w = d.wd,
    s = d.seg,
    sn = v => Math.round(v / 10) * 10;
  wireXY(w);
  const k = w.xs.length;
  if (s < 0 || s > 2 * k) return;
  if (s % 2) w.xs[(s - 1) / 2] = sn(p[0]);else if (s == 0) w.xs[0] = sn(p[0]);else if (s == 2 * k) w.xs[k - 1] = sn(p[0]);else w.ys[s / 2 - 1] = sn(p[1]);
}
export function bend(hw, p) {
  const w = hw.w,
    s = hw.seg;
  wireXY(w);
  const k = w.xs.length;
  if (s < 0 || s > 2 * k) return;
  if (s % 2) {
    const i = (s - 1) / 2;
    w.xs.splice(i + 1, 0, w.xs[i] + 20);
    w.ys.splice(i, 0, Math.round(p[1] / 10) * 10);
  } else if (s > 0 && s < 2 * k) {
    const j = s / 2;
    w.xs.splice(j, 1);
    w.ys.splice(j - 1, 1);
  }
  save();
}
export function hitWire(p) {
  const C = cur(),
    m = {};
  C.comps.forEach(c => m[c.id] = c);
  for (const w of [...C.wires].reverse()) {
    const r = route(w, m);
    if (!r) continue;
    for (let i = 0; i < r.length - 1; i++) {
      const a = r[i],
        b = r[i + 1],
        dx = b[0] - a[0],
        dy = b[1] - a[1],
        L = dx * dx + dy * dy || 1,
        t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L));
      if (Math.hypot(a[0] + t * dx - p[0], a[1] + t * dy - p[1]) < 6 / ST.Z) return {
        w,
        seg: i - (r.o || 0)
      };
    }
  }
  return null;
}
