import {
  AgentsWorkbench,
  configureAgentsWorkbenchRuntime,
} from '@sdkwork/agents-pc/workbench';
import { configureFeedsOpenSdkClientProvider } from '@sdkwork/agents-pc-core/sdk/feedsOpenSdkClient';
import {
  getSdkworkAgentAppSdkClient,
  getSdkworkAssetsAppSdkClient,
  getSdkworkCommunityAppSdkClient,
  getSdkworkDriveAppSdkClient,
  getSdkworkFeedsOpenSdkClient,
  getSdkworkGenerationsAppSdkClient,
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
  getAssetsAppSdkClient: getSdkworkAssetsAppSdkClient,
  getCommunityAppSdkClient: getSdkworkCommunityAppSdkClient,
  getDriveAppSdkClient: getSdkworkDriveAppSdkClient,
  getGenerationsAppSdkClient: getSdkworkGenerationsAppSdkClient,
  getMemoryAppSdkClient: getSdkworkMemoryAppSdkClient,
  getPromptsAppSdkClient: getSdkworkPromptsAppSdkClient,
  tokenPlan: {
    checkoutService: getCloudRouterMembershipCheckoutService(),
    couponRechargeService: getCloudRouterCouponRechargeService(),
    onLoginRequired: () => window.location.assign(buildPortalAuthLoginRedirect(window.location)),
    pointsRechargeService: getCloudRouterPointsRechargeService(),
  },
});
configureFeedsOpenSdkClientProvider(getSdkworkFeedsOpenSdkClient);

export interface PlaygroundProps {
  overlayTopInset?: string;
}

const DEFAULT_PLAYGROUND_OVERLAY_TOP_INSET = 'var(--sdkwork-portal-navbar-height, 4rem)';

export function Playground({
  overlayTopInset = DEFAULT_PLAYGROUND_OVERLAY_TOP_INSET,
}: PlaygroundProps) {
  return (
    <div className="sdkwork-playground-host flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
      {/* The creative (生成) tab calls the generations app API surface, which has
          no backend anywhere yet (sdkwork-generations owns the contract but ships no
          server crates). Hide the tab instead of surfacing 404s until the backend lands. */}
      <AgentsWorkbench
        hiddenTabs={['creative']}
        overlayTopInset={overlayTopInset}
        showSidebarLogo={false}
      />
    </div>
  );
}

export type { Modality, GenerationModality } from '@sdkwork/generations-pc-playground/react';
