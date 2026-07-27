import { backendApiPath } from './paths';
import type { ApiRequestOptions, HttpClient } from '../http/client';

import type { AdminChannelCreateRequest, AdminChannelItem, AdminChannelPage, AdminChannelUpdateRequest, AdminProviderSecretCreateRequest, AdminProviderSecretItem, AdminProviderSecretPage, AdminProviderSecretUpdateRequest } from '../types';


export class IntegrationProviderSecretsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List provider secrets */
  async list(requestOptions?: ApiRequestOptions): Promise<AdminProviderSecretPage> {
    return this.client.request<AdminProviderSecretPage>(backendApiPath(`/integration/provider_secrets`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any });
  }

/** Create provider secret */
  async create(body: AdminProviderSecretCreateRequest, requestOptions?: ApiRequestOptions): Promise<AdminProviderSecretItem> {
    return this.client.request<AdminProviderSecretItem>(backendApiPath(`/integration/provider_secrets`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'POST' as any, body, contentType: 'application/json' });
  }

/** Update provider secret */
  async update(body: AdminProviderSecretUpdateRequest, requestOptions?: ApiRequestOptions): Promise<AdminProviderSecretItem> {
    return this.client.request<AdminProviderSecretItem>(backendApiPath(`/integration/provider_secrets`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'PUT' as any, body, contentType: 'application/json' });
  }

/** Delete provider secret */
  async delete(secretId: string, requestOptions?: ApiRequestOptions): Promise<void> {
    return this.client.request<void>(backendApiPath(`/integration/provider_secrets/${serializePathParameter(secretId, { name: 'secretId', style: 'simple', explode: false })}`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'DELETE' as any });
  }
}

export class IntegrationChannelsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List channels */
  async list(requestOptions?: ApiRequestOptions): Promise<AdminChannelPage> {
    return this.client.request<AdminChannelPage>(backendApiPath(`/integration/channels`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any });
  }

/** Create channel */
  async create(body: AdminChannelCreateRequest, requestOptions?: ApiRequestOptions): Promise<AdminChannelItem> {
    return this.client.request<AdminChannelItem>(backendApiPath(`/integration/channels`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'POST' as any, body, contentType: 'application/json' });
  }

/** Update channel */
  async update(body: AdminChannelUpdateRequest, requestOptions?: ApiRequestOptions): Promise<AdminChannelItem> {
    return this.client.request<AdminChannelItem>(backendApiPath(`/integration/channels`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'PUT' as any, body, contentType: 'application/json' });
  }

/** Delete channel */
  async delete(channelId: string, requestOptions?: ApiRequestOptions): Promise<void> {
    return this.client.request<void>(backendApiPath(`/integration/channels/${serializePathParameter(channelId, { name: 'channelId', style: 'simple', explode: false })}`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'DELETE' as any });
  }

/** Test channel */
  async verify(channelId: string, requestOptions?: ApiRequestOptions): Promise<Record<string, unknown>> {
    return this.client.request<Record<string, unknown>>(backendApiPath(`/integration/channels/${serializePathParameter(channelId, { name: 'channelId', style: 'simple', explode: false })}/verify`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'POST' as any });
  }
}

export class IntegrationApi {
  private client: HttpClient;
  public readonly channels: IntegrationChannelsApi;
  public readonly providerSecrets: IntegrationProviderSecretsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.channels = new IntegrationChannelsApi(client);
    this.providerSecrets = new IntegrationProviderSecretsApi(client);
  }

}

export function createIntegrationApi(client: HttpClient): IntegrationApi {
  return new IntegrationApi(client);
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
