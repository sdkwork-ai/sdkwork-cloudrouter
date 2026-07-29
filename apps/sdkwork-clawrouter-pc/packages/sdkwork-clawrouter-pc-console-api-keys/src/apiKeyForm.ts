import type { CreateApiKeyInput } from './apiKeyService';

export type ApiKeyFormValues = {
  name: string;
  accountGroup: string;
  quota: string;
  isUnlimitedQuota: boolean;
  modalities: string[];
  ipLimit: string;
  expires: string;
  createCount: number;
};

export const DEFAULT_API_KEY_MODALITIES = ['text', 'image', 'video', 'audio', 'music'] as const;
export const DEFAULT_ACCOUNT_GROUP = 'default';

type ApiKeyModality = (typeof DEFAULT_API_KEY_MODALITIES)[number];

const DEFAULT_API_KEY_QUOTA = '0.000000';
const DEFAULT_IP_LIMIT = 'unrestricted';
const DEFAULT_EXPIRATION = 'never';
const MAX_BATCH_CREATE_COUNT = 100;

export function createApiKeyInputFromForm(values: ApiKeyFormValues, _index = 0): CreateApiKeyInput {
  return {
    name: requiredText(values.name, 'name'),
    accountGroup: normalizeOptionalText(values.accountGroup, DEFAULT_ACCOUNT_GROUP),
    quota: normalizeQuota(values.quota, values.isUnlimitedQuota),
    isUnlimitedQuota: values.isUnlimitedQuota,
    modalities: normalizeModalities(values.modalities),
    ipLimit: normalizeOptionalText(values.ipLimit, DEFAULT_IP_LIMIT),
    expires: normalizeOptionalText(values.expires, DEFAULT_EXPIRATION),
  };
}

export function createApiKeyInputsFromForm(values: ApiKeyFormValues): CreateApiKeyInput[] {
  const count = normalizeCreateCount(values.createCount);
  const baseName = requiredText(values.name, 'name');

  return Array.from({ length: count }, (_, index) => ({
    ...createApiKeyInputFromForm({
      ...values,
      name: count > 1 ? `${baseName} ${index + 1}` : baseName,
    }),
  }));
}

function requiredText(value: string, fieldName: string): string {
  const text = value.trim();
  if (!text) {
    throw new Error(`${fieldName} is required`);
  }
  return text;
}

function normalizeOptionalText(value: string | null | undefined, fallback: string): string {
  const text = value?.trim() ?? '';
  return text.length > 0 ? text : fallback;
}

function normalizeQuota(value: string, isUnlimitedQuota: boolean): string {
  if (isUnlimitedQuota) {
    return DEFAULT_API_KEY_QUOTA;
  }

  const text = value.trim();
  if (!/^\d+(?:\.\d{1,6})?$/.test(text)) {
    throw new Error('quota must be a non-negative decimal');
  }

  const parsed = Number(text);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error('quota must be a non-negative decimal');
  }

  return text;
}

function normalizeModalities(values: string[]): ApiKeyModality[] {
  const modalities: ApiKeyModality[] = [];
  for (const rawValue of values) {
    const value = rawValue.trim().toLowerCase();
    if (!value) {
      continue;
    }
    if (!isApiKeyModality(value)) {
      throw new Error(`Unsupported API key modality: ${value}`);
    }
    modalities.push(value);
  }
  const uniqueModalities = [...new Set(modalities)];
  if (uniqueModalities.length === 0) {
    throw new Error('modalities must include at least one item');
  }
  return uniqueModalities;
}

function normalizeCreateCount(value: number): number {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < 1 || value > MAX_BATCH_CREATE_COUNT) {
    throw new Error(`createCount must be between 1 and ${MAX_BATCH_CREATE_COUNT}`);
  }
  return value;
}

function isApiKeyModality(value: string): value is ApiKeyModality {
  return (DEFAULT_API_KEY_MODALITIES as readonly string[]).includes(value);
}
