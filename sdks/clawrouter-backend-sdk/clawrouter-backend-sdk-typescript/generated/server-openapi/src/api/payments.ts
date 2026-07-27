import { backendApiPath } from './paths';
import type { ApiRequestOptions, HttpClient } from '../http/client';
import type { PaymentProviderAccountMutationRequest, PaymentProviderAccountStatusUpdateRequest } from '../types';
export class PaymentsWebhookEventsReplaysApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create */
  async create(eventId: string, requestOptions?: ApiRequestOptions): Promise<Record<string, never>> {
    return this.client.request<Record<string, never>>(backendApiPath(`/payments/webhook_events/${serializePathParameter(eventId, { name: 'eventId', style: 'simple', explode: false })}/replays`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'POST' as any });
  }
}

export interface PaymentsWebhookEventsListParams {
  page?: string;
  pageSize?: string;
  status?: string;
  providerCode?: string;
  providerAccountId?: string;
  methodCode?: string;
  countryCode?: string;
  currencyCode?: string;
  orderId?: string;
  intentId?: string;
  businessDate?: string;
}

export class PaymentsWebhookEventsApi {
  private client: HttpClient;
  public readonly replays: PaymentsWebhookEventsReplaysApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.replays = new PaymentsWebhookEventsReplaysApi(client);
  }


/** List */
  async list(params?: PaymentsWebhookEventsListParams, requestOptions?: ApiRequestOptions): Promise<Record<string, never>> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
      { name: 'provider_code', value: params?.providerCode, style: 'form', explode: true, allowReserved: false },
      { name: 'provider_account_id', value: params?.providerAccountId, style: 'form', explode: true, allowReserved: false },
      { name: 'method_code', value: params?.methodCode, style: 'form', explode: true, allowReserved: false },
      { name: 'country_code', value: params?.countryCode, style: 'form', explode: true, allowReserved: false },
      { name: 'currency_code', value: params?.currencyCode, style: 'form', explode: true, allowReserved: false },
      { name: 'order_id', value: params?.orderId, style: 'form', explode: true, allowReserved: false },
      { name: 'intent_id', value: params?.intentId, style: 'form', explode: true, allowReserved: false },
      { name: 'business_date', value: params?.businessDate, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<Record<string, never>>(appendQueryString(backendApiPath(`/payments/webhook_events`), query), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any });
  }
}

export class PaymentsRuntimeSnapshotApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(requestOptions?: ApiRequestOptions): Promise<Record<string, never>> {
    return this.client.request<Record<string, never>>(backendApiPath(`/payments/runtime/snapshot`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any });
  }
}

export class PaymentsRuntimeApi {
  private client: HttpClient;
  public readonly snapshot: PaymentsRuntimeSnapshotApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.snapshot = new PaymentsRuntimeSnapshotApi(client);
  }

}

export interface PaymentsRouteRulesListParams {
  page?: string;
  pageSize?: string;
  status?: string;
  providerCode?: string;
  providerAccountId?: string;
  methodCode?: string;
  countryCode?: string;
  currencyCode?: string;
  orderId?: string;
  intentId?: string;
  businessDate?: string;
}

export class PaymentsRouteRulesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(params?: PaymentsRouteRulesListParams, requestOptions?: ApiRequestOptions): Promise<Record<string, never>> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
      { name: 'provider_code', value: params?.providerCode, style: 'form', explode: true, allowReserved: false },
      { name: 'provider_account_id', value: params?.providerAccountId, style: 'form', explode: true, allowReserved: false },
      { name: 'method_code', value: params?.methodCode, style: 'form', explode: true, allowReserved: false },
      { name: 'country_code', value: params?.countryCode, style: 'form', explode: true, allowReserved: false },
      { name: 'currency_code', value: params?.currencyCode, style: 'form', explode: true, allowReserved: false },
      { name: 'order_id', value: params?.orderId, style: 'form', explode: true, allowReserved: false },
      { name: 'intent_id', value: params?.intentId, style: 'form', explode: true, allowReserved: false },
      { name: 'business_date', value: params?.businessDate, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<Record<string, never>>(appendQueryString(backendApiPath(`/payments/route_rules`), query), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any });
  }

/** Create */
  async create(requestOptions?: ApiRequestOptions): Promise<Record<string, never>> {
    return this.client.request<Record<string, never>>(backendApiPath(`/payments/route_rules`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'POST' as any });
  }

/** Update */
  async update(routeRuleId: string, requestOptions?: ApiRequestOptions): Promise<Record<string, never>> {
    return this.client.request<Record<string, never>>(backendApiPath(`/payments/route_rules/${serializePathParameter(routeRuleId, { name: 'routeRuleId', style: 'simple', explode: false })}`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'PATCH' as any });
  }
}

export interface PaymentsReconciliationRunsListParams {
  page?: string;
  pageSize?: string;
  status?: string;
  providerCode?: string;
  providerAccountId?: string;
  methodCode?: string;
  countryCode?: string;
  currencyCode?: string;
  orderId?: string;
  intentId?: string;
  businessDate?: string;
}

export class PaymentsReconciliationRunsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(params?: PaymentsReconciliationRunsListParams, requestOptions?: ApiRequestOptions): Promise<Record<string, never>> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
      { name: 'provider_code', value: params?.providerCode, style: 'form', explode: true, allowReserved: false },
      { name: 'provider_account_id', value: params?.providerAccountId, style: 'form', explode: true, allowReserved: false },
      { name: 'method_code', value: params?.methodCode, style: 'form', explode: true, allowReserved: false },
      { name: 'country_code', value: params?.countryCode, style: 'form', explode: true, allowReserved: false },
      { name: 'currency_code', value: params?.currencyCode, style: 'form', explode: true, allowReserved: false },
      { name: 'order_id', value: params?.orderId, style: 'form', explode: true, allowReserved: false },
      { name: 'intent_id', value: params?.intentId, style: 'form', explode: true, allowReserved: false },
      { name: 'business_date', value: params?.businessDate, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<Record<string, never>>(appendQueryString(backendApiPath(`/payments/reconciliation_runs`), query), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any });
  }

/** Create */
  async create(requestOptions?: ApiRequestOptions): Promise<Record<string, never>> {
    return this.client.request<Record<string, never>>(backendApiPath(`/payments/reconciliation_runs`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'POST' as any });
  }
}

export interface PaymentsProvidersListParams {
  page?: string;
  pageSize?: string;
  status?: string;
  providerCode?: string;
  providerAccountId?: string;
  methodCode?: string;
  countryCode?: string;
  currencyCode?: string;
  orderId?: string;
  intentId?: string;
  businessDate?: string;
}

export class PaymentsProvidersApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(params?: PaymentsProvidersListParams, requestOptions?: ApiRequestOptions): Promise<Record<string, never>> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
      { name: 'provider_code', value: params?.providerCode, style: 'form', explode: true, allowReserved: false },
      { name: 'provider_account_id', value: params?.providerAccountId, style: 'form', explode: true, allowReserved: false },
      { name: 'method_code', value: params?.methodCode, style: 'form', explode: true, allowReserved: false },
      { name: 'country_code', value: params?.countryCode, style: 'form', explode: true, allowReserved: false },
      { name: 'currency_code', value: params?.currencyCode, style: 'form', explode: true, allowReserved: false },
      { name: 'order_id', value: params?.orderId, style: 'form', explode: true, allowReserved: false },
      { name: 'intent_id', value: params?.intentId, style: 'form', explode: true, allowReserved: false },
      { name: 'business_date', value: params?.businessDate, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<Record<string, never>>(appendQueryString(backendApiPath(`/payments/providers`), query), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any });
  }

/** Update */
  async update(providerCode: string, requestOptions?: ApiRequestOptions): Promise<Record<string, never>> {
    return this.client.request<Record<string, never>>(backendApiPath(`/payments/providers/${serializePathParameter(providerCode, { name: 'providerCode', style: 'simple', explode: false })}`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'PATCH' as any });
  }
}

export interface PaymentsProviderAccountsStatusUpdateParams {
  idempotencyKey: string;
}

export class PaymentsProviderAccountsStatusApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Update */
  async update(providerAccountId: string, body: PaymentProviderAccountStatusUpdateRequest, params: PaymentsProviderAccountsStatusUpdateParams, requestOptions?: ApiRequestOptions): Promise<Record<string, never>> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.request<Record<string, never>>(backendApiPath(`/payments/provider_accounts/${serializePathParameter(providerAccountId, { name: 'providerAccountId', style: 'simple', explode: false })}/status`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'PATCH' as any, body, headers: requestHeaders, contentType: 'application/json' });
  }
}

export interface PaymentsProviderAccountsListParams {
  page?: string;
  pageSize?: string;
  status?: string;
  providerCode?: string;
  providerAccountId?: string;
  methodCode?: string;
  countryCode?: string;
  currencyCode?: string;
  orderId?: string;
  intentId?: string;
  businessDate?: string;
}

export interface PaymentsProviderAccountsCreateParams {
  idempotencyKey: string;
}

export interface PaymentsProviderAccountsUpdateParams {
  idempotencyKey: string;
}

export class PaymentsProviderAccountsApi {
  private client: HttpClient;
  public readonly status: PaymentsProviderAccountsStatusApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.status = new PaymentsProviderAccountsStatusApi(client);
  }


/** List */
  async list(params?: PaymentsProviderAccountsListParams, requestOptions?: ApiRequestOptions): Promise<Record<string, never>> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
      { name: 'provider_code', value: params?.providerCode, style: 'form', explode: true, allowReserved: false },
      { name: 'provider_account_id', value: params?.providerAccountId, style: 'form', explode: true, allowReserved: false },
      { name: 'method_code', value: params?.methodCode, style: 'form', explode: true, allowReserved: false },
      { name: 'country_code', value: params?.countryCode, style: 'form', explode: true, allowReserved: false },
      { name: 'currency_code', value: params?.currencyCode, style: 'form', explode: true, allowReserved: false },
      { name: 'order_id', value: params?.orderId, style: 'form', explode: true, allowReserved: false },
      { name: 'intent_id', value: params?.intentId, style: 'form', explode: true, allowReserved: false },
      { name: 'business_date', value: params?.businessDate, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<Record<string, never>>(appendQueryString(backendApiPath(`/payments/provider_accounts`), query), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any });
  }

/** Create */
  async create(body: PaymentProviderAccountMutationRequest, params: PaymentsProviderAccountsCreateParams, requestOptions?: ApiRequestOptions): Promise<Record<string, never>> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.request<Record<string, never>>(backendApiPath(`/payments/provider_accounts`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'POST' as any, body, headers: requestHeaders, contentType: 'application/json' });
  }

/** Delete */
  async delete(providerAccountId: string, requestOptions?: ApiRequestOptions): Promise<void> {
    return this.client.request<void>(backendApiPath(`/payments/provider_accounts/${serializePathParameter(providerAccountId, { name: 'providerAccountId', style: 'simple', explode: false })}`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'DELETE' as any });
  }

/** Update */
  async update(providerAccountId: string, body: PaymentProviderAccountMutationRequest, params: PaymentsProviderAccountsUpdateParams, requestOptions?: ApiRequestOptions): Promise<Record<string, never>> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.request<Record<string, never>>(backendApiPath(`/payments/provider_accounts/${serializePathParameter(providerAccountId, { name: 'providerAccountId', style: 'simple', explode: false })}`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'PATCH' as any, body, headers: requestHeaders, contentType: 'application/json' });
  }
}

export interface PaymentsMethodsManagementListParams {
  page?: string;
  pageSize?: string;
  status?: string;
  providerCode?: string;
  providerAccountId?: string;
  methodCode?: string;
  countryCode?: string;
  currencyCode?: string;
  orderId?: string;
  intentId?: string;
  businessDate?: string;
}

export class PaymentsMethodsManagementApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(params?: PaymentsMethodsManagementListParams, requestOptions?: ApiRequestOptions): Promise<Record<string, never>> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
      { name: 'provider_code', value: params?.providerCode, style: 'form', explode: true, allowReserved: false },
      { name: 'provider_account_id', value: params?.providerAccountId, style: 'form', explode: true, allowReserved: false },
      { name: 'method_code', value: params?.methodCode, style: 'form', explode: true, allowReserved: false },
      { name: 'country_code', value: params?.countryCode, style: 'form', explode: true, allowReserved: false },
      { name: 'currency_code', value: params?.currencyCode, style: 'form', explode: true, allowReserved: false },
      { name: 'order_id', value: params?.orderId, style: 'form', explode: true, allowReserved: false },
      { name: 'intent_id', value: params?.intentId, style: 'form', explode: true, allowReserved: false },
      { name: 'business_date', value: params?.businessDate, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<Record<string, never>>(appendQueryString(backendApiPath(`/payments/methods`), query), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any });
  }
}

export class PaymentsMethodsApi {
  private client: HttpClient;
  public readonly management: PaymentsMethodsManagementApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.management = new PaymentsMethodsManagementApi(client);
  }


/** Create */
  async create(requestOptions?: ApiRequestOptions): Promise<Record<string, never>> {
    return this.client.request<Record<string, never>>(backendApiPath(`/payments/methods`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'POST' as any });
  }

/** Update */
  async update(methodId: string, requestOptions?: ApiRequestOptions): Promise<Record<string, never>> {
    return this.client.request<Record<string, never>>(backendApiPath(`/payments/methods/${serializePathParameter(methodId, { name: 'methodId', style: 'simple', explode: false })}`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'PATCH' as any });
  }
}

export class PaymentsIntentsManagementApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(paymentIntentId: string, requestOptions?: ApiRequestOptions): Promise<Record<string, never>> {
    return this.client.request<Record<string, never>>(backendApiPath(`/payments/intents/${serializePathParameter(paymentIntentId, { name: 'paymentIntentId', style: 'simple', explode: false })}`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any });
  }
}

export interface PaymentsIntentsListParams {
  page?: string;
  pageSize?: string;
  status?: string;
  providerCode?: string;
  providerAccountId?: string;
  methodCode?: string;
  countryCode?: string;
  currencyCode?: string;
  orderId?: string;
  intentId?: string;
  businessDate?: string;
}

export class PaymentsIntentsApi {
  private client: HttpClient;
  public readonly management: PaymentsIntentsManagementApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.management = new PaymentsIntentsManagementApi(client);
  }


/** List */
  async list(params?: PaymentsIntentsListParams, requestOptions?: ApiRequestOptions): Promise<Record<string, never>> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
      { name: 'provider_code', value: params?.providerCode, style: 'form', explode: true, allowReserved: false },
      { name: 'provider_account_id', value: params?.providerAccountId, style: 'form', explode: true, allowReserved: false },
      { name: 'method_code', value: params?.methodCode, style: 'form', explode: true, allowReserved: false },
      { name: 'country_code', value: params?.countryCode, style: 'form', explode: true, allowReserved: false },
      { name: 'currency_code', value: params?.currencyCode, style: 'form', explode: true, allowReserved: false },
      { name: 'order_id', value: params?.orderId, style: 'form', explode: true, allowReserved: false },
      { name: 'intent_id', value: params?.intentId, style: 'form', explode: true, allowReserved: false },
      { name: 'business_date', value: params?.businessDate, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<Record<string, never>>(appendQueryString(backendApiPath(`/payments/intents`), query), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any });
  }
}

export interface PaymentsDisputesListParams {
  page?: string;
  pageSize?: string;
  status?: string;
  providerCode?: string;
  providerAccountId?: string;
  methodCode?: string;
  countryCode?: string;
  currencyCode?: string;
  orderId?: string;
  intentId?: string;
  businessDate?: string;
}

export class PaymentsDisputesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(params?: PaymentsDisputesListParams, requestOptions?: ApiRequestOptions): Promise<Record<string, never>> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
      { name: 'provider_code', value: params?.providerCode, style: 'form', explode: true, allowReserved: false },
      { name: 'provider_account_id', value: params?.providerAccountId, style: 'form', explode: true, allowReserved: false },
      { name: 'method_code', value: params?.methodCode, style: 'form', explode: true, allowReserved: false },
      { name: 'country_code', value: params?.countryCode, style: 'form', explode: true, allowReserved: false },
      { name: 'currency_code', value: params?.currencyCode, style: 'form', explode: true, allowReserved: false },
      { name: 'order_id', value: params?.orderId, style: 'form', explode: true, allowReserved: false },
      { name: 'intent_id', value: params?.intentId, style: 'form', explode: true, allowReserved: false },
      { name: 'business_date', value: params?.businessDate, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<Record<string, never>>(appendQueryString(backendApiPath(`/payments/disputes`), query), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any });
  }
}

export interface PaymentsChannelsListParams {
  page?: string;
  pageSize?: string;
  status?: string;
  providerCode?: string;
  providerAccountId?: string;
  methodCode?: string;
  countryCode?: string;
  currencyCode?: string;
  orderId?: string;
  intentId?: string;
  businessDate?: string;
}

export class PaymentsChannelsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(params?: PaymentsChannelsListParams, requestOptions?: ApiRequestOptions): Promise<Record<string, never>> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
      { name: 'provider_code', value: params?.providerCode, style: 'form', explode: true, allowReserved: false },
      { name: 'provider_account_id', value: params?.providerAccountId, style: 'form', explode: true, allowReserved: false },
      { name: 'method_code', value: params?.methodCode, style: 'form', explode: true, allowReserved: false },
      { name: 'country_code', value: params?.countryCode, style: 'form', explode: true, allowReserved: false },
      { name: 'currency_code', value: params?.currencyCode, style: 'form', explode: true, allowReserved: false },
      { name: 'order_id', value: params?.orderId, style: 'form', explode: true, allowReserved: false },
      { name: 'intent_id', value: params?.intentId, style: 'form', explode: true, allowReserved: false },
      { name: 'business_date', value: params?.businessDate, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<Record<string, never>>(appendQueryString(backendApiPath(`/payments/channels`), query), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any });
  }

/** Create */
  async create(requestOptions?: ApiRequestOptions): Promise<Record<string, never>> {
    return this.client.request<Record<string, never>>(backendApiPath(`/payments/channels`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'POST' as any });
  }

/** Update */
  async update(channelId: string, requestOptions?: ApiRequestOptions): Promise<Record<string, never>> {
    return this.client.request<Record<string, never>>(backendApiPath(`/payments/channels/${serializePathParameter(channelId, { name: 'channelId', style: 'simple', explode: false })}`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'PATCH' as any });
  }
}

export interface PaymentsAttemptsListParams {
  page?: string;
  pageSize?: string;
  status?: string;
  providerCode?: string;
  providerAccountId?: string;
  methodCode?: string;
  countryCode?: string;
  currencyCode?: string;
  orderId?: string;
  intentId?: string;
  businessDate?: string;
}

export class PaymentsAttemptsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(params?: PaymentsAttemptsListParams, requestOptions?: ApiRequestOptions): Promise<Record<string, never>> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
      { name: 'provider_code', value: params?.providerCode, style: 'form', explode: true, allowReserved: false },
      { name: 'provider_account_id', value: params?.providerAccountId, style: 'form', explode: true, allowReserved: false },
      { name: 'method_code', value: params?.methodCode, style: 'form', explode: true, allowReserved: false },
      { name: 'country_code', value: params?.countryCode, style: 'form', explode: true, allowReserved: false },
      { name: 'currency_code', value: params?.currencyCode, style: 'form', explode: true, allowReserved: false },
      { name: 'order_id', value: params?.orderId, style: 'form', explode: true, allowReserved: false },
      { name: 'intent_id', value: params?.intentId, style: 'form', explode: true, allowReserved: false },
      { name: 'business_date', value: params?.businessDate, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<Record<string, never>>(appendQueryString(backendApiPath(`/payments/attempts`), query), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any });
  }
}

export class PaymentsApi {
  private client: HttpClient;
  public readonly attempts: PaymentsAttemptsApi;
  public readonly channels: PaymentsChannelsApi;
  public readonly disputes: PaymentsDisputesApi;
  public readonly intents: PaymentsIntentsApi;
  public readonly methods: PaymentsMethodsApi;
  public readonly providerAccounts: PaymentsProviderAccountsApi;
  public readonly providers: PaymentsProvidersApi;
  public readonly reconciliationRuns: PaymentsReconciliationRunsApi;
  public readonly routeRules: PaymentsRouteRulesApi;
  public readonly runtime: PaymentsRuntimeApi;
  public readonly webhookEvents: PaymentsWebhookEventsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.attempts = new PaymentsAttemptsApi(client);
    this.channels = new PaymentsChannelsApi(client);
    this.disputes = new PaymentsDisputesApi(client);
    this.intents = new PaymentsIntentsApi(client);
    this.methods = new PaymentsMethodsApi(client);
    this.providerAccounts = new PaymentsProviderAccountsApi(client);
    this.providers = new PaymentsProvidersApi(client);
    this.reconciliationRuns = new PaymentsReconciliationRunsApi(client);
    this.routeRules = new PaymentsRouteRulesApi(client);
    this.runtime = new PaymentsRuntimeApi(client);
    this.webhookEvents = new PaymentsWebhookEventsApi(client);
  }

}

export function createPaymentsApi(client: HttpClient): PaymentsApi {
  return new PaymentsApi(client);
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
