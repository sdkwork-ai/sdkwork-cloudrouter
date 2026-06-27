import { createSdkworkIamRuntimeAuthController } from '@sdkwork/auth-pc-react';
import { getClawRouterIamRuntime } from '@sdkwork/clawroutes-pc-commons/runtime';

const AUTH_METHOD_UNAVAILABLE_MESSAGE = 'This Claw Router sign-in method is temporarily unavailable.';

export const clawRouterAuthController = createSdkworkIamRuntimeAuthController({
  getRuntime: getClawRouterIamRuntime,
  methodUnavailableMessage: AUTH_METHOD_UNAVAILABLE_MESSAGE,
});

export type ClawRouterAuthController = typeof clawRouterAuthController;
