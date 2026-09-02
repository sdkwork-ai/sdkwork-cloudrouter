/**
 * Regression guard: pricing admin zh/en catalogs stay in parity,
 * and user-facing code paths keep localization helpers wired.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
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

/** Source files of this package, excluding tests and the i18n catalogs. */
function listSourceFiles(dir: string, files: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      if (name === 'i18n') continue;
      listSourceFiles(path, files);
    } else if (/\.(tsx|ts)$/.test(name) && !/\.test\.tsx?$/.test(name)) {
      files.push(path);
    }
  }
  return files;
}

/** Every static `admin.pricing.*` literal referenced by source code, with the
 * files that reference it. Dynamic template keys (containing ${...) are
 * skipped: their value space is covered by the required-key assertions. */
function usedPricingLiterals(): Map<string, string[]> {
  const srcDir = dirname(fileURLToPath(import.meta.url));
  const literals = new Map<string, string[]>();
  const patterns = [/'(admin\.pricing[^']*)'/g, /"(admin\.pricing[^"]*)"/g, /`(admin\.pricing[^`]*)`/g];
  for (const file of listSourceFiles(srcDir)) {
    const relative = file.slice(srcDir.length + 1).replace(/\\/g, '/');
    const source = readFileSync(file, 'utf8');
    for (const pattern of patterns) {
      for (const match of source.matchAll(pattern)) {
        const key = match[1]!;
        if (key.includes('${')) continue;
        if (!literals.has(key)) literals.set(key, []);
        literals.get(key)!.push(relative);
      }
    }
  }
  return literals;
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
      // Region-grouped price editor (drawer refactor)
      'admin.pricing.settings.actions.editPrice',
      'admin.pricing.settings.form.regionGroupTitle',
      'admin.pricing.settings.form.regionGroupHint',
      'admin.pricing.settings.form.addRegion',
      'admin.pricing.settings.form.noRegionCandidates',
      'admin.pricing.settings.form.regionNotConfigured',
      'admin.pricing.settings.form.regionPolicyHint',
      'admin.pricing.settings.form.regionEmptyMeters',
      'admin.pricing.settings.form.regionRequired',
      'admin.pricing.settings.form.removeRegion',
      'admin.pricing.settings.form.removeRegionConfirm',
      'admin.pricing.settings.form.metadataConflictAcknowledge',
      // Default billing region picker + lifecycle fallbacks
      'admin.pricing.settings.defaultRegion.noRegionsHint',
      'admin.pricing.settings.table.fallback.active',
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

  it('resolves every admin.pricing literal in source to both catalogs', () => {
    // A literal used by code is either a catalog key itself or the prefix of a
    // dynamic key family (e.g. 'admin.pricing.settings.unit' →
    // 'admin.pricing.settings.unit.token'). Anything else renders a raw key
    // (or a hardcoded fallback) to the user — a localization gap.
    const literals = usedPricingLiterals();
    expect(literals.size).toBeGreaterThan(200);
    const zhKeys = Object.keys(zhMessages);
    const unresolved: string[] = [];
    for (const [key, locations] of literals) {
      const isKey = key in zhMessages && key in enMessages;
      const isPrefix = zhKeys.some((dictKey) => dictKey.startsWith(`${key}.`));
      if (!isKey && !isPrefix) unresolved.push(`${key}  @ ${locations.slice(0, 2).join(', ')}`);
    }
    expect(unresolved).toEqual([]);
  });

  it('keeps the en-US catalog free of hardcoded CJK strings', () => {
    const leaked = Object.entries(enMessages).filter(([, value]) => /[\u4e00-\u9fff]/.test(value));
    expect(leaked).toEqual([]);
  });

  it('exports price settings page entry for localization wiring', () => {
    expect(typeof priceSettingsPageModule.PriceSettingsAdmin).toBe('function');
    expect(priceSettingsPageModule.PRICE_SETTING_RESOURCE_TYPES).toContain('llm');
  });
});
