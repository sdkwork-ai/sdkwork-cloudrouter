import { describe, expect, it } from 'vitest';
import {
  buildPriceSettingProductRows,
  formatPricingMoney,
  normalizePricingDecimal,
  pricingRuleMatchesOfficialRate,
} from './priceSettingModel';
import {
  buildPriceSettingMutations,
  type PriceSettingFormState,
} from './priceSettingsPage';
import type {
  AdminOfficialPricingProductItem,
  AdminOfficialPricingRateItem,
  AdminPricingRuleItem,
} from './pricingService';

const translate = ((key: string) => key) as Parameters<typeof buildPriceSettingMutations>[1];

const inputRate = officialRate('llm_input_token', 'input');
const outputRate = officialRate('llm_output_token', 'output');
const cacheReadRate = officialRate('llm_cache_read_token', 'cache-read');

describe('price setting model', () => {
  it('keeps every official meter in one product row and orders core model prices', () => {
    const product = {
      groupKey: 'anthropic:claude',
      rates: [cacheReadRate, outputRate, inputRate],
    } as AdminOfficialPricingProductItem;
    const result = buildPriceSettingProductRows([product], []);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.prices.map(({ official }) => official.meterCode)).toEqual([
      'llm_input_token',
      'llm_output_token',
      'llm_cache_read_token',
    ]);
  });

  it('matches customer rules to the exact meter and regional scope', () => {
    const rule = pricingRule({ meterCode: 'llm_cache_read_token', regionCode: 'global' });
    expect(pricingRuleMatchesOfficialRate(rule, cacheReadRate)).toBe(true);
    expect(pricingRuleMatchesOfficialRate(rule, outputRate)).toBe(false);
    expect(pricingRuleMatchesOfficialRate({ ...rule, regionCode: 'cn' }, cacheReadRate)).toBe(false);
  });

  it('formats tiny decimal-string prices without converting them to numbers', () => {
    expect(formatPricingMoney('0.0000005', 'USD', 'en-US')).toBe('USD 0.0000005');
  });

  it('normalizes editable prices through money utils without losing tiny precision', () => {
    expect(normalizePricingDecimal('1.230000000')).toBe('1.23');
    expect(normalizePricingDecimal('0.000000500000')).toBe('0.0000005');
    expect(normalizePricingDecimal('0.000000000000')).toBe('0');
  });

  it('creates one mutation per meter while preserving decimal strings and existing ids', () => {
    const form = baseForm({
      productCode: 'gpt-4o',
      providerCode: 'openai',
      regionCode: 'global',
      meterPrices: [
        {
          key: 'input',
          ruleId: 'rule-input',
          ruleCode: 'gpt-4o-input',
          meterCode: 'llm_input_token',
          operationCode: 'chat.completions',
          unitCode: 'token',
          unitSize: '1M',
          customerPrice: '0.000000500000',
        },
        {
          key: 'output',
          meterCode: 'llm_output_token',
          operationCode: 'chat.completions',
          unitCode: 'token',
          unitSize: '1M',
          customerPrice: '0.0000012',
        },
      ],
    });

    const mutations = buildPriceSettingMutations(form, translate);

    expect(mutations).toHaveLength(2);
    expect(mutations[0]).toMatchObject({
      id: 'rule-input',
      input: {
        ruleCode: 'gpt-4o-input',
        meterCode: 'llm_input_token',
        unitPriceOverride: '0.000000500000',
        providerCode: 'openai',
        regionCode: 'global',
      },
    });
    expect(mutations[1]?.id).toBeUndefined();
    expect(mutations[1]?.input.unitPriceOverride).toBe('0.0000012');
    expect(mutations[1]?.input.catalogKey).toBe('openai/global/gpt-4o');
  });

  it('builds the vendor/product catalog scope when creating a new setting', () => {
    const mutations = buildPriceSettingMutations(baseForm({ catalogKey: '' }), translate);
    expect(mutations[0]?.input.catalogKey).toBe('openai/gpt-4o');
  });

  it('rejects incomplete batch settings before any request is sent', () => {
    expect(() => buildPriceSettingMutations(baseForm({ meterPrices: [] }), translate)).toThrow(
      'admin.pricing.settings.form.metersRequired',
    );
    expect(() => buildPriceSettingMutations(baseForm({
      meterPrices: [{ ...baseForm().meterPrices[0], meterCode: '', operationCode: '', customerPrice: '0.01' }],
    }), translate)).toThrow('admin.pricing.settings.form.meterRequired');
    expect(() => buildPriceSettingMutations(baseForm({
      meterPrices: [{ ...baseForm().meterPrices[0], customerPrice: '1e-6' }],
    }), translate)).toThrow('admin.pricing.settings.form.unitPriceRequired');
  });

  it('normalizes valid time-window schedules once for every meter', () => {
    const form = baseForm({
      priceMode: 'time_window',
      timeZone: 'Asia/Shanghai',
      weeklyWindows: [{
        windowCode: 'business-hours',
        daysOfWeek: [5, 1, 1],
        startTime: '09:00',
        endTime: '18:00',
        endDayOffset: 0,
      }],
    });

    const mutations = buildPriceSettingMutations(form, translate);

    expect(mutations).toHaveLength(1);
    expect(mutations[0]?.input.schedule).toMatchObject({
      timeZone: 'Asia/Shanghai',
      weeklyWindows: [{ daysOfWeek: [1, 5], startTime: '09:00:00', endTime: '18:00:00' }],
    });
  });
});

function baseForm(overrides: Partial<PriceSettingFormState> = {}): PriceSettingFormState {
  return {
    catalogKey: 'openai/global/gpt-4o',
    vendorCode: 'openai',
    productCode: 'gpt-4o',
    providerCode: 'openai',
    regionCode: 'global',
    resourceType: 'llm',
    pricingPlanId: 'plan-1',
    meterPrices: [{
      key: 'input',
      meterCode: 'llm_input_token',
      operationCode: 'chat.completions',
      unitCode: 'token',
      unitSize: '1M',
      customerPrice: '0.01',
    }],
    priceMode: 'standard',
    timeZone: 'Asia/Shanghai',
    weeklyWindows: [{ windowCode: 'business-hours', daysOfWeek: [1, 2, 3, 4, 5], startTime: '09:00', endTime: '12:00', endDayOffset: 0 }],
    includeDates: '',
    excludeDates: '',
    priority: '100',
    effectiveFrom: '',
    effectiveTo: '',
    status: 'active',
    ...overrides,
  };
}

function officialRate(meterCode: string, rateCode: string): AdminOfficialPricingRateItem {
  return {
    rateCode,
    meterCode,
    productCode: 'claude-sonnet-5',
    operationCode: 'messages',
    providerCode: 'anthropic',
    regionCode: 'global',
    catalogKey: 'anthropic/global/claude-sonnet-5',
    conditions: [],
  } as unknown as AdminOfficialPricingRateItem;
}

function pricingRule(overrides: Partial<AdminPricingRuleItem>): AdminPricingRuleItem {
  return {
    id: 'rule-1',
    pricingPlanId: 'plan-1',
    ruleCode: 'claude-cache-read',
    productCode: 'claude-sonnet-5',
    formulaMode: 'unit_price_override',
    multiplier: '1',
    markupAmount: '0',
    conditions: [],
    priority: 100,
    status: 'active',
    ...overrides,
  };
}
