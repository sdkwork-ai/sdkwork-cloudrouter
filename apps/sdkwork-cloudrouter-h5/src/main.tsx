import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { adoptAppAuthHashEntry } from './app-auth/entryRoute.js';
import { adoptOrderDeepLinkHash } from './commerce/entryRoute.js';
import { App } from './App.js';
import { bootstrapH5Application } from './bootstrap/runtime.js';
import { initializeThemePreferences } from './themePreference.js';
import './index.css';

/**
 * Apply the persisted light/dark preference before the first render so the
 * shell paints with the resolved palette instead of flashing the system
 * default supplied by the CSS media query.
 */
initializeThemePreferences();

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
 * The order cashier is emitted as a real pathname deep link
 * (`{h5BaseUrl}/cashier/{orderId}?scene=..&outTradeNo=..`). Fold it into the
 * hash router before the first render so the scanned QR code opens the cashier
 * instead of the console fallback.
 */
adoptOrderDeepLinkHash();

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
