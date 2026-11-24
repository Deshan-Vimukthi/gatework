import { ST, HK, zip, unzip, loadP, open, save, circuitsMerge } from '../engine/index.js';
import { toFiles, fromFiles } from '../git/files.js';
import { downloadFile } from '../git/download.js';

export const projectZip = () => zip(toFiles(ST.P).map((f) => [f.path, f.content]));
export const exportZip = () => downloadFile((ST.P.name || 'project') + '.zip', projectZip());

/** Opens a .zip (repo layout) or a .json (project, or a single circuit that is added to the open project). */
export async function importFile(file) {
  const map = {};
  if (/\.zip$/i.test(file.name)) (await unzip(new Uint8Array(await file.arrayBuffer()))).forEach(([n, s]) => { map[n] = s; });
  else map[file.name] = await file.text();
  const parsed = Object.values(map).map((s) => JSON.parse(s));
  if (parsed.some((o) => o.c || o.gatework)) { loadP(fromFiles(map)); return 'project'; }
  const added = circuitsMerge(fromFiles(map).c);
  open(added[added.length - 1]);
  return 'circuits';
}
export { HK, save };
