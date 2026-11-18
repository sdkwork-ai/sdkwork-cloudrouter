import { describe, expect, it } from 'vitest';

import { productCenterAdminMessages } from './i18n/index.ts';

const CJK_PATTERN = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;

describe('Product Center i18n bundle', () => {
  it('keeps en/zh key parity', () => {
    const enKeys = Object.keys(productCenterAdminMessages.en).sort();
    const zhKeys = Object.keys(productCenterAdminMessages.zh).sort();
    expect(zhKeys).toEqual(enKeys);
  });

  it('never ships Chinese copy in the English catalog', () => {
    for (const [key, value] of Object.entries(productCenterAdminMessages.en)) {
      expect(CJK_PATTERN.test(value), `CJK copy in en key ${key}: ${value}`).toBe(false);
    }
  });

  it('has no blank message', () => {
    for (const locale of ['en', 'zh'] as const) {
      for (const [key, value] of Object.entries(productCenterAdminMessages[locale])) {
        expect(value.trim().length, `blank ${locale} message for ${key}`).toBeGreaterThan(0);
      }
    }
  });

  it('namespaces every key under the admin product-center surface', () => {
    for (const key of Object.keys(productCenterAdminMessages.en)) {
      expect(
        key.startsWith('admin.productCenter.')
        || key.startsWith('admin.menu.productCenter.')
        || key === 'admin.header.productCenter',
        `unexpected key namespace: ${key}`,
      ).toBe(true);
    }
  });
});
