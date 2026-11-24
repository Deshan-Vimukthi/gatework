import { describe, it, expect, beforeEach } from 'vitest';
import * as E from '../src/engine/index.js';
import { bruteForce, getUI, monList, ctlList, runCase, judge, toCSV, bfSig } from '../src/debug/probe.js';
import { toFiles, fromFiles, filesToMap } from '../src/git/files.js';
import { commit, status, log, checkout } from '../src/git/history.js';
import { GitHub } from '../src/git/github.js';

const mem = () => { const m = {}; return { getItem: (k) => m[k] ?? null, setItem: (k, v) => { m[k] = String(v); } }; };
beforeEach(() => { E.ST.P = E.defaultProject(); E.ST.seq = 1; });

describe('controller / monitor / brute force', () => {
  it('brute-forces a full adder and matches the truth table', () => {
    E.open(E.EX['Full adder']());
    const C = E.cur();
    const res = bruteForce(C, { inputs: ctlList(C).map((c) => c.id), outputs: monList(C).map((m) => m.key) });
    expect(res.rows).toHaveLength(8);
    res.rows.forEach((r) => { const sum = r.in.reduce((a, b) => a + b, 0); expect(r.out).toEqual([sum & 1, sum >> 1]); });
    expect(toCSV(res).split('\n')[0]).toBe('A,B,Cin,S,Cout,S (expected),Cout (expected)');
  });
  it('supports probes on internal blocks and test cases', () => {
    E.open(E.EX['Full adder']());
    const C = E.cur(), ui = getUI(C), h1 = C.comps.find((c) => c.t === 'SUB');
    ui.probes.push({ id: 1, comp: h1.id, pin: 1, name: 'half carry' });
    const [A, B] = ctlList(C);
    const r = runCase(C, { [A.id]: 1, [B.id]: 1 });
    expect(r.p1).toBe(1);
    expect(judge({ p1: '1' }, r)).toBe('pass');
    expect(judge({ p1: '0' }, r)).toBe('fail');
    expect(bfSig(bruteForce(C, { inputs: [A.id], outputs: ['p1'] }))).toBe(`${A.id}|p1`);
  });
  it('refuses more than the combination limit', () => {
    E.open(E.EX['8-bit adder']());
    const C = E.cur();
    expect(() => bruteForce(C, { inputs: ctlList(C).map((c) => c.id), outputs: [] })).toThrow('too-many');
  });
});

describe('git', () => {
  it('round-trips the file tree and keeps controller settings', () => {
    E.open(E.EX['Half adder']());
    getUI(E.cur()).cols = 3;
    const back = fromFiles(filesToMap(toFiles(E.ST.P)));
    expect(Object.keys(back.c)).toEqual(Object.keys(E.ST.P.c));
    expect(back.c.HalfAdder.ui.cols).toBe(3);
  });
  it('tracks local commits and changes', () => {
    const s = mem();
    E.open(E.EX['Half adder']());
    expect(status(E.ST.P, s).added.length).toBeGreaterThan(0);
    const id = commit(E.ST.P, 'first', s);
    expect(status(E.ST.P, s)).toEqual({ added: [], removed: [], changed: [] });
    E.cur().comps[0].x += 10;
    expect(status(E.ST.P, s).changed).toEqual(['circuits/HalfAdder.json']);
    expect(log(s).commits[0].id).toBe(id);
    expect(checkout(id, s)['gatework.json']).toBeTruthy();
  });
  it('pushes to and pulls from GitHub (mock server)', async () => {
    const blobs = {}, trees = {}, commits = {}, refs = {};
    let n = 0;
    const f = async (url, o) => {
      const p = url.replace('https://api.github.com/repos/me/lab', ''), m = o.method, b = o.body ? JSON.parse(o.body) : null;
      const ok = (j) => ({ ok: true, text: async () => JSON.stringify(j) });
      if (m === 'GET' && p === '') return ok({ full_name: 'me/lab', default_branch: 'main', permissions: { push: true } });
      if (m === 'GET' && p === '/git/ref/heads/main') return refs.main ? ok({ object: { sha: refs.main } }) : { ok: false, status: 404, statusText: 'nf', text: async () => '{}' };
      if (m === 'PUT' && p === '/contents/.gitkeep') { const t = 't' + ++n; trees[t] = {}; const c = 'c' + ++n; commits[c] = { tree: { sha: t } }; refs.main = c; return ok({}); }
      if (m === 'GET' && p.startsWith('/git/commits/')) return ok(commits[p.split('/').pop()]);
      if (m === 'GET' && p.startsWith('/git/trees/')) return ok({ tree: Object.entries(trees[p.split('/').pop().split('?')[0]]).map(([path, sha]) => ({ path, sha, type: 'blob' })) });
      if (m === 'POST' && p === '/git/blobs') { const s = 'b' + ++n; blobs[s] = b.content; return ok({ sha: s }); }
      if (m === 'POST' && p === '/git/trees') { const prev = trees[b.base_tree] || {}, t = { ...prev }; b.tree.forEach((e) => { if (e.sha) t[e.path] = e.sha; else delete t[e.path]; }); const id = 't' + ++n; trees[id] = t; return ok({ sha: id }); }
      if (m === 'POST' && p === '/git/commits') { const id = 'c' + ++n; commits[id] = { tree: { sha: b.tree } }; return ok({ sha: id }); }
      if (m === 'PATCH' && p === '/git/refs/heads/main') { refs.main = b.sha; return ok({}); }
      if (m === 'GET' && p.startsWith('/git/blobs/')) return ok({ content: Buffer.from(blobs[p.split('/').pop()]).toString('base64') });
      throw new Error('unhandled ' + m + ' ' + p);
    };
    const gh = new GitHub({ token: 't', owner: 'me', repo: 'lab', prefix: 'proj' }, f);
    E.open(E.EX['Full adder']());
    const r1 = await gh.push(toFiles(E.ST.P), 'first');
    expect(r1.files).toBeGreaterThan(3);
    delete E.ST.P.c.HalfAdder.ui; E.ST.P.cur = 'FullAdder';
    const pulled = await gh.pull();
    const proj = fromFiles(pulled.map);
    expect(Object.keys(proj.c).sort()).toEqual(['FullAdder', 'HalfAdder', 'Main']);
    // deleting a circuit locally removes its file on the next push
    delete E.ST.P.c.HalfAdder; E.ST.P.c.FullAdder.comps = E.ST.P.c.FullAdder.comps.filter((c) => c.t !== 'SUB');
    await gh.push(toFiles(E.ST.P), 'second');
    expect(Object.keys(fromFiles((await gh.pull()).map).c).sort()).toEqual(['FullAdder', 'Main']);
  });
});
