import {
  ensureSdkworkApiSuccess,
  isRecord,
  optionalBoundedPositiveInteger as optionalQueryPageSize,
  optionalPositiveInteger as optionalQueryPage,
  optionalText as optionalQueryText,
  readApiRecord,
  readRequiredApiItems,
  readRequiredApiItem,
  readRequiredNonNegativeNumber,
  readRequiredNumber,
  requiredSafePathSegment,
  readRequiredString,
  readString,
  type ApiRecord,
} from '@sdkwork/clawroutes-pc-commons/runtime';
import { getClawRouterBackendSdkClient } from '@sdkwork/clawrouter-pc-admin-core/sdk';
import type {
  AdminFirewallRuleCreateRequest,
  AdminIpLimitCreateRequest,
  AdminModelLimitCreateRequest,
  AdminTokenLimitCreateRequest,
} from '@sdkwork/clawrouter-pc-admin-core/sdk';

export interface IpLimitRule {
  id: string;
  ruleName: string;
  targetIp: string;
  rps: number;
  rpm: number;
  blockDuration: string;
  status: 'active' | 'inactive';
}

export interface TokenLimitRule {
  id: string;
  keyPrefix: string;
  user: string;
  rps: number;
  rpd: number;
  burst: number;
  status: 'active' | 'exhausted';
}

export interface ModelLimitRule {
  id: string;
  model: string;
  accountGroup: string;
  accountGroupId?: string;
  accountGroupName?: string;
  rpm: number;
  tpm: number;
  status: 'active' | 'inactive';
}

export interface FirewallRule {
  id: string;
  type: string;
  value: string;
  reason: string;
  time: string;
}

export type IpLimitCreateInput = {
  ruleName: string;
  targetIp: string;
  rps: number;
  rpm: number;
  blockDuration: string;
};

export type TokenLimitCreateInput = {
  keyPrefix: string;
  user: string;
  rps: number;
  rpd: number;
  burst: number;
};

export type ModelLimitCreateInput = {
  model: string;
  accountGroup: string;
  rpm: number;
  tpm: number;
};

export type FirewallCreateInput = {
  type: string;
  value: string;
  reason: string;
};

export type RateLimitListFilters = {
  page?: number;
  pageSize?: number;
  q?: string;
  searchQuery?: string;
};

export type RateLimitListPage<T> = {
  items: T[];
  total: number;
};

export const RATE_LIMIT_DASHBOARD_SAMPLE_PAGE_SIZE = 200;

const MAX_RATE_LIMIT_LIST_PAGE_SIZE = 200;
const MAX_RATE_LIMIT_LIST_QUERY_TEXT_LENGTH = 128;

export class RateLimitService {
  static async fetchIpLimits(filters: RateLimitListFilters = {}): Promise<RateLimitListPage<IpLimitRule>> {
    return fetchOffsetListPage(
      () => getClawRouterBackendSdkClient().system.rateLimits.ip.list(toOffsetListSdkParams(filters)),
      normalizeIpLimit,
      'Failed to fetch IP limits',
    );
  }

  static async addIpLimit(rule: IpLimitCreateInput): Promise<IpLimitRule> {
    const result = await getClawRouterBackendSdkClient().system.rateLimits.ip.create(
      toCreateIpLimitRequest(rule),
    );
    ensureSdkworkApiSuccess(result, 'Failed to add IP limit');
    return normalizeIpLimit(readRequiredApiItem(result, 'Created IP limit response is missing data'));
  }

  static async fetchTokenLimits(filters: RateLimitListFilters = {}): Promise<RateLimitListPage<TokenLimitRule>> {
    return fetchOffsetListPage(
      () => getClawRouterBackendSdkClient().system.rateLimits.apiKeys.list(toOffsetListSdkParams(filters)),
      normalizeTokenLimit,
      'Failed to fetch token limits',
    );
  }

  static async addTokenLimit(rule: TokenLimitCreateInput): Promise<TokenLimitRule> {
    const result = await getClawRouterBackendSdkClient().system.rateLimits.apiKeys.create(
      toCreateTokenLimitRequest(rule),
    );
    ensureSdkworkApiSuccess(result, 'Failed to add token limit');
    return normalizeTokenLimit(readRequiredApiItem(result, 'Created token limit response is missing data'));
  }

  static async fetchModelLimits(filters: RateLimitListFilters = {}): Promise<RateLimitListPage<ModelLimitRule>> {
    return fetchOffsetListPage(
      () => getClawRouterBackendSdkClient().system.rateLimits.models.list(toOffsetListSdkParams(filters)),
      normalizeModelLimit,
      'Failed to fetch model limits',
    );
  }

  static async addModelLimit(rule: ModelLimitCreateInput): Promise<ModelLimitRule> {
    const result = await getClawRouterBackendSdkClient().system.rateLimits.models.create(
      toCreateModelLimitRequest(rule),
    );
    ensureSdkworkApiSuccess(result, 'Failed to add model limit');
    return normalizeModelLimit(readRequiredApiItem(result, 'Created model limit response is missing data'));
  }

  static async fetchFirewalls(filters: RateLimitListFilters = {}): Promise<RateLimitListPage<FirewallRule>> {
    return fetchOffsetListPage(
      () => getClawRouterBackendSdkClient().system.firewalls.rules.list(toOffsetListSdkParams(filters)),
      normalizeFirewall,
      'Failed to fetch firewall rules',
    );
  }

  static async addFirewall(rule: FirewallCreateInput): Promise<FirewallRule> {
    const result = await getClawRouterBackendSdkClient().system.firewalls.rules.create(
      toCreateFirewallRequest(rule),
    );
    ensureSdkworkApiSuccess(result, 'Failed to add firewall rule');
    return normalizeFirewall(readRequiredApiItem(result, 'Created firewall rule response is missing data'));
  }

  static async removeFirewall(id: string): Promise<boolean> {
    await getClawRouterBackendSdkClient().system.firewalls.rules.delete(
      requiredSafePathSegment(id, 'firewallRuleId'),
    );
    return true;
  }
}

async function fetchOffsetListPage<T>(
  loadPage: () => Promise<unknown>,
  mapItem: (value: unknown) => T,
  errorMessage: string,
): Promise<RateLimitListPage<T>> {
  const result = await loadPage();
  ensureSdkworkApiSuccess(result, errorMessage);
  const data = readApiRecord(result);
  return {
    items: readRequiredApiItems(result, errorMessage).map(mapItem),
    total: readListPageTotal(data, `${errorMessage}: total is required`),
  };
}

function toOffsetListSdkParams(filters: RateLimitListFilters = {}): {
  page?: number;
  pageSize?: number;
  q?: string;
} | undefined {
  const page = optionalQueryPage(filters.page, 'page');
  const pageSize = optionalQueryPageSize(filters.pageSize, 'pageSize', MAX_RATE_LIMIT_LIST_PAGE_SIZE);
  const q = optionalQueryText(filters.q ?? filters.searchQuery, 'q', MAX_RATE_LIMIT_LIST_QUERY_TEXT_LENGTH);
  const params = {
    page,
    pageSize,
    q,
  };
  return Object.values(params).some((value) => value !== undefined) ? params : undefined;
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

  const items = data.items;
  if (Array.isArray(items)) {
    return items.length;
  }

  throw new Error(message);
}

function toCreateIpLimitRequest(rule: IpLimitCreateInput): AdminIpLimitCreateRequest {
  return {
    ruleName: requiredText(rule.ruleName, 'ruleName'),
    targetIp: requiredText(rule.targetIp, 'targetIp'),
    rps: positiveInteger(rule.rps, 'rps'),
    rpm: positiveInteger(rule.rpm, 'rpm'),
    blockDuration: requiredText(rule.blockDuration, 'blockDuration'),
  };
}

function toCreateTokenLimitRequest(rule: TokenLimitCreateInput): AdminTokenLimitCreateRequest {
  return {
    keyPrefix: requiredText(rule.keyPrefix, 'keyPrefix'),
    user: requiredText(rule.user, 'user'),
    rps: positiveInteger(rule.rps, 'rps'),
    rpd: positiveInteger(rule.rpd, 'rpd'),
    burst: positiveInteger(rule.burst, 'burst'),
  };
}

function toCreateModelLimitRequest(rule: ModelLimitCreateInput): AdminModelLimitCreateRequest {
  return {
    model: requiredText(rule.model, 'model'),
    accountGroup: requiredText(rule.accountGroup, 'accountGroup'),
    rpm: positiveInteger(rule.rpm, 'rpm'),
    tpm: String(positiveInteger(rule.tpm, 'tpm')),
  };
}

function toCreateFirewallRequest(rule: FirewallCreateInput): AdminFirewallRuleCreateRequest {
  return {
    type: requiredText(rule.type, 'type'),
    value: requiredText(rule.value, 'value'),
    reason: requiredText(rule.reason, 'reason'),
  };
}

function requiredText(value: string, fieldName: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required`);
  }
  return normalized;
}

function positiveInteger(value: number, fieldName: string): number {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(`${fieldName} must be a positive integer`);
  }
  return value;
}

function normalizeIpLimit(value: unknown): IpLimitRule {
  const item = readRequiredRecord(value, 'IP limit record is required');
  return {
    id: readRequiredString(item, 'id', 'IP limit id is required'),
    ruleName: readRequiredString(item, 'ruleName', 'IP limit rule name is required'),
    targetIp: readRequiredString(item, 'targetIp', 'IP limit target IP is required'),
    rps: readRequiredNumber(item, 'rps', 'IP limit rps is required'),
    rpm: readRequiredNumber(item, 'rpm', 'IP limit rpm is required'),
    blockDuration: readRequiredString(item, 'blockDuration', 'IP limit block duration is required'),
    status: readIpLimitStatus(item),
  };
}

function normalizeTokenLimit(value: unknown): TokenLimitRule {
  const item = readRequiredRecord(value, 'Token limit record is required');
  return {
    id: readRequiredString(item, 'id', 'Token limit id is required'),
    keyPrefix: readRequiredString(item, 'keyPrefix', 'Token limit key prefix is required'),
    user: readRequiredString(item, 'user', 'Token limit user is required'),
    rps: readRequiredNumber(item, 'rps', 'Token limit rps is required'),
    rpd: readRequiredNumber(item, 'rpd', 'Token limit rpd is required'),
    burst: readRequiredNumber(item, 'burst', 'Token limit burst is required'),
    status: readTokenLimitStatus(item),
  };
}

function normalizeModelLimit(value: unknown): ModelLimitRule {
  const item = readRequiredRecord(value, 'Model limit record is required');
  return {
    id: readRequiredString(item, 'id', 'Model limit id is required'),
    model: readRequiredString(item, 'model', 'Model limit model is required'),
    accountGroup: readRequiredString(item, 'accountGroup', 'Model limit account group is required'),
    accountGroupId: readString(item, 'accountGroupId') ?? undefined,
    accountGroupName: readString(item, 'accountGroupName') ?? undefined,
    rpm: readRequiredNumber(item, 'rpm', 'Model limit rpm is required'),
    tpm: readRequiredNumber(item, 'tpm', 'Model limit tpm is required'),
    status: readModelLimitStatus(item),
  };
}

function normalizeFirewall(value: unknown): FirewallRule {
  const item = readRequiredRecord(value, 'Firewall rule record is required');
  return {
    id: readRequiredString(item, 'id', 'Firewall rule id is required'),
    type: readRequiredString(item, 'type', 'Firewall rule type is required'),
    value: readRequiredString(item, 'value', 'Firewall rule value is required'),
    reason: readRequiredString(item, 'reason', 'Firewall rule reason is required'),
    time: readRequiredString(item, 'time', 'Firewall rule time is required'),
  };
}

function readRequiredRecord(value: unknown, message: string): ApiRecord {
  if (!isRecord(value)) {
    throw new Error(message);
  }
  return value;
}

function readIpLimitStatus(item: ApiRecord): IpLimitRule['status'] {
  const status = readRequiredString(item, 'status', 'IP limit status is required').toLowerCase();
  if (status === 'active' || status === 'inactive') {
    return status;
  }
  throw new Error(`Unsupported IP limit status: ${status}`);
}

function readTokenLimitStatus(item: ApiRecord): TokenLimitRule['status'] {
  const status = readRequiredString(item, 'status', 'Token limit status is required').toLowerCase();
  if (status === 'active' || status === 'exhausted') {
    return status;
  }
  throw new Error(`Unsupported token limit status: ${status}`);
}

function readModelLimitStatus(item: ApiRecord): ModelLimitRule['status'] {
  const status = readRequiredString(item, 'status', 'Model limit status is required').toLowerCase();
  if (status === 'active' || status === 'inactive') {
    return status;
  }
  throw new Error(`Unsupported model limit status: ${status}`);
}
