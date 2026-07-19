import { backendApiPath } from './paths';
import type { HttpClient } from '../http/client';
import type { AdminChannelBindingPage, AdminChannelBindingReplaceRequest, AdminChannelGroupCreateRequest, AdminChannelGroupItem, AdminChannelGroupPage, AdminChannelGroupUpdateRequest } from '../types';
export class AiRouteExplainApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List runtime route explain */
  async explain(): Promise<Record<string, never>> {
    return this.client.post<Record<string, never>>(backendApiPath(`/ai/route_explain`));
  }
}

export class AiModelMappingOptionsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List model options catalog */
  async list(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(backendApiPath(`/ai/model_mapping_options`));
  }
}

export class AiChannelGroupsRouteExplainApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List group route explain */
  async list(channelGroupId: string): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(backendApiPath(`/ai/channel_groups/${serializePathParameter(channelGroupId, { name: 'channelGroupId', style: 'simple', explode: false })}/route_explain`));
  }
}

export class AiChannelGroupsChannelBindingsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List group channel bindings */
  async list(channelGroupId: string): Promise<AdminChannelBindingPage> {
    return this.client.get<AdminChannelBindingPage>(backendApiPath(`/ai/channel_groups/${serializePathParameter(channelGroupId, { name: 'channelGroupId', style: 'simple', explode: false })}/channel_bindings`));
  }

/** Replace group channel bindings */
  async update(channelGroupId: string, body: AdminChannelBindingReplaceRequest): Promise<AdminChannelBindingPage> {
    return this.client.put<AdminChannelBindingPage>(backendApiPath(`/ai/channel_groups/${serializePathParameter(channelGroupId, { name: 'channelGroupId', style: 'simple', explode: false })}/channel_bindings`), body, undefined, undefined, 'application/json');
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
  async list(): Promise<AdminChannelGroupPage> {
    return this.client.get<AdminChannelGroupPage>(backendApiPath(`/ai/channel_groups`));
  }

/** Create group */
  async create(body: AdminChannelGroupCreateRequest): Promise<AdminChannelGroupItem> {
    return this.client.post<AdminChannelGroupItem>(backendApiPath(`/ai/channel_groups`), body, undefined, undefined, 'application/json');
  }

/** Delete group */
  async delete(channelGroupId: string): Promise<void> {
    return this.client.delete<void>(backendApiPath(`/ai/channel_groups/${serializePathParameter(channelGroupId, { name: 'channelGroupId', style: 'simple', explode: false })}`));
  }

/** Update group */
  async update(channelGroupId: string, body: AdminChannelGroupUpdateRequest): Promise<AdminChannelGroupItem> {
    return this.client.patch<AdminChannelGroupItem>(backendApiPath(`/ai/channel_groups/${serializePathParameter(channelGroupId, { name: 'channelGroupId', style: 'simple', explode: false })}`), body, undefined, undefined, 'application/json');
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
