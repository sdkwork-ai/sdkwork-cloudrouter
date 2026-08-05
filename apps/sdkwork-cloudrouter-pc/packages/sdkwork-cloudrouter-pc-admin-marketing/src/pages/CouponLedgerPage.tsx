import { useTranslation } from 'react-i18next';
import type { ApiRecord } from '@sdkwork/cloudroutes-pc-commons/runtime';
import { MarketingListView, type MarketingColumn } from '../components/MarketingListView';
import { marketingEnumLabel } from '../components/MarketingValueBadge';
import { backendPromotionCouponLedgerEntriesList } from '../marketingService';
import { usePromotionReferences } from '../usePromotionReferences';

export function CouponLedgerPage() {
  const { t } = useTranslation();
  const { offerNames, stockNames } = usePromotionReferences();

  const columns: MarketingColumn<ApiRecord>[] = [
    {
      key: 'businessType',
      label: t('admin.col.type', 'Type'),
      render: (value) => marketingEnumLabel(value, 'admin.marketing.enums.ledgerBusinessType', t),
    },
    {
      key: 'direction',
      label: t('admin.col.direction', 'Direction'),
      render: (value) => marketingEnumLabel(value, 'admin.marketing.enums.direction', t),
    },
    { key: 'stockId', label: t('admin.col.stock', 'Stock'), render: (value) => stockNames[String(value)] || String(value) },
    { key: 'userCouponId', label: t('admin.col.coupon', 'Coupon') },
    { key: 'offerId', label: t('admin.col.offer', 'Offer'), render: (value) => offerNames[String(value)] || String(value) },
    { key: 'quantityDelta', label: t('admin.col.quantity', 'Quantity'), align: 'right' },
    { key: 'balanceAfter', label: t('admin.col.balance', 'Balance'), align: 'right' },
    { key: 'businessNo', label: t('admin.col.businessNo', 'Business No') },
    { key: 'createdAt', label: t('admin.col.occurredAt', 'Occurred At') },
  ];

  return (
    <MarketingListView
      title={t('admin.marketing.promotions.promotionCouponLedger.title', 'Coupon Ledger')}
      description={t('admin.marketing.promotions.promotionCouponLedger.desc', 'Append-only evidence for stock creation, claim, lock, release, redeem, return, expire, and adjustment.')}
      load={backendPromotionCouponLedgerEntriesList}
      columns={columns}
      searchPlaceholder={t('admin.marketing.promotions.promotionCouponLedger.search', 'Search by entry no or business no')}
      exportable
      exportFileName="coupon-ledger.csv"
    />
  );
}
