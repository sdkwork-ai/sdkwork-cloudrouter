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

/** 构建分组标签显示翻译映射（key 为标签 code） */
export function buildTagLabels(t: (key: string) => string): Record<string, string> {
  return Object.fromEntries(GROUP_TAG_KEYS.map((tag) => [tag, t(`admin.upstream.accountGroup.tag.${tag}`)]));
}
