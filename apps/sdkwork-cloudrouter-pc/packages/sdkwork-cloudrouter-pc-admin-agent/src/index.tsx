import {
  AgentCategoriesPage as AgentCategoriesBlock,
  AgentVisibilityPage as AgentVisibilityBlock,
  AgentsAdminPage as AgentsAdminBlock,
} from '@sdkwork/agents-pc-admin';
import {
  configureAgentsAdminRuntime,
  type AgentRecord,
} from '@sdkwork/agents-pc-admin/agentsAdminService';
import { configureDriveAppSdkClientProvider } from '@sdkwork/agents-pc-core/sdk/driveAppSdkClient';
import {
  getSdkworkAgentBackendSdkClient,
  getSdkworkDriveAppSdkClient,
  readPortalRoleCodes,
} from '@sdkwork/cloudroutes-pc-commons/runtime';
import { useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import {
  buildAgentVisibilityAdminPath,
  readAgentVisibilityAgentId,
} from './agentVisibilityRoute.ts';

/**
 * Binds the host runtime once, as a side effect of loading this chunk.
 *
 * The Agents admin blocks take no client props: they read their backend SDK
 * client from the runtime configured through
 * `configureAgentsAdminRuntime`, so it has to be registered before the first
 * render. Binding at module scope is what the console Agents seam
 * (`sdkwork-cloudrouter-pc-console-agents`) does too, and it also means a
 * route that imports this package but fails before rendering still leaves the
 * runtime wired for whatever renders next.
 *
 * The backend client comes from the host commons getter — same-origin base
 * URL, the portal session token manager, and the shared session auth
 * boundary — so this block never configures transport itself. The Drive getter
 * backs the shared creation flow's avatar and local-package upload steps.
 */
configureAgentsAdminRuntime({
  getBackendSdkClient: getSdkworkAgentBackendSdkClient,
});
configureDriveAppSdkClientProvider(getSdkworkDriveAppSdkClient);

/** Route grammar re-exported so hosts can register the route without duplicating it. */
export {
  AGENT_VISIBILITY_ADMIN_PATH,
  AGENT_VISIBILITY_AGENT_PARAM,
  AGENT_VISIBILITY_ROUTE_SEGMENT,
  buildAgentVisibilityAdminPath,
  readAgentVisibilityAgentId,
} from './agentVisibilityRoute.ts';

/**
 * Cloud Router admin-console entry for agent management (`/admin/agent`).
 *
 * The block owns its catalog layout, category filter, role-scope switch and
 * the shared agent-creation flow; this adapter supplies the operator's IAM role
 * codes and the one piece of host knowledge the block cannot have — where the
 * visibility surface is mounted.
 */
export function AgentsAdminPage() {
  const navigate = useNavigate();
  const openVisibility = useCallback(
    (record: AgentRecord) => {
      navigate(buildAgentVisibilityAdminPath(record.agentId));
    },
    [navigate],
  );
  return <AgentsAdminBlock onOpenVisibility={openVisibility} roleCodes={readPortalRoleCodes()} />;
}

/**
 * Cloud Router admin-console entry for Agent visibility
 * (`/admin/agent/visibility`).
 *
 * The route is deep-linkable: `?agent=<agentId>` opens that agent's governance
 * drawer, which is how the catalog's per-row action lands here.
 */
export function AgentVisibilityAdminPage() {
  const [searchParams] = useSearchParams();
  const agentId = readAgentVisibilityAgentId(searchParams.toString());
  // Remount per deep link, so navigating between two agents cannot leave the
  // previous agent's drawer state on screen.
  return <AgentVisibilityBlock initialAgentId={agentId} key={agentId ?? 'catalog'} />;
}

export {
  AgentCategoriesBlock as AgentCategoriesAdminPage,
  AgentsAdminPage as default,
};
