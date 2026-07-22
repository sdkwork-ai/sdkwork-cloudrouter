import { appApiPath } from './paths';
import type { HttpClient } from '../http/client';

export class MemorySpacesEntriesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List memory entries */
  async list(spaceId: string): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(appApiPath(`/memory/spaces/${serializePathParameter(spaceId, { name: 'spaceId', style: 'simple', explode: false })}/entries`));
  }

/** Create memory entry */
  async create(spaceId: string): Promise<Record<string, never>> {
    return this.client.post<Record<string, never>>(appApiPath(`/memory/spaces/${serializePathParameter(spaceId, { name: 'spaceId', style: 'simple', explode: false })}/entries`));
  }
}

export class MemorySpacesApi {
  private client: HttpClient;
  public readonly entries: MemorySpacesEntriesApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.entries = new MemorySpacesEntriesApi(client);
  }


/** List memory spaces */
  async list(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(appApiPath(`/memory/spaces`));
  }

/** Create memory space */
  async create(): Promise<Record<string, never>> {
    return this.client.post<Record<string, never>>(appApiPath(`/memory/spaces`));
  }

/** Retrieve memory space */
  async retrieve(spaceId: string): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(appApiPath(`/memory/spaces/${serializePathParameter(spaceId, { name: 'spaceId', style: 'simple', explode: false })}`));
  }
}

export class MemoryEntriesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve memory entry */
  async retrieve(entryId: string): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(appApiPath(`/memory/entries/${serializePathParameter(entryId, { name: 'entryId', style: 'simple', explode: false })}`));
  }
}

export class MemoryApi {

  public readonly entries: MemoryEntriesApi;
  public readonly spaces: MemorySpacesApi;

  constructor(client: HttpClient) {

    this.entries = new MemoryEntriesApi(client);
    this.spaces = new MemorySpacesApi(client);
  }

}

export function createMemoryApi(client: HttpClient): MemoryApi {
  return new MemoryApi(client);
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
