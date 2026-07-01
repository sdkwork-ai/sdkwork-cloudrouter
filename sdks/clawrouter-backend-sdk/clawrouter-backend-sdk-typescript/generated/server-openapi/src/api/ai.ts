import { backendApiPath } from './paths';
import type { HttpClient } from '../http/client';

import type { AiResourceGroupsCreateResult, AiResourceGroupsUpdateResult, AiResourcesCreateResult, AiResourcesUpdateResult, ChannelGroupsChannelBindingsUpdateResult, ChannelGroupsCreateResult, ChannelGroupsRouteExplainRetrieveResult, ChannelGroupsUpdateResult, ModelMappingsCreateResult, ModelMappingsReplaceResult, ModelMappingsResolveCreateResult, ModelMappingsUpdateResult, ModelRankingsRefreshResult, ModelRankingsStatusRetrieveResult, ModelsCreateResult, ModelsRefreshResult, ModelsUpdateResult, ModelVendorsCreateResult, RouteExplainCreateResult, SdkWorkCommandData, SdkWorkPageData } from '../types';


export class AiRouteExplainApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create */
  async create(): Promise<RouteExplainCreateResult> {
    return this.client.post<RouteExplainCreateResult>(backendApiPath(`/ai/route_explain`));
  }
}

export class AiAiResourcesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(backendApiPath(`/ai/resources`));
  }

/** Create */
  async create(): Promise<AiResourcesCreateResult> {
    return this.client.post<AiResourcesCreateResult>(backendApiPath(`/ai/resources`));
  }

/** Update */
  async update(resourceId: string): Promise<AiResourcesUpdateResult> {
    return this.client.put<AiResourcesUpdateResult>(backendApiPath(`/ai/resources/${serializePathParameter(resourceId, { name: 'resourceId', style: 'simple', explode: false })}`));
  }
}

export class AiAiResourceGroupsResourcesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(groupIdOrCode: string): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(backendApiPath(`/ai/resource_groups/${serializePathParameter(groupIdOrCode, { name: 'groupIdOrCode', style: 'simple', explode: false })}/resources`));
  }
}

export class AiAiResourceGroupsApi {
  private client: HttpClient;
  public readonly resources: AiAiResourceGroupsResourcesApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.resources = new AiAiResourceGroupsResourcesApi(client);
  }


/** List */
  async list(): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(backendApiPath(`/ai/resource_groups`));
  }

/** Create */
  async create(): Promise<AiResourceGroupsCreateResult> {
    return this.client.post<AiResourceGroupsCreateResult>(backendApiPath(`/ai/resource_groups`));
  }

/** Delete */
  async delete(groupId: string): Promise<SdkWorkCommandData> {
    return this.client.delete<SdkWorkCommandData>(backendApiPath(`/ai/resource_groups/${serializePathParameter(groupId, { name: 'groupId', style: 'simple', explode: false })}`));
  }

/** Update */
  async update(groupId: string): Promise<AiResourceGroupsUpdateResult> {
    return this.client.patch<AiResourceGroupsUpdateResult>(backendApiPath(`/ai/resource_groups/${serializePathParameter(groupId, { name: 'groupId', style: 'simple', explode: false })}`));
  }
}

export class AiModelsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(backendApiPath(`/ai/models`));
  }

/** Create */
  async create(): Promise<ModelsCreateResult> {
    return this.client.post<ModelsCreateResult>(backendApiPath(`/ai/models`));
  }

/** Refresh */
  async refresh(): Promise<ModelsRefreshResult> {
    return this.client.post<ModelsRefreshResult>(backendApiPath(`/ai/models/refresh`));
  }

/** Delete */
  async delete(modelId: string): Promise<SdkWorkCommandData> {
    return this.client.delete<SdkWorkCommandData>(backendApiPath(`/ai/models/${serializePathParameter(modelId, { name: 'modelId', style: 'simple', explode: false })}`));
  }

/** Update */
  async update(modelId: string): Promise<ModelsUpdateResult> {
    return this.client.patch<ModelsUpdateResult>(backendApiPath(`/ai/models/${serializePathParameter(modelId, { name: 'modelId', style: 'simple', explode: false })}`));
  }
}

export class AiModelVendorsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(backendApiPath(`/ai/model_vendors`));
  }

/** Create */
  async create(): Promise<ModelVendorsCreateResult> {
    return this.client.post<ModelVendorsCreateResult>(backendApiPath(`/ai/model_vendors`));
  }
}

export class AiModelRankingsStatusApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(): Promise<ModelRankingsStatusRetrieveResult> {
    return this.client.get<ModelRankingsStatusRetrieveResult>(backendApiPath(`/ai/model_rankings/status`));
  }
}

export class AiModelRankingsJobsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(backendApiPath(`/ai/model_rankings/jobs`));
  }
}

export class AiModelRankingsApi {
  private client: HttpClient;
  public readonly jobs: AiModelRankingsJobsApi;
  public readonly status: AiModelRankingsStatusApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.jobs = new AiModelRankingsJobsApi(client);
    this.status = new AiModelRankingsStatusApi(client);
  }


/** List */
  async list(): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(backendApiPath(`/ai/model_rankings`));
  }

/** Refresh */
  async refresh(): Promise<ModelRankingsRefreshResult> {
    return this.client.post<ModelRankingsRefreshResult>(backendApiPath(`/ai/model_rankings/refresh`));
  }
}

export class AiModelMappingsResolveApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create */
  async create(): Promise<ModelMappingsResolveCreateResult> {
    return this.client.post<ModelMappingsResolveCreateResult>(backendApiPath(`/ai/model_mappings/resolve`));
  }
}

export class AiModelMappingsApi {
  private client: HttpClient;
  public readonly resolve: AiModelMappingsResolveApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.resolve = new AiModelMappingsResolveApi(client);
  }


/** List */
  async list(): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(backendApiPath(`/ai/model_mappings`));
  }

/** Create */
  async create(): Promise<ModelMappingsCreateResult> {
    return this.client.post<ModelMappingsCreateResult>(backendApiPath(`/ai/model_mappings`));
  }

/** Replace */
  async replace(): Promise<ModelMappingsReplaceResult> {
    return this.client.put<ModelMappingsReplaceResult>(backendApiPath(`/ai/model_mappings`));
  }

/** Delete */
  async delete(mappingId: string): Promise<SdkWorkCommandData> {
    return this.client.delete<SdkWorkCommandData>(backendApiPath(`/ai/model_mappings/${serializePathParameter(mappingId, { name: 'mappingId', style: 'simple', explode: false })}`));
  }

/** Update */
  async update(mappingId: string): Promise<ModelMappingsUpdateResult> {
    return this.client.patch<ModelMappingsUpdateResult>(backendApiPath(`/ai/model_mappings/${serializePathParameter(mappingId, { name: 'mappingId', style: 'simple', explode: false })}`));
  }
}

export class AiModelMappingOptionsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(backendApiPath(`/ai/model_mapping_options`));
  }
}

export class AiChannelGroupsRouteExplainApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(channelGroupId: string): Promise<ChannelGroupsRouteExplainRetrieveResult> {
    return this.client.get<ChannelGroupsRouteExplainRetrieveResult>(backendApiPath(`/ai/channel_groups/${serializePathParameter(channelGroupId, { name: 'channelGroupId', style: 'simple', explode: false })}/route_explain`));
  }
}

export class AiChannelGroupsChannelBindingsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(channelGroupId: string): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(backendApiPath(`/ai/channel_groups/${serializePathParameter(channelGroupId, { name: 'channelGroupId', style: 'simple', explode: false })}/channel_bindings`));
  }

/** Update */
  async update(channelGroupId: string): Promise<ChannelGroupsChannelBindingsUpdateResult> {
    return this.client.put<ChannelGroupsChannelBindingsUpdateResult>(backendApiPath(`/ai/channel_groups/${serializePathParameter(channelGroupId, { name: 'channelGroupId', style: 'simple', explode: false })}/channel_bindings`));
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


/** List */
  async list(): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(backendApiPath(`/ai/channel_groups`));
  }

/** Create */
  async create(): Promise<ChannelGroupsCreateResult> {
    return this.client.post<ChannelGroupsCreateResult>(backendApiPath(`/ai/channel_groups`));
  }

/** Delete */
  async delete(channelGroupId: string): Promise<SdkWorkCommandData> {
    return this.client.delete<SdkWorkCommandData>(backendApiPath(`/ai/channel_groups/${serializePathParameter(channelGroupId, { name: 'channelGroupId', style: 'simple', explode: false })}`));
  }

/** Update */
  async update(channelGroupId: string): Promise<ChannelGroupsUpdateResult> {
    return this.client.patch<ChannelGroupsUpdateResult>(backendApiPath(`/ai/channel_groups/${serializePathParameter(channelGroupId, { name: 'channelGroupId', style: 'simple', explode: false })}`));
  }
}

export class AiApi {
  private client: HttpClient;
  public readonly channelGroups: AiChannelGroupsApi;
  public readonly modelMappingOptions: AiModelMappingOptionsApi;
  public readonly modelMappings: AiModelMappingsApi;
  public readonly modelRankings: AiModelRankingsApi;
  public readonly modelVendors: AiModelVendorsApi;
  public readonly models: AiModelsApi;
  public readonly aiResourceGroups: AiAiResourceGroupsApi;
  public readonly aiResources: AiAiResourcesApi;
  public readonly routeExplain: AiRouteExplainApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.channelGroups = new AiChannelGroupsApi(client);
    this.modelMappingOptions = new AiModelMappingOptionsApi(client);
    this.modelMappings = new AiModelMappingsApi(client);
    this.modelRankings = new AiModelRankingsApi(client);
    this.modelVendors = new AiModelVendorsApi(client);
    this.models = new AiModelsApi(client);
    this.aiResourceGroups = new AiAiResourceGroupsApi(client);
    this.aiResources = new AiAiResourcesApi(client);
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
