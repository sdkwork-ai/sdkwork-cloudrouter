import { describe, expect, test } from 'vitest';

import { vmInstancesConsoleMessages } from './i18n/index.ts';

function placeholders(message: string): string[] {
  return [...message.matchAll(/\{\{(\w+)\}\}/gu)].map((match) => match[1]).sort();
}

describe('vm instances console catalog', () => {
  test('english and simplified chinese carry the same keys', () => {
    const en = Object.keys(vmInstancesConsoleMessages.en).sort();
    const zh = Object.keys(vmInstancesConsoleMessages.zh).sort();
    expect(zh).toEqual(en);
  });

  test('every translated message keeps its interpolation placeholders', () => {
    for (const [key, english] of Object.entries(vmInstancesConsoleMessages.en)) {
      const chinese = vmInstancesConsoleMessages.zh[key];
      expect(chinese, key).toBeTruthy();
      expect(placeholders(chinese), key).toEqual(placeholders(english));
    }
  });

  test('no message ships empty', () => {
    for (const locale of ['en', 'zh'] as const) {
      for (const [key, message] of Object.entries(vmInstancesConsoleMessages[locale])) {
        expect(message.trim(), `${locale}:${key}`).not.toBe('');
      }
    }
  });
});
