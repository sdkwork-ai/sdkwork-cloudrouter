import { useState } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';

import { AppAuthorizeEntryPage, AppLaunchPage, AppSignInPage } from './app-auth/AppAuthPages.js';
import { ConsoleRouteAssembly } from './routes/consoleRoutes.js';
import {
  ConsoleRuntimeProvider,
  consumePendingConsoleRuntime,
  type ConsoleRuntimeConfiguration,
} from './providers/AppProviders.js';

/**
 * ``bootstrapH5Application()`` configures the console runtime before the first
 * render (`src/main.tsx`); the pending configuration is consumed exactly once
 * here so the provider tree and the router share one runtime value.
 *
 * The hosted app sign-in routes are siblings of the console assembly: they
 * serve a native application's browser login and must render without the
 * console authentication gate, which would otherwise capture the visitor
 * before the authorization hand-off can run.
 */
export function App() {
  const [configuration] = useState<ConsoleRuntimeConfiguration | null>(
    () => consumePendingConsoleRuntime(),
  );
  if (!configuration) {
    throw new Error('CloudRouter H5 console runtime was not configured before render.');
  }
  return (
    <HashRouter>
      <ConsoleRuntimeProvider configuration={configuration}>
        <Routes>
          <Route path="/auth/app" element={<AppAuthorizeEntryPage />} />
          <Route path="/iam/v3/oauth/authorize" element={<AppAuthorizeEntryPage />} />
          <Route path="/iam/oauth/authorize" element={<AppAuthorizeEntryPage />} />
          <Route path="/auth/login" element={<AppSignInPage />} />
          <Route path="/auth/desktop/launch" element={<AppLaunchPage />} />
          <Route path="*" element={<ConsoleRouteAssembly />} />
        </Routes>
      </ConsoleRuntimeProvider>
    </HashRouter>
  );
}
