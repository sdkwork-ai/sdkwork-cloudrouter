/**
 * Regression guard: pricing admin zh/en catalogs stay in parity,
 * and user-facing code paths keep localization helpers wired.
 */
import { describe, expect, it } from 'vitest';
import { pricingAdminEnUsMessages } from './i18n/en-US/cloudrouter/pricing/pricing';
import { pricingAdminZhCnMessages } from './i18n/zh-CN/cloudrouter/pricing/pricing';
import {
  formatPricingMeterLabel,
  formatPricingOperationLabel,
  formatPricingUnitLabel,
  formatPriceSettingVariantTabLabel,
  officialRateUnit,
} from './priceSettingModel';
import * as priceSettingsPageModule from './priceSettingsPage';

const enMessages = pricingAdminEnUsMessages as Record<string, string>;
const zhMessages = pricingAdminZhCnMessages as Record<string, string>;

function catalogKeys(messages: Record<string, string>): string[] {
  return Object.keys(messages).sort();
}

describe('pricing admin i18n completeness', () => {
  it('keeps zh-CN and en-US catalogs in exact key parity', () => {
    const enKeys = catalogKeys(enMessages);
    const zhKeys = catalogKeys(zhMessages);
    expect(zhKeys).toEqual(enKeys);
    expect(enKeys.length).toBeGreaterThan(200);
  });

  it('covers resource tabs, variant tabs, meters, operations, and units', () => {
    const required = [
      'admin.pricing.settings.resource.llm',
      'admin.pricing.settings.tabs.variant.peak',
      'admin.pricing.settings.tabs.variant.off_peak',
      'admin.pricing.settings.meter.code.llm_input_token',
      'admin.pricing.settings.operation.code.inference_generate',
      'admin.pricing.settings.operation.kind.inference',
      'admin.pricing.settings.operation.verb.generate',
      'admin.pricing.settings.unit.token',
      'admin.pricing.chargeMode.postpaid',
      'admin.pricing.settlementMode.synchronous',
      'admin.pricing.common.loading',
      'admin.pricing.common.filter.all',
      'admin.pricing.common.pagination.page',
      'admin.pricing.settings.form.customerPrice',
      'admin.pricing.plans.form.chargeMode',
      'admin.pricing.rules.form.conditions',
    ] as const;
    for (const key of required) {
      expect(enMessages[key], `missing en ${key}`).toBeTruthy();
      expect(zhMessages[key], `missing zh ${key}`).toBeTruthy();
    }
    expect(zhMessages['admin.pricing.settings.operation.code.inference_generate']).toBe('推理生成');
    expect(zhMessages['admin.pricing.chargeMode.postpaid']).toBe('后付费');
    expect(zhMessages['admin.pricing.common.loading']).toBe('加载中…');
  });

  it('localizes zh meter/operation/unit labels end-to-end', () => {
    const translate = (key: string, fallback?: string) => zhMessages[key] ?? fallback ?? key;
    expect(formatPricingMeterLabel({
      meterCode: 'llm_input_token',
      meterDisplayName: 'LLM input tokens',
    }, translate)).toBe('输入');
    expect(formatPricingOperationLabel({
      operationCode: 'inference.generate',
      operationDisplayName: 'inference generate',
    }, translate)).toBe('推理生成');
    expect(formatPricingUnitLabel('token', translate)).toBe('Token');
    expect(officialRateUnit({ unitSize: '1000000', unitCode: 'token' }, translate)).toBe('1000000 Token');
    expect(formatPriceSettingVariantTabLabel('peak', translate)).toBe('峰时');
    expect(formatPriceSettingVariantTabLabel('off_peak', translate)).toBe('谷时');
  });

  it('exports price settings page entry for localization wiring', () => {
    expect(typeof priceSettingsPageModule.PriceSettingsAdmin).toBe('function');
    expect(priceSettingsPageModule.PRICE_SETTING_RESOURCE_TYPES).toContain('llm');
  });
});
