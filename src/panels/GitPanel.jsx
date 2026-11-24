import { useState } from 'react';
import { ST, loadP } from '../engine/index.js';
import { downloadFile } from '../git/download.js';
import { fromFiles, toFiles } from '../git/files.js';
import { GitHub } from '../git/github.js';
import { checkout, commit, log, status } from '../git/history.js';
import { useT } from '../i18n/index.jsx';
import { bump, useEngine } from '../ui/store.js';
import { projectZip } from '../ui/projectIO.js';

const cfgKey = 'gw.github';
const loadCfg = () => { try { return { ...JSON.parse(localStorage.getItem(cfgKey)), token: sessionStorage.getItem(cfgKey + '.t') || localStorage.getItem(cfgKey + '.t') || '' }; } catch (e) { return {}; } };

export default function GitPanel() {
  useEngine();
  const { t } = useT();
  const [cfg, setCfg] = useState(() => ({ owner: '', repo: '', branch: 'main', prefix: '', token: '', remember: false, ...loadCfg() }));
  const [msg, setMsg] = useState(''), [info, setInfo] = useState(''), [busy, setBusy] = useState(false), [armed, setArmed] = useState(false);
  const g = log(), st = status(ST.P), head = g.commits.find((c) => c.id === g.head);
  const set = (k, v) => {
    const n = { ...cfg, [k]: v }; setCfg(n);
    const { token, remember, ...rest } = n;
    localStorage.setItem(cfgKey, JSON.stringify({ ...rest, remember }));
    (remember ? localStorage : sessionStorage).setItem(cfgKey + '.t', token);
    if (!remember) localStorage.removeItem(cfgKey + '.t');
  };
  const client = () => { if (!cfg.owner || !cfg.repo || !cfg.token) { setInfo(t('g.noToken')); return null; } return new GitHub(cfg); };
  const run = async (fn) => { setBusy(true); try { setInfo(await fn()); } catch (e) { setInfo('⚠ ' + (e.message || e)); } setBusy(false); bump(); };
  const changes = [...st.added.map((p) => '+ ' + p), ...st.changed.map((p) => '~ ' + p), ...st.removed.map((p) => '- ' + p)];
  return (
    <div className="gitpanel">
      <section>
        <h4>{t('g.local')}</h4>
        <small>{t('g.layout')}</small>
        <div className="row"><input value={msg} onChange={(e) => setMsg(e.target.value)} placeholder={t('g.msg')} aria-label={t('g.msg')} />
          <button onClick={() => { const id = commit(ST.P, msg); setMsg(''); setInfo(t('g.committed', { id })); bump(); }}>{t('g.commit')}</button></div>
        <b>{t('g.changes')}</b>
        {changes.length ? <pre>{changes.join('\n')}</pre> : <p><small>{t('g.clean')}</small></p>}
        <b>{t('g.history')}</b>
        {!g.commits.length && <p><small>{t('g.empty')}</small></p>}
        {g.commits.map((c) => (
          <div className={'row commit' + (c.id === g.head ? ' head' : '')} key={c.id}>
            <code>{c.id}</code><span>{c.msg}</span><small>{new Date(c.time).toLocaleString()}</small>
            <button onClick={() => { const tree = checkout(c.id); if (tree) { loadP(fromFiles(tree)); } bump(); }}>{t('g.restore')}</button>
          </div>))}
        {head && <small>HEAD {head.id}</small>}
      </section>
      <section>
        <h4>{t('g.github')}</h4>
        <div className="form">
          <label>{t('g.owner')}<input value={cfg.owner} onChange={(e) => set('owner', e.target.value.trim())} /></label>
          <label>{t('g.repo')}<input value={cfg.repo} onChange={(e) => set('repo', e.target.value.trim())} /></label>
          <label>{t('g.branch')}<input value={cfg.branch} onChange={(e) => set('branch', e.target.value.trim())} /></label>
          <label>{t('g.folder')}<input value={cfg.prefix} onChange={(e) => set('prefix', e.target.value.trim())} placeholder="circuits-lab/" /></label>
          <label>{t('g.token')}<input type="password" autoComplete="off" value={cfg.token} onChange={(e) => set('token', e.target.value.trim())} /></label>
        </div>
        <label className="chk"><input type="checkbox" checked={!!cfg.remember} onChange={(e) => set('remember', e.target.checked)} />{t('g.remember')}</label>
        <small>{t('g.tokenHelp')}</small>
        <div className="row">
          <button disabled={busy} onClick={() => run(async () => { const c = client(); if (!c) return t('g.noToken'); const r = await c.test(); return t('g.connected', { n: r.name, p: r.canPush ? '' : ' (read-only)' }); })}>{t('g.test')}</button>
          <button disabled={busy} onClick={() => run(async () => { const c = client(); if (!c) return t('g.noToken'); const r = await c.push(toFiles(ST.P), msg || 'Update circuits'); commit(ST.P, msg || 'Update circuits'); return t('g.pushed', { f: r.files }) + ' · ' + r.url; })}>{t('g.push')}</button>
          <button disabled={busy} onClick={() => { if (!armed) { setArmed(true); setInfo(t('g.confirmPull')); setTimeout(() => setArmed(false), 4000); return; } setArmed(false); run(async () => { const c = client(); if (!c) return t('g.noToken'); const r = await c.pull(); loadP(fromFiles(r.map)); return t('g.pulled'); }); }}>{t('g.pull')}</button>
        </div>
        {info && <p role="status" className="info">{info}</p>}
      </section>
      <div className="row"><button onClick={() => downloadFile((ST.P.name || 'project') + '.zip', projectZip())}>{t('g.zip')}</button></div>
    </div>
  );
}
