import { useTranslation } from 'react-i18next';
import type { ApiRecord } from '@sdkwork/cloudroutes-pc-commons/runtime';
import { MarketingListView, type MarketingColumn } from '../components/MarketingListView';
import { MarketingValueBadge, marketingEnumLabel, type MarketingBadgeTone } from '../components/MarketingValueBadge';
import { backendPromotionUserCouponsList } from '../marketingService';
import { usePromotionReferences } from '../usePromotionReferences';

/** 用户券生命周期状态 → 徽章色调；未知状态回退默认色调并展示原始值。 */
const couponStatusTone: Record<string, MarketingBadgeTone> = {
  CLAIMED: 'info',
  REDEEMED: 'success',
  EXPIRED: 'danger',
  DISABLED: 'default',
  VOIDED: 'danger',
  CANCELLED: 'danger',
};

export function UserCouponsPage() {
  const { t } = useTranslation();
  const { offerNames, stockNames } = usePromotionReferences();

  const columns: MarketingColumn<ApiRecord>[] = [
    { key: 'couponNo', label: t('admin.col.coupon', 'Coupon') },
    { key: 'couponCode', label: t('admin.col.code', 'Code') },
    { key: 'ownerUserId', label: t('admin.col.user', 'User') },
    { key: 'stockId', label: t('admin.col.stock', 'Stock'), render: (value) => stockNames[String(value)] || String(value) },
    { key: 'offerId', label: t('admin.col.offer', 'Offer'), render: (value) => offerNames[String(value)] || String(value) },
    {
      key: 'status',
      label: t('admin.col.status', 'Status'),
      render: (value) => (
        <MarketingValueBadge
          label={marketingEnumLabel(value, 'admin.marketing.enums.userCouponStatus', t)}
          tone={couponStatusTone[String(value ?? '').toUpperCase()] ?? 'default'}
        />
      ),
    },
    { key: 'claimedAt', label: t('admin.col.claimedAt', 'Claimed At') },
    { key: 'validFrom', label: t('admin.col.validFrom', 'Valid From') },
    { key: 'expiresAt', label: t('admin.col.expires', 'Expires') },
    { key: 'redeemedAt', label: t('admin.col.redeemedAt', 'Redeemed At') },
    {
      key: 'sourceType',
      label: t('admin.col.sourceType', 'Source'),
      render: (value) => (value
        ? marketingEnumLabel(value, 'admin.marketing.enums.sourceType', t)
        : t('admin.marketing.enums.sourceType.claim', 'User Claim')),
    },
  ];

  return (
    <MarketingListView
      title={t('admin.marketing.promotions.userCoupons.title', 'Claim Records')}
      description={t('admin.marketing.promotions.userCoupons.desc', 'Coupons claimed by users, with the issued code, owner, and lifecycle timestamps.')}
      load={backendPromotionUserCouponsList}
      columns={columns}
      showStatusFilter
      searchPlaceholder={t('admin.marketing.promotions.userCoupons.search', 'Search by user id or coupon no')}
      exportable
      exportFileName="claim-records.csv"
    />
  );
}
