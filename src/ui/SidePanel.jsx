import { lazy, Suspense } from 'react';
import { useT } from '../i18n/index.jsx';
import { bump, ui, useEngine } from './store.js';

const PANELS = {
  ctl: lazy(() => import('../panels/ControlPanel.jsx')),
  kmap: lazy(() => import('../panels/KMapPanel.jsx')),
  cpu: lazy(() => import('../panels/CpuPanel.jsx')),
  mem: lazy(() => import('../panels/MemoryPanel.jsx')),
  keys: lazy(() => import('../panels/KeysPanel.jsx')),
  pins: lazy(() => import('../panels/PinsPanel.jsx')),
  git: lazy(() => import('../panels/GitPanel.jsx')),
};
export default function SidePanel() {
  useEngine();
  const { t } = useT();
  const Active = PANELS[ui.tab] || PANELS.ctl;
  return (
    <section id="side">
      <div className="tabs" role="tablist">
        {Object.keys(PANELS).map((k) => <button key={k} role="tab" aria-selected={ui.tab === k} className={ui.tab === k ? 'on' : ''} onClick={() => { ui.tab = k; bump(); }}>{t('tab.' + k)}</button>)}
      </div>
      <div className="panel" role="tabpanel"><Suspense fallback={null}><Active /></Suspense></div>
    </section>
  );
}
