import { TicketPercent } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { ClawRouterNavbarWalletEntry } from './ClawRouterNavbarWalletEntry.tsx';
import { CLAW_ROUTER_COMMERCE_ACTION_CLASS } from './consoleCommerceTheme.ts';
import { useConsoleBusinessNavigation } from './consoleBusinessNavigation.ts';
import type { ClawRouterConsoleBusinessHostConfig } from './consoleBusinessConfig.ts';

export interface ClawRouterConsoleBusinessNavbarActionsProps
  extends ClawRouterConsoleBusinessHostConfig {
  isDark: boolean;
}

export function ClawRouterConsoleBusinessNavbarActions({
  isDark,
  routePrefix,
}: ClawRouterConsoleBusinessNavbarActionsProps) {
  const { t } = useTranslation();
  const {
    couponsPath,
    onNavigate,
  } = useConsoleBusinessNavigation({ routePrefix });

  return (
    <>
      <ClawRouterNavbarWalletEntry isDark={isDark} routePrefix={routePrefix} />
      <button
        className={CLAW_ROUTER_COMMERCE_ACTION_CLASS}
        onClick={() => {
          onNavigate(couponsPath);
        }}
        type="button"
      >
        <TicketPercent className="h-4 w-4" aria-hidden="true" />
        <span>{t('console.navbar.coupons', 'Coupons')}</span>
      </button>
    </>
  );
}
