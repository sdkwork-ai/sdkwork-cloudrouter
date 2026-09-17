import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App.js';
import { bootstrapH5Application } from './bootstrap/runtime.js';
import './index.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('CloudRouter H5 requires a #root container.');
}

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
