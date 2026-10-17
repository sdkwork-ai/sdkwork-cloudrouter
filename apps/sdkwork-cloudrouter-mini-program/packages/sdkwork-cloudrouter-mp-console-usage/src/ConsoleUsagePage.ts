import type { CloudRouterConsolePorts } from '@sdkwork/cloudrouter-sdk-ports';
import { loadConsoleUsagePage } from '@sdkwork/cloudrouter-service';

import { createConsoleUsageState, type ConsoleUsageLabels } from './state/consoleUsageModel.js';

/** Page controller for the usage list; pages call ``load`` and ``loadMore``. */
export function createConsoleUsagePage(
  ports: CloudRouterConsolePorts,
  labels: ConsoleUsageLabels,
  locale: string,
) {
  const state = createConsoleUsageState(labels, locale);
  const load = async (page: number, append: boolean): Promise<void> => {
    if (append) {
      state.setLoadingMore(true);
    } else {
      state.setLoading(true);
    }
    try {
      const result = await loadConsoleUsagePage(ports, { page, pageSize: state.pageSize });
      if (append) {
        state.appendRows(result);
      } else {
        state.setRows(result);
      }
      state.setError(null);
    } catch (cause) {
      state.setError(cause instanceof Error ? cause.message : labels.empty);
    } finally {
      state.setLoading(false);
      state.setLoadingMore(false);
    }
  };
  return {
    state,
    load: () => load(1, false),
    loadMore: () => load(state.page + 1, true),
  };
}
