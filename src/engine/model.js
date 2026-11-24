import { ST, HK } from './state.js';
import { lc } from './geometry.js';
import { reset } from './sim.js';

export const G2 = {
  AND: (a, b) => a & b,
  OR: (a, b) => a | b,
  NAND: (a, b) => 1 - (a & b),
  NOR: (a, b) => 1 - (a | b),
  XOR: (a, b) => a ^ b,
  XNOR: (a, b) => 1 - (a ^ b),
  NOT: a => 1 - a,
  BUF: a => a
};
export const save = () => {
  lc.clear();
  try {
    localStorage.setItem('gw1', JSON.stringify(ST.P, (k, v) => k[0] == '_' ? undefined : v));
  } catch (e) {}
  HK.changed();
};
export const cur = () => ST.P.c[ST.P.cur];
export const pins = (d, t) => d.comps.filter(c => c.t == t).sort((a, b) => (a.po ?? a.y) - (b.po ?? b.y) || a.y - b.y || a.x - b.x);
export const uses = (a, b) => ST.P.c[a].comps.some(c => c.t == 'SUB' && (c.ref == b || uses(c.ref, b)));
export /* ---- circuit builder (examples + K-map output) ---- */
function mk(name, ins, nodes, outs) {
  const C = {
      comps: [],
      wires: []
    },
    id = {},
    dep = {},
    col = {};
  const add = (t, x, y, o) => {
    const c = {
      id: ++ST.seq,
      t,
      x,
      y,
      ...o
    };
    C.comps.push(c);
    return c;
  };
  ins.forEach((s, i) => {
    const kx = s[0] == '#',
      [l, w] = (kx ? s.slice(1) : s).split(':');
    id[l] = add(kx ? 'KEY' : 'IN', 30, 30 + i * 40, kx ? {
      l,
      k: l.toLowerCase(),
      v: 0
    } : {
      l,
      v: 0,
      w: +w || 1
    });
    dep[l] = 0;
  });
  nodes.forEach(([k, t, ...src]) => {
    const d = 1 + Math.max(0, ...src.map(s => dep[s.split('.')[0]] || 0)),
      sub = t[0] == '@';
    dep[k] = d;
    col[d] = col[d] || 0;
    const T = t.split(':');
    id[k] = add(sub ? 'SUB' : T[0], 30 + d * 120, 30 + col[d]++ * 80, sub ? {
      ref: t.slice(1)
    } : T[1] ? {
      cfg: T[1].split(',').map(Number)
    } : {});
  });
  const link = (ref, c, j) => {
    const [a, i = '0'] = ref.split('.');
    C.wires.push({
      a: id[a].id,
      i: +i,
      b: c.id,
      j
    });
  };
  nodes.forEach(([k, t, ...src]) => src.forEach((s, j) => link(s, id[k], j)));
  const D = Math.max(...Object.values(dep)) + 1;
  Object.entries(outs).forEach(([n, r], i) => {
    {
      const [l, w] = n.split(':');
      link(r, add('OUT', 30 + D * 120, 30 + i * 50, {
        l,
        w: +w || 1
      }), 0);
    }
  });
  ST.P.c[name] = C;
  lc.clear();
  return name;
}
export const HA = () => mk('HalfAdder', ['A', 'B'], [['s', 'XOR', 'A', 'B'], ['c', 'AND', 'A', 'B']], {
  S: 's',
  C: 'c'
});
export const FA = () => {
  HA();
  const n = mk('FullAdder', ['A', 'B', 'Cin'], [['h1', '@HalfAdder', 'A', 'B'], ['h2', '@HalfAdder', 'h1.0', 'Cin'], ['co', 'OR', 'h1.1', 'h2.1']], {
    S: 'h2.0',
    Cout: 'co'
  });
  const D = ST.P.c[n];
  D.comps.find(c => c.l == 'Cin').sd = 'T';
  D.comps.find(c => c.l == 'Cout').sd = 'B';
  return n;
};
export const EX = {
  'Half adder': HA,
  'Full adder': FA,
  '8-bit adder': () => {
    FA();
    const I = [],
      N = [],
      O = {};
    for (let i = 0; i < 8; i++) I.push('A' + i);
    for (let i = 0; i < 8; i++) I.push('B' + i);
    I.push('Cin');
    for (let i = 0; i < 8; i++) {
      N.push(['f' + i, '@FullAdder', 'A' + i, 'B' + i, i ? 'f' + (i - 1) + '.1' : 'Cin']);
      O['S' + i] = 'f' + i + '.0';
    }
    O.Cout = 'f7.1';
    return mk('Adder8', I, N, O);
  },
  'Bus demo (swap nibbles)': () => mk('NibbleSwap', ['D:8'], [['sp', 'SPLIT:4,4', 'D'], ['jn', 'JOIN:4,4', 'sp.1', 'sp.0']], {
    'Y:8': 'jn'
  }),
  'Keypad to 7-segment': () => {
    const E = enc(10, 4),
      n = mk(un('KeypadSeg'), E.ins, [...E.nodes, ['j', 'JOIN:1,1,1,1', ...E.q], ['r', 'ROM', 'j'], ['d', 'SEG7:1', 'r']], {});
    ST.P.c[n].comps.find(c => c.t == 'ROM').init = [0x3F, 0x06, 0x5B, 0x4F, 0x66, 0x6D, 0x7D, 0x07, 0x7F, 0x6F, 0x77, 0x7C, 0x39, 0x5E, 0x79, 0x71];
    return n;
  },
  'Counter to ROM sequencer': () => {
    const n = mk('Sequencer', ['CLK', 'EN'], [['c', 'CNT', 'CLK', 'EN'], ['r', 'ROM', 'c']], {
        'ADDR:8': 'c',
        'DATA:8': 'r'
      }),
      C = ST.P.c[n];
    C.comps.find(c => c.t == 'ROM').init = [0x3C, 0x42, 0xA5, 0x81, 0xA5, 0x99, 0x42, 0x3C, 1, 2, 4, 8, 16, 32, 64, 128];
    C.comps.find(c => c.l == 'EN').v = 1;
    return n;
  },
  'SR latch (NOR)': () => mk('SRLatch', ['S', 'R'], [['q', 'NOR', 'R', 'qb'], ['qb', 'NOR', 'S', 'q']], {
    Q: 'q',
    Qb: 'qb'
  })
};
export const hx = v => (v | 0).toString(16).toUpperCase().padStart(2, '0');
export const clean = o => JSON.parse(JSON.stringify(o, (k, v) => k[0] == '_' ? undefined : v));
export const un = b => {
  let n = b,
    i = 1;
  while (ST.P.c[n]) n = b + ++i;
  return n;
};
export function enc(n, m) {
  const ins = [],
    nodes = [],
    q = [],
    lab = i => i.toString(16).toUpperCase();
  for (let i = 0; i < n; i++) ins.push('#' + lab(i));
  const orc = (L, p) => {
    if (!L.length) {
      nodes.push([p + 'z', 'XOR', lab(0), lab(0)]);
      return p + 'z';
    }
    let a = lab(L[0]);
    for (let j = 1; j < L.length; j++) {
      const k = p + 'o' + j;
      nodes.push([k, 'OR', a, lab(L[j])]);
      a = k;
    }
    return a;
  };
  const all = [...Array(n).keys()];
  for (let b = 0; b < m; b++) q.push(orc(all.filter(i => i >> b & 1), 'q' + b));
  return {
    ins,
    nodes,
    q,
    any: orc(all, 'any')
  };
}
export function reorder(nm, t, id, dir) {
  const D = ST.P.c[nm],
    L = pins(D, t),
    i = L.findIndex(c => c.id == id),
    j = i + dir;
  if (i < 0 || j < 0 || j >= L.length) return;
  const old = L.map(c => c.id);
  [L[i], L[j]] = [L[j], L[i]];
  L.forEach((c, k) => c.po = k);
  const map = old.map(i0 => L.findIndex(c => c.id == i0));
  Object.values(ST.P.c).forEach(d => d.comps.forEach(sc => {
    if (sc.t == 'SUB' && sc.ref == nm) d.wires.forEach(w => {
      if (t == 'IN' && w.b == sc.id) w.j = map[w.j] ?? w.j;
      if (t == 'OUT' && w.a == sc.id) w.i = map[w.i] ?? w.i;
    });
  }));
  reset();
  save();
  HK.ui();
}
