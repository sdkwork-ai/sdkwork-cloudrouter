import { backendApiPath } from './paths';
import type { HttpClient } from '../http/client';

import type { DashboardRetrieveResult, DownstreamsCreateResult, PriceSimulationCreateResult, PricingRulesCreateResult, PricingRulesUpdateResult, SdkWorkPageData } from '../types';


export class ServiceProvidersProviderWalletAccountsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(backendApiPath(`/service_providers/wallet/accounts`));
  }
}

export class ServiceProvidersUsageApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(backendApiPath(`/service_providers/usage`));
  }
}

export class ServiceProvidersStatementsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(backendApiPath(`/service_providers/statements`));
  }
}

export class ServiceProvidersRiskEventsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(backendApiPath(`/service_providers/risk/events`));
  }
}

export class ServiceProvidersRelationsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(backendApiPath(`/service_providers/relations`));
  }
}

export class ServiceProvidersReconciliationRunsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(backendApiPath(`/service_providers/reconciliation_runs`));
  }
}

export class ServiceProvidersProviderRegistryApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(backendApiPath(`/service_providers/providers`));
  }
}

export class ServiceProvidersPriceSimulationApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create */
  async create(): Promise<PriceSimulationCreateResult> {
    return this.client.post<PriceSimulationCreateResult>(backendApiPath(`/service_providers/pricing/simulations`));
  }
}

export class ServiceProvidersPricingRulesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(backendApiPath(`/service_providers/pricing/rules`));
  }

/** Create */
  async create(): Promise<PricingRulesCreateResult> {
    return this.client.post<PricingRulesCreateResult>(backendApiPath(`/service_providers/pricing/rules`));
  }

/** Update */
  async update(ruleId: string): Promise<PricingRulesUpdateResult> {
    return this.client.patch<PricingRulesUpdateResult>(backendApiPath(`/service_providers/pricing/rules/${serializePathParameter(ruleId, { name: 'ruleId', style: 'simple', explode: false })}`));
  }
}

export class ServiceProvidersMembersApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(backendApiPath(`/service_providers/members`));
  }
}

export class ServiceProvidersDownstreamsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(backendApiPath(`/service_providers/downstreams`));
  }

/** Create */
  async create(): Promise<DownstreamsCreateResult> {
    return this.client.post<DownstreamsCreateResult>(backendApiPath(`/service_providers/downstreams`));
  }
}

export class ServiceProvidersDashboardApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(): Promise<DashboardRetrieveResult> {
    return this.client.get<DashboardRetrieveResult>(backendApiPath(`/service_providers/dashboard`));
  }
}

export class ServiceProvidersContractsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(backendApiPath(`/service_providers/contracts`));
  }
}

export class ServiceProvidersBindingsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(backendApiPath(`/service_providers/bindings`));
  }
}

export class ServiceProvidersAuditEventsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(backendApiPath(`/service_providers/audit/events`));
  }
}

export class ServiceProvidersAdjustmentsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(backendApiPath(`/service_providers/adjustments`));
  }
}

export class ServiceProvidersApi {
  private client: HttpClient;
  public readonly adjustments: ServiceProvidersAdjustmentsApi;
  public readonly auditEvents: ServiceProvidersAuditEventsApi;
  public readonly bindings: ServiceProvidersBindingsApi;
  public readonly contracts: ServiceProvidersContractsApi;
  public readonly dashboard: ServiceProvidersDashboardApi;
  public readonly downstreams: ServiceProvidersDownstreamsApi;
  public readonly members: ServiceProvidersMembersApi;
  public readonly pricingRules: ServiceProvidersPricingRulesApi;
  public readonly priceSimulation: ServiceProvidersPriceSimulationApi;
  public readonly providerRegistry: ServiceProvidersProviderRegistryApi;
  public readonly reconciliationRuns: ServiceProvidersReconciliationRunsApi;
  public readonly relations: ServiceProvidersRelationsApi;
  public readonly riskEvents: ServiceProvidersRiskEventsApi;
  public readonly statements: ServiceProvidersStatementsApi;
  public readonly usage: ServiceProvidersUsageApi;
  public readonly providerWalletAccounts: ServiceProvidersProviderWalletAccountsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.adjustments = new ServiceProvidersAdjustmentsApi(client);
    this.auditEvents = new ServiceProvidersAuditEventsApi(client);
    this.bindings = new ServiceProvidersBindingsApi(client);
    this.contracts = new ServiceProvidersContractsApi(client);
    this.dashboard = new ServiceProvidersDashboardApi(client);
    this.downstreams = new ServiceProvidersDownstreamsApi(client);
    this.members = new ServiceProvidersMembersApi(client);
    this.pricingRules = new ServiceProvidersPricingRulesApi(client);
    this.priceSimulation = new ServiceProvidersPriceSimulationApi(client);
    this.providerRegistry = new ServiceProvidersProviderRegistryApi(client);
    this.reconciliationRuns = new ServiceProvidersReconciliationRunsApi(client);
    this.relations = new ServiceProvidersRelationsApi(client);
    this.riskEvents = new ServiceProvidersRiskEventsApi(client);
    this.statements = new ServiceProvidersStatementsApi(client);
    this.usage = new ServiceProvidersUsageApi(client);
    this.providerWalletAccounts = new ServiceProvidersProviderWalletAccountsApi(client);
  }

}

export function createServiceProvidersApi(client: HttpClient): ServiceProvidersApi {
  return new ServiceProvidersApi(client);
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
