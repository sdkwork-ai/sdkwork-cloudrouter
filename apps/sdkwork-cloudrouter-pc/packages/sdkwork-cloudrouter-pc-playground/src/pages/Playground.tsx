import {
  AgentsWorkbench,
  configureAgentsWorkbenchRuntime,
} from '@sdkwork/agents-pc/workbench';
import {
  getSdkworkAgentAppSdkClient,
  getSdkworkAssetsAppSdkClient,
  getSdkworkCommunityAppSdkClient,
  getSdkworkDriveAppSdkClient,
  getSdkworkFeedsOpenSdkClient,
  getSdkworkGenerationsAppSdkClient,
  getSdkworkMemoryAppSdkClient,
  getSdkworkPromptsAppSdkClient,
  getSdkworkSkillsAppSdkClient,
} from '@sdkwork/cloudroutes-pc-commons/runtime';
import { buildPortalAuthLoginRedirect } from '@sdkwork/cloudroutes-pc-commons';
import {
  getCloudRouterCouponRechargeService,
  getCloudRouterMembershipCheckoutService,
  getCloudRouterPointsRechargeService,
} from '@sdkwork/cloudroutes-pc-commons/domain-service-providers';

configureAgentsWorkbenchRuntime({
  getAgentsAppSdkClient: getSdkworkAgentAppSdkClient,
  getAssetsAppSdkClient: getSdkworkAssetsAppSdkClient,
  getCommunityAppSdkClient: getSdkworkCommunityAppSdkClient,
  getDriveAppSdkClient: getSdkworkDriveAppSdkClient,
  getFeedsOpenSdkClient: getSdkworkFeedsOpenSdkClient,
  getGenerationsAppSdkClient: getSdkworkGenerationsAppSdkClient,
  getMemoryAppSdkClient: getSdkworkMemoryAppSdkClient,
  getPromptsAppSdkClient: getSdkworkPromptsAppSdkClient,
  getSkillsAppSdkClient: getSdkworkSkillsAppSdkClient,
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
      {/* The creative (生成) tab renders the dedicated generation page (bottom input,
          creative sidebar session list, and generation history) via @sdkwork/agents-pc-creative.
          It is kept visible and removed from hiddenTabs so that inspiration submit routes to
          the creative generation page instead of the unified chat agent interface.
          presentation stays a hidden local demo surface with no SDKWork API integration. */}
      <AgentsWorkbench
        hiddenTabs={['presentation']}
        overlayTopInset={overlayTopInset}
        showSidebarLogo={false}
      />
    </div>
  );
}

export type { Modality, GenerationModality } from '@sdkwork/generations-pc-playground/react';
