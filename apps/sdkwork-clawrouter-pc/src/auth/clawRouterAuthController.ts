import { createSdkworkIamRuntimeAuthController } from '@sdkwork/auth-pc-react';
import { getClawRouterAuthRuntime } from './clawRouterAuthRuntime';

const AUTH_METHOD_UNAVAILABLE_MESSAGE = 'This Claw Router sign-in method is temporarily unavailable.';

export const clawRouterAuthController = createSdkworkIamRuntimeAuthController({
  getRuntime: getClawRouterAuthRuntime,
  methodUnavailableMessage: AUTH_METHOD_UNAVAILABLE_MESSAGE,
});

export type ClawRouterAuthController = typeof clawRouterAuthController;
