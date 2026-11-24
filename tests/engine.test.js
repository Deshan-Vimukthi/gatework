import { describe, it, expect, beforeEach } from 'vitest';
import * as E from '../src/engine/index.js';

const out = (C) => Object.fromEntries(E.pins(C, 'OUT').map((o) => [o.l, o._v | 0]));
beforeEach(() => { E.ST.P = E.defaultProject(); E.ST.seq = 1; });

describe('simulation', () => {
  it('adds 8-bit numbers through nested sub-circuits', () => {
    E.open(E.EX['8-bit adder']());
    const C = E.cur();
    const set = (l, v) => { C.comps.find((c) => c.l === l).v = v; };
    set('A0', 1); set('A1', 1); set('B0', 1); set('B1', 1); // 3 + 3
    E.settle(C);
    expect(out(C)).toMatchObject({ S0: 0, S1: 1, S2: 1, S3: 0 });
  });
  it('steps a counter -> ROM sequencer on clock edges', () => {
    E.open(E.EX['Counter to ROM sequencer']());
    const C = E.cur(), clk = C.comps.find((c) => c.l === 'CLK');
    for (let i = 0; i < 4; i++) { clk.v ^= 1; E.settle(C); }
    expect(out(C)).toEqual({ ADDR: 2, DATA: 0xa5 });
  });
  it('drives the 7-segment display from keys', () => {
    E.open(E.EX['Keypad to 7-segment']());
    const C = E.cur(), key = C.comps.find((c) => c.t === 'KEY' && c.l === '5');
    key.v = 1; E.settle(C);
    expect(C.comps.find((c) => c.t === 'SEG7')._b.join('')).toBe('10110110');
  });
});

describe('logic tools', () => {
  it('minimises a Karnaugh map', () => {
    E.ST.K.nm = ['A', 'B', 'C'];
    const pr = E.qm(3, [1, 3, 5, 7], []); // F = C
    expect(pr.map(E.term).join('+')).toBe('C');
  });
  it('extracts readable equations', () => {
    E.open(E.EX['Full adder']());
    const C = E.cur(), o = E.pins(C, 'OUT')[0], w = C.wires.find((q) => q.b === o.id);
    expect(E.fmt(E.ex(C, w.a, w.i, null, []))).toBe('A ⊕ B ⊕ Cin');
  });
  it('arranges with no overlapping blocks', () => {
    E.open(E.EX['8-bit adder']());
    const C = E.cur();
    C.comps.forEach((c, i) => { c.x = (i * 137) % 900; c.y = (i * 211) % 700; });
    E.layout(C);
    const B = C.comps.map(E.bb);
    let n = 0;
    for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) if (B[i][0] < B[j][2] && B[i][2] > B[j][0] && B[i][1] < B[j][3] && B[i][3] > B[j][1]) n++;
    expect(n).toBe(0);
  });
});

describe('files', () => {
  it('round-trips a zip of JSON files', async () => {
    const blob = E.zip([['a.json', '{"x":1}'], ['circuits/b.json', '{"y":"é"}']]);
    const files = await E.unzip(new Uint8Array(await blob.arrayBuffer()));
    expect(files).toEqual([['a.json', '{"x":1}'], ['circuits/b.json', '{"y":"é"}']]);
  });
});
