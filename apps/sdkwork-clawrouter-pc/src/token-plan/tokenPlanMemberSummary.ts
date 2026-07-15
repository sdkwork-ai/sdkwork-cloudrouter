import { useEffect, useMemo, useState } from "react";
import {
  useSdkworkMembershipController,
  useSdkworkMembershipControllerState,
  type SdkworkMembershipSummary,
} from "@sdkwork/membership-pc-membership";

import { usePortalIamSession } from "../auth/usePortalIamSession.ts";

export function resolveMembershipTierKeyFromSummary(summary: SdkworkMembershipSummary): string {
  if (!summary.isAuthenticated || summary.status === "guest" || !summary.isMember) {
    return "none";
  }

  if (summary.currentLevelValue !== null && summary.currentLevelValue >= 2) {
    return "peak";
  }

  return "pro";
}

export function useTokenPlanMemberSummary() {
  const controller = useSdkworkMembershipController();
  const state = useSdkworkMembershipControllerState(controller);
  const [tierOverride, setTierOverride] = useState<string | null>(null);
  const isAuthenticated = usePortalIamSession();

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    if (!state.isBootstrapped && !state.isLoading && !state.lastError) {
      void controller.bootstrap().catch(() => undefined);
    }
  }, [controller, isAuthenticated, state.isBootstrapped, state.isLoading, state.lastError]);

  useEffect(() => {
    function handleWindowFocus() {
      if (!isAuthenticated) {
        return;
      }

      void controller.refresh().catch(() => undefined);
    }

    window.addEventListener("focus", handleWindowFocus);
    return () => window.removeEventListener("focus", handleWindowFocus);
  }, [controller, isAuthenticated]);

  const memberSummary = useMemo(() => {
    if (!isAuthenticated) {
      return null;
    }

    const membershipTierKey = tierOverride ?? resolveMembershipTierKeyFromSummary(state.dashboard.summary);
    return { membershipTierKey };
  }, [isAuthenticated, state.dashboard.summary, tierOverride]);

  return {
    memberSummary,
    setMembershipTierKey: setTierOverride,
    refreshMembership: () => controller.refresh(),
  };
}
