import { backendApiPath } from './paths';
import type { HttpClient } from '../http/client';

import type { RevisionsPublishResult, SdkWorkPageData, ServersBindingsCreateResult, ServersBindingsUpdateResult, ServersCreateResult, ServersHealthChecksCreateResult, ServersRetrieveResult, ServersRevisionsCreateResult, ServersToolsRefreshResult, ServersUpdateResult, ToolsUpdateResult } from '../types';


export class McpToolsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Update */
  async update(toolId: string): Promise<ToolsUpdateResult> {
    return this.client.put<ToolsUpdateResult>(backendApiPath(`/mcp/tools/${serializePathParameter(toolId, { name: 'toolId', style: 'simple', explode: false })}`));
  }
}

export class McpRevisionsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Publish */
  async publish(revisionId: string): Promise<RevisionsPublishResult> {
    return this.client.post<RevisionsPublishResult>(backendApiPath(`/mcp/revisions/${serializePathParameter(revisionId, { name: 'revisionId', style: 'simple', explode: false })}/publish`));
  }
}

export class McpServersRevisionsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(serverId: string): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(backendApiPath(`/mcp/servers/${serializePathParameter(serverId, { name: 'serverId', style: 'simple', explode: false })}/revisions`));
  }

/** Create */
  async create(serverId: string): Promise<ServersRevisionsCreateResult> {
    return this.client.post<ServersRevisionsCreateResult>(backendApiPath(`/mcp/servers/${serializePathParameter(serverId, { name: 'serverId', style: 'simple', explode: false })}/revisions`));
  }
}

export class McpServersHealthChecksApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create */
  async create(serverId: string): Promise<ServersHealthChecksCreateResult> {
    return this.client.post<ServersHealthChecksCreateResult>(backendApiPath(`/mcp/servers/${serializePathParameter(serverId, { name: 'serverId', style: 'simple', explode: false })}/health_check`));
  }
}

export class McpServersToolsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Refresh */
  async refresh(serverId: string): Promise<ServersToolsRefreshResult> {
    return this.client.post<ServersToolsRefreshResult>(backendApiPath(`/mcp/servers/${serializePathParameter(serverId, { name: 'serverId', style: 'simple', explode: false })}/discover`));
  }

/** List */
  async list(serverId: string): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(backendApiPath(`/mcp/servers/${serializePathParameter(serverId, { name: 'serverId', style: 'simple', explode: false })}/tools`));
  }
}

export class McpServersBindingsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Update */
  async update(bindingId: string): Promise<ServersBindingsUpdateResult> {
    return this.client.put<ServersBindingsUpdateResult>(backendApiPath(`/mcp/bindings/${serializePathParameter(bindingId, { name: 'bindingId', style: 'simple', explode: false })}`));
  }

/** List */
  async list(serverId: string): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(backendApiPath(`/mcp/servers/${serializePathParameter(serverId, { name: 'serverId', style: 'simple', explode: false })}/bindings`));
  }

/** Create */
  async create(serverId: string): Promise<ServersBindingsCreateResult> {
    return this.client.post<ServersBindingsCreateResult>(backendApiPath(`/mcp/servers/${serializePathParameter(serverId, { name: 'serverId', style: 'simple', explode: false })}/bindings`));
  }
}

export class McpServersApi {
  private client: HttpClient;
  public readonly bindings: McpServersBindingsApi;
  public readonly tools: McpServersToolsApi;
  public readonly healthChecks: McpServersHealthChecksApi;
  public readonly revisions: McpServersRevisionsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.bindings = new McpServersBindingsApi(client);
    this.tools = new McpServersToolsApi(client);
    this.healthChecks = new McpServersHealthChecksApi(client);
    this.revisions = new McpServersRevisionsApi(client);
  }


/** List */
  async list(): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(backendApiPath(`/mcp/servers`));
  }

/** Create */
  async create(): Promise<ServersCreateResult> {
    return this.client.post<ServersCreateResult>(backendApiPath(`/mcp/servers`));
  }

/** Retrieve */
  async retrieve(serverId: string): Promise<ServersRetrieveResult> {
    return this.client.get<ServersRetrieveResult>(backendApiPath(`/mcp/servers/${serializePathParameter(serverId, { name: 'serverId', style: 'simple', explode: false })}`));
  }

/** Update */
  async update(serverId: string): Promise<ServersUpdateResult> {
    return this.client.put<ServersUpdateResult>(backendApiPath(`/mcp/servers/${serializePathParameter(serverId, { name: 'serverId', style: 'simple', explode: false })}`));
  }
}

export class McpApi {
  private client: HttpClient;
  public readonly servers: McpServersApi;
  public readonly revisions: McpRevisionsApi;
  public readonly tools: McpToolsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.servers = new McpServersApi(client);
    this.revisions = new McpRevisionsApi(client);
    this.tools = new McpToolsApi(client);
  }

}

export function createMcpApi(client: HttpClient): McpApi {
  return new McpApi(client);
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
