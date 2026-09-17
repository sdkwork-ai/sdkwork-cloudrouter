import type { CloudRouterConsolePorts } from '@sdkwork/cloudrouter-sdk-ports';
import { loadConsoleUsagePage } from '@sdkwork/cloudrouter-service';

import { createConsoleUsageState, type ConsoleUsageLabels } from './state/consoleUsageModel.js';

/** Page controller for the usage list; pages call ``load`` and ``loadMore``. */
export function createConsoleUsagePage(
  ports: CloudRouterConsolePorts,
  labels: ConsoleUsageLabels,
) {
  const state = createConsoleUsageState(labels);
  const load = async (page: number): Promise<void> => {
    state.setLoading(true);
    try {
      state.setRows(await loadConsoleUsagePage(ports, { page, pageSize: state.pageSize }));
    } catch (cause) {
      state.setError(cause instanceof Error ? cause.message : labels.empty);
    } finally {
      state.setLoading(false);
    }
  };
  return {
    state,
    load: () => load(1),
    loadMore: () => load(state.page + 1),
  };
}
