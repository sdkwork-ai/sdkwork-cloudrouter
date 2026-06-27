import { Crown, TicketPercent } from 'lucide-react';
import { SdkworkWalletHeaderEntry } from '@sdkwork/account-pc-wallet';

import { useConsoleBusinessNavigation } from './consoleBusinessNavigation.ts';
import type { ClawRouterConsoleBusinessHostConfig } from './consoleBusinessConfig.ts';

export interface ClawRouterConsoleBusinessNavbarActionsProps
  extends ClawRouterConsoleBusinessHostConfig {}

export function ClawRouterConsoleBusinessNavbarActions({
  routePrefix,
}: ClawRouterConsoleBusinessNavbarActionsProps) {
  const {
    checkoutPath,
    couponsPath,
    membershipsPath,
    onNavigate,
    walletPath,
  } = useConsoleBusinessNavigation({ routePrefix });

  return (
    <>
      <SdkworkWalletHeaderEntry
        checkoutBasePath={checkoutPath}
        onNavigate={onNavigate}
        onOpenPage={() => {
          onNavigate(walletPath);
        }}
        rechargeFlow="direct"
      />
      <button
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
        onClick={() => {
          onNavigate(couponsPath);
        }}
        type="button"
      >
        <TicketPercent className="h-4 w-4" />
        <span>Coupons</span>
      </button>
      <button
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
        onClick={() => {
          onNavigate(membershipsPath);
        }}
        type="button"
      >
        <Crown className="h-4 w-4" />
        <span>Membership</span>
      </button>
    </>
  );
}
