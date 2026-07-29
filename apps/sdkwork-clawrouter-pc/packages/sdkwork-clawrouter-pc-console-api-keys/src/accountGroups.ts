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

export function formatAccountGroupOptionLabel(group: AccountGroup): string {
  const name = group.name.trim() || group.code;
  return group.rate ? `${name} (${group.rate})` : name;
}
