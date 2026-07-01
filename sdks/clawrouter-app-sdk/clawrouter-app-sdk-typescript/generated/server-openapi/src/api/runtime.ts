import { appApiPath } from './paths';
import type { HttpClient } from '../http/client';

import type { ArtifactsCreateResult, InvocationEventsCreateResult, InvocationsCreateResult, InvocationsRetrieveResult, InvocationsSubmitResult, SdkWorkPageData } from '../types';


export class RuntimeInvocationEventStreamsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(invocationId: string): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(appApiPath(`/runtime/invocations/${serializePathParameter(invocationId, { name: 'invocationId', style: 'simple', explode: false })}/events/stream`));
  }
}

export class RuntimeInvocationEventsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(invocationId: string): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(appApiPath(`/runtime/invocations/${serializePathParameter(invocationId, { name: 'invocationId', style: 'simple', explode: false })}/events`));
  }

/** Create */
  async create(invocationId: string): Promise<InvocationEventsCreateResult> {
    return this.client.post<InvocationEventsCreateResult>(appApiPath(`/runtime/invocations/${serializePathParameter(invocationId, { name: 'invocationId', style: 'simple', explode: false })}/events`));
  }
}

export class RuntimeArtifactsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(invocationId: string): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(appApiPath(`/runtime/invocations/${serializePathParameter(invocationId, { name: 'invocationId', style: 'simple', explode: false })}/artifacts`));
  }

/** Create */
  async create(invocationId: string): Promise<ArtifactsCreateResult> {
    return this.client.post<ArtifactsCreateResult>(appApiPath(`/runtime/invocations/${serializePathParameter(invocationId, { name: 'invocationId', style: 'simple', explode: false })}/artifacts`));
  }
}

export class RuntimeInvocationsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(appApiPath(`/runtime/invocations`));
  }

/** Create */
  async create(): Promise<InvocationsCreateResult> {
    return this.client.post<InvocationsCreateResult>(appApiPath(`/runtime/invocations`));
  }

/** Retrieve */
  async retrieve(invocationId: string): Promise<InvocationsRetrieveResult> {
    return this.client.get<InvocationsRetrieveResult>(appApiPath(`/runtime/invocations/${serializePathParameter(invocationId, { name: 'invocationId', style: 'simple', explode: false })}`));
  }

/** Create */
  async submit(invocationId: string): Promise<InvocationsSubmitResult> {
    return this.client.post<InvocationsSubmitResult>(appApiPath(`/runtime/invocations/${serializePathParameter(invocationId, { name: 'invocationId', style: 'simple', explode: false })}/complete`));
  }
}

export class RuntimeApi {
  private client: HttpClient;
  public readonly invocations: RuntimeInvocationsApi;
  public readonly artifacts: RuntimeArtifactsApi;
  public readonly invocationEvents: RuntimeInvocationEventsApi;
  public readonly invocationEventStreams: RuntimeInvocationEventStreamsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.invocations = new RuntimeInvocationsApi(client);
    this.artifacts = new RuntimeArtifactsApi(client);
    this.invocationEvents = new RuntimeInvocationEventsApi(client);
    this.invocationEventStreams = new RuntimeInvocationEventStreamsApi(client);
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
