import { formatMoney } from '@sdkwork/clawroutes-pc-commons/sdkwork-utils';
import type { Model, ModelPricing } from './data/models';

export function formatModelPrice(pricing: ModelPricing, field: 'input' | 'output' | 'cachedInput'): string {
  if (isModelPricingFieldUnavailable(pricing, field)) {
    return '-';
  }
  const value = pricing[field];
  if (value === undefined) {
    return '-';
  }
  const fractionDigits = value < 0.1 ? 3 : 2;
  const formatted = formatMoney(value, {
    currency: pricing.currency,
    locale: 'en-US',
    mode: 'symbol',
    minFractionDigits: fractionDigits,
    maxFractionDigits: fractionDigits,
  });
  if (formatted !== null) {
    return formatted;
  }
  return `${pricing.currency.trim().toUpperCase()} ${value.toFixed(fractionDigits)}`;
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
