import {
  AgentsWorkbench,
  configureAgentsWorkbenchRuntime,
} from '@sdkwork/agents-pc/workbench';
import {
  getSdkworkAgentAppSdkClient,
  getSdkworkDriveAppSdkClient,
  getSdkworkMemoryAppSdkClient,
  getSdkworkPromptsAppSdkClient,
} from '@sdkwork/clawroutes-pc-commons/runtime';
import { buildPortalAuthLoginRedirect } from '@sdkwork/clawroutes-pc-commons';
import {
  getClawRouterCouponRechargeService,
  getClawRouterMembershipCheckoutService,
  getClawRouterPointsRechargeService,
} from '@sdkwork/clawroutes-pc-commons/domain-service-providers';

configureAgentsWorkbenchRuntime({
  getAgentsAppSdkClient: getSdkworkAgentAppSdkClient,
  getDriveAppSdkClient: getSdkworkDriveAppSdkClient,
  getMemoryAppSdkClient: getSdkworkMemoryAppSdkClient,
  getPromptsAppSdkClient: getSdkworkPromptsAppSdkClient,
  tokenPlan: {
    checkoutService: getClawRouterMembershipCheckoutService(),
    couponRechargeService: getClawRouterCouponRechargeService(),
    onLoginRequired: () => window.location.assign(buildPortalAuthLoginRedirect(window.location)),
    pointsRechargeService: getClawRouterPointsRechargeService(),
  },
});

export function Playground() {
  return (
    <div className="sdkwork-playground-host flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
      <AgentsWorkbench showSidebarLogo={false} />
    </div>
  );
}

export type { Modality, GenerationModality } from '@sdkwork/generations-pc-playground/react';
