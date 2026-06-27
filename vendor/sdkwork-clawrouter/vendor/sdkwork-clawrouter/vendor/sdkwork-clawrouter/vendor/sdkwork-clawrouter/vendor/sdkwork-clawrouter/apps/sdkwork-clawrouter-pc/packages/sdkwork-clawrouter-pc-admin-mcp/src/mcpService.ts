import {
  createIdempotencyParams,
  ensureSdkworkApiSuccess,
  getClawRouterBackendSdkClient,
  requiredSafePathSegment,
} from '@sdkwork/clawroutes-pc-commons/runtime';
import type {
  AdminMcpBindingCreateRequest,
  AdminMcpBindingItem,
  AdminMcpBindingUpdateRequest,
  AdminMcpServerCreateRequest,
  AdminMcpServerItem,
  AdminMcpServerRevisionItem,
  AdminMcpServerRevisionCreateRequest,
  AdminMcpServerUpdateRequest,
  AdminMcpToolItem,
  AdminMcpToolUpdateRequest,
} from '@sdkwork/clawrouter-backend-sdk';

type BackendMcp = ReturnType<typeof getClawRouterBackendSdkClient>['mcp'];
type ListParams<TList> = TList extends (params?: infer TParams) => unknown ? TParams : never;

export type AdminMcpServerListParams = ListParams<BackendMcp['servers']['list']>;
export type AdminMcpServer = AdminMcpServerItem;
export type AdminMcpServerRevision = AdminMcpServerRevisionItem;
export type AdminMcpTool = AdminMcpToolItem;
export type AdminMcpBinding = AdminMcpBindingItem;
export type AdminMcpBindingCreateInput = AdminMcpBindingCreateRequest;
export type AdminMcpBindingUpdateInput = AdminMcpBindingUpdateRequest;
export type AdminMcpServerCreateInput = AdminMcpServerCreateRequest;
export type AdminMcpServerUpdateInput = AdminMcpServerUpdateRequest;
export type AdminMcpServerRevisionCreateInput = AdminMcpServerRevisionCreateRequest;
export type AdminMcpToolUpdateInput = AdminMcpToolUpdateRequest;

export const DEFAULT_MCP_PAGE_PARAMS = {
  page: '1',
  pageSize: '100',
} as const;

export const EMPTY_MCP_ITEMS = {
  data: {
    items: [],
  },
} as const;

export async function listMcpServers(params?: AdminMcpServerListParams) {
  return getClawRouterBackendSdkClient().mcp.servers.list(normalizeMcpServerListParams(params));
}

export async function getMcpServer(serverId: string) {
  return getClawRouterBackendSdkClient().mcp.servers.retrieve(
    requiredSafePathSegment(serverId, 'serverId'),
  );
}

export async function createMcpServer(input: AdminMcpServerCreateInput) {
  const result = await getClawRouterBackendSdkClient().mcp.servers.create(
    input,
    createIdempotencyParams('admin-mcp-server-create'),
  );
  ensureSdkworkApiSuccess(result, 'Failed to create MCP server');
  return result;
}

export async function updateMcpServer(serverId: string, input: AdminMcpServerUpdateInput) {
  const result = await getClawRouterBackendSdkClient().mcp.servers.update(
    requiredSafePathSegment(serverId, 'serverId'),
    input,
  );
  ensureSdkworkApiSuccess(result, 'Failed to update MCP server');
  return result;
}

export async function listMcpServerRevisions(serverId: string) {
  return getClawRouterBackendSdkClient().mcp.servers.revisions.list(
    requiredSafePathSegment(serverId, 'serverId'),
  );
}

export async function createMcpServerRevision(serverId: string, input: AdminMcpServerRevisionCreateInput) {
  const result = await getClawRouterBackendSdkClient().mcp.servers.revisions.create(
    requiredSafePathSegment(serverId, 'serverId'),
    input,
    createIdempotencyParams('admin-mcp-server-revision-create'),
  );
  ensureSdkworkApiSuccess(result, 'Failed to create MCP server revision');
  return result;
}

export async function publishMcpServerRevision(revisionId: string) {
  const result = await getClawRouterBackendSdkClient().mcp.revisions.publish(
    requiredSafePathSegment(revisionId, 'revisionId'),
  );
  ensureSdkworkApiSuccess(result, 'Failed to publish MCP server revision');
  return result;
}

export async function discoverMcpTools(serverId: string) {
  const result = await getClawRouterBackendSdkClient().mcp.servers.tools.refresh(
    requiredSafePathSegment(serverId, 'serverId'),
  );
  ensureSdkworkApiSuccess(result, 'Failed to discover MCP tools');
  return result;
}

export async function checkMcpServerHealth(serverId: string) {
  const result = await getClawRouterBackendSdkClient().mcp.servers.healthChecks.create(
    requiredSafePathSegment(serverId, 'serverId'),
  );
  ensureSdkworkApiSuccess(result, 'Failed to check MCP server health');
  return result;
}

export async function listMcpTools(serverId: string) {
  return getClawRouterBackendSdkClient().mcp.servers.tools.list(
    requiredSafePathSegment(serverId, 'serverId'),
  );
}

export async function updateMcpTool(toolId: string, input: AdminMcpToolUpdateInput) {
  const result = await getClawRouterBackendSdkClient().mcp.tools.update(
    requiredSafePathSegment(toolId, 'toolId'),
    input,
  );
  ensureSdkworkApiSuccess(result, 'Failed to update MCP tool');
  return result;
}

export async function listMcpBindings(serverId: string) {
  return getClawRouterBackendSdkClient().mcp.servers.bindings.list(
    requiredSafePathSegment(serverId, 'serverId'),
  );
}

export async function createMcpBinding(serverId: string, input: AdminMcpBindingCreateInput) {
  const result = await getClawRouterBackendSdkClient().mcp.servers.bindings.create(
    requiredSafePathSegment(serverId, 'serverId'),
    input,
    createIdempotencyParams('admin-mcp-binding-create'),
  );
  ensureSdkworkApiSuccess(result, 'Failed to create MCP binding');
  return result;
}

export async function updateMcpBinding(bindingId: string, input: AdminMcpBindingUpdateInput) {
  const result = await getClawRouterBackendSdkClient().mcp.servers.bindings.update(
    requiredSafePathSegment(bindingId, 'bindingId'),
    input,
  );
  ensureSdkworkApiSuccess(result, 'Failed to update MCP binding');
  return result;
}

function normalizeMcpServerListParams(params?: AdminMcpServerListParams): AdminMcpServerListParams {
  return {
    ...DEFAULT_MCP_PAGE_PARAMS,
    ...(params ?? {}),
    categoryId: optionalMcpListCategoryId(params?.categoryId),
  } as AdminMcpServerListParams;
}

function optionalMcpListCategoryId(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  const normalized = String(value).trim();
  return normalized ? normalized : undefined;
}
