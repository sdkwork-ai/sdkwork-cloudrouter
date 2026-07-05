import { appApiPath } from './paths';
import type { HttpClient } from '../http/client';

import type { MembershipsCurrentRetrieveResult, MembershipsCurrentStatusRetrieveResult, MembershipsPackageGroupsRetrieveResult, MembershipsPackagesRetrieveResult, MembershipsPointsBalanceRetrieveResult, MembershipsPointsDailyRewardsCreateResult, MembershipsPointsDailyRewardsStatusRetrieveResult, MembershipsPrivilegesSpeedUpsCreateResult, MembershipsPrivilegesUsageRetrieveResult, MembershipsPurchasesCreateResult, MembershipsPurchasesRenewResult, MembershipsPurchasesUpgradeResult, SdkWorkPageData } from '../types';


export class MembershipsPurchasesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create */
  async create(): Promise<MembershipsPurchasesCreateResult> {
    return this.client.post<MembershipsPurchasesCreateResult>(appApiPath(`/memberships/purchases`));
  }

/** Renew */
  async renew(): Promise<MembershipsPurchasesRenewResult> {
    return this.client.post<MembershipsPurchasesRenewResult>(appApiPath(`/memberships/purchases/renew`));
  }

/** Upgrade */
  async upgrade(): Promise<MembershipsPurchasesUpgradeResult> {
    return this.client.post<MembershipsPurchasesUpgradeResult>(appApiPath(`/memberships/purchases/upgrade`));
  }
}

export class MembershipsPrivilegesUsageApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(): Promise<MembershipsPrivilegesUsageRetrieveResult> {
    return this.client.get<MembershipsPrivilegesUsageRetrieveResult>(appApiPath(`/memberships/privileges/usage`));
  }
}

export class MembershipsPrivilegesSpeedUpsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create */
  async create(): Promise<MembershipsPrivilegesSpeedUpsCreateResult> {
    return this.client.post<MembershipsPrivilegesSpeedUpsCreateResult>(appApiPath(`/memberships/privileges/speed_ups`));
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
  async list(): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(appApiPath(`/memberships/points/history`));
  }
}

export class MembershipsPointsDailyRewardsStatusApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(): Promise<MembershipsPointsDailyRewardsStatusRetrieveResult> {
    return this.client.get<MembershipsPointsDailyRewardsStatusRetrieveResult>(appApiPath(`/memberships/points/daily_rewards/status`));
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
  async create(): Promise<MembershipsPointsDailyRewardsCreateResult> {
    return this.client.post<MembershipsPointsDailyRewardsCreateResult>(appApiPath(`/memberships/points/daily_rewards`));
  }
}

export class MembershipsPointsBalanceApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(): Promise<MembershipsPointsBalanceRetrieveResult> {
    return this.client.get<MembershipsPointsBalanceRetrieveResult>(appApiPath(`/memberships/points/balance`));
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
  async list(): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(appApiPath(`/memberships/plans`));
  }
}

export class MembershipsPackagesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(appApiPath(`/memberships/packages`));
  }

/** Retrieve */
  async retrieve(packageId: string): Promise<MembershipsPackagesRetrieveResult> {
    return this.client.get<MembershipsPackagesRetrieveResult>(appApiPath(`/memberships/packages/${serializePathParameter(packageId, { name: 'packageId', style: 'simple', explode: false })}`));
  }
}

export class MembershipsPackageGroupsPackagesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(packageGroupId: string): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(appApiPath(`/memberships/package_groups/${serializePathParameter(packageGroupId, { name: 'packageGroupId', style: 'simple', explode: false })}/packages`));
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
  async list(): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(appApiPath(`/memberships/package_groups`));
  }

/** Retrieve */
  async retrieve(packageGroupId: string): Promise<MembershipsPackageGroupsRetrieveResult> {
    return this.client.get<MembershipsPackageGroupsRetrieveResult>(appApiPath(`/memberships/package_groups/${serializePathParameter(packageGroupId, { name: 'packageGroupId', style: 'simple', explode: false })}`));
  }
}

export class MembershipsCurrentStatusApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(): Promise<MembershipsCurrentStatusRetrieveResult> {
    return this.client.get<MembershipsCurrentStatusRetrieveResult>(appApiPath(`/memberships/current/status`));
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
  async retrieve(): Promise<MembershipsCurrentRetrieveResult> {
    return this.client.get<MembershipsCurrentRetrieveResult>(appApiPath(`/memberships/current`));
  }
}

export class MembershipsBenefitsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(appApiPath(`/memberships/benefits`));
  }
}

export class MembershipsApi {
  private client: HttpClient;
  public readonly benefits: MembershipsBenefitsApi;
  public readonly current: MembershipsCurrentApi;
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
