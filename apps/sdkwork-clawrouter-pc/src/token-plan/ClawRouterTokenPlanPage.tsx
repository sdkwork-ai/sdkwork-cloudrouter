import {
  SdkworkSubscriptionCatalogPage,
  sdkworkSubscriptionCatalogHostComponents,
} from "@sdkwork/membership-pc-subscription/catalog";

import {
  ClawRouterTokenPlanPointsDetailsModal,
  ClawRouterTokenPlanPointsPurchaseModal,
  ClawRouterTokenPlanRedeemModal,
} from "./ClawRouterTokenPlanCommerceModal.tsx";
import { useTokenPlanMemberSummary } from "./tokenPlanMemberSummary.ts";
import { useTokenPlanNotify } from "./tokenPlanNotify.tsx";

export function ClawRouterTokenPlanPage() {
  const { memberSummary, refreshMembership, setMembershipTierKey } = useTokenPlanMemberSummary();
  const { NotifyOutlet, onNotify } = useTokenPlanNotify();

  return (
    <div className="mx-auto w-full max-w-7xl">
      <SdkworkSubscriptionCatalogPage
        components={{
          ...sdkworkSubscriptionCatalogHostComponents,
          pointsDetailsModal: ClawRouterTokenPlanPointsDetailsModal,
          pointsPurchaseModal: ClawRouterTokenPlanPointsPurchaseModal,
          redeemModal: ClawRouterTokenPlanRedeemModal,
        }}
        memberSummary={memberSummary}
        notifyOutlet={NotifyOutlet}
        onMembershipTierUpdated={(membershipTierKey, _durationDays) => {
          setMembershipTierKey(membershipTierKey);
          void refreshMembership().catch(() => undefined);
        }}
        onNotify={onNotify}
      />
    </div>
  );
}
