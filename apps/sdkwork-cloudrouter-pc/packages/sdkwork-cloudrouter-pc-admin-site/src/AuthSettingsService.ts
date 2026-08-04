import type { AdminAuthSettingsUpdateRequest } from '@sdkwork/cloudrouter-pc-admin-core/sdk';
import { getCloudRouterBackendSdkClient } from '@sdkwork/cloudrouter-pc-admin-core/sdk';
import {
  ensureSdkworkApiSuccess,
  readApiRecord,
  type ApiRecord,
} from '@sdkwork/cloudroutes-pc-commons/runtime';

export async function fetchCloudRouterAuthSettings(): Promise<ApiRecord> {
  const result = await getCloudRouterBackendSdkClient().system.auth.settings.retrieve();
  ensureSdkworkApiSuccess(result, 'Unable to load Cloud Router auth settings');
  return readApiRecord(result);
}

export async function updateCloudRouterAuthSettings(
  input: AdminAuthSettingsUpdateRequest,
): Promise<ApiRecord> {
  const result = await getCloudRouterBackendSdkClient().system.auth.settings.update(input);
  ensureSdkworkApiSuccess(result, 'Unable to update Cloud Router auth settings');
  return readApiRecord(result);
}
