import { backendApiPath } from './paths';
import type { ApiRequestOptions, HttpClient } from '../http/client';
import type { MembershipPackageGroupMutationRequest, MembershipPackageMutationRequest, MembershipPlanMutationRequest, MembershipStatusUpdateRequest } from '../types';
export class MembershipsPlansApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Update */
  async update(planId: string, body: MembershipPlanMutationRequest, requestOptions?: ApiRequestOptions): Promise<Record<string, never>> {
    return this.client.request<Record<string, never>>(backendApiPath(`/memberships/plans/${serializePathParameter(planId, { name: 'planId', style: 'simple', explode: false })}`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'PATCH' as any, body, contentType: 'application/json', sdkworkUnwrapKind: 'data' });
  }
}

export class MembershipsPackagesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Update */
  async update(packageId: string, body: MembershipPackageMutationRequest, requestOptions?: ApiRequestOptions): Promise<Record<string, never>> {
    return this.client.request<Record<string, never>>(backendApiPath(`/memberships/packages/${serializePathParameter(packageId, { name: 'packageId', style: 'simple', explode: false })}`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'PATCH' as any, body, contentType: 'application/json', sdkworkUnwrapKind: 'data' });
  }
}

export class MembershipsPackageGroupsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Update */
  async update(packageGroupId: string, body: MembershipPackageGroupMutationRequest, requestOptions?: ApiRequestOptions): Promise<Record<string, never>> {
    return this.client.request<Record<string, never>>(backendApiPath(`/memberships/package_groups/${serializePathParameter(packageGroupId, { name: 'packageGroupId', style: 'simple', explode: false })}`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'PATCH' as any, body, contentType: 'application/json', sdkworkUnwrapKind: 'data' });
  }
}

export class MembershipsMembersApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Update */
  async update(membershipId: string, body: MembershipStatusUpdateRequest, requestOptions?: ApiRequestOptions): Promise<Record<string, never>> {
    return this.client.request<Record<string, never>>(backendApiPath(`/memberships/members/${serializePathParameter(membershipId, { name: 'membershipId', style: 'simple', explode: false })}`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'PATCH' as any, body, contentType: 'application/json', sdkworkUnwrapKind: 'data' });
  }
}

export class MembershipsApi {
  private client: HttpClient;
  public readonly members: MembershipsMembersApi;
  public readonly packageGroups: MembershipsPackageGroupsApi;
  public readonly packages: MembershipsPackagesApi;
  public readonly plans: MembershipsPlansApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.members = new MembershipsMembersApi(client);
    this.packageGroups = new MembershipsPackageGroupsApi(client);
    this.packages = new MembershipsPackagesApi(client);
    this.plans = new MembershipsPlansApi(client);
  }

}

export function createMembershipsApi(client: HttpClient): MembershipsApi {
  return new MembershipsApi(client);
}

function appendQueryString(path: string, rawQueryString: string): string {
  const query = rawQueryString.replace(/^\?+/, '');
  if (!query) {
    return path;
  }
  return path.includes('?') ? `${path}&${query}` : `${path}?${query}`;
}

interface PathParameterSpec {
  name: string;
  style: string;
  explode: boolean;
}

function serializePathParameter(value: unknown, spec: PathParameterSpec): string {
  if (value === undefined || value === null) {
    return '';
  }

  const style = spec.style || 'simple';
  if (Array.isArray(value)) {
    return serializePathArray(spec.name, value, style, spec.explode);
  }
  if (typeof value === 'object') {
    return serializePathObject(spec.name, value as Record<string, unknown>, style, spec.explode);
  }
  return pathPrefix(spec.name, style, false) + encodePathValue(serializePathPrimitive(value));
}

function serializePathArray(name: string, values: unknown[], style: string, explode: boolean): string {
  const serialized = values
    .filter((item) => item !== undefined && item !== null)
    .map((item) => encodePathValue(serializePathPrimitive(item)));
  if (serialized.length === 0) {
    return pathPrefix(name, style, false);
  }
  if (style === 'matrix') {
    return explode
      ? serialized.map((item) => `;${name}=${item}`).join('')
      : `;${name}=${serialized.join(',')}`;
  }
  return pathPrefix(name, style, false) + serialized.join(explode ? '.' : ',');
}

function serializePathObject(name: string, value: Record<string, unknown>, style: string, explode: boolean): string {
  const entries = Object.entries(value).filter(([, entryValue]) => entryValue !== undefined && entryValue !== null);
  if (entries.length === 0) {
    return pathPrefix(name, style, true);
  }
  if (style === 'matrix') {
    return explode
      ? entries.map(([key, entryValue]) => `;${encodePathValue(key)}=${encodePathValue(serializePathPrimitive(entryValue))}`).join('')
      : `;${name}=${entries.flatMap(([key, entryValue]) => [encodePathValue(key), encodePathValue(serializePathPrimitive(entryValue))]).join(',')}`;
  }
  const serialized = explode
    ? entries.map(([key, entryValue]) => `${encodePathValue(key)}=${encodePathValue(serializePathPrimitive(entryValue))}`).join(style === 'label' ? '.' : ',')
    : entries.flatMap(([key, entryValue]) => [encodePathValue(key), encodePathValue(serializePathPrimitive(entryValue))]).join(',');
  return pathPrefix(name, style, true) + serialized;
}

function pathPrefix(name: string, style: string, _objectValue: boolean): string {
  if (style === 'label') return '.';
  if (style === 'matrix') return `;${name}`;
  return '';
}

function encodePathValue(value: string): string {
  return encodeURIComponent(value);
}

function serializePathPrimitive(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}
