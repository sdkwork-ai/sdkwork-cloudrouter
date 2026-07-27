/**
 * Console business surface ownership composed from independent owner SDK clients.
 *
 * | User-facing capability | Domain workspace   | PC package                      | Console route        |
 * |------------------------|--------------------|---------------------------------|----------------------|
 * | Account summary        | sdkwork-account    | @sdkwork/account-pc-wallet      | /console/account     |
 * | Wallet & withdraw      | sdkwork-account    | @sdkwork/account-pc-wallet      | /console/wallet      |
 * | Compute Credits recharge (compat package) | sdkwork-order | @sdkwork/order-pc-recharge | /console/wallet |
 * | Coupons & promo codes  | sdkwork-promotion  | @sdkwork/promotion-pc-coupon    | /console/coupons     |
 * | Membership             | sdkwork-membership | @sdkwork/membership-pc-membership | /console/memberships |
 * | Subscription checkout  | sdkwork-membership | @sdkwork/membership-pc-subscription | /console/checkout |
 * | Payment center         | sdkwork-payment    | @sdkwork/payment-pc-payment     | /console/payment     |
 * | Orders & billing       | sdkwork-order      | @sdkwork/order-pc-order         | /console/settlements |
 */

export const CLAWROUTER_CONSOLE_BUSINESS_DOMAIN_OWNERSHIP = {
  account: {
    capability: 'account-summary',
    domainWorkspace: 'sdkwork-account',
    packageName: '@sdkwork/account-pc-wallet',
    routeSegment: 'account',
  },
  wallet: {
    capability: 'recharge-withdraw',
    domainWorkspace: 'sdkwork-account',
    packageName: '@sdkwork/account-pc-wallet',
    rechargeDomainWorkspace: 'sdkwork-order',
    rechargePackageName: '@sdkwork/order-pc-recharge',
    routeSegment: 'wallet',
  },
  coupons: {
    capability: 'coupon-inventory-and-promotion-code-redeem',
    domainWorkspace: 'sdkwork-promotion',
    packageName: '@sdkwork/promotion-pc-coupon',
    routeSegment: 'coupons',
  },
  memberships: {
    capability: 'membership-plans',
    domainWorkspace: 'sdkwork-membership',
    packageName: '@sdkwork/membership-pc-membership',
    routeSegment: 'memberships',
  },
  checkout: {
    capability: 'subscription-checkout',
    domainWorkspace: 'sdkwork-membership',
    packageName: '@sdkwork/membership-pc-subscription',
    routeSegment: 'checkout',
    hiddenFromSidebar: true,
  },
  payment: {
    capability: 'payment-status',
    domainWorkspace: 'sdkwork-payment',
    packageName: '@sdkwork/payment-pc-payment',
    routeSegment: 'payment',
    hiddenFromSidebar: true,
  },
  settlements: {
    capability: 'order-history',
    domainWorkspace: 'sdkwork-order',
    packageName: '@sdkwork/order-pc-order',
    routeSegment: 'settlements',
  },
} as const;
