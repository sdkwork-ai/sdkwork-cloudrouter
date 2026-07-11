import { aiApiPath } from './paths';
import type { HttpClient } from '../http/client';

import type { DeleteResult, OpenAiFineTuningCheckpointPermission, OpenAiFineTuningCheckpointPermissionCreateRequest, OpenAiFineTuningCheckpointPermissionList, OpenAiFineTuningGraderRunRequest, OpenAiFineTuningGraderRunResult, OpenAiFineTuningGraderValidateRequest, OpenAiFineTuningGraderValidationResult, OpenAiFineTuningJob, OpenAiFineTuningJobCheckpointList, OpenAiFineTuningJobCreateRequest, OpenAiFineTuningJobEventList, OpenAiFineTuningJobList } from '../types';


export interface FineTuningJobsCheckpointsListParams {
  limit?: number;
  order?: 'asc' | 'desc';
  after?: string;
  before?: string;
}

export class FineTuningJobsCheckpointsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List fine-tuning checkpoints */
  async list(fineTuningJobId: string, params?: FineTuningJobsCheckpointsListParams): Promise<OpenAiFineTuningJobCheckpointList> {
    const query = buildQueryString([
      { name: 'page_size', value: params?.limit, style: 'form', explode: true, allowReserved: false },
      { name: 'order', value: params?.order, style: 'form', explode: true, allowReserved: false },
      { name: 'after', value: params?.after, style: 'form', explode: true, allowReserved: false },
      { name: 'before', value: params?.before, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<OpenAiFineTuningJobCheckpointList>(appendQueryString(aiApiPath(`/fine_tuning/jobs/${serializePathParameter(fineTuningJobId, { name: 'fine_tuning_job_id', style: 'simple', explode: false })}/checkpoints`), query));
  }
}

export interface FineTuningJobsListParams {
  limit?: number;
  order?: 'asc' | 'desc';
  after?: string;
  before?: string;
}

export interface FineTuningJobsListEventsParams {
  limit?: number;
  order?: 'asc' | 'desc';
  after?: string;
  before?: string;
}

export class FineTuningJobsApi {
  private client: HttpClient;
  public readonly checkpoints: FineTuningJobsCheckpointsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.checkpoints = new FineTuningJobsCheckpointsApi(client);
  }


/** List fine-tuning jobs */
  async list(params?: FineTuningJobsListParams): Promise<OpenAiFineTuningJobList> {
    const query = buildQueryString([
      { name: 'page_size', value: params?.limit, style: 'form', explode: true, allowReserved: false },
      { name: 'order', value: params?.order, style: 'form', explode: true, allowReserved: false },
      { name: 'after', value: params?.after, style: 'form', explode: true, allowReserved: false },
      { name: 'before', value: params?.before, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<OpenAiFineTuningJobList>(appendQueryString(aiApiPath(`/fine_tuning/jobs`), query));
  }

/** Create fine-tuning job */
  async create(body: OpenAiFineTuningJobCreateRequest): Promise<OpenAiFineTuningJob> {
    return this.client.post<OpenAiFineTuningJob>(aiApiPath(`/fine_tuning/jobs`), body, undefined, undefined, 'application/json');
  }

/** Retrieve fine-tuning job */
  async retrieve(fineTuningJobId: string): Promise<OpenAiFineTuningJob> {
    return this.client.get<OpenAiFineTuningJob>(aiApiPath(`/fine_tuning/jobs/${serializePathParameter(fineTuningJobId, { name: 'fine_tuning_job_id', style: 'simple', explode: false })}`));
  }

/** Cancel fine-tuning job */
  async cancel(fineTuningJobId: string): Promise<OpenAiFineTuningJob> {
    return this.client.post<OpenAiFineTuningJob>(aiApiPath(`/fine_tuning/jobs/${serializePathParameter(fineTuningJobId, { name: 'fine_tuning_job_id', style: 'simple', explode: false })}/cancel`));
  }

/** List fine-tuning events */
  async listEvents(fineTuningJobId: string, params?: FineTuningJobsListEventsParams): Promise<OpenAiFineTuningJobEventList> {
    const query = buildQueryString([
      { name: 'page_size', value: params?.limit, style: 'form', explode: true, allowReserved: false },
      { name: 'order', value: params?.order, style: 'form', explode: true, allowReserved: false },
      { name: 'after', value: params?.after, style: 'form', explode: true, allowReserved: false },
      { name: 'before', value: params?.before, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<OpenAiFineTuningJobEventList>(appendQueryString(aiApiPath(`/fine_tuning/jobs/${serializePathParameter(fineTuningJobId, { name: 'fine_tuning_job_id', style: 'simple', explode: false })}/events`), query));
  }

/** Pause fine-tuning job */
  async pause(fineTuningJobId: string): Promise<OpenAiFineTuningJob> {
    return this.client.post<OpenAiFineTuningJob>(aiApiPath(`/fine_tuning/jobs/${serializePathParameter(fineTuningJobId, { name: 'fine_tuning_job_id', style: 'simple', explode: false })}/pause`));
  }

/** Resume fine-tuning job */
  async resume(fineTuningJobId: string): Promise<OpenAiFineTuningJob> {
    return this.client.post<OpenAiFineTuningJob>(aiApiPath(`/fine_tuning/jobs/${serializePathParameter(fineTuningJobId, { name: 'fine_tuning_job_id', style: 'simple', explode: false })}/resume`));
  }
}

export interface FineTuningCheckpointsPermissionsRetrieveParams {
  limit?: number;
  order?: 'asc' | 'desc';
  after?: string;
  before?: string;
  projectId?: string;
}

export class FineTuningCheckpointsPermissionsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List fine-tuning checkpoint permissions */
  async retrieve(fineTunedModelCheckpoint: string, params?: FineTuningCheckpointsPermissionsRetrieveParams): Promise<OpenAiFineTuningCheckpointPermissionList> {
    const query = buildQueryString([
      { name: 'page_size', value: params?.limit, style: 'form', explode: true, allowReserved: false },
      { name: 'order', value: params?.order, style: 'form', explode: true, allowReserved: false },
      { name: 'after', value: params?.after, style: 'form', explode: true, allowReserved: false },
      { name: 'before', value: params?.before, style: 'form', explode: true, allowReserved: false },
      { name: 'project_id', value: params?.projectId, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<OpenAiFineTuningCheckpointPermissionList>(appendQueryString(aiApiPath(`/fine_tuning/checkpoints/${serializePathParameter(fineTunedModelCheckpoint, { name: 'fine_tuned_model_checkpoint', style: 'simple', explode: false })}/permissions`), query));
  }

/** Create fine-tuning checkpoint permission */
  async create(fineTunedModelCheckpoint: string, body: OpenAiFineTuningCheckpointPermissionCreateRequest): Promise<OpenAiFineTuningCheckpointPermission> {
    return this.client.post<OpenAiFineTuningCheckpointPermission>(aiApiPath(`/fine_tuning/checkpoints/${serializePathParameter(fineTunedModelCheckpoint, { name: 'fine_tuned_model_checkpoint', style: 'simple', explode: false })}/permissions`), body, undefined, undefined, 'application/json');
  }

/** Delete fine-tuning checkpoint permission */
  async delete(fineTunedModelCheckpoint: string, permissionId: string): Promise<DeleteResult> {
    return this.client.delete<DeleteResult>(aiApiPath(`/fine_tuning/checkpoints/${serializePathParameter(fineTunedModelCheckpoint, { name: 'fine_tuned_model_checkpoint', style: 'simple', explode: false })}/permissions/${serializePathParameter(permissionId, { name: 'permission_id', style: 'simple', explode: false })}`));
  }
}

export class FineTuningCheckpointsApi {
  private client: HttpClient;
  public readonly permissions: FineTuningCheckpointsPermissionsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.permissions = new FineTuningCheckpointsPermissionsApi(client);
  }

}

export class FineTuningAlphaGradersValidateApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Validate fine-tuning grader */
  async create(body: OpenAiFineTuningGraderValidateRequest): Promise<OpenAiFineTuningGraderValidationResult> {
    return this.client.post<OpenAiFineTuningGraderValidationResult>(aiApiPath(`/fine_tuning/alpha/graders/validate`), body, undefined, undefined, 'application/json');
  }
}

export class FineTuningAlphaGradersRunApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Run fine-tuning grader */
  async create(body: OpenAiFineTuningGraderRunRequest): Promise<OpenAiFineTuningGraderRunResult> {
    return this.client.post<OpenAiFineTuningGraderRunResult>(aiApiPath(`/fine_tuning/alpha/graders/run`), body, undefined, undefined, 'application/json');
  }
}

export class FineTuningAlphaGradersApi {
  private client: HttpClient;
  public readonly run: FineTuningAlphaGradersRunApi;
  public readonly validate: FineTuningAlphaGradersValidateApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.run = new FineTuningAlphaGradersRunApi(client);
    this.validate = new FineTuningAlphaGradersValidateApi(client);
  }

}

export class FineTuningAlphaApi {
  private client: HttpClient;
  public readonly graders: FineTuningAlphaGradersApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.graders = new FineTuningAlphaGradersApi(client);
  }

}

export class FineTuningApi {
  private client: HttpClient;
  public readonly alpha: FineTuningAlphaApi;
  public readonly checkpoints: FineTuningCheckpointsApi;
  public readonly jobs: FineTuningJobsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.alpha = new FineTuningAlphaApi(client);
    this.checkpoints = new FineTuningCheckpointsApi(client);
    this.jobs = new FineTuningJobsApi(client);
  }

}

export function createFineTuningApi(client: HttpClient): FineTuningApi {
  return new FineTuningApi(client);
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
