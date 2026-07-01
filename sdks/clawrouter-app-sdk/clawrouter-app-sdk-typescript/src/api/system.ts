import { appApiPath } from './paths';
import type { HttpClient } from '../http/client';

import type { AfterSalesRequestsCreateResult, AfterSalesRequestsRetrieveResult, AfterSalesRequestsUpdateResult, AfterSalesReturnShipmentsCreateResult, SdkWorkPageData, ShopsCurrentApplicationsCreateResult, ShopsCurrentBrandAuthorizationsUpsertResult, ShopsCurrentBusinessHoursRetrieveResult, ShopsCurrentBusinessHoursUpdateResult, ShopsCurrentCategoryBindingsUpsertResult, ShopsCurrentChannelsUpdateResult, ShopsCurrentCustomerServicesUpsertResult, ShopsCurrentDashboardRetrieveResult, ShopsCurrentDepositAccountRetrieveResult, ShopsCurrentFulfillmentProfileRetrieveResult, ShopsCurrentFulfillmentProfileUpdateResult, ShopsCurrentInventoryStocksAdjustmentsCreateResult, ShopsCurrentOrdersFulfillmentsCreateResult, ShopsCurrentOrdersRetrieveResult, ShopsCurrentPoliciesUpdateResult, ShopsCurrentProductsCreateResult, ShopsCurrentProductsPublishResult, ShopsCurrentProductsUnpublishResult, ShopsCurrentProductsUpdateResult, ShopsCurrentQualificationsUpsertResult, ShopsCurrentReadinessRetrieveResult, ShopsCurrentRetrieveResult, ShopsCurrentReturnAddressesUpsertResult, ShopsCurrentServiceAreasCreateResult, ShopsCurrentServiceAreasUpdateResult, ShopsCurrentSettlementProfileRetrieveResult, ShopsCurrentSettlementProfileUpdateResult, ShopsCurrentShippingTemplatesUpsertResult, ShopsRetrieveResult, SiteRuntimeRetrieveResult } from '../types';


export class SystemSiteRuntimeApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(): Promise<SiteRuntimeRetrieveResult> {
    return this.client.get<SiteRuntimeRetrieveResult>(appApiPath(`/system/site/runtime`));
  }
}

export class SystemSiteApi {
  private client: HttpClient;
  public readonly runtime: SystemSiteRuntimeApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.runtime = new SystemSiteRuntimeApi(client);
  }

}

export class SystemShopsCurrentVerificationsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(appApiPath(`/shops/current/verifications`));
  }
}

export class SystemShopsCurrentStatusEventsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(appApiPath(`/shops/current/status_events`));
  }
}

export class SystemShopsCurrentShippingTemplatesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(appApiPath(`/shops/current/shipping_templates`));
  }

/** Upsert */
  async upsert(): Promise<ShopsCurrentShippingTemplatesUpsertResult> {
    return this.client.put<ShopsCurrentShippingTemplatesUpsertResult>(appApiPath(`/system/shops/current/shipping_templates`));
  }
}

export class SystemShopsCurrentSettlementsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(appApiPath(`/shops/current/settlements`));
  }
}

export class SystemShopsCurrentSettlementProfileApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(): Promise<ShopsCurrentSettlementProfileRetrieveResult> {
    return this.client.get<ShopsCurrentSettlementProfileRetrieveResult>(appApiPath(`/shops/current/settlement_profile`));
  }

/** Update */
  async update(): Promise<ShopsCurrentSettlementProfileUpdateResult> {
    return this.client.patch<ShopsCurrentSettlementProfileUpdateResult>(appApiPath(`/system/shops/current/settlement_profile`));
  }
}

export class SystemShopsCurrentServiceAreasApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(appApiPath(`/shops/current/service_areas`));
  }

/** Create */
  async create(): Promise<ShopsCurrentServiceAreasCreateResult> {
    return this.client.post<ShopsCurrentServiceAreasCreateResult>(appApiPath(`/system/shops/current/service_areas`));
  }

/** Update */
  async update(serviceAreaId: string): Promise<ShopsCurrentServiceAreasUpdateResult> {
    return this.client.patch<ShopsCurrentServiceAreasUpdateResult>(appApiPath(`/system/shops/current/service_areas/${serializePathParameter(serviceAreaId, { name: 'serviceAreaId', style: 'simple', explode: false })}`));
  }
}

export class SystemShopsCurrentRiskSignalsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(appApiPath(`/shops/current/risk_signals`));
  }
}

export class SystemShopsCurrentReturnAddressesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(appApiPath(`/shops/current/return_addresses`));
  }

/** Upsert */
  async upsert(): Promise<ShopsCurrentReturnAddressesUpsertResult> {
    return this.client.put<ShopsCurrentReturnAddressesUpsertResult>(appApiPath(`/system/shops/current/return_addresses`));
  }
}

export class SystemShopsCurrentReadinessApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(): Promise<ShopsCurrentReadinessRetrieveResult> {
    return this.client.get<ShopsCurrentReadinessRetrieveResult>(appApiPath(`/shops/current/readiness`));
  }
}

export class SystemShopsCurrentQualificationsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(appApiPath(`/shops/current/qualifications`));
  }

/** Upsert */
  async upsert(): Promise<ShopsCurrentQualificationsUpsertResult> {
    return this.client.put<ShopsCurrentQualificationsUpsertResult>(appApiPath(`/system/shops/current/qualifications`));
  }
}

export class SystemShopsCurrentProductsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(appApiPath(`/shops/current/products`));
  }

/** Create */
  async create(): Promise<ShopsCurrentProductsCreateResult> {
    return this.client.post<ShopsCurrentProductsCreateResult>(appApiPath(`/system/shops/current/products`));
  }

/** Update */
  async update(productId: string): Promise<ShopsCurrentProductsUpdateResult> {
    return this.client.patch<ShopsCurrentProductsUpdateResult>(appApiPath(`/system/shops/current/products/${serializePathParameter(productId, { name: 'productId', style: 'simple', explode: false })}`));
  }

/** Publish */
  async publish(productId: string): Promise<ShopsCurrentProductsPublishResult> {
    return this.client.post<ShopsCurrentProductsPublishResult>(appApiPath(`/system/shops/current/products/${serializePathParameter(productId, { name: 'productId', style: 'simple', explode: false })}/publish`));
  }

/** Unpublish */
  async unpublish(productId: string): Promise<ShopsCurrentProductsUnpublishResult> {
    return this.client.post<ShopsCurrentProductsUnpublishResult>(appApiPath(`/system/shops/current/products/${serializePathParameter(productId, { name: 'productId', style: 'simple', explode: false })}/unpublish`));
  }
}

export class SystemShopsCurrentPoliciesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(appApiPath(`/shops/current/policies`));
  }

/** Update */
  async update(policyId: string): Promise<ShopsCurrentPoliciesUpdateResult> {
    return this.client.patch<ShopsCurrentPoliciesUpdateResult>(appApiPath(`/system/shops/current/policies/${serializePathParameter(policyId, { name: 'policyId', style: 'simple', explode: false })}`));
  }
}

export class SystemShopsCurrentOrdersFulfillmentsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create */
  async create(orderId: string): Promise<ShopsCurrentOrdersFulfillmentsCreateResult> {
    return this.client.post<ShopsCurrentOrdersFulfillmentsCreateResult>(appApiPath(`/system/shops/current/orders/${serializePathParameter(orderId, { name: 'orderId', style: 'simple', explode: false })}/fulfillments`));
  }
}

export class SystemShopsCurrentOrdersApi {
  private client: HttpClient;
  public readonly fulfillments: SystemShopsCurrentOrdersFulfillmentsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.fulfillments = new SystemShopsCurrentOrdersFulfillmentsApi(client);
  }


/** List */
  async list(): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(appApiPath(`/shops/current/orders`));
  }

/** Retrieve */
  async retrieve(orderId: string): Promise<ShopsCurrentOrdersRetrieveResult> {
    return this.client.get<ShopsCurrentOrdersRetrieveResult>(appApiPath(`/shops/current/orders/${serializePathParameter(orderId, { name: 'orderId', style: 'simple', explode: false })}`));
  }
}

export class SystemShopsCurrentInventoryStocksAdjustmentsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create */
  async create(stockId: string): Promise<ShopsCurrentInventoryStocksAdjustmentsCreateResult> {
    return this.client.post<ShopsCurrentInventoryStocksAdjustmentsCreateResult>(appApiPath(`/system/shops/current/inventory/stocks/${serializePathParameter(stockId, { name: 'stockId', style: 'simple', explode: false })}/adjustments`));
  }
}

export class SystemShopsCurrentInventoryStocksApi {
  private client: HttpClient;
  public readonly adjustments: SystemShopsCurrentInventoryStocksAdjustmentsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.adjustments = new SystemShopsCurrentInventoryStocksAdjustmentsApi(client);
  }


/** List */
  async list(): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(appApiPath(`/shops/current/inventory/stocks`));
  }
}

export class SystemShopsCurrentInventoryApi {
  private client: HttpClient;
  public readonly stocks: SystemShopsCurrentInventoryStocksApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.stocks = new SystemShopsCurrentInventoryStocksApi(client);
  }

}

export class SystemShopsCurrentFulfillmentProfileApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(): Promise<ShopsCurrentFulfillmentProfileRetrieveResult> {
    return this.client.get<ShopsCurrentFulfillmentProfileRetrieveResult>(appApiPath(`/shops/current/fulfillment_profile`));
  }

/** Update */
  async update(): Promise<ShopsCurrentFulfillmentProfileUpdateResult> {
    return this.client.patch<ShopsCurrentFulfillmentProfileUpdateResult>(appApiPath(`/system/shops/current/fulfillment_profile`));
  }
}

export class SystemShopsCurrentDepositAccountApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(): Promise<ShopsCurrentDepositAccountRetrieveResult> {
    return this.client.get<ShopsCurrentDepositAccountRetrieveResult>(appApiPath(`/shops/current/deposit_account`));
  }
}

export class SystemShopsCurrentDashboardApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(): Promise<ShopsCurrentDashboardRetrieveResult> {
    return this.client.get<ShopsCurrentDashboardRetrieveResult>(appApiPath(`/shops/current/dashboard`));
  }
}

export class SystemShopsCurrentCustomerServicesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(appApiPath(`/shops/current/customer_services`));
  }

/** Upsert */
  async upsert(): Promise<ShopsCurrentCustomerServicesUpsertResult> {
    return this.client.put<ShopsCurrentCustomerServicesUpsertResult>(appApiPath(`/system/shops/current/customer_services`));
  }
}

export class SystemShopsCurrentChannelsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(appApiPath(`/shops/current/channels`));
  }

/** Update */
  async update(channelId: string): Promise<ShopsCurrentChannelsUpdateResult> {
    return this.client.patch<ShopsCurrentChannelsUpdateResult>(appApiPath(`/system/shops/current/channels/${serializePathParameter(channelId, { name: 'channelId', style: 'simple', explode: false })}`));
  }
}

export class SystemShopsCurrentCategoryBindingsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(appApiPath(`/shops/current/category_bindings`));
  }

/** Upsert */
  async upsert(): Promise<ShopsCurrentCategoryBindingsUpsertResult> {
    return this.client.put<ShopsCurrentCategoryBindingsUpsertResult>(appApiPath(`/system/shops/current/category_bindings`));
  }
}

export class SystemShopsCurrentBusinessHoursApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(): Promise<ShopsCurrentBusinessHoursRetrieveResult> {
    return this.client.get<ShopsCurrentBusinessHoursRetrieveResult>(appApiPath(`/shops/current/business_hours`));
  }

/** Update */
  async update(): Promise<ShopsCurrentBusinessHoursUpdateResult> {
    return this.client.patch<ShopsCurrentBusinessHoursUpdateResult>(appApiPath(`/system/shops/current/business_hours`));
  }
}

export class SystemShopsCurrentBrandAuthorizationsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(appApiPath(`/shops/current/brand_authorizations`));
  }

/** Upsert */
  async upsert(): Promise<ShopsCurrentBrandAuthorizationsUpsertResult> {
    return this.client.put<ShopsCurrentBrandAuthorizationsUpsertResult>(appApiPath(`/system/shops/current/brand_authorizations`));
  }
}

export class SystemShopsCurrentApplicationsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(appApiPath(`/shops/current/applications`));
  }

/** Create */
  async create(): Promise<ShopsCurrentApplicationsCreateResult> {
    return this.client.post<ShopsCurrentApplicationsCreateResult>(appApiPath(`/system/shops/current/applications`));
  }
}

export class SystemShopsCurrentApi {
  private client: HttpClient;
  public readonly applications: SystemShopsCurrentApplicationsApi;
  public readonly brandAuthorizations: SystemShopsCurrentBrandAuthorizationsApi;
  public readonly businessHours: SystemShopsCurrentBusinessHoursApi;
  public readonly categoryBindings: SystemShopsCurrentCategoryBindingsApi;
  public readonly channels: SystemShopsCurrentChannelsApi;
  public readonly customerServices: SystemShopsCurrentCustomerServicesApi;
  public readonly dashboard: SystemShopsCurrentDashboardApi;
  public readonly depositAccount: SystemShopsCurrentDepositAccountApi;
  public readonly fulfillmentProfile: SystemShopsCurrentFulfillmentProfileApi;
  public readonly inventory: SystemShopsCurrentInventoryApi;
  public readonly orders: SystemShopsCurrentOrdersApi;
  public readonly policies: SystemShopsCurrentPoliciesApi;
  public readonly products: SystemShopsCurrentProductsApi;
  public readonly qualifications: SystemShopsCurrentQualificationsApi;
  public readonly readiness: SystemShopsCurrentReadinessApi;
  public readonly returnAddresses: SystemShopsCurrentReturnAddressesApi;
  public readonly riskSignals: SystemShopsCurrentRiskSignalsApi;
  public readonly serviceAreas: SystemShopsCurrentServiceAreasApi;
  public readonly settlementProfile: SystemShopsCurrentSettlementProfileApi;
  public readonly settlements: SystemShopsCurrentSettlementsApi;
  public readonly shippingTemplates: SystemShopsCurrentShippingTemplatesApi;
  public readonly statusEvents: SystemShopsCurrentStatusEventsApi;
  public readonly verifications: SystemShopsCurrentVerificationsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.applications = new SystemShopsCurrentApplicationsApi(client);
    this.brandAuthorizations = new SystemShopsCurrentBrandAuthorizationsApi(client);
    this.businessHours = new SystemShopsCurrentBusinessHoursApi(client);
    this.categoryBindings = new SystemShopsCurrentCategoryBindingsApi(client);
    this.channels = new SystemShopsCurrentChannelsApi(client);
    this.customerServices = new SystemShopsCurrentCustomerServicesApi(client);
    this.dashboard = new SystemShopsCurrentDashboardApi(client);
    this.depositAccount = new SystemShopsCurrentDepositAccountApi(client);
    this.fulfillmentProfile = new SystemShopsCurrentFulfillmentProfileApi(client);
    this.inventory = new SystemShopsCurrentInventoryApi(client);
    this.orders = new SystemShopsCurrentOrdersApi(client);
    this.policies = new SystemShopsCurrentPoliciesApi(client);
    this.products = new SystemShopsCurrentProductsApi(client);
    this.qualifications = new SystemShopsCurrentQualificationsApi(client);
    this.readiness = new SystemShopsCurrentReadinessApi(client);
    this.returnAddresses = new SystemShopsCurrentReturnAddressesApi(client);
    this.riskSignals = new SystemShopsCurrentRiskSignalsApi(client);
    this.serviceAreas = new SystemShopsCurrentServiceAreasApi(client);
    this.settlementProfile = new SystemShopsCurrentSettlementProfileApi(client);
    this.settlements = new SystemShopsCurrentSettlementsApi(client);
    this.shippingTemplates = new SystemShopsCurrentShippingTemplatesApi(client);
    this.statusEvents = new SystemShopsCurrentStatusEventsApi(client);
    this.verifications = new SystemShopsCurrentVerificationsApi(client);
  }


/** Retrieve */
  async retrieve(): Promise<ShopsCurrentRetrieveResult> {
    return this.client.get<ShopsCurrentRetrieveResult>(appApiPath(`/shops/current`));
  }
}

export class SystemShopsApi {
  private client: HttpClient;
  public readonly current: SystemShopsCurrentApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.current = new SystemShopsCurrentApi(client);
  }


/** List */
  async list(): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(appApiPath(`/shops`));
  }

/** Retrieve */
  async retrieve(shopId: string): Promise<ShopsRetrieveResult> {
    return this.client.get<ShopsRetrieveResult>(appApiPath(`/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}`));
  }
}

export class SystemAfterSalesReturnShipmentsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(afterSalesRequestId: string): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(appApiPath(`/after_sales/requests/${serializePathParameter(afterSalesRequestId, { name: 'afterSalesRequestId', style: 'simple', explode: false })}/return_shipments`));
  }

/** Create */
  async create(afterSalesRequestId: string): Promise<AfterSalesReturnShipmentsCreateResult> {
    return this.client.post<AfterSalesReturnShipmentsCreateResult>(appApiPath(`/system/after_sales/requests/${serializePathParameter(afterSalesRequestId, { name: 'afterSalesRequestId', style: 'simple', explode: false })}/return_shipments`));
  }
}

export class SystemAfterSalesEventsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(afterSalesRequestId: string): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(appApiPath(`/after_sales/requests/${serializePathParameter(afterSalesRequestId, { name: 'afterSalesRequestId', style: 'simple', explode: false })}/events`));
  }
}

export class SystemAfterSalesRequestsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(appApiPath(`/after_sales/requests`));
  }

/** Retrieve */
  async retrieve(afterSalesRequestId: string): Promise<AfterSalesRequestsRetrieveResult> {
    return this.client.get<AfterSalesRequestsRetrieveResult>(appApiPath(`/after_sales/requests/${serializePathParameter(afterSalesRequestId, { name: 'afterSalesRequestId', style: 'simple', explode: false })}`));
  }

/** Create */
  async create(): Promise<AfterSalesRequestsCreateResult> {
    return this.client.post<AfterSalesRequestsCreateResult>(appApiPath(`/system/after_sales/requests`));
  }

/** Update */
  async update(afterSalesRequestId: string): Promise<AfterSalesRequestsUpdateResult> {
    return this.client.patch<AfterSalesRequestsUpdateResult>(appApiPath(`/system/after_sales/requests/${serializePathParameter(afterSalesRequestId, { name: 'afterSalesRequestId', style: 'simple', explode: false })}`));
  }
}

export class SystemAfterSalesApi {
  private client: HttpClient;
  public readonly requests: SystemAfterSalesRequestsApi;
  public readonly events: SystemAfterSalesEventsApi;
  public readonly returnShipments: SystemAfterSalesReturnShipmentsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.requests = new SystemAfterSalesRequestsApi(client);
    this.events = new SystemAfterSalesEventsApi(client);
    this.returnShipments = new SystemAfterSalesReturnShipmentsApi(client);
  }

}

export class SystemApi {
  private client: HttpClient;
  public readonly afterSales: SystemAfterSalesApi;
  public readonly shops: SystemShopsApi;
  public readonly site: SystemSiteApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.afterSales = new SystemAfterSalesApi(client);
    this.shops = new SystemShopsApi(client);
    this.site = new SystemSiteApi(client);
  }

}

export function createSystemApi(client: HttpClient): SystemApi {
  return new SystemApi(client);
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
