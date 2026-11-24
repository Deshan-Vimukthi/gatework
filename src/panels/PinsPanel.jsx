import { P_, ST, reorder, save, reset, subLay, pins, cur } from '../engine/index.js';
import { useT } from '../i18n/index.jsx';
import { bump, useEngine } from '../ui/store.js';

export default function PinsPanel() {
  useEngine();
  const { t } = useT();
  const name = ST.sel && ST.sel.t === 'SUB' && P_(ST.sel.ref) ? ST.sel.ref : ST.P.cur, D = P_(name);
  if (!D) return null;
  const I = pins(D, 'IN'), O = pins(D, 'OUT'), L = subLay({ ref: name });
  const edit = (fn) => { fn(); reset(); save(); bump(); };
  const pin = (p, id) => {
    const q = L.pos[id], d = L.dir[id];
    return (<g key={id}><circle cx={q[0]} cy={q[1]} r="4.5" fill={id[0] === 'i' ? 'var(--ink)' : 'var(--on)'} />
      <text x={q[0] + d[0] * 9} y={q[1] + (d[1] < 0 ? -8 : d[1] > 0 ? 16 : 4)} textAnchor={d[0] < 0 ? 'end' : d[0] > 0 ? 'start' : 'middle'} fontSize="10" fill="var(--mut)">{p.l}</text></g>);
  };
  const row = (c, type, i, n) => (
    <div className="pr" key={c.id}>
      <b>{t(type === 'IN' ? 'pn.in' : 'pn.out')}</b>
      <input value={c.l} aria-label="name" onChange={(e) => edit(() => { c.l = e.target.value.slice(0, 8); })} />
      <select value={c.w || 1} aria-label="width" onChange={(e) => edit(() => { c.w = +e.target.value; })}>{[1, 2, 4, 8].map((v) => <option key={v}>{v}</option>)}</select>
      <select value={c.sd || (type === 'IN' ? 'L' : 'R')} aria-label="side" onChange={(e) => edit(() => { c.sd = e.target.value; })}>{['L', 'T', 'B', 'R'].map((v) => <option key={v} value={v}>{t('pn.' + v)}</option>)}</select>
      <button disabled={!i} aria-label="up" onClick={() => reorder(name, type, c.id, -1)}>▲</button>
      <button disabled={i >= n - 1} aria-label="down" onClick={() => reorder(name, type, c.id, 1)}>▼</button>
    </div>);
  return (
    <div>
      <p><b>{name}</b>{name === ST.P.cur ? ' •' : ''}</p>
      <svg viewBox={`-60 -26 ${L.w + 120} ${L.h + 52}`} role="img" aria-label="block pin layout" style={{ width: '100%', maxHeight: 230 }}>
        <rect x="0" y="0" width={L.w} height={L.h} rx="6" fill="var(--g)" stroke="var(--ink)" strokeWidth="2" />
        <text x={L.w / 2} y={L.h / 2} textAnchor="middle" dominantBaseline="middle" fontSize="12" fontWeight="600" fill="var(--ink)">{name}</text>
        {I.map((p, i) => pin(p, 'i' + i))}{O.map((p, i) => pin(p, 'o' + i))}
      </svg>
      {I.map((c, i) => row(c, 'IN', i, I.length))}{O.map((c, i) => row(c, 'OUT', i, O.length))}
      <small>{t('pn.help')}</small>
    </div>
  );
}
