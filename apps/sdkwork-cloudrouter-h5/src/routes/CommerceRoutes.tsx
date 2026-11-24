import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import {
  CloudRouterMembershipI18nProvider,
  MembershipScreen,
  TokenRechargeScreen,
  createMembershipTranslate,
  type TokenRechargeTab,
} from '@sdkwork/cloudrouter-h5-membership';

import { useConsoleRuntime } from '../providers/AppProviders.js';

/**
 * Host adapters for the Cloud Router membership commerce surfaces.
 *
 * `/membership` renders the Cloud Router token-plan membership definition (the
 * same catalog the PC `/token-plan` page reads) in a mobile layout, and
 * `/recharge` renders Token Bank top-up plus membership redemption. Both are
 * stacked commerce screens with their own back/title bar, so they render
 * outside the console tab shell. The host injects only the console locale and
 * the sign-in navigation; the membership package owns the screens, the catalog
 * mapping, and the mobile interaction.
 *
 * The previous placeholder mounted the shared mobile subscription prototype
 * (`VipSubscriptionPage` / `TokenRechargePage` with demo VIP plans and demo
 * SKUs) — those plans are not the Cloud Router membership and have been
 * removed.
 */
function useCommerceHost(from: string) {
  const { locale, translate } = useConsoleRuntime();
  const navigate = useNavigate();
  const t = useMemo(() => createMembershipTranslate(translate), [translate]);
  return {
    locale,
    onSignIn: () => navigate('/sign-in', { state: { from } }),
    t,
  };
}

export function MembershipRoute() {
  const host = useCommerceHost('/membership');
  return (
    <CloudRouterMembershipI18nProvider locale={host.locale}>
      <MembershipScreen onSignIn={host.onSignIn} t={host.t} />
    </CloudRouterMembershipI18nProvider>
  );
}

export function RechargeRoute() {
  const host = useCommerceHost('/recharge');
  const location = useLocation();
  const initialTab: TokenRechargeTab = (location.state as { tab?: string } | null)?.tab === 'coupon'
    ? 'coupon'
    : 'recharge';
  return (
    <CloudRouterMembershipI18nProvider locale={host.locale}>
      <TokenRechargeScreen initialTab={initialTab} onSignIn={host.onSignIn} t={host.t} />
    </CloudRouterMembershipI18nProvider>
  );
}
