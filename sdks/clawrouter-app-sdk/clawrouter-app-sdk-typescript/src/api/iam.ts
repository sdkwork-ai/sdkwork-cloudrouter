import { appApiPath } from './paths';
import type { HttpClient } from '../http/client';

export class IamUsersSettingsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List settings */
  async retrieve(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(appApiPath(`/iam/users/settings`));
  }

/** Update settings */
  async update(): Promise<Record<string, never>> {
    return this.client.put<Record<string, never>>(appApiPath(`/iam/users/settings`));
  }
}

export class IamUsersApi {

  public readonly settings: IamUsersSettingsApi;

  constructor(client: HttpClient) {

    this.settings = new IamUsersSettingsApi(client);
  }

}

export class IamApiKeysApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List keys */
  async list(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(appApiPath(`/iam/api_keys`));
  }

/** Create key */
  async create(): Promise<Record<string, never>> {
    return this.client.post<Record<string, never>>(appApiPath(`/iam/api_keys`));
  }

/** Delete key */
  async delete(apiKeyId: string): Promise<void> {
    return this.client.delete<void>(appApiPath(`/iam/api_keys/${serializePathParameter(apiKeyId, { name: 'apiKeyId', style: 'simple', explode: false })}`));
  }

/** Update key */
  async update(apiKeyId: string): Promise<Record<string, never>> {
    return this.client.patch<Record<string, never>>(appApiPath(`/iam/api_keys/${serializePathParameter(apiKeyId, { name: 'apiKeyId', style: 'simple', explode: false })}`));
  }
}

export class IamApi {

  public readonly apiKeys: IamApiKeysApi;
  public readonly users: IamUsersApi;

  constructor(client: HttpClient) {

    this.apiKeys = new IamApiKeysApi(client);
    this.users = new IamUsersApi(client);
  }

}

export function createIamApi(client: HttpClient): IamApi {
  return new IamApi(client);
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
