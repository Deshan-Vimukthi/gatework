import { describe, it, expect, beforeAll } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import * as E from '../src/engine/index.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const ctx = new Proxy({}, { get: (t, k) => (k === 'measureText' ? () => ({ width: 10 }) : () => {}), set: () => true });
beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = () => ctx;
  globalThis.matchMedia = globalThis.matchMedia || (() => ({ matches: false }));
});
const tick = (ms = 40) => act(async () => { await new Promise((r) => setTimeout(r, ms)); });
const q = (sel, root = document) => root.querySelector(sel);
const byText = (t, tag = 'button') => [...document.querySelectorAll(tag)].find((e) => e.textContent.trim() === t);
const waitFor = async (fn, ms = 3000) => { const t0 = Date.now(); for (;;) { const v = fn(); if (v) return v; if (Date.now() - t0 > ms) throw new Error('timeout'); await tick(30); } };
const click = (el) => act(async () => { el.dispatchEvent(new MouseEvent('click', { bubbles: true })); });

describe('App', () => {
  it('mounts, controls a circuit, probes it and brute-forces it in three languages', async () => {
    const App = (await import('../src/App.jsx')).default;
    const host = document.createElement('div'); document.body.append(host);
    const root = createRoot(host);
    await act(async () => root.render(<App />));
    await tick();
    expect(q('canvas#c')).toBeTruthy();

    await act(async () => { E.open(E.EX['Full adder']()); }); await tick();
    // controller: three inputs, two outputs
    expect(document.querySelectorAll('.cgrid')[0].children).toHaveLength(3);
    expect(document.querySelectorAll('.cgrid')[1].children).toHaveLength(2);
    const sw = document.querySelectorAll('[role=switch]');
    await click(sw[0]); await click(sw[1]); await tick(160);
    expect(E.cur().comps.find((c) => c.l === 'A').v).toBe(1);
    expect(document.querySelectorAll('.cgrid')[1].textContent).toContain('S');

    // probe on the half-adder block output, test case, brute force
    await click(await waitFor(() => byText('Add probe'))); await tick();
    expect(E.cur().ui.probes).toHaveLength(1);
    await click(await waitFor(() => byText('Add case from current inputs')));
    await click(await waitFor(() => byText('Expected ← actual')));
    expect(E.cur().ui.tests[0].status).toBe('pass');
    await click(await waitFor(() => byText('Run'))); await tick();
    expect(document.querySelectorAll('.scroll tbody tr')).toHaveLength(8);

    // every tab renders without throwing
    for (const k of ['kmap', 'cpu', 'mem', 'keys', 'pins', 'git']) {
      const tab = [...document.querySelectorAll('[role=tab]')][['ctl', 'kmap', 'cpu', 'mem', 'keys', 'pins', 'git'].indexOf(k)];
      await click(tab); await waitFor(() => q('.panel').innerHTML.length > 10);
    }
    // git: commit locally and show history
    await click(await waitFor(() => byText('Commit'))); await tick();
    expect(document.querySelector('.commit')).toBeTruthy();

    // language + theme
    const lang = q('select[aria-label]', document.querySelector('header')) && [...document.querySelectorAll('header select')].pop();
    await act(async () => { lang.value = 'si'; lang.dispatchEvent(new Event('change', { bubbles: true })); }); await tick();
    expect(document.documentElement.lang).toBe('si');
    expect(host.textContent).toContain('ඔරලෝසුව');
    await act(async () => { lang.value = 'ta'; lang.dispatchEvent(new Event('change', { bubbles: true })); }); await tick();
    expect(host.textContent).toContain('கடிகாரம்');
    const theme = [...document.querySelectorAll('header select')].slice(-2)[0];
    await act(async () => { theme.value = 'dark'; theme.dispatchEvent(new Event('change', { bubbles: true })); }); await tick();
    expect(document.documentElement.dataset.theme).toBe('dark');
    root.unmount();
  });
});
