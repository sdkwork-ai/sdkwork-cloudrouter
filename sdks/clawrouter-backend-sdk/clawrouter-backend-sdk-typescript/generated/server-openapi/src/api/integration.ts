import { backendApiPath } from './paths';
import type { HttpClient } from '../http/client';

import type { ChannelsCreateResult, ChannelsUpdateResult, ChannelsVerifyResult, ProviderSecretsCreateResult, ProviderSecretsUpdateResult, SdkWorkCommandData, SdkWorkPageData } from '../types';


export class IntegrationProviderSecretsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(backendApiPath(`/integration/provider_secrets`));
  }

/** Create */
  async create(): Promise<ProviderSecretsCreateResult> {
    return this.client.post<ProviderSecretsCreateResult>(backendApiPath(`/integration/provider_secrets`));
  }

/** Update */
  async update(): Promise<ProviderSecretsUpdateResult> {
    return this.client.put<ProviderSecretsUpdateResult>(backendApiPath(`/integration/provider_secrets`));
  }

/** Delete */
  async delete(secretId: string): Promise<SdkWorkCommandData> {
    return this.client.delete<SdkWorkCommandData>(backendApiPath(`/integration/provider_secrets/${serializePathParameter(secretId, { name: 'secretId', style: 'simple', explode: false })}`));
  }
}

export class IntegrationChannelsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(backendApiPath(`/integration/channels`));
  }

/** Create */
  async create(): Promise<ChannelsCreateResult> {
    return this.client.post<ChannelsCreateResult>(backendApiPath(`/integration/channels`));
  }

/** Update */
  async update(): Promise<ChannelsUpdateResult> {
    return this.client.put<ChannelsUpdateResult>(backendApiPath(`/integration/channels`));
  }

/** Delete */
  async delete(channelId: string): Promise<SdkWorkCommandData> {
    return this.client.delete<SdkWorkCommandData>(backendApiPath(`/integration/channels/${serializePathParameter(channelId, { name: 'channelId', style: 'simple', explode: false })}`));
  }

/** Verify */
  async verify(channelId: string): Promise<ChannelsVerifyResult> {
    return this.client.post<ChannelsVerifyResult>(backendApiPath(`/integration/channels/${serializePathParameter(channelId, { name: 'channelId', style: 'simple', explode: false })}/verify`));
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
