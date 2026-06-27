import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { hasMcpAdminPermission, type MCPAdminPermission } from '@sdkwork/mcp-pc-admin-core';

import {
  buildSdkworkMCPPcAuthLoginRedirect,
  hasSdkworkMCPPcAuthenticatedSession,
} from './authGateLogic';
import type { SdkworkMCPPcRuntime } from './bootstrap/runtime';

export interface AdminPermissionGateProps {
  children: ReactNode;
  permission: MCPAdminPermission;
  runtime: SdkworkMCPPcRuntime;
}

export function AdminPermissionGate({
  children,
  permission,
  runtime,
}: AdminPermissionGateProps) {
  const location = useLocation();
  const snapshot = runtime.session.getSnapshot();

  if (!hasSdkworkMCPPcAuthenticatedSession(snapshot)) {
    return <Navigate replace to={buildSdkworkMCPPcAuthLoginRedirect(location)} />;
  }

  const allowed = hasMcpAdminPermission({
    permission,
    grantedPermissions: snapshot.context?.permissionScope ?? [],
    roleCodes: snapshot.context?.standardRoleCodes ?? [],
  });

  if (!allowed) {
    return (
      <section className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold text-slate-900">Access denied</h1>
        <p className="mt-2 text-sm text-slate-600">
          You do not have permission to access this MCP admin surface.
        </p>
        <p className="mt-4 font-mono text-xs text-slate-500">{permission}</p>
      </section>
    );
  }

  return <>{children}</>;
}
