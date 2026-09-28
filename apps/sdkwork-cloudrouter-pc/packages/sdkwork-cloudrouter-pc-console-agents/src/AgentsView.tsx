import {
  AgentsConsoleEmbed,
  configureAgentsConsoleRuntime,
  findAgentsConsoleModuleById,
  findAgentsConsoleModuleByRoute,
  type AgentsConsoleNavigationTarget,
  type CreateAgentCapability,
} from '@sdkwork/agents-pc-agents/console';
import {
  getSdkworkAgentAppSdkClient,
  getSdkworkAssetsAppSdkClient,
  getSdkworkDriveAppSdkClient,
  getSdkworkSkillsAppSdkClient,
} from '@sdkwork/cloudroutes-pc-commons/runtime';
import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import {
  buildAgentsConsolePath,
  readAgentsConsoleAgentId,
  readAgentsConsoleModuleRoute,
} from './agentsConsoleRoute.ts';

/**
 * Binds the host runtime once, as a side effect of loading this chunk.
 *
 * The Agents console block takes no client props: it reads its SDK clients from
 * providers owned by sdkwork-agents, so they have to be registered before its
 * first render. Binding at module scope is what the Playground seam
 * (`sdkwork-cloudrouter-pc-playground`) does too, and it also means a route that
 * imports this package but fails before rendering still leaves the providers
 * wired for whatever renders next.
 *
 * Only the getters this console actually renders with are passed: the agent
 * catalog and the assets/drive/skills backings behind it. The conversation stack
 * is deliberately absent — the portal already surfaces agent conversations in
 * the Playground, and the console hides its own conversation entry point, so
 * binding that stack here would add configuration surface nothing reads.
 */
configureAgentsConsoleRuntime({
  getAgentsAppSdkClient: getSdkworkAgentAppSdkClient,
  getAssetsAppSdkClient: getSdkworkAssetsAppSdkClient,
  getDriveAppSdkClient: getSdkworkDriveAppSdkClient,
  getSkillsAppSdkClient: getSdkworkSkillsAppSdkClient,
});

/**
 * Capability panels this deployment cannot serve.
 *
 * The portal's app-api composition assembles the agents, assets, skills and
 * memory surfaces, but no knowledgebase or voice surface, so a knowledge or
 * voice picker would render a catalog that can only fail its requests. Hiding
 * the panels keeps the editor honest about what this deployment can do instead
 * of offering a control the user can never complete.
 *
 * This is a statement about *this* composition, not about the capability:
 * add a surface back here (and to the composition) rather than editing the
 * owner's editor, which keeps the panels correct for every other host.
 */
const HIDDEN_AGENT_CAPABILITIES: readonly CreateAgentCapability[] = ['knowledgebase', 'voice'];

export interface AgentsViewProps {
  className?: string;
}

/**
 * Cloud Router user-console entry for the Agents capability.
 *
 * This package is a thin, UI-free adapter: it binds the host runtime (SDK client
 * factories, console routing) to the `AgentsConsoleEmbed` block owned by
 * sdkwork-agents. It holds no Agents presentation, no Agents business rules, and
 * no generated-SDK import — the agent catalog, the creation/edit flow, the
 * module catalog and their styles all come from
 * `@sdkwork/agents-pc-agents/console`.
 *
 * The whole surface is scoped to the signed-in user: the manager module renders
 * `mine`, so the console manages the caller's own agents, and the agents app-api
 * stays the authority on what that means.
 *
 * Locale is not injected: the block resolves copy through the host i18n instance
 * from the `common` namespace, which the portal already registers (see
 * `agentsWorkbenchI18nCatalogs` in `src/main.tsx`), so a portal locale without an
 * Agents catalog falls back through the provider instead of rendering raw keys.
 */
export function AgentsView({ className }: AgentsViewProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const activeModule = findAgentsConsoleModuleByRoute(
    readAgentsConsoleModuleRoute(location.pathname),
  );
  const agentId = readAgentsConsoleAgentId(location.pathname);

  const handleNavigate = useCallback(
    (target: AgentsConsoleNavigationTarget) => {
      const moduleRoute = findAgentsConsoleModuleById(target.moduleId)?.route;
      if (!moduleRoute) return;
      navigate(buildAgentsConsolePath(moduleRoute, target.agentId));
    },
    [navigate],
  );

  return (
    <AgentsConsoleEmbed
      agentId={agentId}
      className={className}
      hiddenCapabilities={HIDDEN_AGENT_CAPABILITIES}
      // Undefined at the console root, which makes the block open its default
      // module without this adapter having to know which module that is.
      moduleId={activeModule?.id}
      onNavigate={handleNavigate}
    />
  );
}
