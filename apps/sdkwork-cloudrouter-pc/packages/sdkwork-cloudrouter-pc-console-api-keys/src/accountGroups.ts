import type { GroupPickerOption } from '@sdkwork/cloudroutes-pc-commons/components/GroupPicker';
import type { GroupSelectorOption } from '@sdkwork/cloudroutes-pc-commons/components/GroupSelector';
import type { AccountGroup } from './apiKeyService';

export function resolveAccountGroupName(groupCode: string, groups: AccountGroup[]): string {
  const normalizedCode = groupCode.trim();
  const group = groups.find((item) => item.code === normalizedCode || item.id === normalizedCode);
  return group?.name?.trim() || normalizedCode;
}

export function resolveAccountGroupCode(
  groupValue: string | null | undefined,
  groups: AccountGroup[],
): string {
  const normalizedValue = groupValue?.trim() ?? '';
  const group = groups.find((item) => item.code === normalizedValue || item.id === normalizedValue);
  return group?.code?.trim() || normalizedValue;
}

export function toAccountGroupSelectorOptions(groups: AccountGroup[]): GroupSelectorOption[] {
  return groups.map((group) => {
    const description = group.description?.trim();
    return {
      value: group.code,
      label: group.name.trim() || group.code,
      ...(description ? { description } : {}),
      rate: group.rate,
    };
  });
}

export function toGroupPickerOptions(groups: AccountGroup[]): GroupPickerOption[] {
  return groups.map((group) => {
    const description = group.description?.trim();
    return {
      value: group.code,
      label: group.name.trim() || group.code,
      ...(description ? { description } : {}),
      rate: group.rate,
      vendorCode: group.vendorCode,
      modalities: group.modalities,
      tags: group.tags,
    };
  });
}

const GROUP_TAG_KEYS = ['stable', 'hot', 'recommended', 'promotion', 'new', 'premium', 'high_value', 'official', 'beta', 'limited'] as const;

/** 标签 code 的可读化回退：`high_value` → `High value` */
function humanizeTagCode(code: string): string {
  const text = code.replace(/[-_]+/g, ' ').trim();
  return text.length === 0 ? code : text[0].toUpperCase() + text.slice(1);
}

/**
 * 构建分组标签显示翻译映射（key 为标签 code）。
 *
 * 词条取自本页自带的 `console.apiKeys.groupTag.*`：本页会在管理端词条未注册的宿主
 * 中单独渲染（控制台 API Key 页、BirdCoder 的嵌入弹窗），跨页面引用
 * `admin.upstream.accountGroup.tag.*` 时 `t` 会把 key 原样返回，界面就会显示原始
 * key。缺失词条一律回退可读化 code，界面上永不出现 i18n key。
 */
export function buildTagLabels(t: (key: string) => string): Record<string, string> {
  return Object.fromEntries(
    GROUP_TAG_KEYS.map((tag) => {
      const key = `console.apiKeys.groupTag.${tag}`;
      const label = t(key);
      return [tag, label === key ? humanizeTagCode(tag) : label];
    }),
  );
}
