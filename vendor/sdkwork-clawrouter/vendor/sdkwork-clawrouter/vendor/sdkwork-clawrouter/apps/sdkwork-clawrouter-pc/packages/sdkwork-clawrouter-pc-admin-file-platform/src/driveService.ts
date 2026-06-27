import {
  ensureSdkworkApiSuccess,
  getSdkworkDriveAppSdkClient,
  readApiData,
  readApiItems,
} from '@sdkwork/clawroutes-pc-commons/runtime';

async function resolveFirstDriveNodeId(): Promise<string | null> {
  const spaces = await listDriveSpaces();
  const firstSpace = spaces.items[0] as Record<string, unknown> | undefined;
  const firstSpaceId = String(firstSpace?.spaceId ?? firstSpace?.id ?? '').trim();
  if (!firstSpaceId) {
    return null;
  }
  const nodes = await listDriveNodes(firstSpaceId);
  const firstNode = nodes.items[0] as Record<string, unknown> | undefined;
  const firstNodeId = String(firstNode?.nodeId ?? firstNode?.id ?? '').trim();
  return firstNodeId || null;
}

export async function listDriveSpaces() {
  const result = await getSdkworkDriveAppSdkClient().drive.spaces.list();
  ensureSdkworkApiSuccess(result, 'Failed to load drive spaces');
  const payload = readApiData(result) ?? result;
  return { items: readApiItems(payload) };
}

export async function listDriveNodes(spaceId: string) {
  const result = await getSdkworkDriveAppSdkClient().drive.nodes.list(spaceId);
  ensureSdkworkApiSuccess(result, 'Failed to load drive nodes');
  const payload = readApiData(result) ?? result;
  return { items: readApiItems(payload) };
}

export async function listDrivePermissions(nodeId?: string) {
  const resolvedNodeId = nodeId?.trim() || (await resolveFirstDriveNodeId());
  if (!resolvedNodeId) {
    return { items: [] };
  }
  const result = await getSdkworkDriveAppSdkClient().drive.permissions.list(resolvedNodeId);
  ensureSdkworkApiSuccess(result, 'Failed to load drive permissions');
  const payload = readApiData(result) ?? result;
  return { items: readApiItems(payload) };
}

export async function listDriveShareLinks(nodeId?: string) {
  const resolvedNodeId = nodeId?.trim() || (await resolveFirstDriveNodeId());
  if (!resolvedNodeId) {
    return { items: [] };
  }
  const result = await getSdkworkDriveAppSdkClient().drive.shareLinks.list(resolvedNodeId);
  ensureSdkworkApiSuccess(result, 'Failed to load drive share links');
  const payload = readApiData(result) ?? result;
  return { items: readApiItems(payload) };
}

export async function listDriveAuditEvents() {
  return { items: [] };
}
