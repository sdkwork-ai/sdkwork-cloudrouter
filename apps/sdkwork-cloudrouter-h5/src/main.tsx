import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { adoptAppAuthHashEntry } from './app-auth/entryRoute.js';
import { App } from './App.js';
import { bootstrapH5Application } from './bootstrap/runtime.js';
import './index.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('CloudRouter H5 requires a #root container.');
}

/**
 * A navigation that arrived on a hosted app sign-in pathname is adopted into
 * the hash router before the first render, so ``#/auth/...`` and
 * ``/auth/...`` both reach the hosted pages and a deep link that opens the
 * application never renders the console shell first.
 */
adoptAppAuthHashEntry();

/**
 * A bootstrap failure leaves ``#root`` empty, and because the console runtime is a
 * prerequisite for every label the app cannot render a translated error. Surface it
 * instead of dropping the rejection: an unhandled rejection here is invisible to
 * ``console.error`` collection and reads as "the SPA rendered nothing".
 */
void bootstrapH5Application().then(
  () => {
    createRoot(container).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  },
  (error: unknown) => {
    console.error('[cloudrouter-h5] bootstrap failed', error);
    container.textContent = 'CloudRouter 控制台启动失败，请查看浏览器控制台日志。';
  },
);
