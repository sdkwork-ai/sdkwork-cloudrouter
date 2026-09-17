import type { CloudRouterConsolePorts } from '@sdkwork/cloudrouter-sdk-ports';
import { loadConsoleCatalogPage } from '@sdkwork/cloudrouter-service';

import { createConsoleCatalogState, type ConsoleCatalogLabels } from './state/consoleCatalogModel.js';

/** Page controller for the official model and pricing catalog. */
export function createConsoleCatalogPage(
  ports: CloudRouterConsolePorts,
  labels: ConsoleCatalogLabels,
) {
  const state = createConsoleCatalogState(labels);
  return {
    state,
    async load(): Promise<void> {
      state.setLoading(true);
      try {
        state.setRows(await loadConsoleCatalogPage(ports, { pageSize: state.pageSize }));
      } catch (cause) {
        state.setError(cause instanceof Error ? cause.message : labels.empty);
      } finally {
        state.setLoading(false);
      }
    },
  };
}
