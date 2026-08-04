import { useTranslation } from 'react-i18next';
import type { ApiRecord } from '@sdkwork/clawroutes-pc-commons/runtime';
import { MarketingStatusBadge } from '../components/MarketingDrawer';
import { MarketingListView, type MarketingColumn } from '../components/MarketingListView';
import { backendPromotionDiscountApplicationsList } from '../marketingService';

export function DiscountApplicationsPage() {
  const { t } = useTranslation();

  const columns: MarketingColumn<ApiRecord>[] = [
    { key: 'application_no', label: t('admin.col.application', 'Application') },
    { key: 'order_no', label: t('admin.col.order', 'Order') },
    { key: 'order_id', label: t('admin.col.orderId', 'Order Id') },
    { key: 'offer_id', label: t('admin.col.offer', 'Offer') },
    { key: 'discount_type', label: t('admin.col.discountType', 'Discount Type') },
    {
      key: 'discount_amount',
      label: t('admin.col.discount', 'Discount'),
      align: 'right',
      render: (value, record) => `${String(value)} ${String(record['currency_code'] ?? '')}`,
    },
    {
      key: 'status',
      label: t('admin.col.status', 'Status'),
      render: (value) => (
        <MarketingStatusBadge
          status={value}
          activeLabel={t('admin.marketing.promotions.status.active', 'Applied')}
          inactiveLabel={t('admin.marketing.promotions.status.inactive', 'Closed')}
        />
      ),
    },
    { key: 'applied_at', label: t('admin.col.appliedAt', 'Applied At') },
    { key: 'settled_at', label: t('admin.col.settledAt', 'Settled At') },
    { key: 'released_at', label: t('admin.col.releasedAt', 'Released At') },
    { key: 'rolled_back_at', label: t('admin.col.rolledBackAt', 'Rolled Back At') },
  ];

  return (
    <MarketingListView
      title={t('admin.marketing.promotions.discountApplications.title', 'Usage History')}
      description={t('admin.marketing.promotions.discountApplications.desc', 'Coupon usage history: checkout applications, settlements, releases, and reversals tied to orders.')}
      load={backendPromotionDiscountApplicationsList}
      columns={columns}
      showStatusFilter
      searchPlaceholder={t('admin.marketing.promotions.discountApplications.search', 'Search by application no or order no')}
      exportable
      exportFileName="usage-history.csv"
    />
  );
}
