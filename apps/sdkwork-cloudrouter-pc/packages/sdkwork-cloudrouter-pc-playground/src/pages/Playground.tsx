import { useLayoutEffect } from 'react';
import {
  AgentsPlayground,
  configureAgentsPlaygroundRuntime,
} from '@sdkwork/agents-pc-playground';
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
import { createPlaygroundBalancePort } from '../playgroundBalancePort';

// Cloud Router is a host of the single Playground package
// (`@sdkwork/agents-pc-playground`): the workbench shell, sidebar tabs, and
// chat/creative surfaces are owned by sdkwork-agents; this adapter only
// binds the host runtime — SDK clients, balance, token plan, login redirect.
configureAgentsPlaygroundRuntime({
  getAgentsAppSdkClient: getSdkworkAgentAppSdkClient,
  getAssetsAppSdkClient: getSdkworkAssetsAppSdkClient,
  getCommunityAppSdkClient: getSdkworkCommunityAppSdkClient,
  getDriveAppSdkClient: getSdkworkDriveAppSdkClient,
  getFeedsOpenSdkClient: getSdkworkFeedsOpenSdkClient,
  getGenerationsAppSdkClient: getSdkworkGenerationsAppSdkClient,
  getMemoryAppSdkClient: getSdkworkMemoryAppSdkClient,
  getPromptsAppSdkClient: getSdkworkPromptsAppSdkClient,
  getSkillsAppSdkClient: getSdkworkSkillsAppSdkClient,
  balance: createPlaygroundBalancePort(),
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
const WORKBENCH_THEME_STORAGE_KEY = 'sdkwork-agents-theme';

/**
 * Keeps the embedded workbench on the portal's color scheme.
 *
 * `@sdkwork/agents-pc` wraps the workbench in its own `ThemeProvider`, which
 * rewrites `<html>`'s `dark`/`light` classes from a workbench-local preference
 * that defaults to `light`. Embedded in the portal that strips the host's
 * resolved theme: a dark portal turned light as soon as `/playground` mounted,
 * and the light palette rendered on top of the dark chrome. Project the host's
 * current mode into the workbench preference before it initializes, then
 * reassert it after the child effects so the host stays authoritative.
 */
function syncEmbeddedWorkbenchTheme(): void {
  if (typeof document === 'undefined') {
    return;
  }

  const root = document.documentElement;
  const resolvedTheme = root.classList.contains('dark') ? 'dark' : 'light';

  try {
    window.localStorage.setItem(WORKBENCH_THEME_STORAGE_KEY, resolvedTheme);
  } catch {
    // Storage can be unavailable in private or embedded contexts; the class
    // projection below still keeps this mount on the host theme.
  }

  root.classList.toggle('dark', resolvedTheme === 'dark');
  root.classList.toggle('light', resolvedTheme === 'light');
}

export function Playground({
  overlayTopInset = DEFAULT_PLAYGROUND_OVERLAY_TOP_INSET,
}: PlaygroundProps) {
  // Runs during render, before `ThemeProvider` reads its stored preference.
  syncEmbeddedWorkbenchTheme();

  // Child effects (the workbench ThemeProvider) run before parent effects, so
  // this reasserts the host theme in the same commit, before the first paint.
  useLayoutEffect(() => {
    syncEmbeddedWorkbenchTheme();
  }, []);

  return (
    <div className="sdkwork-playground-host flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
      {/* The creative (生成) tab renders the dedicated generation page (bottom input,
          creative sidebar session list, and generation history) via @sdkwork/agents-pc-creative.
          It stays visible so inspiration submit routes to the creative generation
          page; the workbench tab registry owns the rest of the composition. */}
      <AgentsPlayground overlayTopInset={overlayTopInset} />
    </div>
  );
}
