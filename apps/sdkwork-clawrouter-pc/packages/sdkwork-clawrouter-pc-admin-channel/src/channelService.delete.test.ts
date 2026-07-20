import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getClawRouterBackendSdkClient } from '@sdkwork/clawrouter-pc-admin-core/sdk';
import { ChannelService } from './channelService';

vi.mock('@sdkwork/clawroutes-pc-commons/runtime', async () => ({
  ...await vi.importActual('@sdkwork/clawroutes-pc-commons/api-result'),
  ...await vi.importActual('@sdkwork/clawroutes-pc-commons/sdk-request-boundary'),
}));

vi.mock('@sdkwork/clawrouter-pc-admin-core/sdk', () => ({
  getClawRouterBackendSdkClient: vi.fn(),
}));

const mockedGetBackendClient = vi.mocked(getClawRouterBackendSdkClient);

describe('ChannelService.deleteChannel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('treats a resolved SDK void response as success', async () => {
    const deleteChannel = vi.fn().mockResolvedValue(undefined);
    mockedGetBackendClient.mockReturnValue({
      integration: { channels: { delete: deleteChannel } },
    } as never);

    await expect(ChannelService.deleteChannel('channel-1')).resolves.toBe(true);
    expect(deleteChannel).toHaveBeenCalledWith('channel-1');
  });

  it('rejects unsafe channel ids before calling the SDK', async () => {
    const deleteChannel = vi.fn();
    mockedGetBackendClient.mockReturnValue({
      integration: { channels: { delete: deleteChannel } },
    } as never);

    await expect(ChannelService.deleteChannel('../channel-1')).rejects.toThrow('channelId must be a safe path segment');
    expect(deleteChannel).not.toHaveBeenCalled();
  });
});
