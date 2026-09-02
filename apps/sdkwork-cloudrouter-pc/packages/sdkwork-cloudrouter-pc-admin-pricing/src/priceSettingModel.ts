import { formatMoney } from '@sdkwork/cloudroutes-pc-commons/sdkwork-utils';
import type {
  AdminOfficialPricingProductItem,
  AdminOfficialPricingRateItem,
  AdminPricingCondition,
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
  const amount = normalizePricingDecimal(value);
  if (!amount) return '—';
  const code = currency.trim().toUpperCase();
  const formatted = formatMoney(amount, {
    currency: code,
    locale,
    mode: 'code',
    minFractionDigits: 0,
    maxFractionDigits: 12,
  });
  // Unknown ISO codes still show a trimmed decimal instead of a padded wire value.
  return formatted ?? `${code ? `${code} ` : ''}${amount}`;
}

/**
 * Display/edit decimal strings from NUMERIC wire values.
 * Strips trailing fractional zeros without converting through `number`
 * (so tiny prices like `0.0000005` stay exact).
 */
export function normalizePricingDecimal(value: string | undefined): string {
  if (!value) return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  const formatted = formatMoney(trimmed, {
    currency: 'USD',
    locale: 'en-US',
    mode: 'decimal',
    minFractionDigits: 0,
    maxFractionDigits: 12,
    useGrouping: false,
  });
  if (formatted !== null) return formatted;
  return stripTrailingFractionalZeros(trimmed);
}

/** Quantity / count / unit-size display; keeps non-decimal tokens like `1M` intact. */
export function formatPricingQuantity(value: string | undefined, fallback = '—'): string {
  if (value === undefined || value === null) return fallback;
  const trimmed = String(value).trim();
  if (!trimmed) return fallback;
  if (!/^-?[0-9]+(?:\.[0-9]+)?$/.test(trimmed)) return trimmed;
  return normalizePricingDecimal(trimmed) || fallback;
}

export function officialRateUnit(
  rate: Pick<AdminOfficialPricingRateItem, 'unitSize' | 'unitCode'>,
  translate: PricingConditionTranslate = defaultPricingConditionTranslate,
): string {
  const unitSize = formatPricingQuantity(rate.unitSize, '1');
  const unit = formatPricingUnitLabel(rate.unitCode, translate);
  return unitSize === '1' ? unit : `${unitSize} ${unit}`;
}

export function formatPricingUnitLabel(
  unitCode: string,
  translate: PricingConditionTranslate = defaultPricingConditionTranslate,
): string {
  const trimmed = unitCode.trim();
  if (!trimmed) return trimmed;
  const translated = translatePricingCode('admin.pricing.settings.unit', trimmed, translate);
  return translated !== trimmed ? translated : trimmed;
}

function stripTrailingFractionalZeros(value: string): string {
  if (!/^-?[0-9]+(?:\.[0-9]+)?$/.test(value)) return value;
  if (!value.includes('.')) return value.replace(/^(-?)0+(?=\d)/, '$1') || '0';
  const negative = value.startsWith('-');
  const unsigned = negative ? value.slice(1) : value;
  const [wholeRaw = '0', fractionRaw = ''] = unsigned.split('.');
  const whole = wholeRaw.replace(/^0+(?=\d)/, '') || '0';
  const fraction = fractionRaw.replace(/0+$/, '');
  const body = fraction ? `${whole}.${fraction}` : whole;
  return negative && body !== '0' ? `-${body}` : body;
}

export function officialRateQualifier(
  rate: Pick<AdminOfficialPricingRateItem, 'conditions' | 'rateVariant'>,
  translate: PricingConditionTranslate = defaultPricingConditionTranslate,
): string | undefined {
  const qualifiers = rate.conditions.map((condition) => formatPricingCondition(condition, translate));
  if (rate.rateVariant === 'time_window') {
    qualifiers.push(translate('admin.pricing.condition.variant.time_window', 'Time-window price'));
  }
  return qualifiers.length > 0 ? qualifiers.join(' · ') : undefined;
}

/** Localized price-variant label shown in table cells (peak / off-peak / …). */
export function officialRateVariantLabel(
  rate: Pick<AdminOfficialPricingRateItem, 'conditions' | 'rateVariant' | 'schedule'>,
  translate: PricingConditionTranslate = defaultPricingConditionTranslate,
): string | undefined {
  const key = officialRateVariantKey(rate);
  if (key === 'standard') {
    return rate.rateVariant === 'time_window' || rate.conditions.length > 0 || Boolean(rate.schedule?.weeklyWindows.length)
      ? translate('admin.pricing.condition.value.standard', 'Standard price')
      : undefined;
  }
  return translatePricingCode('admin.pricing.condition.value', key, translate);
}

/** Stable grouping key for peak / off-peak / standard tabs. */
export function officialRateVariantKey(
  rate: Pick<AdminOfficialPricingRateItem, 'conditions' | 'rateVariant' | 'schedule'>,
): string {
  const tier = rate.conditions.find((condition) =>
    isTierDimension(condition.dimensionCode)
      && condition.operatorCode === 'eq'
      && !Array.isArray(condition.value),
  );
  if (tier) {
    return normalizeVariantTabKey(String(tier.value));
  }
  const windowCode = rate.schedule?.weeklyWindows.find((window) => window.windowCode.trim())?.windowCode;
  if (windowCode) {
    const normalized = normalizeVariantTabKey(windowCode);
    if (
      normalized === 'peak'
      || normalized === 'off_peak'
      || normalized === 'priority'
      || normalized === 'premium'
      || normalized === 'standard'
    ) {
      return normalized;
    }
  }
  if (rate.rateVariant === 'time_window') return 'time_window';
  return 'standard';
}

export interface PriceSettingVariantGroup {
  key: string;
  prices: PriceSettingRateRow[];
}

export interface PriceSettingRegionGroup {
  regionCode: string;
  currencyCode: string;
  prices: PriceSettingRateRow[];
}

/**
 * Group the prices of a resource row by region. Each resource (model) is now
 * a single admin list row whose official reference prices and sales prices
 * exist per region; the row renders one region tab per group and switches the
 * price cells by the active region.
 */
export function groupPriceSettingRatesByRegion(
  prices: readonly PriceSettingRateRow[],
): PriceSettingRegionGroup[] {
  const groups = new Map<string, PriceSettingRateRow[]>();
  for (const price of prices) {
    const regionCode = price.official.regionCode.trim() || 'global';
    const current = groups.get(regionCode) ?? [];
    current.push(price);
    groups.set(regionCode, current);
  }
  return [...groups.entries()]
    .map(([regionCode, groupPrices]) => ({
      regionCode,
      currencyCode: groupPrices.find((price) => price.official.currencyCode.trim())?.official.currencyCode.trim() ?? '',
      prices: groupPrices,
    }))
    .sort(
      (left, right) => regionTabOrder(left.regionCode) - regionTabOrder(right.regionCode)
        || left.regionCode.localeCompare(right.regionCode),
    );
}

/**
 * Whether a region code may be configured as a default billing region.
 *
 * Mirrors the backend rule (`require_default_region_regions`): every priced
 * region qualifies — including the `global` partition, which is a real
 * pricing partition and bills region-less accounts at the global prices.
 * Only a blank code is rejected.
 */
export function isDefaultRegionEligible(regionCode: string): boolean {
  return regionCode.trim() !== '';
}

/**
 * Regions of a resource that may be configured as its default billing region.
 *
 * Mirrors the backend rule (`require_default_region_regions`): a default
 * region must be one of the regions the model actually prices, so the picker
 * is fed from the resource's own region groups only.
 */
export function eligibleDefaultRegions(
  regions: readonly PriceSettingRegionGroup[],
): PriceSettingRegionGroup[] {
  return regions.filter((region) => isDefaultRegionEligible(region.regionCode));
}

/**
 * Pick the region tab that should be active when a resource row opens:
 * the configured default billing region wins, then the group-level region
 * resolved by the backend (which already prefers the default region), then
 * the first tab.
 */
export function pickDefaultPriceSettingRegion(
  regions: readonly PriceSettingRegionGroup[],
  configuredDefaultRegionCode?: string,
  groupRegionCode?: string,
): string {
  if (regions.length === 0) return '';
  const normalized = (value: string) => value.trim().toLowerCase();
  // The configured default wins outright — `global` included, since a global
  // default bills region-less accounts at the global partition prices.
  const configured = normalized(configuredDefaultRegionCode ?? '');
  const group = normalized(groupRegionCode ?? '');
  return (
    regions.find((region) => normalized(region.regionCode) === configured)?.regionCode
    ?? regions.find((region) => normalized(region.regionCode) === group)?.regionCode
    ?? regions[0].regionCode
  );
}

function regionTabOrder(regionCode: string): number {
  const normalized = regionCode.trim().toLowerCase();
  if (normalized === 'global') return 0;
  if (normalized === 'cn' || normalized === 'china') return 10;
  return 20;
}

/** Group product meters by peak/off-peak (and other) variants for tabbed display. */
export function groupPriceSettingRatesByVariant(
  prices: readonly PriceSettingRateRow[],
): PriceSettingVariantGroup[] {
  const groups = new Map<string, PriceSettingRateRow[]>();
  for (const price of prices) {
    const key = officialRateVariantKey(price.official);
    const current = groups.get(key) ?? [];
    current.push(price);
    groups.set(key, current);
  }
  return [...groups.entries()]
    .map(([key, groupPrices]) => ({ key, prices: groupPrices }))
    .sort((left, right) => variantTabOrder(left.key) - variantTabOrder(right.key) || left.key.localeCompare(right.key));
}

const VARIANT_TAB_FALLBACKS: Record<string, string> = {
  peak: 'Peak',
  off_peak: 'Off-peak',
  priority: 'Priority',
  premium: 'Premium',
  standard: 'Standard',
  time_window: 'Time window',
};

export function formatPriceSettingVariantTabLabel(
  key: string,
  translate: PricingConditionTranslate = defaultPricingConditionTranslate,
): string {
  const normalized = normalizeVariantTabKey(key);
  const tabKey = `admin.pricing.settings.tabs.variant.${normalized}`;
  const tabFallback = VARIANT_TAB_FALLBACKS[normalized];
  if (tabFallback) {
    const translated = translate(tabKey, tabFallback);
    if (translated && translated !== tabKey) return translated;
  }
  const tabTranslated = translatePricingCode('admin.pricing.settings.tabs.variant', normalized, translate);
  if (tabTranslated !== normalized) return tabTranslated;
  const valueTranslated = translatePricingCode('admin.pricing.condition.value', normalized, translate);
  if (valueTranslated !== normalized) return valueTranslated;
  return translate('admin.pricing.settings.tabs.variant.unknown', `Other (${key})`)
    .replace(/\{\{\s*code\s*\}\}/g, key);
}

/** Normalize tier / window codes into a stable tab key. */
export function normalizeVariantTabKey(key: string): string {
  const candidates = pricingCodeCandidates(key);
  for (const candidate of candidates) {
    if (candidate === 'peak' || candidate === 'on_peak' || candidate === 'onpeak') return 'peak';
    if (
      candidate === 'off_peak'
      || candidate === 'offpeak'
      || candidate === 'valley'
      || candidate === 'off_valley'
      || candidate === 'gu'
      || candidate === 'trough'
    ) {
      return 'off_peak';
    }
    if (candidate === 'priority') return 'priority';
    if (candidate === 'premium') return 'premium';
    if (candidate === 'standard' || candidate === 'default' || candidate === 'base') return 'standard';
    if (candidate === 'time_window' || candidate === 'timewindow') return 'time_window';
  }
  return candidates[0] ?? key.trim().toLowerCase();
}

function variantTabOrder(key: string): number {
  const normalized = normalizeVariantTabKey(key);
  if (normalized === 'peak') return 10;
  if (normalized === 'off_peak') return 20;
  if (normalized === 'priority') return 30;
  if (normalized === 'premium') return 40;
  if (normalized === 'standard') return 50;
  if (normalized === 'time_window') return 60;
  return 100;
}

/** @deprecated Prefer officialRateVariantLabel for cell badges. */
export function officialRateConditionBadge(
  rate: Pick<AdminOfficialPricingRateItem, 'conditions' | 'rateVariant' | 'schedule'>,
  translate: PricingConditionTranslate = defaultPricingConditionTranslate,
): string | undefined {
  return officialRateVariantLabel(rate, translate);
}

export type PricingConditionTranslate = (key: string, fallback?: string) => string;

export function formatPricingCondition(
  condition: AdminPricingCondition | AdminOfficialPricingRateItem['conditions'][number],
  translate: PricingConditionTranslate = defaultPricingConditionTranslate,
): string {
  const dimension = translatePricingCode(
    'admin.pricing.condition.dimension',
    condition.dimensionCode,
    translate,
  );
  const value = formatPricingConditionValue(condition.value, translate);
  if (condition.operatorCode === 'eq') {
    return `${dimension}: ${value}`;
  }
  if (condition.operatorCode === 'exists') {
    return dimension;
  }
  const operator = translatePricingCode(
    'admin.pricing.condition.operator',
    condition.operatorCode,
    translate,
  );
  return `${dimension} ${operator} ${value}`;
}

export function formatPricingConditionValue(
  value: AdminPricingCondition['value'],
  translate: PricingConditionTranslate = defaultPricingConditionTranslate,
): string {
  if (Array.isArray(value)) {
    return value.map((item) => formatPricingConditionScalar(item, translate)).join(', ');
  }
  return formatPricingConditionScalar(value, translate);
}

export function formatOfficialRateScheduleLines(
  schedule: AdminOfficialPricingRateItem['schedule'] | AdminPricingSchedule | null | undefined,
  translate: PricingConditionTranslate = defaultPricingConditionTranslate,
): string[] {
  if (!schedule?.weeklyWindows?.length) return [];
  const lines = [
    translate('admin.pricing.schedule.timezone', `Timezone: ${schedule.timeZone}`)
      .replace(/\{\{timeZone\}\}/g, schedule.timeZone),
  ];
  for (const window of schedule.weeklyWindows) {
    const days = [...window.daysOfWeek]
      .sort((left, right) => left - right)
      .map((day) => translate(`admin.pricing.settings.days.${day}`, String(day)))
      .join(translate('admin.pricing.schedule.daySeparator', ', '));
    const start = formatScheduleClock(window.startTime);
    const end = formatScheduleClock(window.endTime);
    const cross = window.endDayOffset === 1
      ? translate('admin.pricing.schedule.crossMidnight', ' (+1 day)')
      : '';
    const windowLabel = window.windowCode.trim()
      ? formatPricingConditionScalar(window.windowCode, translate)
      : '';
    const prefix = windowLabel && windowLabel !== window.windowCode.trim()
      ? `${windowLabel} · `
      : window.windowCode.trim()
        ? `${window.windowCode.trim()} · `
        : '';
    lines.push(`${prefix}${days} ${start}–${end}${cross}`);
  }
  return lines;
}

function formatPricingConditionScalar(
  value: string | number | boolean,
  translate: PricingConditionTranslate,
): string {
  if (typeof value === 'boolean' || typeof value === 'number') {
    return String(value);
  }
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  return translatePricingCode('admin.pricing.condition.value', trimmed, translate);
}

function translatePricingCode(
  prefix: string,
  code: string,
  translate: PricingConditionTranslate,
): string {
  const trimmed = code.trim();
  if (!trimmed) return trimmed;
  const candidates = pricingCodeCandidates(trimmed);
  for (const candidate of candidates) {
    const key = `${prefix}.${candidate}`;
    const translated = translate(key, '');
    if (translated && translated !== key && translated !== '') {
      return translated;
    }
  }
  return trimmed;
}

function pricingCodeCandidates(code: string): string[] {
  const trimmed = code.trim();
  const fromCamel = trimmed.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase().replace(/[-.\s]+/g, '_');
  const lower = trimmed.toLowerCase();
  const underscored = lower.replace(/[-.\s]+/g, '_');
  const collapsed = underscored.replace(/_/g, '');
  return [...new Set([fromCamel, underscored, lower, collapsed, trimmed])];
}

function isTierDimension(code: string): boolean {
  return pricingCodeCandidates(code).some((candidate) =>
    candidate === 'tier_code'
      || candidate === 'service_tier'
      || candidate === 'tier'
      || candidate === 'tiercode',
  );
}

function formatScheduleClock(value: string): string {
  return /^\d{2}:\d{2}(:\d{2})?$/.test(value) ? value.slice(0, 5) : value;
}

function defaultPricingConditionTranslate(key: string, fallback?: string): string {
  return fallback ?? key;
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
    || conditionSortKey(left).localeCompare(conditionSortKey(right))
    || left.operationCode.localeCompare(right.operationCode)
    || left.rateCode.localeCompare(right.rateCode);
}

function conditionSortKey(rate: Pick<AdminOfficialPricingRateItem, 'conditions' | 'rateVariant'>): string {
  const tier = rate.conditions.find((condition) =>
    isTierDimension(condition.dimensionCode) && condition.operatorCode === 'eq',
  );
  if (tier && !Array.isArray(tier.value)) {
    const value = String(tier.value).toLowerCase().replace(/-/g, '_');
    if (value === 'peak') return '10:peak';
    if (value === 'off_peak' || value === 'offpeak') return '20:off_peak';
    if (value === 'priority') return '30:priority';
    if (value === 'premium') return '40:premium';
    return `50:${value}`;
  }
  if (rate.rateVariant === 'time_window') return '80:time_window';
  return rate.conditions.length > 0 ? `90:${rate.conditions.map((condition) => `${condition.dimensionCode}:${condition.operatorCode}`).join('|')}` : '00';
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

const LEGACY_METER_LABEL_KEYS: Record<string, string> = {
  llm_input_token: 'admin.pricing.settings.meter.input',
  llm_output_token: 'admin.pricing.settings.meter.output',
  llm_reasoning_token: 'admin.pricing.settings.meter.reasoning',
  llm_cache_read_token: 'admin.pricing.settings.meter.cacheRead',
  llm_cache_write_token: 'admin.pricing.settings.meter.cacheWrite',
  llm_cache_storage_token_hour: 'admin.pricing.settings.meter.cacheStorage',
};

/** Localized meter title for price cells (never dump English catalog display names when a key exists). */
export function formatPricingMeterLabel(
  meter: Pick<{ meterCode: string; meterDisplayName?: string }, 'meterCode' | 'meterDisplayName'>,
  translate: PricingConditionTranslate = defaultPricingConditionTranslate,
): string {
  const code = meter.meterCode.trim();
  if (!code) return meter.meterDisplayName?.trim() || code;
  const fromCode = translatePricingCode('admin.pricing.settings.meter.code', code, translate);
  if (fromCode !== code) return fromCode;
  const legacyKey = LEGACY_METER_LABEL_KEYS[code.toLowerCase()];
  if (legacyKey) {
    const legacy = translate(legacyKey, '');
    if (legacy && legacy !== legacyKey) return legacy;
  }
  return meter.meterDisplayName?.trim() || code;
}

/** Localized operation subtitle (e.g. inference.generate → 推理生成). */
export function formatPricingOperationLabel(
  operation: Pick<{ operationCode: string; operationDisplayName?: string }, 'operationCode' | 'operationDisplayName'>,
  translate: PricingConditionTranslate = defaultPricingConditionTranslate,
): string {
  const code = operation.operationCode.trim();
  if (code) {
    const fromCode = translatePricingCode('admin.pricing.settings.operation.code', code, translate);
    if (fromCode !== code) return fromCode;
    const composed = composePricingOperationLabel(code, translate);
    if (composed) return composed;
  }
  const display = operation.operationDisplayName?.trim() ?? '';
  if (display) {
    const fromDisplay = translatePricingCode('admin.pricing.settings.operation.code', display, translate);
    if (fromDisplay !== display) return fromDisplay;
    const composedDisplay = composePricingOperationLabel(display.replace(/\s+/g, '.'), translate);
    if (composedDisplay) return composedDisplay;
  }
  return display || code;
}

function composePricingOperationLabel(
  operationCode: string,
  translate: PricingConditionTranslate,
): string | undefined {
  const parts = operationCode
    .trim()
    .toLowerCase()
    .replace(/[-_\s]+/g, '.')
    .split('.')
    .filter(Boolean);
  if (parts.length < 2) return undefined;
  const kindRaw = parts[0]!;
  const verbRaw = parts.slice(1).join('_');
  const kind = translatePricingCode('admin.pricing.settings.operation.kind', kindRaw, translate);
  const verb = translatePricingCode('admin.pricing.settings.operation.verb', verbRaw, translate);
  if (kind === kindRaw && verb === verbRaw) return undefined;
  const kindLabel = kind === kindRaw ? kindRaw : kind;
  const verbLabel = verb === verbRaw ? verbRaw : verb;
  const joiner = translate('admin.pricing.settings.operation.joiner', '');
  return `${kindLabel}${joiner}${verbLabel}`;
}
