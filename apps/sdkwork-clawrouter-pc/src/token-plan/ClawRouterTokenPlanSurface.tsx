import {
  SdkworkSubscriptionCatalogPage,
  sdkworkSubscriptionCatalogHostComponents,
} from '@sdkwork/membership-pc-subscription/catalog';
import { buildPortalAuthLoginRedirect } from '@sdkwork/clawroutes-pc-commons';
import { getClawRouterMembershipCheckoutService } from '@sdkwork/clawroutes-pc-commons/domain-service-providers';

import {
  ClawRouterTokenPlanPointsDetailsModal,
  ClawRouterTokenPlanCheckoutModal,
  ClawRouterTokenPlanPointsPurchaseModal,
  ClawRouterTokenPlanRedeemModal,
} from './ClawRouterTokenPlanCommerceModal.tsx';
import { useTokenPlanMemberSummary } from './tokenPlanMemberSummary.ts';
import { useTokenPlanNotify } from './tokenPlanNotify.tsx';

/**
 * The canonical Claw Router token-plan surface.
 *
 * Keep public and console membership entry points on this shared composition so
 * catalog behavior, host modals, notifications, and visual treatment cannot drift.
 */
export function ClawRouterTokenPlanSurface() {
  const { memberSummary, refreshMembership, setMembershipTierKey } = useTokenPlanMemberSummary();
  const { NotifyOutlet, onNotify } = useTokenPlanNotify();

  return (
    <div className="mx-auto w-full max-w-7xl" data-token-plan-surface>
      <SdkworkSubscriptionCatalogPage
        components={{
          ...sdkworkSubscriptionCatalogHostComponents,
          checkoutModal: ClawRouterTokenPlanCheckoutModal,
          pointsDetailsModal: ClawRouterTokenPlanPointsDetailsModal,
          pointsPurchaseModal: ClawRouterTokenPlanPointsPurchaseModal,
          redeemModal: ClawRouterTokenPlanRedeemModal,
        }}
        checkoutPort={getClawRouterMembershipCheckoutService()}
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
      />
    </div>
  );
}
