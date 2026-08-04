import { useTranslation } from 'react-i18next';
import type { ApiRecord } from '@sdkwork/clawroutes-pc-commons/runtime';
import { MarketingStatusBadge } from '../components/MarketingDrawer';
import { MarketingListView, type MarketingColumn } from '../components/MarketingListView';
import { backendPromotionUserCouponsList } from '../marketingService';

export function UserCouponsPage() {
  const { t } = useTranslation();

  const columns: MarketingColumn<ApiRecord>[] = [
    { key: 'coupon_no', label: t('admin.col.coupon', 'Coupon') },
    { key: 'coupon_code', label: t('admin.col.code', 'Code') },
    { key: 'owner_user_id', label: t('admin.col.user', 'User') },
    { key: 'stock_id', label: t('admin.col.stock', 'Stock') },
    { key: 'offer_id', label: t('admin.col.offer', 'Offer') },
    {
      key: 'status',
      label: t('admin.col.status', 'Status'),
      render: (value) => (
        <MarketingStatusBadge
          status={value}
          activeLabel={t('admin.marketing.promotions.status.active', 'Active')}
          inactiveLabel={t('admin.marketing.promotions.status.inactive', 'Inactive')}
        />
      ),
    },
    { key: 'claimed_at', label: t('admin.col.claimedAt', 'Claimed At') },
    { key: 'valid_from', label: t('admin.col.validFrom', 'Valid From') },
    { key: 'expires_at', label: t('admin.col.expires', 'Expires') },
    { key: 'redeemed_at', label: t('admin.col.redeemedAt', 'Redeemed At') },
    { key: 'source_type', label: t('admin.col.sourceType', 'Source') },
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
