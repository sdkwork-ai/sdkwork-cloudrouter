import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getClawRouterBackendSdkClient } from '@sdkwork/clawrouter-pc-admin-core/sdk';
import { SiteService } from './siteService';

vi.mock('@sdkwork/clawroutes-pc-commons/runtime', async () => ({
  ...await vi.importActual('@sdkwork/clawroutes-pc-commons/api-result'),
  ...await vi.importActual('@sdkwork/clawroutes-pc-commons/sdk-request-boundary'),
}));

vi.mock('@sdkwork/clawrouter-pc-admin-core/sdk', () => ({
  getClawRouterBackendSdkClient: vi.fn(),
}));

const mockedGetBackendClient = vi.mocked(getClawRouterBackendSdkClient);

describe('SiteService.deleteSite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('treats a resolved SDK void response as success', async () => {
    const deleteSite = vi.fn().mockResolvedValue(undefined);
    mockedGetBackendClient.mockReturnValue({ sites: { delete: deleteSite } } as never);

    await expect(SiteService.deleteSite('site-1')).resolves.toBe(true);
    expect(deleteSite).toHaveBeenCalledWith('site-1');
  });

  it('rejects unsafe site ids before calling the SDK', async () => {
    const deleteSite = vi.fn();
    mockedGetBackendClient.mockReturnValue({ sites: { delete: deleteSite } } as never);

    await expect(SiteService.deleteSite('site/1')).rejects.toThrow('siteId must be a safe path segment');
    expect(deleteSite).not.toHaveBeenCalled();
  });
});
