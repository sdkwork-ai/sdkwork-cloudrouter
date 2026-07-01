import { appApiPath } from './paths';
import type { HttpClient } from '../http/client';

import type { OrdersCancellationsCreateResult, OrdersCancelResult, OrdersCreateResult, OrdersPaymentSuccessRetrieveResult, OrdersPayResult, OrdersRetrieveResult, OrdersStatisticsRetrieveResult, OrdersStatusRetrieveResult, SdkWorkPageData } from '../types';


export class OrdersStatusApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(orderId: string): Promise<OrdersStatusRetrieveResult> {
    return this.client.get<OrdersStatusRetrieveResult>(appApiPath(`/orders/${serializePathParameter(orderId, { name: 'orderId', style: 'simple', explode: false })}/status`));
  }
}

export class OrdersPaymentsOrderPaymentsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(orderId: string): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(appApiPath(`/orders/${serializePathParameter(orderId, { name: 'orderId', style: 'simple', explode: false })}/payments`));
  }
}

export class OrdersPaymentsApi {
  private client: HttpClient;
  public readonly orderPayments: OrdersPaymentsOrderPaymentsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.orderPayments = new OrdersPaymentsOrderPaymentsApi(client);
  }

}

export class OrdersPaymentSuccessApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(orderId: string): Promise<OrdersPaymentSuccessRetrieveResult> {
    return this.client.get<OrdersPaymentSuccessRetrieveResult>(appApiPath(`/orders/${serializePathParameter(orderId, { name: 'orderId', style: 'simple', explode: false })}/payment_success`));
  }
}

export class OrdersEventsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(orderId: string): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(appApiPath(`/orders/${serializePathParameter(orderId, { name: 'orderId', style: 'simple', explode: false })}/events`));
  }
}

export class OrdersCancellationsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create */
  async create(orderId: string): Promise<OrdersCancellationsCreateResult> {
    return this.client.post<OrdersCancellationsCreateResult>(appApiPath(`/orders/${serializePathParameter(orderId, { name: 'orderId', style: 'simple', explode: false })}/cancellations`));
  }
}

export class OrdersStatisticsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(): Promise<OrdersStatisticsRetrieveResult> {
    return this.client.get<OrdersStatisticsRetrieveResult>(appApiPath(`/orders/statistics`));
  }
}

export class OrdersApi {
  private client: HttpClient;
  public readonly statistics: OrdersStatisticsApi;
  public readonly cancellations: OrdersCancellationsApi;
  public readonly events: OrdersEventsApi;
  public readonly paymentSuccess: OrdersPaymentSuccessApi;
  public readonly payments: OrdersPaymentsApi;
  public readonly status: OrdersStatusApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.statistics = new OrdersStatisticsApi(client);
    this.cancellations = new OrdersCancellationsApi(client);
    this.events = new OrdersEventsApi(client);
    this.paymentSuccess = new OrdersPaymentSuccessApi(client);
    this.payments = new OrdersPaymentsApi(client);
    this.status = new OrdersStatusApi(client);
  }


/** List */
  async list(): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(appApiPath(`/orders`));
  }

/** Create */
  async create(): Promise<OrdersCreateResult> {
    return this.client.post<OrdersCreateResult>(appApiPath(`/orders`));
  }

/** Retrieve */
  async retrieve(orderId: string): Promise<OrdersRetrieveResult> {
    return this.client.get<OrdersRetrieveResult>(appApiPath(`/orders/${serializePathParameter(orderId, { name: 'orderId', style: 'simple', explode: false })}`));
  }

/** Cancel */
  async cancel(orderId: string): Promise<OrdersCancelResult> {
    return this.client.post<OrdersCancelResult>(appApiPath(`/orders/${serializePathParameter(orderId, { name: 'orderId', style: 'simple', explode: false })}/cancel`));
  }

/** Pay */
  async pay(orderId: string): Promise<OrdersPayResult> {
    return this.client.post<OrdersPayResult>(appApiPath(`/orders/${serializePathParameter(orderId, { name: 'orderId', style: 'simple', explode: false })}/payments`));
  }
}

export function createOrdersApi(client: HttpClient): OrdersApi {
  return new OrdersApi(client);
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
