import { ST, open, qm, term } from '../engine/index.js';
import { useT } from '../i18n/index.jsx';
import { bump, useEngine } from '../ui/store.js';
import { buildSimplified, readCircuit } from '../debug/kmap.js';

const COL = ['#e8590c', '#1f5fbf', '#9333ea', '#0f9d58', '#d6336c', '#b08900'];
export default function KMapPanel() {
  useEngine();
  const { t } = useT();
  const K = ST.K, n = K.n, rb = n >> 1, cb = n - rb, gr = (k) => k ^ (k >> 1), bin = (v, l) => v.toString(2).padStart(l, '0');
  const on = [], dc = [];
  K.v.forEach((v, m) => { if (v === 1) on.push(m); else if (v === 2) dc.push(m); });
  const pr = qm(n, on, dc);
  const [err, setErr] = [K.err, (e) => { K.err = e; bump(); }];
  return (
    <div>
      <p>{t('k.hint')}</p>
      <div className="row">
        {t('k.vars')}
        <select value={n} onChange={(e) => { K.n = +e.target.value; K.v = Array(1 << K.n).fill(0); K.fs = null; bump(); }}>{[2, 3, 4].map((v) => <option key={v}>{v}</option>)}</select>
        <button onClick={() => setErr(readCircuit() ? '' : t('k.err'))}>{t('k.read')}</button>
        {K.fs && K.fs.length > 1 && <select onChange={(e) => { K.v = K.fs[+e.target.value].v.slice(); bump(); }}>{K.fs.map((f, i) => <option key={i} value={i}>{f.l}</option>)}</select>}
      </div>
      {err && <p className="bad">{err}</p>}
      <table className="km"><tbody>
        <tr><th>{K.nm.slice(0, rb).join('')} \ {K.nm.slice(rb, n).join('')}</th>{Array.from({ length: 1 << cb }, (_, c) => <th key={c}>{bin(gr(c), cb)}</th>)}</tr>
        {Array.from({ length: 1 << rb }, (_, r) => (
          <tr key={r}><th>{bin(gr(r), rb)}</th>
            {Array.from({ length: 1 << cb }, (_, c) => {
              const m = (gr(r) << cb) | gr(c);
              return (
                <td key={c} onClick={() => { K.v[m] = (K.v[m] + 1) % 3; bump(); }} role="button" tabIndex={0} aria-label={`m${m}`}>
                  {'01X'[K.v[m]]}<br />{K.v[m] ? pr.map((p, i) => (p.cov(m) ? <i key={i} style={{ background: COL[i % 6] }} /> : null)) : null}
                </td>);
            })}
          </tr>))}
      </tbody></table>
      <p className="eqn">F = {on.length ? pr.map((p, i) => <span key={i} style={{ color: COL[i % 6] }}>{i ? ' + ' : ''}{term(p) || '1'}</span>) : '0'}</p>
      <button onClick={() => open(buildSimplified(n, K.nm, pr))}>{t('k.build')}</button>
    </div>
  );
}
