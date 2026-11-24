import { kick, save } from '../engine/index.js';
import { useT } from '../i18n/index.jsx';
import { ST } from '../engine/index.js';
import { bump, useEngine, useTick } from '../ui/store.js';

const hx = (v) => (v | 0).toString(16).toUpperCase().padStart(2, '0');
export default function MemoryPanel() {
  useEngine(); useTick(200);
  const { t } = useT();
  const c = ST.sel && (ST.sel.t === 'ROM' || ST.sel.t === 'RAM') ? ST.sel : null;
  if (!c) return <p>{t('m.hint')}</p>;
  c.init = c.init || Array(16).fill(0);
  return (
    <div>
      <p><b>{c.t}</b></p>
      <div className="memgrid">
        {c.init.map((v, i) => (
          <label key={i}>{i.toString(16).toUpperCase()}
            <input maxLength="2" defaultValue={hx(c._m ? c._m[i] : v)} key={i + ':' + (c._m ? c._m[i] : v)}
              onBlur={(e) => { const n = parseInt(e.target.value, 16) || 0; c.init[i] = n; if (c._m) c._m[i] = n; save(); kick(); bump(); }} />
          </label>))}
      </div>
    </div>
  );
}
