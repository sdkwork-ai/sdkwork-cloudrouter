/**
 * Canonical Cloud Router H5 membership route manifest.
 *
 * Both surfaces are stacked commerce screens rendered outside the console tab
 * shell (they own their back/title bar): `/membership` is the mobile token-plan
 * catalog, and `/recharge` is the Token Bank top-up plus membership redemption
 * page the token-plan hero links to. The paths match the entries the console
 * home/profile already navigate to, so no host call site changes.
 */
export const CLOUDROUTER_H5_MEMBERSHIP_ROUTES = {
  membership: {
    id: 'app.commerce.membership',
    path: '/membership',
    screen: 'membership',
    titleKey: 'cloudrouter.console.membership.title',
  },
  recharge: {
    id: 'app.commerce.membership.recharge',
    path: '/recharge',
    screen: 'recharge',
    titleKey: 'cloudrouter.console.membership.rechargePage.title',
  },
} as const satisfies Readonly<
  Record<string, { readonly id: string; readonly path: string; readonly screen: string; readonly titleKey: string }>
>;

export type CloudRouterH5MembershipRouteKey = keyof typeof CLOUDROUTER_H5_MEMBERSHIP_ROUTES;

/** Every membership route this host mounts, in declaration order. */
export const CLOUDROUTER_H5_MEMBERSHIP_ROUTE_LIST = Object.values(
  CLOUDROUTER_H5_MEMBERSHIP_ROUTES,
);
