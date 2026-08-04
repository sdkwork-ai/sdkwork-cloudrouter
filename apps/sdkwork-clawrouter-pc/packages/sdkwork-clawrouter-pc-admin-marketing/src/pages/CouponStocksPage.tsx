import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ApiRecord } from '@sdkwork/clawroutes-pc-commons/runtime';
import { MarketingStatusBadge } from '../components/MarketingDrawer';
import { MarketingListView, type MarketingColumn } from '../components/MarketingListView';
import { backendPromotionCouponStocksList, backendPromotionOffersList } from '../marketingService';

export function CouponStocksPage() {
  const { t } = useTranslation();
  const [offerNames, setOfferNames] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    void backendPromotionOffersList({ page: 1, pageSize: 200 })
      .then((page) => {
        if (!cancelled) {
          const mapping: Record<string, string> = {};
          for (const item of page.items) {
            mapping[String(item['id'])] = String(item['display_name'] ?? '');
          }
          setOfferNames(mapping);
        }
      })
      .catch(() => {
        // 名称映射失败不影响列表
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const columns: MarketingColumn<ApiRecord>[] = [
    { key: 'stock_no', label: t('admin.col.stock', 'Stock') },
    {
      key: 'offer_id',
      label: t('admin.col.offer', 'Offer'),
      render: (value) => offerNames[String(value)] || String(value),
    },
    { key: 'stock_type', label: t('admin.col.stockType', 'Stock Type') },
    {
      key: 'code_issue_mode',
      label: t('admin.col.codeIssueMode', 'Code Mode'),
      render: (value) => (
        <span className="text-xs">
          {value === 'BATCH'
            ? t('admin.marketing.promotions.codeIssue.batch', 'Batch Pool')
            : t('admin.marketing.promotions.codeIssue.realtime', 'Realtime')}
        </span>
      ),
    },
    { key: 'total_quantity', label: t('admin.col.total', 'Total'), align: 'right' },
    { key: 'available_quantity', label: t('admin.col.available', 'Available'), align: 'right' },
    { key: 'claimed_quantity', label: t('admin.col.claimed', 'Claimed'), align: 'right' },
    { key: 'redeemed_quantity', label: t('admin.col.redeemed', 'Redeemed'), align: 'right' },
    { key: 'per_user_limit', label: t('admin.col.perUserLimit', 'Per User'), align: 'right' },
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
    { key: 'claim_starts_at', label: t('admin.col.claimStartsAt', 'Claim Starts') },
    { key: 'claim_ends_at', label: t('admin.col.claimEndsAt', 'Claim Ends') },
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
