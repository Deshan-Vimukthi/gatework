import { it, expect } from 'vitest';
import en from '../src/i18n/en.js';
import si from '../src/i18n/si.js';
import ta from '../src/i18n/ta.js';

it('Sinhala and Tamil cover every English key (and have no extras)', () => {
  const k = Object.keys(en).sort();
  expect(Object.keys(si).sort()).toEqual(k);
  expect(Object.keys(ta).sort()).toEqual(k);
});
it('placeholders match across languages', () => {
  const ph = (s) => (s.match(/\{\w+\}/g) || []).sort().join();
  Object.keys(en).forEach((key) => { expect(ph(si[key]), key).toBe(ph(en[key])); expect(ph(ta[key]), key).toBe(ph(en[key])); });
});
