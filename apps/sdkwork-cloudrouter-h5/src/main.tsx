import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { adoptLegacyHashRoute } from './bootstrap/legacyHashRoute.js';
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
 * The renderer routes with the History API, so a cashier deep link
 * (`{h5BaseUrl}/cashier/{orderId}?scene=..&outTradeNo=..`) and the hosted app
 * sign-in pathnames render from the URL the navigation arrived on — the address
 * bar keeps the path the QR code or the IAM server opened.
 *
 * A legacy `#/...` link written while the renderer still used hash routing is
 * normalized to its real pathname before the first render, so old QR codes,
 * bookmarks, and mini-program builds still land on the same screen.
 */
adoptLegacyHashRoute();

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
