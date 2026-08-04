import { useTranslation } from 'react-i18next';
import type { ApiRecord } from '@sdkwork/clawroutes-pc-commons/runtime';
import { MarketingStatusBadge } from '../components/MarketingDrawer';
import { MarketingListView, type MarketingColumn } from '../components/MarketingListView';
import { backendPromotionCodesList } from '../marketingService';

export function CodesPage() {
  const { t } = useTranslation();

  const columns: MarketingColumn<ApiRecord>[] = [
    { key: 'code_no', label: t('admin.col.codeNo', 'Code No') },
    { key: 'promotion_code', label: t('admin.col.code', 'Code') },
    { key: 'code_type', label: t('admin.col.type', 'Type') },
    { key: 'stock_id', label: t('admin.col.stock', 'Stock') },
    { key: 'offer_id', label: t('admin.col.offer', 'Offer') },
    { key: 'max_claims', label: t('admin.col.maxClaims', 'Max Claims'), align: 'right' },
    { key: 'claimed_quantity', label: t('admin.col.claimed', 'Claimed'), align: 'right' },
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
    { key: 'starts_at', label: t('admin.col.starts', 'Valid From') },
    { key: 'expires_at', label: t('admin.col.expires', 'Valid Until') },
  ];

  return (
    <MarketingListView
      title={t('admin.marketing.promotions.promotionCodes.title', 'Code Query')}
      description={t('admin.marketing.promotions.promotionCodes.desc', 'Unified coupon code query across all pre-generated pools, with masked code display.')}
      load={backendPromotionCodesList}
      columns={columns}
      showStatusFilter
      searchPlaceholder={t('admin.marketing.promotions.codes.search', 'Search by code or code no')}
      exportable
      exportFileName="codes.csv"
    />
  );
}
