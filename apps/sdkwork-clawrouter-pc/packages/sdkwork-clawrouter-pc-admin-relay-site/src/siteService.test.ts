import { beforeEach, describe, expect, it, vi } from 'vitest';

const sdkMocks = vi.hoisted(() => ({
  listSites: vi.fn(),
  listChannels: vi.fn(),
}));

vi.mock('@sdkwork/clawrouter-pc-admin-core/sdk', () => ({
  getClawRouterBackendSdkClient: () => ({
    sites: {
      list: sdkMocks.listSites,
      channels: {
        list: sdkMocks.listChannels,
      },
    },
  }),
}));

import { SiteService } from './siteService';

function site(id = 'site-1') {
  return {
    id,
    siteCode: 'site-code',
    siteName: 'provider',
    displayName: 'Provider',
    description: null,
    baseUrl: 'https://provider.example.com',
    websiteUrl: null,
    docsUrl: null,
    logo: null,
    domains: [],
    vendorCodes: ['vendor-code'],
    siteType: 'relay',
    ownerKind: null,
    regionCode: null,
    environment: 'production',
    healthStatus: 'healthy',
    lastLatencyMs: 12,
    consecutiveErrorCount: 0,
    lastCheckedAt: null,
    lastSyncAt: null,
    sortOrder: 100,
    status: 'active',
  };
}

function pageInfo(overrides: Record<string, unknown> = {}) {
  return {
    mode: 'offset',
    page: 2,
    pageSize: 10,
    totalItems: '11',
    totalPages: 2,
    hasMore: false,
    ...overrides,
  };
}

beforeEach(() => {
  sdkMocks.listSites.mockReset();
  sdkMocks.listChannels.mockReset();
});

describe('SiteService list boundaries', () => {
  it('passes canonical site list filters to the generated backend SDK and normalizes pagination', async () => {
    sdkMocks.listSites.mockResolvedValue({ items: [site()], pageInfo: pageInfo() });

    const result = await SiteService.fetchSites({ q: ' provider ', page: 2, pageSize: 10 });

    expect(sdkMocks.listSites).toHaveBeenCalledWith({ q: 'provider', page: 2, pageSize: 10 });
    expect(result.sites).toHaveLength(1);
    expect(result.pageInfo).toEqual(pageInfo());
  });

  it.each([
    { page: 1, totalPages: 2, expectedHasMore: true },
    { page: 2, totalPages: 2, expectedHasMore: false },
    { page: 1, totalPages: 0, expectedHasMore: false },
  ])(
    'derives optional offset hasMore for page $page of $totalPages',
    async ({ page, totalPages, expectedHasMore }) => {
      const responsePageInfo: Partial<ReturnType<typeof pageInfo>> = pageInfo({ page, totalPages });
      delete responsePageInfo.hasMore;
      sdkMocks.listSites.mockResolvedValue({ items: [site()], pageInfo: responsePageInfo });

      const result = await SiteService.fetchSites({ page, pageSize: 10 });

      expect(result.pageInfo.hasMore).toBe(expectedHasMore);
    },
  );

  it('uses the nested channels list resource with the same bounded pagination contract', async () => {
    sdkMocks.listChannels.mockResolvedValue({
      items: [{
        id: 'channel-1',
        channelCode: 'channel-code',
        channelName: 'Provider channel',
        providerCode: 'provider',
        siteCode: 'site-code',
        siteServiceCode: null,
        siteChannelRole: null,
        healthStatus: 'healthy',
        status: 'active',
      }],
      pageInfo: pageInfo({ page: 1, pageSize: 20, totalItems: '1', totalPages: 1 }),
    });

    const result = await SiteService.fetchSiteChannels('site-1', { page: 1, pageSize: 20 });

    expect(sdkMocks.listChannels).toHaveBeenCalledWith('site-1', { page: 1, pageSize: 20 });
    expect(result.channels[0]?.channelCode).toBe('channel-code');
    expect(result.pageInfo.mode).toBe('offset');
  });

  it('rejects list responses without the required page info', async () => {
    sdkMocks.listSites.mockResolvedValue({ items: [site()] });

    await expect(SiteService.fetchSites()).rejects.toThrow('Site list page info is required');
  });

  it('requires complete offset metadata and rejects a contradictory optional hasMore mirror', async () => {
    sdkMocks.listSites.mockResolvedValue({
      items: [site()],
      pageInfo: pageInfo({ totalPages: undefined }),
    });
    await expect(SiteService.fetchSites()).rejects.toThrow('totalPages is required');

    sdkMocks.listSites.mockResolvedValue({
      items: [site()],
      pageInfo: pageInfo({ page: 1, totalPages: 2, hasMore: false }),
    });
    await expect(SiteService.fetchSites()).rejects.toThrow('hasMore must match page and totalPages');
  });

  it('rejects invalid pagination and query inputs before SDK dispatch', async () => {
    await expect(SiteService.fetchSites({ page: 0 })).rejects.toThrow('page must be a positive integer');
    await expect(SiteService.fetchSites({ pageSize: 201 })).rejects.toThrow('pageSize must be between 1 and 200');
    await expect(SiteService.fetchSites({ q: 42 })).rejects.toThrow('q must be a string');
    expect(sdkMocks.listSites).not.toHaveBeenCalled();
  });
});
