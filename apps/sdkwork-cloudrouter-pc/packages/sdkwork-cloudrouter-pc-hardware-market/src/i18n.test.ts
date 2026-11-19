import { describe, expect, it } from 'vitest';

import { hardwareMarketMessages } from './i18n/index.ts';

const PLACEHOLDER_PATTERN = /\{\{(\w+)\}\}/gu;

function placeholdersOf(value: string): string[] {
  return [...value.matchAll(PLACEHOLDER_PATTERN)].map((match) => match[1] ?? '').sort();
}

describe('Smart Hardware Market i18n bundle', () => {
  it('ships the same key set in English and Simplified Chinese', () => {
    expect(Object.keys(hardwareMarketMessages.zh).sort()).toEqual(
      Object.keys(hardwareMarketMessages.en).sort(),
    );
  });

  it('namespaces every key under the hardware market surface', () => {
    for (const key of Object.keys(hardwareMarketMessages.en)) {
      expect(key.startsWith('hardwareMarket.')).toBe(true);
    }
  });

  it('keeps every interpolation placeholder in both locales', () => {
    for (const [key, english] of Object.entries(hardwareMarketMessages.en)) {
      const chinese = hardwareMarketMessages.zh[key] ?? '';
      expect(placeholdersOf(chinese)).toEqual(placeholdersOf(english));
    }
  });

  it('carries the market and header entry labels in both locales', () => {
    expect(hardwareMarketMessages.en['hardwareMarket.hero.title']).toBe('Smart Hardware Market');
    expect(hardwareMarketMessages.zh['hardwareMarket.hero.title']).toBe('智能硬件市场');
  });
});
