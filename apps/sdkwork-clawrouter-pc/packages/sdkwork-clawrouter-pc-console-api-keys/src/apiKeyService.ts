import { createClientOperationToken } from '@sdkwork/clawroutes-pc-commons/idempotency';
import { getClawRouterAppSdkClient } from '@sdkwork/clawroutes-pc-commons/sdk-clients';
import {
  ensureSdkworkApiSuccess,
  isRecord,
  optionalBoundedPositiveInteger as optionalQueryPageSize,
  optionalPositiveInteger as optionalQueryPage,
  optionalText as optionalQueryText,
  pruneUndefinedQueryParams,
  readBoolean,
  readRequiredApiItem,
  readApiRecord,
  readNullableString,
  readRequiredApiItems,
  readRequiredNonNegativeNumber,
  readRequiredString,
  readString,
  type ApiRecord,
} from '@sdkwork/clawroutes-pc-commons/api-result';
import type {
  CreateApiKeyRequest,
  AppApiKeyListResponse as SdkAppApiKeyListResponse,
  UpdateApiKeyRequest,
} from '@sdkwork/clawrouter-app-sdk';
import { DEFAULT_CHANNEL_GROUP } from './apiKeyForm.ts';

type ApiKeyModality = NonNullable<CreateApiKeyRequest['modalities']>[number];

export interface ApiKey {
  id: SdkAppApiKeyListResponse['items'][number]['id'];
  name: SdkAppApiKeyListResponse['items'][number]['name'];
  displayName: string;
  maskedKey: string & SdkAppApiKeyListResponse['items'][number]['maskedKey'];
  copyableKey: string | null;
  channelGroup: string;
  channelGroupName: string | null;
  rate: SdkAppApiKeyListResponse['items'][number]['rate'];
  quota: SdkAppApiKeyListResponse['items'][number]['quota'];
  usedQuota: SdkAppApiKeyListResponse['items'][number]['usedQuota'];
  modalities: SdkAppApiKeyListResponse['items'][number]['modalities'];
  ipLimit: SdkAppApiKeyListResponse['items'][number]['ipLimit'];
  created: SdkAppApiKeyListResponse['items'][number]['created'];
  expires: SdkAppApiKeyListResponse['items'][number]['expires'];
  status: SdkAppApiKeyListResponse['items'][number]['status'];
  defaultForRuntime: SdkAppApiKeyListResponse['items'][number]['defaultForRuntime'];
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

const MAX_API_KEY_LIST_PAGE_SIZE = 200;
const MAX_API_KEY_LIST_QUERY_TEXT_LENGTH = 128;

type ApiKeyListFilters = Record<string, unknown>;

type ApiKeyListPage = {
  keys: ApiKey[];
  total: number;
};

export class ApiKeyService {
  static async fetchKeys(filters: ApiKeyListFilters = {}): Promise<ApiKeyListPage> {
    try {
      const result = await getClawRouterAppSdkClient().iam.apiKeys.list(toApiKeyListQueryParams(filters));
      ensureSdkworkApiSuccess(result, 'console.apiKeys.errors.loadFallback');
      const data = readApiRecord(result);
      const items = readRequiredApiItems(result, 'console.apiKeys.errors.loadFallback');
      return {
        keys: items.map(normalizeApiKey),
        total: readApiKeyListPageTotal(data),
      };
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
      const result = await getClawRouterAppSdkClient().iam.apiKeys.create(
        toCreateApiKeyRequest(input),
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
      const result = await getClawRouterAppSdkClient().iam.apiKeys.update(
        requiredText(keyId, 'apiKeyId'),
        toUpdateApiKeyRequest(input),
      );
      return normalizeApiKey(readRequiredApiItem(result, 'API key update response is missing key data', ['item']));
    } catch (error) {
      throw new Error(readSdkErrorMessage(error, 'console.apiKeys.errors.updateFallback'));
    }
  }

  static async deleteKey(keyId: string): Promise<void> {
    try {
      const result = await getClawRouterAppSdkClient().iam.apiKeys.delete(requiredText(keyId, 'apiKeyId'));
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

function toApiKeyListQueryParams(filters: ApiKeyListFilters = {}): {
  page?: number;
  pageSize?: number;
  q?: string;
} {
  const page = optionalQueryPage(filters.page, 'page');
  const pageSize = optionalQueryPageSize(filters.pageSize, 'pageSize', MAX_API_KEY_LIST_PAGE_SIZE);
  const q = optionalQueryText(filters.q ?? filters.searchQuery, 'q', MAX_API_KEY_LIST_QUERY_TEXT_LENGTH);

  return pruneUndefinedQueryParams({
    page,
    pageSize,
    q,
  });
}

function readApiKeyListPageTotal(data: ApiRecord): number {
  if (data.total !== undefined && data.total !== null && data.total !== '') {
    return readRequiredNonNegativeNumber(data, 'total', 'API key list total is required');
  }

  const pageInfo = data.pageInfo;
  if (isRecord(pageInfo)) {
    for (const key of ['totalItems', 'total_items'] as const) {
      const value = pageInfo[key];
      if (value === undefined || value === null || value === '') {
        continue;
      }
      const parsed = typeof value === 'number' ? value : Number(String(value).trim());
      if (Number.isFinite(parsed) && parsed >= 0) {
        return parsed;
      }
      throw new Error('API key list total must be a non-negative number');
    }
  }

  const items = data.items;
  if (Array.isArray(items)) {
    return items.length;
  }

  throw new Error('API key list total is required');
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

function readApiKeyModalities(value: Record<string, unknown>): SdkAppApiKeyListResponse['items'][number]['modalities'] {
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

function readApiKeyStatus(value: Record<string, unknown>): SdkAppApiKeyListResponse['items'][number]['status'] {
  const status = readRequiredString(value, 'status', 'API key status is required');
  if (status === 'enabled' || status === 'disabled') {
    return status;
  }
  throw new Error(`Unsupported API key status: ${status}`);
}
