import { backendApiPath } from './paths';
import type { HttpClient } from '../http/client';

import type { CommerceApiResult, CommerceOperationCommand } from '../types';


export interface MembershipsEntitlementsListParams {
  membershipId?: string;
  planId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export class MembershipsEntitlementsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Memberships entitlements list. */
  async list(params?: MembershipsEntitlementsListParams): Promise<CommerceApiResult> {
    const query = buildQueryString([
      { name: 'membership_id', value: params?.membershipId, style: 'form', explode: true, allowReserved: false },
      { name: 'plan_id', value: params?.planId, style: 'form', explode: true, allowReserved: false },
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<CommerceApiResult>(appendQueryString(backendApiPath(`/memberships/entitlements`), query));
  }
}

export interface MembershipsMembersListParams {
  userId?: string;
  planId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export class MembershipsMembersApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Memberships members list. */
  async list(params?: MembershipsMembersListParams): Promise<CommerceApiResult> {
    const query = buildQueryString([
      { name: 'user_id', value: params?.userId, style: 'form', explode: true, allowReserved: false },
      { name: 'plan_id', value: params?.planId, style: 'form', explode: true, allowReserved: false },
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<CommerceApiResult>(appendQueryString(backendApiPath(`/memberships/members`), query));
  }

/** Memberships members update. */
  async update(membershipId: string, body?: CommerceOperationCommand): Promise<CommerceApiResult> {
    return this.client.patch<CommerceApiResult>(backendApiPath(`/memberships/members/${serializePathParameter(membershipId, { name: 'membershipId', style: 'simple', explode: false })}`), body, undefined, undefined, 'application/json');
  }
}

export interface MembershipsPackageGroupsManagementListParams {
  status?: string;
}

export class MembershipsPackageGroupsManagementApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Memberships package Groups management list. */
  async list(params?: MembershipsPackageGroupsManagementListParams): Promise<CommerceApiResult> {
    const query = buildQueryString([
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<CommerceApiResult>(appendQueryString(backendApiPath(`/memberships/package_groups`), query));
  }
}

export class MembershipsPackageGroupsApi {
  private client: HttpClient;
  public readonly management: MembershipsPackageGroupsManagementApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.management = new MembershipsPackageGroupsManagementApi(client);
  }


/** Memberships package Groups create. */
  async create(body: CommerceOperationCommand): Promise<CommerceApiResult> {
    return this.client.post<CommerceApiResult>(backendApiPath(`/memberships/package_groups`), body, undefined, undefined, 'application/json');
  }

/** Memberships package Groups update. */
  async update(packageGroupId: string, body?: CommerceOperationCommand): Promise<CommerceApiResult> {
    return this.client.patch<CommerceApiResult>(backendApiPath(`/memberships/package_groups/${serializePathParameter(packageGroupId, { name: 'packageGroupId', style: 'simple', explode: false })}`), body, undefined, undefined, 'application/json');
  }

/** Memberships package Groups delete. */
  async delete(packageGroupId: string): Promise<CommerceApiResult> {
    return this.client.delete<CommerceApiResult>(backendApiPath(`/memberships/package_groups/${serializePathParameter(packageGroupId, { name: 'packageGroupId', style: 'simple', explode: false })}`));
  }
}

export interface MembershipsPackagesManagementListParams {
  planId?: string;
  status?: string;
}

export class MembershipsPackagesManagementApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Memberships packages management list. */
  async list(params?: MembershipsPackagesManagementListParams): Promise<CommerceApiResult> {
    const query = buildQueryString([
      { name: 'plan_id', value: params?.planId, style: 'form', explode: true, allowReserved: false },
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<CommerceApiResult>(appendQueryString(backendApiPath(`/memberships/packages`), query));
  }
}

export class MembershipsPackagesApi {
  private client: HttpClient;
  public readonly management: MembershipsPackagesManagementApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.management = new MembershipsPackagesManagementApi(client);
  }


/** Memberships packages create. */
  async create(body: CommerceOperationCommand): Promise<CommerceApiResult> {
    return this.client.post<CommerceApiResult>(backendApiPath(`/memberships/packages`), body, undefined, undefined, 'application/json');
  }

/** Memberships packages update. */
  async update(packageId: string, body?: CommerceOperationCommand): Promise<CommerceApiResult> {
    return this.client.patch<CommerceApiResult>(backendApiPath(`/memberships/packages/${serializePathParameter(packageId, { name: 'packageId', style: 'simple', explode: false })}`), body, undefined, undefined, 'application/json');
  }

/** Memberships packages delete. */
  async delete(packageId: string): Promise<CommerceApiResult> {
    return this.client.delete<CommerceApiResult>(backendApiPath(`/memberships/packages/${serializePathParameter(packageId, { name: 'packageId', style: 'simple', explode: false })}`));
  }
}

export interface MembershipsPlansManagementListParams {
  status?: string;
}

export class MembershipsPlansManagementApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Memberships plans management list. */
  async list(params?: MembershipsPlansManagementListParams): Promise<CommerceApiResult> {
    const query = buildQueryString([
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<CommerceApiResult>(appendQueryString(backendApiPath(`/memberships/plans`), query));
  }
}

export class MembershipsPlansApi {
  private client: HttpClient;
  public readonly management: MembershipsPlansManagementApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.management = new MembershipsPlansManagementApi(client);
  }


/** Memberships plans create. */
  async create(body: CommerceOperationCommand): Promise<CommerceApiResult> {
    return this.client.post<CommerceApiResult>(backendApiPath(`/memberships/plans`), body, undefined, undefined, 'application/json');
  }

/** Memberships plans update. */
  async update(planId: string, body?: CommerceOperationCommand): Promise<CommerceApiResult> {
    return this.client.patch<CommerceApiResult>(backendApiPath(`/memberships/plans/${serializePathParameter(planId, { name: 'planId', style: 'simple', explode: false })}`), body, undefined, undefined, 'application/json');
  }
}

export class MembershipsApi {
  private client: HttpClient;
  public readonly plans: MembershipsPlansApi;
  public readonly packages: MembershipsPackagesApi;
  public readonly packageGroups: MembershipsPackageGroupsApi;
  public readonly members: MembershipsMembersApi;
  public readonly entitlements: MembershipsEntitlementsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.plans = new MembershipsPlansApi(client);
    this.packages = new MembershipsPackagesApi(client);
    this.packageGroups = new MembershipsPackageGroupsApi(client);
    this.members = new MembershipsMembersApi(client);
    this.entitlements = new MembershipsEntitlementsApi(client);
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
interface QueryParameterSpec {
  name: string;
  value: unknown;
  style: string;
  explode: boolean;
  allowReserved: boolean;
  contentType?: string;
}

function buildQueryString(parameters: QueryParameterSpec[]): string {
  const pairs: string[] = [];
  for (const parameter of parameters) {
    appendSerializedParameter(pairs, parameter);
  }
  return pairs.join('&');
}

function appendSerializedParameter(pairs: string[], parameter: QueryParameterSpec): void {
  if (parameter.value === undefined || parameter.value === null) {
    return;
  }

  if (parameter.contentType) {
    pairs.push(`${encodeQueryComponent(parameter.name)}=${encodeQueryValue(JSON.stringify(parameter.value), parameter.allowReserved)}`);
    return;
  }

  const style = parameter.style || 'form';
  if (style === 'deepObject') {
    appendDeepObjectParameter(pairs, parameter.name, parameter.value, parameter.allowReserved);
    return;
  }

  if (Array.isArray(parameter.value)) {
    appendArrayParameter(pairs, parameter.name, parameter.value, style, parameter.explode, parameter.allowReserved);
    return;
  }

  if (typeof parameter.value === 'object') {
    appendObjectParameter(pairs, parameter.name, parameter.value as Record<string, unknown>, style, parameter.explode, parameter.allowReserved);
    return;
  }

  pairs.push(`${encodeQueryComponent(parameter.name)}=${encodeQueryValue(serializePrimitive(parameter.value), parameter.allowReserved)}`);
}

function appendArrayParameter(
  pairs: string[],
  name: string,
  value: unknown[],
  style: string,
  explode: boolean,
  allowReserved: boolean,
): void {
  const values = value
    .filter((item) => item !== undefined && item !== null)
    .map((item) => serializePrimitive(item));
  if (values.length === 0) {
    return;
  }

  if (style === 'form' && explode) {
    for (const item of values) {
      pairs.push(`${encodeQueryComponent(name)}=${encodeQueryValue(item, allowReserved)}`);
    }
    return;
  }

  pairs.push(`${encodeQueryComponent(name)}=${encodeQueryValue(values.join(','), allowReserved)}`);
}

function appendObjectParameter(
  pairs: string[],
  name: string,
  value: Record<string, unknown>,
  style: string,
  explode: boolean,
  allowReserved: boolean,
): void {
  const entries = Object.entries(value).filter(([, entryValue]) => entryValue !== undefined && entryValue !== null);
  if (entries.length === 0) {
    return;
  }

  if (style === 'form' && explode) {
    for (const [key, entryValue] of entries) {
      pairs.push(`${encodeQueryComponent(key)}=${encodeQueryValue(serializePrimitive(entryValue), allowReserved)}`);
    }
    return;
  }

  const serialized = entries.flatMap(([key, entryValue]) => [key, serializePrimitive(entryValue)]).join(',');
  pairs.push(`${encodeQueryComponent(name)}=${encodeQueryValue(serialized, allowReserved)}`);
}

function appendDeepObjectParameter(
  pairs: string[],
  name: string,
  value: unknown,
  allowReserved: boolean,
): void {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    pairs.push(`${encodeQueryComponent(name)}=${encodeQueryValue(serializePrimitive(value), allowReserved)}`);
    return;
  }

  for (const [key, entryValue] of Object.entries(value as Record<string, unknown>)) {
    if (entryValue === undefined || entryValue === null) {
      continue;
    }
    pairs.push(`${encodeQueryComponent(`${name}[${key}]`)}=${encodeQueryValue(serializePrimitive(entryValue), allowReserved)}`);
  }
}

function serializePrimitive(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

function encodeQueryComponent(value: string): string {
  return encodeURIComponent(value);
}

function encodeQueryValue(value: string, allowReserved: boolean): string {
  const encoded = encodeURIComponent(value);
  if (!allowReserved) {
    return encoded;
  }
  return encoded.replace(/%3A/gi, ':')
    .replace(/%2F/gi, '/')
    .replace(/%3F/gi, '?')
    .replace(/%23/gi, '#')
    .replace(/%5B/gi, '[')
    .replace(/%5D/gi, ']')
    .replace(/%40/gi, '@')
    .replace(/%21/gi, '!')
    .replace(/%24/gi, '$')
    .replace(/%26/gi, '&')
    .replace(/%27/gi, "'")
    .replace(/%28/gi, '(')
    .replace(/%29/gi, ')')
    .replace(/%2A/gi, '*')
    .replace(/%2B/gi, '+')
    .replace(/%2C/gi, ',')
    .replace(/%3B/gi, ';')
    .replace(/%3D/gi, '=');
}
