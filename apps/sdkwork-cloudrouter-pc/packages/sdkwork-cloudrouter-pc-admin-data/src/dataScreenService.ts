/**
 * Data screen aggregation service.
 *
 * The operator data screen is one full-viewport surface over data the platform
 * already owns. Every figure comes from an existing management API — the
 * traffic analytics overview, the admin dashboard overview, the payment intent
 * summary, the recharge ledger, and the referral programme — so the screen never
 * invents a metric and never disagrees with the page that owns the domain.
 *
 * Design consequences that keep the screen trustworthy:
 *
 * - each source is fetched independently and reported in
 *   {@link DataScreenSnapshot.sections}, so one unreachable module degrades only
 *   its own panels instead of blanking the wall;
 * - a panel whose source failed is omitted, never rendered with a fabricated
 *   `0`, and the header names the degraded modules;
 * - wire values stay `string` (int64 / decimal contract); derived series keep an
 *   exact decimal string for display plus a `number` projection for SVG scales;
 * - payment buckets are integer minor units, so they are converted to major
 *   units with currency-aware exponents before anything is shown.
 */

import {
  getCloudRouterBackendSdkClient,
  getSdkworkPaymentBackendSdkClient,
  type CloudRouterBackendSdkClient,
  type SdkworkPaymentBackendSdkClient,
} from '@sdkwork/cloudroutes-pc-commons/sdk-clients';

export type DataScreenSectionId =
  | 'analytics'
  | 'dashboard'
  | 'payments'
  | 'recharges'
  | 'referrals'
  | 'serviceNodes';

export type DataScreenSectionStatus = 'ready' | 'degraded';

export interface DataScreenSectionState {
  id: DataScreenSectionId;
  status: DataScreenSectionStatus;
  /** Operator-facing reason; empty while the section is healthy. */
  message: string;
}

export type DataScreenRange = 'daily' | 'weekly' | 'monthly' | 'yearly';

/** Ranking window offered separately, because leaders churn monthly. */
export type DataScreenRankWindow = 'weekly' | 'monthly';

export interface DataScreenQuery {
  range?: DataScreenRange;
  rankWindow?: DataScreenRankWindow;
}

export interface DataScreenSummary {
  /** Lifetime user count (int64 string). */
  totalUsers: string;
  /** Users that produced traffic inside the selected window (int64 string). */
  activeUsers: string;
  activeModels: string;
  totalRequests: string;
  successfulRequests: string;
  failedRequests: string;
  totalTokens: string;
  /** Compute Credits consumed in the window, exact decimal string. */
  totalPoints: string;
  upstreamCost: string;
  averageTokensPerRequest: string;
  averagePointsPerRequest: string;
  /** Percentage as an exact decimal string (`2.02` means 2.02%). */
  errorRate: string;
  /** Successful requests expressed as a percentage. */
  successRate: string;
  /** Requests per minute of the analytics window. */
  requestsPerMinute: string;
}

export interface DataScreenTrendPoint {
  label: string;
  tokens: string;
  requests: string;
  points: string;
  users: string;
  /** `number` projections for the chart scales. */
  tokenValue: number;
  requestValue: number;
  pointValue: number;
  userValue: number;
}

export interface DataScreenShareItem {
  name: string;
  /** Exact decimal string. */
  value: string;
  chartValue: number;
  color: string;
  /** Share of the whole, 0–100. */
  percent: number;
}

export interface DataScreenRankItem {
  label: string;
  secondary: string;
  /** Exact decimal string of the ranked metric. */
  metric: string;
  metricValue: number;
  /** 0–100 relative to the leader, for the bar width. */
  barPercent: number;
}

export interface DataScreenLiveTrace {
  id: string;
  user: string;
  isApiUser: boolean;
  model: string;
  modality: string;
  billingMode: string;
  usageLabel: string;
  cost: string;
  time: string;
  success: boolean;
}

export interface DataScreenOrderBucket {
  currencyCode: string;
  /** Major-unit amount, exact decimal string. */
  amount: string;
  count: string;
  amountValue: number;
}

export interface DataScreenPaymentStatus {
  status: string;
  count: string;
}

export interface DataScreenPayments {
  /** Payment intents created inside the window, int64 string. */
  orderCount: string;
  /** Intents the backend reports as paid. */
  paidCount: string;
  /** True when the backend exposed no paid status bucket, so `paidCount` is unknown. */
  paidUnknown: boolean;
  amounts: readonly DataScreenOrderBucket[];
  statuses: readonly DataScreenPaymentStatus[];
  /** Paid share of the window's intents, 0–100. */
  paidRate: number;
  /** Average paid ticket in major units of the primary currency. */
  averageTicket: string;
  primaryCurrency: string;
  refundCount: string;
  refundAmount: string;
  /** Refunded value as a percentage of the primary currency's paid value. */
  refundRate: number;
}

export interface DataScreenRechargeRecord {
  id: string;
  user: string;
  amount: string;
  /** Credited Compute Credits, exact decimal string. */
  credit: string;
  method: string;
  status: string;
  time: string;
}

export interface DataScreenRecharge {
  /** Records visible on the backend's newest page. */
  count: string;
  /** Settled cash amount, exact decimal string. */
  amount: string;
  /** Settled Compute Credits credited, exact decimal string. */
  usdCredited: string;
  /** Weighted credits-per-cash-unit multiplier; `1.05` means a 5% bonus. */
  bonusRate: string;
  successCount: string;
  pendingCount: string;
  failedCount: string;
  methods: readonly DataScreenShareItem[];
  recent: readonly DataScreenRechargeRecord[];
}

export interface DataScreenReferral {
  inviterCount: string;
  invited: string;
  bonus: string;
  revenue: string;
  activeStrategies: string;
  topInviters: readonly DataScreenRankItem[];
}

export interface DataScreenInsight {
  key: string;
  title: string;
  value: string;
  severity: 'info' | 'warning' | 'critical';
  detail: string;
}

export interface DataScreenHealth {
  totalNodes: number;
  onlineNodes: number;
  enabledNodes: number;
  /** Percentage of online nodes over all registered nodes. */
  availability: number;
}

/**
 * Computed cash-to-Credits conversion.
 *
 * `POINTS`/`CASH` is the only active exchange rule, so cash revenue can be
 * expressed in the platform's own unit of account next to the raw currency
 * totals. Absent when the deployment has no active rule.
 */
export interface DataScreenEconomy {
  /** Credits per one unit of cash, exact decimal string. */
  pointsPerCash: string;
  /** Paid value expressed in Credits (primary currency), exact decimal string. */
  paidCredits: string;
  /** Credited recharge value expressed in Credits, exact decimal string. */
  rechargeCredits: string;
}

export interface DataScreenSnapshot {
  range: DataScreenRange;
  rankWindow: DataScreenRankWindow;
  /** Start of the analytics window, ISO instant as sent by the backend. */
  windowStart: string;
  windowEnd: string;
  generatedAt: string;
  sections: readonly DataScreenSectionState[];
  summary: DataScreenSummary | null;
  trend: readonly DataScreenTrendPoint[];
  modelDistribution: readonly DataScreenShareItem[];
  modalityDistribution: readonly DataScreenShareItem[];
  modelRanking: readonly DataScreenRankItem[];
  userRanking: readonly DataScreenRankItem[];
  liveTraces: readonly DataScreenLiveTrace[];
  payments: DataScreenPayments | null;
  recharge: DataScreenRecharge | null;
  referral: DataScreenReferral | null;
  health: DataScreenHealth | null;
  economy: DataScreenEconomy | null;
  insights: readonly DataScreenInsight[];
}

/** Raised when every independent source failed, so the screen can offer a retry. */
export class DataScreenUnavailableError extends Error {
  readonly sections: readonly DataScreenSectionState[];

  constructor(sections: readonly DataScreenSectionState[]) {
    super('Data screen sources are unavailable.');
    this.name = 'DataScreenUnavailableError';
    this.sections = sections;
  }
}

/** Raised when a source violates its wire contract. */
export class DataScreenContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DataScreenContractError';
  }
}

/* ------------------------------------------------------------------ *
 * Decimal helpers: display stays exact, charts get a bounded `number`.
 * ------------------------------------------------------------------ */

const DECIMAL_DIGITS = 6;
const DECIMAL_SCALE = 10n ** BigInt(DECIMAL_DIGITS);

function isDecimalText(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9]+(?:\.[0-9]{1,18})?$/u.test(value.trim());
}

/** Exact decimal string; invalid input becomes `"0"` instead of `NaN` on the wall. */
export function toDecimalString(value: unknown): string {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0
      ? value.toFixed(DECIMAL_DIGITS).replace(/0+$/u, '').replace(/\.$/u, '')
      : '0';
  }
  if (!isDecimalText(value)) {
    return '0';
  }
  const trimmed = value.trim().replace(/^0+(?=\d)/u, '');
  if (!trimmed.includes('.')) {
    return trimmed;
  }
  return trimmed.replace(/0+$/u, '').replace(/\.$/u, '');
}

/** `number` projection of an exact decimal string, clamped to the chart-safe range. */
export function decimalToNumber(value: string): number {
  if (!isDecimalText(value)) {
    return 0;
  }
  const projected = Number(value);
  return Number.isFinite(projected) && projected >= 0 ? Math.min(projected, Number.MAX_SAFE_INTEGER) : 0;
}

function integerString(value: unknown): string {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) {
    return String(value);
  }
  if (typeof value === 'string' && /^[0-9]+$/u.test(value.trim())) {
    return value.trim().replace(/^0+(?=\d)/u, '');
  }
  return '0';
}

function toUnits(value: string): bigint {
  if (!isDecimalText(value)) {
    return 0n;
  }
  const [whole = '0', fraction = ''] = value.trim().split('.');
  return BigInt(whole) * DECIMAL_SCALE + BigInt(`${fraction}000000`.slice(0, DECIMAL_DIGITS));
}

function fromUnits(units: bigint): string {
  const whole = units / DECIMAL_SCALE;
  const fraction = units % DECIMAL_SCALE;
  if (fraction === 0n) {
    return `${whole}`;
  }
  return `${whole}.${String(fraction).padStart(DECIMAL_DIGITS, '0').replace(/0+$/u, '')}`;
}

/** Exact sum of decimal strings. */
export function addDecimalStrings(left: string, right: string): string {
  return fromUnits(toUnits(left) + toUnits(right));
}

/** `part / whole × 100` as an exact decimal string with two fraction digits. */
export function percentageOf(part: string, whole: string): string {
  const denominator = toUnits(whole);
  if (denominator === 0n) {
    return '0';
  }
  const numerator = toUnits(part) * 10_000n;
  const rounded = (numerator * 2n + denominator) / (denominator * 2n);
  return fromUnits(rounded * 10n ** BigInt(DECIMAL_DIGITS - 2));
}

/** Exact quotient `numerator / denominator` at the shared decimal scale. */
export function ratioOf(numerator: string, denominator: string): string {
  const divisor = toUnits(denominator);
  if (divisor === 0n) {
    return '0';
  }
  const numeratorUnits = toUnits(numerator) * DECIMAL_SCALE;
  return fromUnits((numeratorUnits * 2n + divisor) / (divisor * 2n));
}

/** Currencies whose minor unit equals the major unit. */
const ZERO_DECIMAL_CURRENCIES = new Set([
  'BIF', 'CLP', 'DJF', 'GNF', 'ISK', 'JPY', 'KMF', 'KRW', 'PYG', 'RWF', 'UGX', 'UYI', 'VND', 'VUV', 'XAF', 'XOF', 'XPF',
]);

/** Currencies subdivided into thousandths. */
const THREE_DECIMAL_CURRENCIES = new Set(['BHD', 'IQD', 'JOD', 'KWD', 'LYD', 'OMR', 'TND']);

/** ISO 4217 minor-unit exponent for a currency code (`2` for USD/CNY). */
export function currencyExponent(currencyCode: string): number {
  const code = currencyCode.trim().toUpperCase();
  if (ZERO_DECIMAL_CURRENCIES.has(code)) {
    return 0;
  }
  if (THREE_DECIMAL_CURRENCIES.has(code)) {
    return 3;
  }
  return 2;
}

/** Converts an integer minor-unit amount into its exact major-unit decimal string. */
export function minorUnitsToMajor(minorUnits: string, currencyCode: string): string {
  const digits = /^[0-9]+$/u.test(minorUnits.trim()) ? minorUnits.trim() : '0';
  const exponent = currencyExponent(currencyCode);
  if (exponent === 0) {
    return digits;
  }
  const padded = digits.padStart(exponent + 1, '0');
  return `${padded.slice(0, -exponent)}.${padded.slice(-exponent)}`;
}

/** Minutes spanned by an analytics window; derives the per-minute request rate. */
export function readWindowMinutes(startTime: string, endTime: string): number {
  const start = Date.parse(startTime);
  const end = Date.parse(endTime);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return 0;
  }
  return (end - start) / 60_000;
}

/* ------------------------------------------------------------------ *
 * Source port
 * ------------------------------------------------------------------ */

type AnalyticsSource = Awaited<ReturnType<
  CloudRouterBackendSdkClient['system']['analytics']['admin']['overview']['retrieve']
>>;
type DashboardSource = Awaited<ReturnType<
  CloudRouterBackendSdkClient['system']['dashboard']['admin']['overview']['retrieve']
>>;
type PaymentSummarySource = Awaited<ReturnType<
  SdkworkPaymentBackendSdkClient['payments']['intents']['summary']['retrieve']
>>;
type RefundSummarySource = Awaited<ReturnType<
  SdkworkPaymentBackendSdkClient['payments']['refunds']['summary']['retrieve']
>>;
/** Both referral results are paged list responses on the backend contract. */
interface PagedSource<T> {
  items?: T[];
  pageInfo?: unknown;
}
type ReferralStatsSource = PagedSource<{
  id?: string;
  inviter?: string;
  link?: string;
  totalInvited?: string;
  totalRevenue?: string;
  bonusAwarded?: string;
}>;
type ReferralStrategySource = PagedSource<{ id?: string; status?: string }>;
type RechargePageSource = {
  items?: Array<{
    id?: string;
    tradeNo?: string;
    userId?: string;
    user?: string;
    amount?: string;
    usdCredited?: string;
    method?: string;
    status?: string;
    time?: string;
  }>;
  pageInfo?: unknown;
};
type ServiceNodeSource = Awaited<ReturnType<CloudRouterBackendSdkClient['system']['serviceNodes']['list']>>;
type ExchangeRuleSource = Awaited<ReturnType<
  CloudRouterBackendSdkClient['billing']['exchangeRules']['list']
>>;

/** Every operation the screen reads. Replaced wholesale in tests and embedded hosts. */
export interface DataScreenSourcePort {
  analytics(range: DataScreenRange, rankWindow: DataScreenRankWindow): Promise<AnalyticsSource>;
  dashboard(): Promise<DashboardSource>;
  paymentSummary(range: DataScreenRange): Promise<PaymentSummarySource>;
  refundSummary(range: DataScreenRange): Promise<RefundSummarySource>;
  rechargeRecords(): Promise<RechargePageSource>;
  referralStats(): Promise<ReferralStatsSource>;
  referralStrategies(): Promise<ReferralStrategySource>;
  serviceNodes(): Promise<ServiceNodeSource>;
  exchangeRules(): Promise<ExchangeRuleSource>;
}

/**
 * Payment intents live in the payment backend, whose summary accepts the same
 * management `time_range` window as the analytics overview, so the order wall
 * follows the wall clock the operator selected. The generated SDK for this
 * deployment does not yet declare that filter, so the query is widened here
 * once instead of leaking a cast into every call site.
 */
type PaymentSummaryQuery = Parameters<SdkworkPaymentBackendSdkClient['payments']['intents']['summary']['retrieve']>[0]
  & { timeRange?: DataScreenRange };
type RefundSummaryQuery = Parameters<SdkworkPaymentBackendSdkClient['payments']['refunds']['summary']['retrieve']>[0]
  & { timeRange?: DataScreenRange };

function createSdkSourcePort(): DataScreenSourcePort {
  return {
    analytics: (range, rankWindow) => getCloudRouterBackendSdkClient()
      .system.analytics.admin.overview
      .retrieve({ timeRange: range, rankingSize: rankWindow === 'monthly' ? 8 : 6 }),
    dashboard: () => getCloudRouterBackendSdkClient().system.dashboard.admin.overview.retrieve(),
    paymentSummary: (range) => getSdkworkPaymentBackendSdkClient()
      .payments.intents.summary
      .retrieve({ timeRange: range } as PaymentSummaryQuery),
    refundSummary: (range) => getSdkworkPaymentBackendSdkClient()
      .payments.refunds.summary
      .retrieve({ timeRange: range } as RefundSummaryQuery),
    rechargeRecords: () => getCloudRouterBackendSdkClient()
      .billing.rechargeRecords
      .list({ page: 1, pageSize: 100 }) as unknown as Promise<RechargePageSource>,
    referralStats: () => getCloudRouterBackendSdkClient()
      .billing.referralStats
      .list({ page: 1, pageSize: 50 }) as unknown as Promise<ReferralStatsSource>,
    referralStrategies: () => getCloudRouterBackendSdkClient()
      .billing.referralStrategies
      .list({ page: 1, pageSize: 50 }) as unknown as Promise<ReferralStrategySource>,
    serviceNodes: () => getCloudRouterBackendSdkClient()
      .system.serviceNodes
      .list({ page: 1, pageSize: 100 }),
    exchangeRules: () => getCloudRouterBackendSdkClient()
      .billing.exchangeRules
      .list({ page: 1, pageSize: 50 }),
  };
}

let dataScreenSourcePort: DataScreenSourcePort = createSdkSourcePort();

/** Host-owned seam: tests and embedded hosts replace the SDK port. */
export function configureDataScreenSourcePort(next: DataScreenSourcePort | null): void {
  dataScreenSourcePort = next ?? createSdkSourcePort();
}

/* ------------------------------------------------------------------ *
 * Normalizers
 * ------------------------------------------------------------------ */

const MODALITY_PALETTE = ['#38bdf8', '#a78bfa', '#22d3ee', '#f472b6', '#fbbf24', '#34d399', '#fb923c', '#818cf8'];
const MODEL_PALETTE = ['#3b82f6', '#22d3ee', '#8b5cf6', '#f59e0b', '#10b981', '#ec4899', '#f97316', '#14b8a6', '#6366f1'];

const PAID_PAYMENT_STATUSES = new Set(['succeeded', 'paid', 'settled', 'completed']);
const SETTLED_RECHARGE_STATUSES = new Set(['success', 'succeeded', 'paid', 'completed', 'settled']);
const PENDING_RECHARGE_STATUSES = new Set(['pending', 'created', 'processing', 'queued', 'submitted', 'paying']);
const FAILED_RECHARGE_STATUSES = new Set(['failed', 'canceled', 'cancelled', 'closed', 'expired', 'refunded']);

function pickColor(index: number, palette: readonly string[], fallback?: string): string {
  if (fallback && /^#[0-9A-Fa-f]{6}$/u.test(fallback)) {
    return fallback;
  }
  return palette[index % palette.length] ?? '#38bdf8';
}

function buildShares(
  items: readonly { name: string; value: string | number; color: string }[],
  palette: readonly string[],
): DataScreenShareItem[] {
  const rows = items
    .map((item, index) => {
      const value = toDecimalString(item.value);
      return {
        name: item.name,
        value,
        chartValue: decimalToNumber(value),
        color: pickColor(index, palette, item.color),
      };
    })
    .filter((item) => item.name.length > 0);
  const total = rows.reduce((sum, item) => addDecimalStrings(sum, item.value), '0');
  return rows.map((row) => ({
    ...row,
    percent: Number(percentageOf(row.value, total)),
  }));
}

function normalizeTrend(analytics: AnalyticsSource): DataScreenTrendPoint[] {
  const source = Array.isArray(analytics.trend) ? analytics.trend : [];
  return source.map((point) => {
    const tokens = toDecimalString(point.tokens);
    const requests = toDecimalString(point.requests);
    const points = toDecimalString(point.points);
    const users = integerString(point.users);
    return {
      label: point.time,
      tokens,
      requests,
      points,
      users,
      tokenValue: decimalToNumber(tokens),
      requestValue: decimalToNumber(requests),
      pointValue: decimalToNumber(points),
      userValue: decimalToNumber(users),
    };
  });
}

function normalizeSummary(analytics: AnalyticsSource): DataScreenSummary {
  const summary = analytics.summary;
  if (!summary || typeof summary !== 'object') {
    throw new DataScreenContractError('Analytics summary is missing from the response.');
  }
  const totalRequests = integerString(summary.totalRequests);
  const successfulRequests = integerString(summary.successfulRequests);
  return {
    totalUsers: integerString(summary.totalUsers),
    activeUsers: integerString(summary.activeUsers),
    activeModels: integerString(summary.activeModels),
    totalRequests,
    successfulRequests,
    failedRequests: integerString(summary.failedRequests),
    totalTokens: toDecimalString(summary.totalTokens),
    totalPoints: toDecimalString(summary.totalPoints),
    upstreamCost: toDecimalString(summary.upstreamCost),
    averageTokensPerRequest: toDecimalString(summary.averageTokensPerRequest),
    averagePointsPerRequest: toDecimalString(summary.averagePointsPerRequest),
    errorRate: toDecimalString(summary.errorRate),
    successRate: percentageOf(successfulRequests, totalRequests),
    requestsPerMinute: ratioOf(totalRequests, String(Math.max(Math.round(readWindowMinutes(analytics.startTime, analytics.endTime)), 1))),
  };
}

function normalizeRankRows(
  rows: readonly { label: string; secondary: string; metric: string }[],
): DataScreenRankItem[] {
  const max = rows.reduce((current, row) => Math.max(current, decimalToNumber(row.metric)), 0);
  return rows.map((row) => {
    const value = decimalToNumber(row.metric);
    return {
      label: row.label,
      secondary: row.secondary,
      metric: row.metric,
      metricValue: value,
      barPercent: max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0,
    };
  });
}

function normalizeModelRanking(analytics: AnalyticsSource): DataScreenRankItem[] {
  const rows = Array.isArray(analytics.modelRankings?.points) ? analytics.modelRankings.points : [];
  return normalizeRankRows(rows.map((row) => ({
    label: row.model,
    secondary: row.vendor,
    metric: toDecimalString(row.points),
  })));
}

function normalizeUserRanking(analytics: AnalyticsSource): DataScreenRankItem[] {
  const rows = Array.isArray(analytics.userRankings?.points) ? analytics.userRankings.points : [];
  return normalizeRankRows(rows.map((row) => ({
    label: row.userName,
    secondary: row.email ? row.email : row.userId,
    metric: toDecimalString(row.points),
  })));
}

function normalizeInsights(analytics: AnalyticsSource): DataScreenInsight[] {
  const insights = Array.isArray(analytics.insights) ? analytics.insights : [];
  return insights.map((insight) => ({
    key: insight.key,
    title: insight.title,
    value: insight.value,
    severity: insight.severity === 'critical' || insight.severity === 'warning' ? insight.severity : 'info',
    detail: insight.detail,
  }));
}

function normalizeLiveTraces(dashboard: DashboardSource): DataScreenLiveTrace[] {
  const traces = Array.isArray(dashboard.recentUsage) ? dashboard.recentUsage : [];
  return traces.map((trace) => {
    const usageIn = Number.isFinite(trace.usageIn) ? Number(trace.usageIn) : 0;
    const usageOut = Number.isFinite(trace.usageOut) ? Number(trace.usageOut) : 0;
    const usageCount = Number.isFinite(trace.usageCount) ? Number(trace.usageCount) : 0;
    return {
      id: trace.id,
      user: trace.user,
      isApiUser: trace.isApiUser === true,
      model: trace.model,
      modality: trace.type,
      billingMode: trace.billingMode,
      usageLabel: trace.billingMode === 'token'
        ? `${usageIn.toLocaleString('en-US')} / ${usageOut.toLocaleString('en-US')}`
        : `${usageCount.toLocaleString('en-US')}×`,
      cost: toDecimalString(trace.cost),
      time: trace.time,
      success: trace.status.trim().toLowerCase() === 'success',
    };
  });
}

function mergeAmountBuckets(
  buckets: readonly { currencyCode?: string; amount?: string; count?: string }[],
): DataScreenOrderBucket[] {
  const merged = new Map<string, { minor: string; count: string }>();
  for (const bucket of buckets) {
    const currencyCode = String(bucket.currencyCode ?? '').toUpperCase();
    const current = merged.get(currencyCode) ?? { minor: '0', count: '0' };
    merged.set(currencyCode, {
      minor: String(BigInt(current.minor) + BigInt(integerString(bucket.amount))),
      count: String(BigInt(current.count) + BigInt(integerString(bucket.count))),
    });
  }
  return [...merged.entries()]
    .map(([currencyCode, value]) => {
      const amount = minorUnitsToMajor(value.minor, currencyCode);
      return { currencyCode, amount, count: value.count, amountValue: decimalToNumber(amount) };
    })
    .sort((left, right) => right.amountValue - left.amountValue);
}

function sumStatusCounts(statuses: readonly DataScreenPaymentStatus[], predicate: (status: string) => boolean): string {
  return statuses.reduce((total, bucket) => (
    predicate(bucket.status) ? String(BigInt(total) + BigInt(bucket.count)) : total
  ), '0');
}

function normalizePayments(
  intents: PaymentSummarySource,
  refunds: RefundSummarySource | null,
): DataScreenPayments {
  if (!Array.isArray(intents.totalAmounts) || !Array.isArray(intents.statusCounts)) {
    throw new DataScreenContractError('Payment intent summary returned an invalid payload.');
  }
  const statuses = intents.statusCounts.map((bucket) => ({
    status: String(bucket.status ?? '').trim().toLowerCase(),
    count: integerString(bucket.count),
  }));
  const orderCount = integerString(intents.totalCount);
  const paidCount = sumStatusCounts(statuses, (status) => PAID_PAYMENT_STATUSES.has(status));
  const amounts = mergeAmountBuckets(intents.totalAmounts);
  const primary = amounts[0];
  const refundAmounts = refunds && Array.isArray(refunds.totalAmounts)
    ? mergeAmountBuckets(refunds.totalAmounts)
    : [];
  const refundPrimary = refundAmounts.find((bucket) => bucket.currencyCode === (primary?.currencyCode ?? ''))
    ?? refundAmounts[0];
  return {
    orderCount,
    paidCount,
    paidUnknown: paidCount === '0' && orderCount !== '0',
    amounts,
    statuses,
    paidRate: Number(percentageOf(paidCount, orderCount)),
    averageTicket: primary ? ratioOf(primary.amount, paidCount) : '0',
    primaryCurrency: primary?.currencyCode ?? '',
    refundCount: refunds ? integerString(refunds.totalCount) : '0',
    refundAmount: refundPrimary?.amount ?? '0',
    refundRate: Number(percentageOf(refundPrimary?.amount ?? '0', primary?.amount ?? '0')),
  };
}

function normalizeRecharge(page: RechargePageSource): DataScreenRecharge {
  const items = Array.isArray(page.items) ? page.items : [];
  const methodTotals = new Map<string, string>();
  let credited = '0';
  let usdCredited = '0';
  let successCount = '0';
  let pendingCount = '0';
  let failedCount = '0';
  const recent: DataScreenRechargeRecord[] = [];

  for (const record of items) {
    const status = String(record.status ?? '').trim().toLowerCase();
    const method = String(record.method ?? '').trim() || 'unknown';
    const amount = toDecimalString(record.amount);
    const credit = toDecimalString(record.usdCredited);
    if (SETTLED_RECHARGE_STATUSES.has(status)) {
      successCount = String(BigInt(successCount) + 1n);
      credited = addDecimalStrings(credited, amount);
      usdCredited = addDecimalStrings(usdCredited, credit);
      methodTotals.set(method, addDecimalStrings(methodTotals.get(method) ?? '0', amount));
    } else if (PENDING_RECHARGE_STATUSES.has(status)) {
      pendingCount = String(BigInt(pendingCount) + 1n);
    } else if (FAILED_RECHARGE_STATUSES.has(status)) {
      failedCount = String(BigInt(failedCount) + 1n);
    }
    if (recent.length < 8) {
      recent.push({
        id: String(record.id ?? record.tradeNo ?? ''),
        user: String(record.user ?? record.userId ?? ''),
        amount,
        credit,
        method,
        status,
        time: String(record.time ?? ''),
      });
    }
  }

  const methods = buildShares(
    [...methodTotals.entries()]
      .map(([name, value]) => ({ name, value, color: '' }))
      .sort((left, right) => decimalToNumber(right.value) - decimalToNumber(left.value))
      .slice(0, 6),
    MODEL_PALETTE,
  );

  return {
    count: String(items.length),
    amount: credited,
    usdCredited,
    bonusRate: ratioOf(usdCredited, credited),
    successCount,
    pendingCount,
    failedCount,
    methods,
    recent,
  };
}

function normalizeReferral(
  stats: ReferralStatsSource,
  strategies: ReferralStrategySource | null,
): DataScreenReferral {
  const rows = Array.isArray(stats.items) ? stats.items : [];
  let invited = '0';
  let bonus = '0';
  let revenue = '0';
  for (const row of rows) {
    invited = String(BigInt(invited) + BigInt(integerString(row.totalInvited)));
    bonus = addDecimalStrings(bonus, toDecimalString(row.bonusAwarded));
    revenue = addDecimalStrings(revenue, toDecimalString(row.totalRevenue));
  }
  const strategyRows = Array.isArray(strategies?.items) ? strategies.items : [];
  const activeStrategies = strategyRows.filter(
    (row) => String(row.status ?? '').trim().toLowerCase() === 'active',
  ).length;
  const topInviters = normalizeRankRows(
    [...rows]
      .sort((left, right) => decimalToNumber(integerString(right.totalInvited)) - decimalToNumber(integerString(left.totalInvited)))
      .slice(0, 6)
      .map((row) => ({
        label: String(row.inviter ?? ''),
        secondary: String(row.link ?? ''),
        metric: integerString(row.totalInvited),
      })),
  );
  return {
    inviterCount: String(rows.length),
    invited,
    bonus,
    revenue,
    activeStrategies: String(activeStrategies),
    topInviters,
  };
}

function normalizeHealth(nodes: ServiceNodeSource): DataScreenHealth {
  const items = Array.isArray(nodes.items) ? nodes.items : [];
  const readField = (node: unknown, key: string): string => (
    node && typeof node === 'object' ? String((node as Record<string, unknown>)[key] ?? '').trim().toLowerCase() : ''
  );
  const totalNodes = items.length;
  const onlineNodes = items.filter((node) => readField(node, 'healthStatus') === 'online').length;
  const enabledNodes = items.filter((node) => readField(node, 'status') === 'enabled').length;
  return {
    totalNodes,
    onlineNodes,
    enabledNodes,
    availability: totalNodes === 0 ? 0 : Math.round((onlineNodes / totalNodes) * 1000) / 10,
  };
}

/**
 * Reads the active cash-to-Credits rule and converts the two cash walls into the
 * platform unit of account. `POINTS`/`CASH` means one unit of cash buys `rate`
 * Credits. Without an active rule the caller renders raw currency only.
 */
function normalizeEconomy(
  rules: ExchangeRuleSource | null,
  payments: DataScreenPayments | null,
  recharge: DataScreenRecharge | null,
): DataScreenEconomy | null {
  const items = Array.isArray(rules?.items) ? rules.items : [];
  const rule = items.find((candidate) => (
    candidate.status === 'active'
    && candidate.sourceAssetType === 'POINTS'
    && candidate.targetAssetType === 'CASH'
  ));
  if (!rule) {
    return null;
  }
  const pointsPerCash = toDecimalString(rule.rate);
  if (pointsPerCash === '0') {
    return null;
  }
  const paidCash = payments?.amounts.find(
    (bucket) => bucket.currencyCode === payments.primaryCurrency,
  )?.amount ?? '0';
  return {
    pointsPerCash,
    paidCredits: ratioOf(paidCash, pointsPerCash),
    rechargeCredits: ratioOf(recharge?.amount ?? '0', pointsPerCash),
  };
}

/* ------------------------------------------------------------------ *
 * Orchestration
 * ------------------------------------------------------------------ */

interface SectionOutcome<T> {
  value: T | null;
  state: DataScreenSectionState;
}

function describeSourceError(error: unknown): string {
  if (error instanceof DataScreenContractError) {
    return error.message;
  }
  if (error && typeof error === 'object') {
    const problem = (error as { problem?: { detail?: unknown } }).problem;
    if (problem && typeof problem.detail === 'string' && problem.detail.trim()) {
      return problem.detail.trim().slice(0, 280);
    }
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) {
      return message.trim().slice(0, 280);
    }
  }
  return 'Request failed.';
}

async function runSection<T>(id: DataScreenSectionId, load: () => Promise<T>): Promise<SectionOutcome<T>> {
  try {
    return { value: await withTimeout(load, id), state: { id, status: 'ready', message: '' } };
  } catch (error) {
    return { value: null, state: { id, status: 'degraded', message: describeSourceError(error) } };
  }
}

/**
 * Per-source ceiling.
 *
 * A wall that waits forever on one stuck module shows nothing at all. Each source
 * is therefore raced against this timeout and reported as degraded, so the rest
 * of the wall renders at the scheduled refresh cadence.
 */
export const DATA_SCREEN_SOURCE_TIMEOUT_MS = 20_000;

function withTimeout<T>(load: () => Promise<T>, label: DataScreenSectionId): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`The ${label} source did not answer within ${Math.round(DATA_SCREEN_SOURCE_TIMEOUT_MS / 1000)}s.`));
    }, DATA_SCREEN_SOURCE_TIMEOUT_MS);
    load().then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function normalizeRange(value: unknown): DataScreenRange {
  return value === 'weekly' || value === 'monthly' || value === 'yearly' ? value : 'daily';
}

function normalizeRankWindow(value: unknown): DataScreenRankWindow {
  return value === 'monthly' ? 'monthly' : 'weekly';
}

/**
 * Loads every independent source and folds them into one snapshot.
 *
 * Analytics is the backbone (wall, trend, distributions, rankings, insights).
 * When it fails those panels are omitted and the surviving commercial panels
 * still render, so an outage never produces a screen of zeros that reads like a
 * real business state. Only when every source fails does the screen surface
 * {@link DataScreenUnavailableError}, which the page turns into a retry state.
 */
export async function loadDataScreenSnapshot(rawQuery: DataScreenQuery = {}): Promise<DataScreenSnapshot> {
  const range = normalizeRange(rawQuery.range);
  const rankWindow = normalizeRankWindow(rawQuery.rankWindow);
  const port = dataScreenSourcePort;

  const [
    analyticsOutcome,
    dashboardOutcome,
    paymentsOutcome,
    refundsOutcome,
    rechargeOutcome,
    referralOutcome,
    strategyOutcome,
    nodesOutcome,
    exchangeOutcome,
  ] = await Promise.all([
    runSection('analytics', () => port.analytics(range, rankWindow)),
    runSection('dashboard', () => port.dashboard()),
    runSection('payments', () => port.paymentSummary(range)),
    runSection('payments', () => port.refundSummary(range)),
    runSection('recharges', () => port.rechargeRecords()),
    runSection('referrals', () => port.referralStats()),
    runSection('referrals', () => port.referralStrategies()),
    runSection('serviceNodes', () => port.serviceNodes()),
    runSection('payments', () => port.exchangeRules()),
  ]);

  const sections: DataScreenSectionState[] = [];
  const record = (state: DataScreenSectionState): void => {
    const existing = sections.find((entry) => entry.id === state.id);
    if (!existing) {
      sections.push({ ...state });
      return;
    }
    if (state.status === 'degraded') {
      existing.status = 'degraded';
      existing.message = existing.message || state.message;
    }
  };
  [
    analyticsOutcome, dashboardOutcome, paymentsOutcome, refundsOutcome,
    rechargeOutcome, referralOutcome, strategyOutcome, nodesOutcome, exchangeOutcome,
  ].forEach((outcome) => record(outcome.state));

  let summary: DataScreenSummary | null = null;
  let trend: readonly DataScreenTrendPoint[] = [];
  let modelRanking: readonly DataScreenRankItem[] = [];
  let userRanking: readonly DataScreenRankItem[] = [];
  let insights: readonly DataScreenInsight[] = [];
  if (analyticsOutcome.value) {
    try {
      const analytics = analyticsOutcome.value;
      summary = normalizeSummary(analytics);
      trend = normalizeTrend(analytics);
      modelRanking = normalizeModelRanking(analytics);
      userRanking = normalizeUserRanking(analytics);
      insights = normalizeInsights(analytics);
    } catch (error) {
      summary = null;
      trend = [];
      modelRanking = [];
      userRanking = [];
      insights = [];
      record({ id: 'analytics', status: 'degraded', message: describeSourceError(error) });
    }
  }

  const modelDistribution = dashboardOutcome.value
    ? buildShares(dashboardOutcome.value.modelDistribution, MODEL_PALETTE)
    : [];
  const modalityDistribution = dashboardOutcome.value
    ? buildShares(dashboardOutcome.value.multimodal, MODALITY_PALETTE)
    : [];
  const liveTraces = dashboardOutcome.value ? normalizeLiveTraces(dashboardOutcome.value) : [];

  let payments: DataScreenPayments | null = null;
  if (paymentsOutcome.value) {
    try {
      payments = normalizePayments(paymentsOutcome.value, refundsOutcome.value);
    } catch (error) {
      record({ id: 'payments', status: 'degraded', message: describeSourceError(error) });
      payments = null;
    }
  }

  const recharge = rechargeOutcome.value ? normalizeRecharge(rechargeOutcome.value) : null;

  const snapshot: DataScreenSnapshot = {
    range,
    rankWindow,
    windowStart: analyticsOutcome.value ? analyticsOutcome.value.startTime : '',
    windowEnd: analyticsOutcome.value ? analyticsOutcome.value.endTime : '',
    generatedAt: new Date().toISOString(),
    sections,
    summary,
    trend,
    modelDistribution,
    modalityDistribution,
    modelRanking,
    userRanking,
    liveTraces,
    payments,
    recharge,
    referral: referralOutcome.value ? normalizeReferral(referralOutcome.value, strategyOutcome.value) : null,
    health: nodesOutcome.value ? normalizeHealth(nodesOutcome.value) : null,
    economy: normalizeEconomy(exchangeOutcome.value, payments, recharge),
    insights,
  };

  if (sections.every((section) => section.status === 'degraded')) {
    throw new DataScreenUnavailableError(sections);
  }
  return snapshot;
}
