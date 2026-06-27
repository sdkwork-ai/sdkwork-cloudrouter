import {
  ensureSdkworkApiSuccess,
  getSdkworkAgentBackendSdkClient,
  readApiData,
} from '@sdkwork/clawroutes-pc-commons/runtime';

function readSkillIdsFromAgentRecord(record: Record<string, unknown>): string[] {
  const profile = record.managementProfile;
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) {
    return [];
  }
  const skillIds = (profile as Record<string, unknown>).skillIds;
  if (!Array.isArray(skillIds)) {
    return [];
  }
  return skillIds
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map((value) => value.trim());
}

export async function listAgentSkillBindings() {
  const result = await getSdkworkAgentBackendSdkClient().ai.agents.list({
    page: '1',
    pageSize: '200',
  });
  ensureSdkworkApiSuccess(result, 'Failed to load agent skill bindings');
  const payload = readApiData(result) ?? result;
  const agents = Array.isArray((payload as { items?: unknown }).items)
    ? (payload as { items: Record<string, unknown>[] }).items
    : Array.isArray(payload)
      ? (payload as Record<string, unknown>[])
      : [];

  const items = agents.flatMap((agent) => {
    const agentId = String(agent.agentId ?? agent.id ?? '');
    const displayName = String(agent.displayName ?? agent.code ?? agentId);
    return readSkillIdsFromAgentRecord(agent).map((skillId) => ({
      id: `${agentId}:${skillId}`,
      agentId,
      agentDisplayName: displayName,
      skillId,
      bindingScope: 'managementProfile',
    }));
  });

  return { items };
}
