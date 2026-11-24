import { useEffect, useRef } from 'react';
import { symDraw } from '../engine/index.js';

/** Palette icon: draws the very same symbol that appears on the canvas. */
export default function Symbol({ type, theme }) {
  const ref = useRef(null);
  const h = type === 'NOT' || type === 'BUF' ? 36 : 56;
  useEffect(() => {
    const cv = ref.current, g = cv && cv.getContext && cv.getContext('2d');
    if (!g) return;
    const s = getComputedStyle(document.documentElement);
    g.clearRect(0, 0, 64, h);
    g.fillStyle = s.getPropertyValue('--g').trim(); g.strokeStyle = s.getPropertyValue('--ink').trim();
    symDraw(g, type, 0, 0, 64, h);
  }, [type, theme, h]);
  return <canvas ref={ref} width="64" height={h} className="sym" aria-hidden="true" />;
}
