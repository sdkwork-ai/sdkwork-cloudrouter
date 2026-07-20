import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getClawRouterBackendSdkClient } from '@sdkwork/clawrouter-pc-admin-core/sdk';
import { GroupService } from './groupService';

vi.mock('@sdkwork/clawroutes-pc-commons/runtime', async () => ({
  ...await vi.importActual('@sdkwork/clawroutes-pc-commons/api-result'),
  ...await vi.importActual('@sdkwork/clawroutes-pc-commons/sdk-request-boundary'),
}));

vi.mock('@sdkwork/clawrouter-pc-admin-core/sdk', () => ({
  getClawRouterBackendSdkClient: vi.fn(),
}));

const mockedGetBackendClient = vi.mocked(getClawRouterBackendSdkClient);

describe('GroupService.deleteGroup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('treats a resolved SDK void response as success', async () => {
    const deleteGroup = vi.fn().mockResolvedValue(undefined);
    mockedGetBackendClient.mockReturnValue({
      ai: { channelGroups: { delete: deleteGroup } },
    } as never);

    await expect(GroupService.deleteGroup('group-1')).resolves.toBe(true);
    expect(deleteGroup).toHaveBeenCalledWith('group-1');
  });

  it('rejects unsafe group ids before calling the SDK', async () => {
    const deleteGroup = vi.fn();
    mockedGetBackendClient.mockReturnValue({
      ai: { channelGroups: { delete: deleteGroup } },
    } as never);

    await expect(GroupService.deleteGroup('group/1')).rejects.toThrow('channelGroupId must be a safe path segment');
    expect(deleteGroup).not.toHaveBeenCalled();
  });
});
