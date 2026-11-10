import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import type { ApiRecord } from '@sdkwork/cloudroutes-pc-commons/runtime';
import { MarketingStatusBadge } from '../components/MarketingDrawer';
import { MarketingListView, type MarketingColumn } from '../components/MarketingListView';
import { marketingEnumLabel } from '../components/MarketingValueBadge';
import {
  backendPromotionCouponStocksList,
  formatMarketingAmountMinor,
  formatMarketingInteger,
  formatMarketingPercent,
  MARKETING_EMPTY_VALUE,
  readPromotionStockBudget,
  readPromotionStockReconciliation,
  type PromotionStockBudget,
  type PromotionStockReconciliation,
} from '../marketingService';
import { usePromotionReferences } from '../usePromotionReferences';

interface ReconciliationEntry {
  key: string;
  label: string;
  value: string;
  unlimited: boolean;
}

/**
 * 单行库存对账条：issued / claimed / redeemed / available / locked。
 *
 * - `issued` 即总量投影，无限池（`stock_type=unlimited`，总量存 0）显示 `∞`；
 * - 其余计数即使来自无限池也照常显示数字（它们仍然有真实值）；
 * - `available + claimed + redeemed !== total` 时给出文字 + 图标的漂移提示，
 *   不使用仅靠颜色的信号。
 */
function StockReconciliationStrip({ reconciliation }: { reconciliation: PromotionStockReconciliation }) {
  const { t } = useTranslation();
  const entries: ReconciliationEntry[] = [
    {
      key: 'issued',
      label: t('admin.marketing.promotions.stocks.issued', 'Issued'),
      value: formatMarketingInteger(reconciliation.issued.raw, { unlimited: reconciliation.unlimited }),
      unlimited: reconciliation.unlimited,
    },
    {
      key: 'claimed',
      label: t('admin.col.claimed', 'Claimed'),
      value: formatMarketingInteger(reconciliation.claimed.raw),
      unlimited: false,
    },
    {
      key: 'redeemed',
      label: t('admin.col.redeemed', 'Redeemed'),
      value: formatMarketingInteger(reconciliation.redeemed.raw),
      unlimited: false,
    },
    {
      key: 'available',
      label: t('admin.col.available', 'Available'),
      value: formatMarketingInteger(reconciliation.available.raw),
      unlimited: false,
    },
    {
      key: 'locked',
      label: t('admin.marketing.promotions.stocks.locked', 'Locked'),
      value: formatMarketingInteger(reconciliation.locked.raw),
      unlimited: false,
    },
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
      {entries.map((entry) => (
        <span key={entry.key} className="inline-flex items-baseline gap-1 tabular-nums">
          <span>{entry.label}</span>
          <span
            className="font-medium text-slate-700 dark:text-slate-200"
            title={entry.unlimited ? t('admin.marketing.promotions.stocks.unlimitedHint', 'Unlimited stock: the total is not a fixed number.') : undefined}
          >
            {entry.value}
          </span>
        </span>
      ))}
      {reconciliation.drift ? (
        <span
          className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
          title={t('admin.marketing.promotions.stocks.driftHint', 'Available + claimed + redeemed does not equal the issued total.')}
        >
          <AlertTriangle className="h-3 w-3" aria-hidden="true" />
          {t('admin.marketing.promotions.stocks.drift', 'Drift')}
        </span>
      ) : null}
    </div>
  );
}

interface BudgetEntry {
  key: string;
  label: string;
  value: string;
}

/**
 * 单行库存预算块：total / available / reserved / used（最小单位 → 金额 + 币种）
 * 与 `used / total` 使用率。
 *
 * - 只有库存真的带预算（四个字段至少一个非空）时才会渲染；
 * - `used + reserved > total`（数据库约束下不应出现）按错误态展示：文字 + 图标 +
 *   `role="alert"`，并用错误提示替换进度条，绝不画一根越界/负值进度条；
 * - 使用率同时写在进度条的 `aria-label` 与可见文字里，颜色不是唯一信号。
 */
function StockBudgetBlock({ budget, currency }: { budget: PromotionStockBudget; currency: string }) {
  const { t, i18n } = useTranslation();
  const entries: BudgetEntry[] = [
    {
      key: 'total',
      label: t('admin.marketing.promotions.stocks.budget.total', 'Total budget'),
      value: formatMarketingAmountMinor(budget.total ?? undefined, currency, i18n.language),
    },
    {
      key: 'available',
      label: t('admin.marketing.promotions.stocks.budget.available', 'Budget available'),
      value: formatMarketingAmountMinor(budget.available ?? undefined, currency, i18n.language),
    },
    {
      key: 'reserved',
      label: t('admin.marketing.promotions.stocks.budget.reserved', 'Budget reserved'),
      value: formatMarketingAmountMinor(budget.reserved ?? undefined, currency, i18n.language),
    },
    {
      key: 'used',
      label: t('admin.marketing.promotions.stocks.budget.used', 'Budget used'),
      value: formatMarketingAmountMinor(budget.used ?? undefined, currency, i18n.language),
    },
  ];
  const utilizationLabel = budget.usedPercent !== null
    ? t(
        'admin.marketing.promotions.stocks.budget.utilization',
        'Utilization {{percent}}',
        { percent: formatMarketingPercent(budget.usedPercent) },
      )
    : null;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
      {entries.map((entry) => (
        <span key={entry.key} className="inline-flex items-baseline gap-1 tabular-nums">
          <span>{entry.label}</span>
          <span className="font-medium text-slate-700 dark:text-slate-200">{entry.value}</span>
        </span>
      ))}
      {budget.overCommitted ? (
        <span
          role="alert"
          className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 font-medium text-red-700 dark:bg-red-500/10 dark:text-red-400"
          title={t(
            'admin.marketing.promotions.stocks.budget.overCommittedHint',
            'Used plus reserved budget exceeds the total budget. Check the budget account before settling more applications.',
          )}
        >
          <AlertTriangle className="h-3 w-3" aria-hidden="true" />
          {t(
            'admin.marketing.promotions.stocks.budget.overCommitted',
            'Over-committed: used + reserved exceeds the total budget',
          )}
        </span>
      ) : utilizationLabel !== null && budget.usedPercent !== null ? (
        <span className="inline-flex items-center gap-1.5">
          <span
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={budget.usedPercent}
            aria-label={utilizationLabel}
            className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10"
          >
            <span
              className="block h-full rounded-full bg-lobster-500"
              style={{ width: `${budget.usedPercent}%` }}
            />
          </span>
          <span className="tabular-nums">{utilizationLabel}</span>
        </span>
      ) : null}
    </div>
  );
}

export function CouponStocksPage() {
  const { t } = useTranslation();
  const { offerNames, offerCurrencies } = usePromotionReferences();
  const columns: MarketingColumn<ApiRecord>[] = [
    { key: 'stockNo', label: t('admin.col.stock', 'Stock'), truncate: true },
    {
      key: 'offerId',
      label: t('admin.col.offer', 'Offer'),
      render: (value) => {
        const offerId = String(value ?? '');
        const offerName = offerNames[offerId];
        if (offerName !== undefined && offerName !== '') {
          return <span className="text-slate-700 dark:text-slate-200">{offerName}</span>;
        }
        if (!offerId) {
          return MARKETING_EMPTY_VALUE;
        }
        // 引用名称取不到时只显示裸 id：弱化 + 截断 + title 说明。
        return (
          <span
            className="block max-w-[12rem] truncate font-mono text-xs text-slate-400 dark:text-slate-500"
            title={`${t('admin.marketing.promotions.stocks.unresolvedOffer', 'Unresolved offer reference')}: ${offerId}`}
          >
            {offerId}
          </span>
        );
      },
    },
    {
      key: 'stockType',
      label: t('admin.col.stockType', 'Stock Type'),
      render: (value) => marketingEnumLabel(value, 'admin.marketing.enums.stockType', t),
    },
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
    {
      key: 'reconciliation',
      label: t('admin.marketing.promotions.stocks.reconciliation', 'Reconciliation'),
      render: (_value, record) => {
        // 预算块与对账条并列：没有预算账户（四个字段都为 null）时不渲染任何预算 UI。
        const budget = readPromotionStockBudget(record);
        return (
          <div className="flex flex-col gap-1">
            <StockReconciliationStrip reconciliation={readPromotionStockReconciliation(record)} />
            {budget ? (
              <StockBudgetBlock
                budget={budget}
                // CouponStock 契约没有币种字段：先看记录自带的 currencyCode（前向兼容），
                // 再取所属 offer 的币种；都没有时交给金额格式化器使用默认币种。
                currency={
                  String(record['currencyCode'] ?? '').trim() ||
                  offerCurrencies[String(record['offerId'] ?? '')] ||
                  ''
                }
              />
            ) : null}
          </div>
        );
      },
    },
    {
      key: 'status',
      label: t('admin.col.status', 'Status'),
      render: (value) => (
        <MarketingStatusBadge
          status={value}
          domain="stock"
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
