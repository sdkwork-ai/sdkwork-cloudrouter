import type { AdminAuthSettingsUpdateRequest } from '@sdkwork/clawrouter-backend-sdk';
import {
  ensureSdkworkApiSuccess,
  getClawRouterBackendSdkClient,
  readApiRecord,
  type ApiRecord,
} from '@sdkwork/clawroutes-pc-commons/runtime';

export async function fetchClawRouterAuthSettings(): Promise<ApiRecord> {
  const result = await getClawRouterBackendSdkClient().system.auth.settings.retrieve();
  ensureSdkworkApiSuccess(result, 'Unable to load Claw Router auth settings');
  return readApiRecord(result);
}

export async function updateClawRouterAuthSettings(
  input: AdminAuthSettingsUpdateRequest,
): Promise<ApiRecord> {
  const result = await getClawRouterBackendSdkClient().system.auth.settings.update(input);
  ensureSdkworkApiSuccess(result, 'Unable to update Claw Router auth settings');
  return readApiRecord(result);
}
