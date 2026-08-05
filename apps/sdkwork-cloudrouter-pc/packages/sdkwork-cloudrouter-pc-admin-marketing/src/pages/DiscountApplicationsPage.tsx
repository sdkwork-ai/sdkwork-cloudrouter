import { useTranslation } from 'react-i18next';
import type { ApiRecord } from '@sdkwork/cloudroutes-pc-commons/runtime';
import { MarketingListView, type MarketingColumn } from '../components/MarketingListView';
import { MarketingValueBadge, marketingEnumLabel, type MarketingBadgeTone } from '../components/MarketingValueBadge';
import { backendPromotionDiscountApplicationsList, formatMarketingAmountMinor } from '../marketingService';
import { usePromotionReferences } from '../usePromotionReferences';

/** 抵扣申请生命周期状态 → 徽章色调；未知状态回退默认色调并展示原始值。 */
const applicationStatusTone: Record<string, MarketingBadgeTone> = {
  APPLIED: 'info',
  SETTLED: 'success',
  RELEASED: 'default',
  ROLLED_BACK: 'danger',
};

export function DiscountApplicationsPage() {
  const { t, i18n } = useTranslation();
  const { offerNames } = usePromotionReferences();

  const columns: MarketingColumn<ApiRecord>[] = [
    { key: 'applicationNo', label: t('admin.col.application', 'Application') },
    { key: 'orderNo', label: t('admin.col.order', 'Order') },
    { key: 'orderId', label: t('admin.col.orderId', 'Order Id') },
    { key: 'offerId', label: t('admin.col.offer', 'Offer'), render: (value) => offerNames[String(value)] || String(value) },
    {
      key: 'discountType',
      label: t('admin.col.discountType', 'Discount Type'),
      render: (value) => marketingEnumLabel(value, 'admin.marketing.enums.discountType', t),
    },
    {
      key: 'discountAmount',
      label: t('admin.col.discount', 'Discount'),
      align: 'right',
      render: (value, record) => formatMarketingAmountMinor(
        value === null || value === undefined ? undefined : String(value),
        String(record['currencyCode'] ?? ''),
        i18n.language,
      ),
    },
    {
      key: 'status',
      label: t('admin.col.status', 'Status'),
      render: (value) => (
        <MarketingValueBadge
          label={marketingEnumLabel(value, 'admin.marketing.enums.applicationStatus', t)}
          tone={applicationStatusTone[String(value ?? '').toUpperCase()] ?? 'default'}
        />
      ),
    },
    { key: 'appliedAt', label: t('admin.col.appliedAt', 'Applied At') },
    { key: 'settledAt', label: t('admin.col.settledAt', 'Settled At') },
    { key: 'releasedAt', label: t('admin.col.releasedAt', 'Released At') },
    { key: 'rolledBackAt', label: t('admin.col.rolledBackAt', 'Rolled Back At') },
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
