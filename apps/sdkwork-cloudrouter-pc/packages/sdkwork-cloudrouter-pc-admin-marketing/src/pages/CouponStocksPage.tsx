import { useTranslation } from 'react-i18next';
import type { ApiRecord } from '@sdkwork/cloudroutes-pc-commons/runtime';
import { MarketingStatusBadge } from '../components/MarketingDrawer';
import { MarketingListView, type MarketingColumn } from '../components/MarketingListView';
import { marketingEnumLabel } from '../components/MarketingValueBadge';
import { backendPromotionCouponStocksList } from '../marketingService';
import { usePromotionReferences } from '../usePromotionReferences';

export function CouponStocksPage() {
  const { t } = useTranslation();
  const { offerNames } = usePromotionReferences();

  const columns: MarketingColumn<ApiRecord>[] = [
    { key: 'stockNo', label: t('admin.col.stock', 'Stock') },
    {
      key: 'offerId',
      label: t('admin.col.offer', 'Offer'),
      render: (value) => offerNames[String(value)] || String(value),
    },
    { key: 'stockType', label: t('admin.col.stockType', 'Stock Type'), render: (value) => marketingEnumLabel(value, 'admin.marketing.enums.stockType', t) },
    {
      key: 'codeIssueMode',
      label: t('admin.col.codeIssueMode', 'Code Mode'),
      render: (value) => (
        <span className="text-xs">
          {value === 'batch'
            ? t('admin.marketing.promotions.codeIssue.batch', 'Batch Pool')
            : t('admin.marketing.promotions.codeIssue.realtime', 'Realtime')}
        </span>
      ),
    },
    { key: 'totalQuantity', label: t('admin.col.total', 'Total'), align: 'right' },
    { key: 'availableQuantity', label: t('admin.col.available', 'Available'), align: 'right' },
    { key: 'claimedQuantity', label: t('admin.col.claimed', 'Claimed'), align: 'right' },
    { key: 'redeemedQuantity', label: t('admin.col.redeemed', 'Redeemed'), align: 'right' },
    { key: 'perUserLimit', label: t('admin.col.perUserLimit', 'Per User'), align: 'right' },
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
    { key: 'claimStartsAt', label: t('admin.col.claimStartsAt', 'Claim Starts') },
    { key: 'claimEndsAt', label: t('admin.col.claimEndsAt', 'Claim Ends') },
  ];

  return (
    <MarketingListView
      title={t('admin.marketing.promotions.stocks.title', 'Coupon Stocks')}
      description={t('admin.marketing.promotions.stocks.desc', 'Issuable stock pools with code issuance mode, quantity, and lifecycle status.')}
      load={backendPromotionCouponStocksList}
      columns={columns}
      showStatusFilter
      searchPlaceholder={t('admin.marketing.promotions.stocks.search', 'Search by stock no')}
      exportable
      exportFileName="coupon-stocks.csv"
    />
  );
}
