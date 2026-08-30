import { formatMoney } from '@sdkwork/cloudroutes-pc-commons/sdkwork-utils';
import type { Model, ModelPricing } from './data/models';

export function formatModelPrice(pricing: ModelPricing, field: 'input' | 'output' | 'cachedInput'): string {
  if (isModelPricingFieldUnavailable(pricing, field)) {
    return '-';
  }
  const value = pricing[field];
  if (value === undefined) {
    return '-';
  }
  return formatModelPriceValue(value, pricing.currency);
}

/**
 * 模型价格的统一小数位。所有价格（标准价、销售价、各区域）固定为同一位数，
 * 保证卡片内每一项的尾部 0 完全对齐；3 位也能保留 `0.150 × 1.5 = 0.225` 这类销售价精度。
 */
const MODEL_PRICE_FRACTION_DIGITS = 3;

/**
 * 格式化单个价格数值（可选应用销售倍率）。
 * 小数位固定为 MODEL_PRICE_FRACTION_DIGITS，不随数值大小或是否应用倍率改变。
 */
export function formatModelPriceValue(
  value: number,
  currency: string,
  options?: { saleMultiplier?: number },
): string {
  const scaled =
    options?.saleMultiplier !== undefined && Number.isFinite(options.saleMultiplier) && options.saleMultiplier >= 0
      ? value * options.saleMultiplier
      : value;
  const formatted = formatMoney(scaled, {
    currency,
    locale: 'en-US',
    mode: 'symbol',
    minFractionDigits: MODEL_PRICE_FRACTION_DIGITS,
    maxFractionDigits: MODEL_PRICE_FRACTION_DIGITS,
  });
  if (formatted !== null) {
    return formatted;
  }
  return `${currency.trim().toUpperCase()} ${scaled.toFixed(MODEL_PRICE_FRACTION_DIGITS)}`;
}

/** 解析销售倍率字符串（如 "1.5"）。非数字或负数返回 null。 */
export function parseSaleMultiplier(value: string | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  const normalized = value.trim();
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) {
    return null;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function modelPricingUnitLabel(model: Model): string {
  if (model.pricing.status === 'unavailable') {
    return model.pricing.reason || 'Price unavailable';
  }
  return `per ${model.pricing.unit}`;
}

export function modelPricingBadgeLabel(model: Model): string {
  if (model.pricing.status === 'customer') {
    return `customer / ${model.pricing.unit}`;
  }
  if (model.pricing.status === 'unavailable') {
    return 'unavailable';
  }
  return `reference / ${model.pricing.unit}`;
}

export function modelPricingFieldUnitLabel(
  model: Model,
  field: 'input' | 'output' | 'cachedInput',
): string {
  if (model.pricing.status === 'unavailable') {
    return model.pricing.reason || 'Price unavailable';
  }
  if (isModelPricingFieldUnavailable(model.pricing, field)) {
    return 'Price is unavailable for the selected billing meter.';
  }
  return `per ${model.pricing.unit}`;
}

export function isModelPricingFieldUnavailable(
  pricing: ModelPricing,
  field: 'input' | 'output' | 'cachedInput',
): boolean {
  if (pricing.status === 'unavailable') {
    return true;
  }
  if (pricing.unavailableFields?.includes(field)) {
    return true;
  }
  return pricing[field] === undefined;
}
