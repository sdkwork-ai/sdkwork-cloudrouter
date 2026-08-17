import { formatMoney } from '@sdkwork/cloudroutes-pc-commons/sdkwork-utils';
import type {
  AdminOfficialPricingProductItem,
  AdminOfficialPricingRateItem,
  AdminPricingRuleItem,
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

export function buildPriceSettingProductRows(
  products: readonly AdminOfficialPricingProductItem[],
  rules: readonly AdminPricingRuleItem[],
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
          .sort((left, right) => ruleSpecificity(right) - ruleSpecificity(left) || left.priority - right.priority);
        for (const match of matches) matchedRuleIds.add(match.id);
        return { official, rule: matches[0] };
      }),
  }));
  return { rows, matchedRuleIds };
}

export function pricingRuleMatchesOfficialRate(
  rule: AdminPricingRuleItem,
  official: AdminOfficialPricingRateItem,
): boolean {
  if (!rule.productCode && !rule.catalogKey) return false;
  return dimensionMatches(rule.productCode, official.productCode)
    && dimensionMatches(rule.operationCode, official.operationCode)
    && dimensionMatches(rule.meterCode, official.meterCode)
    && dimensionMatches(rule.providerCode, official.providerCode)
    && dimensionMatches(rule.regionCode, official.regionCode)
    && dimensionMatches(rule.catalogKey, official.catalogKey ?? undefined);
}

export function formatPricingMoney(value: string | undefined, currency: string, locale: string): string {
  if (!value) return '—';
  return formatMoney(value, {
    currency: currency.trim().toUpperCase(),
    locale,
    mode: 'code',
    minFractionDigits: 0,
    maxFractionDigits: 18,
  }) ?? '—';
}

export function normalizePricingDecimal(value: string | undefined): string {
  if (!value) return '';
  return formatMoney(value, {
    currency: 'USD',
    locale: 'en-US',
    mode: 'decimal',
    minFractionDigits: 0,
    maxFractionDigits: 18,
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
