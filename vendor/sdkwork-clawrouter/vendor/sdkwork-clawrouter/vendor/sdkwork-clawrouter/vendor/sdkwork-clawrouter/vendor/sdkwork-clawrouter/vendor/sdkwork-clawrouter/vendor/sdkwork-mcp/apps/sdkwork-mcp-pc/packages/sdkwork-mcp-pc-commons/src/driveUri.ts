import { isBlank, trim } from '@sdkwork/utils';

const DRIVE_URI_PREFIX = 'drive://spaces/';

export function formatDrivePackageRef(spaceId: string, nodeId: string): string {
  const normalizedSpaceId = trim(spaceId);
  const normalizedNodeId = trim(nodeId);
  if (isBlank(normalizedSpaceId) || isBlank(normalizedNodeId)) {
    throw new Error('Drive spaceId and nodeId are required to build package_ref.');
  }
  return `${DRIVE_URI_PREFIX}${normalizedSpaceId}/nodes/${normalizedNodeId}`;
}

export function parseDrivePackageRef(packageRef: string): { spaceId: string; nodeId: string } {
  const normalized = trim(packageRef);
  if (!normalized.startsWith(DRIVE_URI_PREFIX)) {
    throw new Error('package_ref must use drive://spaces/{spaceId}/nodes/{nodeId}');
  }
  const remainder = normalized.slice(DRIVE_URI_PREFIX.length);
  const [spaceId, nodePart] = remainder.split('/nodes/');
  if (isBlank(spaceId) || isBlank(nodePart)) {
    throw new Error('package_ref is missing drive space or node identifiers.');
  }
  return { spaceId, nodeId: nodePart };
}

export function isDrivePackageRef(packageRef: string): boolean {
  try {
    parseDrivePackageRef(packageRef);
    return true;
  } catch {
    return false;
  }
}
