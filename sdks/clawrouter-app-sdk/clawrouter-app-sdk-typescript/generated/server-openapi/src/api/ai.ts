import { appApiPath } from './paths';
import type { HttpClient } from '../http/client';
import type { ModelCatalogPage, ModelRankingsPage } from '../types';
export class AiUsageLogsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(appApiPath(`/ai/usage/logs`));
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


/** List */
  async list(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(appApiPath(`/ai/routing/usage`));
  }
}

export class AiRoutingRequestTracesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(appApiPath(`/ai/routing/request_traces`));
  }
}

export class AiRoutingChannelsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(appApiPath(`/ai/routing/channels`));
  }
}

export class AiRoutingApiKeysApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(appApiPath(`/ai/routing/api_keys`));
  }
}

export class AiRoutingApi {
  private client: HttpClient;
  public readonly apiKeys: AiRoutingApiKeysApi;
  public readonly channels: AiRoutingChannelsApi;
  public readonly requestTraces: AiRoutingRequestTracesApi;
  public readonly usage: AiRoutingUsageApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.apiKeys = new AiRoutingApiKeysApi(client);
    this.channels = new AiRoutingChannelsApi(client);
    this.requestTraces = new AiRoutingRequestTracesApi(client);
    this.usage = new AiRoutingUsageApi(client);
  }

}

export interface AiModelsListParams {
  page?: number;
  pageSize?: number;
  q?: string;
  billingMeter?: string;
  vendorCodes?: string[];
  modalities?: string[];
  capabilities?: string[];
  categories?: string[];
  groups?: string[];
}

export class AiModelsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(params?: AiModelsListParams): Promise<ModelCatalogPage> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'q', value: params?.q, style: 'form', explode: true, allowReserved: false },
      { name: 'billing_meter', value: params?.billingMeter, style: 'form', explode: true, allowReserved: false },
      { name: 'vendor_codes', value: params?.vendorCodes, style: 'form', explode: false, allowReserved: false },
      { name: 'modalities', value: params?.modalities, style: 'form', explode: false, allowReserved: false },
      { name: 'capabilities', value: params?.capabilities, style: 'form', explode: false, allowReserved: false },
      { name: 'categories', value: params?.categories, style: 'form', explode: false, allowReserved: false },
      { name: 'groups', value: params?.groups, style: 'form', explode: false, allowReserved: false },
    ]);
    return this.client.get<ModelCatalogPage>(appendQueryString(appApiPath(`/ai/models`), query));
  }
}

export class AiModelVendorsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(appApiPath(`/ai/model_vendors`));
  }
}

export interface AiModelRankingsListParams {
  rankScope?: string;
  vendorCode?: string;
  modality?: string;
  q?: string;
  pageSize?: number;
}

export class AiModelRankingsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(params?: AiModelRankingsListParams): Promise<ModelRankingsPage> {
    const query = buildQueryString([
      { name: 'rank_scope', value: params?.rankScope, style: 'form', explode: true, allowReserved: false },
      { name: 'vendor_code', value: params?.vendorCode, style: 'form', explode: true, allowReserved: false },
      { name: 'modality', value: params?.modality, style: 'form', explode: true, allowReserved: false },
      { name: 'q', value: params?.q, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<ModelRankingsPage>(appendQueryString(appApiPath(`/ai/model_rankings`), query));
  }
}

export class AiGatewayTracesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(appApiPath(`/ai/gateway/traces`));
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

export class AiDashboardOverviewApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(appApiPath(`/ai/dashboard/overview`));
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

export class AiChannelGroupsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(appApiPath(`/ai/channel_groups`));
  }
}

export class AiApi {
  private client: HttpClient;
  public readonly channelGroups: AiChannelGroupsApi;
  public readonly dashboard: AiDashboardApi;
  public readonly gateway: AiGatewayApi;
  public readonly modelRankings: AiModelRankingsApi;
  public readonly modelVendors: AiModelVendorsApi;
  public readonly models: AiModelsApi;
  public readonly routing: AiRoutingApi;
  public readonly usage: AiUsageApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.channelGroups = new AiChannelGroupsApi(client);
    this.dashboard = new AiDashboardApi(client);
    this.gateway = new AiGatewayApi(client);
    this.modelRankings = new AiModelRankingsApi(client);
    this.modelVendors = new AiModelVendorsApi(client);
    this.models = new AiModelsApi(client);
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
