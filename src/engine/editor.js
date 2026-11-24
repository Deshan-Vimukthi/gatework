import { ST, HK } from './state.js';
import { bend, dragWire, hitWire } from './geometry.js';
import { clean, cur, hx, save, uses } from './model.js';
import { PL, bb, inl, pl, pp, route, sp, subLay } from './geometry.js';
import { SYM, symDraw } from './symbols.js';
import { kick, reset } from './sim.js';
import { undoPv } from './arrange.js';

export /* ---- drawing ---- */
function draw() {
  if (!ST.cv) {
    requestAnimationFrame(draw);
    return;
  }
  const C = cur(),
    r = ST.cv.getBoundingClientRect(),
    d = devicePixelRatio || 1;
  edgePan(r);
  if (ST.cv.width != Math.round(r.width * d) || ST.cv.height != Math.round(r.height * d)) {
    ST.cv.width = r.width * d;
    ST.cv.height = r.height * d;
  }
  ST.x.setTransform(d, 0, 0, d, 0, 0);
  if (HK.plOn()) HK.kbSync();
  const s = getComputedStyle(document.documentElement),
    cc = {},
    k = n => cc[n] ?? (cc[n] = s.getPropertyValue(n).trim());
  ST.x.fillStyle = k('--bg');
  ST.x.fillRect(0, 0, r.width, r.height);
  ST.x.fillStyle = k('--ln');
  {
    const g = 20 * ST.Z;
    for (let i = ST.V.x % g - g; i < r.width; i += g) for (let j = ST.V.y % g - g; j < r.height; j += g) ST.x.fillRect(i, j, 1.5, 1.5);
  }
  ST.x.save();
  ST.x.translate(ST.V.x, ST.V.y);
  ST.x.scale(ST.Z, ST.Z);
  const m = {},
    iv = {};
  C.comps.forEach(c => m[c.id] = c);
  const wire = (p, q, col) => {
    ST.x.strokeStyle = col;
    ST.x.lineWidth = 2.5;
    ST.x.beginPath();
    ST.x.moveTo(...p);
    const dx = Math.max(30, Math.abs(q[0] - p[0]) / 2);
    ST.x.bezierCurveTo(p[0] + dx, p[1], q[0] - dx, q[1], ...q);
    ST.x.stroke();
  };
  C.wires.forEach(w => {
    const r = route(w, m);
    if (!r) return;
    const v = (m[w.a]._o || [])[w.i] | 0;
    iv[w.b + ':' + w.j] = v;
    ST.x.strokeStyle = w == ST.selw ? k('--hot') : k(v ? '--on' : '--off');
    ST.x.lineWidth = w == ST.selw ? 4 : 2.5;
    ST.x.lineJoin = 'round';
    ST.x.beginPath();
    r.forEach((q, i) => i ? ST.x.lineTo(...q) : ST.x.moveTo(...q));
    ST.x.stroke();
    if (w == ST.selw) {
      ST.x.fillStyle = k('--hot');
      for (let i = (r.o || 0) + 1; i < r.length - (r.t || 0) - 2; i++) ST.x.fillRect((r[i][0] + r[i + 1][0]) / 2 - 4, (r[i][1] + r[i + 1][1]) / 2 - 4, 8, 8);
    }
  });
  if (ST.drag && ST.drag.w && ST.drag.p) {
    const q = pp(ST.drag.w.c, ST.drag.w.i, ST.drag.w.k == 'o');
    ST.drag.w.k == 'o' ? wire(q, ST.drag.p, k('--hot')) : wire(ST.drag.p, q, k('--hot'));
  }
  const dot = (q, v) => {
    ST.x.fillStyle = k(v ? '--on' : '--off');
    ST.x.strokeStyle = k('--ink');
    ST.x.lineWidth = 1;
    ST.x.beginPath();
    ST.x.arc(q[0], q[1], 4.5, 0, 7);
    ST.x.fill();
    ST.x.stroke();
  };
  C.comps.forEach(c => {
    const z = sp(c),
      ang = ((c.r | 0) & 3) * Math.PI / 2,
      T = (t, X, Y) => {
        ST.x.save();
        ST.x.translate(X, Y);
        ST.x.rotate(-ang);
        ST.x.fillText(t, 0, 0);
        ST.x.restore();
      },
      io = c.t == 'IN' || c.t == 'OUT',
      on = c.t == 'OUT' ? c._v : c.t == 'IN' || c.t == 'CLK' || c.t == 'KEY' || c.t == 'CONST' ? c.v : 0;
    ST.x.save();
    ST.x.translate(c.x + z.w / 2, c.y + z.h / 2);
    ST.x.rotate(ang);
    ST.x.translate(-c.x - z.w / 2, -c.y - z.h / 2);
    ST.x.fillStyle = on ? k('--on') : k('--g');
    ST.x.strokeStyle = ST.ms.has(c) ? k('--hot') : k('--ink');
    ST.x.lineWidth = ST.ms.has(c) ? 3 : 1.5;
    if (SYM[c.t]) symDraw(ST.x, c.t, c.x, c.y, z.w, z.h);else {
      ST.x.beginPath();
      ST.x.roundRect(c.x, c.y, z.w, z.h, io || c.t == 'CONST' ? 14 : 5);
      ST.x.fill();
      ST.x.stroke();
    }
    if (Date.now() - (c._fl || 0) < Math.max(450, ST.slow)) {
      ST.x.strokeStyle = k('--hot');
      ST.x.lineWidth = 6;
      ST.x.globalAlpha = .4;
      ST.x.stroke();
      ST.x.globalAlpha = 1;
    }
    ST.x.fillStyle = on ? '#fff' : k('--ink');
    ST.x.textAlign = 'center';
    ST.x.textBaseline = 'middle';
    ST.x.font = '600 12px "IBM Plex Sans",sans-serif';
    if (!SYM[c.t]) T(c.t == 'SUB' ? c.ref : c.t == 'KEY' ? c.l + (c.k ? ' [' + c.k + ']' : '') : c.t == 'CONST' ? c.w > 1 ? '0x' + hx(c.v) : '' + (c.v | 0) : io ? c.w > 1 ? c.l + ' ' + ((c.t == 'OUT' ? c._v : c.v) | 0) : c.l : c.t == 'SPLIT' ? 'DIVIDE' : c.t == 'JOIN' ? 'COLLECT' : c.t == 'DELAY' ? 'DELAY ×' + c.cfg[0] : c.t == 'SEG7' ? '7-SEG' : c.t, c.x + z.w / 2, c.y + (c.t == 'SUB' ? subLay(c).S.T.length + subLay(c).S.B.length ? z.h / 2 : 12 : c.t == 'SPLIT' || c.t == 'JOIN' || PL[c.t] || c.t == 'DEC' || c.t == 'SEG7' ? -8 : z.h / 2));
    if (c.t == 'SUB') {
      const d = ST.P.c[c.ref],
        Ly = subLay(c);
      ST.x.font = '10px "IBM Plex Sans",sans-serif';
      ST.x.fillStyle = k('--mut');
      const lab = (p, id) => {
        const q = Ly.pos[id],
          dr = Ly.dir[id];
        if (dr[0] < 0) {
          ST.x.textAlign = 'left';
          T(p.l, c.x + q[0] + 8, c.y + q[1]);
        } else if (dr[0] > 0) {
          ST.x.textAlign = 'right';
          T(p.l, c.x + q[0] - 8, c.y + q[1]);
        } else {
          ST.x.textAlign = 'center';
          T(p.l, c.x + q[0], c.y + q[1] + (dr[1] < 0 ? 10 : -8));
        }
      };
      Ly.I.forEach((p, i) => lab(p, 'i' + i));
      Ly.O.forEach((p, i) => lab(p, 'o' + i));
    }
    if (c.t == 'SPLIT' || c.t == 'JOIN') {
      ST.x.font = '10px "IBM Plex Sans",sans-serif';
      ST.x.fillStyle = k('--mut');
      let s = 0;
      const o = c.t == 'SPLIT';
      ST.x.textAlign = o ? 'right' : 'left';
      c.cfg.forEach((w, i) => {
        T(w > 1 ? s + w - 1 + ':' + s : '' + s, o ? c.x + z.w - 8 : c.x + 8, c.y + pl(c, i, o)[1]);
        s += w;
      });
    }
    {
      const L = PL[c.t] || c.t == 'DEC' && [['ADDR'], [...Array(c.cfg[0]).keys()]] || c.t == 'SEG7' && [c.cfg[0] == 1 ? ['D'] : ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'dp'], []];
      if (L) {
        ST.x.font = '9px "IBM Plex Sans",sans-serif';
        ST.x.fillStyle = k('--mut');
        ST.x.textAlign = 'left';
        L[0].forEach((q, i) => T(q, c.x + 7, c.y + pl(c, i, 0)[1]));
        ST.x.textAlign = 'right';
        L[1].forEach((q, i) => T(q, c.x + z.w - 7, c.y + pl(c, i, 1)[1]));
      }
      if (c.t == 'REG' || c.t == 'CNT') {
        ST.x.font = '600 12px "IBM Plex Mono",monospace';
        ST.x.fillStyle = k('--ink');
        ST.x.textAlign = 'center';
        T(hx(c._q), c.x + z.w / 2, c.y + z.h / 2);
      }
      if (c.t == 'SEG7') {
        const b = c._b || [],
          X = c.x + 32,
          Y = c.y + z.h / 2 - 38;
        ST.x.fillStyle = '#0a0f14';
        ST.x.fillRect(c.x + 24, Y - 8, 72, 92);
        [[6, 0, 32, 6], [38, 6, 6, 29], [38, 41, 6, 29], [6, 70, 32, 6], [0, 41, 6, 29], [0, 6, 6, 29], [6, 35, 32, 6]].forEach((r, i) => {
          ST.x.fillStyle = b[i] ? '#ff4d3d' : '#3a1a17';
          ST.x.fillRect(X + r[0], Y + r[1], r[2], r[3]);
        });
        ST.x.fillStyle = b[7] ? '#ff4d3d' : '#3a1a17';
        ST.x.beginPath();
        ST.x.arc(X + 52, Y + 73, 3.5, 0, 7);
        ST.x.fill();
      }
    }
    ST.x.restore();
    for (let i = 0; i < z.ni; i++) dot(pp(c, i, 0), iv[c.id + ':' + i]);
    for (let i = 0; i < z.no; i++) dot(pp(c, i, 1), (c._o || [])[i]);
  });
  if (ST.drag && ST.drag.box) {
    ST.x.strokeStyle = k('--hot');
    ST.x.setLineDash([5, 4]);
    ST.x.lineWidth = 1.5;
    ST.x.strokeRect(ST.drag.a[0], ST.drag.a[1], ST.drag.b[0] - ST.drag.a[0], ST.drag.b[1] - ST.drag.a[1]);
    ST.x.setLineDash([]);
  }
  ST.x.restore();
  requestAnimationFrame(draw);
}
/* ---- interaction ---- */
export const pt = e => {
  const r = ST.cv.getBoundingClientRect();
  return [(e.clientX - r.left - ST.V.x) / ST.Z, (e.clientY - r.top - ST.V.y) / ST.Z];
};
export function hit(p) {
  const C = cur();
  for (const c of [...C.comps].reverse()) {
    const z = sp(c);
    for (let i = 0; i < z.no; i++) {
      const q = pp(c, i, 1);
      if (Math.hypot(q[0] - p[0], q[1] - p[1]) < 9 / ST.Z) return {
        c,
        k: 'o',
        i
      };
    }
    for (let i = 0; i < z.ni; i++) {
      const q = pp(c, i, 0);
      if (Math.hypot(q[0] - p[0], q[1] - p[1]) < 9 / ST.Z) return {
        c,
        k: 'i',
        i
      };
    }
    {
      const q = inl(c, p);
      if (q[0] > c.x && q[0] < c.x + z.w && q[1] > c.y && q[1] < c.y + z.h) return {
        c,
        k: 'b'
      };
    }
  }
  return null;
}
export function delSel() {
  if (ST.pv) return;
  const C = cur();
  if (ST.selw) {
    C.wires = C.wires.filter(w => w != ST.selw);
    ST.selw = null;
    kick();
    save();
  } else if (ST.ms.size) {
    const ids = new Set([...ST.ms].map(c => c.id));
    C.comps = C.comps.filter(c => !ids.has(c.id));
    C.wires = C.wires.filter(w => !ids.has(w.a) && !ids.has(w.b));
    ST.ms = new Set();
    ST.sel = null;
    reset();
    save();
    HK.ui();
  }
}
export function copySel() {
  if (!ST.ms.size) return;
  const ids = new Set([...ST.ms].map(c => c.id));
  ST.clip = {
    c: clean([...ST.ms]),
    w: clean(cur().wires.filter(w => ids.has(w.a) && ids.has(w.b)))
  };
  HK.flash('Copied ' + ST.ms.size + ' block(s)');
}
export function paste() {
  if (!ST.clip || ST.pv) return;
  const C = cur(),
    map = {},
    ok = c => c.t != 'SUB' || c.ref != ST.P.cur && ST.P.c[c.ref] && !uses(c.ref, ST.P.cur);
  const n = ST.clip.c.filter(ok).map(c => {
    c = JSON.parse(JSON.stringify(c));
    map[c.id] = ++ST.seq;
    c.id = ST.seq;
    c.x += 30;
    c.y += 30;
    return c;
  });
  C.comps.push(...n);
  ST.clip.w.forEach(w => {
    if (map[w.a] && map[w.b]) {
      const q = JSON.parse(JSON.stringify(w));
      q.a = map[w.a];
      q.b = map[w.b];
      if (q.xs) q.xs = q.xs.map(v => v + 30);
      if (q.ys) q.ys = q.ys.map(v => v + 30);
      C.wires.push(q);
    }
  });
  ST.clip.c.forEach(c => {
    c.x += 30;
    c.y += 30;
  });
  ST.clip.w.forEach(w => {
    if (w.xs) w.xs = w.xs.map(v => v + 30);
    if (w.ys) w.ys = w.ys.map(v => v + 30);
  });
  ST.ms = new Set(n);
  ST.sel = n.length == 1 ? n[0] : null;
  ST.selw = null;
  reset();
  save();
  HK.ui();
  HK.refreshMem();
}
export function keyEv(e, v) {
  if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.ctrlKey || e.metaKey || e.altKey) return 0;
  const kk = e.key == ' ' ? 'space' : e.key.toLowerCase();
  let hit = 0;
  cur().comps.forEach(c => {
    if (c.t == 'KEY' && c.k && c.k.toLowerCase() == kk && (c.v | 0) != v) {
      c.v = v;
      hit = 1;
    }
  });
  if (hit) {
    kick();
    e.preventDefault();
  }
  return hit;
}
export function open(n) {
  if (ST.pv) undoPv();
  ST.P.cur = n;
  ST.sel = null;
  ST.ms = new Set();
  ST.V = {
    x: 0,
    y: 0
  };
  reset();
  HK.ui();
  save();
  ST.K.fs = null;
  HK.ko();
}
export function add(t0) {
  if (ST.pv) return;
  const [t, arg] = t0.split(':'),
    C = cur(),
    n = C.comps.length,
    io = t == 'IN' || t == 'OUT',
    c = {
      id: ++ST.seq,
      t: t[0] == '@' ? 'SUB' : t,
      x: Math.round((40 + n * 30 % 240 - ST.V.x) / ST.Z / 10) * 10,
      y: Math.round((30 + n * 50 % 320 - ST.V.y) / ST.Z / 10) * 10
    };
  if (t[0] == '@') c.ref = t.slice(1);
  if (t == 'IN') {
    c.l = String.fromCharCode(65 + C.comps.filter(a => a.t == 'IN').length % 26);
    c.v = 0;
  }
  if (t == 'OUT') {
    const k = C.comps.filter(a => a.t == 'OUT').length;
    c.l = 'Y' + (k || '');
  }
  if (t == 'CLK') c.v = 0;
  if (t == 'KEY') {
    const q = C.comps.filter(a => a.t == 'KEY').length;
    c.l = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'[q % 36];
    c.k = c.l.toLowerCase();
    c.v = 0;
  }
  if (arg) {
    if (t == 'IN' || t == 'OUT') c.w = +arg;else if (t == 'CONST') {
      c.w = arg == '8' ? 8 : 1;
      c.v = arg == '1' ? 1 : 0;
    } else c.cfg = arg.split(',').map(Number);
  }
  if (t == 'IN' || t == 'OUT') {
    const q = C.comps.filter(a => a.t == t && a.po != null);
    if (q.length) c.po = Math.max(...q.map(a => a.po)) + 1;
  }
  if (t == 'ROM' || t == 'RAM') c.init = Array(16).fill(0);
  C.comps.push(c);
  ST.sel = c;
  ST.ms = new Set([c]);
  ST.selw = null;
  HK.refreshMem();
  reset();
  save();
  HK.ui();
}
export function loadP(o) {
  ST.P = clean(o);
  if (!ST.P.c || !Object.keys(ST.P.c).length) ST.P = {
    cur: 'Main',
    c: {
      Main: {
        comps: [],
        wires: []
      }
    }
  };
  if (!ST.P.c[ST.P.cur]) ST.P.cur = Object.keys(ST.P.c)[0];
  Object.values(ST.P.c).forEach(d => d.comps.forEach(c => ST.seq = Math.max(ST.seq, c.id)));
  open(ST.P.cur);
}
export /* ---- zoom ---- */
function zoomAt(cx, cy, f) {
  const r = ST.cv.getBoundingClientRect(),
    nz = Math.min(3, Math.max(.2, ST.Z * f)),
    px = cx - r.left,
    py = cy - r.top;
  ST.V.x = px - (px - ST.V.x) * nz / ST.Z;
  ST.V.y = py - (py - ST.V.y) * nz / ST.Z;
  ST.Z = nz;
}
export function fit() {
  const C = cur();
  if (!C.comps.length) {
    ST.Z = 1;
    ST.V = {
      x: 0,
      y: 0
    };
    return;
  }
  let a = 1e9,
    b = 1e9,
    c2 = -1e9,
    d = -1e9;
  C.comps.forEach(c => {
    const q = bb(c);
    a = Math.min(a, q[0]);
    b = Math.min(b, q[1]);
    c2 = Math.max(c2, q[2]);
    d = Math.max(d, q[3]);
  });
  const r = ST.cv.getBoundingClientRect();
  ST.Z = Math.min(2, Math.max(.2, Math.min((r.width - 60) / (c2 - a), (r.height - 60) / (d - b))));
  ST.V.x = (r.width - (c2 - a) * ST.Z) / 2 - a * ST.Z;
  ST.V.y = (r.height - (d - b) * ST.Z) / 2 - b * ST.Z;
}
export function edgePan(r) {
  const d = ST.drag;
  if (!d || d.pan || d.wd || d.cx == null) return;
  const M = 40,
    S = 12,
    lx = d.cx - r.left,
    ly = d.cy - r.top;
  let dx = 0,
    dy = 0;
  if (lx < M) dx = S;else if (lx > r.width - M) dx = -S;
  if (ly < M) dy = S;else if (ly > r.height - M) dy = -S;
  if (dx || dy) {
    ST.V.x += dx;
    ST.V.y += dy;
    ST.cv.onpointermove({
      clientX: d.cx,
      clientY: d.cy
    });
  }
}
/* ---- rotate ---- */
export function rotSel() {
  if (ST.pv || !ST.ms.size) return;
  ST.ms.forEach(c => c.r = (c.r | 0) + 1 & 3);
  const I = new Set([...ST.ms].map(c => c.id));
  cur().wires.forEach(w => {
    if (I.has(w.a) || I.has(w.b)) {
      delete w.xs;
      delete w.ys;
    }
  });
  save();
}
export function attach(canvas){
  ST.detach&&ST.detach();ST.cv=canvas;ST.x=canvas.getContext('2d');
  ST.cv.onpointerdown = e => {
    ST.cv.setPointerCapture(e.pointerId);
    const p = pt(e);
    ST.selw = null;
    const pan = () => {
      ST.ms = new Set();
      ST.sel = null;
      HK.refreshMem();
      ST.drag = {
        pan: 1,
        sx: e.clientX,
        sy: e.clientY,
        vx: ST.V.x,
        vy: ST.V.y
      };
    };
    if (ST.pv) {
      pan();
      return;
    }
    const h = hit(p),
      C = cur();
    if (!h) {
      const hw = hitWire(p);
      if (hw) {
        ST.ms = new Set();
        ST.sel = null;
        ST.selw = hw.w;
        ST.drag = {
          wd: hw.w,
          seg: hw.seg
        };
      } else if (e.shiftKey || ST.selMode) ST.drag = {
        box: 1,
        a: p,
        b: p,
        add: e.shiftKey
      };else pan();
    } else if (h.k == 'b') {
      const c = h.c,
        mod = e.shiftKey || e.ctrlKey || e.metaKey;
      if (mod) {
        ST.ms.has(c) ? ST.ms.delete(c) : ST.ms.add(c);
      } else if (!ST.ms.has(c)) ST.ms = new Set([c]);
      ST.sel = ST.ms.size == 1 ? [...ST.ms][0] : null;
      HK.refreshMem();
      ST.drag = {
        m: [...ST.ms].map(q => [q, p[0] - q.x, p[1] - q.y]),
        c,
        mod
      };
      if (c.t == 'KEY' && !mod) {
        c.v = 1;
        ST.drag.key = c;
        kick();
      }
      if (ST.sel && ST.sel.t == 'SUB') {
        HK.pinsUI();
        HK.selectTab('pn');
      }
    } else if (h.k == 'i') {
      const w = C.wires.find(w => w.b == h.c.id && w.j == h.i),
        A = w && C.comps.find(c => c.id == w.a);
      if (w && A) {
        C.wires = C.wires.filter(q => q != w);
        ST.drag = {
          w: {
            c: A,
            k: 'o',
            i: w.i
          },
          p,
          sx: p[0],
          sy: p[1],
          re: w
        };
      } else ST.drag = {
        w: h,
        p,
        sx: p[0],
        sy: p[1]
      };
    } else ST.drag = {
      w: h,
      p,
      sx: p[0],
      sy: p[1]
    };
    if (ST.drag) {
      ST.drag.cx = e.clientX;
      ST.drag.cy = e.clientY;
    }
  };
  ST.cv.onpointermove = e => {
    if (!ST.drag) return;
    const p = pt(e);
    ST.drag.cx = e.clientX;
    ST.drag.cy = e.clientY;
    if (ST.drag.pan) {
      ST.V.x = ST.drag.vx + e.clientX - ST.drag.sx;
      ST.V.y = ST.drag.vy + e.clientY - ST.drag.sy;
    } else if (ST.drag.wd) dragWire(ST.drag, p);else if (ST.drag.box) ST.drag.b = p;else if (ST.drag.m) {
      const sn = v => Math.round(v / 10) * 10,
        c0 = ST.drag.m[0][0],
        ox = c0.x,
        oy = c0.y;
      ST.drag.m.forEach(([c, dx, dy]) => {
        const nx = sn(p[0] - dx),
          ny = sn(p[1] - dy);
        if (nx != c.x || ny != c.y) ST.drag.mv = 1;
        c.x = nx;
        c.y = ny;
      });
      const dx = c0.x - ox,
        dy = c0.y - oy;
      if (dx || dy) {
        const I = new Set(ST.drag.m.map(q => q[0].id));
        cur().wires.forEach(w => {
          if (I.has(w.a) && I.has(w.b)) {
            if (w.xs) w.xs = w.xs.map(v => v + dx);
            if (w.ys) w.ys = w.ys.map(v => v + dy);
          }
        });
      }
    } else ST.drag.p = p;
  };
  ST.cv.onpointerup = e => {
    if (!ST.drag) return;
    const p = pt(e),
      C = cur(),
      d = ST.drag;
    ST.drag = null;
    if (d.pan) return;
    if (d.wd) {
      save();
      return;
    }
    if (d.box) {
      const x0 = Math.min(d.a[0], p[0]),
        x1 = Math.max(d.a[0], p[0]),
        y0 = Math.min(d.a[1], p[1]),
        y1 = Math.max(d.a[1], p[1]);
      if (!d.add) ST.ms = new Set();
      C.comps.forEach(c => {
        const b = bb(c);
        if (b[0] < x1 && b[2] > x0 && b[1] < y1 && b[3] > y0) ST.ms.add(c);
      });
      ST.sel = ST.ms.size == 1 ? [...ST.ms][0] : null;
      HK.refreshMem();
      HK.flash(ST.ms.size + ' selected – drag to move, R rotates, Ctrl+C / Ctrl+V copies, Delete removes');
      return;
    }
    let tg = 0;
    if (d.key) {
      d.key.v = 0;
      tg = 1;
    }
    if (d.m) {
      const c = d.c;
      if (!d.mv && !d.mod && (c.t == 'IN' || c.t == 'CLK')) c.v = c.w > 1 ? (c.v | 0) + (e.altKey ? -1 : 1) & (1 << c.w) - 1 : c.v ^ 1;
      if (!d.mv && !d.mod && (c.t == 'IN' || c.t == 'CLK')) tg = 1;
      if (tg) kick();
      if (tg || d.mv) save();
    } else if (d.w) {
      const h = hit(p),
        s = d.w,
        mv = Math.hypot(p[0] - d.sx, p[1] - d.sy) >= 4;
      if (h && h.k != 'b' && h.k != s.k) {
        const o = s.k == 'o' ? s : h,
          i = s.k == 'o' ? h : s;
        C.wires = C.wires.filter(w => !(w.b == i.c.id && w.j == i.i));
        C.wires.push({
          a: o.c.id,
          i: o.i,
          b: i.c.id,
          j: i.i
        });
      } else if (d.re && !mv) C.wires.push(d.re);
      kick();
      save();
    }
  };
  ST.cv.ondblclick = e => {
    const h = hit(pt(e));
    if (!h) {
      const hw = hitWire(pt(e));
      if (hw) bend(hw, pt(e));
      return;
    }
    if (h.k != 'b') return;
    const c = h.c;
    if (c.t == 'SUB') open(c.ref);else if (c.t == 'IN' || c.t == 'OUT') {
      try {
        const n = prompt('Pin name,width (1-8) e.g. DATA,8', c.l + ',' + (c.w || 1));
        if (n) {
          const [a, w] = n.split(',');
          c.l = a.slice(0, 8);
          c.w = Math.min(8, Math.max(1, +w || 1));
        }
      } catch (_) {}
      reset();
      save();
    } else if (c.t == 'CONST') {
      if (c.w > 1) {
        try {
          const n = prompt('Constant value (decimal or 0x hex)', c.v);
          const v = Number(n);
          if (n != null && !isNaN(v)) c.v = Math.max(0, Math.min((1 << c.w) - 1, v | 0));
        } catch (_) {}
      } else c.v ^= 1;
      kick();
      save();
    } else if (c.t == 'DELAY') {
      try {
        const n = prompt('Delay in gate-delay ticks (1-30)', c.cfg[0]);
        if (n) c.cfg = [Math.min(30, Math.max(1, +n || 1))];
      } catch (_) {}
      reset();
      save();
    } else if (c.t == 'SPLIT' || c.t == 'JOIN') {
      try {
        const n = prompt('Piece widths, lowest bits first (total up to 8), e.g. 4,4', c.cfg);
        if (n) {
          const q = n.split(',').map(Number).filter(v => v >= 1);
          if (q.length && q.length <= 8 && q.reduce((a, b) => a + b) <= 8) {
            c.cfg = q;
            const z = sp(c),
              C = cur();
            C.wires = C.wires.filter(w => !(w.a == c.id && w.i >= z.no) && !(w.b == c.id && w.j >= z.ni));
          }
        }
      } catch (_) {}
      reset();
      save();
    }
  };
  const wheel=e => {
  e.preventDefault();
  zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.1 : 1 / 1.1);
};canvas.addEventListener('wheel',wheel,{passive:false});
  const kd=e => {
  if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || keyEv(e, 1)) return;
  const k = e.key.toLowerCase(),
    mod = e.ctrlKey || e.metaKey;
  if (k == 'delete' || k == 'backspace') delSel();else if (k == 'r' && !mod) rotSel();else if (k == 'escape' && ST.pv) undoPv();else if (mod && k == 'c') copySel();else if (mod && k == 'v') paste();else if (mod && k == 'd') {
    e.preventDefault();
    copySel();
    paste();
  } else if (mod && k == 'a') {
    e.preventDefault();
    ST.ms = new Set(cur().comps);
    ST.sel = null;
  }
},ku=e => keyEv(e, 0);
  window.addEventListener('keydown',kd);window.addEventListener('keyup',ku);
  ST.detach=()=>{canvas.removeEventListener('wheel',wheel);window.removeEventListener('keydown',kd);window.removeEventListener('keyup',ku)};
  if(!ST.started){ST.started=true;draw()}
  return ST.detach;
}

