import { useState } from 'react';
import { cur, kick, pins, save, settle, sp, P_ } from '../engine/index.js';
import { bruteForce, bfSig, comboCount, ctlList, getUI, judge, monList, readInputs, readMonitors, runCase, runTests, setInputs, toCSV, widthOf } from '../debug/probe.js';
import { downloadFile } from '../git/download.js';
import { useT } from '../i18n/index.jsx';
import { bump, useEngine, useTick } from '../ui/store.js';

const HEX7 = [0x3f, 0x06, 0x5b, 0x4f, 0x66, 0x6d, 0x7d, 0x07, 0x7f, 0x6f, 0x77, 0x7c, 0x39, 0x5e, 0x79, 0x71];
const touch = () => { save(); bump(); };
const fmtVal = (v, look, w) => (look === 'hex' ? '0x' + v.toString(16).toUpperCase() : look === 'bin' ? v.toString(2).padStart(w, '0') : String(v));

/* ---------- controller widgets ---------- */
function Control({ c, look }) {
  const w = widthOf(c), max = (1 << w) - 1, v = c.v | 0;
  const set = (n) => { c.v = n & max; kick(); bump(); };
  const hold = { onPointerDown: () => set(1), onPointerUp: () => set(0), onPointerLeave: () => v && set(0), onPointerCancel: () => set(0) };
  if (c.t === 'KEY') return <button className={'ctl-btn' + (v ? ' on' : '')} {...hold}>{c.l}</button>;
  if (w > 1) {
    if (look === 'number') return <input type="number" min="0" max={max} value={v} onChange={(e) => set(+e.target.value || 0)} aria-label={c.l} />;
    if (look === 'bits') return <span className="bits">{Array.from({ length: w }, (_, i) => w - 1 - i).map((b) => <button key={b} className={'bit' + ((v >> b) & 1 ? ' on' : '')} onClick={() => set(v ^ (1 << b))} aria-label={`${c.l}[${b}]`}>{(v >> b) & 1}</button>)}</span>;
    return <span className="slide"><input type="range" min="0" max={max} value={v} onChange={(e) => set(+e.target.value)} aria-label={c.l} /><code>{v}</code></span>;
  }
  if (look === 'push') return <button className={'ctl-btn' + (v ? ' on' : '')} {...hold}>{v}</button>;
  if (look === 'lamp') return <button className={'lamp' + (v ? ' on' : '')} onClick={() => set(v ^ 1)} aria-label={c.l} aria-pressed={!!v} />;
  return <button role="switch" aria-checked={!!v} className={'sw' + (v ? ' on' : '')} onClick={() => set(v ^ 1)} aria-label={c.l}><i /></button>;
}
export function SevenSeg({ v }) {
  const b = HEX7[v & 15], on = (i) => ((b >> i) & 1 ? 'var(--on)' : 'var(--ln)');
  return (
    <svg viewBox="0 0 34 54" width="30" height="48" role="img" aria-label={String(v & 15)}>
      <rect x="0" y="0" width="34" height="54" rx="4" fill="#0a0f14" />
      {[[7, 5, 20, 4], [27, 9, 4, 18], [27, 29, 4, 18], [7, 45, 20, 4], [3, 29, 4, 18], [3, 9, 4, 18], [7, 25, 20, 4]].map((r, i) => <rect key={i} x={r[0]} y={r[1]} width={r[2]} height={r[3]} fill={on(i)} />)}
    </svg>
  );
}
function Monitor({ m, look }) {
  const v = m.get(), w = m.w, max = (1 << w) - 1;
  if (look === 'bar') return <span className="bar"><i style={{ width: (v / max) * 100 + '%' }} /><code>{v}</code></span>;
  if (look === 'seg7') return <SevenSeg v={v} />;
  if (look === 'led') return <span className="monled"><i className={'led' + (v ? ' on' : '')} /><code>{v}</code></span>;
  return <code className="monval">{fmtVal(v, look, w)}</code>;
}
const LookSelect = ({ value, options, onChange }) => {
  const t = useT().t;
  return <select className="mini" value={value} onChange={(e) => onChange(e.target.value)} aria-label={t('c.look')}>{options.map((o) => <option key={o} value={o}>{t('lk.' + o)}</option>)}</select>;
};

/* ---------- probes ---------- */
function Probes({ C, ui }) {
  const { t } = useT();
  const cands = C.comps.filter((c) => c.t !== 'OUT' && sp(c).no > 0);
  const [comp, setComp] = useState(''), [pin, setPin] = useState(0), [name, setName] = useState('');
  const cc = cands.find((c) => c.id === +comp) || cands[0];
  const label = (c) => `${c.t === 'SUB' ? c.ref : c.t}${c.l ? ' ' + c.l : ''} #${c.id}`;
  const add = () => {
    if (!cc) return;
    const outW = cc.t === 'SUB' ? pins(P_(cc.ref), 'OUT')[pin]?.w || 1 : cc.w || 1;
    ui.probes.push({ id: ui.probes.reduce((a, p) => Math.max(a, p.id), 0) + 1, comp: cc.id, pin: +pin, name: name || label(cc) + '.' + pin, w: outW });
    setName(''); touch();
  };
  return (
    <section>
      <h4>{t('c.probes')}</h4><small>{t('c.probeHelp')}</small>
      <div className="row">
        <select value={cc ? cc.id : ''} onChange={(e) => { setComp(e.target.value); setPin(0); }} aria-label={t('c.block')}>{cands.map((c) => <option key={c.id} value={c.id}>{label(c)}</option>)}</select>
        <select value={pin} onChange={(e) => setPin(+e.target.value)} aria-label={t('c.pin')}>{Array.from({ length: cc ? sp(cc).no : 0 }, (_, i) => <option key={i} value={i}>{i}</option>)}</select>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('c.pname')} size="8" aria-label={t('c.pname')} />
        <button onClick={add} disabled={!cc}>{t('c.addProbe')}</button>
      </div>
      {ui.probes.map((p) => <div className="row" key={p.id}><b>{p.name}</b><button aria-label="remove" onClick={() => { ui.probes = ui.probes.filter((q) => q !== p); touch(); }}>×</button></div>)}
    </section>
  );
}

/* ---------- test cases ---------- */
function Tests({ C, ui, mons, ctls }) {
  const { t } = useT();
  const sum = (inp) => ctls.map((c) => `${c.l}=${inp[c.id] ?? 0}`).join(' ');
  const st = { pass: t('c.pass'), fail: t('c.fail'), untested: t('c.none') };
  return (
    <section>
      <h4>{t('c.tests')}</h4>
      <div className="row">
        <button onClick={() => { ui.tests.push({ id: Date.now(), name: `${t('c.case')} ${ui.tests.length + 1}`, inputs: readInputs(C), expected: {}, notes: '' }); touch(); }}>{t('c.addCase')}</button>
        <button onClick={() => { runTests(C); touch(); }}>{t('c.runAll')}</button>
      </div>
      {ui.tests.map((tc) => (
        <div className="case" key={tc.id}>
          <div className="row">
            <input value={tc.name} onChange={(e) => { tc.name = e.target.value; touch(); }} aria-label={t('c.case')} />
            <span className={'badge ' + (tc.status || 'untested')}>{st[tc.status || 'untested']}</span>
            <button onClick={() => { setInputs(C, tc.inputs); settle(C); bump(); }}>{t('c.apply')}</button>
            <button aria-label="remove" onClick={() => { ui.tests = ui.tests.filter((q) => q !== tc); touch(); }}>×</button>
          </div>
          <small>{sum(tc.inputs)}</small>
          <table className="grid"><thead><tr><th /><th>{t('c.expected')}</th><th>{t('c.actual')}</th></tr></thead><tbody>
            {mons.map((m) => (
              <tr key={m.key}><td>{m.label}</td>
                <td><input size="4" value={tc.expected[m.key] ?? ''} onChange={(e) => { tc.expected[m.key] = e.target.value; tc.status = judge(tc.expected, tc.actual || {}); touch(); }} aria-label={`${t('c.expected')} ${m.label}`} /></td>
                <td className={tc.actual && tc.expected[m.key] !== undefined && tc.expected[m.key] !== '' && Number(tc.expected[m.key]) !== tc.actual[m.key] ? 'bad' : ''}>{tc.actual ? tc.actual[m.key] : '–'}</td></tr>
            ))}</tbody></table>
          <div className="row"><button onClick={() => { const a = tc.actual || runCase(C, tc.inputs); tc.actual = a; mons.forEach((m) => { tc.expected[m.key] = String(a[m.key]); }); tc.status = 'pass'; touch(); }}>{t('c.fill')}</button>
            <input value={tc.notes} placeholder={t('c.notes')} onChange={(e) => { tc.notes = e.target.value; touch(); }} aria-label={t('c.notes')} /></div>
        </div>
      ))}
    </section>
  );
}

/* ---------- brute force ---------- */
function Brute({ C, ui, mons, ctls }) {
  const { t } = useT();
  const bf = ui.bf;
  const selIn = bf.inputs || ctls.filter((c, i) => ctls.slice(0, i + 1).reduce((a, q) => a + widthOf(q), 0) <= 12).map((c) => c.id);
  const selOut = bf.outputs || mons.map((m) => m.key);
  const [res, setRes] = useState(null), [err, setErr] = useState(''), [only, setOnly] = useState(false), [page, setPage] = useState(0);
  const total = comboCount(ctls.filter((c) => selIn.includes(c.id)));
  const toggle = (list, key, field) => { const n = list.includes(key) ? list.filter((k) => k !== key) : [...list, key]; bf[field] = n; touch(); };
  const run = () => {
    setErr('');
    try { const r = bruteForce(C, { inputs: selIn, outputs: selOut, resetEach: bf.resetEach }); setRes(r); setPage(0); if (bf.sig !== bfSig(r)) { bf.sig = bfSig(r); bf.expected = {}; } bump(); }
    catch (e) { setErr(e.message === 'too-many' ? t('c.tooMany') : t('c.noSel')); }
  };
  const exp = res && bf.sig === bfSig(res) ? bf.expected : {};
  const bad = (r) => res.mons.some((m, i) => exp[r.n] && exp[r.n][m.key] != null && exp[r.n][m.key] !== '' && Number(exp[r.n][m.key]) !== r.out[i]);
  const rows = res ? res.rows.filter((r) => !only || bad(r)) : [];
  const nBad = res ? res.rows.filter(bad).length : 0, PS = 128, pages = Math.ceil(rows.length / PS);
  return (
    <section>
      <h4>{t('c.brute')}</h4><small>{t('c.bruteHelp')}</small>
      <div><b>{t('c.pickIn')}</b> {ctls.map((c) => <label className="chk" key={c.id}><input type="checkbox" checked={selIn.includes(c.id)} onChange={() => toggle(selIn, c.id, 'inputs')} />{c.l}{widthOf(c) > 1 ? `[${widthOf(c)}]` : ''}</label>)}</div>
      <div><b>{t('c.pickOut')}</b> {mons.map((m) => <label className="chk" key={m.key}><input type="checkbox" checked={selOut.includes(m.key)} onChange={() => toggle(selOut, m.key, 'outputs')} />{m.label}</label>)}</div>
      <label className="chk"><input type="checkbox" checked={!!bf.resetEach} onChange={(e) => { bf.resetEach = e.target.checked; touch(); }} />{t('c.resetEach')}</label>
      <div className="row"><button onClick={run}>{t('c.run')}</button><small>{t('c.combos', { n: total })}</small></div>
      {err && <p className="bad">{err}</p>}
      {res && (<>
        <div className="row">
          <button onClick={() => { bf.expected = Object.fromEntries(res.rows.map((r) => [r.n, Object.fromEntries(res.mons.map((m, i) => [m.key, String(r.out[i])]))])); bf.sig = bfSig(res); touch(); }}>{t('c.base')}</button>
          <button onClick={() => { bf.expected = {}; touch(); }}>{t('c.clearBase')}</button>
          <label className="chk"><input type="checkbox" checked={only} onChange={(e) => { setOnly(e.target.checked); setPage(0); }} />{t('c.mism')}</label>
          <button onClick={() => downloadFile('truth-table.csv', new Blob([toCSV(res, exp)], { type: 'text/csv' }))}>{t('c.csv')}</button>
        </div>
        <small>{t('c.match', { n: nBad, m: res.rows.length })}</small>
        <div className="scroll"><table className="grid"><thead><tr>{res.ins.map((c) => <th key={c.id}>{c.l}</th>)}{res.mons.map((m) => <th key={m.key}>{m.label}</th>)}{res.mons.map((m) => <th key={'e' + m.key}>{m.label}*</th>)}</tr></thead><tbody>
          {rows.slice(page * PS, page * PS + PS).map((r) => (
            <tr key={r.n} className={bad(r) ? 'bad-row' : ''}>
              {r.in.map((v, i) => <td key={i}>{v}</td>)}{r.out.map((v, i) => <td key={i}>{v}</td>)}
              {res.mons.map((m) => <td key={m.key}><input size="3" value={(exp[r.n] || {})[m.key] ?? ''} aria-label={`${t('c.expected')} ${m.label}`} onChange={(e) => { bf.sig = bfSig(res); bf.expected[r.n] = { ...(bf.expected[r.n] || {}), [m.key]: e.target.value }; touch(); }} /></td>)}
            </tr>))}
        </tbody></table></div>
        {pages > 1 && <div className="row"><button disabled={!page} onClick={() => setPage(page - 1)}>‹</button><small>{page + 1}/{pages}</small><button disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>›</button></div>}
      </>)}
    </section>
  );
}

export default function ControlPanel() {
  useEngine(); useTick(120);
  const { t } = useT();
  const C = cur(), ui = getUI(C), ctls = ctlList(C), mons = monList(C);
  const look = (key, def) => ui.mon[key] || ui.ctl[key] || def;
  return (
    <div className="ctlpanel">
      <section>
        <div className="row"><h4>{t('c.controls')}</h4><label className="sm">{t('c.cols')}<select value={ui.cols} onChange={(e) => { ui.cols = +e.target.value; touch(); }}>{[1, 2, 3, 4].map((n) => <option key={n}>{n}</option>)}</select></label></div>
        {!ctls.length && <small>{t('c.noIn')}</small>}
        <div className="cgrid" style={{ gridTemplateColumns: `repeat(${ui.cols},1fr)` }}>
          {ctls.map((c) => {
            const w = widthOf(c), opts = c.t === 'KEY' ? ['push'] : w > 1 ? ['slider', 'number', 'bits'] : ['switch', 'push', 'lamp'], lk = ui.ctl[c.id] || opts[0];
            return <div className="citem" key={c.id}><label>{c.l}</label><Control c={c} look={lk} />{opts.length > 1 && <LookSelect value={lk} options={opts} onChange={(v) => { ui.ctl[c.id] = v; touch(); }} />}</div>;
          })}
        </div>
      </section>
      <section>
        <h4>{t('c.monitor')}</h4>
        {!mons.length && <small>{t('c.noOut')}</small>}
        <div className="cgrid" style={{ gridTemplateColumns: `repeat(${ui.cols},1fr)` }}>
          {mons.map((m) => {
            const opts = m.w > 1 ? ['dec', 'hex', 'bin', 'bar', 'seg7'] : ['led', 'dec', 'seg7'], lk = ui.mon[m.key] || (m.w > 1 ? 'hex' : 'led');
            return <div className="citem" key={m.key}><label>{m.label}</label><Monitor m={m} look={lk} /><LookSelect value={lk} options={opts} onChange={(v) => { ui.mon[m.key] = v; touch(); }} /></div>;
          })}
        </div>
      </section>
      <Probes C={C} ui={ui} />
      <Tests C={C} ui={ui} mons={mons} ctls={ctls} />
      <Brute C={C} ui={ui} mons={mons} ctls={ctls} />
    </div>
  );
}
