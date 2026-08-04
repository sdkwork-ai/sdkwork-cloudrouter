import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import type { ApiRecord } from '@sdkwork/clawroutes-pc-commons/runtime';
import { MarketingBatchStatusBadge, MarketingStatusBadge } from '../components/MarketingDrawer';
import { MarketingListView, type MarketingColumn } from '../components/MarketingListView';
import {
  backendPromotionCodeBatchesList,
  backendPromotionCodesList,
} from '../marketingService';

export function BatchCodesPage({ batchId }: { batchId: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [batch, setBatch] = useState<ApiRecord | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const page = await backendPromotionCodeBatchesList({ page: 1, pageSize: 200 });
        const matched = page.items.find((item) => String(item['id']) === batchId);
        if (!cancelled) {
          setBatch(matched ?? null);
        }
      } catch {
        if (!cancelled) {
          setBatch(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [batchId]);

  const loadCodes = useMemo(() => (params: { page: number; pageSize: number; q?: string; status?: 'active' | 'disabled' }) =>
    backendPromotionCodesList({
      page: params.page,
      pageSize: params.pageSize,
      q: params.q,
      status: params.status,
      codeBatchId: batchId,
    }), [batchId]);

  const columns: MarketingColumn<ApiRecord>[] = [
    { key: 'code_no', label: t('admin.col.codeNo', 'Code No') },
    { key: 'promotion_code', label: t('admin.col.code', 'Code') },
    { key: 'code_type', label: t('admin.col.type', 'Type') },
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
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      <div className="flex shrink-0 items-center justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={() => navigate('/admin/marketing/codeBatches')}
            className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t('admin.marketing.promotions.batchCodes.back', 'Back to batches')}
          </button>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            {t('admin.marketing.promotions.batchCodes.title', 'Batch Codes')}
          </h2>
          {batch ? (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {String(batch['batch_no'])}
              {' · '}
              {t('admin.col.generated', 'Generated')}: {String(batch['generated_quantity'])}
              {' · '}
              {String(batch['code_prefix'] || '-')}
              {' · '}
              <MarketingBatchStatusBadge status={batch['status']} />
            </p>
          ) : null}
        </div>
      </div>
      <MarketingListView
        title={t('admin.marketing.promotions.batchCodes.codes', 'Codes in this batch')}
        description={t('admin.marketing.promotions.batchCodes.desc', 'Coupon codes belonging to this batch. Claiming a batch-mode coupon consumes a code from this pool.')}
        load={loadCodes}
        columns={columns}
        searchPlaceholder={t('admin.marketing.promotions.codes.search', 'Search by code or code no')}
      exportable
      exportFileName="batch-codes.csv"
      />
    </div>
  );
}
