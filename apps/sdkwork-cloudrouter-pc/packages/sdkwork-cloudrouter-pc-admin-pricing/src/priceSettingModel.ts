import { formatMoney } from '@sdkwork/cloudroutes-pc-commons/sdkwork-utils';
import type {
  AdminOfficialPricingProductItem,
  AdminOfficialPricingRateItem,
  AdminPricingRuleItem,
  AdminPricingSchedule,
} from './pricingService';

export interface PriceSettingRateRow {
  official: AdminOfficialPricingRateItem;
  rule?: AdminPricingRuleItem;
}

export interface PriceSettingProductRow {
  key: string;
  product: AdminOfficialPricingProductItem;
  prices: PriceSettingRateRow[];
}

export interface PriceSettingProductRowsResult {
  rows: PriceSettingProductRow[];
  matchedRuleIds: Set<string>;
}

export type PricingRuleLifecycle = 'missing' | 'active' | 'scheduled' | 'expired' | 'inactive';

/**
 * Runtime pricing only applies active rules inside their effective window.
 * Keeping this decision in the view model prevents an inactive or expired
 * sales rule from being presented as the price customers will be charged.
 */
export function pricingRuleLifecycle(
  rule: AdminPricingRuleItem | undefined,
  now = Date.now(),
): PricingRuleLifecycle {
  if (!rule) return 'missing';
  if (rule.status !== 'active') return 'inactive';
  const effectiveFrom = parsePricingTimestamp(rule.effectiveFrom);
  if (effectiveFrom !== undefined && effectiveFrom > now) return 'scheduled';
  const effectiveTo = parsePricingTimestamp(rule.effectiveTo);
  if (effectiveTo !== undefined && effectiveTo <= now) return 'expired';
  if (rule.schedule && !pricingScheduleMatchesAt(rule.schedule, now)) return 'scheduled';
  return 'active';
}

function parsePricingTimestamp(value: string | undefined): number | undefined {
  if (!value?.trim()) return undefined;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function buildPriceSettingProductRows(
  products: readonly AdminOfficialPricingProductItem[],
  rules: readonly AdminPricingRuleItem[],
  now = Date.now(),
): PriceSettingProductRowsResult {
  const matchedRuleIds = new Set<string>();
  const rows = products.map((product): PriceSettingProductRow => ({
    key: product.groupKey,
    product,
    prices: [...product.rates]
      .sort(compareOfficialRates)
      .map((official) => {
        const matches = rules
          .filter((rule) => pricingRuleMatchesOfficialRate(rule, official))
          .sort((left, right) => ruleLifecycleRank(left, now) - ruleLifecycleRank(right, now)
            || ruleSpecificity(right) - ruleSpecificity(left)
            || left.priority - right.priority
            || (right.effectiveFrom ?? '').localeCompare(left.effectiveFrom ?? '')
            || left.id.localeCompare(right.id));
        const selected = selectDisplayRule(matches, now);
        // Only the rule actually represented in the product row is consumed.
        // Shadowed, expired, or ambiguous rules remain visible as custom rows
        // so administrators can repair them instead of losing management
        // access to an otherwise valid database record.
        if (selected) matchedRuleIds.add(selected.id);
        return { official, rule: selected };
      }),
  }));
  return { rows, matchedRuleIds };
}

function ruleLifecycleRank(rule: AdminPricingRuleItem, now: number): number {
  return pricingRuleLifecycle(rule, now) === 'active' ? 0 : 1;
}

function selectDisplayRule(
  matches: readonly AdminPricingRuleItem[],
  now: number,
): AdminPricingRuleItem | undefined {
  if (matches.length === 0) return undefined;
  const active = matches.filter((rule) => pricingRuleLifecycle(rule, now) === 'active');
  const candidates = active.length > 0 ? active : matches;
  const selected = candidates[0];
  if (!selected) return undefined;
  const ambiguous = candidates.slice(1).some((candidate) =>
    pricingRuleLifecycle(candidate, now) === pricingRuleLifecycle(selected, now)
      && ruleSpecificity(candidate) === ruleSpecificity(selected)
      && candidate.priority === selected.priority
      && (candidate.effectiveFrom ?? '') === (selected.effectiveFrom ?? '')
      && candidate.ruleCode !== selected.ruleCode,
  );
  return ambiguous ? undefined : selected;
}

export function pricingRuleMatchesOfficialRate(
  rule: AdminPricingRuleItem,
  official: AdminOfficialPricingRateItem,
): boolean {
  // A condition-dependent rule has no single product-level sales price. Keep
  // it in the custom-rule view until a request dimension can select it.
  if (rule.conditions.length > 0) return false;
  if (!rule.productCode && !rule.catalogKey) return false;
  return dimensionMatches(rule.productCode, official.productCode)
    && dimensionMatches(rule.operationCode, official.operationCode)
    && dimensionMatches(rule.meterCode, official.meterCode)
    && dimensionMatches(rule.providerCode, official.providerCode)
    && dimensionMatches(rule.regionCode, official.regionCode)
    && dimensionMatches(rule.catalogKey, official.catalogKey ?? undefined);
}

/** Mirrors PricingSchedule::matched_window_code for the admin preview. */
export function pricingScheduleMatchesAt(
  schedule: AdminPricingSchedule,
  now = Date.now(),
): boolean {
  let parts: Record<string, string>;
  try {
    parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
      timeZone: schedule.timeZone,
      weekday: 'short',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date(now)).filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  } catch {
    return false;
  }
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  if (schedule.excludeDates.includes(date)) return false;
  const time = `${parts.hour}:${parts.minute}:${parts.second}`;
  const weekday = ({ Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 } as Record<string, number>)[parts.weekday];
  if (!weekday) return false;
  return schedule.weeklyWindows.some((window) => {
    const crossesMidnight = window.endDayOffset === 1;
    const beforeEnd = time < normalizeScheduleClock(window.endTime);
    const startDate = crossesMidnight && beforeEnd ? shiftIsoDate(date, -1) : date;
    if (schedule.excludeDates.includes(startDate)) return false;
    const scheduledDay = window.daysOfWeek.includes(weekdayForIsoDate(startDate));
    if (!scheduledDay && !schedule.includeDates.includes(startDate)) return false;
    const start = normalizeScheduleClock(window.startTime);
    const end = normalizeScheduleClock(window.endTime);
    return crossesMidnight ? time >= start || time < end : time >= start && time < end;
  });
}

function normalizeScheduleClock(value: string): string {
  return /^\d{2}:\d{2}$/.test(value) ? `${value}:00` : value;
}

function shiftIsoDate(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function weekdayForIsoDate(value: string): number {
  const day = new Date(`${value}T00:00:00Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

export function formatPricingMoney(value: string | undefined, currency: string, locale: string): string {
  if (!value) return '—';
  return formatMoney(value, {
    currency: currency.trim().toUpperCase(),
    locale,
    mode: 'code',
    minFractionDigits: 0,
    maxFractionDigits: 12,
  }) ?? '—';
}

export function normalizePricingDecimal(value: string | undefined): string {
  if (!value) return '';
  return formatMoney(value, {
    currency: 'USD',
    locale: 'en-US',
    mode: 'decimal',
    minFractionDigits: 0,
    maxFractionDigits: 12,
    useGrouping: false,
  }) ?? value;
}

export function officialRateUnit(rate: AdminOfficialPricingRateItem): string {
  return rate.unitSize === '1' ? rate.unitCode : `${rate.unitSize} ${rate.unitCode}`;
}

export function officialRateQualifier(rate: AdminOfficialPricingRateItem): string | undefined {
  const qualifiers = rate.conditions.map((condition) => {
    const value = Array.isArray(condition.value) ? condition.value.join(', ') : String(condition.value);
    return `${condition.dimensionCode} ${condition.operatorCode} ${value}`;
  });
  if (rate.rateVariant === 'time_window') qualifiers.push('time_window');
  return qualifiers.length > 0 ? qualifiers.join(' · ') : undefined;
}

function dimensionMatches(expected: string | undefined, actual: string | undefined): boolean {
  return !expected || expected.trim().toLowerCase() === actual?.trim().toLowerCase();
}

function ruleSpecificity(rule: AdminPricingRuleItem): number {
  return [rule.productCode, rule.operationCode, rule.meterCode, rule.providerCode, rule.regionCode, rule.catalogKey]
    .filter(Boolean).length;
}

function compareOfficialRates(left: AdminOfficialPricingRateItem, right: AdminOfficialPricingRateItem): number {
  return meterOrder(left.meterCode) - meterOrder(right.meterCode)
    || left.meterCode.localeCompare(right.meterCode)
    || left.operationCode.localeCompare(right.operationCode)
    || left.rateCode.localeCompare(right.rateCode);
}

function meterOrder(meterCode: string): number {
  const code = meterCode.toLowerCase();
  if (code.includes('input')) return 10;
  if (code.includes('output')) return 20;
  if (code.includes('reasoning')) return 30;
  if (code.includes('cache_read')) return 40;
  if (code.includes('cache_write')) return 50;
  if (code.includes('cache_storage')) return 60;
  if (code.includes('image')) return 70;
  if (code.includes('audio') || code.includes('speech')) return 80;
  if (code.includes('video')) return 90;
  if (code.includes('api_')) return 100;
  return 1000;
}
