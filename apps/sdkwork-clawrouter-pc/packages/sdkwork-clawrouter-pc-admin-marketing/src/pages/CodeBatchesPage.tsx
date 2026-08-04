import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Boxes, Plus } from 'lucide-react';
import type { ApiRecord } from '@sdkwork/clawroutes-pc-commons/runtime';
import { MarketingDrawer, MarketingBatchStatusBadge } from '../components/MarketingDrawer';
import { MarketingIconActionButton, MarketingTableActions } from '../components/MarketingPageControls';
import { MarketingListView, type MarketingColumn } from '../components/MarketingListView';
import { CodeBatchCreateDrawerForm } from '../forms/CodeBatchCreateDrawerForm';
import {
  backendPromotionCodeBatchesList,
  backendPromotionCouponStocksList,
  buildCodeBatchCreateRequest,
  createIdempotencyKey,
  createPromotionCodeBatch,
  type CodeBatchCreateFormValues,
} from '../marketingService';

export function CodeBatchesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [stockOptions, setStockOptions] = useState<{ id: string; label: string }[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadStockOptions = useCallback(async () => {
    const page = await backendPromotionCouponStocksList({ page: 1, pageSize: 200 });
    setStockOptions(page.items.map((item) => ({
      id: String(item['id']),
      label: `${String(item['stock_no'])} (${String(item['stock_type'])})`,
    })));
  }, []);

  const openCreateDrawer = () => {
    setSaveError(null);
    void loadStockOptions();
    setIsDrawerOpen(true);
  };

  const handleCreate = async (values: CodeBatchCreateFormValues) => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const batch = await createPromotionCodeBatch(buildCodeBatchCreateRequest(values, createIdempotencyKey()));
      setIsDrawerOpen(false);
      setRefreshKey((current) => current + 1);
      // 生成完成后直接进入批次券码页
      navigate(`/admin/marketing/codeBatches/${batch.id}`);
    } catch (createError) {
      setSaveError(createError instanceof Error ? createError.message : 'Failed to generate code batch');
    } finally {
      setIsSaving(false);
    }
  };

  const columns: MarketingColumn<ApiRecord>[] = [
    { key: 'batch_no', label: t('admin.col.batchNo', 'Batch No') },
    { key: 'stock_id', label: t('admin.col.stock', 'Stock') },
    { key: 'code_type', label: t('admin.col.type', 'Type') },
    { key: 'requested_quantity', label: t('admin.col.requested', 'Requested'), align: 'right' },
    { key: 'generated_quantity', label: t('admin.col.generated', 'Generated'), align: 'right' },
    { key: 'code_length', label: t('admin.col.codeLength', 'Length'), align: 'right' },
    { key: 'code_prefix', label: t('admin.col.codePrefix', 'Prefix') },
    {
      key: 'status',
      label: t('admin.col.status', 'Status'),
      render: (value) => <MarketingBatchStatusBadge status={value} />,
    },
    { key: 'created_at', label: t('admin.col.createdAt', 'Created') },
  ];

  return (
    <>
      <MarketingListView
        title={t('admin.marketing.promotions.codeBatches.title', 'Code Batches')}
        description={t('admin.marketing.promotions.codeBatches.desc', 'Pre-generated coupon code pools. Claiming a batch-mode coupon dispenses a code from the pool.')}
        load={backendPromotionCodeBatchesList}
        columns={columns}
        refreshKey={refreshKey}
        searchPlaceholder={t('admin.marketing.promotions.codeBatches.search', 'Search by batch no')}
        toolbarActions={(
          <button
            type="button"
            onClick={openCreateDrawer}
            className="inline-flex items-center gap-1 rounded-md bg-lobster-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-lobster-700"
          >
            <Plus className="h-3.5 w-3.5" />
            {t('admin.marketing.promotions.codeBatches.create', 'Generate Code Batch')}
          </button>
        )}
        rowActions={(record) => (
          <MarketingTableActions>
            <MarketingIconActionButton
              label={t('admin.marketing.promotions.codeBatches.open', 'View Batch Codes')}
              icon={<Boxes className="h-4 w-4" />}
              onClick={() => navigate(`/admin/marketing/codeBatches/${String(record['id'])}`)}
            />
          </MarketingTableActions>
        )}
      />

      <MarketingDrawer
        title={t('admin.marketing.batch.form.title', 'Generate Code Batch')}
        description={t('admin.marketing.batch.form.subtitle', 'Pre-generate a pool of coupon codes for a coupon stock.')}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      >
        <CodeBatchCreateDrawerForm
          isSaving={isSaving}
          error={saveError}
          stockOptions={stockOptions}
          onCancel={() => setIsDrawerOpen(false)}
          onSubmit={(values) => void handleCreate(values)}
        />
      </MarketingDrawer>
    </>
  );
}
