import { describe, expect, it } from 'vitest';
import {
  buildPriceSettingProductRows,
  eligibleDefaultRegions,
  formatOfficialRateScheduleLines,
  formatPriceSettingVariantTabLabel,
  formatPricingCondition,
  formatPricingMeterLabel,
  formatPricingMoney,
  formatPricingOperationLabel,
  formatPricingQuantity,
  groupPriceSettingRatesByRegion,
  groupPriceSettingRatesByVariant,
  normalizePricingDecimal,
  officialRateVariantLabel,
  officialRateUnit,
  pickDefaultPriceSettingRegion,
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
    expect(formatPricingMoney('0.180000000000', 'USD', 'zh-CN')).toBe('USD 0.18');
    expect(formatPricingMoney('1.000000000000', 'CNY', 'zh-CN')).toBe('CNY 1');
  });

  it('normalizes editable prices through money utils without losing tiny precision', () => {
    expect(normalizePricingDecimal('1.230000000')).toBe('1.23');
    expect(normalizePricingDecimal('1000.000000')).toBe('1000');
    expect(normalizePricingDecimal('0.000000500000')).toBe('0.0000005');
    expect(normalizePricingDecimal('0.000000000000')).toBe('0');
    expect(normalizePricingDecimal('10')).toBe('10');
  });

  it('strips padded NUMERIC unit sizes in official rate unit labels', () => {
    expect(officialRateUnit({ unitSize: '1.000000000000', unitCode: 'token' })).toBe('token');
    expect(officialRateUnit({ unitSize: '1000000.000000', unitCode: 'token' })).toBe('1000000 token');
    expect(formatPricingQuantity('12.000000')).toBe('12');
    expect(formatPricingQuantity('1M')).toBe('1M');
  });

  it('localizes peak and off-peak tier conditions instead of dumping raw codes', () => {
    const translate = (key: string, fallback?: string) => {
      const catalog: Record<string, string> = {
        'admin.pricing.condition.dimension.tier_code': '档位',
        'admin.pricing.condition.value.peak': '峰时价',
        'admin.pricing.condition.value.off_peak': '谷时价',
        'admin.pricing.condition.variant.time_window': '时段价',
        'admin.pricing.schedule.timezone': '时区：{{timeZone}}',
        'admin.pricing.schedule.daySeparator': '、',
        'admin.pricing.settings.days.1': '周一',
        'admin.pricing.settings.days.2': '周二',
        'admin.pricing.settings.days.3': '周三',
        'admin.pricing.settings.days.4': '周四',
        'admin.pricing.settings.days.5': '周五',
        'admin.pricing.settings.tabs.variant.peak': '峰时',
        'admin.pricing.settings.tabs.variant.off_peak': '谷时',
        'admin.pricing.settings.tabs.variant.standard': '标准',
        'admin.pricing.settings.tabs.variant.time_window': '时段',
        'admin.pricing.settings.tabs.variant.unknown': '其他（{{code}}）',
      };
      return catalog[key] ?? fallback ?? key;
    };
    expect(formatPricingCondition({ dimensionCode: 'tier_code', operatorCode: 'eq', value: 'peak' }, translate)).toBe('档位: 峰时价');
    expect(formatPricingCondition({ dimensionCode: 'tierCode', operatorCode: 'eq', value: 'off-peak' }, translate)).toBe('档位: 谷时价');
    expect(officialRateVariantLabel({
      conditions: [{ dimensionCode: 'tier_code', operatorCode: 'eq', value: 'off_peak' }],
    }, translate)).toBe('谷时价');
    expect(formatOfficialRateScheduleLines({
      timeZone: 'Asia/Shanghai',
      weeklyWindows: [{ windowCode: 'peak', daysOfWeek: [1, 2, 3, 4, 5], startTime: '09:00:00', endTime: '18:00:00', endDayOffset: 0 }],
      includeDates: [],
      excludeDates: [],
    }, translate)).toEqual([
      '时区：Asia/Shanghai',
      '峰时价 · 周一、周二、周三、周四、周五 09:00–18:00',
    ]);
  });

  it('localizes meter and operation labels instead of English catalog display names', () => {
    const translate = (key: string, fallback?: string) => {
      const catalog: Record<string, string> = {
        'admin.pricing.settings.meter.code.llm_input_token': '输入',
        'admin.pricing.settings.meter.code.image_result': '图片结果',
        'admin.pricing.settings.operation.code.inference_generate': '推理生成',
        'admin.pricing.settings.operation.kind.image': '图片',
        'admin.pricing.settings.operation.verb.generate': '生成',
        'admin.pricing.settings.operation.joiner': '',
        'admin.pricing.settings.unit.token': 'Token',
      };
      return catalog[key] ?? fallback ?? key;
    };
    expect(formatPricingMeterLabel({
      meterCode: 'llm_input_token',
      meterDisplayName: 'LLM input tokens',
    }, translate)).toBe('输入');
    expect(formatPricingMeterLabel({
      meterCode: 'image_result',
      meterDisplayName: 'Image results',
    }, translate)).toBe('图片结果');
    expect(formatPricingOperationLabel({
      operationCode: 'inference.generate',
      operationDisplayName: 'inference generate',
    }, translate)).toBe('推理生成');
    expect(formatPricingOperationLabel({
      operationCode: 'image.generate',
      operationDisplayName: 'image generate',
    }, translate)).toBe('图片生成');
    expect(officialRateUnit({ unitSize: '1000000', unitCode: 'token' }, translate)).toBe('1000000 Token');
  });

  it('localizes every variant tab label and groups peak/valley aliases together', () => {
    const translate = (key: string, fallback?: string) => {
      const catalog: Record<string, string> = {
        'admin.pricing.settings.tabs.variant.peak': '峰时',
        'admin.pricing.settings.tabs.variant.off_peak': '谷时',
        'admin.pricing.settings.tabs.variant.priority': '优先',
        'admin.pricing.settings.tabs.variant.premium': '高级',
        'admin.pricing.settings.tabs.variant.standard': '标准',
        'admin.pricing.settings.tabs.variant.time_window': '时段',
        'admin.pricing.settings.tabs.variant.unknown': '其他（{{code}}）',
      };
      return catalog[key] ?? fallback ?? key;
    };
    expect(formatPriceSettingVariantTabLabel('peak', translate)).toBe('峰时');
    expect(formatPriceSettingVariantTabLabel('off-peak', translate)).toBe('谷时');
    expect(formatPriceSettingVariantTabLabel('valley', translate)).toBe('谷时');
    expect(formatPriceSettingVariantTabLabel('standard', translate)).toBe('标准');
    expect(formatPriceSettingVariantTabLabel('time_window', translate)).toBe('时段');
    expect(formatPriceSettingVariantTabLabel('custom-tier', translate)).toBe('其他（custom-tier）');

    const peak = {
      ...officialRate('llm_input_token', 'input-peak'),
      conditions: [{ dimensionCode: 'tier_code', operatorCode: 'eq' as const, value: 'peak' }],
    };
    const valley = {
      ...officialRate('llm_input_token', 'input-valley'),
      conditions: [{ dimensionCode: 'tier_code', operatorCode: 'eq' as const, value: 'valley' }],
    };
    const groups = groupPriceSettingRatesByVariant([
      { official: valley, rule: undefined },
      { official: peak, rule: undefined },
    ]);
    expect(groups.map((group) => group.key)).toEqual(['peak', 'off_peak']);
    expect(groups.map((group) => formatPriceSettingVariantTabLabel(group.key, translate))).toEqual(['峰时', '谷时']);
  });

  it('keeps peak and off-peak variants of the same meter as distinct ordered prices', () => {
    const peak = {
      ...officialRate('llm_input_token', 'input-peak'),
      unitPrice: '0.003',
      conditions: [{ dimensionCode: 'tier_code', operatorCode: 'eq' as const, value: 'peak' }],
    };
    const offPeak = {
      ...officialRate('llm_input_token', 'input-off-peak'),
      unitPrice: '0.001',
      conditions: [{ dimensionCode: 'tier_code', operatorCode: 'eq' as const, value: 'off_peak' }],
    };
    const product = {
      groupKey: 'openai:gpt',
      rates: [offPeak, peak, outputRate],
    } as AdminOfficialPricingProductItem;
    const result = buildPriceSettingProductRows([product], []);
    expect(result.rows[0]?.prices.map(({ official }) => official.rateCode)).toEqual([
      'input-peak',
      'input-off-peak',
      'output',
    ]);
  });

  it('groups one resource row across regions into region tabs', () => {
    const cnInput = { ...officialRate('llm_input_token', 'cn-input'), regionCode: 'cn', currencyCode: 'CNY', unitPrice: '12' };
    const globalInput = { ...officialRate('llm_input_token', 'global-input'), regionCode: 'global', currencyCode: 'USD', unitPrice: '2.5' };
    const groups = groupPriceSettingRatesByRegion([
      { official: cnInput, rule: undefined },
      { official: globalInput, rule: undefined },
    ]);
    expect(groups.map((group) => group.regionCode)).toEqual(['global', 'cn']);
    expect(groups.find((group) => group.regionCode === 'cn')?.currencyCode).toBe('CNY');
    expect(groups.find((group) => group.regionCode === 'global')?.prices).toHaveLength(1);
  });

  it('offers only non-global regions as default billing region candidates', () => {
    const cnInput = { ...officialRate('llm_input_token', 'cn-input'), regionCode: 'cn', currencyCode: 'CNY' };
    const globalInput = { ...officialRate('llm_input_token', 'global-input'), regionCode: 'global', currencyCode: 'USD' };
    const usInput = { ...officialRate('llm_input_token', 'us-input'), regionCode: 'us-east', currencyCode: 'USD' };
    const groups = groupPriceSettingRatesByRegion([
      { official: globalInput, rule: undefined },
      { official: cnInput, rule: undefined },
      { official: usInput, rule: undefined },
    ]);
    // `global` stays a region tab but can never be the default: the billing
    // engine discards a global default, so offering it would save a no-op.
    expect(eligibleDefaultRegions(groups).map((group) => group.regionCode)).toEqual(['cn', 'us-east']);
  });

  it('reports no default region candidates for a global-only model', () => {
    const globalInput = { ...officialRate('llm_input_token', 'global-input'), regionCode: 'global', currencyCode: 'USD' };
    const groups = groupPriceSettingRatesByRegion([{ official: globalInput, rule: undefined }]);
    expect(eligibleDefaultRegions(groups)).toHaveLength(0);
  });

  it('ignores a legacy global default when picking the active tab', () => {
    const cnInput = { ...officialRate('llm_input_token', 'cn-input'), regionCode: 'cn', currencyCode: 'CNY' };
    const globalInput = { ...officialRate('llm_input_token', 'global-input'), regionCode: 'global', currencyCode: 'USD' };
    const groups = groupPriceSettingRatesByRegion([
      { official: globalInput, rule: undefined },
      { official: cnInput, rule: undefined },
    ]);
    expect(pickDefaultPriceSettingRegion(groups, 'global', 'cn')).toBe('cn');
  });

  it('prefers the configured default billing region when picking the active tab', () => {
    const cnInput = { ...officialRate('llm_input_token', 'cn-input'), regionCode: 'cn', currencyCode: 'CNY' };
    const globalInput = { ...officialRate('llm_input_token', 'global-input'), regionCode: 'global', currencyCode: 'USD' };
    const groups = groupPriceSettingRatesByRegion([
      { official: cnInput, rule: undefined },
      { official: globalInput, rule: undefined },
    ]);
    expect(pickDefaultPriceSettingRegion(groups, 'cn')).toBe('cn');
    expect(pickDefaultPriceSettingRegion(groups, undefined, 'global')).toBe('global');
    expect(pickDefaultPriceSettingRegion(groups, undefined, undefined)).toBe('global');
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
