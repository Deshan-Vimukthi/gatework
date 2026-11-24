import { useEffect, useRef, useState } from 'react';
import { ST, HK, arrange, cur, copySel, delSel, kick, loadSlot, paste, reset, rotSel, saveSlot, slots, step, tidy } from '../engine/index.js';
import { LANGS, useT } from '../i18n/index.jsx';
import { bump, useEngine } from './store.js';
import { exportZip, importFile } from './projectIO.js';

export default function Header({ theme, setTheme }) {
  useEngine();
  const { t, lang, setLang } = useT();
  const [running, setRunning] = useState(false), [selMode, setSelMode] = useState(false);
  const file = useRef(null);
  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => { cur().comps.forEach((c) => c.t === 'CLK' && (c.v ^= 1)); kick(); }, Math.max(500, ST.slow * 8));
    return () => clearInterval(id);
  }, [running]);
  useEffect(() => { ST.selMode = selMode ? 1 : 0; }, [selMode]);
  const names = Object.keys(slots());
  return (
    <header>
      <b className="logo">Gatework</b>
      <input className="pname" value={ST.P.name || ''} placeholder="project" aria-label="project name" onChange={(e) => { ST.P.name = e.target.value; bump(); }} />
      <button onClick={() => setRunning(!running)}>{running ? t('tb.pause') : t('tb.clock')}</button>
      <button onClick={reset}>{t('tb.reset')}</button>
      <select aria-label="speed" defaultValue="0" onChange={(e) => { ST.slow = +e.target.value; clearTimeout(ST.tm); }}>{['0', '150', '600', '1500', '-1'].map((v) => <option key={v} value={v}>{t('spd.' + v)}</option>)}</select>
      <button onClick={() => { clearTimeout(ST.tm); step(cur(), 1); }}>{t('tb.step')}</button>
      <button onClick={tidy}>{t('tb.tidy')}</button>
      <button onClick={delSel}>{t('tb.delete')}</button>
      <button className={selMode ? 'on' : ''} onClick={() => setSelMode(!selMode)}>{t('tb.select')}</button>
      <button onClick={copySel}>{t('tb.copy')}</button>
      <button onClick={paste}>{t('tb.paste')}</button>
      <button onClick={rotSel}>{t('tb.rotate')}</button>
      <button onClick={arrange}>{t('tb.arrange')}</button>
      <button onClick={() => { const n = saveSlot(ST.P.name || 'project'); HK.flash('💾 ' + n); bump(); }}>{t('tb.save')}</button>
      <select aria-label={t('tb.load')} value="" onChange={(e) => { if (loadSlot(e.target.value)) HK.flash(e.target.value); }}><option value="">{t('tb.load')}</option>{names.map((n) => <option key={n}>{n}</option>)}</select>
      <button onClick={exportZip}>{t('tb.zip')}</button>
      <button onClick={() => file.current.click()}>{t('tb.open')}</button>
      <input ref={file} type="file" accept=".zip,.json" hidden onChange={async (e) => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; try { await importFile(f); HK.flash(f.name); } catch (err) { HK.flash('⚠ ' + err.message); } }} />
      <span className="grow" />
      <select aria-label={t('tb.theme')} value={theme} onChange={(e) => setTheme(e.target.value)}><option value="light">☀ {t('tb.light')}</option><option value="dark">☾ {t('tb.dark')}</option></select>
      <select aria-label={t('tb.lang')} value={lang} onChange={(e) => setLang(e.target.value)}>{Object.entries(LANGS).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}</select>
    </header>
  );
}
