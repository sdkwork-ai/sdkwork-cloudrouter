import {
  ensureSdkworkApiSuccess,
  isRecord,
  readRequiredApiItem,
  readRequiredApiItems,
  readRequiredString,
  readString,
  requiredSafePathSegment,
  type ApiRecord,
} from '@sdkwork/clawroutes-pc-commons/runtime';
import { getClawRouterBackendSdkClient } from '@sdkwork/clawrouter-pc-admin-core/sdk';
import type {
  AdminServiceNodeCreateRequest,
  AdminServiceNodeUpdateRequest,
} from '@sdkwork/clawrouter-pc-admin-core/sdk';

export type ServiceNodeStatus = 'enabled' | 'disabled';
export type ServiceNodeHealthStatus = 'online' | 'warning' | 'offline' | 'unknown';

export interface ServiceNode {
  id: string;
  name: string;
  domain: string;
  ip: string;
  remark: string;
  status: ServiceNodeStatus;
  healthStatus: ServiceNodeHealthStatus;
  updatedAt: string;
}

export interface ServiceNodeInput {
  name?: string;
  domain?: string;
  ip?: string;
  remark?: string;
  status?: ServiceNodeStatus;
}

export interface ServiceNodeListParams {
  search?: string;
  status?: ServiceNodeStatus | 'all';
}

type ServiceNodeListSdkParams = Parameters<ReturnType<typeof getClawRouterBackendSdkClient>['system']['serviceNodes']['list']>[0];

export class ServiceNodeService {
  static async fetchNodes(params: ServiceNodeListParams = {}): Promise<ServiceNode[]> {
    const result = await getClawRouterBackendSdkClient().system.serviceNodes.list(toListParams(params));
    ensureSdkworkApiSuccess(result, 'Failed to fetch service nodes');
    return readRequiredApiItems(result, 'Failed to fetch service nodes')
      .map(normalizeServiceNode);
  }

  static async createNode(input: ServiceNodeInput): Promise<ServiceNode> {
    const result = await getClawRouterBackendSdkClient().system.serviceNodes.create(toCreateRequest(input));
    ensureSdkworkApiSuccess(result, 'Failed to create service node');
    return normalizeServiceNode(readRequiredApiItem(result, 'Created service node response is missing data'));
  }

  static async updateNode(nodeId: string, input: ServiceNodeInput): Promise<ServiceNode> {
    const result = await getClawRouterBackendSdkClient().system.serviceNodes.update(
      requiredNodeId(nodeId),
      toUpdateRequest(input),
    );
    ensureSdkworkApiSuccess(result, 'Failed to update service node');
    return normalizeServiceNode(readRequiredApiItem(result, 'Updated service node response is missing data'));
  }

  static async updateNodeStatus(nodeId: string, status: ServiceNodeStatus): Promise<ServiceNode> {
    const result = await getClawRouterBackendSdkClient().system.serviceNodes.status.update(
      requiredNodeId(nodeId),
      { status: normalizeServiceNodeStatus(status) },
    );
    ensureSdkworkApiSuccess(result, 'Failed to update service node status');
    return normalizeServiceNode(readRequiredApiItem(result, 'Updated service node response is missing data'));
  }

  static async deleteNode(nodeId: string): Promise<void> {
    await getClawRouterBackendSdkClient().system.serviceNodes.delete(requiredNodeId(nodeId));
  }
}

function toListParams(params: ServiceNodeListParams): ServiceNodeListSdkParams {
  const search = normalizeVisibleText(params.search, 'search', 128);
  const status = params.status === undefined || params.status === 'all'
    ? undefined
    : normalizeServiceNodeStatus(params.status);
  return {
    ...(search ? { q: search } : {}),
    ...(status ? { status } : {}),
  };
}

function toCreateRequest(input: ServiceNodeInput): AdminServiceNodeCreateRequest {
  return pruneUndefined({
    name: requiredText(input.name, 'name'),
    domain: requiredDomain(input.domain),
    ip: requiredIp(input.ip),
    remark: normalizeCreateRemark(input.remark),
    status: input.status === undefined ? undefined : normalizeServiceNodeStatus(input.status),
  });
}

function toUpdateRequest(input: ServiceNodeInput): AdminServiceNodeUpdateRequest {
  if (input.status !== undefined) {
    throw new Error('status must be changed through updateNodeStatus');
  }
  const request = pruneUndefined({
    name: input.name === undefined ? undefined : requiredText(input.name, 'name'),
    domain: input.domain === undefined ? undefined : requiredDomain(input.domain),
    ip: input.ip === undefined ? undefined : requiredIp(input.ip),
    remark: input.remark === undefined ? undefined : normalizeUpdateRemark(input.remark),
  });
  if (Object.keys(request).length === 0) {
    throw new Error('service node update fields are required');
  }
  return request;
}

function requiredNodeId(value: string): string {
  return requiredSafePathSegment(value, 'node id');
}

function requiredText(value: string | undefined, fieldName: string): string {
  const normalized = value?.trim() ?? '';
  if (!normalized) {
    throw new Error(`${fieldName} is required`);
  }
  if (normalized.length > 128 || !isVisibleText(normalized)) {
    throw new Error(`${fieldName} must be visible text and at most 128 characters`);
  }
  return normalized;
}

function normalizeVisibleText(value: string | undefined, fieldName: string, maxLength: number): string | undefined {
  const normalized = value?.trim() ?? '';
  if (!normalized) {
    return undefined;
  }
  if (normalized.length > maxLength || !isVisibleText(normalized)) {
    throw new Error(`${fieldName} must be visible text and at most ${maxLength} characters`);
  }
  return normalized;
}

function requiredIp(value: string | undefined): string {
  const normalized = requiredText(value, 'ip');
  if (!isValidIpAddress(normalized)) {
    throw new Error('ip must be a valid IPv4 or IPv6 address');
  }
  return normalized;
}

function normalizeCreateRemark(value: string | undefined): string | undefined {
  const normalized = value?.trim() ?? '';
  if (!normalized) {
    return undefined;
  }
  if (normalized.length > 512) {
    throw new Error('remark must be at most 512 characters');
  }
  return normalized;
}

function normalizeUpdateRemark(value: string): string {
  const normalized = value.trim();
  if (normalized.length > 512) {
    throw new Error('remark must be at most 512 characters');
  }
  return normalized;
}

function requiredDomain(value: string | undefined): string {
  const normalized = requiredText(value, 'domain');
  const hostname = extractHostname(normalized);
  if (!hostname || !isValidHostname(hostname)) {
    throw new Error('domain must be a hostname or URL host');
  }
  return hostname;
}

function extractHostname(value: string): string {
  if (/^[a-z][a-z0-9+.-]*:\/\//iu.test(value)) {
    try {
      return new URL(value).hostname;
    } catch {
      return '';
    }
  }
  return value;
}

function isValidHostname(value: string): boolean {
  if (value.length > 253 || value.includes('..') || !value.includes('.')) {
    return false;
  }
  return value
    .split('.')
    .every((label) => /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/u.test(label));
}

function isVisibleText(value: string): boolean {
  return !/[\p{C}]/u.test(value);
}

function isValidIpAddress(value: string): boolean {
  return isValidIpv4Address(value) || isValidIpv6Address(value);
}

function isValidIpv4Address(value: string): boolean {
  const parts = value.split('.');
  return parts.length === 4 && parts.every((part) => {
    if (!/^\d{1,3}$/u.test(part)) {
      return false;
    }
    const octet = Number(part);
    return Number.isInteger(octet) && octet >= 0 && octet <= 255;
  });
}

function isValidIpv6Address(value: string): boolean {
  if (!value.includes(':') || /[^0-9A-Fa-f:.]/u.test(value)) {
    return false;
  }
  try {
    const parsed = new URL(`http://[${value}]/`);
    return parsed.hostname.startsWith('[') && parsed.hostname.endsWith(']');
  } catch {
    return false;
  }
}

function normalizeServiceNode(value: unknown): ServiceNode {
  const item = readRequiredRecord(value, 'Service node record is required');
  return {
    id: readRequiredString(item, 'id', 'Service node id is required'),
    name: readRequiredString(item, 'name', 'Service node name is required'),
    domain: readRequiredString(item, 'domain', 'Service node domain is required'),
    ip: readRequiredString(item, 'ip', 'Service node ip is required'),
    remark: readString(item, 'remark'),
    status: readServiceNodeStatus(item),
    healthStatus: readServiceNodeHealthStatus(item),
    updatedAt: readRequiredString(item, 'updatedAt', 'Service node updated time is required'),
  };
}

function readRequiredRecord(value: unknown, message: string): ApiRecord {
  if (!isRecord(value)) {
    throw new Error(message);
  }
  return value;
}

function readServiceNodeStatus(item: ApiRecord): ServiceNodeStatus {
  return normalizeServiceNodeStatus(readString(item, 'status'));
}

function normalizeServiceNodeStatus(value: string): ServiceNodeStatus {
  if (value === 'enabled' || value === 'disabled') {
    return value;
  }
  throw new Error(value ? `Unsupported service node status: ${value}` : 'Service node status is required');
}

function readServiceNodeHealthStatus(item: ApiRecord): ServiceNodeHealthStatus {
  const status = readString(item, 'healthStatus');
  if (status === 'online' || status === 'warning' || status === 'offline' || status === 'unknown') {
    return status;
  }
  throw new Error(status ? `Unsupported service node health status: ${status}` : 'Service node health status is required');
}

function pruneUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as T;
}
