import {
  ensureSdkworkApiSuccess,
  isRecord,
  optionalBoundedPositiveInteger as optionalQueryPageSize,
  optionalPositiveInteger as optionalQueryPage,
  optionalText as optionalQueryText,
  pruneUndefinedQueryParams,
  readApiRecord,
  readBoolean,
  readRequiredApiItems,
  readRequiredApiItem,
  requiredSafePathSegment,
  readRecordArray,
  readRequiredNonNegativeNumber,
  readRequiredNumber,
  readRequiredString,
  readString,
  readStringArray,
  getModelsBackendSdkClient,
  type ApiRecord,
} from '@sdkwork/clawroutes-pc-commons/runtime';
import {
  getClawRouterBackendSdkClient,
} from '@sdkwork/clawrouter-pc-admin-core/sdk';
import type {
  AdminChannelGroupCreateRequest,
  AdminChannelGroupUpdateRequest,
  AdminRuntimeRouteExplainRequest,
} from '@sdkwork/clawrouter-pc-admin-core/sdk';

export type GroupPriceReferenceMode = 'multiplier' | 'official_price';

export interface GroupData {
  id: string;
  groupCode: string;
  groupName: string;
  providerCode: string;
  priceReferenceMode: GroupPriceReferenceMode;
  rateMultiplier: number;
  officialPriceMultiplier: number | null;
  groupType: 'public' | 'dedicated';
  accountCount: { available: number; total: number };
  capacity: { used: number; total: number };
  usage: { today: number; total: number };
  resourceGroupCodes: string[];
  resourceCodes: string[];
  status: 'active' | 'disabled';
}

export type GroupCreateInput = {
  groupName: string;
  priceReferenceMode: GroupPriceReferenceMode;
  rateMultiplier?: number;
  officialPriceMultiplier?: number;
  groupType: GroupData['groupType'];
  capacity: { total: number };
  status: GroupData['status'];
  resourceGroupCodes?: string[];
  resourceCodes?: string[];
};

export type GroupUpdateInput = {
  groupName?: string;
  priceReferenceMode?: GroupPriceReferenceMode;
  rateMultiplier?: number;
  officialPriceMultiplier?: number;
  groupType?: GroupData['groupType'];
  capacity?: { total: number };
  status?: GroupData['status'];
  resourceGroupCodes?: string[];
  resourceCodes?: string[];
};

export interface GroupResourceGroupOption {
  id: string;
  groupCode: string;
  groupName: string;
  groupType: 'api_group';
  selectionMode: 'manual' | 'all' | 'any' | 'dynamic_all_api';
  description: string | null;
  resourceCount: number;
  status: 'active' | 'disabled' | 'inactive';
}

export interface GroupAiResourceOption {
  id: string;
  resourceCode: string;
  displayName: string;
  resourceType: string;
  vendorCode: string | null;
  modalityCode: string | null;
  apiEndpointCode: string | null;
  catalogKey: string | null;
  model: string | null;
  providerNativeModel: string | null;
  status: 'active' | 'disabled' | 'inactive';
}

type ChannelGroupResourceAccessRequest = {
  resourceGroupCodes?: string[];
  resourceCodes?: string[];
};

type ChannelGroupCreateRequestWithResourceAccess =
  AdminChannelGroupCreateRequest & ChannelGroupResourceAccessRequest;

type ChannelGroupUpdateRequestWithResourceAccess =
  AdminChannelGroupUpdateRequest & ChannelGroupResourceAccessRequest;

let groupCodeFallbackCounter = 0;

const MAX_GROUP_LIST_PAGE_SIZE = 200;
const MAX_GROUP_LIST_QUERY_TEXT_LENGTH = 128;
const MAX_ASSIGNABLE_CHANNEL_LIST_PAGE_SIZE = 200;
const MAX_ASSIGNABLE_CHANNEL_LIST_QUERY_TEXT_LENGTH = 128;
const MAX_ASSIGNABLE_RESOURCE_GROUP_LIST_PAGE_SIZE = 200;
const MAX_ASSIGNABLE_RESOURCE_LIST_PAGE_SIZE = 200;
const MAX_ASSIGNABLE_RESOURCE_LIST_QUERY_TEXT_LENGTH = 128;

type GroupListFilters = Record<string, unknown>;

type GroupListPage = {
  groups: GroupData[];
  total: number;
};

type AssignableChannelListFilters = Record<string, unknown>;

type AssignableResourceGroupListFilters = Record<string, unknown>;

type AssignableResourceListFilters = Record<string, unknown>;

export type AssignableResourceGroupListPage = {
  resourceGroups: GroupResourceGroupOption[];
  total: number;
};

export type AssignableAiResourceListPage = {
  resources: GroupAiResourceOption[];
  total: number;
};

export type AssignableChannelListPage = {
  channels: GroupChannelOption[];
  total: number;
};

export interface GroupChannelBindingData {
  id: string;
  channelGroupId: string;
  channelId: string;
  channelName: string;
  providerCode: string;
  providerName: string;
  channelCode: string;
  resourceCodes: string[];
  apiScope: string[];
  capabilities: string[];
  priority: number;
  weight: number;
  status: 'active' | 'disabled';
  healthStatus: 'active' | 'error';
}

export interface GroupChannelBindingInput {
  channelId: string;
  priority?: number;
  weight?: number;
  status?: GroupChannelBindingData['status'];
  resourceCodes?: string[];
  apiScope?: string[];
  capabilities?: string[];
}

export interface GroupChannelOption {
  id: string;
  name: string;
  providerCode: string;
  providerName: string;
  channelCode: string;
  resourceCodes: string[];
  apiScope: string[];
  capabilities: string[];
  status: 'active' | 'disabled' | 'error';
  healthStatus: 'active' | 'error';
}

export type GroupRoutePreflightSeverity = 'blocking' | 'warning' | 'info';

export type GroupRoutePreflightIssueCode =
  | 'group.disabled'
  | 'group.account_count.empty'
  | 'group.resource_access.empty'
  | 'group.bindings.empty'
  | 'group.bindings.no_active_healthy_member'
  | 'group.bindings.no_resource_overlap'
  | 'group.bindings.missing_scope_metadata';

export interface GroupRoutePreflightIssue {
  code: GroupRoutePreflightIssueCode;
  severity: GroupRoutePreflightSeverity;
  messageKey: string;
  details?: string[];
}

export interface GroupRoutePreflightResult {
  ready: boolean;
  issueCodes: GroupRoutePreflightIssueCode[];
  issues: GroupRoutePreflightIssue[];
  resourceCodes: string[];
  resourceGroupCodes: string[];
  configuredResourceAccessCount: number;
  apiScope: string[];
  capabilities: string[];
  activeHealthyBindingCount: number;
}

export interface GroupRouteExplainResult extends GroupRoutePreflightResult {
  source: 'backend_config';
  effectiveResourceCodes: string[];
  configuredResourceGroupAccessCount: number;
  routableBindingCount: number;
}

export type GroupRuntimeRouteCapability =
  | 'chat'
  | 'image'
  | 'audio'
  | 'music'
  | 'video'
  | 'embedding'
  | 'rerank'
  | 'network';

export type GroupRuntimeRouteExplainIssueCode =
  | 'route.unavailable'
  | 'pricing.unavailable';

export interface GroupRuntimeRouteExplainRequest {
  apiKeyId: string;
  channelGroupId?: string;
  resourceCode?: string;
  catalogKey?: string;
  model?: string;
  apiCode?: string;
  capability?: GroupRuntimeRouteCapability;
  billingMeter?: string;
  routeKey?: string;
}

export interface GroupRuntimeRouteExplainIssue {
  code: GroupRuntimeRouteExplainIssueCode;
  severity: GroupRoutePreflightSeverity;
  message: string;
}

export interface GroupRuntimeRouteExplainCandidate {
  kind: 'model' | 'channel';
  providerCode: string;
  channelId: string;
  channelGroupId: string;
  channelGroupCode: string;
  pricingPlanCode: string;
  policyId: string | null;
  ruleId: string | null;
  apiCode: string;
  catalogKey: string | null;
  requestedModel: string | null;
  providerModel: string | null;
  regionCode: string;
  credentialId: string | null;
  credentialRotation: string | null;
  timeoutMs: number | null;
}

export interface GroupRuntimeRouteExplainResult {
  source: 'runtime_selector';
  ready: boolean;
  resourceCode: string;
  catalogKey: string | null;
  model: string | null;
  apiCode: string;
  capability: GroupRuntimeRouteCapability;
  billingMeter: string;
  apiKeyId: string;
  channelGroupId: string;
  groupCode: string;
  pricingPlanCode: string;
  candidateCount: number;
  selectedCandidates: GroupRuntimeRouteExplainCandidate[];
  blockedReasons: GroupRuntimeRouteExplainIssue[];
  warnings: GroupRuntimeRouteExplainIssue[];
  policyId: string | null;
  ruleId: string | null;
  policySnapshotVersion: string;
}

export interface GroupRoutePreflightBinding {
  resourceCodes?: readonly string[];
  apiScope?: readonly string[];
  capabilities?: readonly string[];
  status: GroupChannelBindingData['status'];
  healthStatus: GroupChannelBindingData['healthStatus'];
}

const routePreflightMessageKeys: Record<GroupRoutePreflightIssueCode, string> = {
  'group.disabled': 'admin.group.routePreflight.issue.groupDisabled',
  'group.account_count.empty': 'admin.group.routePreflight.issue.zeroAvailableAccounts',
  'group.resource_access.empty': 'admin.group.routePreflight.issue.emptyResourceAccess',
  'group.bindings.empty': 'admin.group.routePreflight.issue.emptyBindings',
  'group.bindings.no_active_healthy_member': 'admin.group.routePreflight.issue.noActiveHealthyMember',
  'group.bindings.no_resource_overlap': 'admin.group.routePreflight.issue.noResourceOverlap',
  'group.bindings.missing_scope_metadata': 'admin.group.routePreflight.issue.missingScopeMetadata',
};

export function buildGroupRoutePreflight(
  group: Pick<GroupData, 'resourceCodes' | 'resourceGroupCodes' | 'status' | 'accountCount'>,
  bindings: readonly GroupRoutePreflightBinding[],
): GroupRoutePreflightResult {
  const issues: GroupRoutePreflightIssue[] = [];
  const resourceCodes = normalizePreflightStringList(group.resourceCodes);
  const resourceGroupCodes = normalizePreflightStringList(group.resourceGroupCodes);
  const activeHealthyBindings = bindings.filter(
    binding => binding.status === 'active' && binding.healthStatus === 'active',
  );
  const activeHealthyBindingResourceCodes = activeHealthyBindings
    .map(binding => normalizePreflightStringList(binding.resourceCodes));
  const apiScope = normalizePreflightStringList(
    activeHealthyBindings.flatMap(binding => binding.apiScope ?? []),
  );
  const capabilities = normalizePreflightStringList(
    activeHealthyBindings.flatMap(binding => binding.capabilities ?? []),
  );

  if (group.status !== 'active') {
    issues.push(createGroupRoutePreflightIssue('group.disabled', 'blocking'));
  }
  if (group.accountCount.available <= 0) {
    issues.push(createGroupRoutePreflightIssue('group.account_count.empty', 'blocking'));
  }
  if (resourceCodes.length === 0 && resourceGroupCodes.length === 0) {
    issues.push(createGroupRoutePreflightIssue('group.resource_access.empty', 'blocking'));
  }
  if (bindings.length === 0) {
    issues.push(createGroupRoutePreflightIssue('group.bindings.empty', 'blocking'));
  } else if (activeHealthyBindings.length === 0) {
    issues.push(createGroupRoutePreflightIssue('group.bindings.no_active_healthy_member', 'blocking'));
  }

  const explicitBindingResourceCodes = activeHealthyBindingResourceCodes
    .filter(bindingResourceCodes => bindingResourceCodes.length > 0);
  if (
    resourceCodes.length > 0
    && explicitBindingResourceCodes.length > 0
    && !explicitBindingResourceCodes.some(bindingResourceCodes => hasAnyOverlap(resourceCodes, bindingResourceCodes))
  ) {
    issues.push(createGroupRoutePreflightIssue(
      'group.bindings.no_resource_overlap',
      'warning',
      resourceCodes,
    ));
  }
  if (
    activeHealthyBindings.some(binding => (
      normalizePreflightStringList(binding.apiScope).length === 0
      && normalizePreflightStringList(binding.capabilities).length === 0
    ))
  ) {
    issues.push(createGroupRoutePreflightIssue('group.bindings.missing_scope_metadata', 'warning'));
  }

  return {
    ready: issues.every(issue => issue.severity !== 'blocking'),
    issueCodes: issues.map(issue => issue.code),
    issues,
    resourceCodes,
    resourceGroupCodes,
    configuredResourceAccessCount: resourceCodes.length + resourceGroupCodes.length,
    apiScope,
    capabilities,
    activeHealthyBindingCount: activeHealthyBindings.length,
  };
}

export class GroupService {
  static async fetchGroups(filters: GroupListFilters = {}): Promise<GroupListPage> {
    const result = await getClawRouterBackendSdkClient().ai.channelGroups.list(toGroupListQueryParams(filters));
    ensureSdkworkApiSuccess(result, 'Failed to fetch groups');
    const data = readApiRecord(result);
    return {
      groups: readRequiredApiItems(result, 'Failed to fetch groups').map(normalizeGroup),
      total: readGroupListPageTotal(data),
    };
  }

  static async addGroup(group: GroupCreateInput): Promise<GroupData> {
    const result = await getClawRouterBackendSdkClient().ai.channelGroups.create(
      toCreateGroupRequest(group),
    );
    ensureSdkworkApiSuccess(result, 'Failed to add group');
    return normalizeGroup(readRequiredApiItem(result, 'Created group response is missing data'));
  }

  static async updateGroup(id: string, updates: GroupUpdateInput): Promise<GroupData> {
    const channelGroupId = requiredSafePathSegment(id, 'channelGroupId');
    const result = await getClawRouterBackendSdkClient().ai.channelGroups.update(
      channelGroupId,
      toUpdateGroupRequest(updates),
    );
    ensureSdkworkApiSuccess(result, 'Failed to update group');
    return normalizeGroup(readRequiredApiItem(result, 'Updated group response is missing data'));
  }

  static async deleteGroup(id: string): Promise<boolean> {
    const channelGroupId = requiredSafePathSegment(id, 'channelGroupId');
    const result = await getClawRouterBackendSdkClient().ai.channelGroups.delete(channelGroupId);
    ensureDeleteResult(result, 'Group delete confirmation is required');
    return true;
  }

  static async fetchGroupChannelBindings(groupId: string): Promise<GroupChannelBindingData[]> {
    const channelGroupId = requiredSafePathSegment(groupId, 'channelGroupId');
    const result = await getClawRouterBackendSdkClient().ai.channelGroups.channelBindings.list(
      channelGroupId,
    );
    ensureSdkworkApiSuccess(result, 'Failed to fetch group channel bindings');
    return readRequiredApiItems(result, 'Failed to fetch group channel bindings')
      .map(normalizeGroupChannelBinding);
  }

  static async fetchGroupRouteExplain(groupId: string): Promise<GroupRouteExplainResult> {
    const channelGroupId = requiredSafePathSegment(groupId, 'channelGroupId');
    const result = await getClawRouterBackendSdkClient().ai.channelGroups.routeExplain.retrieve(
      channelGroupId,
    );
    ensureSdkworkApiSuccess(result, 'Failed to fetch group route explain');
    return normalizeGroupRouteExplain(readApiRecord(result));
  }

  static async fetchRuntimeRouteExplain(
    request: GroupRuntimeRouteExplainRequest,
  ): Promise<GroupRuntimeRouteExplainResult> {
    const result = await getClawRouterBackendSdkClient().ai.routeExplain.explain(
      toRuntimeRouteExplainRequest(request),
    );
    ensureSdkworkApiSuccess(result, 'Failed to fetch runtime route explain');
    return normalizeRuntimeRouteExplain(readApiRecord(result));
  }

  static async replaceGroupChannelBindings(
    groupId: string,
    items: GroupChannelBindingInput[],
  ): Promise<GroupChannelBindingData[]> {
    const channelGroupId = requiredSafePathSegment(groupId, 'channelGroupId');
    const result = await getClawRouterBackendSdkClient().ai.channelGroups.channelBindings.update(
      channelGroupId,
      toReplaceChannelBindingsRequest(items),
    );
    ensureSdkworkApiSuccess(result, 'Failed to save group channel bindings');
    return readRequiredApiItems(result, 'Failed to save group channel bindings')
      .map(normalizeGroupChannelBinding);
  }

  static async fetchAssignableChannels(
    filters: AssignableChannelListFilters = {},
  ): Promise<AssignableChannelListPage> {
    const result = await getClawRouterBackendSdkClient().integration.channels.list(
      toAssignableChannelListQueryParams(filters),
    );
    ensureSdkworkApiSuccess(result, 'Failed to fetch channels');
    const data = readApiRecord(result);
    return {
      channels: readRequiredApiItems(result, 'Failed to fetch channels')
        .map(normalizeGroupChannelOption),
      total: readListPageTotal(data, 'Channel list total is required'),
    };
  }

  static async fetchAssignableResourceGroups(
    filters: AssignableResourceGroupListFilters = {},
  ): Promise<AssignableResourceGroupListPage> {
    const result = await getModelsBackendSdkClient().ai.aiResourceGroups.list(
      toAssignableResourceGroupListQueryParams(filters),
    );
    ensureSdkworkApiSuccess(result, 'Failed to fetch resource groups');
    const data = readApiRecord(result);
    return {
      resourceGroups: readRequiredApiItems(result, 'Failed to fetch resource groups')
        .map(normalizeResourceGroupOption),
      total: readListPageTotal(data, 'Resource group list total is required'),
    };
  }

  static async fetchAssignableResources(
    filters: AssignableResourceListFilters = {},
  ): Promise<AssignableAiResourceListPage> {
    const result = await getModelsBackendSdkClient().ai.aiResources.list(
      toAssignableResourceListQueryParams(filters),
    );
    ensureSdkworkApiSuccess(result, 'Failed to fetch AI resources');
    const data = readApiRecord(result);
    return {
      resources: readRequiredApiItems(result, 'Failed to fetch AI resources')
        .map(normalizeAiResourceOption),
      total: readListPageTotal(data, 'AI resource list total is required'),
    };
  }
}

function normalizePreflightStringList(values: readonly string[] | undefined): string[] {
  return Array.from(new Set((values ?? []).map(value => value.trim()).filter(Boolean)));
}

function hasAnyOverlap(left: readonly string[], right: readonly string[]): boolean {
  const rightCodes = new Set(right);
  return left.some(value => rightCodes.has(value));
}

function createGroupRoutePreflightIssue(
  code: GroupRoutePreflightIssueCode,
  severity: GroupRoutePreflightSeverity,
  details?: string[],
): GroupRoutePreflightIssue {
  return {
    code,
    severity,
    messageKey: routePreflightMessageKeys[code],
    details,
  };
}

function toCreateGroupRequest(group: GroupCreateInput): ChannelGroupCreateRequestWithResourceAccess {
  const request = baseChannelGroupRequest(group);
  if (group.priceReferenceMode === 'official_price') {
    request.officialPriceMultiplier = optionalPositiveNumber(
      group.officialPriceMultiplier,
      'officialPriceMultiplier',
    );
  } else {
    request.rateMultiplier = optionalPositiveNumber(group.rateMultiplier, 'rateMultiplier');
  }
  request.resourceGroupCodes = normalizedOptionalResourceCodes(group.resourceGroupCodes);
  request.resourceCodes = normalizedOptionalResourceCodes(group.resourceCodes);
  return request;
}

function toUpdateGroupRequest(updates: GroupUpdateInput): ChannelGroupUpdateRequestWithResourceAccess {
  const request: ChannelGroupUpdateRequestWithResourceAccess = pruneUndefined({
    groupName:
      updates.groupName === undefined ? undefined : requiredText(updates.groupName, 'groupName'),
    priceReferenceMode:
      updates.priceReferenceMode === undefined
        ? undefined
        : toPriceReferenceMode(updates.priceReferenceMode),
    groupType:
      updates.groupType === undefined ? undefined : toBackendGroupType(updates.groupType),
    capacity:
      updates.capacity === undefined ? undefined : toCapacityRequest(updates.capacity.total),
    status: updates.status === undefined ? undefined : toBackendStatus(updates.status),
    resourceGroupCodes: updates.resourceGroupCodes === undefined
      ? undefined
      : normalizedOptionalResourceCodes(updates.resourceGroupCodes),
    resourceCodes: updates.resourceCodes === undefined
      ? undefined
      : normalizedOptionalResourceCodes(updates.resourceCodes),
  });
  if (updates.rateMultiplier !== undefined) {
    request.rateMultiplier = optionalPositiveNumber(updates.rateMultiplier, 'rateMultiplier');
  }
  if (updates.officialPriceMultiplier !== undefined) {
    request.officialPriceMultiplier = optionalPositiveNumber(
      updates.officialPriceMultiplier,
      'officialPriceMultiplier',
    );
  }
  return request;
}

function baseChannelGroupRequest(
  group: Pick<
    GroupCreateInput,
    'groupName' | 'priceReferenceMode' | 'groupType' | 'capacity' | 'status'
  >,
): ChannelGroupCreateRequestWithResourceAccess {
  return {
    groupName: requiredText(group.groupName, 'groupName'),
    groupCode: generateUniqueGroupCode(),
    priceReferenceMode: toPriceReferenceMode(group.priceReferenceMode),
    groupType: toBackendGroupType(group.groupType),
    capacity: toCapacityRequest(group.capacity.total),
    status: toBackendStatus(group.status),
  };
}

function generateUniqueGroupCode(): string {
  groupCodeFallbackCounter = (groupCodeFallbackCounter + 1) % 1_679_616;
  return `group-local-${groupCodeFallbackCounter.toString(36).padStart(8, '0')}`;
}

function toReplaceChannelBindingsRequest(
  items: GroupChannelBindingInput[],
): {
  items: Array<{
    channelId: string;
    priority?: number;
    weight?: number;
    status?: GroupChannelBindingData['status'];
    resourceCodes?: string[];
    apiScope?: string[];
    capabilities?: string[];
  }>;
} {
  return {
    items: items.map((item) => pruneUndefined({
      channelId: requiredText(item.channelId, 'channelId'),
      priority: optionalNonNegativeInteger(item.priority, 'priority'),
      weight: optionalNonNegativeInteger(item.weight, 'weight'),
      status: item.status === undefined ? undefined : toBackendBindingStatus(item.status),
      resourceCodes: item.resourceCodes === undefined ? undefined : normalizedOptionalResourceCodes(item.resourceCodes),
      apiScope: item.apiScope === undefined ? undefined : normalizedOptionalStringArray(item.apiScope),
      capabilities: item.capabilities === undefined ? undefined : normalizedOptionalStringArray(item.capabilities),
    })),
  };
}

function toRuntimeRouteExplainRequest(
  request: GroupRuntimeRouteExplainRequest,
): AdminRuntimeRouteExplainRequest {
  return pruneUndefined({
    apiKeyId: requiredText(request.apiKeyId, 'apiKeyId'),
    channelGroupId: optionalText(request.channelGroupId),
    resourceCode: optionalText(request.resourceCode),
    catalogKey: optionalText(request.catalogKey),
    model: optionalText(request.model),
    apiCode: optionalText(request.apiCode),
    capability:
      request.capability === undefined
        ? undefined
        : readRuntimeRouteCapability(request.capability),
    billingMeter: optionalText(request.billingMeter),
    routeKey: optionalText(request.routeKey),
  });
}

function toCapacityRequest(total: number): Record<string, unknown> & { total: number } {
  const normalized = optionalPositiveInteger(total, 'capacity.total');
  if (normalized === undefined) {
    throw new Error('capacity.total is required');
  }
  return { total: normalized };
}

function toPriceReferenceMode(value: GroupPriceReferenceMode): GroupPriceReferenceMode {
  if (value === 'multiplier' || value === 'official_price') {
    return value;
  }
  throw new Error('priceReferenceMode must be multiplier or official_price');
}

function toBackendGroupType(type: GroupData['groupType']): GroupData['groupType'] {
  if (type === 'public' || type === 'dedicated') {
    return type;
  }
  throw new Error('groupType must be public or dedicated');
}

function toBackendStatus(status: GroupData['status']): GroupData['status'] {
  if (status === 'active' || status === 'disabled') {
    return status;
  }
  throw new Error('status must be active or disabled');
}

function toBackendBindingStatus(
  status: GroupChannelBindingData['status'],
): NonNullable<GroupChannelBindingInput['status']> {
  if (status === 'active' || status === 'disabled') {
    return status;
  }
  throw new Error('status must be active or disabled');
}

function requiredText(value: string, fieldName: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required`);
  }
  return normalized;
}

function optionalText(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function optionalPositiveNumber(value: number | undefined, fieldName: string): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${fieldName} must be greater than zero`);
  }
  return value;
}

function optionalPositiveInteger(value: number | undefined, fieldName: string): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < 1) {
    throw new Error(`${fieldName} must be a positive integer`);
  }
  return value;
}

function optionalNonNegativeInteger(value: number | undefined, fieldName: string): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
    throw new Error(`${fieldName} must be a non-negative integer`);
  }
  return value;
}

function normalizedOptionalStringArray(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function normalizedOptionalResourceCodes(values: string[] | undefined): string[] | undefined {
  if (values === undefined) {
    return undefined;
  }
  const normalized = normalizedOptionalStringArray(values);
  validateResourceCodes(normalized);
  return normalized;
}

function validateResourceCodes(values: string[]): void {
  for (const code of values) {
    if (!/^[A-Za-z0-9._-]+$/.test(code)) {
      throw new Error(`Unsupported AI resource code: ${code}`);
    }
  }
}

function pruneUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as T;
}

function ensureDeleteResult(result: unknown, message: string): void {
  ensureSdkworkApiSuccess(result, message);
  if (readBoolean(readApiRecord(result), 'deleted') !== true) {
    throw new Error(message);
  }
}

function toGroupListQueryParams(filters: GroupListFilters = {}): {
  page?: number;
  pageSize?: number;
  q?: string;
} {
  return toListQueryParams(
    filters,
    MAX_GROUP_LIST_PAGE_SIZE,
    MAX_GROUP_LIST_QUERY_TEXT_LENGTH,
  );
}

function toAssignableChannelListQueryParams(filters: AssignableChannelListFilters = {}): {
  page?: number;
  pageSize?: number;
  q?: string;
} {
  return toListQueryParams(
    filters,
    MAX_ASSIGNABLE_CHANNEL_LIST_PAGE_SIZE,
    MAX_ASSIGNABLE_CHANNEL_LIST_QUERY_TEXT_LENGTH,
  );
}

function toAssignableResourceGroupListQueryParams(filters: AssignableResourceGroupListFilters = {}): {
  page?: number;
  pageSize?: number;
  q?: string;
} {
  return toListQueryParams(
    filters,
    MAX_ASSIGNABLE_RESOURCE_GROUP_LIST_PAGE_SIZE,
    MAX_ASSIGNABLE_RESOURCE_LIST_QUERY_TEXT_LENGTH,
  );
}

function toAssignableResourceListQueryParams(filters: AssignableResourceListFilters = {}): {
  page?: number;
  pageSize?: number;
  q?: string;
} {
  return toListQueryParams(
    filters,
    MAX_ASSIGNABLE_RESOURCE_LIST_PAGE_SIZE,
    MAX_ASSIGNABLE_RESOURCE_LIST_QUERY_TEXT_LENGTH,
  );
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

function readGroupListPageTotal(data: ApiRecord): number {
  return readListPageTotal(data, 'Group list total is required');
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

function normalizeGroup(value: unknown): GroupData {
  const item = readRequiredRecord(value, 'Group record is required');
  const accountCount = readRequiredNestedRecord(item, 'accountCount', 'Group account count is required');
  const capacity = readRequiredNestedRecord(item, 'capacity', 'Group capacity is required');
  const usage = readRequiredNestedRecord(item, 'usage', 'Group usage is required');
  return {
    id: readRequiredString(item, 'id', 'Group id is required'),
    groupCode: readRequiredString(item, 'groupCode', 'Group code is required'),
    groupName: readRequiredString(item, 'groupName', 'Group name is required'),
    providerCode: readDisplayString(item, 'providerCode', 'unknown'),
    priceReferenceMode: readPriceReferenceMode(item),
    rateMultiplier: readRequiredNumber(item, 'rateMultiplier', 'Group rate multiplier is required'),
    officialPriceMultiplier: readNullableNumber(item, 'officialPriceMultiplier'),
    groupType: readGroupType(item),
    accountCount: {
      available: readRequiredNonNegativeNumber(
        accountCount,
        'available',
        'Group available account count is required',
      ),
      total: readRequiredNonNegativeNumber(
        accountCount,
        'total',
        'Group total account count is required',
      ),
    },
    capacity: {
      used: readRequiredNonNegativeNumber(capacity, 'used', 'Group used capacity is required'),
      total: readRequiredNonNegativeNumber(capacity, 'total', 'Group total capacity is required'),
    },
    usage: {
      today: readRequiredNonNegativeNumber(usage, 'today', 'Group today usage is required'),
      total: readRequiredNonNegativeNumber(usage, 'total', 'Group total usage is required'),
    },
    resourceGroupCodes: readStringArray(item, 'resourceGroupCodes'),
    resourceCodes: readStringArray(item, 'resourceCodes'),
    status: readGroupStatus(item),
  };
}

function normalizeGroupChannelBinding(value: unknown): GroupChannelBindingData {
  const item = readRequiredRecord(value, 'Group channel binding record is required');
  return {
    id: readRequiredString(item, 'id', 'Group channel binding id is required'),
    channelGroupId: readRequiredString(
      item,
      'channelGroupId',
      'Group channel binding channel group id is required',
    ),
    channelId: readRequiredString(item, 'channelId', 'Group channel binding channel id is required'),
    channelName: readRequiredString(item, 'channelName', 'Group channel binding channel name is required'),
    providerCode: readRequiredString(item, 'providerCode', 'Group channel binding provider code is required'),
    providerName: readRequiredString(item, 'providerName', 'Group channel binding provider name is required'),
    channelCode: readRequiredString(item, 'channelCode', 'Group channel binding channel code is required'),
    resourceCodes: readStringArray(item, 'resourceCodes'),
    apiScope: readStringArray(item, 'apiScope'),
    capabilities: readStringArray(item, 'capabilities'),
    priority: readRequiredNonNegativeInteger(item, 'priority', 'Group channel binding priority is required'),
    weight: readRequiredNonNegativeInteger(item, 'weight', 'Group channel binding weight is required'),
    status: readBindingStatus(item),
    healthStatus: readBindingHealthStatus(item),
  };
}

function normalizeGroupRouteExplain(value: unknown): GroupRouteExplainResult {
  const item = readRequiredRecord(value, 'Group route explain record is required');
  const source = readRequiredString(item, 'source', 'Group route explain source is required');
  if (source !== 'backend_config') {
    throw new Error(`Unsupported group route explain source: ${source}`);
  }
  const issues = readRecordArray(item, 'issues').map(normalizeGroupRouteExplainIssue);
  const issueCodes = readStringArray(item, 'issueCodes')
    .map(readRoutePreflightIssueCode);
  return {
    source,
    ready: readBoolean(item, 'ready'),
    issueCodes,
    issues,
    resourceCodes: readStringArray(item, 'resourceCodes'),
    resourceGroupCodes: readStringArray(item, 'resourceGroupCodes'),
    effectiveResourceCodes: readStringArray(item, 'effectiveResourceCodes'),
    configuredResourceAccessCount: readRequiredNonNegativeInteger(
      item,
      'configuredResourceAccessCount',
      'Group route explain configured resource access count is required',
    ),
    configuredResourceGroupAccessCount: readRequiredNonNegativeInteger(
      item,
      'configuredResourceGroupAccessCount',
      'Group route explain configured resource group access count is required',
    ),
    apiScope: readStringArray(item, 'apiScope'),
    capabilities: readStringArray(item, 'capabilities'),
    activeHealthyBindingCount: readRequiredNonNegativeInteger(
      item,
      'activeHealthyBindingCount',
      'Group route explain active healthy binding count is required',
    ),
    routableBindingCount: readRequiredNonNegativeInteger(
      item,
      'routableBindingCount',
      'Group route explain routable binding count is required',
    ),
  };
}

function normalizeGroupRouteExplainIssue(value: unknown): GroupRoutePreflightIssue {
  const item = readRequiredRecord(value, 'Group route explain issue record is required');
  const code = readRoutePreflightIssueCode(
    readRequiredString(item, 'code', 'Group route explain issue code is required'),
  );
  const severity = readRoutePreflightSeverity(
    readRequiredString(item, 'severity', 'Group route explain issue severity is required'),
  );
  return createGroupRoutePreflightIssue(code, severity, readStringArray(item, 'details'));
}

function normalizeRuntimeRouteExplain(value: unknown): GroupRuntimeRouteExplainResult {
  const item = readRequiredRecord(value, 'Runtime route explain record is required');
  const source = readRequiredString(item, 'source', 'Runtime route explain source is required');
  if (source !== 'runtime_selector') {
    throw new Error(`Unsupported runtime route explain source: ${source}`);
  }
  return {
    source,
    ready: readBoolean(item, 'ready'),
    resourceCode: readRequiredString(item, 'resourceCode', 'Runtime route explain resource code is required'),
    catalogKey: readNullableString(item, 'catalogKey'),
    model: readNullableString(item, 'model'),
    apiCode: readRequiredString(item, 'apiCode', 'Runtime route explain API code is required'),
    capability: readRuntimeRouteCapability(
      readRequiredString(item, 'capability', 'Runtime route explain capability is required'),
    ),
    billingMeter: readRequiredString(item, 'billingMeter', 'Runtime route explain billing meter is required'),
    apiKeyId: readRequiredString(item, 'apiKeyId', 'Runtime route explain API key id is required'),
    channelGroupId: readRequiredString(
      item,
      'channelGroupId',
      'Runtime route explain channel group id is required',
    ),
    groupCode: readRequiredString(item, 'groupCode', 'Runtime route explain group code is required'),
    pricingPlanCode: readRequiredString(
      item,
      'pricingPlanCode',
      'Runtime route explain pricing plan code is required',
    ),
    candidateCount: readRequiredNonNegativeInteger(
      item,
      'candidateCount',
      'Runtime route explain candidate count is required',
    ),
    selectedCandidates: readRecordArray(item, 'selectedCandidates').map(normalizeRuntimeRouteExplainCandidate),
    blockedReasons: readRecordArray(item, 'blockedReasons').map(normalizeRuntimeRouteExplainIssue),
    warnings: readRecordArray(item, 'warnings').map(normalizeRuntimeRouteExplainIssue),
    policyId: readNullableString(item, 'policyId'),
    ruleId: readNullableString(item, 'ruleId'),
    policySnapshotVersion: readRequiredString(
      item,
      'policySnapshotVersion',
      'Runtime route explain policy snapshot version is required',
    ),
  };
}

function normalizeRuntimeRouteExplainCandidate(value: unknown): GroupRuntimeRouteExplainCandidate {
  const item = readRequiredRecord(value, 'Runtime route explain candidate record is required');
  return {
    kind: readRuntimeRouteCandidateKind(
      readRequiredString(item, 'kind', 'Runtime route explain candidate kind is required'),
    ),
    providerCode: readRequiredString(
      item,
      'providerCode',
      'Runtime route explain candidate provider code is required',
    ),
    channelId: readRequiredString(item, 'channelId', 'Runtime route explain candidate channel id is required'),
    channelGroupId: readRequiredString(
      item,
      'channelGroupId',
      'Runtime route explain candidate channel group id is required',
    ),
    channelGroupCode: readRequiredString(
      item,
      'channelGroupCode',
      'Runtime route explain candidate channel group code is required',
    ),
    pricingPlanCode: readRequiredString(
      item,
      'pricingPlanCode',
      'Runtime route explain candidate pricing plan code is required',
    ),
    policyId: readNullableString(item, 'policyId'),
    ruleId: readNullableString(item, 'ruleId'),
    apiCode: readRequiredString(item, 'apiCode', 'Runtime route explain candidate API code is required'),
    catalogKey: readNullableString(item, 'catalogKey'),
    requestedModel: readNullableString(item, 'requestedModel'),
    providerModel: readNullableString(item, 'providerModel'),
    regionCode: readString(item, 'regionCode'),
    credentialId: readNullableString(item, 'credentialId'),
    credentialRotation: readNullableString(item, 'credentialRotation'),
    timeoutMs: readNullableNonNegativeInteger(item, 'timeoutMs'),
  };
}

function normalizeRuntimeRouteExplainIssue(value: unknown): GroupRuntimeRouteExplainIssue {
  const item = readRequiredRecord(value, 'Runtime route explain issue record is required');
  return {
    code: readRuntimeRouteExplainIssueCode(
      readRequiredString(item, 'code', 'Runtime route explain issue code is required'),
    ),
    severity: readRuntimeRouteExplainSeverity(
      readRequiredString(item, 'severity', 'Runtime route explain issue severity is required'),
    ),
    message: readRequiredString(item, 'message', 'Runtime route explain issue message is required'),
  };
}

function normalizeGroupChannelOption(value: unknown): GroupChannelOption {
  const item = readRequiredRecord(value, 'Channel record is required');
  const id = readRequiredString(item, 'id', 'Channel id is required');
  const providerCode = readDisplayString(item, 'providerCode', readDisplayString(item, 'vendor', 'unknown'));
  const providerName = readDisplayString(item, 'providerName', readDisplayString(item, 'vendor', providerCode));
  const status = readChannelStatus(item);
  return {
    id,
    name: readRequiredString(item, 'name', 'Channel name is required'),
    providerCode,
    providerName,
    channelCode: readDisplayString(item, 'channelCode', id),
    resourceCodes: readStringArray(item, 'resourceCodes'),
    apiScope: readStringArray(item, 'apiScope'),
    capabilities: readStringArray(item, 'capabilities'),
    status,
    healthStatus: status === 'error' ? 'error' : 'active',
  };
}

function normalizeResourceGroupOption(value: unknown): GroupResourceGroupOption {
  const item = readRequiredRecord(value, 'Resource group record is required');
  return {
    id: readRequiredString(item, 'id', 'Resource group id is required'),
    groupCode: readRequiredString(item, 'groupCode', 'Resource group code is required'),
    groupName: readRequiredString(item, 'groupName', 'Resource group name is required'),
    groupType: readResourceGroupType(item),
    selectionMode: readResourceGroupSelectionMode(item),
    description: readNullableString(item, 'description'),
    resourceCount: readRequiredNonNegativeNumber(
      item,
      'resourceCount',
      'Resource group resource count is required',
    ),
    status: readResourceAccessStatus(item),
  };
}

function normalizeAiResourceOption(value: unknown): GroupAiResourceOption {
  const item = readRequiredRecord(value, 'AI resource record is required');
  return {
    id: readRequiredString(item, 'id', 'AI resource id is required'),
    resourceCode: readRequiredString(item, 'resourceCode', 'AI resource code is required'),
    displayName: readRequiredString(item, 'displayName', 'AI resource display name is required'),
    resourceType: readRequiredString(item, 'resourceType', 'AI resource type is required'),
    vendorCode: readNullableString(item, 'vendorCode'),
    modalityCode: readNullableString(item, 'modalityCode'),
    apiEndpointCode: readNullableString(item, 'apiEndpointCode'),
    catalogKey: readNullableString(item, 'catalogKey'),
    model: readNullableString(item, 'model'),
    providerNativeModel: readNullableString(item, 'providerNativeModel'),
    status: readResourceAccessStatus(item),
  };
}

function readRequiredRecord(value: unknown, message: string): ApiRecord {
  if (!isRecord(value)) {
    throw new Error(message);
  }
  return value;
}

function readRoutePreflightIssueCode(value: string): GroupRoutePreflightIssueCode {
  if (value in routePreflightMessageKeys) {
    return value as GroupRoutePreflightIssueCode;
  }
  throw new Error(`Unsupported group route explain issue code: ${value}`);
}

function readRoutePreflightSeverity(value: string): GroupRoutePreflightSeverity {
  if (value === 'blocking' || value === 'warning' || value === 'info') {
    return value;
  }
  throw new Error(`Unsupported group route explain issue severity: ${value}`);
}

function readRuntimeRouteCapability(value: string): GroupRuntimeRouteCapability {
  if (
    value === 'chat'
    || value === 'image'
    || value === 'audio'
    || value === 'music'
    || value === 'video'
    || value === 'embedding'
    || value === 'rerank'
    || value === 'network'
  ) {
    return value;
  }
  throw new Error(`Unsupported runtime route explain capability: ${value}`);
}

function readRuntimeRouteCandidateKind(value: string): GroupRuntimeRouteExplainCandidate['kind'] {
  if (value === 'model' || value === 'channel') {
    return value;
  }
  throw new Error(`Unsupported runtime route explain candidate kind: ${value}`);
}

function readRuntimeRouteExplainIssueCode(value: string): GroupRuntimeRouteExplainIssueCode {
  if (value === 'route.unavailable' || value === 'pricing.unavailable') {
    return value;
  }
  throw new Error(`Unsupported runtime route explain issue code: ${value}`);
}

function readRuntimeRouteExplainSeverity(value: string): GroupRoutePreflightSeverity {
  if (value === 'blocking' || value === 'warning' || value === 'info') {
    return value;
  }
  throw new Error(`Unsupported runtime route explain issue severity: ${value}`);
}

function readRequiredNestedRecord(record: ApiRecord, key: string, message: string): ApiRecord {
  return readRequiredRecord(record[key], message);
}

function readDisplayString(record: ApiRecord, key: string, fallback: string): string {
  const value = readString(record, key)?.trim();
  return value ? value : fallback;
}

function readNullableString(record: ApiRecord, key: string): string | null {
  const value = readString(record, key)?.trim();
  return value ? value : null;
}

function readNullableNumber(record: ApiRecord, key: string): number | null {
  const value = record[key];
  if (value === null || value === undefined || value === '') {
    return null;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    const normalized = value.trim();
    if (!normalized) {
      return null;
    }
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function readNullableNonNegativeInteger(record: ApiRecord, key: string): number | null {
  const value = record[key];
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = typeof value === 'number'
    ? value
    : typeof value === 'string'
      ? Number(value.trim())
      : Number.NaN;
  if (!Number.isFinite(parsed) || parsed < 0 || !Number.isInteger(parsed)) {
    return null;
  }
  return parsed;
}

function readPriceReferenceMode(item: ApiRecord): GroupPriceReferenceMode {
  const value = readString(item, 'priceReferenceMode')?.trim().toLowerCase();
  if (value === 'multiplier') {
    return 'multiplier';
  }
  if (value === 'official_price' || value === 'official_reference') {
    return 'official_price';
  }
  throw new Error(value ? `Unsupported group price reference mode: ${value}` : 'Group price reference mode is required');
}

function readGroupType(item: ApiRecord): GroupData['groupType'] {
  const type = readString(item, 'groupType');
  if (type === 'public' || type === 'dedicated') {
    return type;
  }
  throw new Error(type ? `Unsupported group type: ${type}` : 'Group type is required');
}

function readGroupStatus(item: ApiRecord): GroupData['status'] {
  const status = readString(item, 'status');
  if (status === 'active' || status === 'disabled') {
    return status;
  }
  throw new Error(status ? `Unsupported group status: ${status}` : 'Group status is required');
}

function readBindingStatus(item: ApiRecord): GroupChannelBindingData['status'] {
  const status = readString(item, 'status');
  if (status === 'active' || status === 'disabled') {
    return status;
  }
  throw new Error(
    status
      ? `Unsupported group channel binding status: ${status}`
      : 'Group channel binding status is required',
  );
}

function readBindingHealthStatus(item: ApiRecord): GroupChannelBindingData['healthStatus'] {
  const status = readString(item, 'healthStatus');
  if (status === 'active' || status === 'error') {
    return status;
  }
  throw new Error(
    status
      ? `Unsupported group channel binding health status: ${status}`
      : 'Group channel binding health status is required',
  );
}

function readChannelStatus(item: ApiRecord): GroupChannelOption['status'] {
  const status = readString(item, 'status');
  if (status === 'active' || status === 'disabled' || status === 'error') {
    return status;
  }
  throw new Error(status ? `Unsupported channel status: ${status}` : 'Channel status is required');
}

function readResourceGroupType(item: ApiRecord): GroupResourceGroupOption['groupType'] {
  const type = readString(item, 'groupType');
  if (type === 'api_group') {
    return type;
  }
  throw new Error(type ? `Unsupported resource group type: ${type}` : 'Resource group type is required');
}

function readResourceGroupSelectionMode(item: ApiRecord): GroupResourceGroupOption['selectionMode'] {
  const mode = readString(item, 'selectionMode');
  if (mode === 'manual' || mode === 'all' || mode === 'any' || mode === 'dynamic_all_api') {
    return mode;
  }
  throw new Error(
    mode
      ? `Unsupported resource group selection mode: ${mode}`
      : 'Resource group selection mode is required',
  );
}

function readResourceAccessStatus(item: ApiRecord): GroupResourceGroupOption['status'] {
  const status = readString(item, 'status');
  if (status === 'active' || status === 'disabled' || status === 'inactive') {
    return status;
  }
  throw new Error(status ? `Unsupported resource access status: ${status}` : 'Resource access status is required');
}

function readRequiredNonNegativeInteger(item: ApiRecord, key: string, message: string): number {
  const value = readRequiredNonNegativeNumber(item, key, message);
  if (!Number.isInteger(value)) {
    throw new Error(message);
  }
  return value;
}
