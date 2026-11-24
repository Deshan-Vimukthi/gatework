import { ST, HK } from './state.js';


export const crcT = (() => {
  const t = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ c >>> 1 : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
export const crc = u => {
  let c = -1;
  for (const b of u) c = crcT[(c ^ b) & 255] ^ c >>> 8;
  return (c ^ -1) >>> 0;
};
export function zip(files) {
  const E = new TextEncoder(),
    parts = [],
    cd = [],
    u16 = v => [v & 255, v >> 8 & 255],
    u32 = v => [v & 255, v >> 8 & 255, v >> 16 & 255, v >>> 24 & 255];
  let off = 0;
  files.forEach(([n, s]) => {
    const nb = E.encode(n),
      d = E.encode(s),
      c = crc(d),
      h = new Uint8Array([0x50, 0x4b, 3, 4, ...u16(20), ...u16(0x800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(c), ...u32(d.length), ...u32(d.length), ...u16(nb.length), ...u16(0)]);
    parts.push(h, nb, d);
    cd.push(new Uint8Array([0x50, 0x4b, 1, 2, ...u16(20), ...u16(20), ...u16(0x800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(c), ...u32(d.length), ...u32(d.length), ...u16(nb.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(off)]), nb);
    off += h.length + nb.length + d.length;
  });
  const cs = cd.reduce((a, b) => a + b.length, 0);
  return new Blob([...parts, ...cd, new Uint8Array([0x50, 0x4b, 5, 6, 0, 0, 0, 0, ...u16(files.length), ...u16(files.length), ...u32(cs), ...u32(off), 0, 0])], {
    type: 'application/zip'
  });
}
export async function unzip(u) {
  const dv = new DataView(u.buffer, u.byteOffset, u.length),
    D = new TextDecoder(),
    out = [];
  let e = u.length - 22;
  while (e >= 0 && dv.getUint32(e, true) != 0x06054b50) e--;
  if (e < 0) throw 'not a zip file';
  let n = dv.getUint16(e + 10, true),
    p = dv.getUint32(e + 16, true);
  while (n--) {
    const me = dv.getUint16(p + 10, true),
      cs = dv.getUint32(p + 20, true),
      nl = dv.getUint16(p + 28, true),
      el = dv.getUint16(p + 30, true),
      cl = dv.getUint16(p + 32, true),
      lo = dv.getUint32(p + 42, true),
      name = D.decode(u.subarray(p + 46, p + 46 + nl));
    p += 46 + nl + el + cl;
    if (!/\.json$/i.test(name) || /__MACOSX|(^|\/)\./.test(name)) continue;
    const st = lo + 30 + dv.getUint16(lo + 26, true) + dv.getUint16(lo + 28, true);
    let d = u.subarray(st, st + cs);
    if (me == 8) d = new Uint8Array(await new Response(new Blob([d]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
    out.push([name, D.decode(d)]);
  }
  return out;
}
