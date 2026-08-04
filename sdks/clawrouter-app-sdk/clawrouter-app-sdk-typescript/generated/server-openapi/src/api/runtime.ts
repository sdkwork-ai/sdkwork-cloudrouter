import { appApiPath } from './paths';
import type { ApiRequestOptions, HttpClient } from '../http/client';
import type { CompleteRuntimeInvocationRequest, CreateRuntimeArtifactRequest, CreateRuntimeEventRequest, CreateRuntimeInvocationRequest, RuntimeArtifactItem, RuntimeArtifactListResponse, RuntimeEventItem, RuntimeEventListResponse, RuntimeInvocationItem, RuntimeInvocationListResponse } from '../types';
export interface RuntimeInvocationsEventsStreamListParams {
  afterEventNo?: string;
}

export class RuntimeInvocationsEventsStreamApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Stream runtime events */
  async list(invocationId: string, params?: RuntimeInvocationsEventsStreamListParams, requestOptions?: ApiRequestOptions): Promise<Record<string, never>> {
    const query = buildQueryString([
      { name: 'after_event_no', value: params?.afterEventNo, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<Record<string, never>>(appendQueryString(appApiPath(`/runtime/invocations/${serializePathParameter(invocationId, { name: 'invocationId', style: 'simple', explode: false })}/events/stream`), query), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any, sdkworkUnwrapKind: 'data' });
  }
}

export interface RuntimeInvocationsEventsListParams {
  page?: number;
  pageSize?: number;
}

export class RuntimeInvocationsEventsApi {
  private client: HttpClient;
  public readonly stream: RuntimeInvocationsEventsStreamApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.stream = new RuntimeInvocationsEventsStreamApi(client);
  }


/** List runtime events */
  async list(invocationId: string, params?: RuntimeInvocationsEventsListParams, requestOptions?: ApiRequestOptions): Promise<RuntimeEventListResponse> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<RuntimeEventListResponse>(appendQueryString(appApiPath(`/runtime/invocations/${serializePathParameter(invocationId, { name: 'invocationId', style: 'simple', explode: false })}/events`), query), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any, sdkworkUnwrapKind: 'page' });
  }

/** Create runtime event */
  async create(invocationId: string, body: CreateRuntimeEventRequest, requestOptions?: ApiRequestOptions): Promise<RuntimeEventItem> {
    return this.client.request<RuntimeEventItem>(appApiPath(`/runtime/invocations/${serializePathParameter(invocationId, { name: 'invocationId', style: 'simple', explode: false })}/events`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'POST' as any, body, contentType: 'application/json', sdkworkUnwrapKind: 'item' });
  }
}

export class RuntimeInvocationsCompletionsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Complete runtime invocation */
  async create(invocationId: string, body: CompleteRuntimeInvocationRequest, requestOptions?: ApiRequestOptions): Promise<RuntimeInvocationItem> {
    return this.client.request<RuntimeInvocationItem>(appApiPath(`/runtime/invocations/${serializePathParameter(invocationId, { name: 'invocationId', style: 'simple', explode: false })}/completions`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'POST' as any, body, contentType: 'application/json', sdkworkUnwrapKind: 'item' });
  }
}

export interface RuntimeInvocationsArtifactsListParams {
  page?: number;
  pageSize?: number;
}

export class RuntimeInvocationsArtifactsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List runtime artifacts */
  async list(invocationId: string, params?: RuntimeInvocationsArtifactsListParams, requestOptions?: ApiRequestOptions): Promise<RuntimeArtifactListResponse> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<RuntimeArtifactListResponse>(appendQueryString(appApiPath(`/runtime/invocations/${serializePathParameter(invocationId, { name: 'invocationId', style: 'simple', explode: false })}/artifacts`), query), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any, sdkworkUnwrapKind: 'page' });
  }

/** Create runtime artifact */
  async create(invocationId: string, body: CreateRuntimeArtifactRequest, requestOptions?: ApiRequestOptions): Promise<RuntimeArtifactItem> {
    return this.client.request<RuntimeArtifactItem>(appApiPath(`/runtime/invocations/${serializePathParameter(invocationId, { name: 'invocationId', style: 'simple', explode: false })}/artifacts`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'POST' as any, body, contentType: 'application/json', sdkworkUnwrapKind: 'item' });
  }
}

export interface RuntimeInvocationsListParams {
  page?: number;
  pageSize?: number;
  conversationId?: string;
  chatTurnId?: string;
  agentSessionId?: string;
  runtime?: string;
  status?: 'pending' | 'running' | 'streaming' | 'completed' | 'failed' | 'cancelled';
}

export class RuntimeInvocationsApi {
  private client: HttpClient;
  public readonly artifacts: RuntimeInvocationsArtifactsApi;
  public readonly completions: RuntimeInvocationsCompletionsApi;
  public readonly events: RuntimeInvocationsEventsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.artifacts = new RuntimeInvocationsArtifactsApi(client);
    this.completions = new RuntimeInvocationsCompletionsApi(client);
    this.events = new RuntimeInvocationsEventsApi(client);
  }


/** List runtime invocations */
  async list(params?: RuntimeInvocationsListParams, requestOptions?: ApiRequestOptions): Promise<RuntimeInvocationListResponse> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'conversation_id', value: params?.conversationId, style: 'form', explode: true, allowReserved: false },
      { name: 'chat_turn_id', value: params?.chatTurnId, style: 'form', explode: true, allowReserved: false },
      { name: 'agent_session_id', value: params?.agentSessionId, style: 'form', explode: true, allowReserved: false },
      { name: 'runtime', value: params?.runtime, style: 'form', explode: true, allowReserved: false },
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<RuntimeInvocationListResponse>(appendQueryString(appApiPath(`/runtime/invocations`), query), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any, sdkworkUnwrapKind: 'page' });
  }

/** Create runtime invocation */
  async create(body: CreateRuntimeInvocationRequest, requestOptions?: ApiRequestOptions): Promise<RuntimeInvocationItem> {
    return this.client.request<RuntimeInvocationItem>(appApiPath(`/runtime/invocations`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'POST' as any, body, contentType: 'application/json', sdkworkUnwrapKind: 'item' });
  }

/** Retrieve runtime invocation */
  async retrieve(invocationId: string, requestOptions?: ApiRequestOptions): Promise<RuntimeInvocationItem> {
    return this.client.request<RuntimeInvocationItem>(appApiPath(`/runtime/invocations/${serializePathParameter(invocationId, { name: 'invocationId', style: 'simple', explode: false })}`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any, sdkworkUnwrapKind: 'data' });
  }
}

export class RuntimeApi {
  private client: HttpClient;
  public readonly invocations: RuntimeInvocationsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.invocations = new RuntimeInvocationsApi(client);
  }

}

export function createRuntimeApi(client: HttpClient): RuntimeApi {
  return new RuntimeApi(client);
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
