// Project <-> file tree. The same layout is used for the local history, the ZIP export and GitHub.
import { clean } from '../engine/index.js';

export const safeName = (n) => String(n).replace(/[^\p{L}\p{N}_ -]/gu, '_');

export function toFiles(P, { readme = true } = {}) {
  const files = [{ path: 'gatework.json', content: JSON.stringify({ gatework: 1, name: P.name || 'project', cur: P.cur, order: Object.keys(P.c) }, null, 2) }];
  Object.entries(P.c).forEach(([k, v]) => files.push({ path: `circuits/${safeName(k)}.json`, content: JSON.stringify({ name: k, ...clean(v) }, null, 2) }));
  if (readme) {
    files.push({ path: 'README.md', content: `# ${P.name || 'project'}\n\nLogic circuit project made with Gatework.\n\n- \`gatework.json\` – project info\n- \`circuits/*.json\` – one file per circuit (diff-friendly)\n` });
    files.push({ path: '.gitignore', content: 'node_modules\n.DS_Store\n' });
  }
  return files;
}
export const filesToMap = (files) => Object.fromEntries(files.map((f) => [f.path, f.content]));

/** Rebuild a project from {path: text}. Accepts the folder layout, a single-circuit JSON or a legacy full-project JSON. */
export function fromFiles(map) {
  let meta = null, full = null;
  const c = {};
  Object.entries(map).forEach(([p, s]) => {
    if (!/\.json$/i.test(p)) return;
    const o = JSON.parse(s);
    if (o.c) full = o;
    else if (o.gatework) meta = o;
    else if (o.comps) { const { name, ...rest } = o; c[name || p.replace(/^.*\//, '').replace(/\.json$/i, '')] = { wires: [], ...rest }; }
  });
  if (full) return full;
  if (!Object.keys(c).length) throw new Error('no-circuits');
  const order = [...(meta?.order || []).filter((k) => c[k]), ...Object.keys(c).filter((k) => !(meta?.order || []).includes(k))];
  return { name: meta?.name || 'project', cur: meta?.cur && c[meta.cur] ? meta.cur : order[0], c: Object.fromEntries(order.map((k) => [k, c[k]])) };
}
