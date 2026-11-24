import { useEffect, useRef } from 'react';
import { ST, applyPv, attach, fit, undoPv, zoomAt } from '../engine/index.js';
import { useT } from '../i18n/index.jsx';
import { ui, useEngine } from './store.js';

export default function CanvasView() {
  useEngine();
  const { t } = useT();
  const ref = useRef(null);
  useEffect(() => attach(ref.current), []);
  const mid = () => { const r = ref.current.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
  return (
    <div id="cv">
      <canvas id="c" ref={ref} role="application" aria-label="circuit canvas" />
      {ui.pv && (
        <div id="pvb" role="status"><span>{t('pv.text', { a: ui.pv.before, b: ui.pv.after })}</span>
          <button onClick={applyPv}>{t('pv.apply')}</button><button onClick={undoPv}>{t('pv.cancel')}</button></div>)}
      <div id="zc">
        <button aria-label="zoom out" onClick={() => zoomAt(...mid(), 0.8)}>−</button>
        <button aria-label="reset zoom" onClick={() => zoomAt(...mid(), 1 / ST.Z)}>{Math.round(ST.Z * 100)}%</button>
        <button aria-label="zoom in" onClick={() => zoomAt(...mid(), 1.25)}>+</button>
        <button onClick={fit}>{t('zoom.fit')}</button>
      </div>
      <div id="hint">{t('cv.hint')}</div>
    </div>
  );
}
