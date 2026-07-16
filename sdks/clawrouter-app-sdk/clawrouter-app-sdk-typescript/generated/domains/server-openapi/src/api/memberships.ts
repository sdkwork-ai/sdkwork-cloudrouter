import { appApiPath } from './paths';
import type { HttpClient } from '../http/client';
import type { MembershipOrderCreateCommand, MembershipOrderCreateResult } from '../types';
export class MembershipsPurchasesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create */
  async create(): Promise<Record<string, never>> {
    return this.client.post<Record<string, never>>(appApiPath(`/memberships/purchases`));
  }

/** Renew */
  async renew(): Promise<Record<string, never>> {
    return this.client.post<Record<string, never>>(appApiPath(`/memberships/purchases/renew`));
  }

/** Upgrade */
  async upgrade(): Promise<Record<string, never>> {
    return this.client.post<Record<string, never>>(appApiPath(`/memberships/purchases/upgrade`));
  }
}

export class MembershipsPrivilegesUsageApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(appApiPath(`/memberships/privileges/usage`));
  }
}

export class MembershipsPrivilegesSpeedUpsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create */
  async create(): Promise<Record<string, never>> {
    return this.client.post<Record<string, never>>(appApiPath(`/memberships/privileges/speed_ups`));
  }
}

export class MembershipsPrivilegesApi {
  private client: HttpClient;
  public readonly speedUps: MembershipsPrivilegesSpeedUpsApi;
  public readonly usage: MembershipsPrivilegesUsageApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.speedUps = new MembershipsPrivilegesSpeedUpsApi(client);
    this.usage = new MembershipsPrivilegesUsageApi(client);
  }

}

export class MembershipsPointsHistoryApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(appApiPath(`/memberships/points/history`));
  }
}

export class MembershipsPointsDailyRewardsStatusApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(appApiPath(`/memberships/points/daily_rewards/status`));
  }
}

export class MembershipsPointsDailyRewardsApi {
  private client: HttpClient;
  public readonly status: MembershipsPointsDailyRewardsStatusApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.status = new MembershipsPointsDailyRewardsStatusApi(client);
  }


/** Create */
  async create(): Promise<Record<string, never>> {
    return this.client.post<Record<string, never>>(appApiPath(`/memberships/points/daily_rewards`));
  }
}

export class MembershipsPointsBalanceApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(appApiPath(`/memberships/points/balance`));
  }
}

export class MembershipsPointsApi {
  private client: HttpClient;
  public readonly balance: MembershipsPointsBalanceApi;
  public readonly dailyRewards: MembershipsPointsDailyRewardsApi;
  public readonly history: MembershipsPointsHistoryApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.balance = new MembershipsPointsBalanceApi(client);
    this.dailyRewards = new MembershipsPointsDailyRewardsApi(client);
    this.history = new MembershipsPointsHistoryApi(client);
  }

}

export class MembershipsPlansApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(appApiPath(`/memberships/plans`));
  }
}

export class MembershipsPackagesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(appApiPath(`/memberships/packages`));
  }

/** Retrieve */
  async retrieve(packageId: string): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(appApiPath(`/memberships/packages/${serializePathParameter(packageId, { name: 'packageId', style: 'simple', explode: false })}`));
  }
}

export class MembershipsPackageGroupsPackagesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(packageGroupId: string): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(appApiPath(`/memberships/package_groups/${serializePathParameter(packageGroupId, { name: 'packageGroupId', style: 'simple', explode: false })}/packages`));
  }
}

export class MembershipsPackageGroupsApi {
  private client: HttpClient;
  public readonly packages: MembershipsPackageGroupsPackagesApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.packages = new MembershipsPackageGroupsPackagesApi(client);
  }


/** List */
  async list(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(appApiPath(`/memberships/package_groups`));
  }

/** Retrieve */
  async retrieve(packageGroupId: string): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(appApiPath(`/memberships/package_groups/${serializePathParameter(packageGroupId, { name: 'packageGroupId', style: 'simple', explode: false })}`));
  }
}

export interface MembershipsOrdersCreateParams {
  idempotencyKey: string;
  sdkworkRequestHash: string;
  xIdempotencyFingerprint: string;
}

export class MembershipsOrdersApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Memberships orders create. */
  async create(body: MembershipOrderCreateCommand, params: MembershipsOrdersCreateParams): Promise<MembershipOrderCreateResult> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
        'Sdkwork-Request-Hash': { value: params.sdkworkRequestHash, style: 'simple', explode: false },
        'X-Idempotency-Fingerprint': { value: params.xIdempotencyFingerprint, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.post<MembershipOrderCreateResult>(appApiPath(`/memberships/orders`), body, undefined, requestHeaders, 'application/json');
  }
}

export class MembershipsCurrentStatusApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(appApiPath(`/memberships/current/status`));
  }
}

export class MembershipsCurrentApi {
  private client: HttpClient;
  public readonly status: MembershipsCurrentStatusApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.status = new MembershipsCurrentStatusApi(client);
  }


/** Retrieve */
  async retrieve(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(appApiPath(`/memberships/current`));
  }
}

export class MembershipsBenefitsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(appApiPath(`/memberships/benefits`));
  }
}

export class MembershipsApi {
  private client: HttpClient;
  public readonly benefits: MembershipsBenefitsApi;
  public readonly current: MembershipsCurrentApi;
  public readonly orders: MembershipsOrdersApi;
  public readonly packageGroups: MembershipsPackageGroupsApi;
  public readonly packages: MembershipsPackagesApi;
  public readonly plans: MembershipsPlansApi;
  public readonly points: MembershipsPointsApi;
  public readonly privileges: MembershipsPrivilegesApi;
  public readonly purchases: MembershipsPurchasesApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.benefits = new MembershipsBenefitsApi(client);
    this.current = new MembershipsCurrentApi(client);
    this.orders = new MembershipsOrdersApi(client);
    this.packageGroups = new MembershipsPackageGroupsApi(client);
    this.packages = new MembershipsPackagesApi(client);
    this.plans = new MembershipsPlansApi(client);
    this.points = new MembershipsPointsApi(client);
    this.privileges = new MembershipsPrivilegesApi(client);
    this.purchases = new MembershipsPurchasesApi(client);
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

function buildRequestHeaders(
  headers: Record<string, HeaderParameterSpec | undefined>,
  cookies: Record<string, HeaderParameterSpec | undefined> = {},
): Record<string, string> | undefined {
  const requestHeaders: Record<string, string> = {};

  for (const [name, parameter] of Object.entries(headers)) {
    const serialized = serializeParameterValue(parameter);
    if (serialized !== undefined) {
      requestHeaders[name] = serialized;
    }
  }

  const cookieHeader = buildCookieHeader(cookies);
  if (cookieHeader) {
    requestHeaders.Cookie = requestHeaders.Cookie
      ? `${requestHeaders.Cookie}; ${cookieHeader}`
      : cookieHeader;
  }

  return Object.keys(requestHeaders).length > 0 ? requestHeaders : undefined;
}

interface HeaderParameterSpec {
  value: unknown;
  style: string;
  explode: boolean;
  contentType?: string;
}

function buildCookieHeader(cookies: Record<string, HeaderParameterSpec | undefined>): string | undefined {
  const pairs: string[] = [];
  for (const [name, parameter] of Object.entries(cookies)) {
    const serialized = serializeParameterValue(parameter);
    if (serialized !== undefined) {
      pairs.push(`${encodeURIComponent(name)}=${encodeURIComponent(serialized)}`);
    }
  }
  return pairs.length > 0 ? pairs.join('; ') : undefined;
}

function serializeParameterValue(parameter: HeaderParameterSpec | undefined): string | undefined {
  const value = parameter?.value;
  if (value === undefined || value === null) {
    return undefined;
  }
  if (parameter?.contentType) {
    return JSON.stringify(value);
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Array.isArray(value)) {
    return value.map((item) => serializeHeaderPrimitive(item)).join(',');
  }
  if (typeof value === 'object' && value !== null) {
    return serializeHeaderObject(value as Record<string, unknown>, parameter?.explode === true);
  }
  return serializeHeaderPrimitive(value);
}

function serializeHeaderObject(value: Record<string, unknown>, explode: boolean): string {
  const entries = Object.entries(value).filter(([, entryValue]) => entryValue !== undefined && entryValue !== null);
  if (explode) {
    return entries.map(([key, entryValue]) => `${key}=${serializeHeaderPrimitive(entryValue)}`).join(',');
  }
  return entries.flatMap(([key, entryValue]) => [key, serializeHeaderPrimitive(entryValue)]).join(',');
}

function serializeHeaderPrimitive(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  return String(value);
}
