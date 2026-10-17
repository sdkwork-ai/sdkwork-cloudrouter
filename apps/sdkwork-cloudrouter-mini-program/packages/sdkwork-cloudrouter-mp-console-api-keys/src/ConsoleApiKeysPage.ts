import type { CloudRouterConsolePorts } from '@sdkwork/cloudrouter-sdk-ports';
import {
  loadConsoleApiKeyPage,
  readNonEmptyString,
  toRecord,
} from '@sdkwork/cloudrouter-service';

import { createConsoleApiKeysState, type ConsoleApiKeysLabels } from './state/consoleApiKeysModel.js';

/** Reads the one-time plaintext secret from a create payload. */
function readCreatedSecret(payload: unknown): string | null {
  const record = toRecord(payload);
  return (
    readNonEmptyString(record, ['key', 'apiKey', 'secret', 'token']) ??
    readNonEmptyString(toRecord(record.data), ['key', 'apiKey', 'secret', 'token']) ??
    null
  );
}

/** Page controller for API key listing, creation, and revocation. */
export function createConsoleApiKeysPage(
  ports: CloudRouterConsolePorts,
  labels: ConsoleApiKeysLabels,
  locale: string,
) {
  const state = createConsoleApiKeysState(labels, locale);
  const load = async (): Promise<void> => {
    state.setLoading(true);
    try {
      const page = await loadConsoleApiKeyPage(ports, { pageSize: state.pageSize });
      state.setRows(page.items);
      state.setError(null);
    } catch (cause) {
      state.setError(cause instanceof Error ? cause.message : labels.empty);
    } finally {
      state.setLoading(false);
    }
  };
  return {
    state,
    load,
    async create(name: string): Promise<void> {
      state.setLoading(true);
      try {
        const created = await ports.apiKeys.createApiKey({ name });
        state.setCreatedSecret(readCreatedSecret(created));
        state.setError(null);
      } catch (cause) {
        state.setError(cause instanceof Error ? cause.message : labels.empty);
      } finally {
        state.setLoading(false);
      }
      await load();
    },
    async revoke(apiKeyId: string): Promise<void> {
      state.setLoading(true);
      try {
        await ports.apiKeys.revokeApiKey(apiKeyId);
        state.setError(null);
      } catch (cause) {
        state.setError(cause instanceof Error ? cause.message : labels.empty);
      } finally {
        state.setLoading(false);
      }
      await load();
    },
  };
}
