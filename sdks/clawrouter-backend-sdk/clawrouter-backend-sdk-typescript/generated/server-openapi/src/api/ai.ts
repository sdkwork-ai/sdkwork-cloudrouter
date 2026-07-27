import { backendApiPath } from './paths';
import type { ApiRequestOptions, HttpClient } from '../http/client';
import type { AdminChannelBindingPage, AdminChannelBindingReplaceRequest, AdminChannelGroupCreateRequest, AdminChannelGroupItem, AdminChannelGroupPage, AdminChannelGroupUpdateRequest } from '../types';
export class AiRouteExplainApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List runtime route explain */
  async explain(requestOptions?: ApiRequestOptions): Promise<Record<string, never>> {
    return this.client.request<Record<string, never>>(backendApiPath(`/ai/route_explain`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'POST' as any });
  }
}

export class AiModelMappingOptionsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List model options catalog */
  async list(requestOptions?: ApiRequestOptions): Promise<Record<string, never>> {
    return this.client.request<Record<string, never>>(backendApiPath(`/ai/model_mapping_options`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any });
  }
}

export class AiChannelGroupsRouteExplainApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List group route explain */
  async list(channelGroupId: string, requestOptions?: ApiRequestOptions): Promise<Record<string, never>> {
    return this.client.request<Record<string, never>>(backendApiPath(`/ai/channel_groups/${serializePathParameter(channelGroupId, { name: 'channelGroupId', style: 'simple', explode: false })}/route_explain`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any });
  }
}

export class AiChannelGroupsChannelBindingsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List group channel bindings */
  async list(channelGroupId: string, requestOptions?: ApiRequestOptions): Promise<AdminChannelBindingPage> {
    return this.client.request<AdminChannelBindingPage>(backendApiPath(`/ai/channel_groups/${serializePathParameter(channelGroupId, { name: 'channelGroupId', style: 'simple', explode: false })}/channel_bindings`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any });
  }

/** Replace group channel bindings */
  async update(channelGroupId: string, body: AdminChannelBindingReplaceRequest, requestOptions?: ApiRequestOptions): Promise<AdminChannelBindingPage> {
    return this.client.request<AdminChannelBindingPage>(backendApiPath(`/ai/channel_groups/${serializePathParameter(channelGroupId, { name: 'channelGroupId', style: 'simple', explode: false })}/channel_bindings`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'PUT' as any, body, contentType: 'application/json' });
  }
}

export class AiChannelGroupsApi {
  private client: HttpClient;
  public readonly channelBindings: AiChannelGroupsChannelBindingsApi;
  public readonly routeExplain: AiChannelGroupsRouteExplainApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.channelBindings = new AiChannelGroupsChannelBindingsApi(client);
    this.routeExplain = new AiChannelGroupsRouteExplainApi(client);
  }


/** List groups */
  async list(requestOptions?: ApiRequestOptions): Promise<AdminChannelGroupPage> {
    return this.client.request<AdminChannelGroupPage>(backendApiPath(`/ai/channel_groups`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any });
  }

/** Create group */
  async create(body: AdminChannelGroupCreateRequest, requestOptions?: ApiRequestOptions): Promise<AdminChannelGroupItem> {
    return this.client.request<AdminChannelGroupItem>(backendApiPath(`/ai/channel_groups`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'POST' as any, body, contentType: 'application/json' });
  }

/** Delete group */
  async delete(channelGroupId: string, requestOptions?: ApiRequestOptions): Promise<void> {
    return this.client.request<void>(backendApiPath(`/ai/channel_groups/${serializePathParameter(channelGroupId, { name: 'channelGroupId', style: 'simple', explode: false })}`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'DELETE' as any });
  }

/** Update group */
  async update(channelGroupId: string, body: AdminChannelGroupUpdateRequest, requestOptions?: ApiRequestOptions): Promise<AdminChannelGroupItem> {
    return this.client.request<AdminChannelGroupItem>(backendApiPath(`/ai/channel_groups/${serializePathParameter(channelGroupId, { name: 'channelGroupId', style: 'simple', explode: false })}`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'PATCH' as any, body, contentType: 'application/json' });
  }
}

export class AiApi {
  private client: HttpClient;
  public readonly channelGroups: AiChannelGroupsApi;
  public readonly modelMappingOptions: AiModelMappingOptionsApi;
  public readonly routeExplain: AiRouteExplainApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.channelGroups = new AiChannelGroupsApi(client);
    this.modelMappingOptions = new AiModelMappingOptionsApi(client);
    this.routeExplain = new AiRouteExplainApi(client);
  }

}

export function createAiApi(client: HttpClient): AiApi {
  return new AiApi(client);
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
