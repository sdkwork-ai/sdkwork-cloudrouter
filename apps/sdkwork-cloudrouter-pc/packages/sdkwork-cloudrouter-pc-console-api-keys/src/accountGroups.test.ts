// 分组标签显示名契约：词条缺失时回退可读化 code，界面永不出现 i18n key
// 运行：pnpm --dir packages/sdkwork-cloudrouter-pc-console-api-keys exec vitest run src/accountGroups.test.ts
import { describe, expect, it } from 'vitest';
import { buildTagLabels } from './accountGroups';

/** `t` 替身：未命中的 key 原样返回，与 i18next 在词条缺失时的行为一致 */
function translateWith(dictionary: Record<string, string>) {
  return (key: string) => dictionary[key] ?? key;
}

describe('buildTagLabels', () => {
  it('已注册的标签词条直接用作显示名', () => {
    const labels = buildTagLabels(
      translateWith({ 'console.apiKeys.groupTag.stable': '稳定', 'console.apiKeys.groupTag.hot': '热门' }),
    );

    expect(labels.stable).toBe('稳定');
    expect(labels.hot).toBe('热门');
  });

  it('词条缺失时回退可读化 code，而不是渲染 i18n key', () => {
    const labels = buildTagLabels(translateWith({}));

    expect(labels.stable).toBe('Stable');
    expect(labels.high_value).toBe('High value');
    expect(Object.values(labels).some((label) => label.startsWith('console.apiKeys.'))).toBe(false);
  });
});
