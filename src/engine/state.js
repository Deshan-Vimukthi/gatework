// Shared mutable engine state (single source of truth) and UI hooks.
export const ST = {
  cv: null,
  x: null,
  P: null,
  sel: null,
  selw: null,
  ms: new Set(),
  selMode: 0,
  Z: 1,
  seq: 1,
  drag: null,
  V: {
  x: 0,
  y: 0
},
  slow: 0,
  tm: 0,
  lastS: '',
  nn: 0,
  clip: null,
  ck: 0,
  K: {
  n: 3,
  v: Array(8).fill(0),
  nm: ['A', 'B', 'C', 'D'],
  fs: null
},
  CPU: {
  m: new Uint8Array(256),
  pc: 0,
  a: 0,
  b: 0,
  z: 0,
  c: 0,
  h: 1
},
  run: 0,
  mt: 0,
  kpd: null,
  minMap: {},
  exN: 0,
  pinT: '',
  pv: null,
  dcT: 0,
  started: false,
  detach: null,
};
const noop = () => {};
export const HK = { changed: noop, flash: noop, ui: noop, keysUI: noop, pinsUI: noop, refreshMem: noop, logic: noop, kmap: noop, ko: noop, cshow: noop, slotUI: noop, kbSync: noop, selectTab: noop, preview: noop, plOn: () => false, memOn: () => false };
