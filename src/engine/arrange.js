// Layout preview: shows an optimised layout without touching the user's circuit until Apply.
import { ST, HK } from './state.js';
import { cur, save } from './model.js';
import { crossings, layout } from './layout.js';
import { fit } from './editor.js';

export function arrange() {
  const C = cur();
  if (ST.pv || !C.comps.length) return;
  const before = crossings(C);
  ST.pv = { c: C.comps.map((c) => [c, c.x, c.y, c.r]), w: C.wires.map((w) => [w, w.xs && [...w.xs], w.ys && [...w.ys]]), vx: ST.V.x, vy: ST.V.y, z: ST.Z };
  layout(C);
  const after = crossings(C);
  fit(); ST.selw = null; ST.ms = new Set(); ST.sel = null;
  HK.preview({ before, after });
}
export function undoPv() {
  const pv = ST.pv;
  if (!pv) return;
  pv.c.forEach(([c, x, y, r]) => { c.x = x; c.y = y; c.r = r; });
  pv.w.forEach(([w, xs, ys]) => { w.xs = xs; w.ys = ys; });
  ST.V.x = pv.vx; ST.V.y = pv.vy; ST.Z = pv.z; ST.pv = null;
  HK.preview(null);
}
export function applyPv() { ST.pv = null; save(); HK.preview(null); }
