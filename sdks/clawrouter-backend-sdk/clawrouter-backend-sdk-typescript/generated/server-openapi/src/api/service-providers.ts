import { backendApiPath } from './paths';
import type { HttpClient } from '../http/client';

import type { AdjustmentsListResult, AuditEventsListResult, BindingsListResult, ContractsListResult, DashboardRetrieveResult, DownstreamsCreateResult, DownstreamsListResult, MembersListResult, PriceSimulationCreateResult, PricingRulesCreateResult, PricingRulesListResult, PricingRulesUpdateResult, ProviderRegistryListResult, ProviderWalletAccountsListResult, ReconciliationRunsListResult, RelationsListResult, RiskEventsListResult, ServiceProviderDownstreamCreateRequest, ServiceProviderPriceSimulationRequest, ServiceProviderPricingRuleCreateRequest, ServiceProviderPricingRuleUpdateRequest, StatementsListResult, UsageListResult } from '../types';


export interface ServiceProvidersProviderWalletAccountsListParams {
  page?: string;
  pageSize?: string;
  status?: string;
  providerId?: string;
  sellerProviderId?: string;
  buyerProviderId?: string;
  edgeId?: string;
}

export class ServiceProvidersProviderWalletAccountsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Service Provider Wallet Accounts List */
  async list(params?: ServiceProvidersProviderWalletAccountsListParams): Promise<ProviderWalletAccountsListResult> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
      { name: 'provider_id', value: params?.providerId, style: 'form', explode: true, allowReserved: false },
      { name: 'seller_provider_id', value: params?.sellerProviderId, style: 'form', explode: true, allowReserved: false },
      { name: 'buyer_provider_id', value: params?.buyerProviderId, style: 'form', explode: true, allowReserved: false },
      { name: 'edge_id', value: params?.edgeId, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<ProviderWalletAccountsListResult>(appendQueryString(backendApiPath(`/service_providers/wallet/accounts`), query));
  }
}

export interface ServiceProvidersUsageListParams {
  page?: string;
  pageSize?: string;
  status?: string;
  providerId?: string;
  sellerProviderId?: string;
  buyerProviderId?: string;
  edgeId?: string;
}

export class ServiceProvidersUsageApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Service Provider Usage List */
  async list(params?: ServiceProvidersUsageListParams): Promise<UsageListResult> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
      { name: 'provider_id', value: params?.providerId, style: 'form', explode: true, allowReserved: false },
      { name: 'seller_provider_id', value: params?.sellerProviderId, style: 'form', explode: true, allowReserved: false },
      { name: 'buyer_provider_id', value: params?.buyerProviderId, style: 'form', explode: true, allowReserved: false },
      { name: 'edge_id', value: params?.edgeId, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<UsageListResult>(appendQueryString(backendApiPath(`/service_providers/usage`), query));
  }
}

export interface ServiceProvidersStatementsListParams {
  page?: string;
  pageSize?: string;
  status?: string;
  providerId?: string;
  sellerProviderId?: string;
  buyerProviderId?: string;
  edgeId?: string;
}

export class ServiceProvidersStatementsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Service Provider Statements List */
  async list(params?: ServiceProvidersStatementsListParams): Promise<StatementsListResult> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
      { name: 'provider_id', value: params?.providerId, style: 'form', explode: true, allowReserved: false },
      { name: 'seller_provider_id', value: params?.sellerProviderId, style: 'form', explode: true, allowReserved: false },
      { name: 'buyer_provider_id', value: params?.buyerProviderId, style: 'form', explode: true, allowReserved: false },
      { name: 'edge_id', value: params?.edgeId, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<StatementsListResult>(appendQueryString(backendApiPath(`/service_providers/statements`), query));
  }
}

export interface ServiceProvidersRiskEventsListParams {
  page?: string;
  pageSize?: string;
  status?: string;
  providerId?: string;
  sellerProviderId?: string;
  buyerProviderId?: string;
  edgeId?: string;
}

export class ServiceProvidersRiskEventsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Service Provider Risk Events List */
  async list(params?: ServiceProvidersRiskEventsListParams): Promise<RiskEventsListResult> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
      { name: 'provider_id', value: params?.providerId, style: 'form', explode: true, allowReserved: false },
      { name: 'seller_provider_id', value: params?.sellerProviderId, style: 'form', explode: true, allowReserved: false },
      { name: 'buyer_provider_id', value: params?.buyerProviderId, style: 'form', explode: true, allowReserved: false },
      { name: 'edge_id', value: params?.edgeId, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<RiskEventsListResult>(appendQueryString(backendApiPath(`/service_providers/risk/events`), query));
  }
}

export interface ServiceProvidersRelationsListParams {
  page?: string;
  pageSize?: string;
  status?: string;
  providerId?: string;
  sellerProviderId?: string;
  buyerProviderId?: string;
  edgeId?: string;
}

export class ServiceProvidersRelationsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Service Provider Relations List */
  async list(params?: ServiceProvidersRelationsListParams): Promise<RelationsListResult> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
      { name: 'provider_id', value: params?.providerId, style: 'form', explode: true, allowReserved: false },
      { name: 'seller_provider_id', value: params?.sellerProviderId, style: 'form', explode: true, allowReserved: false },
      { name: 'buyer_provider_id', value: params?.buyerProviderId, style: 'form', explode: true, allowReserved: false },
      { name: 'edge_id', value: params?.edgeId, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<RelationsListResult>(appendQueryString(backendApiPath(`/service_providers/relations`), query));
  }
}

export interface ServiceProvidersReconciliationRunsListParams {
  page?: string;
  pageSize?: string;
  status?: string;
  providerId?: string;
  sellerProviderId?: string;
  buyerProviderId?: string;
  edgeId?: string;
}

export class ServiceProvidersReconciliationRunsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Service Provider Reconciliation Runs List */
  async list(params?: ServiceProvidersReconciliationRunsListParams): Promise<ReconciliationRunsListResult> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
      { name: 'provider_id', value: params?.providerId, style: 'form', explode: true, allowReserved: false },
      { name: 'seller_provider_id', value: params?.sellerProviderId, style: 'form', explode: true, allowReserved: false },
      { name: 'buyer_provider_id', value: params?.buyerProviderId, style: 'form', explode: true, allowReserved: false },
      { name: 'edge_id', value: params?.edgeId, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<ReconciliationRunsListResult>(appendQueryString(backendApiPath(`/service_providers/reconciliation_runs`), query));
  }
}

export interface ServiceProvidersProviderRegistryListParams {
  page?: string;
  pageSize?: string;
  status?: string;
  providerId?: string;
  sellerProviderId?: string;
  buyerProviderId?: string;
  edgeId?: string;
}

export class ServiceProvidersProviderRegistryApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Service Providers List */
  async list(params?: ServiceProvidersProviderRegistryListParams): Promise<ProviderRegistryListResult> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
      { name: 'provider_id', value: params?.providerId, style: 'form', explode: true, allowReserved: false },
      { name: 'seller_provider_id', value: params?.sellerProviderId, style: 'form', explode: true, allowReserved: false },
      { name: 'buyer_provider_id', value: params?.buyerProviderId, style: 'form', explode: true, allowReserved: false },
      { name: 'edge_id', value: params?.edgeId, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<ProviderRegistryListResult>(appendQueryString(backendApiPath(`/service_providers/providers`), query));
  }
}

export interface ServiceProvidersPriceSimulationCreateParams {
  idempotencyKey: string;
}

export class ServiceProvidersPriceSimulationApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Service Provider Price Simulation Create */
  async create(body: ServiceProviderPriceSimulationRequest, params: ServiceProvidersPriceSimulationCreateParams): Promise<PriceSimulationCreateResult> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.post<PriceSimulationCreateResult>(backendApiPath(`/service_providers/pricing/simulations`), body, undefined, requestHeaders, 'application/json');
  }
}

export interface ServiceProvidersPricingRulesListParams {
  page?: string;
  pageSize?: string;
  status?: string;
  providerId?: string;
  sellerProviderId?: string;
  buyerProviderId?: string;
  edgeId?: string;
}

export interface ServiceProvidersPricingRulesCreateParams {
  idempotencyKey: string;
}

export interface ServiceProvidersPricingRulesUpdateParams {
  idempotencyKey: string;
}

export class ServiceProvidersPricingRulesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Service Provider Pricing Rules List */
  async list(params?: ServiceProvidersPricingRulesListParams): Promise<PricingRulesListResult> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
      { name: 'provider_id', value: params?.providerId, style: 'form', explode: true, allowReserved: false },
      { name: 'seller_provider_id', value: params?.sellerProviderId, style: 'form', explode: true, allowReserved: false },
      { name: 'buyer_provider_id', value: params?.buyerProviderId, style: 'form', explode: true, allowReserved: false },
      { name: 'edge_id', value: params?.edgeId, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<PricingRulesListResult>(appendQueryString(backendApiPath(`/service_providers/pricing/rules`), query));
  }

/** Service Provider Pricing Rule Create */
  async create(body: ServiceProviderPricingRuleCreateRequest, params: ServiceProvidersPricingRulesCreateParams): Promise<PricingRulesCreateResult> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.post<PricingRulesCreateResult>(backendApiPath(`/service_providers/pricing/rules`), body, undefined, requestHeaders, 'application/json');
  }

/** Service Provider Pricing Rule Update */
  async update(ruleId: string, body: ServiceProviderPricingRuleUpdateRequest, params: ServiceProvidersPricingRulesUpdateParams): Promise<PricingRulesUpdateResult> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.patch<PricingRulesUpdateResult>(backendApiPath(`/service_providers/pricing/rules/${serializePathParameter(ruleId, { name: 'ruleId', style: 'simple', explode: false })}`), body, undefined, requestHeaders, 'application/json');
  }
}

export interface ServiceProvidersMembersListParams {
  page?: string;
  pageSize?: string;
  status?: string;
  providerId?: string;
  sellerProviderId?: string;
  buyerProviderId?: string;
  edgeId?: string;
}

export class ServiceProvidersMembersApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Service Provider Members List */
  async list(params?: ServiceProvidersMembersListParams): Promise<MembersListResult> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
      { name: 'provider_id', value: params?.providerId, style: 'form', explode: true, allowReserved: false },
      { name: 'seller_provider_id', value: params?.sellerProviderId, style: 'form', explode: true, allowReserved: false },
      { name: 'buyer_provider_id', value: params?.buyerProviderId, style: 'form', explode: true, allowReserved: false },
      { name: 'edge_id', value: params?.edgeId, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<MembersListResult>(appendQueryString(backendApiPath(`/service_providers/members`), query));
  }
}

export interface ServiceProvidersDownstreamsListParams {
  page?: string;
  pageSize?: string;
  status?: string;
  providerId?: string;
  sellerProviderId?: string;
  buyerProviderId?: string;
  edgeId?: string;
}

export interface ServiceProvidersDownstreamsCreateParams {
  idempotencyKey: string;
}

export class ServiceProvidersDownstreamsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Service Provider Downstreams List */
  async list(params?: ServiceProvidersDownstreamsListParams): Promise<DownstreamsListResult> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
      { name: 'provider_id', value: params?.providerId, style: 'form', explode: true, allowReserved: false },
      { name: 'seller_provider_id', value: params?.sellerProviderId, style: 'form', explode: true, allowReserved: false },
      { name: 'buyer_provider_id', value: params?.buyerProviderId, style: 'form', explode: true, allowReserved: false },
      { name: 'edge_id', value: params?.edgeId, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<DownstreamsListResult>(appendQueryString(backendApiPath(`/service_providers/downstreams`), query));
  }

/** Service Provider Downstream Create */
  async create(body: ServiceProviderDownstreamCreateRequest, params: ServiceProvidersDownstreamsCreateParams): Promise<DownstreamsCreateResult> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.post<DownstreamsCreateResult>(backendApiPath(`/service_providers/downstreams`), body, undefined, requestHeaders, 'application/json');
  }
}

export interface ServiceProvidersDashboardRetrieveParams {
  page?: string;
  pageSize?: string;
  status?: string;
  providerId?: string;
  sellerProviderId?: string;
  buyerProviderId?: string;
  edgeId?: string;
}

export class ServiceProvidersDashboardApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Service Provider Dashboard Retrieve */
  async retrieve(params?: ServiceProvidersDashboardRetrieveParams): Promise<DashboardRetrieveResult> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
      { name: 'provider_id', value: params?.providerId, style: 'form', explode: true, allowReserved: false },
      { name: 'seller_provider_id', value: params?.sellerProviderId, style: 'form', explode: true, allowReserved: false },
      { name: 'buyer_provider_id', value: params?.buyerProviderId, style: 'form', explode: true, allowReserved: false },
      { name: 'edge_id', value: params?.edgeId, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<DashboardRetrieveResult>(appendQueryString(backendApiPath(`/service_providers/dashboard`), query));
  }
}

export interface ServiceProvidersContractsListParams {
  page?: string;
  pageSize?: string;
  status?: string;
  providerId?: string;
  sellerProviderId?: string;
  buyerProviderId?: string;
  edgeId?: string;
}

export class ServiceProvidersContractsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Service Provider Contracts List */
  async list(params?: ServiceProvidersContractsListParams): Promise<ContractsListResult> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
      { name: 'provider_id', value: params?.providerId, style: 'form', explode: true, allowReserved: false },
      { name: 'seller_provider_id', value: params?.sellerProviderId, style: 'form', explode: true, allowReserved: false },
      { name: 'buyer_provider_id', value: params?.buyerProviderId, style: 'form', explode: true, allowReserved: false },
      { name: 'edge_id', value: params?.edgeId, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<ContractsListResult>(appendQueryString(backendApiPath(`/service_providers/contracts`), query));
  }
}

export interface ServiceProvidersBindingsListParams {
  page?: string;
  pageSize?: string;
  status?: string;
  providerId?: string;
  sellerProviderId?: string;
  buyerProviderId?: string;
  edgeId?: string;
}

export class ServiceProvidersBindingsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Service Provider Bindings List */
  async list(params?: ServiceProvidersBindingsListParams): Promise<BindingsListResult> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
      { name: 'provider_id', value: params?.providerId, style: 'form', explode: true, allowReserved: false },
      { name: 'seller_provider_id', value: params?.sellerProviderId, style: 'form', explode: true, allowReserved: false },
      { name: 'buyer_provider_id', value: params?.buyerProviderId, style: 'form', explode: true, allowReserved: false },
      { name: 'edge_id', value: params?.edgeId, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<BindingsListResult>(appendQueryString(backendApiPath(`/service_providers/bindings`), query));
  }
}

export interface ServiceProvidersAuditEventsListParams {
  page?: string;
  pageSize?: string;
  status?: string;
  providerId?: string;
  sellerProviderId?: string;
  buyerProviderId?: string;
  edgeId?: string;
}

export class ServiceProvidersAuditEventsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Service Provider Audit Events List */
  async list(params?: ServiceProvidersAuditEventsListParams): Promise<AuditEventsListResult> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
      { name: 'provider_id', value: params?.providerId, style: 'form', explode: true, allowReserved: false },
      { name: 'seller_provider_id', value: params?.sellerProviderId, style: 'form', explode: true, allowReserved: false },
      { name: 'buyer_provider_id', value: params?.buyerProviderId, style: 'form', explode: true, allowReserved: false },
      { name: 'edge_id', value: params?.edgeId, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<AuditEventsListResult>(appendQueryString(backendApiPath(`/service_providers/audit/events`), query));
  }
}

export interface ServiceProvidersAdjustmentsListParams {
  page?: string;
  pageSize?: string;
  status?: string;
  providerId?: string;
  sellerProviderId?: string;
  buyerProviderId?: string;
  edgeId?: string;
}

export class ServiceProvidersAdjustmentsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Service Provider Adjustments List */
  async list(params?: ServiceProvidersAdjustmentsListParams): Promise<AdjustmentsListResult> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
      { name: 'provider_id', value: params?.providerId, style: 'form', explode: true, allowReserved: false },
      { name: 'seller_provider_id', value: params?.sellerProviderId, style: 'form', explode: true, allowReserved: false },
      { name: 'buyer_provider_id', value: params?.buyerProviderId, style: 'form', explode: true, allowReserved: false },
      { name: 'edge_id', value: params?.edgeId, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<AdjustmentsListResult>(appendQueryString(backendApiPath(`/service_providers/adjustments`), query));
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
