import { ST, HK } from './state.js';


export const OP = 'NOP LDI LDA STA ADD SUB AND OR XOR JMP JZ JNZ SHL SHR NOT HLT LDB INB STX DEB JC ADDI SUBI'.split(' ');
export const OPN = new Set('LDI LDA STA ADD SUB AND OR XOR JMP JZ JNZ LDB JC ADDI SUBI'.split(' '));
export function asm(src) {
  const L = {},
    it = [];
  let a = 0;
  src.split('\n').map(l => l.replace(/;.*/, '').trim()).filter(Boolean).forEach(l => {
    let m;
    while (m = l.match(/^(\w+):\s*(.*)/)) {
      L[m[1]] = a;
      l = m[2];
    }
    if (!l) return;
    const [w, ...r] = l.split(/[\s,]+/),
      u = w.toUpperCase();
    if (u == '.DB') {
      it.push(['.', r]);
      a += r.length;
    } else {
      if (!OP.includes(u)) throw 'Unknown instruction ' + w;
      it.push([u, r]);
      a += OPN.has(u) ? 2 : 1;
    }
  });
  const val = s => {
      const v = s in L ? L[s] : Number(s);
      if (s === undefined || isNaN(v)) throw 'Bad operand ' + s;
      return v & 255;
    },
    mem = new Uint8Array(256);
  a = 0;
  it.forEach(([u, r]) => {
    if (u == '.') r.forEach(v => mem[a++] = val(v));else {
      mem[a++] = OP.indexOf(u);
      if (OPN.has(u)) mem[a++] = val(r[0]);
    }
  });
  return mem;
}
export function cstep() {
  if (ST.CPU.h) return;
  const m = ST.CPU.m,
    op = OP[m[ST.CPU.pc++ & 255]],
    n = OPN.has(op) ? m[ST.CPU.pc++ & 255] : 0;
  const f = v => {
    ST.CPU.c = v > 255 || v < 0 ? 1 : 0;
    ST.CPU.a = v & 255;
    ST.CPU.z = +!ST.CPU.a;
  };
  let c;
  switch (op) {
    case 'LDI':
      ST.CPU.a = n;
      ST.CPU.z = +!n;
      break;
    case 'LDA':
      ST.CPU.a = m[n];
      ST.CPU.z = +!ST.CPU.a;
      break;
    case 'STA':
      m[n] = ST.CPU.a;
      break;
    case 'ADD':
      f(ST.CPU.a + m[n]);
      break;
    case 'SUB':
      f(ST.CPU.a - m[n]);
      break;
    case 'AND':
      f(ST.CPU.a & m[n]);
      break;
    case 'OR':
      f(ST.CPU.a | m[n]);
      break;
    case 'XOR':
      f(ST.CPU.a ^ m[n]);
      break;
    case 'ADDI':
      f(ST.CPU.a + n);
      break;
    case 'SUBI':
      f(ST.CPU.a - n);
      break;
    case 'JMP':
      ST.CPU.pc = n;
      break;
    case 'JZ':
      if (ST.CPU.z) ST.CPU.pc = n;
      break;
    case 'JNZ':
      if (!ST.CPU.z) ST.CPU.pc = n;
      break;
    case 'JC':
      if (ST.CPU.c) ST.CPU.pc = n;
      break;
    case 'SHL':
      c = ST.CPU.a >> 7;
      f(ST.CPU.a << 1);
      ST.CPU.c = c;
      break;
    case 'SHR':
      c = ST.CPU.a & 1;
      f(ST.CPU.a >> 1);
      ST.CPU.c = c;
      break;
    case 'NOT':
      f(255 - ST.CPU.a);
      break;
    case 'HLT':
      ST.CPU.h = 1;
      break;
    case 'LDB':
      ST.CPU.b = n;
      break;
    case 'INB':
      ST.CPU.b = ST.CPU.b + 1 & 255;
      ST.CPU.z = +!ST.CPU.b;
      break;
    case 'DEB':
      ST.CPU.b = ST.CPU.b - 1 & 255;
      ST.CPU.z = +!ST.CPU.b;
      break;
    case 'STX':
      m[ST.CPU.b] = ST.CPU.a;
      break;
    case 'NOP':
      break;
    default:
      ST.CPU.h = 1;
  }
}
