import {
  createBackendRtcClient,
  type ProviderProfileVerifyResult,
  type RtcAdminCenterServices,
} from '@sdkwork/rtc-pc-admin-core';
import {
  getCloudRouterGlobalTokenManager,
  resolveCloudRouterDependencyBackendBaseUrl,
} from '@sdkwork/cloudroutes-pc-commons/sdk-clients';

/**
 * Cloud Router RTC admin service.
 *
 * Single injected service implementation of `RtcAdminCenterServices` for the
 * Cloud Router admin surface. All requests flow through the generated
 * `@sdkwork/rtc-backend-sdk` client and the portal's shared token manager —
 * mirroring the IAM admin service pattern. The RTC backend surface is a
 * dependency surface served by the Cloud Router gateway under
 * the backend API surface (same-origin dependency composition, API_ASSEMBLY_SPEC
 * §6.1), so the base URL follows the portal dependency-SDK resolution chain:
 * `VITE_SDKWORK_RTC_BACKEND_API_BASE_URL`, then
 * `VITE_CLOUDROUTER_BACKEND_API_BASE_URL`, then `PORTAL_PUBLIC_SDK_BASE_URL`
 * + the backend API surface, then the same-origin prefix.
 */

let cloudRouterRtcAdminService: RtcAdminCenterServices | null = null;

/**
 * Idempotency key for mutating RTC commands (API_SPEC §15.6). Every create /
 * update / disable / revoke / command call carries one so a retried request is
 * deduplicated by the RTC backend instead of creating a second resource.
 */
function newIdempotencyKey(): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    return cryptoApi.randomUUID();
  }
  return `rtc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getCloudRouterRtcAdminService(): RtcAdminCenterServices {
  if (!cloudRouterRtcAdminService) {
    const client = createBackendRtcClient(
      resolveCloudRouterDependencyBackendBaseUrl('VITE_SDKWORK_RTC_BACKEND_API_BASE_URL'),
      {
        tokenManager: getCloudRouterGlobalTokenManager(),
      },
    );
    cloudRouterRtcAdminService = {
      accounts: {
        list: (params) => client.rtcProviderAccounts.rtc.providerAccounts.list({ page: params?.cursor ? undefined : 1, pageSize: params?.limit ?? 200, cursor: params?.cursor }).then(toListPage),
        get: (id) => client.rtcProviderAccounts.rtc.providerAccounts.retrieve(id),
        create: (command) =>
          client.rtcProviderAccounts.rtc.providerAccounts.create(
            command as Parameters<typeof client.rtcProviderAccounts.rtc.providerAccounts.create>[0],
            { idempotencyKey: newIdempotencyKey() },
          ),
        update: (id, command) =>
          client.rtcProviderAccounts.rtc.providerAccounts.update(
            id,
            { idempotencyKey: newIdempotencyKey() },
            command as Parameters<typeof client.rtcProviderAccounts.rtc.providerAccounts.update>[2],
          ),
        disable: (id, reason) =>
          client.rtcProviderAccounts.rtc.providerAccounts.disable(
            id,
            { reason: reason ?? null },
            { idempotencyKey: newIdempotencyKey() },
          ),
        activate: (id) =>
          client.rtcProviderAccounts.rtc.providerAccounts.activate(id, {}),
      },
      applications: {
        list: (accountId, params) =>
          client.rtcProviderApplications.rtc.providerAccounts.applications
            .list(accountId, { pageSize: params?.limit ?? 200, cursor: params?.cursor })
            .then(toListPage),
        get: (id) => client.rtcProviderApplications.rtc.providerApplications.retrieve(id),
        create: (accountId, command) =>
          client.rtcProviderApplications.rtc.providerAccounts.applications.create(
            accountId,
            command as Parameters<
              typeof client.rtcProviderApplications.rtc.providerAccounts.applications.create
            >[1],
            { idempotencyKey: newIdempotencyKey() },
          ),
        update: (id, command) =>
          client.rtcProviderApplications.rtc.providerApplications.update(
            id,
            { idempotencyKey: newIdempotencyKey() },
            command as Parameters<
              typeof client.rtcProviderApplications.rtc.providerApplications.update
            >[2],
          ),
        disable: (id, reason) =>
          client.rtcProviderApplications.rtc.providerApplications.disable(
            id,
            { reason: reason ?? null },
            { idempotencyKey: newIdempotencyKey() },
          ),
      },
      credentials: {
        list: (applicationId, params) =>
          client.rtcProviderCredentials.rtc.providerApplications.credentials
            .list(applicationId, { pageSize: params?.limit ?? 200, cursor: params?.cursor })
            .then(toListPage),
        get: (id) => client.rtcProviderCredentials.rtc.providerCredentials.retrieve(id),
        create: (applicationId, command) =>
          client.rtcProviderCredentials.rtc.providerApplications.credentials.create(
            applicationId,
            command as Parameters<
              typeof client.rtcProviderCredentials.rtc.providerApplications.credentials.create
            >[1],
            { idempotencyKey: newIdempotencyKey() },
          ),
        update: (id, command) =>
          client.rtcProviderCredentials.rtc.providerCredentials.update(
            id,
            { idempotencyKey: newIdempotencyKey() },
            command as Parameters<
              typeof client.rtcProviderCredentials.rtc.providerCredentials.update
            >[2],
          ),
        revoke: (id, reason) =>
          client.rtcProviderCredentials.rtc.providerCredentials.revoke(
            id,
            { reason: reason ?? null },
            { idempotencyKey: newIdempotencyKey() },
          ),
      },
      profiles: {
        list: (params) => client.rtcProviderProfiles.rtc.providerProfiles.list({ pageSize: params?.limit ?? 200, cursor: params?.cursor }).then(toListPage),
        get: (id) => client.rtcProviderProfiles.rtc.providerProfiles.retrieve(id),
        create: (command) =>
          client.rtcProviderProfiles.rtc.providerProfiles.create(
            command as Parameters<typeof client.rtcProviderProfiles.rtc.providerProfiles.create>[0],
            { idempotencyKey: newIdempotencyKey() },
          ),
        update: (id, command) =>
          client.rtcProviderProfiles.rtc.providerProfiles.update(
            id,
            { idempotencyKey: newIdempotencyKey() },
            command as Parameters<typeof client.rtcProviderProfiles.rtc.providerProfiles.update>[2],
          ),
        disable: (id, reason) =>
          client.rtcProviderProfiles.rtc.providerProfiles.disable(
            id,
            { reason: reason ?? null },
            { idempotencyKey: newIdempotencyKey() },
          ),
        activate: (id) =>
          client.rtcProviderProfiles.rtc.providerProfiles.activate(id, {}),
        verify: (id, mode) =>
          client.rtcProviderProfiles.rtc.providerProfiles.verify(
            id,
            { queryKind: mode },
            { idempotencyKey: newIdempotencyKey() },
          ) as Promise<ProviderProfileVerifyResult>,
        configureCapabilities: (id, enabled, disabled) =>
          client.rtcProviderProfiles.rtc.providerProfiles.capabilities.update(
            id,
            {
              enabledCapabilities: enabled,
              disabledCapabilities: disabled,
            },
            { idempotencyKey: newIdempotencyKey() },
          ),
      },
      routes: {
        list: (params) => client.rtcProviderRoutes.rtc.providerRoutes.list({ pageSize: params?.limit ?? 200, cursor: params?.cursor }).then(toListPage),
        get: (id) => client.rtcProviderRoutes.rtc.providerRoutes.retrieve(id),
        create: (command) =>
          client.rtcProviderRoutes.rtc.providerRoutes.create(
            command as Parameters<typeof client.rtcProviderRoutes.rtc.providerRoutes.create>[0],
            { idempotencyKey: newIdempotencyKey() },
          ),
        update: (id, command) =>
          client.rtcProviderRoutes.rtc.providerRoutes.update(
            id,
            { idempotencyKey: newIdempotencyKey() },
            command as Parameters<typeof client.rtcProviderRoutes.rtc.providerRoutes.update>[2],
          ),
        disable: (id, reason) =>
          client.rtcProviderRoutes.rtc.providerRoutes.disable(
            id,
            { reason: reason ?? null },
            { idempotencyKey: newIdempotencyKey() },
          ),
      },
      schemas: {
        listSchemas: () => client.rtcProviderSchemas.rtc.providerSchemas.list().then((response) => response.items),
      },
      plugins: {
        list: () => client.rtcProviderPlugins.rtc.providerPlugins.list().then(toListPage),
      },
      webhooks: {
        listEvents: (params) =>
          client.rtcProviderWebhooks.rtc.providerWebhooks.events.list({ pageSize: params?.limit ?? 200, cursor: params?.cursor }).then(toListPage),
      },
      queryJobs: {
        create: (command) =>
          client.rtcProviderQueryJobs.rtc.providerQueryJobs.create(
            command as Parameters<typeof client.rtcProviderQueryJobs.rtc.providerQueryJobs.create>[0],
            { idempotencyKey: newIdempotencyKey() },
          ),
        get: (id) => client.rtcProviderQueryJobs.rtc.providerQueryJobs.retrieve(id),
        listSnapshots: (id) => client.rtcProviderQueryJobs.rtc.providerQueryJobs.snapshots.list(id).then((response) => ({ items: response.items })),
      },
      rooms: {
        list: (params) =>
          client.rtcRooms.rtc.rooms
            .list({
              pageSize: params?.limit ?? 200,
              cursor: params?.cursor,
              q: params?.search,
              sort: params?.sort,
              status: params?.status,
              ownerUserId: params?.ownerUserId,
              createdAfter: params?.createdAfter,
            })
            .then(toListPage),
        get: (id) => client.rtcRooms.rtc.rooms.retrieve(id),
        create: (command) =>
          client.rtcRooms.rtc.rooms.create(
            { title: command.title, roomId: command.roomId ?? null },
            { idempotencyKey: newIdempotencyKey() },
          ),
      },
      mediaSessions: {
        list: (params) =>
          client.rtcMediaSessions.rtc.mediaSessions
            .list({
              pageSize: params?.limit ?? 200,
              cursor: params?.cursor,
              q: params?.search,
              sort: params?.sort,
              status: params?.status,
              ownerUserId: params?.ownerUserId,
              createdAfter: params?.createdAfter,
            })
            .then(toListPage),
        get: (id) => client.rtcMediaSessions.rtc.mediaSessions.retrieve(id),
        close: (id) =>
          client.rtcMediaSessions.rtc.mediaSessions.close(
            id,
            {},
            { idempotencyKey: newIdempotencyKey() },
          ),
        getCompletionRecord: (id) =>
          client.rtcMediaSessions.rtc.mediaSessions.completionRecord.retrieve(id),
      },
      mediaArtifacts: {
        list: (params) =>
          client.rtcMediaArtifacts.rtc.mediaArtifacts
            .list({
              pageSize: params?.limit ?? 200,
              cursor: params?.cursor,
              q: params?.search,
              sort: params?.sort,
              status: params?.status,
              createdAfter: params?.createdAfter,
            })
            .then(toListPage),
        get: (id) => client.rtcMediaArtifacts.rtc.mediaArtifacts.retrieve(id),
      },
      qualitySamples: {
        list: (params) =>
          client.rtcQualitySamples.rtc.qualitySamples
            .list({
              pageSize: params?.limit ?? 200,
              cursor: params?.cursor,
              q: params?.search,
              sort: params?.sort,
              createdAfter: params?.createdAfter,
            })
            .then(toListPage),
      },
    };
  }
  return cloudRouterRtcAdminService;
}

export function resetCloudRouterRtcAdminService(): void {
  cloudRouterRtcAdminService = null;
}

/**
 * SdkWork-v3 list page already unwrapped by the generated SDK (data payload
 * `{ items, pageInfo }`); normalized to the admin port's page shape.
 */
interface SdkWorkListPage<T> {
  items: T[];
  pageInfo?: { mode: string; nextCursor?: string | null; hasMore?: boolean };
}

function toListPage<T>(response: SdkWorkListPage<T>): { items: T[]; nextCursor?: string } {
  const nextCursor = response.pageInfo?.nextCursor;
  return {
    items: response.items,
    nextCursor: nextCursor && nextCursor.length > 0 ? nextCursor : undefined,
  };
}
