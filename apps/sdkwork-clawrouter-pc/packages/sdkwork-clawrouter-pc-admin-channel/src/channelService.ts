import {
  ensureSdkworkApiSuccess,
  isRecord,
  optionalBoundedPositiveInteger as optionalQueryPageSize,
  optionalPositiveInteger as optionalQueryPage,
  optionalText as optionalQueryText,
  pruneUndefinedQueryParams,
  readApiRecord,
  readRequiredApiItems,
  readRequiredApiItem,
  readBoolean,
  readNumber,
  readRequiredNumber,
  requiredSafePathSegment,
  readRequiredNonNegativeNumber,
  readRequiredString,
  readString,
  readStringArray,
  getModelsBackendSdkClient,
  type ApiRecord,
} from '@sdkwork/clawroutes-pc-commons/runtime';
import {
  getClawRouterBackendSdkClient,
} from '@sdkwork/clawrouter-pc-admin-core/sdk';
import {
  isCanonicalModelCatalogKey,
  isRegionalModelCatalogKey,
  parseModelCatalogIdentity,
} from '@sdkwork/clawroutes-pc-commons/model-catalog-identity';
import type {
  AdminChannelCreateRequest,
  AdminChannelCredentialInput,
  AdminChannelUpdateRequest,
  ProviderCircuitBreakerPolicy,
  ProviderRetryPolicy,
} from '@sdkwork/clawrouter-pc-admin-core/sdk';
import type {
  AdminAiResourceCreateRequest,
  AdminAiResourceMemberInput,
  AdminAiResourceUpdateRequest,
  AdminModelMappingCreateRequest,
  AdminModelMappingRuleBindingInput,
  AdminModelMappingRuleItemInput,
  AdminModelMappingUpdateRequest,
  AiModelMappingsListParams,
} from '@sdkwork/models-backend-sdk';

interface AdminAiResourceMemberItem {
  parentResourceCode: string;
  memberResourceCode: string;
  memberRole: 'included' | 'optional' | 'fallback';
  required: boolean;
  sortOrder: string | null;
}

interface AdminAiResourceItem {
  id: string;
  resourceCode: string;
  resourceType: 'vendor' | 'modality' | 'api_endpoint' | 'model_api' | 'bundle';
  displayName: string;
  vendorCode: string | null;
  modalityCode: string | null;
  apiEndpointCode: string | null;
  catalogKey: string | null;
  model: string | null;
  providerNativeModel: string | null;
  compositionMode: 'single' | 'any' | 'all';
  status: 'active' | 'disabled' | 'inactive';
  sortOrder: string | null;
  members: AdminAiResourceMemberItem[];
}

interface AdminAiResourceGroupItem {
  id: string;
  groupCode: string;
  groupName: string;
  groupType: 'api_group';
  selectionMode: 'manual' | 'all' | 'any' | 'dynamic_all_api';
  status: 'active' | 'disabled' | 'inactive';
  dynamic: boolean;
  resourceCount: number;
  vendorCodes: string[];
  capability?: string | null;
  capabilities: string[];
  sortOrder: string | null;
  description: string | null;
}

interface AdminModelMappingRule extends AdminModelMappingCreateRequest {
  id: string;
  bindingType: string;
  sourceVendorId: string | null;
  targetVendorId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  bindings: AdminModelMappingRuleBindingInput[];
  mappingItems: AdminModelMappingRuleItemInput[];
}

type ChannelType = NonNullable<AdminChannelCreateRequest['channelType']>;
export type CredentialRotationStrategy = NonNullable<AdminChannelCreateRequest['credentialRotation']>;
export type ChannelCredentialStatus = NonNullable<AdminChannelCredentialInput['status']>;

export type ChannelCredentialInput = {
  name?: string;
  baseUrl: string;
  apiKey?: string;
  secretRef?: string;
  priority?: number;
  weight?: number;
  status?: ChannelCredentialStatus;
};

export interface ChannelCredentialItem {
  id: string;
  credentialId: string;
  name: string;
  baseUrl: string;
  secretRef?: string;
  apiKey?: string;
  maskedLabel: string;
  priority: number;
  weight: number;
  status: 'active' | 'error' | 'disabled';
  errors: number;
}

export interface ChannelItem {
  id: string;
  channelId: string;
  name: string;
  vendor: string;
  channelType: ChannelType;
  protocol: string;
  accessType: string;
  credentialRotation: CredentialRotationStrategy;
  credentials: ChannelCredentialItem[];
  createdAt: string;
  expiresAt?: string;
  capabilities: string[];
  resourceCodes: string[];
  isMultimodal: boolean;
  timeoutMs?: number;
  retryPolicy?: ProviderRetryPolicy;
  circuitBreakerPolicy?: ProviderCircuitBreakerPolicy;
  weight: number;
  status: 'active' | 'error' | 'disabled';
  balance: string;
  errors: number;
}

export interface ChannelModelCatalogItem {
  catalogKey: string;
  model: string;
  displayName: string;
  vendorCode: string;
  regionCode: string;
}

export interface AiResource {
  id: AdminAiResourceItem['id'];
  resourceCode: AdminAiResourceItem['resourceCode'];
  resourceType: AdminAiResourceItem['resourceType'];
  displayName: AdminAiResourceItem['displayName'];
  vendorCode?: AdminAiResourceItem['vendorCode'];
  modalityCode?: AdminAiResourceItem['modalityCode'];
  apiEndpointCode?: AdminAiResourceItem['apiEndpointCode'];
  catalogKey?: AdminAiResourceItem['catalogKey'];
  model?: AdminAiResourceItem['model'];
  providerNativeModel?: AdminAiResourceItem['providerNativeModel'];
  capability?: string;
  capabilities: string[];
  compositionMode: AdminAiResourceItem['compositionMode'];
  status: AdminAiResourceItem['status'];
  sortOrder?: number;
  members: {
    parentResourceCode: AdminAiResourceMemberItem['parentResourceCode'];
    memberResourceCode: AdminAiResourceMemberItem['memberResourceCode'];
    memberRole: AdminAiResourceMemberItem['memberRole'];
    required: AdminAiResourceMemberItem['required'];
    sortOrder?: number;
  }[];
}

export type AiResourceGroup = Omit<AdminAiResourceGroupItem, 'resourceCount' | 'sortOrder'> & {
  resourceCount: number;
  sortOrder: number | null;
  vendorCodes: string[];
  capability?: string;
  capabilities: string[];
};

export interface AiResourceMember {
  parentResourceCode: AdminAiResourceMemberItem['parentResourceCode'];
  memberResourceCode: AdminAiResourceMemberItem['memberResourceCode'];
  memberRole: AdminAiResourceMemberItem['memberRole'];
  required: AdminAiResourceMemberItem['required'];
  sortOrder?: number;
}

export interface AiResourceMemberInput {
  memberResourceCode: AdminAiResourceMemberInput['memberResourceCode'];
  memberRole?: AdminAiResourceMemberInput['memberRole'];
  required?: AdminAiResourceMemberInput['required'];
  sortOrder?: number | null;
}

export interface AiResourceCreateInput {
  resourceCode: string;
  resourceType: AiResource['resourceType'];
  displayName: string;
  vendorCode?: string | null;
  modalityCode?: string | null;
  apiEndpointCode?: string | null;
  catalogKey?: string | null;
  model?: string | null;
  providerNativeModel?: string | null;
  compositionMode?: AiResource['compositionMode'];
  status?: AiResource['status'];
  sortOrder?: number | null;
  members?: AiResourceMemberInput[];
}

export interface AiResourceUpdateInput {
  resourceCode?: string;
  resourceType?: AiResource['resourceType'];
  displayName?: string;
  vendorCode?: string | null;
  modalityCode?: string | null;
  apiEndpointCode?: string | null;
  catalogKey?: string | null;
  model?: string | null;
  providerNativeModel?: string | null;
  compositionMode?: AiResource['compositionMode'];
  status?: AiResource['status'];
  sortOrder?: number | null;
  members?: AiResourceMemberInput[];
}

export type ChannelCreateInput = {
  name: string;
  vendor: string;
  channelType?: ChannelType;
  protocol?: string;
  accessType?: string;
  credentialRotation?: CredentialRotationStrategy;
  credentials: ChannelCredentialInput[];
  expiresAt?: string;
  capabilities?: NonNullable<AdminChannelCreateRequest['capabilities']>;
  resourceCodes?: string[];
  timeoutMs?: number;
  retryPolicy?: ProviderRetryPolicy;
  circuitBreakerPolicy?: ProviderCircuitBreakerPolicy;
  weight?: number;
  status?: AdminChannelCreateRequest['status'];
};

export type ChannelUpdateInput = {
  name?: string;
  vendor?: string;
  channelType?: ChannelType;
  protocol?: string;
  accessType?: string;
  credentialRotation?: CredentialRotationStrategy;
  credentials?: ChannelCredentialInput[];
  expiresAt?: string | null;
  capabilities?: NonNullable<AdminChannelUpdateRequest['capabilities']>;
  resourceCodes?: string[];
  timeoutMs?: number | null;
  retryPolicy?: ProviderRetryPolicy | null;
  circuitBreakerPolicy?: ProviderCircuitBreakerPolicy | null;
  weight?: number;
  status?: AdminChannelUpdateRequest['status'];
};

export type AccountModelMappingInput = {
  sourceModel: string;
  targetModel: string;
  targetVendorCode?: string;
};

export type ReplaceAccountModelMappingsInput = {
  channelId: string;
  channelName?: string;
  accountVendorCode: string;
  mappings: AccountModelMappingInput[];
};

export interface ChannelTestResult {
  channelId: string;
  success: boolean;
  status: ChannelItem['status'];
  latency: string;
  item: ChannelItem;
}

const MAX_CHANNEL_LIST_PAGE_SIZE = 200;
const MAX_CHANNEL_LIST_QUERY_TEXT_LENGTH = 128;
const MAX_AI_RESOURCE_LIST_PAGE_SIZE = 200;
const MAX_AI_RESOURCE_GROUP_LIST_PAGE_SIZE = 200;
const MAX_AI_RESOURCE_LIST_QUERY_TEXT_LENGTH = 128;
const MAX_MODEL_CATALOG_PAGE_SIZE = 200;
const MAX_MODEL_CATALOG_QUERY_TEXT_LENGTH = 128;
const DEFAULT_MODEL_CATALOG_PAGE_SIZE = 20;

type AiResourceListFilters = Record<string, unknown>;
type AiResourceGroupListFilters = Record<string, unknown>;
type ModelCatalogListFilters = Record<string, unknown>;

export type ChannelAiResourceListPage = {
  resources: AiResource[];
  total: number;
};

export type ChannelAiResourceGroupListPage = {
  resourceGroups: AiResourceGroup[];
  total: number;
};

export type ChannelModelCatalogListPage = {
  models: ChannelModelCatalogItem[];
  total: number;
};

type ChannelListFilters = Record<string, unknown>;

type ChannelListPage = {
  channels: ChannelItem[];
  total: number;
};

export class ChannelService {
  static async fetchChannels(filters: ChannelListFilters = {}): Promise<ChannelListPage> {
    const result = await channelBackendClient().integration.channels.list(toChannelListQueryParams(filters));
    ensureSdkworkApiSuccess(result, 'Failed to fetch channels');
    const data = readApiRecord(result);
    return {
      channels: readRequiredApiItems(result, 'Failed to fetch channels')
        .map(normalizeChannel),
      total: readChannelListPageTotal(data),
    };
  }

  static async addChannel(channel: ChannelCreateInput): Promise<ChannelItem> {
    const result = await channelBackendClient().integration.channels.create(
      toCreateChannelRequest(channel),
    );
    ensureSdkworkApiSuccess(result, 'Failed to add channel');
    return normalizeChannel(readRequiredApiItem(result, 'Created channel response is missing data'));
  }

  static async updateChannel(id: string, updates: ChannelUpdateInput): Promise<ChannelItem> {
    const channelId = requiredSafePathSegment(id, 'channelId');
    const result = await channelBackendClient().integration.channels.update(
      toUpdateChannelRequest(channelId, updates),
    );
    ensureSdkworkApiSuccess(result, 'Failed to update channel');
    return normalizeChannel(readRequiredApiItem(result, 'Updated channel response is missing data'));
  }

  static async deleteChannel(id: string): Promise<boolean> {
    const result = await channelBackendClient().integration.channels.delete(requiredSafePathSegment(id, 'channelId'));
    ensureDeleteResult(result, 'Channel delete confirmation is required');
    return true;
  }

  static async testChannel(id: string): Promise<ChannelTestResult> {
    const channelId = requiredSafePathSegment(id, 'channelId');
    const result = await channelBackendClient().integration.channels.verify(
      channelId,
    );
    ensureSdkworkApiSuccess(result, 'Failed to test channel');
    const data = readApiRecord(result);
    return {
      channelId: readRequiredString(data, 'channelId', 'Channel test channel id is required'),
      success: readRequiredBoolean(data, 'success', 'Channel test success flag is required'),
      status: readChannelStatus(data),
      latency: readRequiredString(data, 'latency', 'Channel test latency is required'),
      item: normalizeChannel(readRequiredApiItem(result, 'Channel test response is missing channel data', ['item'])),
    };
  }
}

export class ChannelModelCatalogService {
  static async fetchModelsPage(
    filters: ModelCatalogListFilters = {},
  ): Promise<ChannelModelCatalogListPage> {
    const { limit, offset, q } = toModelCatalogListQueryParams(filters);
    const result = await modelsBackendClient().ai.models.list(
      pruneUndefinedQueryParams({
        limit: String(limit),
        offset: String(offset),
        q,
      }),
    );
    ensureSdkworkApiSuccess(result, 'Failed to fetch model catalog');
    const data = readApiRecord(result);
    return {
      models: readRequiredApiItems(result, 'Failed to fetch model catalog')
        .map(normalizeModelCatalogItem)
        .filter((item): item is ChannelModelCatalogItem => item !== null),
      total: readListPageTotal(data, 'Model catalog list total is required'),
    };
  }
}

export class ChannelAiResourceService {
  static async fetchAiResourcesPage(
    filters: AiResourceListFilters = {},
  ): Promise<ChannelAiResourceListPage> {
    const result = await modelsBackendClient().ai.aiResources.list(
      toAiResourceListQueryParams(filters),
    );
    ensureSdkworkApiSuccess(result, 'Failed to fetch AI resources');
    const data = readApiRecord(result);
    return {
      resources: readRequiredApiItems(result, 'Failed to fetch AI resources')
        .map(normalizeAiResource),
      total: readListPageTotal(data, 'AI resource list total is required'),
    };
  }

  static async fetchAiResourceGroupsPage(
    filters: AiResourceGroupListFilters = {},
  ): Promise<ChannelAiResourceGroupListPage> {
    const result = await modelsBackendClient().ai.aiResourceGroups.list(
      toAiResourceGroupListQueryParams(filters),
    );
    ensureSdkworkApiSuccess(result, 'Failed to fetch AI resource groups');
    const data = readApiRecord(result);
    return {
      resourceGroups: readRequiredApiItems(result, 'Failed to fetch AI resource groups')
        .map(normalizeAiResourceGroup),
      total: readListPageTotal(data, 'AI resource group list total is required'),
    };
  }

  static async createAiResource(input: AiResourceCreateInput): Promise<AiResource> {
    const result = await modelsBackendClient().ai.aiResources.create(
      toCreateAiResourceRequest(input),
    );
    ensureSdkworkApiSuccess(result, 'Failed to create AI resource');
    return normalizeAiResource(readRequiredApiItem(result, 'Created AI resource response is missing data'));
  }

  static async updateAiResource(
    id: string,
    input: AiResourceUpdateInput,
  ): Promise<AiResource> {
    const aiResourceId = requiredSafePathSegment(id, 'aiResourceId');
    const result = await modelsBackendClient().ai.aiResources.update(
      aiResourceId,
      toUpdateAiResourceRequest(input),
    );
    ensureSdkworkApiSuccess(result, 'Failed to update AI resource');
    return normalizeAiResource(readRequiredApiItem(result, 'Updated AI resource response is missing data'));
  }
}

export class AccountModelMappingService {
  static async fetchAccountMappings(channelId: string): Promise<AccountModelMappingInput[]> {
    const normalizedChannelId = requiredPositiveIdText(channelId, 'channelId');
    const mappings = await fetchAccountModelMappings(normalizedChannelId);
    return mappings.flatMap((mapping) => (
      mapping.mappingItems
        .filter((item) => item.enabled)
        .map((item) => ({
          sourceModel: requiredText(item.sourceModel ?? undefined, 'sourceModel'),
          targetModel: requiredText(item.targetCatalogKey ?? item.targetModel ?? undefined, 'targetModel'),
          targetVendorCode: mapping.targetVendorCode,
        }))
    ));
  }

  static async replaceAccountMappings(input: ReplaceAccountModelMappingsInput): Promise<void> {
    const channelId = requiredPositiveIdText(input.channelId, 'channelId');
    const accountVendorCode = requiredProviderEndpointCode(input.accountVendorCode, 'accountVendorCode');
    const nextGroups = groupAccountModelMappings(input.mappings, accountVendorCode);
    const existing = await fetchAccountModelMappings(channelId);
    const existingByTargetVendor = new Map(
      existing.map((mapping) => [providerCodeForVendor(mapping.targetVendorCode), mapping]),
    );

    await Promise.all(Array.from(nextGroups.entries()).map(async ([targetVendorCode, mappingItems]) => {
      const payload = accountModelMappingRulePayload({
        channelId,
        channelName: input.channelName,
        accountVendorCode,
        targetVendorCode,
        mappingItems,
      });
      const current = existingByTargetVendor.get(targetVendorCode);
      if (current) {
        await updateAccountModelMapping(String(current.id), payload);
      } else {
        await createAccountModelMapping(payload);
      }
      existingByTargetVendor.delete(targetVendorCode);
    }));

    await Promise.all(Array.from(existingByTargetVendor.values()).map((mapping) => (
      deleteAccountModelMapping(String(mapping.id))
    )));
  }
}

function toCreateChannelRequest(channel: ChannelCreateInput): AdminChannelCreateRequest {
  const channelType = channel.channelType === undefined ? undefined : channelTypeValue(channel.channelType);
  return pruneUndefined({
    name: requiredText(channel.name, 'name'),
    vendor: requiredText(channel.vendor, 'vendor'),
    channelType,
    protocol: optionalText(channel.protocol),
    accessType: optionalText(channel.accessType),
    credentialRotation: channel.credentialRotation === undefined ? undefined : credentialRotationValue(channel.credentialRotation),
    credentials: toCredentialInputs(channel.credentials),
    expiresAt: optionalText(channel.expiresAt),
    capabilities: channel.capabilities === undefined ? undefined : toChannelCapabilities(channel.capabilities),
    resourceCodes: channel.resourceCodes === undefined
      ? undefined
      : toResourceCodes(channel.resourceCodes),
    timeoutMs: optionalPositiveIntegerString(channel.timeoutMs, 'timeoutMs'),
    retryPolicy: channel.retryPolicy,
    circuitBreakerPolicy: channel.circuitBreakerPolicy === undefined
      ? undefined
      : normalizeCircuitBreakerPolicy(channel.circuitBreakerPolicy),
    weight: optionalPositiveIntegerString(channel.weight, 'weight'),
    status: channel.status,
  });
}

function toUpdateChannelRequest(id: string, updates: ChannelUpdateInput): AdminChannelUpdateRequest {
  const channelType = updates.channelType === undefined ? undefined : channelTypeValue(updates.channelType);
  return pruneUndefined({
    id,
    name: updates.name === undefined ? undefined : requiredText(updates.name, 'name'),
    vendor: updates.vendor === undefined ? undefined : requiredText(updates.vendor, 'vendor'),
    channelType,
    protocol: optionalText(updates.protocol),
    accessType: optionalText(updates.accessType),
    credentialRotation: updates.credentialRotation === undefined ? undefined : credentialRotationValue(updates.credentialRotation),
    credentials: updates.credentials === undefined ? undefined : toCredentialInputs(updates.credentials),
    expiresAt: updates.expiresAt === undefined ? undefined : updates.expiresAt === null ? null : updates.expiresAt.trim(),
    capabilities: updates.capabilities === undefined ? undefined : toChannelCapabilities(updates.capabilities),
    resourceCodes: updates.resourceCodes === undefined
      ? undefined
      : toResourceCodesForUpdate(updates.resourceCodes),
    timeoutMs: updates.timeoutMs === undefined ? undefined : optionalNullablePositiveIntegerString(updates.timeoutMs, 'timeoutMs'),
    retryPolicy: updates.retryPolicy,
    circuitBreakerPolicy: updates.circuitBreakerPolicy === undefined
      ? undefined
      : updates.circuitBreakerPolicy === null
        ? null
        : normalizeCircuitBreakerPolicy(updates.circuitBreakerPolicy),
    weight: optionalPositiveIntegerString(updates.weight, 'weight'),
    status: updates.status,
  });
}

async function fetchAccountModelMappings(channelId: string): Promise<AdminModelMappingRule[]> {
  const params: AiModelMappingsListParams = {
    bindingType: 'channel',
    channelId,
  };
  const result = await modelsBackendClient().ai.modelMappings.list(params);
  ensureSdkworkApiSuccess(result, 'Failed to fetch account model mappings');
  return readRequiredApiItems(result, 'Failed to fetch account model mappings')
    .map(readModelMappingRule);
}

async function createAccountModelMapping(input: AdminModelMappingCreateRequest): Promise<void> {
  const result = await modelsBackendClient().ai.modelMappings.create(input);
  ensureSdkworkApiSuccess(result, 'Failed to create account model mapping');
}

async function updateAccountModelMapping(id: string, input: AdminModelMappingUpdateRequest): Promise<void> {
  const result = await modelsBackendClient().ai.modelMappings.update(
    requiredSafePathSegment(id, 'mappingId'),
    input,
  );
  ensureSdkworkApiSuccess(result, 'Failed to update account model mapping');
}

async function deleteAccountModelMapping(id: string): Promise<void> {
  const result = await modelsBackendClient().ai.modelMappings.delete(
    requiredSafePathSegment(id, 'mappingId'),
  );
  ensureSdkworkApiSuccess(result, 'Failed to delete stale account model mapping');
}

function groupAccountModelMappings(
  mappings: readonly AccountModelMappingInput[],
  accountVendorCode: string,
): Map<string, AdminModelMappingRuleItemInput[]> {
  const grouped = new Map<string, AdminModelMappingRuleItemInput[]>();
  const dedupe = new Set<string>();
  for (const mapping of mappings) {
    const targetVendorCode = requiredProviderEndpointCode(
      mapping.targetVendorCode ?? catalogVendorCode(mapping.targetModel, accountVendorCode),
      'targetVendorCode',
    );
    const targetCatalogKey = toCatalogModelKey(mapping.targetModel, targetVendorCode);
    const targetModel = catalogRuntimeModelId(targetCatalogKey);
    const sourceModel = requiredText(mapping.sourceModel, 'sourceModel');
    const key = `${targetVendorCode}:${sourceModel.toLowerCase()}:${targetCatalogKey.toLowerCase()}`;
    if (dedupe.has(key)) {
      continue;
    }
    dedupe.add(key);
    const rows = grouped.get(targetVendorCode) ?? [];
    rows.push(pruneUndefined({
      sourceModel,
      targetModel,
      targetCatalogKey,
      targetProviderModel: targetModel,
      targetProviderNativeModel: targetModel,
      enabled: true,
    }));
    grouped.set(targetVendorCode, rows);
  }
  return grouped;
}

function accountModelMappingRulePayload({
  channelId,
  channelName,
  accountVendorCode,
  targetVendorCode,
  mappingItems,
}: {
  channelId: string;
  channelName?: string;
  accountVendorCode: string;
  targetVendorCode: string;
  mappingItems: AdminModelMappingRuleItemInput[];
}): AdminModelMappingCreateRequest {
  return {
    sourceVendorCode: accountVendorCode,
    targetVendorCode,
    mappingMode: 'alias',
    matchType: 'exact',
    enabled: true,
    bindings: [
      accountModelMappingBinding(channelId, channelName),
    ],
    mappingItems,
  };
}

function accountModelMappingBinding(
  channelId: string,
  channelName: string | undefined,
): AdminModelMappingRuleBindingInput {
  return pruneUndefined({
    bindingType: 'channel' as const,
    bindingId: channelId,
    bindingName: optionalText(channelName),
    enabled: true,
  });
}

function readModelMappingRule(value: unknown): AdminModelMappingRule {
  const item = readRequiredRecord(value, 'Model mapping record is required');
  const id = readRequiredString(item, 'id', 'Model mapping id is required');
  const bindingType = readRequiredString(item, 'bindingType', 'Model mapping binding type is required');
  if (bindingType !== 'channel') {
    throw new Error(`Unsupported account model mapping binding type: ${bindingType}`);
  }
  const sourceVendorCode = readRequiredString(item, 'sourceVendorCode', 'Model mapping source vendor is required');
  const targetVendorCode = readRequiredString(item, 'targetVendorCode', 'Model mapping target vendor is required');
  if (!Array.isArray(item.bindings)) {
    throw new Error('Model mapping bindings are required');
  }
  if (!Array.isArray(item.mappingItems)) {
    throw new Error('Model mapping items are required');
  }
  return {
    id,
    bindingType,
    sourceVendorCode,
    targetVendorCode,
    sourceVendorId: readOptionalNullableString(item, 'sourceVendorId') ?? null,
    targetVendorId: readOptionalNullableString(item, 'targetVendorId') ?? null,
    mappingMode: 'alias',
    matchType: 'exact',
    enabled: readRequiredBoolean(item, 'enabled', 'Model mapping enabled flag is required'),
    bindings: item.bindings as AdminModelMappingRule['bindings'],
    mappingItems: item.mappingItems as AdminModelMappingRule['mappingItems'],
    createdAt: readOptionalNullableString(item, 'createdAt') ?? null,
    updatedAt: readOptionalNullableString(item, 'updatedAt') ?? null,
  };
}

function toCredentialInputs(credentials: ChannelCredentialInput[]): AdminChannelCredentialInput[] {
  if (!Array.isArray(credentials)) {
    throw new Error('credentials must include at least one upstream credential');
  }
  const normalized = credentials.map((credential, index) => toCredentialInput(credential, index));
  if (normalized.length === 0) {
    throw new Error('credentials must include at least one upstream credential');
  }
  return normalized;
}

function toCredentialInput(credential: ChannelCredentialInput, index: number): AdminChannelCredentialInput {
  const apiKey = optionalText(credential.apiKey);
  const secretRef = optionalText(credential.secretRef);
  if (!apiKey && !secretRef) {
    throw new Error(`credentials[${index}].apiKey is required`);
  }
  if (apiKey && secretRef) {
    throw new Error(`credentials[${index}] must provide either apiKey or secretRef, not both`);
  }
  return pruneUndefined({
    name: optionalText(credential.name),
    baseUrl: requiredProviderEndpointBaseUrl(credential.baseUrl),
    apiKey,
    secretRef,
    priority: optionalBoundedPositiveIntegerString(credential.priority, `credentials[${index}].priority`, 1_000_000),
    weight: optionalBoundedPositiveIntegerString(credential.weight, `credentials[${index}].weight`, 10_000),
    status: credential.status === undefined ? undefined : credentialStatusValue(credential.status),
  });
}

function toCreateAiResourceRequest(
  input: AiResourceCreateInput,
): AdminAiResourceCreateRequest {
  return pruneUndefined({
    resourceCode: requiredAiResourceCode(input.resourceCode, 'resourceCode'),
    resourceType: aiResourceType(input.resourceType),
    displayName: requiredText(input.displayName, 'displayName'),
    vendorCode: optionalNormalizedCode(input.vendorCode, 'vendorCode'),
    modalityCode: optionalNormalizedCode(input.modalityCode, 'modalityCode'),
    apiEndpointCode: optionalNormalizedCode(input.apiEndpointCode, 'apiEndpointCode'),
    catalogKey: optionalNullableText(input.catalogKey),
    model: optionalNullableText(input.model),
    providerNativeModel: optionalNullableText(input.providerNativeModel),
    compositionMode: input.compositionMode === undefined
      ? undefined
      : aiResourceCompositionMode(input.compositionMode),
    status: input.status === undefined ? undefined : aiResourceStatus(input.status),
    sortOrder: optionalNullableNonNegativeIntegerString(input.sortOrder, 'sortOrder'),
    members: input.members === undefined ? undefined : toAiResourceMemberInputs(input.members),
  });
}

function toUpdateAiResourceRequest(
  input: AiResourceUpdateInput,
): AdminAiResourceUpdateRequest {
  return pruneUndefined({
    resourceCode: input.resourceCode === undefined
      ? undefined
      : requiredAiResourceCode(input.resourceCode, 'resourceCode'),
    resourceType: input.resourceType === undefined
      ? undefined
      : aiResourceType(input.resourceType),
    displayName: input.displayName === undefined
      ? undefined
      : requiredText(input.displayName, 'displayName'),
    vendorCode: input.vendorCode === undefined
      ? undefined
      : optionalNormalizedCode(input.vendorCode, 'vendorCode'),
    modalityCode: input.modalityCode === undefined
      ? undefined
      : optionalNormalizedCode(input.modalityCode, 'modalityCode'),
    apiEndpointCode: input.apiEndpointCode === undefined
      ? undefined
      : optionalNormalizedCode(input.apiEndpointCode, 'apiEndpointCode'),
    catalogKey: input.catalogKey === undefined ? undefined : optionalNullableText(input.catalogKey),
    model: input.model === undefined ? undefined : optionalNullableText(input.model),
    providerNativeModel: input.providerNativeModel === undefined
      ? undefined
      : optionalNullableText(input.providerNativeModel),
    compositionMode: input.compositionMode === undefined
      ? undefined
      : aiResourceCompositionMode(input.compositionMode),
    status: input.status === undefined ? undefined : aiResourceStatus(input.status),
    sortOrder: input.sortOrder === undefined
      ? undefined
      : optionalNullableNonNegativeIntegerString(input.sortOrder, 'sortOrder'),
    members: input.members === undefined ? undefined : toAiResourceMemberInputs(input.members),
  });
}

function toChannelCapabilities(
  capabilities: string[],
): NonNullable<AdminChannelCreateRequest['capabilities']> | undefined {
  const allowed = new Set<NonNullable<AdminChannelCreateRequest['capabilities']>[number]>([
    'llm',
    'image',
    'audio',
    'music',
    'sfx',
    'video',
  ]);
  const normalized: NonNullable<AdminChannelCreateRequest['capabilities']> = [];
  for (const rawCapability of normalizedStringArray(capabilities)) {
    const capability = rawCapability.toLowerCase();
    if (!allowed.has(capability as NonNullable<AdminChannelCreateRequest['capabilities']>[number])) {
      throw new Error(`Unsupported channel capability: ${capability}`);
    }
    normalized.push(capability as NonNullable<AdminChannelCreateRequest['capabilities']>[number]);
  }
  return normalized.length > 0 ? normalized : undefined;
}

function channelTypeValue(value: string): ChannelType {
  if (value === 'official' || value === 'relay') {
    return value;
  }
  throw new Error(`Unsupported channel type: ${value}`);
}

function credentialRotationValue(value: string): CredentialRotationStrategy {
  const normalized = value.trim().toLowerCase().replace(/-/g, '_');
  if (
    normalized === 'default'
    || normalized === 'priority'
    || normalized === 'round_robin'
    || normalized === 'weighted_round_robin'
    || normalized === 'random'
  ) {
    return normalized;
  }
  throw new Error(`Unsupported credential rotation strategy: ${value}`);
}

function credentialStatusValue(value: string): ChannelCredentialStatus {
  if (value === 'active' || value === 'disabled' || value === 'error') {
    return value;
  }
  throw new Error(`Unsupported credential status: ${value}`);
}

function toResourceCodes(values: string[]): string[] | undefined {
  const normalized = Array.from(new Set(
    normalizedStringArray(values).map((value) => value.toLowerCase()),
  ));
  validateResourceCodes(normalized);
  return normalized.length > 0 ? normalized : undefined;
}

function toResourceCodesForUpdate(values: string[]): string[] {
  const normalized = Array.from(new Set(
    normalizedStringArray(values).map((value) => value.toLowerCase()),
  ));
  validateResourceCodes(normalized);
  return normalized;
}

function validateResourceCodes(values: string[]): void {
  for (const code of values) {
    if (!/^[a-z0-9._-]+$/.test(code)) {
      throw new Error(`Unsupported AI resource code: ${code}`);
    }
  }
}

function toAiResourceMemberInputs(
  members: AiResourceMemberInput[],
): AdminAiResourceMemberInput[] {
  return members.map((member, index) => pruneUndefined({
    memberResourceCode: requiredAiResourceCode(
      member.memberResourceCode ?? undefined,
      `members[${index}].memberResourceCode`,
    ),
    memberRole: member.memberRole == null
      ? undefined
      : aiResourceMemberRole(member.memberRole),
    required: member.required,
    sortOrder: member.sortOrder === undefined
      ? undefined
      : optionalNullableNonNegativeIntegerString(member.sortOrder, `members[${index}].sortOrder`),
  }));
}

function requiredAiResourceCode(value: string | undefined, fieldName: string): string {
  const normalized = requiredText(value, fieldName).toLowerCase();
  if (!/^[a-z0-9._-]+$/.test(normalized)) {
    throw new Error(`${fieldName} must be an AI resource code`);
  }
  return normalized;
}

function optionalNormalizedCode(value: string | null | undefined, fieldName: string): string | null | undefined {
  if (value === null) {
    return null;
  }
  const normalized = optionalText(value)?.toLowerCase();
  if (normalized === undefined) {
    return undefined;
  }
  if (!/^[a-z0-9._-]+$/.test(normalized)) {
    throw new Error(`${fieldName} must be an AI resource code`);
  }
  return normalized;
}

function aiResourceType(value: string): AiResource['resourceType'] {
  if (
    value === 'vendor'
    || value === 'modality'
    || value === 'api_endpoint'
    || value === 'model_api'
    || value === 'bundle'
  ) {
    return value;
  }
  throw new Error(`Unsupported AI resource type: ${value}`);
}

function aiResourceCompositionMode(value: string): AiResource['compositionMode'] {
  if (value === 'single' || value === 'any' || value === 'all') {
    return value;
  }
  throw new Error(`Unsupported AI resource composition mode: ${value}`);
}

function aiResourceStatus(value: string): AiResource['status'] {
  if (value === 'active' || value === 'disabled' || value === 'inactive') {
    return value;
  }
  throw new Error(`Unsupported AI resource status: ${value}`);
}

function aiResourceMemberRole(value: string): NonNullable<AdminAiResourceMemberInput['memberRole']> {
  if (value === 'included' || value === 'optional' || value === 'fallback') {
    return value;
  }
  throw new Error(`Unsupported AI resource member role: ${value}`);
}

function requiredPositiveIdText(value: string, fieldName: string): string {
  const normalized = requiredText(value, fieldName);
  if (!/^[1-9][0-9]*$/.test(normalized)) {
    throw new Error(`${fieldName} must be a positive integer`);
  }
  return normalized;
}

function requiredProviderEndpointCode(value: string, fieldName: string): string {
  const normalized = requiredText(value, fieldName).toLowerCase();
  if (!/^[a-z0-9._*-]+$/.test(normalized)) {
    throw new Error(`${fieldName} may only contain letters, numbers, ., -, _, and *`);
  }
  return normalized;
}

function requiredProviderEndpointBaseUrl(value: string): string {
  const normalized = requiredText(value, 'baseUrl');
  if (!/^https?:\/\//i.test(normalized)) {
    throw new Error('baseUrl must start with http:// or https://');
  }
  if (/\s|[\u0000-\u001f\u007f]/.test(normalized)) {
    throw new Error('baseUrl must not contain whitespace or control characters');
  }
  return normalized;
}

function normalizedStringArray(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function toCatalogModelKey(model: string, vendor: string | undefined): string {
  const value = model.trim();
  if (isRegionalModelCatalogKey(value)) {
    throw new Error('catalogKey must not include region; use vendor/model identity and configure region separately');
  }
  if (value.includes('/') && !isCatalogModelKey(value)) {
    throw new Error('catalogKey must use vendor/model identity');
  }
  const identity = parseModelCatalogIdentity(value);
  if (identity) {
    return value;
  }
  const vendorCode = providerCodeForVendor(vendor ?? 'custom');
  return `${vendorCode}/${value}`;
}

function catalogVendorCode(model: string, fallbackVendorCode: string): string {
  const identity = parseModelCatalogIdentity(model.trim());
  return identity ? providerCodeForVendor(identity.vendorCode) : fallbackVendorCode;
}

function catalogRuntimeModelId(catalogKey: string): string {
  const identity = parseModelCatalogIdentity(catalogKey.trim());
  return identity?.modelId ?? catalogKey.trim();
}

export function providerCodeForVendor(vendor: string): string {
  const normalized = vendor.trim().toLowerCase();
  const mapping: Record<string, string> = {
    'azure openai': 'azure_openai',
    gemini: 'google',
    google: 'google',
    'google gemini': 'google',
    zhipuai: 'zhipu',
    'zhipu ai': 'zhipu',
    'mistral ai': 'mistral',
    'meta llama': 'meta',
  };
  return (mapping[normalized] ?? normalized.replace(/\s+/g, '_')).replace(/[^a-z0-9_-]/g, '') || 'custom';
}

export function isCatalogModelKey(value: string): boolean {
  return isCanonicalModelCatalogKey(value);
}

export function normalizeModelCatalogKey(model: string, vendor: string): string {
  return toCatalogModelKey(model, vendor);
}

function optionalText(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function requiredText(value: string | undefined, fieldName: string): string {
  const normalized = value?.trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required`);
  }
  return normalized;
}

function optionalPositiveIntegerString(value: number | undefined, fieldName: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(`${fieldName} must be a positive integer`);
  }
  return String(value);
}

function optionalBoundedPositiveInteger(value: number | undefined, fieldName: string, maxValue: number): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!Number.isSafeInteger(value) || value < 1 || value > maxValue) {
    throw new Error(`${fieldName} must be between 1 and ${maxValue}`);
  }
  return value;
}

function optionalBoundedPositiveIntegerString(
  value: number | undefined,
  fieldName: string,
  maxValue: number,
): string | undefined {
  const normalized = optionalBoundedPositiveInteger(value, fieldName, maxValue);
  return normalized === undefined ? undefined : String(normalized);
}

function optionalNullablePositiveIntegerString(
  value: number | null | undefined,
  fieldName: string,
): string | null | undefined {
  if (value === null) {
    return null;
  }
  return optionalPositiveIntegerString(value, fieldName);
}

function optionalNullableNonNegativeIntegerString(
  value: number | null | undefined,
  fieldName: string,
): string | null | undefined {
  if (value === null) {
    return null;
  }
  if (value === undefined) {
    return undefined;
  }
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${fieldName} must be a non-negative integer`);
  }
  return String(value);
}

function optionalNullableText(value: string | null | undefined): string | null | undefined {
  if (value === null) {
    return null;
  }
  return optionalText(value);
}

function pruneUndefined<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as T;
}

function toChannelListQueryParams(filters: ChannelListFilters = {}): {
  page?: number;
  pageSize?: number;
  q?: string;
} {
  const page = optionalQueryPage(filters.page, 'page');
  const pageSize = optionalQueryPageSize(filters.pageSize, 'pageSize', MAX_CHANNEL_LIST_PAGE_SIZE);
  const q = optionalQueryText(filters.q ?? filters.searchQuery, 'q', MAX_CHANNEL_LIST_QUERY_TEXT_LENGTH);

  return pruneUndefinedQueryParams({
    page,
    pageSize,
    q,
  });
}

function readChannelListPageTotal(data: ApiRecord): number {
  return readListPageTotal(data, 'Channel list total is required');
}

function readListPageTotal(data: ApiRecord, message: string): number {
  if (data.total !== undefined && data.total !== null && data.total !== '') {
    return readRequiredNonNegativeNumber(data, 'total', message);
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
      throw new Error(`${message.replace(/ is required$/, '')} must be a non-negative number`);
    }
  }

  const itemsCount = readListItemsCount(data);
  if (itemsCount !== undefined) {
    return itemsCount;
  }

  throw new Error(message);
}

function readListItemsCount(data: ApiRecord): number | undefined {
  const items = data.items;
  if (Array.isArray(items)) {
    return items.length;
  }
  return undefined;
}

function toAiResourceListQueryParams(filters: AiResourceListFilters = {}): {
  page?: number;
  pageSize?: number;
  q?: string;
} {
  return toListQueryParams(
    filters,
    MAX_AI_RESOURCE_LIST_PAGE_SIZE,
    MAX_AI_RESOURCE_LIST_QUERY_TEXT_LENGTH,
  );
}

function toAiResourceGroupListQueryParams(filters: AiResourceGroupListFilters = {}): {
  page?: number;
  pageSize?: number;
  q?: string;
} {
  return toListQueryParams(
    filters,
    MAX_AI_RESOURCE_GROUP_LIST_PAGE_SIZE,
    MAX_AI_RESOURCE_LIST_QUERY_TEXT_LENGTH,
  );
}

function toModelCatalogListQueryParams(filters: ModelCatalogListFilters = {}): {
  limit: number;
  offset: number;
  q?: string;
} {
  const directLimit = readOptionalBoundedPageSize(filters.limit, 'limit', MAX_MODEL_CATALOG_PAGE_SIZE);
  const directOffset = readOptionalNonNegativeIntegerFilter(filters.offset, 'offset');
  if (directLimit !== undefined || directOffset !== undefined) {
    const limit = directLimit ?? DEFAULT_MODEL_CATALOG_PAGE_SIZE;
    const offset = directOffset ?? 0;
    return {
      limit,
      offset,
      q: optionalQueryText(filters.q ?? filters.searchQuery, 'q', MAX_MODEL_CATALOG_QUERY_TEXT_LENGTH),
    };
  }

  const page = optionalQueryPage(filters.page, 'page') ?? 1;
  const pageSize = optionalQueryPageSize(
    filters.pageSize,
    'pageSize',
    MAX_MODEL_CATALOG_PAGE_SIZE,
  ) ?? DEFAULT_MODEL_CATALOG_PAGE_SIZE;

  return {
    limit: pageSize,
    offset: (page - 1) * pageSize,
    q: optionalQueryText(filters.q ?? filters.searchQuery, 'q', MAX_MODEL_CATALOG_QUERY_TEXT_LENGTH),
  };
}

function toListQueryParams(
  filters: Record<string, unknown>,
  maxPageSize: number,
  maxQueryTextLength: number,
): {
  page?: number;
  pageSize?: number;
  q?: string;
} {
  const page = optionalQueryPage(filters.page, 'page');
  const pageSize = optionalQueryPageSize(filters.pageSize, 'pageSize', maxPageSize);
  const q = optionalQueryText(filters.q ?? filters.searchQuery, 'q', maxQueryTextLength);

  return pruneUndefinedQueryParams({
    page,
    pageSize,
    q,
  });
}

function readOptionalBoundedPageSize(
  value: unknown,
  fieldName: string,
  maxValue: number,
): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const parsed = typeof value === 'number'
    ? value
    : typeof value === 'string' && value.trim()
      ? Number(value.trim())
      : Number.NaN;
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > maxValue) {
    throw new Error(`${fieldName} must be between 1 and ${maxValue}`);
  }
  return parsed;
}

function readOptionalNonNegativeIntegerFilter(
  value: unknown,
  fieldName: string,
): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const parsed = typeof value === 'number'
    ? value
    : typeof value === 'string' && value.trim()
      ? Number(value.trim())
      : Number.NaN;
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error(`${fieldName} must be a non-negative integer`);
  }
  return parsed;
}

function ensureDeleteResult(result: unknown, message: string): void {
  ensureSdkworkApiSuccess(result, message);
  if (readBoolean(readApiRecord(result), 'deleted') !== true) {
    throw new Error(message);
  }
}

function channelBackendClient() {
  return getClawRouterBackendSdkClient();
}

function modelsBackendClient() {
  return getModelsBackendSdkClient();
}

function normalizeChannel(value: unknown): ChannelItem {
  const item = readRequiredRecord(value, 'Channel record is required');
  return {
    id: readRequiredString(item, 'id', 'Channel id is required'),
    channelId: readPositiveIdText(item, 'channelId', 'Channel id is required'),
    name: readRequiredString(item, 'name', 'Channel name is required'),
    vendor: readRequiredString(item, 'vendor', 'Channel vendor is required'),
    channelType: readChannelType(item),
    protocol: readRequiredString(item, 'protocol', 'Channel protocol is required'),
    accessType: readRequiredString(item, 'accessType', 'Channel access type is required'),
    credentialRotation: readCredentialRotation(item),
    credentials: readCredentialItems(item),
    createdAt: readRequiredString(item, 'createdAt', 'Channel created time is required'),
    expiresAt: readOptionalString(item, 'expiresAt'),
    capabilities: readRequiredStringArray(item, 'capabilities', 'Channel capabilities are required'),
    resourceCodes: readRequiredStringArrayField(item, 'resourceCodes', 'Channel AI resource codes are required'),
    isMultimodal: readRequiredBoolean(item, 'isMultimodal', 'Channel multimodal flag is required'),
    timeoutMs: readOptionalNumber(item, 'timeoutMs'),
    retryPolicy: readRetryPolicy(item),
    circuitBreakerPolicy: readCircuitBreakerPolicy(item),
    weight: readRequiredNumber(item, 'weight', 'Channel weight is required'),
    status: readChannelStatus(item),
    balance: readRequiredString(item, 'balance', 'Channel balance is required'),
    errors: readRequiredNonNegativeInteger(item, 'errors', 'Channel errors are required'),
  };
}

function readCredentialItems(item: ApiRecord): ChannelCredentialItem[] {
  const value = item.credentials;
  if (value === undefined) {
    throw new Error('Channel credentials are required');
  }
  if (!Array.isArray(value)) {
    throw new Error('Channel credentials must be an array');
  }
  return value.map((credential, index) => normalizeChannelCredential(credential, index));
}

function normalizeChannelCredential(value: unknown, index: number): ChannelCredentialItem {
  const item = readRequiredRecord(value, `Channel credential ${index + 1} is required`);
  return {
    id: readRequiredString(item, 'id', 'Channel credential id is required'),
    credentialId: readPositiveIdText(item, 'credentialId', 'Channel credential scoped id is required'),
    name: readRequiredString(item, 'name', 'Channel credential name is required'),
    baseUrl: readProviderEndpointBaseUrl(item),
    secretRef: readOptionalString(item, 'secretRef'),
    apiKey: readOptionalString(item, 'apiKey'),
    maskedLabel: readRequiredString(item, 'maskedLabel', 'Channel credential masked label is required'),
    priority: readRequiredBoundedInteger(item, 'priority', 'Channel credential priority is required', 1, 1_000_000),
    weight: readRequiredBoundedInteger(item, 'weight', 'Channel credential weight is required', 1, 10_000),
    status: readCredentialStatus(item),
    errors: readRequiredNonNegativeInteger(item, 'errors', 'Channel credential errors are required'),
  };
}

function normalizeModelCatalogItem(value: unknown): ChannelModelCatalogItem | null {
  const item = readRequiredRecord(value, 'Model catalog record is required');
  const vendorCode = readRequiredString(item, 'vendorCode', 'Model catalog vendor code is required');
  const model = readRequiredString(item, 'model', 'Model catalog runtime model id is required');
  const runtimeCatalogKey = readOptionalString(item, 'catalogKey');
  const runtimeRegionCode = readOptionalString(item, 'regionCode');
  const regionCode = runtimeRegionCode ?? 'global';
  const normalizedVendorCode = providerCodeForVendor(vendorCode);
  if (runtimeCatalogKey && !isCatalogModelKey(runtimeCatalogKey)) {
    throw new Error('Model catalog key must use vendor/model identity; region belongs to pricing and deployment attributes');
  }
  const catalogKey = runtimeCatalogKey ?? `${normalizedVendorCode}/${model}`;
  return {
    catalogKey,
    model,
    displayName: readOptionalString(item, 'displayName') ?? readOptionalString(item, 'name') ?? model,
    vendorCode: normalizedVendorCode,
    regionCode,
  };
}

function normalizeAiResource(value: unknown): AiResource {
  const item = readRequiredRecord(value, 'AI resource record is required');
  return {
    id: readRequiredString(item, 'id', 'AI resource id is required'),
    resourceCode: readAiResourceCode(item, 'resourceCode', 'AI resource code is required'),
    resourceType: readAiResourceType(item),
    displayName: readRequiredString(item, 'displayName', 'AI resource display name is required'),
    vendorCode: readOptionalString(item, 'vendorCode'),
    modalityCode: readOptionalString(item, 'modalityCode'),
    apiEndpointCode: readOptionalString(item, 'apiEndpointCode'),
    catalogKey: readOptionalString(item, 'catalogKey'),
    model: readOptionalString(item, 'model'),
    providerNativeModel: readOptionalString(item, 'providerNativeModel'),
    capability: readOptionalString(item, 'capability'),
    capabilities: readOptionalStringArray(item, 'capabilities'),
    compositionMode: readAiResourceCompositionMode(item),
    status: readAiResourceStatus(item),
    sortOrder: readOptionalNonNegativeInteger(item, 'sortOrder', 'AI resource sort order must be a non-negative integer'),
    members: readAiResourceMembers(item),
  };
}

function normalizeAiResourceGroup(value: unknown): AiResourceGroup {
  const item = readRequiredRecord(value, 'AI resource group record is required');
  return {
    id: readRequiredString(item, 'id', 'AI resource group id is required'),
    groupCode: readAiResourceCode(item, 'groupCode', 'AI resource group code is required'),
    groupName: readRequiredString(item, 'groupName', 'AI resource group name is required'),
    groupType: readAiResourceGroupType(item),
    selectionMode: readAiResourceGroupSelectionMode(item),
    status: readAiResourceGroupStatus(item),
    dynamic: readRequiredBoolean(item, 'dynamic', 'AI resource group dynamic flag is required'),
    resourceCount: readRequiredNonNegativeInteger(item, 'resourceCount', 'AI resource group resource count must be a non-negative integer'),
    vendorCodes: readOptionalStringArray(item, 'vendorCodes'),
    capability: readOptionalString(item, 'capability'),
    capabilities: readOptionalStringArray(item, 'capabilities'),
    sortOrder: readOptionalNonNegativeInteger(item, 'sortOrder', 'AI resource group sort order must be a non-negative integer') ?? null,
    description: readOptionalString(item, 'description') ?? null,
  };
}

function normalizeAiResourceMember(value: unknown): AiResourceMember {
  const item = readRequiredRecord(value, 'AI resource member record is required');
  return {
    parentResourceCode: readAiResourceCode(item, 'parentResourceCode', 'AI resource member parent code is required'),
    memberResourceCode: readAiResourceCode(item, 'memberResourceCode', 'AI resource member code is required'),
    memberRole: readAiResourceMemberRole(item),
    required: readRequiredBoolean(item, 'required', 'AI resource member required flag is required'),
    sortOrder: readOptionalNonNegativeInteger(item, 'sortOrder', 'AI resource member sort order must be a non-negative integer'),
  };
}

function readAiResourceType(item: ApiRecord): AiResource['resourceType'] {
  const kind = readRequiredString(item, 'resourceType', 'AI resource type is required');
  if (
    kind === 'vendor'
    || kind === 'modality'
    || kind === 'api_endpoint'
    || kind === 'model_api'
    || kind === 'bundle'
  ) {
    return kind;
  }
  throw new Error(`Unsupported AI resource type: ${kind}`);
}

function readAiResourceCompositionMode(item: ApiRecord): AiResource['compositionMode'] {
  const mode = readRequiredString(item, 'compositionMode', 'AI resource composition mode is required');
  if (mode === 'single' || mode === 'any' || mode === 'all') {
    return mode;
  }
  throw new Error(`Unsupported AI resource composition mode: ${mode}`);
}

function readAiResourceStatus(item: ApiRecord): AiResource['status'] {
  const status = readRequiredString(item, 'status', 'AI resource status is required');
  if (status === 'active' || status === 'disabled' || status === 'inactive') {
    return status;
  }
  throw new Error(`Unsupported AI resource status: ${status}`);
}

function readAiResourceGroupType(item: ApiRecord): AiResourceGroup['groupType'] {
  const value = readRequiredString(item, 'groupType', 'AI resource group type is required');
  if (value === 'api_group') {
    return value;
  }
  throw new Error(`Unsupported AI resource group type: ${value}`);
}

function readAiResourceGroupSelectionMode(item: ApiRecord): AiResourceGroup['selectionMode'] {
  const value = readRequiredString(item, 'selectionMode', 'AI resource group selection mode is required');
  if (value === 'manual' || value === 'all' || value === 'any' || value === 'dynamic_all_api') {
    return value;
  }
  throw new Error(`Unsupported AI resource group selection mode: ${value}`);
}

function readAiResourceGroupStatus(item: ApiRecord): AiResourceGroup['status'] {
  const status = readRequiredString(item, 'status', 'AI resource group status is required');
  if (status === 'active' || status === 'disabled' || status === 'inactive') {
    return status;
  }
  throw new Error(`Unsupported AI resource group status: ${status}`);
}

function readAiResourceMemberRole(item: ApiRecord): AiResourceMember['memberRole'] {
  const role = readRequiredString(item, 'memberRole', 'AI resource member role is required');
  if (role === 'included' || role === 'optional' || role === 'fallback') {
    return role;
  }
  throw new Error(`Unsupported AI resource member role: ${role}`);
}

function readAiResourceMembers(item: ApiRecord): AiResourceMember[] {
  if (!Array.isArray(item.members)) {
    throw new Error('AI resource members are required');
  }
  return item.members.map(normalizeAiResourceMember);
}

function readAiResourceCode(item: ApiRecord, key: string, message: string): string {
  const value = readRequiredString(item, key, message).trim();
  if (!/^[A-Za-z0-9._-]+$/.test(value)) {
    throw new Error(`${key} must be an AI resource code`);
  }
  return value;
}

function readPositiveIdText(item: ApiRecord, key: string, message: string): string {
  const value = readRequiredString(item, key, message).trim();
  if (!/^[1-9][0-9]*$/.test(value)) {
    throw new Error(`${key} must be a positive integer`);
  }
  return value;
}

function readProviderEndpointBaseUrl(item: ApiRecord): string {
  const value = readRequiredString(item, 'baseUrl', 'Channel endpoint base URL is required').trim();
  if (!/^https?:\/\//i.test(value)) {
    throw new Error('Channel endpoint base URL must start with http:// or https://');
  }
  if (/\s|[\u0000-\u001f\u007f]/.test(value)) {
    throw new Error('Channel endpoint base URL must not contain whitespace or control characters');
  }
  return value;
}

function readOptionalNullableString(item: ApiRecord, key: string): string | null | undefined {
  if (!(key in item) || item[key] === undefined) {
    return undefined;
  }
  if (item[key] === null) {
    return null;
  }
  return readOptionalString(item, key);
}

function readOptionalString(item: ApiRecord, key: string): string | undefined {
  const value = readString(item, key).trim();
  return value.length > 0 ? value : undefined;
}

function readOptionalNumber(item: ApiRecord, key: string): number | undefined {
  if (!(key in item) || item[key] === null || item[key] === undefined || item[key] === '') {
    return undefined;
  }
  const value = readNumber(item, key, Number.NaN);
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < 1) {
    throw new Error(`${key} must be a positive integer`);
  }
  return value;
}

function readRequiredRecord(value: unknown, message: string): ApiRecord {
  if (!isRecord(value)) {
    throw new Error(message);
  }
  return value;
}

function readRequiredStringArray(item: ApiRecord, key: string, message: string): string[] {
  const values = readStringArray(item, key);
  if (values.length === 0) {
    throw new Error(message);
  }
  return values;
}

function readOptionalStringArray(item: ApiRecord, key: string): string[] {
  if (!(key in item) || item[key] === null || item[key] === undefined) {
    return [];
  }
  return readStringArray(item, key);
}

function readRequiredStringArrayField(item: ApiRecord, key: string, message: string): string[] {
  if (!Array.isArray(item[key])) {
    throw new Error(message);
  }
  return readStringArray(item, key);
}

function readRetryPolicy(item: ApiRecord): ProviderRetryPolicy | undefined {
  const value = item.retryPolicy;
  if (value === undefined || value === null) {
    return undefined;
  }
  if (!isRecord(value)) {
    throw new Error('Channel retryPolicy must be an object');
  }
  const maxAttempts = readRequiredBoundedInteger(
    value,
    'maxAttempts',
    'Channel retryPolicy.maxAttempts is required',
    1,
    5,
  );
  const rawStatuses = value.retryableStatusCodes;
  if (!Array.isArray(rawStatuses)) {
    throw new Error('Channel retryPolicy.retryableStatusCodes is required');
  }
  const retryableStatusCodes = rawStatuses.map(readRetryableProviderStatus);
  return pruneUndefined({
    maxAttempts,
    retryableStatusCodes,
    backoffMs: readOptionalBoundedInteger(value, 'backoffMs', 0, 2000),
  });
}

function readCircuitBreakerPolicy(item: ApiRecord): ProviderCircuitBreakerPolicy | undefined {
  const value = item.circuitBreakerPolicy;
  if (value === undefined || value === null) {
    return undefined;
  }
  if (!isRecord(value)) {
    throw new Error('Channel circuitBreakerPolicy must be an object');
  }
  return normalizeCircuitBreakerPolicy({
    failureThreshold: readRequiredBoundedInteger(
      value,
      'failureThreshold',
      'Channel circuitBreakerPolicy.failureThreshold must be between 1 and 100',
      1,
      100,
    ),
  });
}

function normalizeCircuitBreakerPolicy(value: ProviderCircuitBreakerPolicy): ProviderCircuitBreakerPolicy {
  if (!isRecord(value)) {
    throw new Error('circuitBreakerPolicy must be an object');
  }
  return {
    failureThreshold: boundedIntegerValue(
      value.failureThreshold,
      'circuitBreakerPolicy.failureThreshold',
      1,
      100,
    ),
  };
}

function boundedIntegerValue(value: unknown, fieldName: string, min: number, max: number): number {
  const number = typeof value === 'number'
    ? value
    : typeof value === 'string' && value.trim()
      ? Number(value)
      : Number.NaN;
  if (!Number.isSafeInteger(number) || number < min || number > max) {
    throw new Error(`${fieldName} must be between ${min} and ${max}`);
  }
  return number;
}

function readRetryableProviderStatus(status: unknown): ProviderRetryPolicy['retryableStatusCodes'][number] {
  const value = typeof status === 'number'
    ? status
    : typeof status === 'string' && status.trim()
      ? Number(status)
      : Number.NaN;
  if (
    !Number.isInteger(value)
    || ![408, 409, 425, 429, 500, 502, 503, 504].includes(value)
  ) {
    throw new Error(`Channel retryPolicy.retryableStatusCodes contains unsupported status: ${String(status)}`);
  }
  return value as ProviderRetryPolicy['retryableStatusCodes'][number];
}

function readOptionalBoundedInteger(item: ApiRecord, key: string, min: number, max: number): number | undefined {
  if (!(key in item) || item[key] === null || item[key] === undefined || item[key] === '') {
    return undefined;
  }
  return readRequiredBoundedInteger(item, key, `${key} must be between ${min} and ${max}`, min, max);
}

function readRequiredBoundedInteger(item: ApiRecord, key: string, message: string, min: number, max: number): number {
  const value = readNumber(item, key, Number.NaN);
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < min || value > max) {
    throw new Error(message);
  }
  return value;
}

function readRequiredNonNegativeInteger(item: ApiRecord, key: string, message: string): number {
  const value = readNumber(item, key, Number.NaN);
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
    throw new Error(message);
  }
  return value;
}

function readOptionalNonNegativeInteger(item: ApiRecord, key: string, message: string): number | undefined {
  if (!(key in item) || item[key] === null || item[key] === undefined || item[key] === '') {
    return undefined;
  }
  return readRequiredNonNegativeInteger(item, key, message);
}

function readRequiredBoolean(item: ApiRecord, key: string, message: string): boolean {
  const value = item[key];
  if (typeof value !== 'boolean') {
    throw new Error(message);
  }
  return value;
}

function readChannelStatus(item: ApiRecord): 'active' | 'error' | 'disabled' {
  const status = readString(item, 'status');
  if (status === 'active' || status === 'error' || status === 'disabled') {
    return status;
  }
  throw new Error(status ? `Unsupported channel status: ${status}` : 'Channel status is required');
}

function readCredentialRotation(item: ApiRecord): CredentialRotationStrategy {
  return credentialRotationValue(readRequiredString(item, 'credentialRotation', 'Channel credential rotation is required'));
}

function readCredentialStatus(item: ApiRecord): ChannelCredentialItem['status'] {
  const status = readString(item, 'status');
  if (status === 'active' || status === 'error' || status === 'disabled') {
    return status;
  }
  throw new Error(status ? `Unsupported channel credential status: ${status}` : 'Channel credential status is required');
}

function readChannelType(item: ApiRecord): ChannelType {
  return channelTypeValue(readRequiredString(item, 'channelType', 'Channel type is required'));
}
