import {
  ensureSdkworkApiSuccess,
  getSdkworkAgentBackendSdkClient,
  readApiData,
  readApiItems,
} from '@sdkwork/clawroutes-pc-commons/runtime';

export const DEFAULT_AGENT_PAGE_PARAMS = {
  page: '1',
  pageSize: '100',
} as const;

export async function listManagedAgents(params?: { page?: string; pageSize?: string; q?: string }) {
  const result = await getSdkworkAgentBackendSdkClient().ai.agents.list({
    page: params?.page ?? DEFAULT_AGENT_PAGE_PARAMS.page,
    pageSize: params?.pageSize ?? DEFAULT_AGENT_PAGE_PARAMS.pageSize,
    q: params?.q,
  });
  ensureSdkworkApiSuccess(result, 'Failed to load managed agents');
  const payload = readApiData(result) ?? result;
  return { items: readApiItems(payload) };
}
