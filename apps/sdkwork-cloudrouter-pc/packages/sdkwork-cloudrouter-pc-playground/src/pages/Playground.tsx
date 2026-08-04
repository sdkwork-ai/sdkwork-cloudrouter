import {
  AgentsWorkbench,
  configureAgentsWorkbenchRuntime,
} from '@sdkwork/agents-pc/workbench';
import {
  getSdkworkAgentAppSdkClient,
  getSdkworkDriveAppSdkClient,
  getSdkworkMemoryAppSdkClient,
  getSdkworkPromptsAppSdkClient,
} from '@sdkwork/cloudroutes-pc-commons/runtime';
import { buildPortalAuthLoginRedirect } from '@sdkwork/cloudroutes-pc-commons';
import {
  getCloudRouterCouponRechargeService,
  getCloudRouterMembershipCheckoutService,
  getCloudRouterPointsRechargeService,
} from '@sdkwork/cloudroutes-pc-commons/domain-service-providers';

configureAgentsWorkbenchRuntime({
  getAgentsAppSdkClient: getSdkworkAgentAppSdkClient,
  getDriveAppSdkClient: getSdkworkDriveAppSdkClient,
  getMemoryAppSdkClient: getSdkworkMemoryAppSdkClient,
  getPromptsAppSdkClient: getSdkworkPromptsAppSdkClient,
  tokenPlan: {
    checkoutService: getCloudRouterMembershipCheckoutService(),
    couponRechargeService: getCloudRouterCouponRechargeService(),
    onLoginRequired: () => window.location.assign(buildPortalAuthLoginRedirect(window.location)),
    pointsRechargeService: getCloudRouterPointsRechargeService(),
  },
});

export interface PlaygroundProps {
  overlayTopInset?: string;
}

const DEFAULT_PLAYGROUND_OVERLAY_TOP_INSET = 'var(--sdkwork-portal-navbar-height, 4rem)';

export function Playground({
  overlayTopInset = DEFAULT_PLAYGROUND_OVERLAY_TOP_INSET,
}: PlaygroundProps) {
  return (
    <div className="sdkwork-playground-host flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
      <AgentsWorkbench
        overlayTopInset={overlayTopInset}
        showSidebarLogo={false}
      />
    </div>
  );
}

export type { Modality, GenerationModality } from '@sdkwork/generations-pc-playground/react';
