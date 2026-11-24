import { useEffect, useState } from 'react';
import { add, cur, enc, ex, fmt, kick, mk, open, pins, reset, save, ST, un } from '../engine/index.js';
import { minimalForms } from '../debug/kmap.js';
import { useT } from '../i18n/index.jsx';
import { bump, useEngine, useTick } from '../ui/store.js';

export default function KeysPanel() {
  useEngine(); useTick(300);
  const { t } = useT();
  const C = cur(), keys = pins(C, 'KEY'), outs = pins(C, 'OUT');
  const [n, setN] = useState(10), [m, setM] = useState(4), [mins, setMins] = useState(null);
  useEffect(() => { const up = () => keys.forEach((k) => { if (k._held) { k._held = false; k.v = 0; kick(); } }); window.addEventListener('pointerup', up); return () => window.removeEventListener('pointerup', up); });
  const press = (k) => { k.v = 1; k._held = true; kick(); bump(); };
  const sig = JSON.stringify(C.wires.map((w) => [w.a, w.i, w.b, w.j])) + C.comps.map((c) => c.id + c.t).join();
  const build = () => {
    const E = enc(Math.min(16, Math.max(2, n)), Math.min(8, Math.max(1, m))), o = {};
    E.q.forEach((r, b) => { o['Q' + b] = r; }); o.ANY = E.any;
    open(mk(un('KeypadEncoder'), E.ins, E.nodes, o));
  };
  const eq = (o) => { const w = C.wires.find((q) => q.b === o.id); ST.exN = 0; return w ? fmt(ex(C, w.a, w.i, null, [])) : '0'; };
  return (
    <div>
      <div className="row"><button onClick={() => add('KEY')}>{t('ky.add')}</button></div>
      <small>{t('ky.help')}</small>
      {!keys.length && <p>{t('ky.none')}</p>}
      {keys.map((k) => (
        <div className="row" key={k.id}>
          <button className={'ctl-btn' + (k.v ? ' on' : '')} onPointerDown={() => press(k)}>{k.l}</button>
          <input size="5" value={k.l} aria-label={t('ky.label')} onChange={(e) => { k.l = e.target.value.slice(0, 6); save(); bump(); }} />
          <input size="6" value={k.k || ''} placeholder={t('ky.bound')} aria-label={t('ky.bound')} onChange={(e) => { k.k = e.target.value.slice(0, 8); save(); bump(); }} />
          <button aria-label="remove" onClick={() => { const cc = cur(); cc.comps = cc.comps.filter((q) => q !== k); cc.wires = cc.wires.filter((w) => w.a !== k.id && w.b !== k.id); ST.ms = new Set(); reset(); save(); bump(); }}>×</button>
        </div>))}
      <div className="row">{t('ky.enc')} <input type="number" size="3" min="2" max="16" value={n} onChange={(e) => setN(+e.target.value)} style={{ width: 54 }} /> {t('ky.outs')} <input type="number" min="1" max="8" value={m} onChange={(e) => setM(+e.target.value)} style={{ width: 50 }} /><button onClick={build}>{t('ky.build')}</button></div>
      <div className="row"><b>{t('ky.logic')}</b><button onClick={() => setMins({ sig, f: minimalForms(C) })}>{t('ky.simplify')}</button></div>
      {!outs.length && <small>{t('ky.noOut')}</small>}
      {outs.map((o) => (
        <div className="eq" key={o.id}><b>{o.l}</b> <span className="v">{o.w > 1 ? o._v | 0 : o._v ? 1 : 0}</span> = {eq(o)}
          {mins && mins.sig === sig && mins.f && mins.f[o.id] != null && <><br /><small>{t('ky.min')}: {mins.f[o.id]}</small></>}</div>))}
    </div>
  );
}
