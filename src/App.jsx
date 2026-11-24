import { useEffect } from 'react';
import { I18nProvider } from './i18n/index.jsx';
import CanvasView from './ui/CanvasView.jsx';
import CircuitBar from './ui/CircuitBar.jsx';
import Header from './ui/Header.jsx';
import Palette from './ui/Palette.jsx';
import SidePanel from './ui/SidePanel.jsx';
import { ui, useEngine } from './ui/store.js';
import { useTheme } from './ui/theme.js';
import { initProject } from './engine/index.js';
import { setSymbolImage } from './engine/index.js';
import symbolImages from './symbols.config.js';

initProject();
Object.entries(symbolImages).forEach(([type, url]) => setSymbolImage(type, url));

function Shell() {
  useEngine();
  const [theme, setTheme] = useTheme();
  return (
    <div className="app">
      <Header theme={theme} setTheme={setTheme} />
      <main>
        <Palette theme={theme} />
        <div id="mid"><CanvasView /><CircuitBar /></div>
        <SidePanel />
      </main>
      {ui.toast && <div className="toast" role="status">{ui.toast}</div>}
    </div>
  );
}
export default function App() { return <I18nProvider><Shell /></I18nProvider>; }
