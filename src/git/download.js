// Saves a Blob. Uses the host's download capability when embedded, otherwise a normal browser download.
export async function downloadFile(name, blob) {
  let host = null;
  try { host = await globalThis.claude.use('downloads'); } catch (e) { /* not embedded */ }
  if (host) { await host.save({ filename: name, data: blob }); return; }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
