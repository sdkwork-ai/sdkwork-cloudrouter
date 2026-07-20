import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminCacheService } from './cacheService';
import { getClawRouterBackendSdkClient } from '@sdkwork/clawroutes-pc-commons/sdk-clients';

vi.mock('@sdkwork/clawroutes-pc-commons/sdk-clients', () => ({
  getClawRouterBackendSdkClient: vi.fn(),
}));

const mockedGetBackendClient = vi.mocked(getClawRouterBackendSdkClient);

function createBackendSdkMock() {
  return {
    system: {
      cache: {
        overview: {
          list: vi.fn(),
        },
        refresh: vi.fn(),
        instances: {
          delete: vi.fn(),
          refresh: vi.fn(),
        },
        namespaces: {
          delete: vi.fn(),
          refresh: vi.fn(),
          keys: {
            list: vi.fn(),
            delete: vi.fn(),
          },
        },
      },
    },
  };
}

function createOverviewPayload(overrides: Record<string, unknown> = {}) {
  return {
    summary: {
      runtimeTarget: 'service',
      totalInstances: 1,
      totalNamespaces: 1,
      totalEntries: 3,
      expiredEntries: 0,
      cacheHits: 12,
      cacheMisses: 3,
      cacheWrites: 8,
      cacheDeletes: 2,
      cacheRefreshes: 1,
      cacheInspections: 4,
      cacheErrors: 1,
    },
    instances: [
      {
        name: 'redis-default',
        providerKind: 'redis_cache',
        purpose: 'Shared service cache',
        keyPrefix: 'claw',
        defaultTtlSeconds: 900,
        maxEntries: null,
        connectionProfileName: 'primary-redis',
        supportsInspect: true,
        supportsRefresh: true,
        supportsDelete: true,
        entryCount: 3,
        expiredEntryCount: 0,
        cacheHits: 12,
        cacheMisses: 3,
        cacheWrites: 8,
        cacheDeletes: 2,
        cacheRefreshes: 1,
        cacheInspections: 4,
        cacheErrors: 1,
        status: 'healthy',
      },
    ],
    namespacePolicies: [
      {
        namespace: 'auth.qr.challenge',
        instanceName: 'redis-default',
        ttlSeconds: 120,
        scope: 'session',
        sensitivity: 'credential',
        failureMode: 'fail_closed',
        consistency: 'coordination_critical',
        jitterPercent: 0,
        staleWhileRevalidateSeconds: 0,
        tags: ['auth', 'qr'],
        enabled: true,
      },
    ],
    ...overrides,
  };
}

function createOperationOutcome(overrides: Record<string, unknown> = {}) {
  return {
    operation: 'delete_key',
    instanceName: 'redis-default',
    namespace: 'auth.qr.challenge',
    cacheKey: 'login-qr-1',
    deletedEntries: 1,
    refreshedEntries: 0,
    status: 'completed',
    ...overrides,
  };
}

function createPageInfo(overrides: Record<string, unknown> = {}) {
  return {
    mode: 'cursor',
    pageSize: 200,
    hasMore: false,
    nextCursor: null,
    ...overrides,
  };
}

function createKeyListPayload(overrides: Record<string, unknown> = {}) {
  return {
    namespace: 'auth.qr.challenge',
    instanceName: 'redis-default',
    scannedItems: 2,
    returnedItems: 2,
    scanComplete: true,
    pageInfo: createPageInfo(),
    items: [
      {
        key: 'login-qr-1',
        namespace: 'auth.qr.challenge',
        instanceName: 'redis-default',
        status: 'active',
        expiresInSeconds: 119,
      },
      {
        key: 'login-qr-2',
        namespace: 'auth.qr.challenge',
        instanceName: 'redis-default',
        status: 'active',
        expiresInSeconds: null,
      },
    ],
    ...overrides,
  };
}

describe('AdminCacheService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('loads cache overview through the generated backend SDK and normalizes the response', async () => {
    const backendSdk = createBackendSdkMock();
    backendSdk.system.cache.overview.list.mockResolvedValue(createOverviewPayload());
    mockedGetBackendClient.mockReturnValue(backendSdk as never);

    const overview = await AdminCacheService.fetchOverview();

    expect(backendSdk.system.cache.overview.list).toHaveBeenCalledTimes(1);
    expect(overview.summary).toEqual({
      runtimeTarget: 'service',
      totalInstances: 1,
      totalNamespaces: 1,
      totalEntries: 3,
      expiredEntries: 0,
      cacheHits: 12,
      cacheMisses: 3,
      cacheWrites: 8,
      cacheDeletes: 2,
      cacheRefreshes: 1,
      cacheInspections: 4,
      cacheErrors: 1,
    });
    expect(overview.instances).toHaveLength(1);
    expect(overview.instances[0]).toMatchObject({
      name: 'redis-default',
      providerKind: 'redis_cache',
      connectionProfileName: 'primary-redis',
      entryCount: 3,
      cacheHits: 12,
      cacheMisses: 3,
      cacheErrors: 1,
    });
    expect(overview.namespacePolicies).toHaveLength(1);
    expect(overview.namespacePolicies[0]).toMatchObject({
      namespace: 'auth.qr.challenge',
      instanceName: 'redis-default',
      failureMode: 'fail_closed',
      consistency: 'coordination_critical',
      jitterPercent: 0,
      staleWhileRevalidateSeconds: 0,
      enabled: true,
    });
  });

  it('rejects overview payloads that omit required collection fields', async () => {
    const backendSdk = createBackendSdkMock();
    backendSdk.system.cache.overview.list.mockResolvedValue(createOverviewPayload({ instances: undefined }));
    mockedGetBackendClient.mockReturnValue(backendSdk as never);

    await expect(AdminCacheService.fetchOverview()).rejects.toThrow('Cache instances are required');
  });

  it('rejects overview payloads whose summary counts do not match returned collections', async () => {
    const backendSdk = createBackendSdkMock();
    backendSdk.system.cache.overview.list.mockResolvedValue(createOverviewPayload({
      summary: {
        runtimeTarget: 'service',
        totalInstances: 2,
        totalNamespaces: 1,
        totalEntries: 3,
        expiredEntries: 0,
        cacheHits: 12,
        cacheMisses: 3,
        cacheWrites: 8,
        cacheDeletes: 2,
        cacheRefreshes: 1,
        cacheInspections: 4,
        cacheErrors: 1,
      },
    }));
    mockedGetBackendClient.mockReturnValue(backendSdk as never);

    await expect(AdminCacheService.fetchOverview()).rejects.toThrow('Cache instance count does not match returned instances');
  });

  it('validates overview operation metrics against instance metrics while allowing system errors in the summary', async () => {
    const backendSdk = createBackendSdkMock();
    mockedGetBackendClient.mockReturnValue(backendSdk as never);

    backendSdk.system.cache.overview.list.mockResolvedValueOnce(createOverviewPayload({
      summary: {
        runtimeTarget: 'service',
        totalInstances: 1,
        totalNamespaces: 1,
        totalEntries: 3,
        expiredEntries: 0,
        cacheHits: 13,
        cacheMisses: 3,
        cacheWrites: 8,
        cacheDeletes: 2,
        cacheRefreshes: 1,
        cacheInspections: 4,
        cacheErrors: 1,
      },
    }));
    await expect(AdminCacheService.fetchOverview()).rejects.toThrow('Cache hit metric does not match returned instances');

    backendSdk.system.cache.overview.list.mockResolvedValueOnce(createOverviewPayload({
      summary: {
        runtimeTarget: 'service',
        totalInstances: 1,
        totalNamespaces: 1,
        totalEntries: 3,
        expiredEntries: 0,
        cacheHits: 12,
        cacheMisses: 3,
        cacheWrites: 8,
        cacheDeletes: 2,
        cacheRefreshes: 1,
        cacheInspections: 4,
        cacheErrors: 0,
      },
    }));
    await expect(AdminCacheService.fetchOverview()).rejects.toThrow('Cache error metric is lower than returned instance errors');

    backendSdk.system.cache.overview.list.mockResolvedValueOnce(createOverviewPayload({
      summary: {
        runtimeTarget: 'service',
        totalInstances: 1,
        totalNamespaces: 1,
        totalEntries: 3,
        expiredEntries: 0,
        cacheHits: 12,
        cacheMisses: 3,
        cacheWrites: 8,
        cacheDeletes: 2,
        cacheRefreshes: 1,
        cacheInspections: 4,
        cacheErrors: 2,
      },
    }));
    await expect(AdminCacheService.fetchOverview()).resolves.toMatchObject({
      summary: {
        cacheErrors: 2,
      },
      instances: [
        {
          cacheErrors: 1,
        },
      ],
    });
  });

  it('rejects namespace policies that use unsupported policy values', async () => {
    const backendSdk = createBackendSdkMock();
    backendSdk.system.cache.overview.list.mockResolvedValue(createOverviewPayload({
      namespacePolicies: [
        {
          namespace: 'auth.qr.challenge',
          instanceName: 'redis-default',
          ttlSeconds: 120,
          scope: 'global-user',
          sensitivity: 'secretive',
          failureMode: 'silent_ignore',
          consistency: 'eventual',
          jitterPercent: 0,
          staleWhileRevalidateSeconds: 0,
          tags: ['auth', 'qr'],
          enabled: true,
        },
      ],
    }));
    mockedGetBackendClient.mockReturnValue(backendSdk as never);

    await expect(AdminCacheService.fetchOverview()).rejects.toThrow('Unsupported cache namespace scope');
  });

  it('routes cache operations through the generated backend SDK', async () => {
    const backendSdk = createBackendSdkMock();
    const outcome = createOperationOutcome();
    backendSdk.system.cache.refresh.mockResolvedValue(outcome);
    backendSdk.system.cache.instances.delete.mockResolvedValue(undefined);
    backendSdk.system.cache.instances.refresh.mockResolvedValue(outcome);
    backendSdk.system.cache.namespaces.refresh.mockResolvedValue({
      ...outcome,
      operation: 'refresh_namespace',
    });
    backendSdk.system.cache.namespaces.delete.mockResolvedValue(undefined);
    backendSdk.system.cache.namespaces.keys.delete.mockResolvedValue(undefined);
    mockedGetBackendClient.mockReturnValue(backendSdk as never);

    await expect(AdminCacheService.refreshAll()).resolves.toMatchObject({ operation: 'delete_key' });
    await expect(AdminCacheService.deleteInstance('redis-default')).resolves.toBeUndefined();
    await expect(AdminCacheService.refreshInstance('redis-default')).resolves.toMatchObject({ instanceName: 'redis-default' });
    await expect(AdminCacheService.refreshNamespace('auth.qr.challenge')).resolves.toMatchObject({
      operation: 'refresh_namespace',
      namespace: 'auth.qr.challenge',
    });
    await expect(AdminCacheService.deleteNamespace('auth.qr.challenge')).resolves.toBeUndefined();
    await expect(AdminCacheService.deleteKey('auth.qr.challenge', 'login-qr-1')).resolves.toBeUndefined();

    expect(backendSdk.system.cache.refresh).toHaveBeenCalledTimes(1);
    expect(backendSdk.system.cache.instances.delete).toHaveBeenCalledWith('redis-default');
    expect(backendSdk.system.cache.instances.refresh).toHaveBeenCalledWith('redis-default');
    expect(backendSdk.system.cache.namespaces.refresh).toHaveBeenCalledWith('auth.qr.challenge');
    expect(backendSdk.system.cache.namespaces.delete).toHaveBeenCalledWith('auth.qr.challenge');
    expect(backendSdk.system.cache.namespaces.keys.delete).toHaveBeenCalledWith('auth.qr.challenge', 'login-qr-1');
  });

  it('lists namespace cache keys through the generated backend SDK and normalizes safe metadata only', async () => {
    const backendSdk = createBackendSdkMock();
    backendSdk.system.cache.namespaces.keys.list.mockResolvedValue(createKeyListPayload());
    mockedGetBackendClient.mockReturnValue(backendSdk as never);

    const keys = await AdminCacheService.listKeys('auth.qr.challenge');

    expect(backendSdk.system.cache.namespaces.keys.list).toHaveBeenCalledWith('auth.qr.challenge', { pageSize: 200 });
    expect(keys).toEqual({
      namespace: 'auth.qr.challenge',
      instanceName: 'redis-default',
      scannedItems: 2,
      returnedItems: 2,
      scanComplete: true,
      pageInfo: {
        mode: 'cursor',
        pageSize: 200,
        hasMore: false,
        nextCursor: null,
      },
      items: [
        {
          key: 'login-qr-1',
          namespace: 'auth.qr.challenge',
          instanceName: 'redis-default',
          status: 'active',
          expiresInSeconds: 119,
        },
        {
          key: 'login-qr-2',
          namespace: 'auth.qr.challenge',
          instanceName: 'redis-default',
          status: 'active',
          expiresInSeconds: null,
        },
      ],
    });
    expect(JSON.stringify(keys)).not.toContain('secret');
    expect(JSON.stringify(keys)).not.toContain('value');
  });

  it('rejects namespace key list payloads whose scanned counts do not match returned items', async () => {
    const backendSdk = createBackendSdkMock();
    backendSdk.system.cache.namespaces.keys.list.mockResolvedValue(createKeyListPayload({
      scannedItems: 2,
      returnedItems: 2,
      scanComplete: false,
      pageInfo: createPageInfo({ hasMore: true, nextCursor: 'cursor-page-2' }),
      items: [
        {
          key: 'login-qr-1',
          namespace: 'auth.qr.challenge',
          instanceName: 'redis-default',
          status: 'active',
          expiresInSeconds: 119,
        },
      ],
    }));
    mockedGetBackendClient.mockReturnValue(backendSdk as never);

    await expect(AdminCacheService.listKeys('auth.qr.challenge')).rejects.toThrow('Cache returned key count does not match returned items');
  });

  it('passes an explicit safe page size when listing namespace cache keys', async () => {
    const backendSdk = createBackendSdkMock();
    backendSdk.system.cache.namespaces.keys.list.mockResolvedValue(createKeyListPayload({
      scannedItems: 1,
      returnedItems: 1,
      pageInfo: createPageInfo({ pageSize: 50 }),
      items: [
        {
          key: 'login-qr-1',
          namespace: 'auth.qr.challenge',
          instanceName: 'redis-default',
          status: 'active',
          expiresInSeconds: 119,
        },
      ],
    }));
    mockedGetBackendClient.mockReturnValue(backendSdk as never);

    await expect(AdminCacheService.listKeys('auth.qr.challenge', 50)).resolves.toMatchObject({
      scannedItems: 1,
      returnedItems: 1,
      scanComplete: true,
      pageInfo: {
        mode: 'cursor',
        pageSize: 50,
        hasMore: false,
        nextCursor: null,
      },
    });

    expect(backendSdk.system.cache.namespaces.keys.list).toHaveBeenCalledWith('auth.qr.challenge', { pageSize: 50 });
  });

  it('passes an opaque cursor when loading the next namespace cache key page', async () => {
    const backendSdk = createBackendSdkMock();
    backendSdk.system.cache.namespaces.keys.list.mockResolvedValue(createKeyListPayload({
      scannedItems: 1,
      returnedItems: 1,
      pageInfo: createPageInfo({ pageSize: 50 }),
      items: [
        {
          key: 'login-qr-3',
          namespace: 'auth.qr.challenge',
          instanceName: 'redis-default',
          status: 'active',
          expiresInSeconds: 90,
        },
      ],
    }));
    mockedGetBackendClient.mockReturnValue(backendSdk as never);

    await expect(AdminCacheService.listKeys('auth.qr.challenge', 50, 'cursor-page-2')).resolves.toMatchObject({
      returnedItems: 1,
      pageInfo: {
        pageSize: 50,
        hasMore: false,
        nextCursor: null,
      },
      items: [{ key: 'login-qr-3' }],
    });

    expect(backendSdk.system.cache.namespaces.keys.list).toHaveBeenCalledWith('auth.qr.challenge', {
      pageSize: 50,
      cursor: 'cursor-page-2',
    });
  });

  it('rejects namespace key list payloads with inconsistent or malformed item metadata', async () => {
    const backendSdk = createBackendSdkMock();
    mockedGetBackendClient.mockReturnValue(backendSdk as never);

    backendSdk.system.cache.namespaces.keys.list.mockResolvedValueOnce(createKeyListPayload({
      scannedItems: 1,
      returnedItems: 1,
      items: [
        {
          key: 'login-qr-1',
          namespace: 'runtime.invocation',
          instanceName: 'redis-default',
          status: 'active',
          expiresInSeconds: 119,
        },
      ],
    }));
    await expect(AdminCacheService.listKeys('auth.qr.challenge')).rejects.toThrow('Cache key item namespace does not match list namespace');

    backendSdk.system.cache.namespaces.keys.list.mockResolvedValueOnce(createKeyListPayload({
      scannedItems: 1,
      returnedItems: 1,
      items: [
        {
          key: 'login-qr-1',
          namespace: 'auth.qr.challenge',
          instanceName: 'redis-default',
          status: 'active',
          expiresInSeconds: 'soon',
        },
      ],
    }));
    await expect(AdminCacheService.listKeys('auth.qr.challenge')).rejects.toThrow('Cache numeric field is invalid: expiresInSeconds');
  });

  it('rejects namespace key list payloads with inconsistent cursor state', async () => {
    const backendSdk = createBackendSdkMock();
    mockedGetBackendClient.mockReturnValue(backendSdk as never);

    backendSdk.system.cache.namespaces.keys.list.mockResolvedValueOnce(createKeyListPayload({
      scannedItems: 2,
      returnedItems: 1,
      scanComplete: false,
      pageInfo: createPageInfo({ pageSize: 1, hasMore: true, nextCursor: null }),
      items: [
        {
          key: 'login-qr-1',
          namespace: 'auth.qr.challenge',
          instanceName: 'redis-default',
          status: 'active',
          expiresInSeconds: 119,
        },
      ],
    }));
    await expect(AdminCacheService.listKeys('auth.qr.challenge')).rejects.toThrow('Cache next cursor is required when more keys are available');

    backendSdk.system.cache.namespaces.keys.list.mockResolvedValueOnce(createKeyListPayload({
      scannedItems: 1,
      returnedItems: 1,
      pageInfo: createPageInfo({ pageSize: 1, nextCursor: 'unexpected-cursor' }),
      items: [
        {
          key: 'login-qr-1',
          namespace: 'auth.qr.challenge',
          instanceName: 'redis-default',
          status: 'active',
          expiresInSeconds: 119,
        },
      ],
    }));
    await expect(AdminCacheService.listKeys('auth.qr.challenge')).rejects.toThrow('Cache next cursor must be empty after a complete scan');
  });
});
