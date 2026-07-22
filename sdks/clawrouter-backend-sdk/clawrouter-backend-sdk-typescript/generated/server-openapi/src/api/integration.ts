import { backendApiPath } from './paths';
import type { HttpClient } from '../http/client';

import type { AdminChannelCreateRequest, AdminChannelItem, AdminChannelPage, AdminChannelUpdateRequest, AdminChannelVerifyResult, AdminProviderSecretCreateRequest, AdminProviderSecretItem, AdminProviderSecretPage, AdminProviderSecretUpdateRequest } from '../types';


export class IntegrationProviderSecretsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List provider secrets */
  async list(): Promise<AdminProviderSecretPage> {
    return this.client.get<AdminProviderSecretPage>(backendApiPath(`/integration/provider_secrets`));
  }

/** Create provider secret */
  async create(body: AdminProviderSecretCreateRequest): Promise<AdminProviderSecretItem> {
    return this.client.post<AdminProviderSecretItem>(backendApiPath(`/integration/provider_secrets`), body, undefined, undefined, 'application/json');
  }

/** Update provider secret */
  async update(body: AdminProviderSecretUpdateRequest): Promise<AdminProviderSecretItem> {
    return this.client.put<AdminProviderSecretItem>(backendApiPath(`/integration/provider_secrets`), body, undefined, undefined, 'application/json');
  }

/** Delete provider secret */
  async delete(secretId: string): Promise<void> {
    return this.client.delete<void>(backendApiPath(`/integration/provider_secrets/${serializePathParameter(secretId, { name: 'secretId', style: 'simple', explode: false })}`));
  }
}

export class IntegrationChannelsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List channels */
  async list(): Promise<AdminChannelPage> {
    return this.client.get<AdminChannelPage>(backendApiPath(`/integration/channels`));
  }

/** Create channel */
  async create(body: AdminChannelCreateRequest): Promise<AdminChannelItem> {
    return this.client.post<AdminChannelItem>(backendApiPath(`/integration/channels`), body, undefined, undefined, 'application/json');
  }

/** Update channel */
  async update(body: AdminChannelUpdateRequest): Promise<AdminChannelItem> {
    return this.client.put<AdminChannelItem>(backendApiPath(`/integration/channels`), body, undefined, undefined, 'application/json');
  }

/** Delete channel */
  async delete(channelId: string): Promise<void> {
    return this.client.delete<void>(backendApiPath(`/integration/channels/${serializePathParameter(channelId, { name: 'channelId', style: 'simple', explode: false })}`));
  }

/** Test channel */
  async verify(channelId: string): Promise<AdminChannelVerifyResult> {
    return this.client.post<AdminChannelVerifyResult>(backendApiPath(`/integration/channels/${serializePathParameter(channelId, { name: 'channelId', style: 'simple', explode: false })}/verify`));
  }
}

export class IntegrationApi {

  public readonly channels: IntegrationChannelsApi;
  public readonly providerSecrets: IntegrationProviderSecretsApi;

  constructor(client: HttpClient) {

    this.channels = new IntegrationChannelsApi(client);
    this.providerSecrets = new IntegrationProviderSecretsApi(client);
  }

}

export function createIntegrationApi(client: HttpClient): IntegrationApi {
  return new IntegrationApi(client);
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
