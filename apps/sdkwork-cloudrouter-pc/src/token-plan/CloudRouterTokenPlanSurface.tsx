import {
  SdkworkSubscriptionCatalogPage,
  sdkworkSubscriptionCatalogHostComponents,
  type SdkworkSubscriptionCatalogTeamProps,
} from '@sdkwork/membership-pc-subscription/catalog';
import { buildPortalAuthLoginRedirect } from '@sdkwork/cloudroutes-pc-commons';
import { getCloudRouterMembershipCheckoutService } from '@sdkwork/cloudroutes-pc-commons/domain-service-providers';

import {
  CloudRouterTokenPlanTokenBankDetailsModal,
  CloudRouterTokenPlanCheckoutModal,
  CloudRouterTokenPlanTokenBankPurchaseModal,
  CloudRouterTokenPlanRedeemModal,
} from './CloudRouterTokenPlanCommerceModal.tsx';
import { useTokenPlanMemberSummary } from './tokenPlanMemberSummary.ts';
import { useTokenPlanNotify } from './tokenPlanNotify.tsx';

export interface CloudRouterTokenPlanSurfaceProps {
  /**
   * Organization (team) capability handed to the shared catalog page.
   *
   * The public token-plan page supplies the team port so the audience switch
   * appears; the console membership page omits it and stays personal-only.
   */
  team?: SdkworkSubscriptionCatalogTeamProps;
}

/**
 * The canonical Cloud Router token-plan surface.
 *
 * Keep public and console membership entry points on this shared composition so
 * catalog behavior, host modals, notifications, and visual treatment cannot drift.
 */
export function CloudRouterTokenPlanSurface({ team }: CloudRouterTokenPlanSurfaceProps) {
  const { memberSummary, refreshMembership, setMembershipTierKey } = useTokenPlanMemberSummary();
  const { NotifyOutlet, onNotify } = useTokenPlanNotify();

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 md:px-6 lg:px-8" data-token-plan-surface>
      <SdkworkSubscriptionCatalogPage
        components={{
          ...sdkworkSubscriptionCatalogHostComponents,
          checkoutModal: CloudRouterTokenPlanCheckoutModal,
          pointsDetailsModal: CloudRouterTokenPlanTokenBankDetailsModal,
          pointsPurchaseModal: CloudRouterTokenPlanTokenBankPurchaseModal,
          redeemModal: CloudRouterTokenPlanRedeemModal,
        }}
        checkoutPort={getCloudRouterMembershipCheckoutService()}
        memberSummary={memberSummary}
        notifyOutlet={NotifyOutlet}
        onLoginRequired={() => {
          const redirectTo = buildPortalAuthLoginRedirect(window.location);
          window.location.assign(redirectTo);
        }}
        onMembershipTierUpdated={(membershipTierKey, _durationDays) => {
          setMembershipTierKey(membershipTierKey);
          void refreshMembership().catch(() => undefined);
        }}
        onNotify={onNotify}
        team={team}
      />
    </div>
  );
}
