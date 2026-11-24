import { useRef, useState } from 'react';
import { ST, HK, circuitUses, deleteCircuit, newCircuit, open, renameCircuit } from '../engine/index.js';
import { useT } from '../i18n/index.jsx';
import { useEngine } from './store.js';

export default function CircuitBar() {
  useEngine();
  const { t } = useT();
  const [edit, setEdit] = useState(null), [armed, setArmed] = useState(false), timer = useRef(0);
  const names = Object.keys(ST.P.c), n = ST.P.cur;
  const del = () => {
    if (names.length < 2) return HK.flash(t('cb.last'));
    if (!armed) { setArmed(true); timer.current = setTimeout(() => setArmed(false), 4000); return; }
    clearTimeout(timer.current); setArmed(false); deleteCircuit(n);
  };
  return (
    <div id="bar">
      <nav id="tabs" aria-label="circuits">
        {names.map((k) => (edit === k
          ? <input key={k} autoFocus defaultValue={k} aria-label={t('cb.rename')} onBlur={(e) => { renameCircuit(k, e.target.value); setEdit(null); }} onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') setEdit(null); }} />
          : <button key={k} className={k === n ? 'on' : ''} onClick={() => (k === n ? setEdit(k) : open(k))} title={k === n ? t('cb.rename') : ''}>{k}</button>))}
      </nav>
      <button onClick={() => newCircuit()}>{t('cb.new')}</button>
      <button onClick={del}>{armed ? t('cb.confirm', { n }) + (circuitUses(n) ? ` (+${circuitUses(n)})` : '') : t('cb.del')}</button>
    </div>
  );
}
