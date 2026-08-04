import { aiApiPath } from './paths';
import type { ApiRequestOptions, HttpClient } from '../http/client';

import type { DeleteResult, OpenAiRun, OpenAiRunList, OpenAiRunStep, OpenAiRunStepList, OpenAiRunSubmitToolOutputsRequest, OpenAiRunUpdateRequest, OpenAiThread, OpenAiThreadAndRunCreateRequest, OpenAiThreadCreateRequest, OpenAiThreadMessage, OpenAiThreadMessageCreateRequest, OpenAiThreadMessageList, OpenAiThreadMessageUpdateRequest, OpenAiThreadUpdateRequest } from '../types';


export interface ThreadsMessagesListParams {
  limit?: number;
  order?: 'asc' | 'desc';
  after?: string;
  before?: string;
}

export class ThreadsMessagesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List thread messages */
  async list(threadId: string, params?: ThreadsMessagesListParams, requestOptions?: ApiRequestOptions): Promise<OpenAiThreadMessageList> {
    const query = buildQueryString([
      { name: 'limit', value: params?.limit, style: 'form', explode: true, allowReserved: false },
      { name: 'order', value: params?.order, style: 'form', explode: true, allowReserved: false },
      { name: 'after', value: params?.after, style: 'form', explode: true, allowReserved: false },
      { name: 'before', value: params?.before, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<OpenAiThreadMessageList>(appendQueryString(aiApiPath(`/threads/${serializePathParameter(threadId, { name: 'thread_id', style: 'simple', explode: false })}/messages`), query), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any });
  }

/** Create thread message */
  async create(threadId: string, body: OpenAiThreadMessageCreateRequest, requestOptions?: ApiRequestOptions): Promise<OpenAiThreadMessage> {
    return this.client.request<OpenAiThreadMessage>(aiApiPath(`/threads/${serializePathParameter(threadId, { name: 'thread_id', style: 'simple', explode: false })}/messages`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'POST' as any, body, contentType: 'application/json' });
  }

/** Delete thread message */
  async delete(threadId: string, messageId: string, requestOptions?: ApiRequestOptions): Promise<DeleteResult> {
    return this.client.request<DeleteResult>(aiApiPath(`/threads/${serializePathParameter(threadId, { name: 'thread_id', style: 'simple', explode: false })}/messages/${serializePathParameter(messageId, { name: 'message_id', style: 'simple', explode: false })}`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'DELETE' as any });
  }

/** Retrieve thread message */
  async retrieve(threadId: string, messageId: string, requestOptions?: ApiRequestOptions): Promise<OpenAiThreadMessage> {
    return this.client.request<OpenAiThreadMessage>(aiApiPath(`/threads/${serializePathParameter(threadId, { name: 'thread_id', style: 'simple', explode: false })}/messages/${serializePathParameter(messageId, { name: 'message_id', style: 'simple', explode: false })}`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any });
  }

/** Modify thread message */
  async update(threadId: string, messageId: string, body: OpenAiThreadMessageUpdateRequest, requestOptions?: ApiRequestOptions): Promise<OpenAiThreadMessage> {
    return this.client.request<OpenAiThreadMessage>(aiApiPath(`/threads/${serializePathParameter(threadId, { name: 'thread_id', style: 'simple', explode: false })}/messages/${serializePathParameter(messageId, { name: 'message_id', style: 'simple', explode: false })}`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'POST' as any, body, contentType: 'application/json' });
  }
}

export interface ThreadsRunsStepsListParams {
  limit?: number;
  order?: 'asc' | 'desc';
  after?: string;
  before?: string;
}

export class ThreadsRunsStepsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List run steps */
  async list(threadId: string, runId: string, params?: ThreadsRunsStepsListParams, requestOptions?: ApiRequestOptions): Promise<OpenAiRunStepList> {
    const query = buildQueryString([
      { name: 'limit', value: params?.limit, style: 'form', explode: true, allowReserved: false },
      { name: 'order', value: params?.order, style: 'form', explode: true, allowReserved: false },
      { name: 'after', value: params?.after, style: 'form', explode: true, allowReserved: false },
      { name: 'before', value: params?.before, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<OpenAiRunStepList>(appendQueryString(aiApiPath(`/threads/${serializePathParameter(threadId, { name: 'thread_id', style: 'simple', explode: false })}/runs/${serializePathParameter(runId, { name: 'run_id', style: 'simple', explode: false })}/steps`), query), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any });
  }

/** Retrieve run step */
  async retrieve(threadId: string, runId: string, stepId: string, requestOptions?: ApiRequestOptions): Promise<OpenAiRunStep> {
    return this.client.request<OpenAiRunStep>(aiApiPath(`/threads/${serializePathParameter(threadId, { name: 'thread_id', style: 'simple', explode: false })}/runs/${serializePathParameter(runId, { name: 'run_id', style: 'simple', explode: false })}/steps/${serializePathParameter(stepId, { name: 'step_id', style: 'simple', explode: false })}`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any });
  }
}

export interface ThreadsRunsListParams {
  limit?: number;
  order?: 'asc' | 'desc';
  after?: string;
  before?: string;
}

export class ThreadsRunsApi {
  private client: HttpClient;
  public readonly steps: ThreadsRunsStepsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.steps = new ThreadsRunsStepsApi(client);
  }


/** Create thread and run */
  async create(body: OpenAiThreadAndRunCreateRequest, requestOptions?: ApiRequestOptions): Promise<OpenAiRun> {
    return this.client.request<OpenAiRun>(aiApiPath(`/threads/runs`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'POST' as any, body, contentType: 'application/json' });
  }

/** List thread runs */
  async list(threadId: string, params?: ThreadsRunsListParams, requestOptions?: ApiRequestOptions): Promise<OpenAiRunList> {
    const query = buildQueryString([
      { name: 'limit', value: params?.limit, style: 'form', explode: true, allowReserved: false },
      { name: 'order', value: params?.order, style: 'form', explode: true, allowReserved: false },
      { name: 'after', value: params?.after, style: 'form', explode: true, allowReserved: false },
      { name: 'before', value: params?.before, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<OpenAiRunList>(appendQueryString(aiApiPath(`/threads/${serializePathParameter(threadId, { name: 'thread_id', style: 'simple', explode: false })}/runs`), query), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any });
  }

/** Retrieve thread run */
  async retrieve(threadId: string, runId: string, requestOptions?: ApiRequestOptions): Promise<OpenAiRun> {
    return this.client.request<OpenAiRun>(aiApiPath(`/threads/${serializePathParameter(threadId, { name: 'thread_id', style: 'simple', explode: false })}/runs/${serializePathParameter(runId, { name: 'run_id', style: 'simple', explode: false })}`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any });
  }

/** Modify thread run */
  async update(threadId: string, runId: string, body: OpenAiRunUpdateRequest, requestOptions?: ApiRequestOptions): Promise<OpenAiRun> {
    return this.client.request<OpenAiRun>(aiApiPath(`/threads/${serializePathParameter(threadId, { name: 'thread_id', style: 'simple', explode: false })}/runs/${serializePathParameter(runId, { name: 'run_id', style: 'simple', explode: false })}`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'POST' as any, body, contentType: 'application/json' });
  }

/** Cancel thread run */
  async cancel(threadId: string, runId: string, requestOptions?: ApiRequestOptions): Promise<OpenAiRun> {
    return this.client.request<OpenAiRun>(aiApiPath(`/threads/${serializePathParameter(threadId, { name: 'thread_id', style: 'simple', explode: false })}/runs/${serializePathParameter(runId, { name: 'run_id', style: 'simple', explode: false })}/cancel`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'POST' as any });
  }

/** Submit run tool outputs */
  async submitToolOutputs(threadId: string, runId: string, body: OpenAiRunSubmitToolOutputsRequest, requestOptions?: ApiRequestOptions): Promise<OpenAiRun> {
    return this.client.request<OpenAiRun>(aiApiPath(`/threads/${serializePathParameter(threadId, { name: 'thread_id', style: 'simple', explode: false })}/runs/${serializePathParameter(runId, { name: 'run_id', style: 'simple', explode: false })}/submit_tool_outputs`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'POST' as any, body, contentType: 'application/json' });
  }
}

export class ThreadsApi {
  private client: HttpClient;
  public readonly runs: ThreadsRunsApi;
  public readonly messages: ThreadsMessagesApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.runs = new ThreadsRunsApi(client);
    this.messages = new ThreadsMessagesApi(client);
  }


/** Create thread */
  async create(body: OpenAiThreadCreateRequest, requestOptions?: ApiRequestOptions): Promise<OpenAiThread> {
    return this.client.request<OpenAiThread>(aiApiPath(`/threads`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'POST' as any, body, contentType: 'application/json' });
  }

/** Delete thread */
  async delete(threadId: string, requestOptions?: ApiRequestOptions): Promise<DeleteResult> {
    return this.client.request<DeleteResult>(aiApiPath(`/threads/${serializePathParameter(threadId, { name: 'thread_id', style: 'simple', explode: false })}`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'DELETE' as any });
  }

/** Retrieve thread */
  async retrieve(threadId: string, requestOptions?: ApiRequestOptions): Promise<OpenAiThread> {
    return this.client.request<OpenAiThread>(aiApiPath(`/threads/${serializePathParameter(threadId, { name: 'thread_id', style: 'simple', explode: false })}`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any });
  }

/** Modify thread */
  async update(threadId: string, body: OpenAiThreadUpdateRequest, requestOptions?: ApiRequestOptions): Promise<OpenAiThread> {
    return this.client.request<OpenAiThread>(aiApiPath(`/threads/${serializePathParameter(threadId, { name: 'thread_id', style: 'simple', explode: false })}`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'POST' as any, body, contentType: 'application/json' });
  }
}

export function createThreadsApi(client: HttpClient): ThreadsApi {
  return new ThreadsApi(client);
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
