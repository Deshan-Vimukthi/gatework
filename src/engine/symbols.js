// Premade gate symbols. Every gate block on the canvas and in the palette is drawn by symDraw().
// To use your own pictures instead, call setSymbolImage('AND', '/symbols/and.png') (see symbols.config.js).
export const SYM = { AND: 1, OR: 1, NAND: 1, NOR: 1, XOR: 1, XNOR: 1, NOT: 1, BUF: 1 };
export const IMAGES = {};
export function setSymbolImage(type, url) {
  const img = new Image();
  img.onload = () => { IMAGES[type] = img; };
  img.src = url;
}
const BUBBLE = { NAND: 1, NOR: 1, XNOR: 1, NOT: 1 };
const FAMILY = { AND: 'and', NAND: 'and', OR: 'or', NOR: 'or', XOR: 'xor', XNOR: 'xor', NOT: 'tri', BUF: 'tri' };

/** Draws gate `t` into the box (X, Y, w, h). Uses the context's current fill/stroke colours. */
export function symDraw(ctx, t, X, Y, w, h) {
  const img = IMAGES[t];
  ctx.save();
  ctx.translate(X, Y);
  if (img) {
    ctx.drawImage(img, 0, 0, w, h);
  } else {
    const fam = FAMILY[t], cy = h / 2, bub = BUBBLE[t], xe = w - (bub ? 18 : 12);
    const ins = fam === 'tri' ? [cy] : [cy - 10, cy + 10];
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ins.forEach((y) => { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(12, y); ctx.stroke(); });
    ctx.beginPath();
    if (fam === 'and') {
      const r = (h - 12) / 2, xc = xe - r;
      ctx.moveTo(10, 6); ctx.lineTo(xc, 6); ctx.arc(xc, cy, r, -Math.PI / 2, Math.PI / 2); ctx.lineTo(10, h - 6);
    } else if (fam === 'or' || fam === 'xor') {
      const xs = fam === 'xor' ? 14 : 10, mx = (xs + xe) / 2 + 4;
      ctx.moveTo(xs, 6); ctx.quadraticCurveTo(mx, 6, xe, cy); ctx.quadraticCurveTo(mx, h - 6, xs, h - 6); ctx.quadraticCurveTo(xs + 12, cy, xs, 6);
    } else {
      ctx.moveTo(10, 5); ctx.lineTo(10, h - 5); ctx.lineTo(xe, cy);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    if (fam === 'xor') { ctx.beginPath(); ctx.moveTo(6, 6); ctx.quadraticCurveTo(18, cy, 6, h - 6); ctx.stroke(); }
    if (bub) { ctx.beginPath(); ctx.arc(xe + 4, cy, 4, 0, 7); ctx.fill(); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(xe + (bub ? 8 : 0), cy); ctx.lineTo(w, cy); ctx.stroke();
  }
  ctx.restore();
  ctx.beginPath(); ctx.rect(X, Y, w, h); // path used by the "just changed" highlight ring
}
