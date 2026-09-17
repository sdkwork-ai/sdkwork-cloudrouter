import type { CloudRouterConsolePorts } from '@sdkwork/cloudrouter-sdk-ports';
import { loadConsoleApiKeys } from '@sdkwork/cloudrouter-service';

import { createConsoleApiKeysState, type ConsoleApiKeysLabels } from './state/consoleApiKeysModel.js';

/** Page controller for API key listing, creation, and revocation. */
export function createConsoleApiKeysPage(
  ports: CloudRouterConsolePorts,
  labels: ConsoleApiKeysLabels,
) {
  const state = createConsoleApiKeysState(labels);
  return {
    state,
    async refresh(): Promise<void> {
      state.setLoading(true);
      try {
        state.setRows(await loadConsoleApiKeys(ports));
      } catch (cause) {
        state.setError(cause instanceof Error ? cause.message : labels.empty);
      } finally {
        state.setLoading(false);
      }
    },
    async create(name: string): Promise<void> {
      const created = await ports.apiKeys.createApiKey({ name });
      state.setCreatedSecret(typeof created.key === 'string' ? created.key : null);
      await this.refresh();
    },
    async revoke(apiKeyId: string): Promise<void> {
      await ports.apiKeys.revokeApiKey(apiKeyId);
      await this.refresh();
    },
  };
}
