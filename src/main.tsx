import type { InitInput, Resvg } from './resvg_type';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from '@/components/theme-provider.tsx';
import App from './App.tsx';
import { Toaster } from './components/ui/sonner.tsx';
import './index.css';
import './resvg.ts';
import './lib/font';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
      <Toaster position="top-center" />
    </ThemeProvider>
  </StrictMode>,
);

declare global {
  // eslint-disable-next-line vars-on-top
  var resvg: {
    Resvg: Resvg;
    initWasm: (module_or_path: Promise<InitInput> | InitInput) => Promise<void>;
  };
}
