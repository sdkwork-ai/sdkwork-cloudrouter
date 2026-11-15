import { beforeEach, describe, expect, it, vi } from 'vitest';

const agentServiceCreate = vi.fn();
const agentSdkList = vi.fn();

vi.mock('@sdkwork/agents-pc-agents/services', () => ({
  DEFAULT_AGENT_CONFIG: {
    model: 'test-model',
    suggestedPrompts: ['hello'],
    temperature: 0.7,
  },
  createSdkworkAgentService: () => ({
    createAgent: agentServiceCreate,
  }),
}));

vi.mock('@sdkwork/cloudroutes-pc-commons/sdk-clients', () => ({
  getSdkworkAiotAppSdkClient: () => ({}),
  getSdkworkAgentAppSdkClient: () => ({
    ai: { agents: { list: agentSdkList } },
  }),
}));

import { createCloudRouterHardwareService } from '../src/cloudRouterHardwareService.ts';

describe('cloud router hardware service adapter', () => {
  beforeEach(() => {
    agentServiceCreate.mockReset();
    agentSdkList.mockReset();
  });

  it('binds existing agents from the session agent catalog', async () => {
    agentSdkList.mockResolvedValue({
      items: [{ agentId: 'agent-1', name: 'Concierge', description: 'Front desk' }],
      pageInfo: { page: 1, pageSize: 100, total: 1, hasMore: false },
    });
    const service = createCloudRouterHardwareService();
    const page = await service.listAgents({ page: 1, pageSize: 100 });
    expect(agentSdkList).toHaveBeenCalledWith({ page: 1, pageSize: 100 });
    expect(page.items).toEqual([{ agentId: 'agent-1', name: 'Concierge', description: 'Front desk' }]);
  });

  it('creates a device agent through the Agents console service defaults', async () => {
    agentServiceCreate.mockResolvedValue({
      id: 'agent-9',
      name: 'Hall assistant',
      description: 'Created for the hall sensor',
    });
    const service = createCloudRouterHardwareService();
    expect(service.createAgent).toBeDefined();

    const agent = await service.createAgent?.({ name: 'Hall assistant', description: 'Created for the hall sensor' });

    expect(agentServiceCreate).toHaveBeenCalledTimes(1);
    expect(agentServiceCreate).toHaveBeenCalledWith({
      model: 'test-model',
      suggestedPrompts: ['hello'],
      temperature: 0.7,
      name: 'Hall assistant',
      description: 'Created for the hall sensor',
      type: 'normal',
    });
    expect(agent).toEqual({
      agentId: 'agent-9',
      name: 'Hall assistant',
      description: 'Created for the hall sensor',
    });
  });
});
