import type { CreateApiKeyInput } from './apiKeyService';
import type { UpdateApiKeyRequest } from '@sdkwork/clawrouter-pc-console-core/sdk';

export type ApiKeyFormValues = {
  name: string;
  /** 路由绑定分组 code 数组；第一个为默认分组 */
  accountGroups: string[];
  quota: string;
  isUnlimitedQuota: boolean;
  modalities: string[];
  ipLimit: string;
  expires: string;
  createCount: number;
  /** 按 Key 的调用链策略（可选）：启用时覆盖全局默认 */
  chain?: {
    maxInflight: string;
    allowlistText: string;
    denylistText: string;
  };
};

/** 从表单构造调用链输入；未启用（undefined）时返回 undefined。 */
export function chainInputFromForm(values: ApiKeyFormValues): UpdateApiKeyRequest['chain'] {
  if (!values.chain) {
    return undefined;
  }
  const maxInflight = values.chain.maxInflight.trim();
  const allowlist = splitIpLines(values.chain.allowlistText);
  const denylist = splitIpLines(values.chain.denylistText);
  if (!maxInflight && allowlist.length === 0 && denylist.length === 0) {
    return undefined;
  }
  return {
    concurrency: maxInflight ? { maxInflight } : undefined,
    ipAccess: {
      mode: 'open',
      allowlist,
      denylist,
    },
  };
}

function splitIpLines(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

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
    accountGroups: normalizeAccountGroups(values.accountGroups),
    quota: normalizeQuota(values.quota, values.isUnlimitedQuota),
    isUnlimitedQuota: values.isUnlimitedQuota,
    modalities: normalizeModalities(values.modalities),
    ipLimit: normalizeOptionalText(values.ipLimit, DEFAULT_IP_LIMIT),
    expires: normalizeOptionalText(values.expires, DEFAULT_EXPIRATION),
    chain: chainInputFromForm(values),
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

function normalizeAccountGroups(values: string[]): string[] {
  const groups: string[] = [];
  for (const rawValue of values) {
    const value = rawValue.trim();
    if (!value) {
      continue;
    }
    if (!groups.includes(value)) {
      groups.push(value);
    }
  }
  if (groups.length === 0) {
    groups.push(DEFAULT_ACCOUNT_GROUP);
  }
  return groups;
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
