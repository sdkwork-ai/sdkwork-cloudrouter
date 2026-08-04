import {
  ensureSdkworkApiSuccess,
  getSdkworkAppbaseAppSdkClient,
  readApiRecord,
  type ApiRecord,
} from '@sdkwork/cloudroutes-pc-commons/runtime';

export async function fetchCloudRouterAuthRuntimeSettings(): Promise<ApiRecord> {
  const result = await getSdkworkAppbaseAppSdkClient().system.iam.runtime.retrieve();
  ensureSdkworkApiSuccess(result, 'Unable to load Cloud Router auth runtime settings');
  return readApiRecord(result);
}

export async function fetchCloudRouterAuthVerificationPolicy(): Promise<ApiRecord> {
  const result = await getSdkworkAppbaseAppSdkClient().system.iam.verificationPolicy.retrieve();
  ensureSdkworkApiSuccess(result, 'Unable to load Cloud Router auth verification policy');
  return readApiRecord(result);
}
