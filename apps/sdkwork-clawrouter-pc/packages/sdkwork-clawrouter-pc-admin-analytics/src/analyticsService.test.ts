import { beforeEach, describe, expect, it, vi } from 'vitest';

const sdkMocks = vi.hoisted(() => ({
  retrieve: vi.fn(),
}));

vi.mock('@sdkwork/clawroutes-pc-commons/sdk-clients', () => ({
  getClawRouterBackendSdkClient: () => ({
    system: {
      analytics: {
        admin: {
          overview: {
            retrieve: sdkMocks.retrieve,
          },
        },
      },
    },
  }),
}));

import { AdminAnalyticsService } from './analyticsService';

const VALID_OVERVIEW = {
  timeRange: 'daily',
  startTime: '2026-07-01T00:00:00.000Z',
  endTime: '2026-07-30T00:00:00.000Z',
  rankingSize: 10,
  summary: {
    totalUsers: '9007199254740993',
    activeUsers: '2',
    activeModels: '1',
    totalRequests: '9007199254740994',
    successfulRequests: '9007199254740993',
    failedRequests: '1',
    totalTokens: '9007199254740992.000000000001',
    totalPoints: '0.000000000009',
    upstreamCost: '18.250000000000',
    averageTokensPerRequest: '1.000000000001',
    averagePointsPerRequest: '0.000000000001',
    errorRate: '0.000000000001',
  },
  trend: [{
    time: '2026-07-30',
    requests: '9007199254740994',
    tokens: '9007199254740992.000000000001',
    points: '0.000000000009',
    users: '9007199254740993',
  }],
  userRankings: { points: [], tokens: [], requests: [] },
  modelRankings: { points: [], tokens: [], requests: [] },
  modelDistribution: [],
  modalityDistribution: [],
  insights: [],
};

describe('AdminAnalyticsService', () => {
  beforeEach(() => {
    sdkMocks.retrieve.mockReset();
    sdkMocks.retrieve.mockResolvedValue(structuredClone(VALID_OVERVIEW));
  });

  it('uses the generated retrieve operation and preserves exact numeric strings', async () => {
    const overview = await AdminAnalyticsService.fetchOverview({
      timeRange: 'daily',
      rankingSize: 10,
    });

    expect(sdkMocks.retrieve).toHaveBeenCalledWith({
      timeRange: 'daily',
      rankingSize: 10,
    });
    expect(overview.summary.totalUsers).toBe('9007199254740993');
    expect(overview.summary.totalTokens).toBe('9007199254740992.000000000001');
    expect(overview.trend[0]?.points).toBe('0.000000000009');
  });

  it('rejects JSON numbers and decimals above the twelve-digit scale', async () => {
    sdkMocks.retrieve.mockResolvedValueOnce({
      ...structuredClone(VALID_OVERVIEW),
      summary: {
        ...VALID_OVERVIEW.summary,
        totalTokens: 42,
      },
    });
    await expect(AdminAnalyticsService.fetchOverview()).rejects.toThrow(
      'Analytics total tokens are required',
    );

    sdkMocks.retrieve.mockResolvedValueOnce({
      ...structuredClone(VALID_OVERVIEW),
      summary: {
        ...VALID_OVERVIEW.summary,
        totalTokens: '1.0000000000001',
      },
    });
    await expect(AdminAnalyticsService.fetchOverview()).rejects.toThrow(
      'Analytics total tokens are required',
    );
  });
});
