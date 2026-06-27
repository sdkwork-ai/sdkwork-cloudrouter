import { Navigate, Route, Routes } from 'react-router-dom';
import { MCPClientsProvider } from '@sdkwork/mcp-pc-core';
import { MCP_ADMIN_PERMISSIONS } from '@sdkwork/mcp-pc-admin-core';
import {
  AdminCategoriesPage,
  AdminInvocationsPage,
  AdminServerDetailPage,
  AdminServersPage,
} from '@sdkwork/mcp-pc-admin';
import { ConsoleMCPPage } from '@sdkwork/mcp-pc-console';
import { MCPHubPage, MCPServerDetailPage } from '@sdkwork/mcp-pc-hub';
import { MCPShell } from '@sdkwork/mcp-pc-shell';

import { AdminPermissionGate } from './AdminPermissionGate';
import { AuthGate } from './AuthGate';
import { createSdkworkMCPPcRuntime } from './bootstrap/runtime';

const runtime = createSdkworkMCPPcRuntime();

export function App() {
  return (
    <MCPClientsProvider clients={runtime.sdkClients}>
      <AuthGate runtime={runtime}>
        <Routes>
          <Route element={<MCPShell />}>
            <Route path="/" element={<Navigate to="/mcp-hub" replace />} />
            <Route path="/mcp-hub" element={<MCPHubPage />} />
            <Route path="/mcp-hub/:serverKey" element={<MCPServerDetailPage />} />
            <Route path="/console/mcp" element={<ConsoleMCPPage />} />
            <Route
              path="/admin/servers"
              element={
                <AdminPermissionGate
                  permission={MCP_ADMIN_PERMISSIONS.serverManage}
                  runtime={runtime}
                >
                  <AdminServersPage />
                </AdminPermissionGate>
              }
            />
            <Route
              path="/admin/servers/:serverKey"
              element={
                <AdminPermissionGate
                  permission={MCP_ADMIN_PERMISSIONS.serverManage}
                  runtime={runtime}
                >
                  <AdminServerDetailPage />
                </AdminPermissionGate>
              }
            />
            <Route
              path="/admin/categories"
              element={
                <AdminPermissionGate
                  permission={MCP_ADMIN_PERMISSIONS.categoryManage}
                  runtime={runtime}
                >
                  <AdminCategoriesPage />
                </AdminPermissionGate>
              }
            />
            <Route
              path="/admin/invocations"
              element={
                <AdminPermissionGate
                  permission={MCP_ADMIN_PERMISSIONS.invocationRead}
                  runtime={runtime}
                >
                  <AdminInvocationsPage />
                </AdminPermissionGate>
              }
            />
            <Route path="/admin/mcp" element={<Navigate to="/admin/servers" replace />} />
          </Route>
        </Routes>
      </AuthGate>
    </MCPClientsProvider>
  );
}
