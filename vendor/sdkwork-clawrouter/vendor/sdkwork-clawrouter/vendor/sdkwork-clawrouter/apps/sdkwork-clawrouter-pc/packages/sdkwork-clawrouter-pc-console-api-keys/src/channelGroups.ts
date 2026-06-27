import type { ChannelGroup } from './apiKeyService';

export function resolveChannelGroupName(groupCode: string, groups: ChannelGroup[]): string {
  const normalizedCode = groupCode.trim();
  const group = groups.find((item) => item.code === normalizedCode || item.id === normalizedCode);
  return group?.name?.trim() || normalizedCode;
}

export function resolveChannelGroupCode(
  groupValue: string | null | undefined,
  groups: ChannelGroup[],
): string {
  const normalizedValue = groupValue?.trim() ?? '';
  const group = groups.find((item) => item.code === normalizedValue || item.id === normalizedValue);
  return group?.code?.trim() || normalizedValue;
}

export function formatChannelGroupOptionLabel(group: ChannelGroup): string {
  const name = group.name.trim() || group.code;
  return group.rate ? `${name} (${group.rate})` : name;
}
