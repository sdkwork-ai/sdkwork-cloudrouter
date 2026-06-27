import { appApiPath } from './paths';
import type { HttpClient } from '../http/client';

import type { McpInvocationListResponse, McpPromptListResponse, McpResourceListResponse, McpServerCategoryListResponse, McpServerListResponse, McpServerRecordResponse, McpToolListResponse, McpToolRecordResponse } from '../types';


export class McpApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** MCP mcp.listCategories */
  async listCategories(): Promise<McpServerCategoryListResponse> {
    return this.client.get<McpServerCategoryListResponse>(appApiPath(`/mcp/categories`));
  }

/** MCP mcp.listServers */
  async listServers(): Promise<McpServerListResponse> {
    return this.client.get<McpServerListResponse>(appApiPath(`/mcp/servers`));
  }

/** MCP mcp.getServer */
  async getServer(serverKey: string): Promise<McpServerRecordResponse> {
    return this.client.get<McpServerRecordResponse>(appApiPath(`/mcp/servers/${serializePathParameter(serverKey, { name: 'serverKey', style: 'simple', explode: false })}`));
  }

/** MCP mcp.listTools */
  async listTools(serverId: string): Promise<McpToolListResponse> {
    return this.client.get<McpToolListResponse>(appApiPath(`/mcp/servers/${serializePathParameter(serverId, { name: 'serverId', style: 'simple', explode: false })}/tools`));
  }

/** MCP mcp.getTool */
  async getTool(serverId: string, toolKey: string): Promise<McpToolRecordResponse> {
    return this.client.get<McpToolRecordResponse>(appApiPath(`/mcp/servers/${serializePathParameter(serverId, { name: 'serverId', style: 'simple', explode: false })}/tools/${serializePathParameter(toolKey, { name: 'toolKey', style: 'simple', explode: false })}`));
  }

/** MCP mcp.listResources */
  async listResources(serverId: string): Promise<McpResourceListResponse> {
    return this.client.get<McpResourceListResponse>(appApiPath(`/mcp/servers/${serializePathParameter(serverId, { name: 'serverId', style: 'simple', explode: false })}/resources`));
  }

/** MCP mcp.listPrompts */
  async listPrompts(serverId: string): Promise<McpPromptListResponse> {
    return this.client.get<McpPromptListResponse>(appApiPath(`/mcp/servers/${serializePathParameter(serverId, { name: 'serverId', style: 'simple', explode: false })}/prompts`));
  }

/** MCP mcp.listInvocations */
  async listInvocations(): Promise<McpInvocationListResponse> {
    return this.client.get<McpInvocationListResponse>(appApiPath(`/mcp/invocations`));
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
