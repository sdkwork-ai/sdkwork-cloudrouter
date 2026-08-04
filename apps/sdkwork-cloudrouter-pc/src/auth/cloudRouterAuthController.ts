import { createSdkworkIamRuntimeAuthController } from '@sdkwork/auth-pc-react';
import { getCloudRouterAuthRuntime } from './cloudRouterAuthRuntime';

const AUTH_METHOD_UNAVAILABLE_MESSAGE = 'This Cloud Router sign-in method is temporarily unavailable.';

export const cloudRouterAuthController = createSdkworkIamRuntimeAuthController({
  getRuntime: getCloudRouterAuthRuntime,
  methodUnavailableMessage: AUTH_METHOD_UNAVAILABLE_MESSAGE,
});

export type CloudRouterAuthController = typeof cloudRouterAuthController;
