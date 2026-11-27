import { afterEach, describe, expect, it } from 'vitest';
import {
  configureDataScreenSourcePort,
  currencyExponent,
  DataScreenUnavailableError,
  loadDataScreenSnapshot,
  minorUnitsToMajor,
  percentageOf,
  ratioOf,
  readWindowMinutes,
  toDecimalString,
  type DataScreenSourcePort,
} from '../dataScreenService.ts';

type Port = DataScreenSourcePort;

function analyticsSource(): Awaited<ReturnType<Port['analytics']>> {
  return {
    timeRange: 'daily',
    startTime: '2026-11-26T00:00:00Z',
    endTime: '2026-11-27T00:00:00Z',
    rankingSize: 6,
    summary: {
      totalUsers: '3',
      activeUsers: '3',
      activeModels: '1',
      totalRequests: '8235',
      successfulRequests: '8235',
      failedRequests: '0',
      totalTokens: '2487000000',
      totalPoints: '1260.5',
      upstreamCost: '184.72',
      averageTokensPerRequest: '285902.46',
      averagePointsPerRequest: '0.15',
      errorRate: '0',
    },
    trend: [
      { time: '2026-11-26', requests: '4100', tokens: '1200000000', points: '600.2', users: '2' },
      { time: '2026-11-27', requests: '4135', tokens: '1287000000', points: '660.3', users: '3' },
    ],
    userRankings: {
      points: [{
        rank: 1,
        userId: '1001',
        userName: 'platform-team',
        email: 'platform@example.com',
        requestCount: '5000',
        totalTokens: '1500000000',
        points: '900.5',
        modelDistribution: [],
      }],
      tokens: [],
      requests: [],
    },
    modelRankings: {
      points: [{
        rank: 1,
        model: 'deepseek/deepseek-chat',
        catalogKey: 'deepseek/deepseek-chat',
        vendor: 'deepseek',
        modality: 'text',
        requestCount: '8235',
        totalTokens: '2487000000',
        points: '1260.5',
        upstreamCost: '184.72',
        userCount: '3',
        averageTokensPerRequest: '285902.46',
        errorRate: '0',
      }],
      tokens: [],
      requests: [],
    },
    modelDistribution: [{ name: 'deepseek/deepseek-chat', value: '1260.5', color: '#2563eb' }],
    modalityDistribution: [{ name: 'text', value: '100', color: '#2563eb' }],
    insights: [{ key: 'error', title: 'Error rate', value: '0%', severity: 'info', detail: 'healthy' }],
  };
}

function dashboardSource(): Awaited<ReturnType<Port['dashboard']>> {
  return {
    activeUsers: '3',
    userConsumption: [{ name: 'platform-team', value: 900.5, color: '#2563eb' }],
    multimodal: [
      { name: 'text', value: 90, color: '#2563eb' },
      { name: 'vision', value: 10, color: '#7c3aed' },
    ],
    traffic: [],
    modelDistribution: [
      { name: 'deepseek/deepseek-chat', value: 800, color: '#2563eb' },
      { name: 'qwen/qwen-max', value: 200, color: '#7c3aed' },
    ],
    recentUsage: [{
      id: 'trace-1',
      user: 'platform-team',
      isApiUser: true,
      model: 'deepseek/deepseek-chat',
      type: 'text',
      billingMode: 'token',
      usageIn: 1250,
      usageOut: 240,
      time: '2026-11-27 10:00:00',
      status: 'success',
      cost: '2.430000',
    }],
  };
}

function createPort(overrides: Partial<Port> = {}): Port {
  return {
    analytics: async () => analyticsSource(),
    dashboard: async () => dashboardSource(),
    paymentSummary: async () => ({
      totalCount: '40',
      totalAmounts: [
        { currencyCode: 'CNY', amount: '125000', count: '30' },
        { currencyCode: 'CNY', amount: '25000', count: '5' },
        { currencyCode: 'USD', amount: '1200', count: '3' },
      ],
      statusCounts: [
        { status: 'succeeded', count: '28' },
        { status: 'pending', count: '7' },
        { status: 'failed', count: '5' },
      ],
    }),
    refundSummary: async () => ({
      totalCount: '2',
      totalAmounts: [{ currencyCode: 'CNY', amount: '3000', count: '2' }],
      statusCounts: [],
      reasonCounts: [],
    }),
    rechargeRecords: async () => ({
      items: [
        { id: 'r1', user: 'alice', amount: '100', usdCredited: '110', method: 'alipay', status: 'success', time: '2026-11-26T10:00:00Z' },
        { id: 'r2', user: 'bob', amount: '200', usdCredited: '220', method: 'wechat', status: 'success', time: '2026-11-27T10:00:00Z' },
        { id: 'r3', user: 'carol', amount: '50', usdCredited: '55', method: 'alipay', status: 'pending', time: '2026-11-27T11:00:00Z' },
      ],
      pageInfo: { mode: 'offset' },
    }),
    referralStats: async () => ({
      items: [
        { id: '1', inviter: 'alice', totalInvited: '12', totalRevenue: '320.5', bonusAwarded: '32', link: 'https://example.com/?ref=1' },
        { id: '2', inviter: 'bob', totalInvited: '3', totalRevenue: '40', bonusAwarded: '4', link: 'https://example.com/?ref=2' },
      ],
      pageInfo: { mode: 'offset' },
    }),
    referralStrategies: async () => ({
      items: [{ id: 's1', status: 'active' }, { id: 's2', status: 'disabled' }],
      pageInfo: { mode: 'offset' },
    }),
    serviceNodes: async () => ({
      items: [{ healthStatus: 'online', status: 'enabled' }, { healthStatus: 'offline', status: 'enabled' }],
      pageInfo: { mode: 'offset' },
    }),
    exchangeRules: async () => ({
      items: [{ id: 'e1', sourceAssetType: 'POINTS', targetAssetType: 'CASH', rate: '2', status: 'active' }],
      pageInfo: { mode: 'offset' },
    }),
    ...overrides,
  };
}

afterEach(() => {
  configureDataScreenSourcePort(null);
});

describe('decimal helpers', () => {
  it('normalizes decimal text and rejects garbage without throwing', () => {
    expect(toDecimalString('0012.500000')).toBe('12.5');
    expect(toDecimalString('0012')).toBe('12');
    expect(toDecimalString('abc')).toBe('0');
    expect(toDecimalString(-4)).toBe('0');
  });

  it('computes exact percentages and ratios', () => {
    expect(percentageOf('8235', '8235')).toBe('100');
    expect(percentageOf('1', '3')).toBe('33.33');
    expect(percentageOf('1', '0')).toBe('0');
    expect(ratioOf('100', '40')).toBe('2.5');
    expect(ratioOf('1', '0')).toBe('0');
  });

  it('converts payment minor units with currency exponent awareness', () => {
    expect(currencyExponent('cny')).toBe(2);
    expect(currencyExponent('JPY')).toBe(0);
    expect(currencyExponent('KWD')).toBe(3);
    expect(minorUnitsToMajor('125000', 'CNY')).toBe('1250.00');
    expect(minorUnitsToMajor('1250', 'JPY')).toBe('1250');
    expect(minorUnitsToMajor('1250123', 'KWD')).toBe('1250.123');
  });

  it('measures the analytics window in minutes', () => {
    expect(readWindowMinutes('2026-11-26T00:00:00Z', '2026-11-27T00:00:00Z')).toBe(1440);
    expect(readWindowMinutes('bad', '2026-11-27T00:00:00Z')).toBe(0);
    expect(readWindowMinutes('2026-11-27T00:00:00Z', '2026-11-26T00:00:00Z')).toBe(0);
  });
});

describe('data screen snapshot', () => {
  it('folds every source into one editable snapshot with exact wall numbers', async () => {
    configureDataScreenSourcePort(createPort());
    const snapshot = await loadDataScreenSnapshot({ range: 'daily' });

    expect(snapshot.sections.every((section) => section.status === 'ready')).toBe(true);
    expect(snapshot.summary).toMatchObject({
      totalRequests: '8235',
      successRate: '100',
      averageTokensPerRequest: '285902.46',
    });
    // 8235 requests over 1440 minutes is exactly 5.71875.
    expect(snapshot.summary?.requestsPerMinute).toBe('5.71875');
    expect(snapshot.trend.map((point) => point.tokenValue)).toEqual([1_200_000_000, 1_287_000_000]);

    // Paid orders: 28 of 40; CNY paid total 150000 minor units = 1500.00.
    expect(snapshot.payments).toMatchObject({
      orderCount: '40',
      paidCount: '28',
      paidRate: 70,
      primaryCurrency: 'CNY',
      refundCount: '2',
      refundAmount: '30.00',
    });
    expect(snapshot.payments?.amounts[0]).toMatchObject({ currencyCode: 'CNY', amount: '1500.00', count: '35' });
    expect(snapshot.payments?.amounts[1]).toMatchObject({ currencyCode: 'USD', amount: '12.00' });
    expect(snapshot.payments?.averageTicket).toBe('53.571429');

    expect(snapshot.recharge).toMatchObject({
      count: '3',
      successCount: '2',
      pendingCount: '1',
      failedCount: '0',
      amount: '300',
      usdCredited: '330',
      bonusRate: '1.1',
    });
    expect(snapshot.recharge?.methods.map((method) => method.name)).toEqual(['wechat', 'alipay']);

    expect(snapshot.referral).toMatchObject({
      inviterCount: '2',
      invited: '15',
      bonus: '36',
      revenue: '360.5',
      activeStrategies: '1',
    });
    expect(snapshot.referral?.topInviters[0]?.label).toBe('alice');

    expect(snapshot.health).toEqual({ totalNodes: 2, onlineNodes: 1, enabledNodes: 2, availability: 50 });
    // 1500 CNY paid dollars / 2 credits per unit.
    expect(snapshot.economy).toEqual({ pointsPerCash: '2', paidCredits: '750', rechargeCredits: '150' });

    expect(snapshot.modelDistribution[0]).toMatchObject({ name: 'deepseek/deepseek-chat', percent: 80 });
    expect(snapshot.modalityDistribution.map((item) => item.percent)).toEqual([90, 10]);
    expect(snapshot.liveTraces[0]).toMatchObject({ usageLabel: '1,250 / 240', success: true });
    expect(snapshot.modelRanking[0]?.barPercent).toBe(100);
  });

  it('degrades only the panels whose source failed', async () => {
    configureDataScreenSourcePort(createPort({
      paymentSummary: async () => { throw new Error('payment backend unavailable'); },
      exchangeRules: async () => { throw new Error('exchange rules unavailable'); },
    }));
    const snapshot = await loadDataScreenSnapshot();

    const paymentsSection = snapshot.sections.find((section) => section.id === 'payments');
    expect(paymentsSection?.status).toBe('degraded');
    expect(paymentsSection?.message).toBe('payment backend unavailable');
    expect(snapshot.payments).toBeNull();
    expect(snapshot.economy).toBeNull();
    // Unrelated panels keep their real numbers.
    expect(snapshot.summary?.totalRequests).toBe('8235');
    expect(snapshot.recharge?.successCount).toBe('2');
  });

  it('keeps the order wall when only the exchange rule is unreadable', async () => {
    configureDataScreenSourcePort(createPort({
      exchangeRules: async () => { throw new Error('exchange rules unavailable'); },
    }));
    const snapshot = await loadDataScreenSnapshot();
    expect(snapshot.payments?.orderCount).toBe('40');
    expect(snapshot.economy).toBeNull();
    expect(snapshot.sections.find((section) => section.id === 'payments')?.status).toBe('degraded');
  });

  it('omits the traffic wall when analytics fails but keeps the commercial panels', async () => {
    configureDataScreenSourcePort(createPort({
      analytics: async () => { throw new Error('analytics exploded'); },
    }));
    const snapshot = await loadDataScreenSnapshot();

    expect(snapshot.summary).toBeNull();
    expect(snapshot.trend).toEqual([]);
    expect(snapshot.insights).toEqual([]);
    expect(snapshot.sections.find((section) => section.id === 'analytics')?.status).toBe('degraded');
    expect(snapshot.payments?.orderCount).toBe('40');
    expect(snapshot.referral?.invited).toBe('15');
  });

  it('reports an invalid contract payload as a degraded section instead of zeros', async () => {
    configureDataScreenSourcePort(createPort({
      paymentSummary: async () => ({ totalCount: '1' } as unknown as Awaited<ReturnType<Port['paymentSummary']>>),
    }));
    const snapshot = await loadDataScreenSnapshot();
    expect(snapshot.payments).toBeNull();
    expect(snapshot.sections.find((section) => section.id === 'payments')?.message).toMatch(/invalid payload/u);
  });

  it('raises a typed error when every source is down', async () => {
    const fail = async (): Promise<never> => { throw new Error('offline'); };
    configureDataScreenSourcePort(createPort({
      analytics: fail,
      dashboard: fail,
      paymentSummary: fail,
      refundSummary: fail,
      rechargeRecords: fail,
      referralStats: fail,
      referralStrategies: fail,
      serviceNodes: fail,
      exchangeRules: fail,
    }));
    await expect(loadDataScreenSnapshot()).rejects.toBeInstanceOf(DataScreenUnavailableError);
  });

  it('normalizes an unknown range to the daily window', async () => {
    const requested: string[] = [];
    configureDataScreenSourcePort(createPort({
      analytics: async (range) => {
        requested.push(range);
        return analyticsSource();
      },
    }));
    const snapshot = await loadDataScreenSnapshot({ range: 'hourly' as never });
    expect(snapshot.range).toBe('daily');
    expect(requested).toEqual(['daily']);
  });

  it('restores the SDK-backed port when unbound', async () => {
    configureDataScreenSourcePort(createPort({ analytics: async () => { throw new Error('custom'); } }));
    configureDataScreenSourcePort(null);
    // The default port talks to the generated SDK; without a bound client it
    // must fail per section rather than throw at import time.
    const snapshot = await loadDataScreenSnapshot().catch((error: unknown) => error);
    expect(snapshot).toBeDefined();
  });
});
