import type {
  CloudRouterConsolePorts,
} from '@sdkwork/cloudrouter-sdk-ports';
import { loadConsoleOverview } from '@sdkwork/cloudrouter-service';

import { createConsoleDashboardState } from './state/consoleDashboardModel.js';
import type { ConsoleDashboardLabels } from './state/consoleDashboardModel.js';

/**
 * Page controller. ``createConsoleDashboardPage`` is the single entrypoint the WX
 * page calls from ``onLoad``/``onPullDownRefresh``, so the template never talks to a
 * service directly.
 */
export function createConsoleDashboardPage(
  ports: CloudRouterConsolePorts,
  labels: ConsoleDashboardLabels,
) {
  const state = createConsoleDashboardState(labels);
  return {
    state,
    async load(): Promise<void> {
      state.setLoading(true);
      try {
        const snapshot = await loadConsoleOverview(ports);
        state.setSnapshot(snapshot);
      } catch (cause) {
        state.setError(cause instanceof Error ? cause.message : labels.empty);
      } finally {
        state.setLoading(false);
      }
    },
  };
}
