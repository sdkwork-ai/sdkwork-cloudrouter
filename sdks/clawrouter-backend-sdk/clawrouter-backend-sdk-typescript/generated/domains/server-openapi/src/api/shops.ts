import { backendApiPath } from './paths';
import type { HttpClient } from '../http/client';

import type { ApproveShopRequest, ApproveShopSettlementProfileRequest, CloseShopRequest, CreateShopChannelRequest, CreateShopPolicyRequest, CreateShopRequest, CreateShopRiskSignalRequest, CreateShopServiceAreaRequest, RejectShopRequest, RejectShopSettlementProfileRequest, ResolveShopRiskSignalRequest, ResumeShopRequest, ReviewShopDepositAccountRequest, ShopBrandAuthorizationListResponse, ShopBrandAuthorizationResponse, ShopBusinessHourResponse, ShopCategoryBindingListResponse, ShopCategoryBindingResponse, ShopChannelListResponse, ShopChannelResponse, ShopCustomerServiceListResponse, ShopCustomerServiceResponse, ShopDepositAccountResponse, ShopFulfillmentProfileResponse, ShopManagementDetailResponse, ShopManagementListResponse, ShopPolicyListResponse, ShopPolicyResponse, ShopQualificationListResponse, ShopQualificationResponse, ShopReadinessResponse, ShopReturnAddressListResponse, ShopReturnAddressResponse, ShopRiskSignalListResponse, ShopRiskSignalResponse, ShopServiceAreaListResponse, ShopServiceAreaResponse, ShopSettlementProfileResponse, ShopShippingTemplateListResponse, ShopShippingTemplateResponse, ShopStatusEventListResponse, ShopVerificationListResponse, SubmitShopReviewRequest, SuspendShopRequest, UpdateShopBusinessHourRequest, UpdateShopChannelRequest, UpdateShopDepositAccountRequest, UpdateShopFulfillmentProfileRequest, UpdateShopPolicyRequest, UpdateShopRequest, UpdateShopServiceAreaRequest, UpdateShopSettlementProfileRequest, UpdateShopVerificationRequest, UpsertShopBrandAuthorizationRequest, UpsertShopCategoryBindingRequest, UpsertShopCustomerServiceRequest, UpsertShopQualificationRequest, UpsertShopReturnAddressRequest, UpsertShopShippingTemplateRequest } from '../types';


export class ShopsReadinessApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Shops readiness retrieve. */
  async retrieve(shopId: string): Promise<ShopReadinessResponse> {
    return this.client.get<ShopReadinessResponse>(backendApiPath(`/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/readiness`));
  }
}

export interface ShopsRiskSignalsListParams {
  signalType?: string;
  riskLevel?: string;
  signalStatus?: string;
  page?: number;
  pageSize?: number;
}

export interface ShopsRiskSignalsCreateParams {
  idempotencyKey: string;
}

export interface ShopsRiskSignalsResolveParams {
  idempotencyKey: string;
}

export class ShopsRiskSignalsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Shops risk Signals list. */
  async list(shopId: string, params?: ShopsRiskSignalsListParams): Promise<ShopRiskSignalListResponse> {
    const query = buildQueryString([
      { name: 'signal_type', value: params?.signalType, style: 'form', explode: true, allowReserved: false },
      { name: 'risk_level', value: params?.riskLevel, style: 'form', explode: true, allowReserved: false },
      { name: 'signal_status', value: params?.signalStatus, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<ShopRiskSignalListResponse>(appendQueryString(backendApiPath(`/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/risk_signals`), query));
  }

/** Shops risk Signals create. */
  async create(shopId: string, body: CreateShopRiskSignalRequest, params: ShopsRiskSignalsCreateParams): Promise<ShopRiskSignalResponse> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.post<ShopRiskSignalResponse>(backendApiPath(`/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/risk_signals`), body, undefined, requestHeaders, 'application/json');
  }

/** Shops risk Signals resolve. */
  async resolve(shopId: string, riskSignalId: string, body: ResolveShopRiskSignalRequest, params: ShopsRiskSignalsResolveParams): Promise<ShopRiskSignalResponse> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.post<ShopRiskSignalResponse>(backendApiPath(`/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/risk_signals/${serializePathParameter(riskSignalId, { name: 'riskSignalId', style: 'simple', explode: false })}/resolve`), body, undefined, requestHeaders, 'application/json');
  }
}

export interface ShopsDepositAccountUpdateParams {
  idempotencyKey: string;
}

export interface ShopsDepositAccountReviewParams {
  idempotencyKey: string;
}

export class ShopsDepositAccountApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Shops deposit Account retrieve. */
  async retrieve(shopId: string): Promise<ShopDepositAccountResponse> {
    return this.client.get<ShopDepositAccountResponse>(backendApiPath(`/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/deposit_account`));
  }

/** Shops deposit Account update. */
  async update(shopId: string, body: UpdateShopDepositAccountRequest, params: ShopsDepositAccountUpdateParams): Promise<ShopDepositAccountResponse> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.patch<ShopDepositAccountResponse>(backendApiPath(`/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/deposit_account`), body, undefined, requestHeaders, 'application/json');
  }

/** Shops deposit Account review. */
  async review(shopId: string, body: ReviewShopDepositAccountRequest, params: ShopsDepositAccountReviewParams): Promise<ShopDepositAccountResponse> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.post<ShopDepositAccountResponse>(backendApiPath(`/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/deposit_account/review`), body, undefined, requestHeaders, 'application/json');
  }
}

export interface ShopsPoliciesListParams {
  policyType?: string;
  policyStatus?: string;
  page?: number;
  pageSize?: number;
}

export interface ShopsPoliciesCreateParams {
  idempotencyKey: string;
}

export interface ShopsPoliciesUpdateParams {
  idempotencyKey: string;
}

export class ShopsPoliciesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Shops policies list. */
  async list(shopId: string, params?: ShopsPoliciesListParams): Promise<ShopPolicyListResponse> {
    const query = buildQueryString([
      { name: 'policy_type', value: params?.policyType, style: 'form', explode: true, allowReserved: false },
      { name: 'policy_status', value: params?.policyStatus, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<ShopPolicyListResponse>(appendQueryString(backendApiPath(`/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/policies`), query));
  }

/** Shops policies create. */
  async create(shopId: string, body: CreateShopPolicyRequest, params: ShopsPoliciesCreateParams): Promise<ShopPolicyResponse> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.post<ShopPolicyResponse>(backendApiPath(`/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/policies`), body, undefined, requestHeaders, 'application/json');
  }

/** Shops policies update. */
  async update(shopId: string, policyId: string, body: UpdateShopPolicyRequest, params: ShopsPoliciesUpdateParams): Promise<ShopPolicyResponse> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.patch<ShopPolicyResponse>(backendApiPath(`/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/policies/${serializePathParameter(policyId, { name: 'policyId', style: 'simple', explode: false })}`), body, undefined, requestHeaders, 'application/json');
  }
}

export interface ShopsServiceAreasListParams {
  areaType?: string;
  regionCode?: string;
  serviceStatus?: string;
  page?: number;
  pageSize?: number;
}

export interface ShopsServiceAreasCreateParams {
  idempotencyKey: string;
}

export interface ShopsServiceAreasUpdateParams {
  idempotencyKey: string;
}

export class ShopsServiceAreasApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Shops service Areas list. */
  async list(shopId: string, params?: ShopsServiceAreasListParams): Promise<ShopServiceAreaListResponse> {
    const query = buildQueryString([
      { name: 'area_type', value: params?.areaType, style: 'form', explode: true, allowReserved: false },
      { name: 'region_code', value: params?.regionCode, style: 'form', explode: true, allowReserved: false },
      { name: 'service_status', value: params?.serviceStatus, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<ShopServiceAreaListResponse>(appendQueryString(backendApiPath(`/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/service_areas`), query));
  }

/** Shops service Areas create. */
  async create(shopId: string, body: CreateShopServiceAreaRequest, params: ShopsServiceAreasCreateParams): Promise<ShopServiceAreaResponse> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.post<ShopServiceAreaResponse>(backendApiPath(`/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/service_areas`), body, undefined, requestHeaders, 'application/json');
  }

/** Shops service Areas update. */
  async update(shopId: string, serviceAreaId: string, body: UpdateShopServiceAreaRequest, params: ShopsServiceAreasUpdateParams): Promise<ShopServiceAreaResponse> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.patch<ShopServiceAreaResponse>(backendApiPath(`/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/service_areas/${serializePathParameter(serviceAreaId, { name: 'serviceAreaId', style: 'simple', explode: false })}`), body, undefined, requestHeaders, 'application/json');
  }
}

export interface ShopsBusinessHoursUpdateParams {
  idempotencyKey: string;
}

export class ShopsBusinessHoursApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Shops business Hours retrieve. */
  async retrieve(shopId: string): Promise<ShopBusinessHourResponse> {
    return this.client.get<ShopBusinessHourResponse>(backendApiPath(`/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/business_hours`));
  }

/** Shops business Hours update. */
  async update(shopId: string, body: UpdateShopBusinessHourRequest, params: ShopsBusinessHoursUpdateParams): Promise<ShopBusinessHourResponse> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.patch<ShopBusinessHourResponse>(backendApiPath(`/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/business_hours`), body, undefined, requestHeaders, 'application/json');
  }
}

export interface ShopsSettlementProfileUpdateParams {
  idempotencyKey: string;
}

export interface ShopsSettlementProfileApproveParams {
  idempotencyKey: string;
}

export interface ShopsSettlementProfileRejectParams {
  idempotencyKey: string;
}

export class ShopsSettlementProfileApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Shops settlement Profile retrieve. */
  async retrieve(shopId: string): Promise<ShopSettlementProfileResponse> {
    return this.client.get<ShopSettlementProfileResponse>(backendApiPath(`/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/settlement_profile`));
  }

/** Shops settlement Profile update. */
  async update(shopId: string, body: UpdateShopSettlementProfileRequest, params: ShopsSettlementProfileUpdateParams): Promise<ShopSettlementProfileResponse> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.patch<ShopSettlementProfileResponse>(backendApiPath(`/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/settlement_profile`), body, undefined, requestHeaders, 'application/json');
  }

/** Shops settlement Profile approve. */
  async approve(shopId: string, body: ApproveShopSettlementProfileRequest, params: ShopsSettlementProfileApproveParams): Promise<ShopSettlementProfileResponse> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.post<ShopSettlementProfileResponse>(backendApiPath(`/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/settlement_profile/approve`), body, undefined, requestHeaders, 'application/json');
  }

/** Shops settlement Profile reject. */
  async reject(shopId: string, body: RejectShopSettlementProfileRequest, params: ShopsSettlementProfileRejectParams): Promise<ShopSettlementProfileResponse> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.post<ShopSettlementProfileResponse>(backendApiPath(`/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/settlement_profile/reject`), body, undefined, requestHeaders, 'application/json');
  }
}

export interface ShopsFulfillmentProfileUpdateParams {
  idempotencyKey: string;
}

export class ShopsFulfillmentProfileApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Shops fulfillment Profile retrieve. */
  async retrieve(shopId: string): Promise<ShopFulfillmentProfileResponse> {
    return this.client.get<ShopFulfillmentProfileResponse>(backendApiPath(`/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/fulfillment_profile`));
  }

/** Shops fulfillment Profile update. */
  async update(shopId: string, body: UpdateShopFulfillmentProfileRequest, params: ShopsFulfillmentProfileUpdateParams): Promise<ShopFulfillmentProfileResponse> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.patch<ShopFulfillmentProfileResponse>(backendApiPath(`/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/fulfillment_profile`), body, undefined, requestHeaders, 'application/json');
  }
}

export interface ShopsChannelsListParams {
  channelCode?: string;
  storefrontStatus?: string;
  page?: number;
  pageSize?: number;
}

export interface ShopsChannelsCreateParams {
  idempotencyKey: string;
}

export interface ShopsChannelsUpdateParams {
  idempotencyKey: string;
}

export class ShopsChannelsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Shops channels list. */
  async list(shopId: string, params?: ShopsChannelsListParams): Promise<ShopChannelListResponse> {
    const query = buildQueryString([
      { name: 'channel_code', value: params?.channelCode, style: 'form', explode: true, allowReserved: false },
      { name: 'storefront_status', value: params?.storefrontStatus, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<ShopChannelListResponse>(appendQueryString(backendApiPath(`/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/channels`), query));
  }

/** Shops channels create. */
  async create(shopId: string, body: CreateShopChannelRequest, params: ShopsChannelsCreateParams): Promise<ShopChannelResponse> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.post<ShopChannelResponse>(backendApiPath(`/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/channels`), body, undefined, requestHeaders, 'application/json');
  }

/** Shops channels update. */
  async update(shopId: string, channelId: string, body: UpdateShopChannelRequest, params: ShopsChannelsUpdateParams): Promise<ShopChannelResponse> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.patch<ShopChannelResponse>(backendApiPath(`/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/channels/${serializePathParameter(channelId, { name: 'channelId', style: 'simple', explode: false })}`), body, undefined, requestHeaders, 'application/json');
  }
}

export interface ShopsStatusEventsListParams {
  eventType?: string;
  page?: number;
  pageSize?: number;
}

export class ShopsStatusEventsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Shops status Events list. */
  async list(shopId: string, params?: ShopsStatusEventsListParams): Promise<ShopStatusEventListResponse> {
    const query = buildQueryString([
      { name: 'event_type', value: params?.eventType, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<ShopStatusEventListResponse>(appendQueryString(backendApiPath(`/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/status_events`), query));
  }
}

export interface ShopsVerificationsListParams {
  verificationType?: string;
  verificationStatus?: string;
  page?: number;
  pageSize?: number;
}

export interface ShopsVerificationsUpdateParams {
  idempotencyKey: string;
}

export class ShopsVerificationsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Shops verifications list. */
  async list(shopId: string, params?: ShopsVerificationsListParams): Promise<ShopVerificationListResponse> {
    const query = buildQueryString([
      { name: 'verification_type', value: params?.verificationType, style: 'form', explode: true, allowReserved: false },
      { name: 'verification_status', value: params?.verificationStatus, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<ShopVerificationListResponse>(appendQueryString(backendApiPath(`/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/verifications`), query));
  }

/** Shops verifications update. */
  async update(shopId: string, verificationId: string, body: UpdateShopVerificationRequest, params: ShopsVerificationsUpdateParams): Promise<ShopVerificationListResponse> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.patch<ShopVerificationListResponse>(backendApiPath(`/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/verifications/${serializePathParameter(verificationId, { name: 'verificationId', style: 'simple', explode: false })}`), body, undefined, requestHeaders, 'application/json');
  }
}

export interface ShopsShippingTemplatesListParams {
  templateStatus?: string;
  deliveryMethod?: string;
  isDefault?: boolean;
  page?: number;
  pageSize?: number;
}

export interface ShopsShippingTemplatesUpsertParams {
  idempotencyKey: string;
}

export class ShopsShippingTemplatesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Shops shipping Templates list. */
  async list(shopId: string, params?: ShopsShippingTemplatesListParams): Promise<ShopShippingTemplateListResponse> {
    const query = buildQueryString([
      { name: 'template_status', value: params?.templateStatus, style: 'form', explode: true, allowReserved: false },
      { name: 'delivery_method', value: params?.deliveryMethod, style: 'form', explode: true, allowReserved: false },
      { name: 'is_default', value: params?.isDefault, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<ShopShippingTemplateListResponse>(appendQueryString(backendApiPath(`/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/shipping_templates`), query));
  }

/** Shops shipping Templates upsert. */
  async upsert(shopId: string, body: UpsertShopShippingTemplateRequest, params: ShopsShippingTemplatesUpsertParams): Promise<ShopShippingTemplateResponse> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.put<ShopShippingTemplateResponse>(backendApiPath(`/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/shipping_templates`), body, undefined, requestHeaders, 'application/json');
  }
}

export interface ShopsReturnAddressesListParams {
  addressUsage?: string;
  addressStatus?: string;
  isDefault?: boolean;
  page?: number;
  pageSize?: number;
}

export interface ShopsReturnAddressesUpsertParams {
  idempotencyKey: string;
}

export class ShopsReturnAddressesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Shops return Addresses list. */
  async list(shopId: string, params?: ShopsReturnAddressesListParams): Promise<ShopReturnAddressListResponse> {
    const query = buildQueryString([
      { name: 'address_usage', value: params?.addressUsage, style: 'form', explode: true, allowReserved: false },
      { name: 'address_status', value: params?.addressStatus, style: 'form', explode: true, allowReserved: false },
      { name: 'is_default', value: params?.isDefault, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<ShopReturnAddressListResponse>(appendQueryString(backendApiPath(`/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/return_addresses`), query));
  }

/** Shops return Addresses upsert. */
  async upsert(shopId: string, body: UpsertShopReturnAddressRequest, params: ShopsReturnAddressesUpsertParams): Promise<ShopReturnAddressResponse> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.put<ShopReturnAddressResponse>(backendApiPath(`/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/return_addresses`), body, undefined, requestHeaders, 'application/json');
  }
}

export interface ShopsCustomerServicesListParams {
  serviceChannel?: string;
  serviceStatus?: string;
  isDefault?: boolean;
  page?: number;
  pageSize?: number;
}

export interface ShopsCustomerServicesUpsertParams {
  idempotencyKey: string;
}

export class ShopsCustomerServicesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Shops customer Services list. */
  async list(shopId: string, params?: ShopsCustomerServicesListParams): Promise<ShopCustomerServiceListResponse> {
    const query = buildQueryString([
      { name: 'service_channel', value: params?.serviceChannel, style: 'form', explode: true, allowReserved: false },
      { name: 'service_status', value: params?.serviceStatus, style: 'form', explode: true, allowReserved: false },
      { name: 'is_default', value: params?.isDefault, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<ShopCustomerServiceListResponse>(appendQueryString(backendApiPath(`/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/customer_services`), query));
  }

/** Shops customer Services upsert. */
  async upsert(shopId: string, body: UpsertShopCustomerServiceRequest, params: ShopsCustomerServicesUpsertParams): Promise<ShopCustomerServiceResponse> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.put<ShopCustomerServiceResponse>(backendApiPath(`/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/customer_services`), body, undefined, requestHeaders, 'application/json');
  }
}

export interface ShopsQualificationsListParams {
  qualificationType?: string;
  subjectType?: string;
  subjectId?: string;
  qualificationStatus?: string;
  page?: number;
  pageSize?: number;
}

export interface ShopsQualificationsUpsertParams {
  idempotencyKey: string;
}

export class ShopsQualificationsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Shops qualifications list. */
  async list(shopId: string, params?: ShopsQualificationsListParams): Promise<ShopQualificationListResponse> {
    const query = buildQueryString([
      { name: 'qualification_type', value: params?.qualificationType, style: 'form', explode: true, allowReserved: false },
      { name: 'subject_type', value: params?.subjectType, style: 'form', explode: true, allowReserved: false },
      { name: 'subject_id', value: params?.subjectId, style: 'form', explode: true, allowReserved: false },
      { name: 'qualification_status', value: params?.qualificationStatus, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<ShopQualificationListResponse>(appendQueryString(backendApiPath(`/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/qualifications`), query));
  }

/** Shops qualifications upsert. */
  async upsert(shopId: string, body: UpsertShopQualificationRequest, params: ShopsQualificationsUpsertParams): Promise<ShopQualificationResponse> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.put<ShopQualificationResponse>(backendApiPath(`/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/qualifications`), body, undefined, requestHeaders, 'application/json');
  }
}

export interface ShopsBrandAuthorizationsListParams {
  brandCode?: string;
  authorizationStatus?: string;
  page?: number;
  pageSize?: number;
}

export interface ShopsBrandAuthorizationsUpsertParams {
  idempotencyKey: string;
}

export class ShopsBrandAuthorizationsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Shops brand Authorizations list. */
  async list(shopId: string, params?: ShopsBrandAuthorizationsListParams): Promise<ShopBrandAuthorizationListResponse> {
    const query = buildQueryString([
      { name: 'brand_code', value: params?.brandCode, style: 'form', explode: true, allowReserved: false },
      { name: 'authorization_status', value: params?.authorizationStatus, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<ShopBrandAuthorizationListResponse>(appendQueryString(backendApiPath(`/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/brand_authorizations`), query));
  }

/** Shops brand Authorizations upsert. */
  async upsert(shopId: string, body: UpsertShopBrandAuthorizationRequest, params: ShopsBrandAuthorizationsUpsertParams): Promise<ShopBrandAuthorizationResponse> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.put<ShopBrandAuthorizationResponse>(backendApiPath(`/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/brand_authorizations`), body, undefined, requestHeaders, 'application/json');
  }
}

export interface ShopsCategoryBindingsListParams {
  shopCategoryCode?: string;
  platformCategoryCode?: string;
  categoryStatus?: string;
  reviewStatus?: string;
  page?: number;
  pageSize?: number;
}

export interface ShopsCategoryBindingsUpsertParams {
  idempotencyKey: string;
}

export class ShopsCategoryBindingsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Shops category Bindings list. */
  async list(shopId: string, params?: ShopsCategoryBindingsListParams): Promise<ShopCategoryBindingListResponse> {
    const query = buildQueryString([
      { name: 'shop_category_code', value: params?.shopCategoryCode, style: 'form', explode: true, allowReserved: false },
      { name: 'platform_category_code', value: params?.platformCategoryCode, style: 'form', explode: true, allowReserved: false },
      { name: 'category_status', value: params?.categoryStatus, style: 'form', explode: true, allowReserved: false },
      { name: 'review_status', value: params?.reviewStatus, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<ShopCategoryBindingListResponse>(appendQueryString(backendApiPath(`/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/category_bindings`), query));
  }

/** Shops category Bindings upsert. */
  async upsert(shopId: string, body: UpsertShopCategoryBindingRequest, params: ShopsCategoryBindingsUpsertParams): Promise<ShopCategoryBindingResponse> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.put<ShopCategoryBindingResponse>(backendApiPath(`/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/category_bindings`), body, undefined, requestHeaders, 'application/json');
  }
}

export interface ShopsManagementListParams {
  q?: string;
  shopType?: string;
  operationStatus?: string;
  reviewStatus?: string;
  page?: number;
  pageSize?: number;
}

export class ShopsManagementApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Shops management list. */
  async list(params?: ShopsManagementListParams): Promise<ShopManagementListResponse> {
    const query = buildQueryString([
      { name: 'q', value: params?.q, style: 'form', explode: true, allowReserved: false },
      { name: 'shop_type', value: params?.shopType, style: 'form', explode: true, allowReserved: false },
      { name: 'operation_status', value: params?.operationStatus, style: 'form', explode: true, allowReserved: false },
      { name: 'review_status', value: params?.reviewStatus, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<ShopManagementListResponse>(appendQueryString(backendApiPath(`/shops`), query));
  }

/** Shops management retrieve. */
  async retrieve(shopId: string): Promise<ShopManagementDetailResponse> {
    return this.client.get<ShopManagementDetailResponse>(backendApiPath(`/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}`));
  }
}

export interface ShopsCreateParams {
  idempotencyKey: string;
}

export interface ShopsUpdateParams {
  idempotencyKey: string;
}

export interface ShopsSubmitReviewParams {
  idempotencyKey: string;
}

export interface ShopsApproveParams {
  idempotencyKey: string;
}

export interface ShopsRejectParams {
  idempotencyKey: string;
}

export interface ShopsSuspendParams {
  idempotencyKey: string;
}

export interface ShopsResumeParams {
  idempotencyKey: string;
}

export interface ShopsCloseParams {
  idempotencyKey: string;
}

export class ShopsApi {
  private client: HttpClient;
  public readonly management: ShopsManagementApi;
  public readonly categoryBindings: ShopsCategoryBindingsApi;
  public readonly brandAuthorizations: ShopsBrandAuthorizationsApi;
  public readonly qualifications: ShopsQualificationsApi;
  public readonly customerServices: ShopsCustomerServicesApi;
  public readonly returnAddresses: ShopsReturnAddressesApi;
  public readonly shippingTemplates: ShopsShippingTemplatesApi;
  public readonly verifications: ShopsVerificationsApi;
  public readonly statusEvents: ShopsStatusEventsApi;
  public readonly channels: ShopsChannelsApi;
  public readonly fulfillmentProfile: ShopsFulfillmentProfileApi;
  public readonly settlementProfile: ShopsSettlementProfileApi;
  public readonly businessHours: ShopsBusinessHoursApi;
  public readonly serviceAreas: ShopsServiceAreasApi;
  public readonly policies: ShopsPoliciesApi;
  public readonly depositAccount: ShopsDepositAccountApi;
  public readonly riskSignals: ShopsRiskSignalsApi;
  public readonly readiness: ShopsReadinessApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.management = new ShopsManagementApi(client);
    this.categoryBindings = new ShopsCategoryBindingsApi(client);
    this.brandAuthorizations = new ShopsBrandAuthorizationsApi(client);
    this.qualifications = new ShopsQualificationsApi(client);
    this.customerServices = new ShopsCustomerServicesApi(client);
    this.returnAddresses = new ShopsReturnAddressesApi(client);
    this.shippingTemplates = new ShopsShippingTemplatesApi(client);
    this.verifications = new ShopsVerificationsApi(client);
    this.statusEvents = new ShopsStatusEventsApi(client);
    this.channels = new ShopsChannelsApi(client);
    this.fulfillmentProfile = new ShopsFulfillmentProfileApi(client);
    this.settlementProfile = new ShopsSettlementProfileApi(client);
    this.businessHours = new ShopsBusinessHoursApi(client);
    this.serviceAreas = new ShopsServiceAreasApi(client);
    this.policies = new ShopsPoliciesApi(client);
    this.depositAccount = new ShopsDepositAccountApi(client);
    this.riskSignals = new ShopsRiskSignalsApi(client);
    this.readiness = new ShopsReadinessApi(client);
  }


/** Shops create. */
  async create(body: CreateShopRequest, params: ShopsCreateParams): Promise<ShopManagementDetailResponse> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.post<ShopManagementDetailResponse>(backendApiPath(`/shops`), body, undefined, requestHeaders, 'application/json');
  }

/** Shops update. */
  async update(shopId: string, body: UpdateShopRequest, params: ShopsUpdateParams): Promise<ShopManagementDetailResponse> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.patch<ShopManagementDetailResponse>(backendApiPath(`/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}`), body, undefined, requestHeaders, 'application/json');
  }

/** Shops submit Review. */
  async submitReview(shopId: string, body: SubmitShopReviewRequest, params: ShopsSubmitReviewParams): Promise<ShopManagementDetailResponse> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.post<ShopManagementDetailResponse>(backendApiPath(`/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/submit_review`), body, undefined, requestHeaders, 'application/json');
  }

/** Shops approve. */
  async approve(shopId: string, body: ApproveShopRequest, params: ShopsApproveParams): Promise<ShopManagementDetailResponse> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.post<ShopManagementDetailResponse>(backendApiPath(`/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/approve`), body, undefined, requestHeaders, 'application/json');
  }

/** Shops reject. */
  async reject(shopId: string, body: RejectShopRequest, params: ShopsRejectParams): Promise<ShopManagementDetailResponse> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.post<ShopManagementDetailResponse>(backendApiPath(`/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/reject`), body, undefined, requestHeaders, 'application/json');
  }

/** Shops suspend. */
  async suspend(shopId: string, body: SuspendShopRequest, params: ShopsSuspendParams): Promise<ShopManagementDetailResponse> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.post<ShopManagementDetailResponse>(backendApiPath(`/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/suspend`), body, undefined, requestHeaders, 'application/json');
  }

/** Shops resume. */
  async resume(shopId: string, body: ResumeShopRequest, params: ShopsResumeParams): Promise<ShopManagementDetailResponse> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.post<ShopManagementDetailResponse>(backendApiPath(`/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/resume`), body, undefined, requestHeaders, 'application/json');
  }

/** Shops close. */
  async close(shopId: string, body: CloseShopRequest, params: ShopsCloseParams): Promise<ShopManagementDetailResponse> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.post<ShopManagementDetailResponse>(backendApiPath(`/shops/${serializePathParameter(shopId, { name: 'shopId', style: 'simple', explode: false })}/close`), body, undefined, requestHeaders, 'application/json');
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
