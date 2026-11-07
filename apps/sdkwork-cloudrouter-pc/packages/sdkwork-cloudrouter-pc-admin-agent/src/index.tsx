import {
  AgentCategoriesPage as AgentCategoriesBlock,
  AgentsAdminPage as AgentsAdminBlock,
} from '@sdkwork/agents-pc-admin';
import { configureAgentsAdminRuntime } from '@sdkwork/agents-pc-admin/agentsAdminService';
import { getSdkworkAgentBackendSdkClient } from '@sdkwork/cloudroutes-pc-commons/runtime';

/**
 * Binds the host runtime once, as a side effect of loading this chunk.
 *
 * The Agents admin block takes no client props: it reads its backend SDK
 * client from the runtime configured through
 * `configureAgentsAdminRuntime`, so it has to be registered before the first
 * render. Binding at module scope is what the console Agents seam
 * (`sdkwork-cloudrouter-pc-console-agents`) does too, and it also means a
 * route that imports this package but fails before rendering still leaves the
 * runtime wired for whatever renders next.
 *
 * The backend client comes from the host commons getter — same-origin base
 * URL, the portal session token manager, and the shared session auth
 * boundary — so this block never configures transport itself.
 */
configureAgentsAdminRuntime({
  getBackendSdkClient: getSdkworkAgentBackendSdkClient,
});

export {
  AgentsAdminBlock as AgentsAdminPage,
  AgentCategoriesBlock as AgentCategoriesAdminPage,
  AgentsAdminBlock as default,
};
