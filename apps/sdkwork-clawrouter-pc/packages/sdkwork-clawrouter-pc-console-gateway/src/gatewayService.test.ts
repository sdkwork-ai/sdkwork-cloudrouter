import { beforeEach, describe, expect, it, vi } from 'vitest';

const sdkMocks = vi.hoisted(() => ({
  list: vi.fn(),
}));

vi.mock('@sdkwork/clawrouter-pc-console-core/sdk', () => ({
  getClawRouterAppSdkClient: () => ({
    ai: {
      gateway: {
        traces: {
          list: sdkMocks.list,
        },
      },
    },
  }),
}));

import { GatewayService } from './gatewayService';

function trace(id: string) {
  return {
    id,
    time: '2026-05-05T08:00:00Z',
    ip: '10.***.***.11',
    endpoint: '/v1/chat/completions',
    method: 'POST' as const,
    status: 200,
    duration: '128ms',
    channel: 'openai-main',
  };
}

beforeEach(() => {
  sdkMocks.list.mockReset();
});

describe('GatewayService', () => {
  it('passes cursor options to the composed app SDK and preserves repeated display identifiers', async () => {
    sdkMocks.list.mockResolvedValue({
      items: [trace('trace-shared'), trace('trace-shared')],
      pageInfo: {
        mode: 'cursor',
        pageSize: 20,
        hasMore: false,
        nextCursor: null,
      },
    });

    const page = await GatewayService.fetchTraces({
      cursor: 'opaque-cursor',
      pageSize: 20,
      q: 'trace-shared',
    });

    expect(sdkMocks.list).toHaveBeenCalledWith({
      cursor: 'opaque-cursor',
      pageSize: 20,
      q: 'trace-shared',
    });
    expect(page.items).toHaveLength(2);
    expect(page.items.map((item) => item.id)).toEqual(['trace-shared', 'trace-shared']);
  });

  it('rejects a continuation response that does not provide an advancing cursor', async () => {
    sdkMocks.list.mockResolvedValue({
      items: [trace('trace-1')],
      pageInfo: {
        mode: 'cursor',
        pageSize: 20,
        hasMore: true,
        nextCursor: 'same-cursor',
      },
    });

    await expect(GatewayService.fetchTraces({ cursor: 'same-cursor' })).rejects.toThrow(
      'Gateway traces next cursor must advance',
    );
  });
});
