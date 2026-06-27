import {
  ensureSdkworkApiSuccess,
  getSdkworkAppbaseAppSdkClient,
  readApiRecord,
  type ApiRecord,
} from '@sdkwork/clawroutes-pc-commons/runtime';

export async function fetchClawRouterAuthRuntimeSettings(): Promise<ApiRecord> {
  const result = await getSdkworkAppbaseAppSdkClient().system.iam.runtime.retrieve();
  ensureSdkworkApiSuccess(result, 'Unable to load Claw Router auth runtime settings');
  return readApiRecord(result);
}

export async function fetchClawRouterAuthVerificationPolicy(): Promise<ApiRecord> {
  const result = await getSdkworkAppbaseAppSdkClient().system.iam.verificationPolicy.retrieve();
  ensureSdkworkApiSuccess(result, 'Unable to load Claw Router auth verification policy');
  return readApiRecord(result);
}
