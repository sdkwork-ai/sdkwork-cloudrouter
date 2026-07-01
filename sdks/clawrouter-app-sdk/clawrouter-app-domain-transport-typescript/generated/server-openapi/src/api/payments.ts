import { appApiPath } from './paths';
import type { HttpClient } from '../http/client';

import type { PaymentsAttemptsRetrieveResult, PaymentsCheckoutRetrieveResult, PaymentsCloseResult, PaymentsCreateResult, PaymentsIntentsAttemptsCreateResult, PaymentsIntentsCancelResult, PaymentsIntentsCreateResult, PaymentsIntentsRetrieveResult, PaymentsReconcileResult, PaymentsRecordsRetrieveResult, PaymentsStatisticsRetrieveResult, PaymentsStatusRetrieveByOutTradeNoResult, PaymentsStatusRetrieveResult, SdkWorkPageData } from '../types';


export class PaymentsStatusApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve by out trade no */
  async retrieveByOutTradeNo(outTradeNo: string): Promise<PaymentsStatusRetrieveByOutTradeNoResult> {
    return this.client.get<PaymentsStatusRetrieveByOutTradeNoResult>(appApiPath(`/payments/status/out_trade_no/${serializePathParameter(outTradeNo, { name: 'outTradeNo', style: 'simple', explode: false })}`));
  }

/** Retrieve */
  async retrieve(paymentId: string): Promise<PaymentsStatusRetrieveResult> {
    return this.client.get<PaymentsStatusRetrieveResult>(appApiPath(`/payments/status/${serializePathParameter(paymentId, { name: 'paymentId', style: 'simple', explode: false })}`));
  }
}

export class PaymentsStatisticsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(): Promise<PaymentsStatisticsRetrieveResult> {
    return this.client.get<PaymentsStatisticsRetrieveResult>(appApiPath(`/payments/statistics`));
  }
}

export class PaymentsRecordsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(appApiPath(`/payments/records`));
  }

/** Retrieve */
  async retrieve(paymentId: string): Promise<PaymentsRecordsRetrieveResult> {
    return this.client.get<PaymentsRecordsRetrieveResult>(appApiPath(`/payments/records/${serializePathParameter(paymentId, { name: 'paymentId', style: 'simple', explode: false })}`));
  }
}

export class PaymentsMethodsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(appApiPath(`/payments/methods`));
  }
}

export class PaymentsIntentsAttemptsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create */
  async create(paymentIntentId: string): Promise<PaymentsIntentsAttemptsCreateResult> {
    return this.client.post<PaymentsIntentsAttemptsCreateResult>(appApiPath(`/payments/intents/${serializePathParameter(paymentIntentId, { name: 'paymentIntentId', style: 'simple', explode: false })}/attempts`));
  }
}

export class PaymentsIntentsApi {
  private client: HttpClient;
  public readonly attempts: PaymentsIntentsAttemptsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.attempts = new PaymentsIntentsAttemptsApi(client);
  }


/** Create */
  async create(): Promise<PaymentsIntentsCreateResult> {
    return this.client.post<PaymentsIntentsCreateResult>(appApiPath(`/payments/intents`));
  }

/** Retrieve */
  async retrieve(paymentIntentId: string): Promise<PaymentsIntentsRetrieveResult> {
    return this.client.get<PaymentsIntentsRetrieveResult>(appApiPath(`/payments/intents/${serializePathParameter(paymentIntentId, { name: 'paymentIntentId', style: 'simple', explode: false })}`));
  }

/** Cancel */
  async cancel(paymentIntentId: string): Promise<PaymentsIntentsCancelResult> {
    return this.client.post<PaymentsIntentsCancelResult>(appApiPath(`/payments/intents/${serializePathParameter(paymentIntentId, { name: 'paymentIntentId', style: 'simple', explode: false })}/cancel`));
  }
}

export class PaymentsCheckoutApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(paymentId: string): Promise<PaymentsCheckoutRetrieveResult> {
    return this.client.get<PaymentsCheckoutRetrieveResult>(appApiPath(`/payments/checkout/${serializePathParameter(paymentId, { name: 'paymentId', style: 'simple', explode: false })}`));
  }
}

export class PaymentsAttemptsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(paymentAttemptId: string): Promise<PaymentsAttemptsRetrieveResult> {
    return this.client.get<PaymentsAttemptsRetrieveResult>(appApiPath(`/payments/attempts/${serializePathParameter(paymentAttemptId, { name: 'paymentAttemptId', style: 'simple', explode: false })}`));
  }
}

export class PaymentsApi {
  private client: HttpClient;
  public readonly attempts: PaymentsAttemptsApi;
  public readonly checkout: PaymentsCheckoutApi;
  public readonly intents: PaymentsIntentsApi;
  public readonly methods: PaymentsMethodsApi;
  public readonly records: PaymentsRecordsApi;
  public readonly statistics: PaymentsStatisticsApi;
  public readonly status: PaymentsStatusApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.attempts = new PaymentsAttemptsApi(client);
    this.checkout = new PaymentsCheckoutApi(client);
    this.intents = new PaymentsIntentsApi(client);
    this.methods = new PaymentsMethodsApi(client);
    this.records = new PaymentsRecordsApi(client);
    this.statistics = new PaymentsStatisticsApi(client);
    this.status = new PaymentsStatusApi(client);
  }


/** Create */
  async create(): Promise<PaymentsCreateResult> {
    return this.client.post<PaymentsCreateResult>(appApiPath(`/payments`));
  }

/** Reconcile */
  async reconcile(): Promise<PaymentsReconcileResult> {
    return this.client.post<PaymentsReconcileResult>(appApiPath(`/payments/reconciliations`));
  }

/** Close */
  async close(paymentId: string): Promise<PaymentsCloseResult> {
    return this.client.post<PaymentsCloseResult>(appApiPath(`/payments/${serializePathParameter(paymentId, { name: 'paymentId', style: 'simple', explode: false })}/close`));
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
