// A tiny local "git": commits are snapshots of the file tree kept in browser storage.
import { toFiles, filesToMap } from './files.js';

const KEY = 'gw.git';
const load = (s) => { try { return JSON.parse(s.getItem(KEY)) || { commits: [], head: null }; } catch (e) { return { commits: [], head: null }; } };
export const hash = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(16).padStart(8, '0'); };
export const snapshot = (P) => filesToMap(toFiles(P, { readme: false }));
export const log = (s = globalThis.localStorage) => load(s);

export function diff(a, b) {
  const added = [], removed = [], changed = [];
  Object.keys(b).forEach((p) => { if (!(p in a)) added.push(p); else if (a[p] !== b[p]) changed.push(p); });
  Object.keys(a).forEach((p) => { if (!(p in b)) removed.push(p); });
  return { added, removed, changed };
}
export function status(P, s = globalThis.localStorage) {
  const g = load(s), head = g.commits.find((c) => c.id === g.head);
  return diff(head ? head.tree : {}, snapshot(P));
}
export function commit(P, msg, s = globalThis.localStorage) {
  const g = load(s), tree = snapshot(P), id = hash(JSON.stringify(tree) + Date.now());
  g.commits.unshift({ id, msg: msg || 'Update circuits', time: Date.now(), parent: g.head, tree });
  g.commits = g.commits.slice(0, 20); g.head = id;
  s.setItem(KEY, JSON.stringify(g));
  return id;
}
export function checkout(id, s = globalThis.localStorage) {
  const g = load(s), c = g.commits.find((q) => q.id === id);
  if (!c) return null;
  g.head = id; s.setItem(KEY, JSON.stringify(g));
  return c.tree;
}
