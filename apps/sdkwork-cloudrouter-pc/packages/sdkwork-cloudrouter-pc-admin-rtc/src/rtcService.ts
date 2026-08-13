import {
  createBackendRtcClient,
  readSdkWorkItem,
  readSdkWorkListPage,
  type RtcAdminCenterServices,
} from '@sdkwork/rtc-pc-admin-core';
import { getCloudRouterGlobalTokenManager } from '@sdkwork/cloudroutes-pc-commons/sdk-clients';
import { readCloudRouterRuntimeEnv } from '@sdkwork/cloudroutes-pc-commons/utils/env';

/**
 * Cloud Router RTC admin service.
 *
 * Single injected service implementation of `RtcAdminCenterServices` for the
 * Cloud Router admin surface. The backend base URL resolves from
 * `VITE_SDKWORK_RTC_BACKEND_API_BASE_URL` and all requests flow through the
 * portal's shared token manager — mirroring the IAM admin service pattern.
 */

let cloudRouterRtcAdminService: RtcAdminCenterServices | null = null;

function resolveRtcBackendBaseUrl(): string {
  const explicit = readCloudRouterRuntimeEnv('VITE_SDKWORK_RTC_BACKEND_API_BASE_URL');
  if (explicit && explicit.trim().length > 0) {
    return explicit.trim();
  }
  // Fall back to the portal's own backend gateway so the module still renders
  // in deployments that proxy /backend/v3/api/rtc/* through the admin host.
  const portalBackend = readCloudRouterRuntimeEnv('VITE_SDKWORK_PORTAL_BACKEND_API_BASE_URL');
  if (portalBackend && portalBackend.trim().length > 0) {
    return portalBackend.trim();
  }
  return '';
}

export function getCloudRouterRtcAdminService(): RtcAdminCenterServices {
  if (!cloudRouterRtcAdminService) {
    const client = createBackendRtcClient(resolveRtcBackendBaseUrl(), {
      tokenManager: getCloudRouterGlobalTokenManager(),
    });
    cloudRouterRtcAdminService = {
      accounts: {
        list: (params) => client.rtcProviderAccounts.rtc.providerAccounts.list({ page: params?.cursor ? undefined : 1, pageSize: params?.limit ?? 200, cursor: params?.cursor }).then(toListPage),
        create: (command) => client.rtcProviderAccounts.rtc.providerAccounts.create(command).then(readItem),
      },
      applications: {
        list: (accountId, params) =>
          client.rtcProviderApplications.rtc.providerAccounts.applications
            .list(accountId, { pageSize: params?.limit ?? 200, cursor: params?.cursor })
            .then(toListPage),
        create: (accountId, command) =>
          client.rtcProviderApplications.rtc.providerAccounts.applications.create(accountId, command).then(readItem),
        disable: (id) => client.rtcProviderApplications.rtc.providerApplications.disable(id, {}).then(readItem),
      },
      credentials: {
        list: (applicationId, params) =>
          client.rtcProviderCredentials.rtc.providerApplications.credentials
            .list(applicationId, { pageSize: params?.limit ?? 200, cursor: params?.cursor })
            .then(toListPage),
        create: (applicationId, command) =>
          client.rtcProviderCredentials.rtc.providerApplications.credentials
            .create(applicationId, command)
            .then(readItem),
        revoke: (id, reason) =>
          client.rtcProviderCredentials.rtc.providerCredentials.revoke(id, { reason: reason ?? null }).then(readItem),
      },
      profiles: {
        list: (params) => client.rtcProviderProfiles.rtc.providerProfiles.list({ pageSize: params?.limit ?? 200, cursor: params?.cursor }).then(toListPage),
        create: (command) => client.rtcProviderProfiles.rtc.providerProfiles.create(command).then(readItem),
        disable: (id, reason) =>
          client.rtcProviderProfiles.rtc.providerProfiles.disable(id, { reason: reason ?? null }).then(readItem),
        verify: (id, queryKind) => client.rtcProviderProfiles.rtc.providerProfiles.verify(id, { queryKind }),
        configureCapabilities: (id, enabled, disabled) =>
          client.rtcProviderProfiles.rtc.providerProfiles.capabilities
            .update(id, { enabled, disabled })
            .then(readItem),
      },
      routes: {
        list: (params) => client.rtcProviderRoutes.rtc.providerRoutes.list({ pageSize: params?.limit ?? 200, cursor: params?.cursor }).then(toListPage),
      },
      schemas: {
        listSchemas: () => client.rtcProviderSchemas.rtc.providerSchemas.list().then(readList),
      },
      plugins: {
        list: (params) => client.rtcProviderPlugins.rtc.providerPlugins.list({ pageSize: params?.limit ?? 200, cursor: params?.cursor }).then(toListPage),
      },
      webhooks: {
        listEvents: (params) =>
          client.rtcProviderWebhooks.rtc.providerWebhooks.events.list({ pageSize: params?.limit ?? 200, cursor: params?.cursor }).then(toListPage),
      },
      queryJobs: {
        create: (command) => client.rtcProviderQueryJobs.rtc.providerQueryJobs.create(command).then(readItem),
        get: (id) => client.rtcProviderQueryJobs.rtc.providerQueryJobs.retrieve(id).then(readItem),
        listSnapshots: (id) => client.rtcProviderQueryJobs.rtc.providerQueryJobs.snapshots.list(id).then((response) => ({ items: readListItems(response) })),
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
        get: (id) => client.rtcRooms.rtc.rooms.retrieve(id).then(readItem),
        create: (command) => client.rtcRooms.rtc.rooms.create({ title: command.title, roomId: command.roomId ?? null }).then(readItem),
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
        get: (id) => client.rtcMediaSessions.rtc.mediaSessions.retrieve(id).then(readItem),
        close: (id) => client.rtcMediaSessions.rtc.mediaSessions.close(id, {}).then(readItem),
        getCompletionRecord: (id) =>
          client.rtcMediaSessions.rtc.mediaSessions.completionRecord.retrieve(id).then(readItem),
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
        get: (id) => client.rtcMediaArtifacts.rtc.mediaArtifacts.retrieve(id).then(readItem),
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

function readItem<T>(response: unknown): T {
  return readSdkWorkItem<T>(response);
}

function readList<T>(response: unknown): T[] {
  return readSdkWorkListPage<T>(response).items;
}

function readListItems<T>(response: unknown): T[] {
  return readSdkWorkListPage<T>(response).items;
}

function toListPage<T>(response: unknown): { items: T[]; nextCursor?: string | null } {
  const page = readSdkWorkListPage<T>(response);
  return {
    items: page.items,
    nextCursor: page.nextCursor ?? null,
  };
}
