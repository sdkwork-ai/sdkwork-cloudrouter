import { aiApiPath } from './paths';
import type { HttpClient } from '../http/client';

import type { DeleteResult, OpenAiEval, OpenAiEvalCreateRequest, OpenAiEvalList, OpenAiEvalRun, OpenAiEvalRunCreateRequest, OpenAiEvalRunList, OpenAiEvalRunOutputItem, OpenAiEvalRunOutputItemList, OpenAiEvalUpdateRequest } from '../types';


export interface EvalRunsOutputItemsListParams {
  limit?: number;
  order?: 'asc' | 'desc';
  after?: string;
  before?: string;
}

export class EvalRunsOutputItemsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List eval run output items */
  async list(evalId: string, runId: string, params?: EvalRunsOutputItemsListParams): Promise<OpenAiEvalRunOutputItemList> {
    const query = buildQueryString([
      { name: 'limit', value: params?.limit, style: 'form', explode: true, allowReserved: false },
      { name: 'order', value: params?.order, style: 'form', explode: true, allowReserved: false },
      { name: 'after', value: params?.after, style: 'form', explode: true, allowReserved: false },
      { name: 'before', value: params?.before, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<OpenAiEvalRunOutputItemList>(appendQueryString(aiApiPath(`/evals/${serializePathParameter(evalId, { name: 'eval_id', style: 'simple', explode: false })}/runs/${serializePathParameter(runId, { name: 'run_id', style: 'simple', explode: false })}/output_items`), query));
  }

/** Retrieve eval run output item */
  async retrieve(evalId: string, runId: string, outputItemId: string): Promise<OpenAiEvalRunOutputItem> {
    return this.client.get<OpenAiEvalRunOutputItem>(aiApiPath(`/evals/${serializePathParameter(evalId, { name: 'eval_id', style: 'simple', explode: false })}/runs/${serializePathParameter(runId, { name: 'run_id', style: 'simple', explode: false })}/output_items/${serializePathParameter(outputItemId, { name: 'output_item_id', style: 'simple', explode: false })}`));
  }
}

export interface EvalRunsListParams {
  limit?: number;
  order?: 'asc' | 'desc';
  after?: string;
  before?: string;
}

export class EvalRunsApi {
  private client: HttpClient;
  public readonly outputItems: EvalRunsOutputItemsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.outputItems = new EvalRunsOutputItemsApi(client);
  }


/** List eval runs */
  async list(evalId: string, params?: EvalRunsListParams): Promise<OpenAiEvalRunList> {
    const query = buildQueryString([
      { name: 'limit', value: params?.limit, style: 'form', explode: true, allowReserved: false },
      { name: 'order', value: params?.order, style: 'form', explode: true, allowReserved: false },
      { name: 'after', value: params?.after, style: 'form', explode: true, allowReserved: false },
      { name: 'before', value: params?.before, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<OpenAiEvalRunList>(appendQueryString(aiApiPath(`/evals/${serializePathParameter(evalId, { name: 'eval_id', style: 'simple', explode: false })}/runs`), query));
  }

/** Create eval run */
  async create(evalId: string, body: OpenAiEvalRunCreateRequest): Promise<OpenAiEvalRun> {
    return this.client.post<OpenAiEvalRun>(aiApiPath(`/evals/${serializePathParameter(evalId, { name: 'eval_id', style: 'simple', explode: false })}/runs`), body, undefined, undefined, 'application/json');
  }

/** Delete eval run */
  async delete(evalId: string, runId: string): Promise<DeleteResult> {
    return this.client.delete<DeleteResult>(aiApiPath(`/evals/${serializePathParameter(evalId, { name: 'eval_id', style: 'simple', explode: false })}/runs/${serializePathParameter(runId, { name: 'run_id', style: 'simple', explode: false })}`));
  }

/** Retrieve eval run */
  async retrieve(evalId: string, runId: string): Promise<OpenAiEvalRun> {
    return this.client.get<OpenAiEvalRun>(aiApiPath(`/evals/${serializePathParameter(evalId, { name: 'eval_id', style: 'simple', explode: false })}/runs/${serializePathParameter(runId, { name: 'run_id', style: 'simple', explode: false })}`));
  }

/** Cancel eval run */
  async update(evalId: string, runId: string): Promise<OpenAiEvalRun> {
    return this.client.post<OpenAiEvalRun>(aiApiPath(`/evals/${serializePathParameter(evalId, { name: 'eval_id', style: 'simple', explode: false })}/runs/${serializePathParameter(runId, { name: 'run_id', style: 'simple', explode: false })}`));
  }
}

export interface EvalListParams {
  limit?: number;
  order?: 'asc' | 'desc';
  after?: string;
  before?: string;
}

export class EvalApi {
  private client: HttpClient;
  public readonly runs: EvalRunsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.runs = new EvalRunsApi(client);
  }


/** List evals */
  async list(params?: EvalListParams): Promise<OpenAiEvalList> {
    const query = buildQueryString([
      { name: 'limit', value: params?.limit, style: 'form', explode: true, allowReserved: false },
      { name: 'order', value: params?.order, style: 'form', explode: true, allowReserved: false },
      { name: 'after', value: params?.after, style: 'form', explode: true, allowReserved: false },
      { name: 'before', value: params?.before, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<OpenAiEvalList>(appendQueryString(aiApiPath(`/evals`), query));
  }

/** Create eval */
  async create(body: OpenAiEvalCreateRequest): Promise<OpenAiEval> {
    return this.client.post<OpenAiEval>(aiApiPath(`/evals`), body, undefined, undefined, 'application/json');
  }

/** Delete eval */
  async delete(evalId: string): Promise<DeleteResult> {
    return this.client.delete<DeleteResult>(aiApiPath(`/evals/${serializePathParameter(evalId, { name: 'eval_id', style: 'simple', explode: false })}`));
  }

/** Retrieve eval */
  async retrieve(evalId: string): Promise<OpenAiEval> {
    return this.client.get<OpenAiEval>(aiApiPath(`/evals/${serializePathParameter(evalId, { name: 'eval_id', style: 'simple', explode: false })}`));
  }

/** Modify eval */
  async update(evalId: string, body: OpenAiEvalUpdateRequest): Promise<OpenAiEval> {
    return this.client.post<OpenAiEval>(aiApiPath(`/evals/${serializePathParameter(evalId, { name: 'eval_id', style: 'simple', explode: false })}`), body, undefined, undefined, 'application/json');
  }
}

export function createEvalApi(client: HttpClient): EvalApi {
  return new EvalApi(client);
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
