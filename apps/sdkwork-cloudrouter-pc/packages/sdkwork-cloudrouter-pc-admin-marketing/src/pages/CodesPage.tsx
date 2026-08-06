import { useTranslation } from 'react-i18next';
import type { ApiRecord } from '@sdkwork/cloudroutes-pc-commons/runtime';
import { MarketingStatusBadge } from '../components/MarketingDrawer';
import { MarketingListView, type MarketingColumn } from '../components/MarketingListView';
import { marketingEnumLabel } from '../components/MarketingValueBadge';
import { backendPromotionCodesList } from '../marketingService';
import { CopyablePromotionCode } from '../components/CopyablePromotionCode';
import { usePromotionReferences } from '../usePromotionReferences';

export function CodesPage() {
  const { t } = useTranslation();
  const { offerNames, stockNames } = usePromotionReferences();

  const columns: MarketingColumn<ApiRecord>[] = [
    { key: 'codeNo', label: t('admin.col.codeNo', 'Code No') },
    {
      key: 'promotionCode',
      label: t('admin.col.code', 'Code'),
      render: (value) => <CopyablePromotionCode code={String(value ?? '')} />,
    },
    { key: 'codeType', label: t('admin.col.type', 'Type'), render: (value) => marketingEnumLabel(value, 'admin.marketing.enums.codeType', t) },
    { key: 'stockId', label: t('admin.col.stock', 'Stock'), render: (value) => stockNames[String(value)] || String(value) },
    { key: 'offerId', label: t('admin.col.offer', 'Offer'), render: (value) => offerNames[String(value)] || String(value) },
    { key: 'maxClaims', label: t('admin.col.maxClaims', 'Max Claims'), align: 'right' },
    { key: 'claimedQuantity', label: t('admin.col.claimed', 'Claimed'), align: 'right' },
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
    { key: 'startsAt', label: t('admin.col.starts', 'Valid From') },
    { key: 'expiresAt', label: t('admin.col.expires', 'Valid Until') },
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
