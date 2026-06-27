import { isBlank, trim } from '@sdkwork/utils';

export function readRuntimeEnv(name: string): string | undefined {
  const meta = import.meta as ImportMeta & {
    env?: Record<string, string | boolean | undefined>;
  };
  const value = meta.env?.[name];
  return typeof value === 'string' && !isBlank(trim(value)) ? trim(value) : undefined;
}

export function normalizeApiBaseUrl(baseUrl: string): string {
  const normalized = trim(baseUrl);
  if (isBlank(normalized)) {
    return '';
  }
  return normalized.replace(/\/+$/, '');
}

export function resolveMCPDriveSpaceId(): string | undefined {
  return readRuntimeEnv('VITE_SDKWORK_MCP_DRIVE_SPACE_ID');
}

export function resolveMCPDriveParentNodeId(): string | undefined {
  return readRuntimeEnv('VITE_SDKWORK_MCP_DRIVE_PARENT_NODE_ID');
}
