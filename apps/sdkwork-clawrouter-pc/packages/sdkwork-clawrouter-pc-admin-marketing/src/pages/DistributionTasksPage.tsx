import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import type { ApiRecord } from '@sdkwork/clawroutes-pc-commons/runtime';
import { MarketingBatchStatusBadge, MarketingDrawer } from '../components/MarketingDrawer';
import { MarketingListView, type MarketingColumn } from '../components/MarketingListView';
import { DistributionTaskCreateDrawerForm } from '../forms/DistributionTaskCreateDrawerForm';
import {
  backendPromotionCouponStocksList,
  backendPromotionDistributionTasksList,
  buildDistributionTaskRequest,
  createIdempotencyKey,
  createPromotionDistributionTask,
} from '../marketingService';

export function DistributionTasksPage() {
  const { t } = useTranslation();
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

  const handleCreate = async (stockId: string, ownerUserIds: string[]) => {
    setIsSaving(true);
    setSaveError(null);
    try {
      await createPromotionDistributionTask(
        buildDistributionTaskRequest(stockId, ownerUserIds, createIdempotencyKey()),
      );
      setIsDrawerOpen(false);
      setRefreshKey((current) => current + 1);
    } catch (createError) {
      setSaveError(createError instanceof Error ? createError.message : 'Failed to send coupons');
    } finally {
      setIsSaving(false);
    }
  };

  const columns: MarketingColumn<ApiRecord>[] = [
    { key: 'task_no', label: t('admin.col.taskNo', 'Task No') },
    { key: 'distribution_type', label: t('admin.col.distributionType', 'Type') },
    { key: 'stock_id', label: t('admin.col.stock', 'Stock') },
    { key: 'requested_quantity', label: t('admin.col.requested', 'Requested'), align: 'right' },
    { key: 'succeeded_quantity', label: t('admin.col.succeeded', 'Succeeded'), align: 'right' },
    { key: 'failed_quantity', label: t('admin.col.failed', 'Failed'), align: 'right' },
    {
      key: 'status',
      label: t('admin.col.status', 'Status'),
      render: (value) => <MarketingBatchStatusBadge status={value} />,
    },
    { key: 'created_at', label: t('admin.col.createdAt', 'Created') },
    { key: 'completed_at', label: t('admin.col.completedAt', 'Completed') },
  ];

  return (
    <>
      <MarketingListView
        title={t('admin.marketing.promotions.distribution.title', 'Directed Coupon Distribution')}
        description={t('admin.marketing.promotions.distribution.desc', 'Send coupons directly to specified users from a coupon stock.')}
        load={backendPromotionDistributionTasksList}
        columns={columns}
        searchPlaceholder={t('admin.marketing.promotions.distribution.search', 'Search by task no')}
        toolbarActions={(
          <button
            type="button"
            onClick={openCreateDrawer}
            className="inline-flex items-center gap-1 rounded-md bg-lobster-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-lobster-700"
          >
            <Plus className="h-3.5 w-3.5" />
            {t('admin.marketing.promotions.distribution.create', 'Send Coupons')}
          </button>
        )}
        refreshKey={refreshKey}
      />

      <MarketingDrawer
        title={t('admin.marketing.distribution.form.title', 'Send Coupons')}
        description={t('admin.marketing.distribution.form.subtitle', 'Distribute coupons from a stock to specified users directly.')}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      >
        <DistributionTaskCreateDrawerForm
          isSaving={isSaving}
          error={saveError}
          stockOptions={stockOptions}
          onCancel={() => setIsDrawerOpen(false)}
          onSubmit={(stockId, ownerUserIds) => void handleCreate(stockId, ownerUserIds)}
        />
      </MarketingDrawer>
    </>
  );
}
