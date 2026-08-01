import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BadgePercent,
  Barcode,
  Boxes,
  FileClock,
  Link2,
  ListTree,
  RadioTower,
  ReceiptText,
  Ticket,
  TrendingUp,
  WalletCards,
} from 'lucide-react';
import {
  AdminResourceCenter,
  type AdminResourceLoadParams,
  type AdminResourceSection,
} from '@sdkwork/clawroutes-pc-commons';
import {
  MarketingService,
  backendPromotionBudgetLedgerEntriesList,
  backendPromotionCodeRedemptionsList,
  backendPromotionCodesList,
  backendPromotionCouponLedgerEntriesList,
  backendPromotionCouponStocksList,
  backendPromotionDiscountAllocationsList,
  backendPromotionDiscountApplicationsList,
  backendPromotionEventsList,
  backendPromotionExternalBindingsList,
  backendPromotionOffersList,
  backendPromotionUserCouponsList,
} from './marketingService';

type MarketingAdminTab =
  | 'promotionOffers'
  | 'promotionCouponStocks'
  | 'promotionCodes'
  | 'promotionCodeRedemptions'
  | 'userCoupons'
  | 'discountApplications'
  | 'discountAllocations'
  | 'promotionCouponLedger'
  | 'budgetLedger'
  | 'externalBindings'
  | 'promotionEvents'
  | 'referrals';
type MarketingAdminGroup = string;

type MarketingAdminProps = {
  sectionId?: string;
};

const MARKETING_LIST_PAGINATION = {
  initialPageSize: 20,
  pageSizeOptions: [20, 50, 100],
};
const DEFAULT_MARKETING_SECTION_ID: MarketingAdminTab = 'promotionOffers';

function resolveMarketingSectionId(sectionId: string | undefined): MarketingAdminTab {
  if (
    sectionId === 'promotionOffers'
    || sectionId === 'promotionCouponStocks'
    || sectionId === 'promotionCodes'
    || sectionId === 'promotionCodeRedemptions'
    || sectionId === 'userCoupons'
    || sectionId === 'discountApplications'
    || sectionId === 'discountAllocations'
    || sectionId === 'promotionCouponLedger'
    || sectionId === 'budgetLedger'
    || sectionId === 'externalBindings'
    || sectionId === 'promotionEvents'
    || sectionId === 'referrals'
  ) {
    return sectionId;
  }
  return DEFAULT_MARKETING_SECTION_ID;
}

function buildMarketingSections(t: ReturnType<typeof useTranslation>['t']): AdminResourceSection<MarketingAdminTab, MarketingAdminGroup>[] {
  const sections: AdminResourceSection<MarketingAdminTab, MarketingAdminGroup>[] = [
    {
      id: 'promotionOffers',
      title: t('admin.marketing.promotions.offers.title', 'Promotion Offers'),
      description: t('admin.marketing.promotions.offers.desc', 'Canonical promotion definitions with type, lifecycle state, validity, audience, and scope policy.'),
      icon: <BadgePercent className="h-4 w-4" />,
      group: t('admin.marketing.promotions.group.design', 'Offer Design'),
      load: (params) => backendPromotionOffersList(params),
      columns: [
        { key: 'offer_no', label: t('admin.col.offer', 'Offer') },
        { key: 'offer_code', label: t('admin.col.offerCode', 'Code') },
        { key: 'name', label: t('admin.col.name', 'Name') },
        { key: 'offer_type', label: t('admin.col.type', 'Type') },
        { key: 'audience_scope', label: t('admin.col.audience', 'Audience') },
        { key: 'combinability', label: t('admin.col.combinability', 'Combinability') },
        { key: 'status', label: t('admin.col.status', 'Status') },
        { key: 'starts_at', label: t('admin.col.starts', 'Starts') },
        { key: 'ends_at', label: t('admin.col.ends', 'Ends') },
      ],
      searchFields: ['offer_no', 'offer_code', 'name', 'offer_type', 'audience_scope', 'combinability', 'status'],
    },
    {
      id: 'promotionCouponStocks',
      title: t('admin.marketing.promotions.stocks.title', 'Promotion Coupon Stocks'),
      description: t('admin.marketing.promotions.stocks.desc', 'Issuable stock pools with code mode, issue channel, availability, activation state, resend policy, and lifecycle status.'),
      icon: <Boxes className="h-4 w-4" />,
      group: t('admin.marketing.promotions.group.issuance', 'Issuance'),
      load: (params) => backendPromotionCouponStocksList(params),
      columns: [
        { key: 'stock_no', label: t('admin.col.stock', 'Stock') },
        { key: 'code_mode', label: t('admin.col.codeMode', 'Code Mode') },
        { key: 'issue_channel', label: t('admin.col.channel', 'Channel') },
        { key: 'currency_code', label: t('admin.col.currency', 'Currency') },
        { key: 'available_quantity', label: t('admin.col.available', 'Available'), align: 'right' },
        { key: 'claimed_quantity', label: t('admin.col.claimed', 'Claimed'), align: 'right' },
        { key: 'activation_status', label: t('admin.col.activation', 'Activation') },
        { key: 'can_resend', label: t('admin.col.resend', 'Resend') },
        { key: 'status', label: t('admin.col.status', 'Status') },
      ],
      searchFields: ['stock_no', 'code_mode', 'issue_channel', 'currency_code', 'activation_status', 'status'],
    },
    {
      id: 'promotionCodes',
      title: t('admin.marketing.promotions.promotionCodes.title', 'Promotion Codes'),
      description: t('admin.marketing.promotions.promotionCodes.desc', 'Hashed promotion exchange codes with safe suffix display, claim-code binding, stock identity, activation, resend, and claim state.'),
      icon: <Barcode className="h-4 w-4" />,
      group: t('admin.marketing.promotions.group.issuance', 'Issuance'),
      load: (params) => backendPromotionCodesList(params),
      columns: [
        { key: 'code_no', label: t('admin.col.codeNo', 'Code No') },
        { key: 'promotion_code_last4', label: t('admin.col.code', 'Code') },
        { key: 'claim_code_suffix', label: t('admin.col.claimCode', 'Claim Code') },
        { key: 'stock_id', label: t('admin.col.stock', 'Stock') },
        { key: 'code_type', label: t('admin.col.type', 'Type') },
        { key: 'currency_code', label: t('admin.col.currency', 'Currency') },
        { key: 'claimed_quantity', label: t('admin.col.claimed', 'Claimed'), align: 'right' },
        { key: 'activation_status', label: t('admin.col.activation', 'Activation') },
        { key: 'can_resend', label: t('admin.col.resend', 'Resend') },
        { key: 'status', label: t('admin.col.status', 'Status') },
      ],
      searchFields: ['code_no', 'promotion_code_last4', 'claim_code_suffix', 'stock_id', 'code_type', 'currency_code', 'activation_status', 'status'],
    },
    {
      id: 'promotionCodeRedemptions',
      title: t('admin.marketing.promotions.promotionCodeRedemptions.title', 'Promotion Code Redemptions'),
      description: t('admin.marketing.promotions.promotionCodeRedemptions.desc', 'Promotion code exchange outcomes that create user coupon instances or direct benefits and write lifecycle evidence.'),
      icon: <Ticket className="h-4 w-4" />,
      group: t('admin.marketing.promotions.group.issuance', 'Issuance'),
      load: (params) => backendPromotionCodeRedemptionsList(params),
      columns: [
        { key: 'redemption_no', label: t('admin.col.redemption', 'Redemption') },
        { key: 'submitted_code_suffix', label: t('admin.col.code', 'Code') },
        { key: 'stock_id', label: t('admin.col.stock', 'Stock') },
        { key: 'owner_user_id', label: t('admin.col.user', 'User') },
        { key: 'currency_code', label: t('admin.col.currency', 'Currency') },
        { key: 'result_status', label: t('admin.col.result', 'Result') },
        { key: 'failure_code', label: t('admin.col.failureCode', 'Failure') },
        { key: 'redemption_channel', label: t('admin.col.channel', 'Channel') },
        { key: 'occurred_at', label: t('admin.col.occurredAt', 'Occurred At') },
      ],
      searchFields: ['redemption_no', 'submitted_code_suffix', 'stock_id', 'owner_user_id', 'currency_code', 'result_status', 'failure_code', 'redemption_channel'],
    },
    {
      id: 'userCoupons',
      title: t('admin.marketing.promotions.userCoupons.title', 'User Coupons'),
      description: t('admin.marketing.promotions.userCoupons.desc', 'Wallet coupon instances with claim, lock, application, settlement, return, expiry, and disable lifecycle state.'),
      icon: <WalletCards className="h-4 w-4" />,
      group: t('admin.marketing.promotions.group.wallet', 'Wallet Lifecycle'),
      load: (params) => backendPromotionUserCouponsList(params),
      columns: [
        { key: 'coupon_no', label: t('admin.col.coupon', 'Coupon') },
        { key: 'coupon_code_suffix', label: t('admin.col.code', 'Code') },
        { key: 'claim_code_suffix', label: t('admin.col.claimCode', 'Claim Code') },
        { key: 'owner_user_id', label: t('admin.col.user', 'User') },
        { key: 'face_value_minor', label: t('admin.col.faceValue', 'Face Value'), align: 'right' },
        { key: 'currency_code', label: t('admin.col.currency', 'Currency') },
        { key: 'verify_method', label: t('admin.col.verifyMethod', 'Verify') },
        { key: 'activation_status', label: t('admin.col.activation', 'Activation') },
        { key: 'status', label: t('admin.col.status', 'Status') },
        { key: 'expires_at', label: t('admin.col.expires', 'Expires') },
      ],
      searchFields: ['coupon_no', 'coupon_code_suffix', 'claim_code_suffix', 'owner_user_id', 'currency_code', 'verify_method', 'activation_status', 'status'],
    },
    {
      id: 'discountApplications',
      title: t('admin.marketing.promotions.discountApplications.title', 'Discount Applications'),
      description: t('admin.marketing.promotions.discountApplications.desc', 'Checkout reservations, applications, settlements, releases, and reversals tied to orders and payments.'),
      icon: <ReceiptText className="h-4 w-4" />,
      group: t('admin.marketing.promotions.group.redemption', 'Redemption'),
      load: (params) => backendPromotionDiscountApplicationsList(params),
      columns: [
        { key: 'application_no', label: t('admin.col.application', 'Application') },
        { key: 'order_no', label: t('admin.col.order', 'Order') },
        { key: 'user_coupon_id', label: t('admin.col.coupon', 'Coupon') },
        { key: 'discount_amount_minor', label: t('admin.col.discount', 'Discount'), align: 'right' },
        { key: 'currency_code', label: t('admin.col.currency', 'Currency') },
        { key: 'status', label: t('admin.col.status', 'Status') },
        { key: 'failure_code', label: t('admin.col.failureCode', 'Failure') },
        { key: 'settled_at', label: t('admin.col.settledAt', 'Settled At') },
      ],
      searchFields: ['application_no', 'order_no', 'order_id', 'user_coupon_id', 'currency_code', 'status', 'failure_code'],
    },
    {
      id: 'discountAllocations',
      title: t('admin.marketing.promotions.discountAllocations.title', 'Discount Allocations'),
      description: t('admin.marketing.promotions.discountAllocations.desc', 'Immutable item-level discount evidence for refunds, invoice allocation, accounting, and analytics.'),
      icon: <ListTree className="h-4 w-4" />,
      group: t('admin.marketing.promotions.group.redemption', 'Redemption'),
      load: (params) => backendPromotionDiscountAllocationsList(params),
      columns: [
        { key: 'application_id', label: t('admin.col.application', 'Application') },
        { key: 'order_id', label: t('admin.col.order', 'Order') },
        { key: 'order_item_id', label: t('admin.col.orderItem', 'Order Item') },
        { key: 'sku_id', label: t('admin.col.sku', 'SKU') },
        { key: 'allocation_amount_minor', label: t('admin.col.discount', 'Discount'), align: 'right' },
        { key: 'currency_code', label: t('admin.col.currency', 'Currency') },
        { key: 'allocation_ratio_bps', label: t('admin.col.ratio', 'Ratio'), align: 'right' },
        { key: 'created_at', label: t('admin.col.created', 'Created') },
      ],
      searchFields: ['application_id', 'order_id', 'order_item_id', 'sku_id', 'currency_code'],
    },
    {
      id: 'promotionCouponLedger',
      title: t('admin.marketing.promotions.promotionCouponLedger.title', 'Promotion Coupon Ledger'),
      description: t('admin.marketing.promotions.promotionCouponLedger.desc', 'Append-only evidence for stock creation, claim, lock, release, redeem, return, expire, disable, and adjustment.'),
      icon: <FileClock className="h-4 w-4" />,
      group: t('admin.marketing.promotions.group.ledger', 'Ledger'),
      load: (params) => backendPromotionCouponLedgerEntriesList(params),
      columns: [
        { key: 'ledger_no', label: t('admin.col.entry', 'Entry') },
        { key: 'business_type', label: t('admin.col.type', 'Type') },
        { key: 'direction', label: t('admin.col.direction', 'Direction') },
        { key: 'stock_id', label: t('admin.col.stock', 'Stock') },
        { key: 'user_coupon_id', label: t('admin.col.coupon', 'Coupon') },
        { key: 'quantity_delta', label: t('admin.col.quantity', 'Quantity'), align: 'right' },
        { key: 'balance_after', label: t('admin.col.balance', 'Balance'), align: 'right' },
        { key: 'occurred_at', label: t('admin.col.occurredAt', 'Occurred At') },
      ],
      searchFields: ['ledger_no', 'business_type', 'direction', 'stock_id', 'user_coupon_id', 'source_type', 'source_id'],
    },
    {
      id: 'budgetLedger',
      title: t('admin.marketing.promotions.budgetLedger.title', 'Budget Ledger'),
      description: t('admin.marketing.promotions.budgetLedger.desc', 'Append-only budget reserve, release, consume, reverse, and adjustment records.'),
      icon: <WalletCards className="h-4 w-4" />,
      group: t('admin.marketing.promotions.group.ledger', 'Ledger'),
      load: (params) => backendPromotionBudgetLedgerEntriesList(params),
      columns: [
        { key: 'ledger_no', label: t('admin.col.entry', 'Entry') },
        { key: 'budget_account_id', label: t('admin.col.budget', 'Budget') },
        { key: 'business_type', label: t('admin.col.type', 'Type') },
        { key: 'direction', label: t('admin.col.direction', 'Direction') },
        { key: 'amount_delta_minor', label: t('admin.col.amount', 'Amount'), align: 'right' },
        { key: 'balance_amount_minor', label: t('admin.col.balance', 'Balance'), align: 'right' },
        { key: 'currency_code', label: t('admin.col.currency', 'Currency') },
        { key: 'occurred_at', label: t('admin.col.occurredAt', 'Occurred At') },
      ],
      searchFields: ['ledger_no', 'budget_account_id', 'business_type', 'direction', 'currency_code', 'source_type', 'source_id'],
    },
    {
      id: 'externalBindings',
      title: t('admin.marketing.promotions.externalBindings.title', 'External Bindings'),
      description: t('admin.marketing.promotions.externalBindings.desc', 'WeChat, Alipay, partner, and payment-platform card bindings with platform IDs, safe claim-code suffix, and sync state.'),
      icon: <Link2 className="h-4 w-4" />,
      group: t('admin.marketing.promotions.group.integration', 'Integration'),
      load: (params) => backendPromotionExternalBindingsList(params),
      columns: [
        { key: 'binding_no', label: t('admin.col.binding', 'Binding') },
        { key: 'platform', label: t('admin.col.platform', 'Platform') },
        { key: 'platform_template_id', label: t('admin.col.platformTemplate', 'Template') },
        { key: 'platform_stock_id', label: t('admin.col.platformStock', 'Stock') },
        { key: 'platform_coupon_id', label: t('admin.col.platformCoupon', 'Coupon') },
        { key: 'claim_code_suffix', label: t('admin.col.claimCode', 'Claim Code') },
        { key: 'external_currency_code', label: t('admin.col.currency', 'Currency') },
        { key: 'sync_status', label: t('admin.col.syncStatus', 'Sync Status') },
        { key: 'last_sync_at', label: t('admin.col.syncedAt', 'Synced At') },
      ],
      searchFields: ['binding_no', 'platform', 'platform_template_id', 'platform_stock_id', 'platform_coupon_id', 'claim_code_suffix', 'external_currency_code', 'sync_status'],
    },
    {
      id: 'promotionEvents',
      title: t('admin.marketing.promotions.events.title', 'Promotion Events'),
      description: t('admin.marketing.promotions.events.desc', 'Outbox events for lifecycle publishing, retry, dead-letter handling, and downstream synchronization.'),
      icon: <RadioTower className="h-4 w-4" />,
      group: t('admin.marketing.promotions.group.integration', 'Integration'),
      load: (params) => backendPromotionEventsList(params),
      columns: [
        { key: 'event_no', label: t('admin.col.event', 'Event') },
        { key: 'event_type', label: t('admin.col.type', 'Type') },
        { key: 'aggregate_type', label: t('admin.col.aggregate', 'Aggregate') },
        { key: 'aggregate_id', label: t('admin.col.aggregateId', 'Aggregate ID') },
        { key: 'event_version', label: t('admin.col.version', 'Version'), align: 'right' },
        { key: 'status', label: t('admin.col.status', 'Status') },
        { key: 'occurred_at', label: t('admin.col.occurredAt', 'Occurred At') },
        { key: 'published_at', label: t('admin.col.publishedAt', 'Published At') },
        { key: 'next_retry_at', label: t('admin.col.nextRetryAt', 'Next Retry') },
      ],
      searchFields: ['event_no', 'event_type', 'aggregate_type', 'aggregate_id', 'status'],
    },
    {
      id: 'referrals',
      title: t('admin.commerce.marketing.referralStats.title', 'Referral Stats'),
      description: t('admin.commerce.marketing.referralStats.desc', 'Invite links, successful invitations, revenue contribution, and awarded bonuses.'),
      icon: <TrendingUp className="h-4 w-4" />,
      group: t('admin.marketing.promotions.group.growth', 'Growth'),
      load: (params) => MarketingService.fetchReferralStats(params),
      columns: [
        { key: 'inviter', label: t('admin.commerce.marketing.referralStats.col.inviter', 'Inviter') },
        { key: 'link', label: t('admin.commerce.marketing.referralStats.col.link', 'Referral Link') },
        { key: 'total_invited', label: t('admin.commerce.marketing.referralStats.col.invited', 'Invited'), align: 'right' },
        { key: 'total_revenue', label: t('admin.commerce.marketing.referralStats.col.revenue', 'Revenue'), align: 'right' },
        { key: 'bonus_awarded', label: t('admin.commerce.marketing.referralStats.col.bonus', 'Bonus'), align: 'right' },
      ],
      searchFields: ['id', 'inviter', 'link', 'total_revenue', 'bonus_awarded'],
    },
  ];
  return sections.map((section) => withMarketingPagination(section));
}

function withMarketingPagination<TSectionId extends MarketingAdminTab>(
  section: AdminResourceSection<TSectionId, MarketingAdminGroup>,
): AdminResourceSection<TSectionId, MarketingAdminGroup> {
  return {
    ...section,
    load: (params?: AdminResourceLoadParams) => section.load(params),
    pagination: MARKETING_LIST_PAGINATION,
  };
}

export function MarketingAdmin({ sectionId }: MarketingAdminProps = {}) {
  const { t } = useTranslation();
  const sections = useMemo(() => buildMarketingSections(t), [t]);
  const activeSectionId = resolveMarketingSectionId(sectionId);

  return (
    <AdminResourceCenter
      activeSectionId={activeSectionId}
      emptyTitle={t('admin.marketing.promotions.empty', 'No promotion records')}
      errorTitle={t('admin.marketing.promotions.error', 'Promotion data could not be loaded')}
      loadingTitle={t('admin.marketing.promotions.loading', 'Loading promotion records...')}
      sections={sections}
      showSectionNavigation={false}
      tableViewportDataAttribute="admin-marketing-table-viewport"
    />
  );
}
