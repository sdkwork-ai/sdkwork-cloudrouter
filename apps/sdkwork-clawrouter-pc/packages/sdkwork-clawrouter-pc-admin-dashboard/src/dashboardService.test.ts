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
  totalUsers: 56,
  activeUsers: 23,
  activeModels: 7,
  totalRequests: 1_234,
  successfulRequests: 1_204,
  failedRequests: 30,
  totalTokens: 1_500_000,
  totalPoints: 1_234.567,
  upstreamCost: 98.7,
  averageTokensPerRequest: 1_215.56,
  averagePointsPerRequest: 1.234,
  errorRate: 2.5,
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
      tokens: 1_500,
      requests: 12,
      points: 34.5,
    })).toEqual({
      time: '2026-07-20',
      tokens: 1_500,
      requests: 12,
      points: 34.5,
      chartTokens: 1_500,
      chartRequests: 12,
      chartPoints: 34.5,
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
