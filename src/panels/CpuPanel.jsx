import { useEffect, useRef, useState } from 'react';
import { ST, asm, cstep } from '../engine/index.js';
import { useT } from '../i18n/index.jsx';
import { useTick } from '../ui/store.js';

const SAMPLE = `; diagonal line on the 8x8 screen
  LDB 0xF8      ; B points at screen row 0
  LDI 1         ; A = one lit pixel
next:
  STX           ; mem[B] = A
  SHL           ; move pixel left
  INB           ; B = B + 1 (wraps to 0 after 0xFF)
  JNZ next      ; Z flag set when B wrapped
  HLT`;
const hx = (v) => v.toString(16).toUpperCase().padStart(2, '0');

export default function CpuPanel() {
  const { t } = useT();
  const [src, setSrc] = useState(SAMPLE), [msg, setMsg] = useState(''), [run, setRun] = useState(false);
  const cv = useRef(null);
  useTick(80, true);
  useEffect(() => {
    if (!run) return undefined;
    const id = setInterval(() => { for (let i = 0; i < 4; i++) cstep(); if (ST.CPU.h) setRun(false); }, 40);
    return () => clearInterval(id);
  }, [run]);
  const S = ST.CPU;
  useEffect(() => {
    const g = cv.current && cv.current.getContext && cv.current.getContext('2d');
    if (!g) return;
    g.clearRect(0, 0, 8, 8); g.fillStyle = '#3ddc84';
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if ((S.m[248 + r] >> (7 - c)) & 1) g.fillRect(c, r, 1, 1);
  });
  let dump = `PC ${hx(S.pc)}  A ${hx(S.a)}  B ${hx(S.b)}  Z${S.z} C${S.c} ${S.h ? 'HALTED' : 'RUNNING'}\n`;
  for (let r = 0; r < 16; r++) dump += hx(r * 16) + ': ' + [...S.m.slice(r * 16, r * 16 + 16)].map(hx).join(' ') + '\n';
  return (
    <div>
      <textarea className="code" rows="12" spellCheck="false" value={src} onChange={(e) => setSrc(e.target.value)} aria-label="assembly" />
      <div className="row">
        <button onClick={() => { try { ST.CPU = { m: asm(src), pc: 0, a: 0, b: 0, z: 0, c: 0, h: 0 }; setMsg(t('cpu.ok')); } catch (e) { setMsg('Error: ' + e); } }}>{t('cpu.asm')}</button>
        <button onClick={() => cstep()}>{t('cpu.step')}</button>
        <button onClick={() => setRun(!run)}>{run ? t('cpu.pause') : t('cpu.run')}</button>
      </div>
      <p>{msg}</p>
      <canvas ref={cv} width="8" height="8" className="screen" aria-label="8x8 screen" />
      <pre>{dump}</pre>
      <small>{t('cpu.ref')}</small>
    </div>
  );
}
