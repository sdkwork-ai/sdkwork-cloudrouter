import { SdkworkMembershipPurchaseHeaderEntry } from "@sdkwork/commerce-pc-membership-purchase";
import { SdkworkWalletHeaderEntry } from "@sdkwork/commerce-pc-wallet";
import type { SdkworkCommerceHostConfig } from "./commerce-host-config.ts";
import { useSdkworkCommerceHostNavigation } from "./commerce-host-navigation-hook.ts";

export interface SdkworkCommerceHostNavbarActionsProps extends SdkworkCommerceHostConfig {}

export function SdkworkCommerceHostNavbarActions({
  routePrefix,
}: SdkworkCommerceHostNavbarActionsProps) {
  const {
    checkoutPath,
    membershipsPath,
    onNavigate,
    walletPath,
  } = useSdkworkCommerceHostNavigation({ routePrefix });

  return (
    <>
      <SdkworkWalletHeaderEntry
        checkoutBasePath={checkoutPath}
        onNavigate={onNavigate}
        onOpenPage={() => {
          onNavigate(walletPath);
        }}
      />
      <SdkworkMembershipPurchaseHeaderEntry
        checkoutBasePath={checkoutPath}
        onNavigate={onNavigate}
        onOpenCenter={() => {
          onNavigate(membershipsPath);
        }}
      />
    </>
  );
}
