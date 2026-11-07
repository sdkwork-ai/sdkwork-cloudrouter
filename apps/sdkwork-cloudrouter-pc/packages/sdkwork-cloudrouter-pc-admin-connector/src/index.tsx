import { useMemo, type ReactNode } from 'react';

import {
  AdminCategoriesPage,
  AdminServerDetailPage,
  AdminServersPage,
  McpAdminRouteProvider,
} from '@sdkwork/mcp-pc-admin';
import {
  MCPClientsProvider,
  type MCPClients,
} from '@sdkwork/mcp-pc-core';
import {
  getMcpBackendSdkClient,
  getSdkworkDriveAppSdkClient,
  getSdkworkMcpAppSdkClient,
} from '@sdkwork/cloudroutes-pc-commons/runtime';

/**
 * Base path of the MCP admin server list inside this host.
 *
 * The MCP admin block builds detail links from
 * `useMcpAdminServersBasePath()`, so the provider below must stay in sync with
 * the host route table (`/admin/connector` plus `/admin/connector/:serverKey`).
 */
const MCP_ADMIN_SERVERS_BASE_PATH = '/admin/connector';

/**
 * Builds the MCP client inventory from the host runtime.
 *
 * The MCP admin surfaces read their SDK clients from the `MCPClientsProvider`
 * owned by sdkwork-mcp, so a composing host has to supply one. Every client
 * comes from the host commons getters — same-origin base URLs, the portal
 * session token manager, and the shared session auth boundary — so this block
 * never configures transport itself. The drive client is shared because the
 * MCP server icon upload flow stores images through `sdkwork-drive`.
 */
function McpAdminClientsProvider({ children }: { children: ReactNode }) {
  const clients = useMemo<MCPClients>(
    () => ({
      app: getSdkworkMcpAppSdkClient(),
      drive: getSdkworkDriveAppSdkClient(),
      backend: getMcpBackendSdkClient(),
    }),
    [],
  );
  return <MCPClientsProvider clients={clients}>{children}</MCPClientsProvider>;
}

/**
 * Cloud Router admin-console entry for the MCP server management page
 * (MCP管理, route `/admin/connector`).
 *
 * This package is a thin, UI-free adapter: it binds the host runtime to the
 * admin blocks owned by sdkwork-mcp. It holds no MCP presentation, no MCP
 * business rules, and no generated-SDK import of its own — the server CRUD
 * surface, connector/tool catalogs and their styles all come from
 * `@sdkwork/mcp-pc-admin`.
 */
export function McpServersAdminPage() {
  return (
    <McpAdminClientsProvider>
      <McpAdminRouteProvider serversBasePath={MCP_ADMIN_SERVERS_BASE_PATH}>
        <AdminServersPage />
      </McpAdminRouteProvider>
    </McpAdminClientsProvider>
  );
}

/**
 * Cloud Router admin-console entry for the MCP server detail page
 * (route `/admin/connector/:serverKey`). Detail links rendered by
 * {@link McpServersAdminPage} resolve through the same base path.
 */
export function McpServerDetailAdminPage() {
  return (
    <McpAdminClientsProvider>
      <McpAdminRouteProvider serversBasePath={MCP_ADMIN_SERVERS_BASE_PATH}>
        <AdminServerDetailPage />
      </McpAdminRouteProvider>
    </McpAdminClientsProvider>
  );
}

/**
 * Cloud Router admin-console entry for the MCP category management page
 * (MCP分类管理, route `/admin/connector/categories`).
 */
export function McpCategoriesAdminPage() {
  return (
    <McpAdminClientsProvider>
      <McpAdminRouteProvider serversBasePath={MCP_ADMIN_SERVERS_BASE_PATH}>
        <AdminCategoriesPage />
      </McpAdminRouteProvider>
    </McpAdminClientsProvider>
  );
}
