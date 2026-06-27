import {
  ensureSdkworkApiSuccess,
  getClawRouterBackendSdkClient,
  isRecord,
  readApiRecord,
  readBoolean,
  readRequiredApiItems,
  readRequiredApiItem,
  readRequiredNumber,
  requiredSafePathSegment,
  readRequiredString,
  readString,
  type ApiRecord,
} from '@sdkwork/clawroutes-pc-commons/runtime';
import type {
  AdminFirewallRuleCreateRequest,
  AdminIpLimitCreateRequest,
  AdminModelLimitCreateRequest,
  AdminTokenLimitCreateRequest,
} from '@sdkwork/clawrouter-backend-sdk';

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
  channelGroup: string;
  channelGroupId?: string;
  channelGroupName?: string;
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
  channelGroup: string;
  rpm: number;
  tpm: number;
};

export type FirewallCreateInput = {
  type: string;
  value: string;
  reason: string;
};

export class RateLimitService {
  static async fetchIpLimits(): Promise<IpLimitRule[]> {
    const result = await getClawRouterBackendSdkClient().system.rateLimits.ip.list();
    ensureSdkworkApiSuccess(result, 'Failed to fetch IP limits');
    return readRequiredApiItems(result, 'Failed to fetch IP limits')
      .map(normalizeIpLimit);
  }

  static async addIpLimit(rule: IpLimitCreateInput): Promise<IpLimitRule> {
    const result = await getClawRouterBackendSdkClient().system.rateLimits.ip.create(
      toCreateIpLimitRequest(rule),
    );
    ensureSdkworkApiSuccess(result, 'Failed to add IP limit');
    return normalizeIpLimit(readRequiredApiItem(result, 'Created IP limit response is missing data'));
  }

  static async fetchTokenLimits(): Promise<TokenLimitRule[]> {
    const result = await getClawRouterBackendSdkClient().system.rateLimits.apiKeys.list();
    ensureSdkworkApiSuccess(result, 'Failed to fetch token limits');
    return readRequiredApiItems(result, 'Failed to fetch token limits')
      .map(normalizeTokenLimit);
  }

  static async addTokenLimit(rule: TokenLimitCreateInput): Promise<TokenLimitRule> {
    const result = await getClawRouterBackendSdkClient().system.rateLimits.apiKeys.create(
      toCreateTokenLimitRequest(rule),
    );
    ensureSdkworkApiSuccess(result, 'Failed to add token limit');
    return normalizeTokenLimit(readRequiredApiItem(result, 'Created token limit response is missing data'));
  }

  static async fetchModelLimits(): Promise<ModelLimitRule[]> {
    const result = await getClawRouterBackendSdkClient().system.rateLimits.models.list();
    ensureSdkworkApiSuccess(result, 'Failed to fetch model limits');
    return readRequiredApiItems(result, 'Failed to fetch model limits')
      .map(normalizeModelLimit);
  }

  static async addModelLimit(rule: ModelLimitCreateInput): Promise<ModelLimitRule> {
    const result = await getClawRouterBackendSdkClient().system.rateLimits.models.create(
      toCreateModelLimitRequest(rule),
    );
    ensureSdkworkApiSuccess(result, 'Failed to add model limit');
    return normalizeModelLimit(readRequiredApiItem(result, 'Created model limit response is missing data'));
  }

  static async fetchFirewalls(): Promise<FirewallRule[]> {
    const result = await getClawRouterBackendSdkClient().system.firewalls.rules.list();
    ensureSdkworkApiSuccess(result, 'Failed to fetch firewall rules');
    return readRequiredApiItems(result, 'Failed to fetch firewall rules')
      .map(normalizeFirewall);
  }

  static async addFirewall(rule: FirewallCreateInput): Promise<FirewallRule> {
    const result = await getClawRouterBackendSdkClient().system.firewalls.rules.create(
      toCreateFirewallRequest(rule),
    );
    ensureSdkworkApiSuccess(result, 'Failed to add firewall rule');
    return normalizeFirewall(readRequiredApiItem(result, 'Created firewall rule response is missing data'));
  }

  static async removeFirewall(id: string): Promise<boolean> {
    const result = await getClawRouterBackendSdkClient().system.firewalls.rules.delete(
      requiredSafePathSegment(id, 'firewallRuleId'),
    );
    ensureDeleteResult(result, 'Firewall rule delete confirmation is required');
    return true;
  }
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
    channelGroup: requiredText(rule.channelGroup, 'channelGroup'),
    rpm: positiveInteger(rule.rpm, 'rpm'),
    tpm: positiveInteger(rule.tpm, 'tpm'),
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

function ensureDeleteResult(result: unknown, message: string): void {
  ensureSdkworkApiSuccess(result, message);
  if (readBoolean(readApiRecord(result), 'deleted') !== true) {
    throw new Error(message);
  }
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
    channelGroup: readRequiredString(item, 'channelGroup', 'Model limit channel group is required'),
    channelGroupId: readString(item, 'channelGroupId') ?? undefined,
    channelGroupName: readString(item, 'channelGroupName') ?? undefined,
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
