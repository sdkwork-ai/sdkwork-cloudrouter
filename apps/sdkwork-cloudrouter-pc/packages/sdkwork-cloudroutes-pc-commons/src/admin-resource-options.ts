import { isRecord, readApiItems, readString } from './api-result.ts';

export interface AdminResourceOption {
  value: string;
  label: string;
  detail: string;
}

export interface AdminResourceOptionConfig {
  idKey: string;
  labelKeys: readonly string[];
  detailKeys?: readonly string[];
}

export function readAdminResourceOptions(
  result: unknown,
  config: AdminResourceOptionConfig,
): AdminResourceOption[] {
  return readApiItems(result)
    .filter(isRecord)
    .map((item) => readAdminResourceOption(item, config))
    .filter((item): item is AdminResourceOption => item !== null)
    .sort(compareAdminResourceOptions);
}

export function formatAdminResourceOptionLabel(option: AdminResourceOption): string {
  return option.detail ? `${option.label} - ${option.detail}` : option.label;
}

function readAdminResourceOption(
  item: Record<string, unknown>,
  config: AdminResourceOptionConfig,
): AdminResourceOption | null {
  const value = normalizeOptionValue(item[config.idKey]);
  if (!value) {
    return null;
  }
  const label = readFirstOptionText(item, config.labelKeys) ?? `#${value}`;
  const detail = readOptionDetail(item, value, label, config.detailKeys ?? []);
  return { value, label, detail };
}

function readFirstOptionText(
  item: Record<string, unknown>,
  keys: readonly string[],
): string | null {
  for (const key of keys) {
    const value = readString(item, key).trim();
    if (value) {
      return value;
    }
  }
  return null;
}

function readOptionDetail(
  item: Record<string, unknown>,
  value: string,
  label: string,
  keys: readonly string[],
): string {
  const parts = keys
    .map((key) => readString(item, key).trim())
    .filter((part) => part && part !== value && part !== label);
  return Array.from(new Set(parts)).join(' / ');
}

function normalizeOptionValue(value: unknown): string | null {
  if (typeof value === 'string') {
    const normalized = value.trim();
    return normalized ? normalized : null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(Math.trunc(value));
  }
  return null;
}

function compareAdminResourceOptions(left: AdminResourceOption, right: AdminResourceOption): number {
  return left.label.localeCompare(right.label)
    || left.detail.localeCompare(right.detail)
    || left.value.localeCompare(right.value);
}
