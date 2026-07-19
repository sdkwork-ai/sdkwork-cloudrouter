import { appApiPath } from './paths';
import type { HttpClient } from '../http/client';

export class RuntimeInvocationsEventsStreamApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Stream runtime events */
  async list(invocationId: string): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(appApiPath(`/runtime/invocations/${serializePathParameter(invocationId, { name: 'invocationId', style: 'simple', explode: false })}/events/stream`));
  }
}

export class RuntimeInvocationsEventsApi {
  private client: HttpClient;
  public readonly stream: RuntimeInvocationsEventsStreamApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.stream = new RuntimeInvocationsEventsStreamApi(client);
  }


/** List runtime events */
  async list(invocationId: string): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(appApiPath(`/runtime/invocations/${serializePathParameter(invocationId, { name: 'invocationId', style: 'simple', explode: false })}/events`));
  }

/** Create runtime event */
  async create(invocationId: string): Promise<Record<string, never>> {
    return this.client.post<Record<string, never>>(appApiPath(`/runtime/invocations/${serializePathParameter(invocationId, { name: 'invocationId', style: 'simple', explode: false })}/events`));
  }
}

export class RuntimeInvocationsArtifactsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List runtime artifacts */
  async list(invocationId: string): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(appApiPath(`/runtime/invocations/${serializePathParameter(invocationId, { name: 'invocationId', style: 'simple', explode: false })}/artifacts`));
  }

/** Create runtime artifact */
  async create(invocationId: string): Promise<Record<string, never>> {
    return this.client.post<Record<string, never>>(appApiPath(`/runtime/invocations/${serializePathParameter(invocationId, { name: 'invocationId', style: 'simple', explode: false })}/artifacts`));
  }
}

export class RuntimeInvocationsApi {
  private client: HttpClient;
  public readonly artifacts: RuntimeInvocationsArtifactsApi;
  public readonly events: RuntimeInvocationsEventsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.artifacts = new RuntimeInvocationsArtifactsApi(client);
    this.events = new RuntimeInvocationsEventsApi(client);
  }


/** List runtime invocations */
  async list(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(appApiPath(`/runtime/invocations`));
  }

/** Create runtime invocation */
  async create(): Promise<Record<string, never>> {
    return this.client.post<Record<string, never>>(appApiPath(`/runtime/invocations`));
  }

/** Retrieve runtime invocation */
  async retrieve(invocationId: string): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(appApiPath(`/runtime/invocations/${serializePathParameter(invocationId, { name: 'invocationId', style: 'simple', explode: false })}`));
  }

/** Complete runtime invocation */
  async complete(invocationId: string): Promise<Record<string, never>> {
    return this.client.post<Record<string, never>>(appApiPath(`/runtime/invocations/${serializePathParameter(invocationId, { name: 'invocationId', style: 'simple', explode: false })}/complete`));
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
