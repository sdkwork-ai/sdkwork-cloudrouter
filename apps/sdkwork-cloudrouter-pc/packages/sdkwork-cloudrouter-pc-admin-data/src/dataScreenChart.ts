/**
 * Pure rendering helpers for the operator data screen.
 *
 * The wall is drawn with hand-built SVG so it can follow the screen frame
 * exactly (baseline glow, soft area fill, mirrored label axes) without pulling a
 * chart library's theme into the full-bleed surface. Everything here is a pure
 * function of its inputs, which keeps the geometry unit-testable: scales,
 * smooth paths, arc geometry, compact number text, and locale-aware
 * time/money formatting.
 */

export interface LinearScale {
  (value: number): number;
  domainMax: number;
}

/** Maps `[0, max]` onto `[0, length]`, extending the domain to a readable tick. */
export function createLinearScale(domainMax: number, length: number): LinearScale {
  const max = niceCeiling(domainMax);
  const safeLength = Number.isFinite(length) && length > 0 ? length : 0;
  const scale = ((value: number): number => {
    if (max <= 0 || !Number.isFinite(value)) {
      return 0;
    }
    return Math.min(Math.max(value, 0) / max, 1) * safeLength;
  }) as LinearScale;
  scale.domainMax = max;
  return scale;
}

/**
 * Rounds a raw maximum up to a 1/2/2.5/5 × 10ⁿ step so axis labels read like
 * `1.2M` instead of `1,148,322`, and guarantees a non-zero domain for empty data.
 */
export function niceCeiling(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 1;
  }
  const exponent = Math.floor(Math.log10(value));
  const magnitude = 10 ** exponent;
  const normalized = value / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

/** Evenly spaced tick values from `0` to the scale's domain maximum. */
export function buildTicks(domainMax: number, count = 4): number[] {
  const safeCount = Math.max(1, Math.trunc(count));
  const top = niceCeiling(domainMax);
  return Array.from({ length: safeCount + 1 }, (_, index) => (top / safeCount) * index);
}

export interface PointGeometry {
  x: number;
  y: number;
}

/** Converts a numeric series into SVG points for a fixed-size plot box. */
export function toPlotPoints(
  values: readonly number[],
  width: number,
  height: number,
): PointGeometry[] {
  if (values.length === 0 || width <= 0 || height <= 0) {
    return [];
  }
  const scale = createLinearScale(Math.max(...values), height);
  const step = values.length > 1 ? width / (values.length - 1) : 0;
  return values.map((value, index) => ({
    x: values.length > 1 ? index * step : width / 2,
    y: height - scale(value),
  }));
}

/**
 * Smooth cubic path through the points, clamped so the curve never overshoots
 * below the baseline or above the plot box — an overshooting spline on a wall
 * display reads as negative traffic.
 */
export function buildSmoothPath(points: readonly PointGeometry[], height = Number.POSITIVE_INFINITY): string {
  if (points.length === 0) {
    return '';
  }
  const [first] = points;
  if (!first) {
    return '';
  }
  if (points.length === 1) {
    return `M ${round(first.x)} ${round(first.y)}`;
  }
  const clamp = (value: number): number => Math.min(Math.max(value, 0), height);
  const segments = [`M ${round(first.x)} ${round(first.y)}`];
  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    if (!current || !next) {
      continue;
    }
    const previous = points[index - 1] ?? current;
    const afterNext = points[index + 2] ?? next;
    const controlOneX = current.x + (next.x - previous.x) / 6;
    const controlOneY = clamp(current.y + (next.y - previous.y) / 6);
    const controlTwoX = next.x - (afterNext.x - current.x) / 6;
    const controlTwoY = clamp(next.y - (afterNext.y - current.y) / 6);
    segments.push(
      `C ${round(controlOneX)} ${round(controlOneY)} ${round(controlTwoX)} ${round(controlTwoY)} ${round(next.x)} ${round(next.y)}`,
    );
  }
  return segments.join(' ');
}

/** Closes a line path down to the baseline so it can be filled as an area. */
export function buildAreaPath(points: readonly PointGeometry[], height: number): string {
  if (points.length === 0) {
    return '';
  }
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) {
    return '';
  }
  return `${buildSmoothPath(points, height)} L ${round(last.x)} ${round(height)} L ${round(first.x)} ${round(height)} Z`;
}

/** X position of a series index inside the plot box. */
export function plotX(index: number, count: number, width: number): number {
  if (count <= 1) {
    return width / 2;
  }
  return (width / (count - 1)) * index;
}

/**
 * Perspective helpers for the 3D trend stage.
 *
 * The wall draws the series twice: a lit face plate on the back plane and a
 * floor footprint receding toward the viewer. Projecting the floor layer with a
 * genuine perspective divide (rather than a fake skew) keeps the two planes
 * consistent at every size, so the chart reads as a solid volume instead of two
 * unrelated pictures.
 */
export interface PerspectiveOptions {
  /** Horizontal distance from the projection centre, in plot units. */
  centerX: number;
  /** Viewer distance in plot units; smaller values deepen the projection. */
  distance: number;
  /** Vertical offset applied after projection. */
  offsetY: number;
  /** Scale applied to the receding (floor) layer, 0–1. */
  squeeze: number;
}

/**
 * Projects a plot point onto the floor plane.
 *
 * `depthRatio` is 0 at the back edge of the floor and 1 at the front edge; the
 * perspective divide makes far rows narrower and nearer rows wider, mirroring how
 * a floor grid looks when the camera stands above it.
 */
export function projectToFloor(
  point: PointGeometry,
  height: number,
  options: PerspectiveOptions,
): PointGeometry {
  const depthRatio = height > 0 ? Math.min(Math.max(point.y / height, 0), 1) : 0;
  const perspective = 1 / (1 + depthRatio * options.squeeze);
  return {
    x: options.centerX + (point.x - options.centerX) * perspective * (1 + options.squeeze * 0.35),
    y: options.offsetY + depthRatio * height * perspective,
  };
}

/** Projected path for the floor ribbon: the curve plus its depth walls. */
export function buildFloorRibbon(
  points: readonly PointGeometry[],
  height: number,
  options: PerspectiveOptions,
): string {
  if (points.length === 0) {
    return '';
  }
  const projected = points.map((point) => projectToFloor(point, height, options));
  const first = projected[0];
  const last = projected[projected.length - 1];
  if (!first || !last) {
    return '';
  }
  return `${buildSmoothPath(projected)} L ${round(last.x)} ${round(last.y + height * 0.16)} L ${round(first.x)} ${round(first.y + height * 0.16)} Z`;
}

/**
 * Draws the connector "curtain" between the back-plane curve and its floor
 * footprint. This band is what turns a flat line into a lifted 3D surface: the
 * lit top edge stays crisp while the band falls away into the floor shadow.
 *
 * Both edges are traced as plain polylines (no smoothing) so the two boundaries
 * always close cleanly at the first and last sample.
 */
export function buildCurtainPath(
  top: readonly PointGeometry[],
  bottom: readonly PointGeometry[],
): string {
  const count = Math.min(top.length, bottom.length);
  if (count < 2) {
    return '';
  }
  const topPoints = top.slice(0, count).map((point) => `${round(point.x)} ${round(point.y)}`);
  const bottomPoints = bottom.slice(0, count).reverse().map((point) => `${round(point.x)} ${round(point.y)}`);
  return `M ${topPoints.join(' L ')} L ${bottomPoints.join(' L ')} Z`;
}

/** Picks the indices whose labels fit under the axis without overlapping. */
export function pickLabelIndices(count: number, maxLabels: number): number[] {
  if (count <= 0) {
    return [];
  }
  if (maxLabels <= 1) {
    return [0];
  }
  const stride = Math.max(1, Math.ceil(count / maxLabels));
  const indices: number[] = [];
  for (let index = 0; index < count; index += stride) {
    indices.push(index);
  }
  const last = count - 1;
  if (indices[indices.length - 1] !== last) {
    if (indices.length > 1 && last - (indices[indices.length - 1] ?? 0) < stride / 2) {
      indices[indices.length - 1] = last;
    } else {
      indices.push(last);
    }
  }
  return indices;
}

export interface ArcSegment {
  path: string;
  color: string;
  percent: number;
  label: string;
}

/**
 * Donut segments on a 1×100 viewBox, starting at 12 o'clock and running
 * clockwise. Gaps are expressed in `gapDegrees` of arc between segments, so a
 * single 100% share still renders as a full ring.
 */
/**
 * Donut segments on a 1×100 viewBox, starting at 12 o'clock and running
 * clockwise. Gaps are expressed in `gapDegrees` of arc between segments, so a
 * single 100% share still renders a full ring.
 *
 * `innerRatio` is the hole radius as a fraction of the outer radius. It must be
 * forwarded to the arc builder: with the pie form (`innerRatio = 0`) a 100% share
 * paints a solid disc and the centre readout is lost, which is exactly the bug a
 * single-category panel hits first.
 */
export function buildDonutSegments(
  items: readonly { name: string; value: number; color: string }[],
  gapDegrees = 2,
  innerRatio = 0.62,
): ArcSegment[] {
  const total = items.reduce((sum, item) => sum + (Number.isFinite(item.value) ? Math.max(item.value, 0) : 0), 0);
  if (total <= 0) {
    return [];
  }
  const outerRadius = 50;
  const innerRadius = outerRadius * Math.min(Math.max(innerRatio, 0), 0.95);
  const gap = items.length > 1 ? Math.max(gapDegrees, 0) : 0;
  const usable = 360 - gap * items.length;
  let cursor = -90;
  return items.map((item) => {
    const share = Math.max(item.value, 0) / total;
    const sweep = usable * share;
    const start = cursor;
    const end = cursor + sweep;
    cursor = end + gap;
    return {
      path: arcPath(50, 50, outerRadius, start, end, innerRadius),
      color: item.color,
      percent: share * 100,
      label: item.name,
    };
  });
}

/** Partial-ring arc path for a gauge, drawn on a 1×100 viewBox. */
export function buildGaugeArc(
  ratio: number,
  radius = 44,
  thickness = 8,
  startDegrees = 0,
  sweepDegrees = 360,
): { track: string; value: string } {
  const start = startDegrees;
  const clamped = Math.min(Math.max(Number.isFinite(ratio) ? ratio : 0, 0), 1);
  const end = start + sweepDegrees * clamped;
  return {
    track: ringPath(radius, thickness, start, start + sweepDegrees),
    value: clamped > 0 ? ringPath(radius, thickness, start, end) : '',
  };
}

function ringPath(radius: number, thickness: number, startDegrees: number, endDegrees: number): string {
  const inner = Math.max(radius - thickness, 0);
  return arcPath(50, 50, radius, startDegrees, endDegrees, inner);
}

function arcPath(
  centerX: number,
  centerY: number,
  radius: number,
  startDegrees: number,
  endDegrees: number,
  innerRadius = 0,
): string {
  const sweep = Math.min(Math.max(endDegrees - startDegrees, 0), 359.999);
  const startRadians = (startDegrees * Math.PI) / 180;
  const endRadians = ((startDegrees + sweep) * Math.PI) / 180;
  const startX = centerX + radius * Math.cos(startRadians);
  const startY = centerY + radius * Math.sin(startRadians);
  const endX = centerX + radius * Math.cos(endRadians);
  const endY = centerY + radius * Math.sin(endRadians);
  const largeArc = sweep > 180 ? 1 : 0;
  if (innerRadius <= 0) {
    return `M ${round(centerX)} ${round(centerY)} L ${round(startX)} ${round(startY)} A ${round(radius)} ${round(radius)} 0 ${largeArc} 1 ${round(endX)} ${round(endY)} Z`;
  }
  const innerStartX = centerX + innerRadius * Math.cos(endRadians);
  const innerStartY = centerY + innerRadius * Math.sin(endRadians);
  const innerEndX = centerX + innerRadius * Math.cos(startRadians);
  const innerEndY = centerY + innerRadius * Math.sin(startRadians);
  return [
    `M ${round(startX)} ${round(startY)}`,
    `A ${round(radius)} ${round(radius)} 0 ${largeArc} 1 ${round(endX)} ${round(endY)}`,
    `L ${round(innerStartX)} ${round(innerStartY)}`,
    `A ${round(innerRadius)} ${round(innerRadius)} 0 ${largeArc} 0 ${round(innerEndX)} ${round(innerEndY)}`,
    'Z',
  ].join(' ');
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/* ---------------------------- number text ---------------------------- */

const COMPACT_UNITS = [
  { threshold: 1e12, divisor: 1e12, suffix: 'T' },
  { threshold: 1e9, divisor: 1e9, suffix: 'B' },
  { threshold: 1e6, divisor: 1e6, suffix: 'M' },
  { threshold: 1e3, divisor: 1e3, suffix: 'K' },
] as const;

/** `8_235` → `8,235`, `2_487_000_000` → `2.48B`, `0.6` → `0.60`. */
export function formatCompactNumber(value: number, fractionDigits = 2): string {
  if (!Number.isFinite(value)) {
    return '0';
  }
  const absolute = Math.abs(value);
  for (const unit of COMPACT_UNITS) {
    if (absolute >= unit.threshold) {
      const scaled = value / unit.divisor;
      const digits = Math.abs(scaled) >= 100 ? Math.max(fractionDigits - 2, 0) : Math.abs(scaled) >= 10 ? Math.max(fractionDigits - 1, 0) : fractionDigits;
      return `${trimZeros(scaled.toFixed(digits))}${unit.suffix}`;
    }
  }
  if (Math.abs(value) >= 1 || value === 0) {
    return integerLike(value);
  }
  return trimZeros(value.toFixed(Math.max(fractionDigits, 2)));
}

function integerLike(value: number): string {
  return Number.isInteger(value)
    ? value.toLocaleString('en-US')
    : trimZeros(value.toFixed(2));
}

function trimZeros(text: string): string {
  return text.includes('.') ? text.replace(/0+$/u, '').replace(/\.$/u, '') : text;
}

/** Integer text with thousands separators; accepts int64 decimal strings. */
export function formatIntegerText(value: string): string {
  if (!/^[0-9]+$/u.test(value)) {
    return value;
  }
  return BigInt(value).toLocaleString('en-US');
}

/** Decimal text keeping at most `maxFractionDigits`, without trailing zeros. */
export function formatDecimalText(value: string, maxFractionDigits = 2): string {
  if (!/^[0-9]+(?:\.[0-9]+)?$/u.test(value)) {
    return value;
  }
  const [whole = '0', fraction = ''] = value.split('.');
  const trimmed = fraction.slice(0, maxFractionDigits).replace(/0+$/u, '');
  const grouped = BigInt(whole).toLocaleString('en-US');
  return trimmed ? `${grouped}.${trimmed}` : grouped;
}

/** ISO instant to a short wall-clock label in the operator's locale. */
export function formatClock(iso: string, locale: string): string {
  const parsed = Date.parse(iso);
  if (!Number.isFinite(parsed)) {
    return '';
  }
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date(parsed));
}

/** ISO instant to a `YYYY-MM-DD` label, used by the window caption. */
export function formatDateLabel(iso: string, locale: string): string {
  const parsed = Date.parse(iso);
  if (!Number.isFinite(parsed)) {
    return '';
  }
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(parsed));
}

const CURRENCY_SYMBOLS: Readonly<Record<string, string>> = {
  USD: '$',
  CNY: '¥',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  HKD: 'HK$',
  TWD: 'NT$',
  AUD: 'A$',
  CAD: 'C$',
  SGD: 'S$',
  KRW: '₩',
  INR: '₹',
};

/** Symbol-or-code prefix for a currency, falling back to the ISO code. */
export function currencySymbol(currencyCode: string): string {
  const code = currencyCode.trim().toUpperCase();
  return CURRENCY_SYMBOLS[code] ?? (code ? `${code} ` : '');
}
