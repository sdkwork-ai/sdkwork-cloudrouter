import { createClientOperationToken } from '@sdkwork/clawroutes-pc-commons/idempotency';
import {
  getClawRouterAppSdkClient,
  getSdkworkAppbaseAppSdkClient,
} from '@sdkwork/clawroutes-pc-commons/sdk-clients';
import {
  ensureSdkworkApiSuccess,
  isRecord,
  readBoolean,
  readRequiredApiItem,
  readApiRecord,
  readNullableString,
  readRequiredApiItems,
  readRequiredString,
  readString,
} from '@sdkwork/clawroutes-pc-commons/api-result';
import { DEFAULT_CHANNEL_GROUP } from './apiKeyForm.ts';

type ApiKeyModality = 'audio' | 'image' | 'music' | 'text' | 'video';

interface CreateApiKeyRequest {
  channelGroup: string;
  defaultForRuntime?: boolean;
  expires?: string;
  ipLimit?: string;
  isUnlimitedQuota?: boolean;
  modalities?: ApiKeyModality[];
  name: string;
  quota?: string;
}

interface UpdateApiKeyRequest {
  channelGroup?: string;
  defaultForRuntime?: boolean;
  expires?: string;
  ipLimit?: string;
  isUnlimitedQuota?: boolean;
  modalities?: ApiKeyModality[];
  name?: string;
  quota?: string;
}

interface SdkAppApiKeyListResponse {
  groups: unknown[];
  items: Array<{
    channelGroup: string;
    channelGroupName?: string | null;
    copyableKey?: string | null;
    created: string;
    defaultForRuntime: boolean;
    expires: string;
    id: string;
    ipLimit: string;
    maskedKey: string;
    modalities: ApiKeyModality[];
    name: string;
    quota: string;
    rate?: string | null;
    status: 'disabled' | 'enabled';
    usedQuota: string;
  }>;
}

type SdkAppApiKeyItem = SdkAppApiKeyListResponse['items'][number];

export interface ApiKey {
  id: SdkAppApiKeyListResponse['items'][number]['id'];
  name: SdkAppApiKeyItem['name'];
  displayName: string;
  maskedKey: string & SdkAppApiKeyItem['maskedKey'];
  copyableKey: string | null;
  channelGroup: string;
  channelGroupName: string | null;
  rate: SdkAppApiKeyItem['rate'];
  quota: SdkAppApiKeyItem['quota'];
  usedQuota: SdkAppApiKeyItem['usedQuota'];
  modalities: SdkAppApiKeyItem['modalities'];
  ipLimit: SdkAppApiKeyItem['ipLimit'];
  created: SdkAppApiKeyItem['created'];
  expires: SdkAppApiKeyItem['expires'];
  status: SdkAppApiKeyItem['status'];
  defaultForRuntime: SdkAppApiKeyItem['defaultForRuntime'];
}

export interface ChannelGroup {
  id: string;
  code: string;
  name: string;
  rate: string | null;
}

export interface CreateApiKeyInput {
  name: string;
  channelGroup: string;
  quota: string;
  isUnlimitedQuota: boolean;
  modalities: string[];
  ipLimit: string;
  expires: string;
  defaultForRuntime?: boolean;
}

export interface CreatedApiKey {
  key: ApiKey;
  rawKey: string;
}

type UpdateApiKeyInput = Partial<CreateApiKeyInput>;
const UNRESTRICTED_MODALITIES: ApiKeyModality[] = ['text', 'image', 'video', 'audio', 'music'];

export class ApiKeyService {
  static async fetchKeys(): Promise<ApiKey[]> {
    try {
      const result = await getSdkworkAppbaseAppSdkClient().iam.apiKeys.list();
      ensureSdkworkApiSuccess(result, 'console.apiKeys.errors.loadFallback');
      const items = readRequiredApiItems(result, 'console.apiKeys.errors.loadFallback');
      return items.map(normalizeApiKey);
    } catch (error) {
      throw new Error(readSdkErrorMessage(error, 'console.apiKeys.errors.loadFallback'));
    }
  }

  static async fetchGroups(): Promise<ChannelGroup[]> {
    try {
      const result = await getClawRouterAppSdkClient().ai.channelGroups.list();
      ensureSdkworkApiSuccess(result, 'console.apiKeys.errors.loadGroupsFallback');
      const items = readRequiredApiItems(result, 'console.apiKeys.errors.loadGroupsFallback');
      return items.map(normalizeChannelGroup);
    } catch (error) {
      throw new Error(readSdkErrorMessage(error, 'console.apiKeys.errors.loadGroupsFallback'));
    }
  }

  static async createKey(input: CreateApiKeyInput): Promise<CreatedApiKey> {
    const idempotencyKey = createClientOperationToken('create-api-key');
    try {
      const result = await getSdkworkAppbaseAppSdkClient().iam.apiKeys.create(
        toCreateApiKeyRequest(input) as unknown as Record<string, unknown>,
        { idempotencyKey },
      );

      const data = readApiRecord(result);
      const rawKey = readString(data, 'rawKey');
      if (!rawKey) {
        throw new Error('API key creation response is missing key material');
      }
      const key = normalizeCreatedApiKey(
        readRequiredApiItem(result, 'API key creation response is missing key data', ['item']),
        rawKey,
      );
      return { key, rawKey };
    } catch (error) {
      throw new Error(readSdkErrorMessage(error, 'console.apiKeys.errors.createFallback'));
    }
  }

  static async updateKey(keyId: string, input: UpdateApiKeyInput): Promise<ApiKey> {
    try {
      const result = await getSdkworkAppbaseAppSdkClient().iam.apiKeys.update(
        requiredText(keyId, 'apiKeyId'),
        toUpdateApiKeyRequest(input) as unknown as Record<string, unknown>,
      );
      return normalizeApiKey(readRequiredApiItem(result, 'API key update response is missing key data', ['item']));
    } catch (error) {
      throw new Error(readSdkErrorMessage(error, 'console.apiKeys.errors.updateFallback'));
    }
  }

  static async deleteKey(keyId: string): Promise<void> {
    try {
      const result = await getSdkworkAppbaseAppSdkClient().iam.apiKeys.delete(requiredText(keyId, 'apiKeyId'));
      ensureSdkworkApiSuccess(result, 'console.apiKeys.errors.deleteFallback');
    } catch (error) {
      throw new Error(readSdkErrorMessage(error, 'console.apiKeys.errors.deleteFallback'));
    }
  }
}

function readSdkErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    const message = error.message.trim();
    if (message && message !== 'Unknown error') {
      return message;
    }
  }
  return fallback;
}

function toCreateApiKeyRequest(input: CreateApiKeyInput): CreateApiKeyRequest {
  const request = {
    name: requiredText(input.name, 'name'),
    channelGroup: optionalText(input.channelGroup) ?? DEFAULT_CHANNEL_GROUP,
    quota: decimalQuota(input.quota),
    isUnlimitedQuota: Boolean(input.isUnlimitedQuota),
    modalities: toApiKeyModalities(input.modalities),
    ipLimit: optionalText(input.ipLimit) ?? 'unrestricted',
    expires: optionalText(input.expires) ?? 'never',
  } as CreateApiKeyRequest & Record<string, unknown>;
  if (input.defaultForRuntime !== undefined) {
    request.defaultForRuntime = Boolean(input.defaultForRuntime);
  }
  return request as CreateApiKeyRequest;
}

function toUpdateApiKeyRequest(input: UpdateApiKeyInput): UpdateApiKeyRequest {
  const request = {} as UpdateApiKeyRequest & Record<string, unknown>;
  if (input.name !== undefined) {
    request.name = requiredText(input.name, 'name');
  }
  if (input.channelGroup !== undefined) {
    request.channelGroup = optionalText(input.channelGroup) ?? DEFAULT_CHANNEL_GROUP;
  }
  if (input.quota !== undefined) {
    request.quota = decimalQuota(input.quota);
  }
  if (input.isUnlimitedQuota !== undefined) {
    request.isUnlimitedQuota = Boolean(input.isUnlimitedQuota);
  }
  if (input.modalities !== undefined) {
    request.modalities = toApiKeyModalities(input.modalities);
  }
  if (input.ipLimit !== undefined) {
    request.ipLimit = optionalText(input.ipLimit) ?? 'unrestricted';
  }
  if (input.expires !== undefined) {
    request.expires = optionalText(input.expires) ?? 'never';
  }
  if (input.defaultForRuntime !== undefined) {
    request.defaultForRuntime = Boolean(input.defaultForRuntime);
  }
  return request as UpdateApiKeyRequest;
}

function requiredText(value: string, fieldName: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required`);
  }
  return normalized;
}

function optionalText(value: string): string | undefined {
  const normalized = value.trim();
  return normalized ? normalized : undefined;
}

function decimalQuota(value: string): string {
  const normalized = requiredText(value, 'quota').replace(/,/g, '');
  if (!/^\d+(?:\.\d{1,6})?$/.test(normalized)) {
    throw new Error('quota must be a non-negative decimal');
  }
  return normalized;
}

function normalizeApiKey(value: unknown): ApiKey {
  if (!isRecord(value)) {
    throw new Error('API key record is required');
  }

  const id = readRequiredString(value, 'id', 'API key id is required');
  const name = readRequiredString(value, 'name', 'API key name is required');
  const maskedKey = readRequiredString(value, 'maskedKey', 'API key masked value is required');
  return {
    id,
    name,
    displayName: readApiKeyDisplayName(id, name),
    maskedKey,
    copyableKey: readNullableString(value, 'copyableKey'),
    channelGroup: readRequiredString(value, 'channelGroup', 'API key channel group is required'),
    channelGroupName: readNullableString(value, 'channelGroupName'),
    rate: readNullableString(value, 'rate'),
    quota: readRequiredString(value, 'quota', 'API key quota is required'),
    usedQuota: readRequiredString(value, 'usedQuota', 'API key used quota is required'),
    modalities: readApiKeyModalities(value),
    ipLimit: readRequiredString(value, 'ipLimit', 'API key IP limit is required'),
    created: readRequiredString(value, 'created', 'API key created time is required'),
    expires: readRequiredString(value, 'expires', 'API key expiration is required'),
    status: readApiKeyStatus(value),
    defaultForRuntime: readBoolean(value, 'defaultForRuntime'),
  };
}

function readApiKeyDisplayName(id: string, name: string): string {
  const normalized = name.trim();
  if (!normalized) {
    return `API Key #${id}`;
  }
  return normalized;
}

function normalizeCreatedApiKey(value: unknown, rawKey: string): ApiKey {
  try {
    const key = normalizeApiKey(value);
    if (key.copyableKey && key.copyableKey !== rawKey) {
      throw new Error('API key creation response copyable key does not match raw key material');
    }
    return { ...key, copyableKey: rawKey };
  } catch (error) {
    if (
      error instanceof Error
      && error.message === 'API key creation response copyable key does not match raw key material'
    ) {
      throw error;
    }
    throw new Error('API key creation response is missing key data');
  }
}

function normalizeChannelGroup(value: unknown): ChannelGroup {
  if (!isRecord(value)) {
    throw new Error('Channel group record is required');
  }

  return {
    id: readRequiredString(value, 'id', 'Channel group id is required'),
    code: readRequiredString(value, 'code', 'Channel group code is required'),
    name: readRequiredString(value, 'name', 'Channel group name is required'),
    rate: readNullableString(value, 'rate'),
  };
}

function toApiKeyModalities(values: string[]): ApiKeyModality[] {
  const modalities: ApiKeyModality[] = [];
  for (const value of values) {
    const modality = value.trim().toLowerCase();
    if (!modality) {
      continue;
    }
    if (!isApiKeyModality(modality)) {
      throw new Error(`Unsupported API key modality: ${modality}`);
    }
    if (!modalities.includes(modality)) {
      modalities.push(modality);
    }
  }
  if (modalities.length === 0) {
    throw new Error('modalities must include at least one item');
  }
  return modalities;
}

function isApiKeyModality(value: string): value is ApiKeyModality {
  return (UNRESTRICTED_MODALITIES as readonly string[]).includes(value);
}

function readApiKeyModalities(value: Record<string, unknown>): SdkAppApiKeyItem['modalities'] {
  const raw = value.modalities;
  if (!Array.isArray(raw)) {
    throw new Error('API key modalities are required');
  }
  const modalities: ApiKeyModality[] = [];
  for (const item of raw) {
    const modality = typeof item === 'string' ? item.trim().toLowerCase() : '';
    if (!modality) {
      throw new Error('API key modalities are required');
    }
    if (!isApiKeyModality(modality)) {
      throw new Error(`Unsupported API key modality: ${modality}`);
    }
    modalities.push(modality);
  }
  if (modalities.length === 0) {
    throw new Error('API key modalities are required');
  }
  return [...new Set(modalities)];
}

function readApiKeyStatus(value: Record<string, unknown>): SdkAppApiKeyItem['status'] {
  const status = readRequiredString(value, 'status', 'API key status is required');
  if (status === 'enabled' || status === 'disabled') {
    return status;
  }
  throw new Error(`Unsupported API key status: ${status}`);
}
