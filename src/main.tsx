import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from '@/components/theme-provider.tsx';
import App from './App.tsx';
import { Toaster } from './components/ui/sonner.tsx';
import './index.css';
import '@fontsource/anton/400.css';
import '@fontsource/noto-serif-sc/900.css';
import './lib/font';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
      <Toaster position="top-center" />
    </ThemeProvider>
  </StrictMode>,
);
