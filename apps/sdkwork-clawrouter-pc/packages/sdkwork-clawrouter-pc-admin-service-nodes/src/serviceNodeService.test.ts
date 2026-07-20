import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getClawRouterBackendSdkClient } from '@sdkwork/clawrouter-pc-admin-core/sdk';
import { ServiceNodeService } from './serviceNodeService';

vi.mock('@sdkwork/clawroutes-pc-commons/runtime', async () => ({
  ...await vi.importActual('@sdkwork/clawroutes-pc-commons/api-result'),
  ...await vi.importActual('@sdkwork/clawroutes-pc-commons/sdk-request-boundary'),
}));

vi.mock('@sdkwork/clawrouter-pc-admin-core/sdk', () => ({
  getClawRouterBackendSdkClient: vi.fn(),
}));

const mockedGetBackendClient = vi.mocked(getClawRouterBackendSdkClient);

describe('ServiceNodeService.deleteNode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('treats a resolved SDK void response as success', async () => {
    const deleteNode = vi.fn().mockResolvedValue(undefined);
    mockedGetBackendClient.mockReturnValue({
      system: { serviceNodes: { delete: deleteNode } },
    } as never);

    await expect(ServiceNodeService.deleteNode('node-1')).resolves.toBeUndefined();
    expect(deleteNode).toHaveBeenCalledWith('node-1');
  });

  it('rejects unsafe node ids before calling the SDK', async () => {
    const deleteNode = vi.fn();
    mockedGetBackendClient.mockReturnValue({
      system: { serviceNodes: { delete: deleteNode } },
    } as never);

    await expect(ServiceNodeService.deleteNode('../node-1')).rejects.toThrow('node id must be a safe path segment');
    expect(deleteNode).not.toHaveBeenCalled();
  });
});
