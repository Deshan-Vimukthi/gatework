import { P_, ST, add, uses } from '../engine/index.js';
import { useT } from '../i18n/index.jsx';
import { useEngine } from './store.js';
import Symbol from './Symbol.jsx';

const GATES = ['AND', 'OR', 'NOT', 'NAND', 'NOR', 'XOR', 'XNOR', 'BUF'];
const SECTIONS = [
  ['pal.io', ['IN', 'OUT', 'CLK', 'DFF']],
  ['pal.seq', ['REG', 'CNT', 'RAM', 'ROM', 'MUX', 'DEC:4', 'DEC:8']],
  ['pal.misc', ['CONST:0', 'CONST:1', 'CONST:8', 'KEY', 'SEG7:8', 'SEG7:1', 'DELAY:1', 'DELAY:4']],
  ['pal.bus', ['IN:8', 'OUT:8', 'SPLIT:4,4', 'SPLIT:2,2,2,2', 'SPLIT:1,1,1,1,1,1,1,1', 'JOIN:4,4', 'JOIN:2,2,2,2', 'JOIN:1,1,1,1,1,1,1,1']],
];
export default function Palette({ theme }) {
  useEngine();
  const { t } = useT();
  const subs = Object.keys(ST.P.c).filter((n) => n !== ST.P.cur && !uses(n, ST.P.cur));
  return (
    <aside id="pal" aria-label="components">
      <h4>{t('pal.gates')}</h4>
      <div className="gates">{GATES.map((g) => <button key={g} className="gate" title={g} onClick={() => add(g)}><Symbol type={g} theme={theme} /><span>{g}</span></button>)}</div>
      {SECTIONS.map(([title, items]) => (
        <div key={title}><h4>{t(title)}</h4>{items.map((i) => <button key={i} onClick={() => add(i)}>{t('p.' + i)}</button>)}</div>))}
      <h4>{t('pal.circuits')}</h4>
      {subs.length ? subs.map((n) => <button key={n} title={Object.keys(P_(n)).length ? n : ''} onClick={() => add('@' + n)}>{n}</button>) : <small>{t('pal.none')}</small>}
    </aside>
  );
}
