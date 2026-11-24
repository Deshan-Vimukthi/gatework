import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import en from './en.js';
import si from './si.js';
import ta from './ta.js';

export const LANGS = { en: { name: 'English', dict: en }, si: { name: 'සිංහල', dict: si }, ta: { name: 'தமிழ்', dict: ta } };
const Ctx = createContext({ t: (k) => k, lang: 'en', setLang() {} });

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('gw.lang') || (navigator.language || 'en').slice(0, 2));
  const l = LANGS[lang] ? lang : 'en';
  useEffect(() => { document.documentElement.lang = l; localStorage.setItem('gw.lang', l); }, [l]);
  const value = useMemo(() => ({
    lang: l, setLang,
    // falls back to English, then to the key itself; {name} placeholders are filled from `vars`
    t: (k, vars) => (LANGS[l].dict[k] ?? en[k] ?? k).replace(/\{(\w+)\}/g, (_, v) => (vars && vars[v] != null ? vars[v] : '')),
  }), [l]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useT = () => useContext(Ctx);
