import type { CloudRouterTransportPayload } from '@sdkwork/cloudrouter-contracts';
import type {
  CloudRouterConsolePorts,
  ConsoleApiKeyCreateInput,
  CloudRouterConsoleQuery,
  ConsoleCatalogQuery,
  ConsoleNotificationQuery,
  ConsoleUsageQuery,
} from '@sdkwork/cloudrouter-sdk-ports';

import { getCloudRouterH5AppSdkClient } from './sdkClients.js';
import { readCloudRouterSession, writeCloudRouterSession, clearCloudRouterSession } from '../session/sessionStore.js';

/**
 * Wire-required `CreateApiKeyRequest` values the console port contract leaves
 * implicit. Defaults mirror the PC console form
 * (`sdkwork-cloudrouter-pc-console-api-keys/src/apiKeyForm.ts`) so both browser
 * roots create equivalent keys.
 */
const DEFAULT_API_KEY_QUOTA = '0.000000';
const DEFAULT_API_KEY_IP_LIMIT = 'unrestricted';
const DEFAULT_API_KEY_EXPIRATION = 'never';
const DEFAULT_API_KEY_MODALITIES = ['text', 'image', 'video', 'audio', 'music'] as const;

/** `Idempotency-Key` value for a client-initiated key creation. */
function createConsoleOperationToken(prefix: string): string {
  const unique =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${unique}`;
}

/**
 * Console ports implemented on the generated Cloud Router app SDK.
 *
 * Each port is a thin adapter: it forwards the generated payload unchanged and
 * lets `@sdkwork/cloudrouter-service` own normalization so every client root
 * renders the same view models.
 */
export function createCloudRouterH5ConsolePorts(): CloudRouterConsolePorts {
  const client = () => getCloudRouterH5AppSdkClient();

  return {
    overview: {
      retrieveOverview: async (): Promise<CloudRouterTransportPayload> =>
        (await client().ai.dashboard.overview.retrieve()) as unknown as CloudRouterTransportPayload,
    },
    usage: {
      listUsageLogs: async (query: ConsoleUsageQuery): Promise<CloudRouterTransportPayload> =>
        (await client().ai.usage.logs.list({
          ...(query.pageSize !== undefined ? { pageSize: query.pageSize } : {}),
          ...(query.model !== undefined ? { q: query.model } : {}),
          ...(query.status === 'succeeded'
            ? { status: 'success' as const }
            : query.status === 'failed'
              ? { status: 'error' as const }
              : {}),
        })) as unknown as CloudRouterTransportPayload,
    },
    apiKeys: {
      listApiKeys: async (query: CloudRouterConsoleQuery): Promise<CloudRouterTransportPayload> =>
        (await client().iam.apiKeys.list({
          ...(query.pageSize !== undefined ? { pageSize: query.pageSize } : {}),
        })) as unknown as CloudRouterTransportPayload,
      createApiKey: async (input: ConsoleApiKeyCreateInput): Promise<CloudRouterTransportPayload> =>
        (await client().iam.apiKeys.create(
          {
            name: input.name,
            quota: input.quota ?? DEFAULT_API_KEY_QUOTA,
            isUnlimitedQuota: input.isUnlimitedQuota ?? true,
            modalities: [...(input.modalities ?? DEFAULT_API_KEY_MODALITIES)],
            ipLimit: input.ipLimit ?? DEFAULT_API_KEY_IP_LIMIT,
            expires: input.expires ?? DEFAULT_API_KEY_EXPIRATION,
          },
          { idempotencyKey: createConsoleOperationToken('create-api-key') },
        )) as unknown as CloudRouterTransportPayload,
      revokeApiKey: async (apiKeyId: string): Promise<void> => {
        await client().iam.apiKeys.delete(apiKeyId);
      },
    },
    catalog: {
      listPricingRates: async (query: ConsoleCatalogQuery): Promise<CloudRouterTransportPayload> =>
        (await client().ai.pricing.rates.list({
          ...(query.pageSize !== undefined ? { pageSize: query.pageSize } : {}),
          ...(query.vendor !== undefined ? { vendor: query.vendor } : {}),
          ...(query.keyword !== undefined ? { q: query.keyword } : {}),
        })) as unknown as CloudRouterTransportPayload,
    },
    notifications: {
      listNotifications: async (query: ConsoleNotificationQuery): Promise<CloudRouterTransportPayload> =>
        (await client().notification.list({
          ...(query.pageSize !== undefined ? { pageSize: query.pageSize } : {}),
        })) as unknown as CloudRouterTransportPayload,
    },
    session: {
      readSession: readCloudRouterSession,
      saveSession: writeCloudRouterSession,
      clearSession: clearCloudRouterSession,
    },
  };
}
