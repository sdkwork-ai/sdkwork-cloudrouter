import { useTranslation } from 'react-i18next';
import type { ApiRecord } from '@sdkwork/clawroutes-pc-commons/runtime';
import { MarketingListView, type MarketingColumn } from '../components/MarketingListView';
import { backendPromotionCouponLedgerEntriesList } from '../marketingService';

export function CouponLedgerPage() {
  const { t } = useTranslation();

  const columns: MarketingColumn<ApiRecord>[] = [
    { key: 'ledger_no', label: t('admin.col.entry', 'Entry') },
    { key: 'business_type', label: t('admin.col.type', 'Type') },
    { key: 'direction', label: t('admin.col.direction', 'Direction') },
    { key: 'stock_id', label: t('admin.col.stock', 'Stock') },
    { key: 'user_coupon_id', label: t('admin.col.coupon', 'Coupon') },
    { key: 'offer_id', label: t('admin.col.offer', 'Offer') },
    { key: 'quantity_delta', label: t('admin.col.quantity', 'Quantity'), align: 'right' },
    { key: 'balance_after', label: t('admin.col.balance', 'Balance'), align: 'right' },
    { key: 'business_no', label: t('admin.col.businessNo', 'Business No') },
    { key: 'created_at', label: t('admin.col.occurredAt', 'Occurred At') },
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
