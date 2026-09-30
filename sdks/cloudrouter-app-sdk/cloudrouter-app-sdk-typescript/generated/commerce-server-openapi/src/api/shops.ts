import { appApiPath } from './paths';
import type { HttpClient } from '../http/client';

import type { CommerceApiResult, CommerceOperationCommand, CreateShopServiceAreaRequest, CurrentShopResponse, ShopApplicationListResponse, ShopApplicationResponse, ShopBrandAuthorizationListResponse, ShopBrandAuthorizationResponse, ShopBusinessHourResponse, ShopCategoryBindingListResponse, ShopCategoryBindingResponse, ShopChannelListResponse, ShopChannelResponse, ShopCustomerServiceListResponse, ShopCustomerServiceResponse, ShopDashboardResponse, ShopDepositAccountResponse, ShopDetailResponse, ShopFulfillmentProfileResponse, ShopListResponse, ShopPolicyListResponse, ShopPolicyResponse, ShopQualificationListResponse, ShopQualificationResponse, ShopReadinessResponse, ShopReturnAddressListResponse, ShopReturnAddressResponse, ShopRiskSignalListResponse, ShopServiceAreaListResponse, ShopServiceAreaResponse, ShopSettlementProfileResponse, ShopShippingTemplateListResponse, ShopShippingTemplateResponse, ShopStatusEventListResponse, ShopVerificationListResponse, SubmitShopApplicationRequest, UpdateShopBusinessHourRequest, UpdateShopChannelRequest, UpdateShopFulfillmentProfileRequest, UpdateShopPolicyRequest, UpdateShopServiceAreaRequest, UpdateShopSettlementProfileRequest, UpsertShopBrandAuthorizationRequest, UpsertShopCategoryBindingRequest, UpsertShopCustomerServiceRequest, UpsertShopQualificationRequest, UpsertShopReturnAddressRequest, UpsertShopShippingTemplateRequest } from '../types';


export interface ShopsCurrentSettlementsListParams {
  status?: string;
  page?: number;
  pageSize?: number;
}

export class ShopsCurrentSettlementsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Shops current settlements list. */
  async list(params?: ShopsCurrentSettlementsListParams): Promise<CommerceApiResult> {
    const query = buildQueryString([
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<CommerceApiResult>(appendQueryString(appApiPath(`/shops/current/settlements`), query));
  }
}

export class ShopsCurrentOrdersFulfillmentsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Shops current orders fulfillments create. */
  async create(orderId: string, body: CommerceOperationCommand): Promise<CommerceApiResult> {
    return this.client.post<CommerceApiResult>(appApiPath(`/shops/current/orders/${serializePathParameter(orderId, { name: 'orderId', style: 'simple', explode: false })}/fulfillments`), body, undefined, undefined, 'application/json');
  }
}

export interface ShopsCurrentOrdersListParams {
  status?: string;
  page?: number;
  pageSize?: number;
}

export class ShopsCurrentOrdersApi {
  private client: HttpClient;
  public readonly fulfillments: ShopsCurrentOrdersFulfillmentsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.fulfillments = new ShopsCurrentOrdersFulfillmentsApi(client);
  }


/** Shops current orders list. */
  async list(params?: ShopsCurrentOrdersListParams): Promise<CommerceApiResult> {
    const query = buildQueryString([
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<CommerceApiResult>(appendQueryString(appApiPath(`/shops/current/orders`), query));
  }

/** Shops current orders retrieve. */
  async retrieve(orderId: string): Promise<CommerceApiResult> {
    return this.client.get<CommerceApiResult>(appApiPath(`/shops/current/orders/${serializePathParameter(orderId, { name: 'orderId', style: 'simple', explode: false })}`));
  }
}

export class ShopsCurrentInventoryStocksAdjustmentsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Shops current inventory stocks adjustments create. */
  async create(stockId: string, body: CommerceOperationCommand): Promise<CommerceApiResult> {
    return this.client.post<CommerceApiResult>(appApiPath(`/shops/current/inventory/stocks/${serializePathParameter(stockId, { name: 'stockId', style: 'simple', explode: false })}/adjustments`), body, undefined, undefined, 'application/json');
  }
}

export interface ShopsCurrentInventoryStocksListParams {
  skuId?: string;
  warehouseId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export class ShopsCurrentInventoryStocksApi {
  private client: HttpClient;
  public readonly adjustments: ShopsCurrentInventoryStocksAdjustmentsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.adjustments = new ShopsCurrentInventoryStocksAdjustmentsApi(client);
  }


/** Shops current inventory stocks list. */
  async list(params?: ShopsCurrentInventoryStocksListParams): Promise<CommerceApiResult> {
    const query = buildQueryString([
      { name: 'sku_id', value: params?.skuId, style: 'form', explode: true, allowReserved: false },
      { name: 'warehouse_id', value: params?.warehouseId, style: 'form', explode: true, allowReserved: false },
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<CommerceApiResult>(appendQueryString(appApiPath(`/shops/current/inventory/stocks`), query));
  }
}

export class ShopsCurrentInventoryApi {
  private client: HttpClient;
  public readonly stocks: ShopsCurrentInventoryStocksApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.stocks = new ShopsCurrentInventoryStocksApi(client);
  }

}

export interface ShopsCurrentProductsListParams {
  q?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export class ShopsCurrentProductsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Shops current products list. */
  async list(params?: ShopsCurrentProductsListParams): Promise<CommerceApiResult> {
    const query = buildQueryString([
      { name: 'q', value: params?.q, style: 'form', explode: true, allowReserved: false },
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<CommerceApiResult>(appendQueryString(appApiPath(`/shops/current/products`), query));
  }

/** Shops current products create. */
  async create(body: CommerceOperationCommand): Promise<CommerceApiResult> {
    return this.client.post<CommerceApiResult>(appApiPath(`/shops/current/products`), body, undefined, undefined, 'application/json');
  }

/** Shops current products update. */
  async update(productId: string, body?: CommerceOperationCommand): Promise<CommerceApiResult> {
    return this.client.patch<CommerceApiResult>(appApiPath(`/shops/current/products/${serializePathParameter(productId, { name: 'productId', style: 'simple', explode: false })}`), body, undefined, undefined, 'application/json');
  }

/** Shops current products publish. */
  async publish(productId: string, body: CommerceOperationCommand): Promise<CommerceApiResult> {
    return this.client.post<CommerceApiResult>(appApiPath(`/shops/current/products/${serializePathParameter(productId, { name: 'productId', style: 'simple', explode: false })}/publish`), body, undefined, undefined, 'application/json');
  }

/** Shops current products unpublish. */
  async unpublish(productId: string, body: CommerceOperationCommand): Promise<CommerceApiResult> {
    return this.client.post<CommerceApiResult>(appApiPath(`/shops/current/products/${serializePathParameter(productId, { name: 'productId', style: 'simple', explode: false })}/unpublish`), body, undefined, undefined, 'application/json');
  }
}

export interface ShopsCurrentRiskSignalsListParams {
  signalType?: string;
  riskLevel?: string;
  signalStatus?: string;
  page?: number;
  pageSize?: number;
}

export class ShopsCurrentRiskSignalsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Shops current risk Signals list. */
  async list(params?: ShopsCurrentRiskSignalsListParams): Promise<ShopRiskSignalListResponse> {
    const query = buildQueryString([
      { name: 'signal_type', value: params?.signalType, style: 'form', explode: true, allowReserved: false },
      { name: 'risk_level', value: params?.riskLevel, style: 'form', explode: true, allowReserved: false },
      { name: 'signal_status', value: params?.signalStatus, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<ShopRiskSignalListResponse>(appendQueryString(appApiPath(`/shops/current/risk_signals`), query));
  }
}

export class ShopsCurrentDepositAccountApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Shops current deposit Account retrieve. */
  async retrieve(): Promise<ShopDepositAccountResponse> {
    return this.client.get<ShopDepositAccountResponse>(appApiPath(`/shops/current/deposit_account`));
  }
}

export interface ShopsCurrentPoliciesListParams {
  policyType?: string;
  policyStatus?: string;
  page?: number;
  pageSize?: number;
}

export interface ShopsCurrentPoliciesUpdateParams {
  idempotencyKey: string;
}

export class ShopsCurrentPoliciesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Shops current policies list. */
  async list(params?: ShopsCurrentPoliciesListParams): Promise<ShopPolicyListResponse> {
    const query = buildQueryString([
      { name: 'policy_type', value: params?.policyType, style: 'form', explode: true, allowReserved: false },
      { name: 'policy_status', value: params?.policyStatus, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<ShopPolicyListResponse>(appendQueryString(appApiPath(`/shops/current/policies`), query));
  }

/** Shops current policies update. */
  async update(policyId: string, body: UpdateShopPolicyRequest, params: ShopsCurrentPoliciesUpdateParams): Promise<ShopPolicyResponse> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.patch<ShopPolicyResponse>(appApiPath(`/shops/current/policies/${serializePathParameter(policyId, { name: 'policyId', style: 'simple', explode: false })}`), body, undefined, requestHeaders, 'application/json');
  }
}

export interface ShopsCurrentServiceAreasListParams {
  areaType?: string;
  regionCode?: string;
  serviceStatus?: string;
  page?: number;
  pageSize?: number;
}

export interface ShopsCurrentServiceAreasCreateParams {
  idempotencyKey: string;
}

export interface ShopsCurrentServiceAreasUpdateParams {
  idempotencyKey: string;
}

export class ShopsCurrentServiceAreasApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Shops current service Areas list. */
  async list(params?: ShopsCurrentServiceAreasListParams): Promise<ShopServiceAreaListResponse> {
    const query = buildQueryString([
      { name: 'area_type', value: params?.areaType, style: 'form', explode: true, allowReserved: false },
      { name: 'region_code', value: params?.regionCode, style: 'form', explode: true, allowReserved: false },
      { name: 'service_status', value: params?.serviceStatus, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<ShopServiceAreaListResponse>(appendQueryString(appApiPath(`/shops/current/service_areas`), query));
  }

/** Shops current service Areas create. */
  async create(body: CreateShopServiceAreaRequest, params: ShopsCurrentServiceAreasCreateParams): Promise<ShopServiceAreaResponse> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.post<ShopServiceAreaResponse>(appApiPath(`/shops/current/service_areas`), body, undefined, requestHeaders, 'application/json');
  }

/** Shops current service Areas update. */
  async update(serviceAreaId: string, body: UpdateShopServiceAreaRequest, params: ShopsCurrentServiceAreasUpdateParams): Promise<ShopServiceAreaResponse> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.patch<ShopServiceAreaResponse>(appApiPath(`/shops/current/service_areas/${serializePathParameter(serviceAreaId, { name: 'serviceAreaId', style: 'simple', explode: false })}`), body, undefined, requestHeaders, 'application/json');
  }
}

export interface ShopsCurrentBusinessHoursUpdateParams {
  idempotencyKey: string;
}

export class ShopsCurrentBusinessHoursApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Shops current business Hours retrieve. */
  async retrieve(): Promise<ShopBusinessHourResponse> {
    return this.client.get<ShopBusinessHourResponse>(appApiPath(`/shops/current/business_hours`));
  }

/** Shops current business Hours update. */
  async update(body: UpdateShopBusinessHourRequest, params: ShopsCurrentBusinessHoursUpdateParams): Promise<ShopBusinessHourResponse> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.patch<ShopBusinessHourResponse>(appApiPath(`/shops/current/business_hours`), body, undefined, requestHeaders, 'application/json');
  }
}

export interface ShopsCurrentSettlementProfileUpdateParams {
  idempotencyKey: string;
}

export class ShopsCurrentSettlementProfileApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Shops current settlement Profile retrieve. */
  async retrieve(): Promise<ShopSettlementProfileResponse> {
    return this.client.get<ShopSettlementProfileResponse>(appApiPath(`/shops/current/settlement_profile`));
  }

/** Shops current settlement Profile update. */
  async update(body: UpdateShopSettlementProfileRequest, params: ShopsCurrentSettlementProfileUpdateParams): Promise<ShopSettlementProfileResponse> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.patch<ShopSettlementProfileResponse>(appApiPath(`/shops/current/settlement_profile`), body, undefined, requestHeaders, 'application/json');
  }
}

export interface ShopsCurrentFulfillmentProfileUpdateParams {
  idempotencyKey: string;
}

export class ShopsCurrentFulfillmentProfileApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Shops current fulfillment Profile retrieve. */
  async retrieve(): Promise<ShopFulfillmentProfileResponse> {
    return this.client.get<ShopFulfillmentProfileResponse>(appApiPath(`/shops/current/fulfillment_profile`));
  }

/** Shops current fulfillment Profile update. */
  async update(body: UpdateShopFulfillmentProfileRequest, params: ShopsCurrentFulfillmentProfileUpdateParams): Promise<ShopFulfillmentProfileResponse> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.patch<ShopFulfillmentProfileResponse>(appApiPath(`/shops/current/fulfillment_profile`), body, undefined, requestHeaders, 'application/json');
  }
}

export interface ShopsCurrentChannelsListParams {
  channelCode?: string;
  storefrontStatus?: string;
  page?: number;
  pageSize?: number;
}

export interface ShopsCurrentChannelsUpdateParams {
  idempotencyKey: string;
}

export class ShopsCurrentChannelsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Shops current channels list. */
  async list(params?: ShopsCurrentChannelsListParams): Promise<ShopChannelListResponse> {
    const query = buildQueryString([
      { name: 'channel_code', value: params?.channelCode, style: 'form', explode: true, allowReserved: false },
      { name: 'storefront_status', value: params?.storefrontStatus, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<ShopChannelListResponse>(appendQueryString(appApiPath(`/shops/current/channels`), query));
  }

/** Shops current channels update. */
  async update(channelId: string, body: UpdateShopChannelRequest, params: ShopsCurrentChannelsUpdateParams): Promise<ShopChannelResponse> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.patch<ShopChannelResponse>(appApiPath(`/shops/current/channels/${serializePathParameter(channelId, { name: 'channelId', style: 'simple', explode: false })}`), body, undefined, requestHeaders, 'application/json');
  }
}

export interface ShopsCurrentStatusEventsListParams {
  eventType?: string;
  page?: number;
  pageSize?: number;
}

export class ShopsCurrentStatusEventsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Shops current status Events list. */
  async list(params?: ShopsCurrentStatusEventsListParams): Promise<ShopStatusEventListResponse> {
    const query = buildQueryString([
      { name: 'event_type', value: params?.eventType, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<ShopStatusEventListResponse>(appendQueryString(appApiPath(`/shops/current/status_events`), query));
  }
}

export interface ShopsCurrentVerificationsListParams {
  verificationType?: string;
  verificationStatus?: string;
  page?: number;
  pageSize?: number;
}

export class ShopsCurrentVerificationsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Shops current verifications list. */
  async list(params?: ShopsCurrentVerificationsListParams): Promise<ShopVerificationListResponse> {
    const query = buildQueryString([
      { name: 'verification_type', value: params?.verificationType, style: 'form', explode: true, allowReserved: false },
      { name: 'verification_status', value: params?.verificationStatus, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<ShopVerificationListResponse>(appendQueryString(appApiPath(`/shops/current/verifications`), query));
  }
}

export interface ShopsCurrentApplicationsListParams {
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface ShopsCurrentApplicationsCreateParams {
  idempotencyKey: string;
}

export class ShopsCurrentApplicationsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Shops current applications list. */
  async list(params?: ShopsCurrentApplicationsListParams): Promise<ShopApplicationListResponse> {
    const query = buildQueryString([
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<ShopApplicationListResponse>(appendQueryString(appApiPath(`/shops/current/applications`), query));
  }

/** Shops current applications create. */
  async create(body: SubmitShopApplicationRequest, params: ShopsCurrentApplicationsCreateParams): Promise<ShopApplicationResponse> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.post<ShopApplicationResponse>(appApiPath(`/shops/current/applications`), body, undefined, requestHeaders, 'application/json');
  }
}

export interface ShopsCurrentShippingTemplatesListParams {
  templateStatus?: string;
  deliveryMethod?: string;
  isDefault?: boolean;
  page?: number;
  pageSize?: number;
}

export interface ShopsCurrentShippingTemplatesUpsertParams {
  idempotencyKey: string;
}

export class ShopsCurrentShippingTemplatesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Shops current shipping Templates list. */
  async list(params?: ShopsCurrentShippingTemplatesListParams): Promise<ShopShippingTemplateListResponse> {
    const query = buildQueryString([
      { name: 'template_status', value: params?.templateStatus, style: 'form', explode: true, allowReserved: false },
      { name: 'delivery_method', value: params?.deliveryMethod, style: 'form', explode: true, allowReserved: false },
      { name: 'is_default', value: params?.isDefault, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<ShopShippingTemplateListResponse>(appendQueryString(appApiPath(`/shops/current/shipping_templates`), query));
  }

/** Shops current shipping Templates upsert. */
  async upsert(body: UpsertShopShippingTemplateRequest, params: ShopsCurrentShippingTemplatesUpsertParams): Promise<ShopShippingTemplateResponse> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.put<ShopShippingTemplateResponse>(appApiPath(`/shops/current/shipping_templates`), body, undefined, requestHeaders, 'application/json');
  }
}

export interface ShopsCurrentReturnAddressesListParams {
  addressUsage?: string;
  addressStatus?: string;
  isDefault?: boolean;
  page?: number;
  pageSize?: number;
}

export interface ShopsCurrentReturnAddressesUpsertParams {
  idempotencyKey: string;
}

export class ShopsCurrentReturnAddressesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Shops current return Addresses list. */
  async list(params?: ShopsCurrentReturnAddressesListParams): Promise<ShopReturnAddressListResponse> {
    const query = buildQueryString([
      { name: 'address_usage', value: params?.addressUsage, style: 'form', explode: true, allowReserved: false },
      { name: 'address_status', value: params?.addressStatus, style: 'form', explode: true, allowReserved: false },
      { name: 'is_default', value: params?.isDefault, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<ShopReturnAddressListResponse>(appendQueryString(appApiPath(`/shops/current/return_addresses`), query));
  }

/** Shops current return Addresses upsert. */
  async upsert(body: UpsertShopReturnAddressRequest, params: ShopsCurrentReturnAddressesUpsertParams): Promise<ShopReturnAddressResponse> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.put<ShopReturnAddressResponse>(appApiPath(`/shops/current/return_addresses`), body, undefined, requestHeaders, 'application/json');
  }
}

export interface ShopsCurrentCustomerServicesListParams {
  serviceChannel?: string;
  serviceStatus?: string;
  isDefault?: boolean;
  page?: number;
  pageSize?: number;
}

export interface ShopsCurrentCustomerServicesUpsertParams {
  idempotencyKey: string;
}

export class ShopsCurrentCustomerServicesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Shops current customer Services list. */
  async list(params?: ShopsCurrentCustomerServicesListParams): Promise<ShopCustomerServiceListResponse> {
    const query = buildQueryString([
      { name: 'service_channel', value: params?.serviceChannel, style: 'form', explode: true, allowReserved: false },
      { name: 'service_status', value: params?.serviceStatus, style: 'form', explode: true, allowReserved: false },
      { name: 'is_default', value: params?.isDefault, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<ShopCustomerServiceListResponse>(appendQueryString(appApiPath(`/shops/current/customer_services`), query));
  }

/** Shops current customer Services upsert. */
  async upsert(body: UpsertShopCustomerServiceRequest, params: ShopsCurrentCustomerServicesUpsertParams): Promise<ShopCustomerServiceResponse> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.put<ShopCustomerServiceResponse>(appApiPath(`/shops/current/customer_services`), body, undefined, requestHeaders, 'application/json');
  }
}

export interface ShopsCurrentQualificationsListParams {
  qualificationType?: string;
  subjectType?: string;
  subjectId?: string;
  qualificationStatus?: string;
  page?: number;
  pageSize?: number;
}

export interface ShopsCurrentQualificationsUpsertParams {
  idempotencyKey: string;
}

export class ShopsCurrentQualificationsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Shops current qualifications list. */
  async list(params?: ShopsCurrentQualificationsListParams): Promise<ShopQualificationListResponse> {
    const query = buildQueryString([
      { name: 'qualification_type', value: params?.qualificationType, style: 'form', explode: true, allowReserved: false },
      { name: 'subject_type', value: params?.subjectType, style: 'form', explode: true, allowReserved: false },
      { name: 'subject_id', value: params?.subjectId, style: 'form', explode: true, allowReserved: false },
      { name: 'qualification_status', value: params?.qualificationStatus, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<ShopQualificationListResponse>(appendQueryString(appApiPath(`/shops/current/qualifications`), query));
  }

/** Shops current qualifications upsert. */
  async upsert(body: UpsertShopQualificationRequest, params: ShopsCurrentQualificationsUpsertParams): Promise<ShopQualificationResponse> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.put<ShopQualificationResponse>(appApiPath(`/shops/current/qualifications`), body, undefined, requestHeaders, 'application/json');
  }
}

export interface ShopsCurrentBrandAuthorizationsListParams {
  brandCode?: string;
  authorizationStatus?: string;
  page?: number;
  pageSize?: number;
}

export interface ShopsCurrentBrandAuthorizationsUpsertParams {
  idempotencyKey: string;
}

export class ShopsCurrentBrandAuthorizationsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Shops current brand Authorizations list. */
  async list(params?: ShopsCurrentBrandAuthorizationsListParams): Promise<ShopBrandAuthorizationListResponse> {
    const query = buildQueryString([
      { name: 'brand_code', value: params?.brandCode, style: 'form', explode: true, allowReserved: false },
      { name: 'authorization_status', value: params?.authorizationStatus, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<ShopBrandAuthorizationListResponse>(appendQueryString(appApiPath(`/shops/current/brand_authorizations`), query));
  }

/** Shops current brand Authorizations upsert. */
  async upsert(body: UpsertShopBrandAuthorizationRequest, params: ShopsCurrentBrandAuthorizationsUpsertParams): Promise<ShopBrandAuthorizationResponse> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.put<ShopBrandAuthorizationResponse>(appApiPath(`/shops/current/brand_authorizations`), body, undefined, requestHeaders, 'application/json');
  }
}

export interface ShopsCurrentCategoryBindingsListParams {
  shopCategoryCode?: string;
  platformCategoryCode?: string;
  categoryStatus?: string;
  reviewStatus?: string;
  page?: number;
  pageSize?: number;
}

export interface ShopsCurrentCategoryBindingsUpsertParams {
  idempotencyKey: string;
}

export class ShopsCurrentCategoryBindingsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Shops current category Bindings list. */
  async list(params?: ShopsCurrentCategoryBindingsListParams): Promise<ShopCategoryBindingListResponse> {
    const query = buildQueryString([
      { name: 'shop_category_code', value: params?.shopCategoryCode, style: 'form', explode: true, allowReserved: false },
      { name: 'platform_category_code', value: params?.platformCategoryCode, style: 'form', explode: true, allowReserved: false },
      { name: 'category_status', value: params?.categoryStatus, style: 'form', explode: true, allowReserved: false },
      { name: 'review_status', value: params?.reviewStatus, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<ShopCategoryBindingListResponse>(appendQueryString(appApiPath(`/shops/current/category_bindings`), query));
  }

/** Shops current category Bindings upsert. */
  async upsert(body: UpsertShopCategoryBindingRequest, params: ShopsCurrentCategoryBindingsUpsertParams): Promise<ShopCategoryBindingResponse> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.put<ShopCategoryBindingResponse>(appApiPath(`/shops/current/category_bindings`), body, undefined, requestHeaders, 'application/json');
  }
}

export class ShopsCurrentReadinessApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Shops current readiness retrieve. */
  async retrieve(): Promise<ShopReadinessResponse> {
    return this.client.get<ShopReadinessResponse>(appApiPath(`/shops/current/readiness`));
  }
}

export class ShopsCurrentDashboardApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Shops current dashboard retrieve. */
  async retrieve(): Promise<ShopDashboardResponse> {
    return this.client.get<ShopDashboardResponse>(appApiPath(`/shops/current/dashboard`));
  }
}

export class ShopsCurrentApi {
  private client: HttpClient;
  public readonly dashboard: ShopsCurrentDashboardApi;
  public readonly readiness: ShopsCurrentReadinessApi;
  public readonly categoryBindings: ShopsCurrentCategoryBindingsApi;
  public readonly brandAuthorizations: ShopsCurrentBrandAuthorizationsApi;
  public readonly qualifications: ShopsCurrentQualificationsApi;
  public readonly customerServices: ShopsCurrentCustomerServicesApi;
  public readonly returnAddresses: ShopsCurrentReturnAddressesApi;
  public readonly shippingTemplates: ShopsCurrentShippingTemplatesApi;
  public readonly applications: ShopsCurrentApplicationsApi;
  public readonly verifications: ShopsCurrentVerificationsApi;
  public readonly statusEvents: ShopsCurrentStatusEventsApi;
  public readonly channels: ShopsCurrentChannelsApi;
  public readonly fulfillmentProfile: ShopsCurrentFulfillmentProfileApi;
  public readonly settlementProfile: ShopsCurrentSettlementProfileApi;
  public readonly businessHours: ShopsCurrentBusinessHoursApi;
  public readonly serviceAreas: ShopsCurrentServiceAreasApi;
  public readonly policies: ShopsCurrentPoliciesApi;
  public readonly depositAccount: ShopsCurrentDepositAccountApi;
  public readonly riskSignals: ShopsCurrentRiskSignalsApi;
  public readonly products: ShopsCurrentProductsApi;
  public readonly inventory: ShopsCurrentInventoryApi;
  public readonly orders: ShopsCurrentOrdersApi;
  public readonly settlements: ShopsCurrentSettlementsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.dashboard = new ShopsCurrentDashboardApi(client);
    this.readiness = new ShopsCurrentReadinessApi(client);
    this.categoryBindings = new ShopsCurrentCategoryBindingsApi(client);
    this.brandAuthorizations = new ShopsCurrentBrandAuthorizationsApi(client);
    this.qualifications = new ShopsCurrentQualificationsApi(client);
    this.customerServices = new ShopsCurrentCustomerServicesApi(client);
    this.returnAddresses = new ShopsCurrentReturnAddressesApi(client);
    this.shippingTemplates = new ShopsCurrentShippingTemplatesApi(client);
    this.applications = new ShopsCurrentApplicationsApi(client);
    this.verifications = new ShopsCurrentVerificationsApi(client);
    this.statusEvents = new ShopsCurrentStatusEventsApi(client);
    this.channels = new ShopsCurrentChannelsApi(client);
    this.fulfillmentProfile = new ShopsCurrentFulfillmentProfileApi(client);
    this.settlementProfile = new ShopsCurrentSettlementProfileApi(client);
    this.businessHours = new ShopsCurrentBusinessHoursApi(client);
    this.serviceAreas = new ShopsCurrentServiceAreasApi(client);
    this.policies = new ShopsCurrentPoliciesApi(client);
    this.depositAccount = new ShopsCurrentDepositAccountApi(client);
    this.riskSignals = new ShopsCurrentRiskSignalsApi(client);
    this.products = new ShopsCurrentProductsApi(client);
    this.inventory = new ShopsCurrentInventoryApi(client);
    this.orders = new ShopsCurrentOrdersApi(client);
    this.settlements = new ShopsCurrentSettlementsApi(client);
  }


/** Shops current retrieve. */
  async retrieve(): Promise<CurrentShopResponse> {
    return this.client.get<CurrentShopResponse>(appApiPath(`/shops/current`));
  }
}

export interface ShopsListParams {
  q?: string;
  shopType?: string;
  operationStatus?: string;
  page?: number;
  pageSize?: number;
}

export class ShopsApi {
  private client: HttpClient;
  public readonly current: ShopsCurrentApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.current = new ShopsCurrentApi(client);
  }


/** Shops list. */
  async list(params?: ShopsListParams): Promise<ShopListResponse> {
    const query = buildQueryString([
      { name: 'q', value: params?.q, style: 'form', explode: true, allowReserved: false },
      { name: 'shop_type', value: params?.shopType, style: 'form', explode: true, allowReserved: false },
      { name: 'operation_status', value: params?.operationStatus, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<ShopListResponse>(appendQueryString(appApiPath(`/shops`), query));
  }

/** Shops retrieve. */
  async retrieve(shopId: string): Promise<ShopDetailResponse> {
    return this.client.get<ShopDetailResponse>(appApiPath(`/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}`));
  }
}

export function createShopsApi(client: HttpClient): ShopsApi {
  return new ShopsApi(client);
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
