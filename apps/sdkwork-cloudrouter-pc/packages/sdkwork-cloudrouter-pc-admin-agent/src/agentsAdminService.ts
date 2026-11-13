import {
  SdkworkBackendClient,
  type AgentRecord,
  type CreateAgentRequest,
  type RestoreAgentRequest,
  type UpdateAgentRequest,
  type UpdateAgentStatusRequest,
} from '@sdkwork/agents-backend-sdk';

/**
 * List query parameters of the generated backend client. The generated API
 * barrel does not re-export the `*ListParams` interfaces, so the type is
 * derived from the client method signature it parameterizes.
 */
export type AgentsAdminListParams = Parameters<
  SdkworkBackendClient['ai']['agents']['list']
>[0];

export type AgentsAdminAgentPage = Awaited<
  ReturnType<SdkworkBackendClient['ai']['agents']['list']>
>;

export type {
  AgentRecord,
  CreateAgentRequest,
  RestoreAgentRequest,
  UpdateAgentRequest,
  UpdateAgentStatusRequest,
};

/**
 * Runtime ports the Agents admin block needs from its composing host.
 *
 * The block never constructs transport itself: the host binds a backend
 * client factory (same-origin base URL, host session token manager) through
 * {@link configureAgentsAdminRuntime} before the first render.
 */
export interface AgentsAdminRuntime {
  getBackendSdkClient: () => SdkworkBackendClient;
}

let runtime: AgentsAdminRuntime | null = null;

export function configureAgentsAdminRuntime(next: AgentsAdminRuntime): void {
  runtime = next;
}

export function getAgentsAdminBackendSdkClient(): SdkworkBackendClient {
  if (!runtime) {
    throw new Error(
      'Agents admin runtime is not configured: call configureAgentsAdminRuntime({ getBackendSdkClient }) before rendering AgentsAdminPage',
    );
  }
  return runtime.getBackendSdkClient();
}

export async function listManagedAgents(
  params?: AgentsAdminListParams,
): Promise<AgentsAdminAgentPage> {
  return getAgentsAdminBackendSdkClient().ai.agents.list(params);
}

export async function createManagedAgent(body: CreateAgentRequest): Promise<AgentRecord> {
  return getAgentsAdminBackendSdkClient().ai.agents.create(body);
}

export async function retrieveManagedAgent(agentId: string): Promise<AgentRecord> {
  return getAgentsAdminBackendSdkClient().ai.agents.retrieve(agentId);
}

export async function updateManagedAgent(
  agentId: string,
  body: UpdateAgentRequest,
): Promise<AgentRecord> {
  return getAgentsAdminBackendSdkClient().ai.agents.update(agentId, body);
}

export async function updateManagedAgentStatus(
  agentId: string,
  body: UpdateAgentStatusRequest,
): Promise<AgentRecord> {
  return getAgentsAdminBackendSdkClient().ai.agents.status.create(agentId, body);
}

export async function restoreManagedAgent(
  agentId: string,
  body: RestoreAgentRequest,
): Promise<AgentRecord> {
  return getAgentsAdminBackendSdkClient().ai.agents.restore(agentId, body);
}
