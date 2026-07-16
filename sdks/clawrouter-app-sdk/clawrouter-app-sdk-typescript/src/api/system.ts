import { appApiPath } from './paths';
import type { HttpClient } from '../http/client';

export class SystemSiteRuntimeApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(appApiPath(`/system/site/runtime`));
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

export class SystemAfterSalesReturnShipmentsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create */
  async create(afterSalesRequestId: string): Promise<Record<string, never>> {
    return this.client.post<Record<string, never>>(appApiPath(`/system/after_sales/requests/${serializePathParameter(afterSalesRequestId, { name: 'afterSalesRequestId', style: 'simple', explode: false })}/return_shipments`));
  }
}

export class SystemAfterSalesRequestsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create */
  async create(): Promise<Record<string, never>> {
    return this.client.post<Record<string, never>>(appApiPath(`/system/after_sales/requests`));
  }

/** Update */
  async update(afterSalesRequestId: string): Promise<Record<string, never>> {
    return this.client.patch<Record<string, never>>(appApiPath(`/system/after_sales/requests/${serializePathParameter(afterSalesRequestId, { name: 'afterSalesRequestId', style: 'simple', explode: false })}`));
  }
}

export class SystemAfterSalesApi {
  private client: HttpClient;
  public readonly requests: SystemAfterSalesRequestsApi;
  public readonly returnShipments: SystemAfterSalesReturnShipmentsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.requests = new SystemAfterSalesRequestsApi(client);
    this.returnShipments = new SystemAfterSalesReturnShipmentsApi(client);
  }

}

export class SystemShopsCurrentVerificationsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(appApiPath(`/shops/current/verifications`));
  }
}

export class SystemShopsCurrentStatusEventsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(appApiPath(`/shops/current/status_events`));
  }
}

export class SystemShopsCurrentShippingTemplatesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(appApiPath(`/shops/current/shipping_templates`));
  }

/** Upsert */
  async update(): Promise<Record<string, never>> {
    return this.client.put<Record<string, never>>(appApiPath(`/system/shops/current/shipping_templates`));
  }
}

export class SystemShopsCurrentSettlementsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(appApiPath(`/shops/current/settlements`));
  }
}

export class SystemShopsCurrentSettlementProfileApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(appApiPath(`/shops/current/settlement_profile`));
  }

/** Update */
  async update(): Promise<Record<string, never>> {
    return this.client.patch<Record<string, never>>(appApiPath(`/system/shops/current/settlement_profile`));
  }
}

export class SystemShopsCurrentServiceAreasApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(appApiPath(`/shops/current/service_areas`));
  }

/** Create */
  async create(): Promise<Record<string, never>> {
    return this.client.post<Record<string, never>>(appApiPath(`/system/shops/current/service_areas`));
  }

/** Update */
  async update(serviceAreaId: string): Promise<Record<string, never>> {
    return this.client.patch<Record<string, never>>(appApiPath(`/system/shops/current/service_areas/${serializePathParameter(serviceAreaId, { name: 'serviceAreaId', style: 'simple', explode: false })}`));
  }
}

export class SystemShopsCurrentRiskSignalsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(appApiPath(`/shops/current/risk_signals`));
  }
}

export class SystemShopsCurrentReturnAddressesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(appApiPath(`/shops/current/return_addresses`));
  }

/** Upsert */
  async update(): Promise<Record<string, never>> {
    return this.client.put<Record<string, never>>(appApiPath(`/system/shops/current/return_addresses`));
  }
}

export class SystemShopsCurrentReadinessApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(appApiPath(`/shops/current/readiness`));
  }
}

export class SystemShopsCurrentQualificationsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(appApiPath(`/shops/current/qualifications`));
  }

/** Upsert */
  async update(): Promise<Record<string, never>> {
    return this.client.put<Record<string, never>>(appApiPath(`/system/shops/current/qualifications`));
  }
}

export class SystemShopsCurrentProductsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(appApiPath(`/shops/current/products`));
  }

/** Create */
  async create(): Promise<Record<string, never>> {
    return this.client.post<Record<string, never>>(appApiPath(`/system/shops/current/products`));
  }

/** Update */
  async update(productId: string): Promise<Record<string, never>> {
    return this.client.patch<Record<string, never>>(appApiPath(`/system/shops/current/products/${serializePathParameter(productId, { name: 'productId', style: 'simple', explode: false })}`));
  }

/** Publish */
  async publish(productId: string): Promise<Record<string, never>> {
    return this.client.post<Record<string, never>>(appApiPath(`/system/shops/current/products/${serializePathParameter(productId, { name: 'productId', style: 'simple', explode: false })}/publish`));
  }

/** Unpublish */
  async unpublish(productId: string): Promise<Record<string, never>> {
    return this.client.post<Record<string, never>>(appApiPath(`/system/shops/current/products/${serializePathParameter(productId, { name: 'productId', style: 'simple', explode: false })}/unpublish`));
  }
}

export class SystemShopsCurrentPoliciesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(appApiPath(`/shops/current/policies`));
  }

/** Update */
  async update(policyId: string): Promise<Record<string, never>> {
    return this.client.patch<Record<string, never>>(appApiPath(`/system/shops/current/policies/${serializePathParameter(policyId, { name: 'policyId', style: 'simple', explode: false })}`));
  }
}

export class SystemShopsCurrentOrdersFulfillmentsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create */
  async create(orderId: string): Promise<Record<string, never>> {
    return this.client.post<Record<string, never>>(appApiPath(`/system/shops/current/orders/${serializePathParameter(orderId, { name: 'orderId', style: 'simple', explode: false })}/fulfillments`));
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
  async list(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(appApiPath(`/shops/current/orders`));
  }

/** Retrieve */
  async retrieve(orderId: string): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(appApiPath(`/shops/current/orders/${serializePathParameter(orderId, { name: 'orderId', style: 'simple', explode: false })}`));
  }
}

export class SystemShopsCurrentInventoryStocksAdjustmentsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create */
  async create(stockId: string): Promise<Record<string, never>> {
    return this.client.post<Record<string, never>>(appApiPath(`/system/shops/current/inventory/stocks/${serializePathParameter(stockId, { name: 'stockId', style: 'simple', explode: false })}/adjustments`));
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
  async list(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(appApiPath(`/shops/current/inventory/stocks`));
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
  async retrieve(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(appApiPath(`/shops/current/fulfillment_profile`));
  }

/** Update */
  async update(): Promise<Record<string, never>> {
    return this.client.patch<Record<string, never>>(appApiPath(`/system/shops/current/fulfillment_profile`));
  }
}

export class SystemShopsCurrentDepositAccountApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(appApiPath(`/shops/current/deposit_account`));
  }
}

export class SystemShopsCurrentDashboardApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(appApiPath(`/shops/current/dashboard`));
  }
}

export class SystemShopsCurrentCustomerServicesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(appApiPath(`/shops/current/customer_services`));
  }

/** Upsert */
  async update(): Promise<Record<string, never>> {
    return this.client.put<Record<string, never>>(appApiPath(`/system/shops/current/customer_services`));
  }
}

export class SystemShopsCurrentChannelsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(appApiPath(`/shops/current/channels`));
  }

/** Update */
  async update(channelId: string): Promise<Record<string, never>> {
    return this.client.patch<Record<string, never>>(appApiPath(`/system/shops/current/channels/${serializePathParameter(channelId, { name: 'channelId', style: 'simple', explode: false })}`));
  }
}

export class SystemShopsCurrentCategoryBindingsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(appApiPath(`/shops/current/category_bindings`));
  }

/** Upsert */
  async update(): Promise<Record<string, never>> {
    return this.client.put<Record<string, never>>(appApiPath(`/system/shops/current/category_bindings`));
  }
}

export class SystemShopsCurrentBusinessHoursApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(appApiPath(`/shops/current/business_hours`));
  }

/** Update */
  async update(): Promise<Record<string, never>> {
    return this.client.patch<Record<string, never>>(appApiPath(`/system/shops/current/business_hours`));
  }
}

export class SystemShopsCurrentBrandAuthorizationsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(appApiPath(`/shops/current/brand_authorizations`));
  }

/** Upsert */
  async update(): Promise<Record<string, never>> {
    return this.client.put<Record<string, never>>(appApiPath(`/system/shops/current/brand_authorizations`));
  }
}

export class SystemShopsCurrentApplicationsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(appApiPath(`/shops/current/applications`));
  }

/** Create */
  async create(): Promise<Record<string, never>> {
    return this.client.post<Record<string, never>>(appApiPath(`/system/shops/current/applications`));
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
  async retrieve(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(appApiPath(`/shops/current`));
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
  async list(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(appApiPath(`/shops`));
  }

/** Retrieve */
  async retrieve(shopId: string): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(appApiPath(`/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}`));
  }
}

export class SystemApi {
  private client: HttpClient;
  public readonly shops: SystemShopsApi;
  public readonly afterSales: SystemAfterSalesApi;
  public readonly site: SystemSiteApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.shops = new SystemShopsApi(client);
    this.afterSales = new SystemAfterSalesApi(client);
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
