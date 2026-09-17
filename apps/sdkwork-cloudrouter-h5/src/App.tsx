import { useState } from 'react';
import { HashRouter } from 'react-router-dom';

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
        <ConsoleRouteAssembly />
      </ConsoleRuntimeProvider>
    </HashRouter>
  );
}
