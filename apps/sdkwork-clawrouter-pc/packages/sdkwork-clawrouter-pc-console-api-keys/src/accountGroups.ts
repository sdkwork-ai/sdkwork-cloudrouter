import type { GroupPickerOption } from '@sdkwork/clawroutes-pc-commons/components/GroupPicker';
import type { GroupSelectorOption } from '@sdkwork/clawroutes-pc-commons/components/GroupSelector';
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
    };
  });
}
