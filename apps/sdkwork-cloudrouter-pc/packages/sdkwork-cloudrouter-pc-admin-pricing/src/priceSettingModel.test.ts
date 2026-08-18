import { describe, expect, it } from 'vitest';
import {
  buildPriceSettingProductRows,
  formatPricingMoney,
  normalizePricingDecimal,
  pricingRuleMatchesOfficialRate,
  pricingRuleLifecycle,
  pricingScheduleMatchesAt,
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
    expect(pricingRuleMatchesOfficialRate({ ...rule, conditions: [{ dimensionCode: 'tier_code', operatorCode: 'eq', value: 'premium' }] }, cacheReadRate)).toBe(false);
  });

  it('formats tiny decimal-string prices without converting them to numbers', () => {
    expect(formatPricingMoney('0.0000005', 'USD', 'en-US')).toBe('USD 0.0000005');
  });

  it('normalizes editable prices through money utils without losing tiny precision', () => {
    expect(normalizePricingDecimal('1.230000000')).toBe('1.23');
    expect(normalizePricingDecimal('1000.000000')).toBe('1000');
    expect(normalizePricingDecimal('0.000000500000')).toBe('0.0000005');
    expect(normalizePricingDecimal('0.000000000000')).toBe('0');
  });

  it('shows the same fallback states as runtime pricing', () => {
    const now = Date.parse('2026-08-18T00:00:00Z');
    expect(pricingRuleLifecycle(undefined, now)).toBe('missing');
    expect(pricingRuleLifecycle(pricingRule({ status: 'inactive' }), now)).toBe('inactive');
    expect(pricingRuleLifecycle(pricingRule({ effectiveFrom: '2026-08-19T00:00:00Z' }), now)).toBe('scheduled');
    expect(pricingRuleLifecycle(pricingRule({ effectiveTo: '2026-08-17T00:00:00Z' }), now)).toBe('expired');
    expect(pricingRuleLifecycle(pricingRule({}), now)).toBe('active');
  });

  it('treats a sales schedule outside its weekly window as official fallback', () => {
    const mondayMorning = Date.parse('2026-08-17T00:00:00Z');
    const mondayAfternoon = Date.parse('2026-08-17T07:00:00Z');
    const rule = pricingRule({
      schedule: {
        timeZone: 'Asia/Shanghai',
        weeklyWindows: [{ windowCode: 'business', daysOfWeek: [1, 2, 3, 4, 5], startTime: '09:00:00', endTime: '18:00:00', endDayOffset: 0 }],
        includeDates: [],
        excludeDates: [],
      },
    });
    expect(pricingScheduleMatchesAt(rule.schedule!, mondayMorning)).toBe(false);
    expect(pricingScheduleMatchesAt(rule.schedule!, mondayAfternoon)).toBe(true);
    expect(pricingRuleLifecycle(rule, mondayMorning)).toBe('scheduled');
    expect(pricingRuleLifecycle(rule, mondayAfternoon)).toBe('active');
  });

  it('fails closed when equally ranked product rules are ambiguous', () => {
    const product = { groupKey: 'anthropic:claude', rates: [cacheReadRate] } as AdminOfficialPricingProductItem;
    const first = pricingRule({ id: 'rule-a', ruleCode: 'a' });
    const second = pricingRule({ id: 'rule-b', ruleCode: 'b' });
    const result = buildPriceSettingProductRows([product], [first, second], Date.parse('2026-08-18T00:00:00Z'));
    expect(result.rows[0]?.prices[0]?.rule).toBeUndefined();
    expect(result.matchedRuleIds.size).toBe(0);
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
        unitPriceOverride: '0.0000005',
        providerCode: 'openai',
        regionCode: 'global',
      },
    });
    expect(mutations[1]?.id).toBeUndefined();
    expect(mutations[1]?.input?.unitPriceOverride).toBe('0.0000012');
    expect(mutations[1]?.input?.catalogKey).toBe('openai/global/gpt-4o');
  });

  it('deletes a cleared sales rule so runtime falls back to the official price', () => {
    const mutations = buildPriceSettingMutations(baseForm({
      meterPrices: [{
        ...baseForm().meterPrices[0],
        ruleId: 'rule-input',
        customerPrice: '',
      }],
    }), translate);

    expect(mutations).toEqual([{ action: 'delete', id: 'rule-input' }]);
  });

  it('preserves an existing multiplier and markup rule when no direct sales price is entered', () => {
    const mutations = buildPriceSettingMutations(baseForm({
      meterPrices: [{
        ...baseForm().meterPrices[0],
        ruleId: 'formula-rule',
        ruleCode: 'gpt-4o-input-formula',
        customerPrice: '',
        existingFormulaMode: 'multiplier_markup',
        existingMultiplier: '1.2',
        existingMarkupAmount: '0.0001',
      }],
    }), translate);

    expect(mutations[0]).toMatchObject({
      action: 'upsert',
      id: 'formula-rule',
      input: {
        formulaMode: 'multiplier_markup',
        multiplier: '1.2',
        markupAmount: '0.0001',
      },
    });
    expect(mutations[0]?.input).not.toHaveProperty('unitPriceOverride');
  });

  it('preserves conditions on a custom rule edited from the price settings page', () => {
    const conditions = [{ dimensionCode: 'resolution', operatorCode: 'eq' as const, value: '1080p' }];
    const mutations = buildPriceSettingMutations(baseForm({
      meterPrices: [{ ...baseForm().meterPrices[0], ruleId: 'conditional-rule', customerPrice: '0.02', conditions }],
    }), translate);
    expect(mutations[0]?.input?.conditions).toEqual(conditions);
  });

  it('deletes rules for meters removed from the batch editor', () => {
    const mutations = buildPriceSettingMutations(baseForm({
      meterPrices: [],
      removedRuleIds: ['rule-input', 'rule-output'],
    }), translate);

    expect(mutations).toEqual([
      { action: 'delete', id: 'rule-input' },
      { action: 'delete', id: 'rule-output' },
    ]);
  });

  it('builds the vendor/product catalog scope when creating a new setting', () => {
    const mutations = buildPriceSettingMutations(baseForm({ catalogKey: '' }), translate);
    expect(mutations[0]?.input?.catalogKey).toBe('openai/gpt-4o');
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
    expect(() => buildPriceSettingMutations(baseForm({ effectiveFrom: '2026-08-20T00:00:00Z', effectiveTo: '2026-08-19T00:00:00Z' }), translate)).toThrow('admin.pricing.settings.form.datetimeOrderInvalid');
    expect(() => buildPriceSettingMutations(baseForm({ priceMode: 'time_window', includeDates: '2026-02-30' }), translate)).toThrow('admin.pricing.settings.form.dateInvalid');
  });

  it('requires explicit confirmation before normalizing conflicting meter metadata', () => {
    expect(() => buildPriceSettingMutations(baseForm({ metadataConflict: true }), translate)).toThrow(
      'admin.pricing.settings.form.metadataConflictRequired',
    );
    expect(buildPriceSettingMutations(baseForm({ metadataConflict: true, acknowledgeMetadataConflict: true }), translate)).toHaveLength(1);
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
    expect(mutations[0]?.input?.schedule).toMatchObject({
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
    resourceCode: 'gpt-4o',
    resourceDisplayName: 'GPT-4o',
    providerCode: 'openai',
    regionCode: 'global',
    resourceType: 'llm',
    pricingPlanId: 'plan-1',
    removedRuleIds: [],
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
