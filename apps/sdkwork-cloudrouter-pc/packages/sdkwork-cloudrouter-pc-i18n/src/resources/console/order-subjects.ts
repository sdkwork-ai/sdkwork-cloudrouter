import type { I18nMessageBundle } from '../types';

/**
 * Canonical order-subject and account-asset display labels for the PC host.
 *
 * These keys mirror the order-domain catalog
 * (`@sdkwork/order-pc-core/subject` → `orders.subject_*` /
 * `orders.target_asset_*`), so every PC host surface that resolves a subject
 * through i18next renders the same label as the order packages' own bundles.
 *
 * Semantics (authority: `sdkwork-order/specs/ACCOUNT_VALUE_ORDER_SPEC.md` §2):
 * - `points` is the **Membership Points** asset.
 * - `token_bank` is the **Token Bank** compute-credit asset (en display:
 *   "Compute Credits"; zh display: "算力额度").
 * - `cash` is withdrawable cash; `subscription` is a membership entitlement and
 *   never an account ledger asset.
 */
export const consoleOrderSubjectMessages = {
  en: {
    'orders.subject_product': 'Product order',
    'orders.subject_virtual_goods': 'Virtual goods order',
    'orders.subject_membership': 'Membership subscription',
    'orders.subject_points_recharge': 'Membership Points recharge',
    'orders.subject_token_bank_recharge': 'Token Bank recharge',
    'orders.subject_token_bank_plan_purchase': 'Token Bank plan purchase',
    'orders.subject_token_bank_plan_renewal': 'Token Bank plan renewal',
    'orders.subject_account_recharge_package': 'Account value package recharge',
    'orders.subject_coupon_recharge': 'Coupon recharge',
    'orders.subject_refund_request': 'Refund request',
    'orders.subject_cash_withdrawal': 'Cash withdrawal',
    'orders.target_asset_token_bank': 'Token Bank',
    'orders.target_asset_points': 'Membership Points',
    'orders.target_asset_cash': 'Cash balance',
    'orders.target_asset_subscription': 'Membership subscription',
  },
  zh: {
    'orders.subject_product': '商品订单',
    'orders.subject_virtual_goods': '虚拟商品订单',
    'orders.subject_membership': '会员订阅',
    'orders.subject_points_recharge': '会员积分充值',
    'orders.subject_token_bank_recharge': 'Token Bank 充值',
    'orders.subject_token_bank_plan_purchase': 'Token Bank 套餐购买',
    'orders.subject_token_bank_plan_renewal': 'Token Bank 套餐续订',
    'orders.subject_account_recharge_package': '账户价值包充值',
    'orders.subject_coupon_recharge': '兑换码充值',
    'orders.subject_refund_request': '退款申请',
    'orders.subject_cash_withdrawal': '提现申请',
    'orders.target_asset_token_bank': 'Token Bank',
    'orders.target_asset_points': '会员积分',
    'orders.target_asset_cash': '现金余额',
    'orders.target_asset_subscription': '会员订阅',
  },
} satisfies I18nMessageBundle;
