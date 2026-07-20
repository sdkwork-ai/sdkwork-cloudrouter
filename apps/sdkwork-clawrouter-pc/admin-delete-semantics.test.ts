import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getClawRouterBackendSdkClient } from '@sdkwork/clawrouter-pc-admin-core/sdk';
import { ChannelService } from './packages/sdkwork-clawrouter-pc-admin-channel/src/channelService';
import { GroupService } from './packages/sdkwork-clawrouter-pc-admin-group/src/groupService';
import { SiteService } from './packages/sdkwork-clawrouter-pc-admin-relay-site/src/siteService';
import { ServiceNodeService } from './packages/sdkwork-clawrouter-pc-admin-service-nodes/src/serviceNodeService';

vi.mock('@sdkwork/clawroutes-pc-commons/runtime', async () => ({
  ...await vi.importActual<typeof import('@sdkwork/clawroutes-pc-commons/api-result')>(
    '@sdkwork/clawroutes-pc-commons/api-result',
  ),
  ...await vi.importActual<typeof import('@sdkwork/clawroutes-pc-commons/sdk-request-boundary')>(
    '@sdkwork/clawroutes-pc-commons/sdk-request-boundary',
  ),
}));

vi.mock('@sdkwork/clawrouter-pc-admin-core/sdk', () => ({
  getClawRouterBackendSdkClient: vi.fn(),
}));

const mockedGetBackendClient = vi.mocked(getClawRouterBackendSdkClient);

function installBackendDeleteMocks() {
  const deleteChannel = vi.fn().mockResolvedValue(undefined);
  const deleteGroup = vi.fn().mockResolvedValue(undefined);
  const deleteNode = vi.fn().mockResolvedValue(undefined);
  const deleteSite = vi.fn().mockResolvedValue(undefined);
  mockedGetBackendClient.mockReturnValue({
    ai: { channelGroups: { delete: deleteGroup } },
    integration: { channels: { delete: deleteChannel } },
    sites: { delete: deleteSite },
    system: { serviceNodes: { delete: deleteNode } },
  } as never);
  return { deleteChannel, deleteGroup, deleteNode, deleteSite };
}

describe('admin generated SDK delete semantics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('treats resolved SDK void responses as successful deletes', async () => {
    const deleteMocks = installBackendDeleteMocks();

    await expect(GroupService.deleteGroup('group-1')).resolves.toBe(true);
    await expect(ChannelService.deleteChannel('channel-1')).resolves.toBe(true);
    await expect(SiteService.deleteSite('site-1')).resolves.toBe(true);
    await expect(ServiceNodeService.deleteNode('node-1')).resolves.toBeUndefined();

    expect(deleteMocks.deleteGroup).toHaveBeenCalledWith('group-1');
    expect(deleteMocks.deleteChannel).toHaveBeenCalledWith('channel-1');
    expect(deleteMocks.deleteSite).toHaveBeenCalledWith('site-1');
    expect(deleteMocks.deleteNode).toHaveBeenCalledWith('node-1');
  });

  it('retains path validation before any delete SDK call', async () => {
    const deleteMocks = installBackendDeleteMocks();

    await expect(GroupService.deleteGroup('group/1')).rejects.toThrow('channelGroupId must be a safe path segment');
    await expect(ChannelService.deleteChannel('../channel-1')).rejects.toThrow('channelId must be a safe path segment');
    await expect(SiteService.deleteSite('site/1')).rejects.toThrow('siteId must be a safe path segment');
    await expect(ServiceNodeService.deleteNode('../node-1')).rejects.toThrow('node id must be a safe path segment');

    expect(deleteMocks.deleteGroup).not.toHaveBeenCalled();
    expect(deleteMocks.deleteChannel).not.toHaveBeenCalled();
    expect(deleteMocks.deleteSite).not.toHaveBeenCalled();
    expect(deleteMocks.deleteNode).not.toHaveBeenCalled();
  });
});
