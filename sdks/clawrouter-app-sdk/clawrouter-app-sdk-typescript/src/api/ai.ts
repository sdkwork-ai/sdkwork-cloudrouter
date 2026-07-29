import { appApiPath } from './paths';
import type { ApiRequestOptions, HttpClient } from '../http/client';
import type { AppRoutingAccountGroupListResponse, AppRoutingApiKeyListResponse, AppRoutingRequestTraceListResponse, AppRoutingUsageSnapshot, DashboardOverviewResponse } from '../types';
export class AiUsageLogsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List logs */
  async list(requestOptions?: ApiRequestOptions): Promise<Record<string, never>> {
    return this.client.request<Record<string, never>>(appApiPath(`/ai/usage/logs`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any, sdkworkUnwrapKind: 'data' });
  }
}

export class AiUsageApi {
  private client: HttpClient;
  public readonly logs: AiUsageLogsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.logs = new AiUsageLogsApi(client);
  }

}

export class AiRoutingUsageApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List routing usage */
  async retrieve(requestOptions?: ApiRequestOptions): Promise<AppRoutingUsageSnapshot> {
    return this.client.request<AppRoutingUsageSnapshot>(appApiPath(`/ai/routing/usage`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any, sdkworkUnwrapKind: 'data' });
  }
}

export interface AiRoutingRequestTracesListParams {
  page?: number;
  pageSize?: number;
  q?: string;
}

export class AiRoutingRequestTracesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List routing request traces */
  async list(params?: AiRoutingRequestTracesListParams, requestOptions?: ApiRequestOptions): Promise<AppRoutingRequestTraceListResponse> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'q', value: params?.q, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<AppRoutingRequestTraceListResponse>(appendQueryString(appApiPath(`/ai/routing/request_traces`), query), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any, sdkworkUnwrapKind: 'page' });
  }
}

export interface AiRoutingApiKeysListParams {
  page?: number;
  pageSize?: number;
  q?: string;
}

export class AiRoutingApiKeysApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List routing API keys */
  async list(params?: AiRoutingApiKeysListParams, requestOptions?: ApiRequestOptions): Promise<AppRoutingApiKeyListResponse> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'q', value: params?.q, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<AppRoutingApiKeyListResponse>(appendQueryString(appApiPath(`/ai/routing/api_keys`), query), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any, sdkworkUnwrapKind: 'page' });
  }
}

export interface AiRoutingAccountGroupsListParams {
  page?: number;
  pageSize?: number;
  q?: string;
}

export class AiRoutingAccountGroupsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List routing account groups */
  async list(params?: AiRoutingAccountGroupsListParams, requestOptions?: ApiRequestOptions): Promise<AppRoutingAccountGroupListResponse> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'q', value: params?.q, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<AppRoutingAccountGroupListResponse>(appendQueryString(appApiPath(`/ai/routing/account_groups`), query), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any, sdkworkUnwrapKind: 'page' });
  }
}

export class AiRoutingApi {
  private client: HttpClient;
  public readonly accountGroups: AiRoutingAccountGroupsApi;
  public readonly apiKeys: AiRoutingApiKeysApi;
  public readonly requestTraces: AiRoutingRequestTracesApi;
  public readonly usage: AiRoutingUsageApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.accountGroups = new AiRoutingAccountGroupsApi(client);
    this.apiKeys = new AiRoutingApiKeysApi(client);
    this.requestTraces = new AiRoutingRequestTracesApi(client);
    this.usage = new AiRoutingUsageApi(client);
  }

}

export class AiGenerationsWorkspaceApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List playground generation history from service */
  async list(requestOptions?: ApiRequestOptions): Promise<Record<string, never>> {
    return this.client.request<Record<string, never>>(appApiPath(`/ai/generations/workspace`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any, sdkworkUnwrapKind: 'data' });
  }
}

export class AiGenerationsImagesTextToImageApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Run playground asset generation */
  async create(requestOptions?: ApiRequestOptions): Promise<Record<string, never>> {
    return this.client.request<Record<string, never>>(appApiPath(`/ai/generations/images/text_to_image`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'POST' as any, sdkworkUnwrapKind: 'data' });
  }
}

export class AiGenerationsImagesApi {
  private client: HttpClient;
  public readonly textToImage: AiGenerationsImagesTextToImageApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.textToImage = new AiGenerationsImagesTextToImageApi(client);
  }

}

export class AiGenerationsApi {
  private client: HttpClient;
  public readonly images: AiGenerationsImagesApi;
  public readonly workspace: AiGenerationsWorkspaceApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.images = new AiGenerationsImagesApi(client);
    this.workspace = new AiGenerationsWorkspaceApi(client);
  }


/** List generation history */
  async list(requestOptions?: ApiRequestOptions): Promise<Record<string, never>> {
    return this.client.request<Record<string, never>>(appApiPath(`/ai/generations`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any, sdkworkUnwrapKind: 'data' });
  }
}

export class AiGatewayTracesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List traces */
  async list(requestOptions?: ApiRequestOptions): Promise<Record<string, never>> {
    return this.client.request<Record<string, never>>(appApiPath(`/ai/gateway/traces`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any, sdkworkUnwrapKind: 'data' });
  }
}

export class AiGatewayApi {
  private client: HttpClient;
  public readonly traces: AiGatewayTracesApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.traces = new AiGatewayTracesApi(client);
  }

}

export interface AiDashboardOverviewRetrieveParams {
  timeRange?: 'hourly' | 'daily' | 'monthly' | 'yearly';
  startTime?: string;
  endTime?: string;
}

export class AiDashboardOverviewApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List dashboard overview */
  async retrieve(params?: AiDashboardOverviewRetrieveParams, requestOptions?: ApiRequestOptions): Promise<DashboardOverviewResponse> {
    const query = buildQueryString([
      { name: 'time_range', value: params?.timeRange, style: 'form', explode: true, allowReserved: false },
      { name: 'start_time', value: params?.startTime, style: 'form', explode: true, allowReserved: false },
      { name: 'end_time', value: params?.endTime, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<DashboardOverviewResponse>(appendQueryString(appApiPath(`/ai/dashboard/overview`), query), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any, sdkworkUnwrapKind: 'data' });
  }
}

export class AiDashboardApi {
  private client: HttpClient;
  public readonly overview: AiDashboardOverviewApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.overview = new AiDashboardOverviewApi(client);
  }

}

export class AiApi {
  private client: HttpClient;
  public readonly dashboard: AiDashboardApi;
  public readonly gateway: AiGatewayApi;
  public readonly generations: AiGenerationsApi;
  public readonly routing: AiRoutingApi;
  public readonly usage: AiUsageApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.dashboard = new AiDashboardApi(client);
    this.gateway = new AiGatewayApi(client);
    this.generations = new AiGenerationsApi(client);
    this.routing = new AiRoutingApi(client);
    this.usage = new AiUsageApi(client);
  }

}

export function createAiApi(client: HttpClient): AiApi {
  return new AiApi(client);
}

function appendQueryString(path: string, rawQueryString: string): string {
  const query = rawQueryString.replace(/^\?+/, '');
  if (!query) {
    return path;
  }
  return path.includes('?') ? `${path}&${query}` : `${path}?${query}`;
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
