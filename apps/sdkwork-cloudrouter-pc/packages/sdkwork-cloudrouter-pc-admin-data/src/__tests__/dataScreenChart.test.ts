import { describe, expect, it } from 'vitest';
import {
  buildAreaPath,
  buildDonutSegments,
  buildGaugeArc,
  buildSmoothPath,
  buildTicks,
  createLinearScale,
  currencySymbol,
  formatClock,
  formatCompactNumber,
  formatDateLabel,
  formatDecimalText,
  formatIntegerText,
  niceCeiling,
  pickLabelIndices,
  plotX,
  toPlotPoints,
} from '../dataScreenChart.ts';

describe('linear scale', () => {
  it('extends the domain to a readable tick and maps proportionally', () => {
    const scale = createLinearScale(1_148_322, 100);
    expect(scale.domainMax).toBe(2_000_000);
    expect(scale(1_000_000)).toBeCloseTo(50, 6);
    expect(scale(4_000_000)).toBe(100);
  });

  it('clamps negative and non-finite input to the baseline', () => {
    const scale = createLinearScale(100, 50);
    expect(scale(-10)).toBe(0);
    expect(scale(Number.NaN)).toBe(0);
  });

  it('keeps a non-zero domain for an empty series', () => {
    expect(createLinearScale(0, 40)(0)).toBe(0);
    expect(createLinearScale(0, 40).domainMax).toBe(1);
  });
});

describe('nice ceiling and ticks', () => {
  it('snaps to 1/2/2.5/5 × 10ⁿ steps', () => {
    expect(niceCeiling(1_148_322)).toBe(2_000_000);
    expect(niceCeiling(8_235)).toBe(10_000);
    expect(niceCeiling(0.42)).toBe(0.5);
    expect(niceCeiling(2_400)).toBe(2_500);
  });

  it('returns evenly spaced ticks ending at the domain maximum', () => {
    expect(buildTicks(1_000, 4)).toEqual([0, 250, 500, 750, 1_000]);
  });
});

describe('plot geometry', () => {
  it('maps a series onto the plot box, last point on the right edge', () => {
    const points = toPlotPoints([0, 50, 100], 200, 100);
    expect(points.map((point) => point.x)).toEqual([0, 100, 200]);
    expect(points.map((point) => point.y)).toEqual([100, 50, 0]);
  });

  it('returns no geometry for an empty series', () => {
    expect(toPlotPoints([], 200, 100)).toEqual([]);
  });

  it('builds a cubic path without overshooting the plot box', () => {
    const points = toPlotPoints([0, 100, 20, 80], 300, 100);
    const path = buildSmoothPath(points, 100);
    expect(path.startsWith('M ')).toBe(true);
    expect(path.split('C')).toHaveLength(4);
    const ys = [...path.matchAll(/-?\d+(?:\.\d+)?/gu)].map(Number);
    expect(ys.every((value) => Number.isFinite(value))).toBe(true);
    expect(Math.min(...ys.filter((_, index) => index % 2 === 1))).toBeGreaterThanOrEqual(0);
    expect(Math.max(...ys.filter((_, index) => index % 2 === 1))).toBeLessThanOrEqual(100);
  });

  it('closes the area path on the baseline', () => {
    const points = toPlotPoints([10, 20], 100, 50);
    expect(buildAreaPath(points, 50).endsWith('Z')).toBe(true);
    expect(buildAreaPath([], 50)).toBe('');
  });

  it('positions a single point at the centre of the plot', () => {
    expect(plotX(0, 1, 100)).toBe(50);
    expect(plotX(1, 3, 100)).toBe(50);
  });

  it('thins labels without dropping the last bucket', () => {
    expect(pickLabelIndices(0, 6)).toEqual([]);
    expect(pickLabelIndices(3, 6)).toEqual([0, 1, 2]);
    const indices = pickLabelIndices(30, 6);
    expect(indices.length).toBeLessThanOrEqual(8);
    expect(indices[0]).toBe(0);
    expect(indices[indices.length - 1]).toBe(29);
  });
});

describe('polar geometry', () => {
  it('splits a donut into one path per share starting at 12 o\'clock', () => {
    const segments = buildDonutSegments([
      { name: 'a', value: 50, color: '#111111' },
      { name: 'b', value: 50, color: '#222222' },
    ], 0);
    expect(segments).toHaveLength(2);
    expect(segments[0]?.percent).toBeCloseTo(50, 6);
    // Ring form: the outer arc starts on the rim, never from the centre.
    expect(segments[0]?.path.startsWith('M 50 0')).toBe(true);
    expect(segments[1]?.path).toContain('A 50 50');
  });

  it('keeps the hole for a single 100% share instead of painting a disc', () => {
    const [segment] = buildDonutSegments([{ name: 'only', value: 10, color: '#111111' }]);
    expect(segment).toBeDefined();
    expect(segment?.percent).toBe(100);
    // A donut segment traces the outer rim and then an inner reverse arc; the
    // pie form would start at the centre (M 50 50) and never come back radially.
    expect(segment?.path.startsWith('M 50 0')).toBe(true);
    expect(segment?.path.match(/A 50 50/gu)).toHaveLength(1);
    expect(segment?.path).toMatch(/A 31 31/u);
    expect(segment?.path).not.toContain('M 50 50');
  });

  it('skips a donut with no positive value', () => {
    expect(buildDonutSegments([{ name: 'a', value: 0, color: '#111111' }])).toEqual([]);
  });

  it('renders a gauge track and value ring, clamping the ratio', () => {
    const gauge = buildGaugeArc(1.4, 42, 8, 145, 250);
    expect(gauge.track.startsWith('M ')).toBe(true);
    expect(gauge.value).not.toBe('');
    expect(buildGaugeArc(0).value).toBe('');
  });
});

describe('number text', () => {
  it('formats compact numbers with unit suffixes', () => {
    expect(formatCompactNumber(8_235)).toBe('8.23K');
    expect(formatCompactNumber(123)).toBe('123');
    expect(formatCompactNumber(2_487_000_000)).toBe('2.49B');
    expect(formatCompactNumber(1_160_000)).toBe('1.16M');
    expect(formatCompactNumber(0.62)).toBe('0.62');
    expect(formatCompactNumber(Number.NaN)).toBe('0');
  });

  it('groups int64 strings without losing precision', () => {
    expect(formatIntegerText('9007199254740993')).toBe('9,007,199,254,740,993');
    expect(formatIntegerText('not-a-number')).toBe('not-a-number');
  });

  it('trims decimal text to the requested precision', () => {
    expect(formatDecimalText('2.430000', 2)).toBe('2.43');
    expect(formatDecimalText('1234567.5', 2)).toBe('1,234,567.5');
    expect(formatDecimalText('0.000000', 2)).toBe('0');
  });
});

describe('time and currency text', () => {
  it('formats ISO instants with the requested locale', () => {
    expect(formatDateLabel('2026-11-27T10:00:00Z', 'en-US')).toMatch(/2026/);
    expect(formatDateLabel('not-a-date', 'en-US')).toBe('');
    expect(formatClock('not-a-date', 'en-US')).toBe('');
  });

  it('resolves currency symbols with an ISO code fallback', () => {
    expect(currencySymbol('usd')).toBe('$');
    expect(currencySymbol('CNY')).toBe('¥');
    expect(currencySymbol('XYZ')).toBe('XYZ ');
  });
});
