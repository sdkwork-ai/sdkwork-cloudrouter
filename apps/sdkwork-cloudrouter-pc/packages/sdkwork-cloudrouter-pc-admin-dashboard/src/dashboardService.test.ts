import { describe, expect, it } from 'vitest';
import {
  createDashboardSummaryCards,
  formatChargeAmount,
  formatCompactAxisValue,
  normalizeAnalyticsTrafficData,
  normalizeDashboardTrafficTimeRange,
  type AdminDashboardTranslator,
  type PieChartData,
} from './dashboardService';

const keyTranslator: AdminDashboardTranslator = (key) => key;

const ANALYTICS_SUMMARY = {
  totalUsers: '56',
  activeUsers: '23',
  activeModels: '7',
  totalRequests: '1234',
  successfulRequests: '1204',
  failedRequests: '30',
  totalTokens: '1500000.000000000000',
  totalPoints: '1234.567000000000',
  upstreamCost: '98.700000000000',
  averageTokensPerRequest: '1215.560000000000',
  averagePointsPerRequest: '1.234000000000',
  errorRate: '2.500000000000',
} satisfies Parameters<typeof createDashboardSummaryCards>[0]['summary'];

const MULTIMODAL: PieChartData[] = [
  { name: 'Text', value: 11, chartValue: 11, color: '#2563eb' },
  { name: 'Vision', value: 4, chartValue: 4, color: '#7c3aed' },
];

describe('dashboard metric mapping', () => {
  it('maps the eight summary cards to their declared operational metrics', () => {
    const cards = createDashboardSummaryCards({
      activeUsers: 42,
      summary: ANALYTICS_SUMMARY,
      multimodal: MULTIMODAL,
    }, keyTranslator);

    expect(cards.map((card) => card.label)).toEqual([
      'admin.dashboard.summary.activeUsers.label',
      'admin.dashboard.summary.activeModels.label',
      'admin.dashboard.summary.totalRequests.label',
      'admin.dashboard.summary.totalTokens.label',
      'admin.dashboard.summary.modalityCalls.label',
      'admin.dashboard.summary.errorRate.label',
      'admin.dashboard.summary.pointsConsumed.label',
      'admin.dashboard.summary.upstreamCost.label',
    ]);
    expect(cards.map((card) => card.value)).toEqual([
      '42',
      '7',
      '1,234',
      '1.5M',
      '15',
      '2.5%',
      '1,234.57',
      '98.7',
    ]);
    expect(cards[6]?.value).not.toContain('$');
    expect(cards[7]?.value).not.toContain('$');
  });

  it('preserves analytics points as points in trend data', () => {
    expect(normalizeAnalyticsTrafficData({
      time: '2026-07-20',
      tokens: '1500.000000000000',
      requests: '12.000000000000',
      points: '34.500000000000',
    })).toEqual({
      time: '2026-07-20',
      tokens: '1500.000000000000',
      requests: '12.000000000000',
      points: '34.500000000000',
      chartTokens: 1_500,
      chartRequests: 12,
      chartPoints: 34.5,
    });
  });

  it('preserves analytics values beyond JavaScript safe integer precision', () => {
    expect(normalizeAnalyticsTrafficData({
      time: '2026-07-20',
      tokens: '9007199254740992.000000000001',
      requests: '9007199254740993',
      points: '0.000000000009',
    })).toMatchObject({
      tokens: '9007199254740992.000000000001',
      requests: '9007199254740993',
      points: '0.000000000009',
    });
  });

  it('accepts only the daily range supported by the current generated SDK', () => {
    expect(normalizeDashboardTrafficTimeRange(undefined)).toBe('daily');
    expect(normalizeDashboardTrafficTimeRange(' DAILY ')).toBe('daily');
    expect(() => normalizeDashboardTrafficTimeRange('monthly')).toThrow(
      'Dashboard analytics SDK does not support the requested monthly time range',
    );
  });

  it('formats customer charge decimals without inventing currency or losing micro amounts', () => {
    expect(formatChargeAmount('2.430000')).toBe('2.43');
    expect(formatChargeAmount('0.004900')).toBe('0.0049');
    expect(formatChargeAmount('0.000001')).toBe('0.000001');
    expect(formatChargeAmount('12.000000')).toBe('12');
  });

  it('promotes compact axis values across unit rounding boundaries', () => {
    expect(formatCompactAxisValue(250_000)).toBe('250k');
    expect(formatCompactAxisValue(999_999)).toBe('1M');
    expect(formatCompactAxisValue(999_999_999)).toBe('1B');
  });
});
