import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Eye, Plus, Power, PowerOff, Trash2 } from 'lucide-react';
import type { ApiRecord } from '@sdkwork/clawroutes-pc-commons/runtime';
import {
  MarketingDrawer,
  MarketingStatusBadge,
} from '../components/MarketingDrawer';
import { OfferDetailDrawer } from '../components/OfferDetailDrawer';
import { MarketingOverviewBar } from '../components/MarketingOverviewBar';
import {
  MarketingIconActionButton,
  MarketingTableActions,
} from '../components/MarketingPageControls';
import { MarketingListView, type MarketingColumn } from '../components/MarketingListView';
import { CouponOfferCreateDrawerForm } from '../forms/CouponOfferCreateDrawerForm';
import {
  backendPromotionOffersList,
  createCouponOffer,
  createIdempotencyKey,
  deletePromotionOffer,
  offerRecordToFormValues,
  updatePromotionOfferStatus,
  type CouponOfferCreateFormValues,
} from '../marketingService';

export function OffersPage() {
  const { t } = useTranslation();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [initialValue, setInitialValue] = useState<Partial<CouponOfferCreateFormValues> | undefined>(undefined);
  const [detailOfferId, setDetailOfferId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = () => setRefreshKey((current) => current + 1);

  const openCreateDrawer = (initial?: Partial<CouponOfferCreateFormValues>) => {
    setSaveError(null);
    setInitialValue(initial);
    setIsDrawerOpen(true);
  };

  const handleCreate = async (values: CouponOfferCreateFormValues) => {
    setIsSaving(true);
    setSaveError(null);
    try {
      await createCouponOffer(values, createIdempotencyKey());
      setIsDrawerOpen(false);
      setInitialValue(undefined);
      refresh();
    } catch (createError) {
      const message = createError instanceof Error ? createError.message : 'Failed to create coupon';
      // 优惠券创建接口无幂等键：部分失败后重试可能产生重复记录，提示先确认列表
      setSaveError(`${message} ${t('admin.marketing.coupon.form.retryHint', 'The coupon may have been created; refresh the list to confirm before retrying.')}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (record: ApiRecord, targetStatus: 'active' | 'disabled') => {
    const offerId = String(record['id']);
    try {
      await updatePromotionOfferStatus(offerId, targetStatus);
      refresh();
    } catch (statusError) {
      window.alert(statusError instanceof Error ? statusError.message : t('admin.marketing.promotions.offers.statusError', 'Failed to update offer status'));
    }
  };

  const handleDelete = async (record: ApiRecord) => {
    const offerId = String(record['id']);
    const name = String(record['display_name'] ?? offerId);
    const active = record['status'] === 'active';
    if (active) {
      window.alert(t('admin.marketing.promotions.offers.disableFirst', 'Disable the offer before deleting it.'));
      return;
    }
    if (!window.confirm(t('admin.marketing.promotions.offers.deleteConfirm', 'Delete coupon {{name}}? This cannot be undone.', { name }))) {
      return;
    }
    try {
      await deletePromotionOffer(offerId);
      refresh();
    } catch (deleteError) {
      window.alert(deleteError instanceof Error ? deleteError.message : t('admin.marketing.promotions.offers.deleteError', 'Failed to delete offer'));
    }
  };

  const columns: MarketingColumn<ApiRecord>[] = [
    { key: 'offer_no', label: t('admin.col.offerNo', 'Offer No') },
    { key: 'display_name', label: t('admin.col.name', 'Name') },
    { key: 'offer_type', label: t('admin.col.type', 'Type') },
    { key: 'audience_scope', label: t('admin.col.audience', 'Audience') },
    {
      key: 'discount_value',
      label: t('admin.col.discount', 'Discount'),
      render: (value, record) => (value === null || value === undefined ? '-' : `${value} ${String(record['currency_code'] ?? '')}`),
    },
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
    { key: 'starts_at', label: t('admin.col.starts', 'Starts') },
    { key: 'ends_at', label: t('admin.col.ends', 'Ends') },
    { key: 'updated_at', label: t('admin.col.updated', 'Updated') },
  ];

  return (
    <>
      <MarketingOverviewBar />
      <MarketingListView
        title={t('admin.marketing.promotions.offers.title', 'Coupon Offers')}
        description={t('admin.marketing.promotions.offers.desc', 'Canonical coupon definitions with benefit, validity, audience, and issuance mode.')}
        load={backendPromotionOffersList}
        columns={columns}
        showStatusFilter
        refreshKey={refreshKey}
        exportable
        exportFileName="coupon-offers.csv"
        searchPlaceholder={t('admin.marketing.promotions.offers.search', 'Search by name or code')}
        emptyTitle={t('admin.marketing.promotions.offers.empty', 'No coupons yet. Create your first coupon to start issuing.')}
        toolbarActions={(
          <button
            type="button"
            onClick={() => openCreateDrawer()}
            className="inline-flex items-center gap-1 rounded-md bg-lobster-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-lobster-700"
          >
            <Plus className="h-3.5 w-3.5" />
            {t('admin.marketing.promotions.offers.create', 'Create Coupon')}
          </button>
        )}
        rowActions={(record) => {
          const active = record['status'] === 'active';
          return (
            <MarketingTableActions>
              <MarketingIconActionButton
                label={t('admin.marketing.promotions.offers.detail', 'View Detail')}
                icon={<Eye className="h-4 w-4" />}
                onClick={() => setDetailOfferId(String(record['id']))}
              />
              <MarketingIconActionButton
                label={t('admin.marketing.promotions.offers.copy', 'Duplicate')}
                icon={<Copy className="h-4 w-4" />}
                onClick={() => openCreateDrawer(offerRecordToFormValues(record))}
              />
              <MarketingIconActionButton
                label={active
                  ? t('admin.marketing.promotions.offers.disable', 'Disable')
                  : t('admin.marketing.promotions.offers.enable', 'Enable')}
                icon={active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                onClick={() => handleToggleStatus(record, active ? 'disabled' : 'active')}
              />
              <MarketingIconActionButton
                label={t('admin.marketing.promotions.offers.delete', 'Delete')}
                icon={<Trash2 className="h-4 w-4" />}
                tone="danger"
                onClick={() => void handleDelete(record)}
              />
            </MarketingTableActions>
          );
        }}
      />

      <MarketingDrawer
        title={t('admin.marketing.coupon.form.title', 'Create Coupon')}
        description={initialValue
          ? t('admin.marketing.coupon.form.copySubtitle', 'Duplicate of an existing coupon. Adjust and submit to create.')
          : t('admin.marketing.coupon.form.subtitle', 'Define the coupon benefit, issuance settings, and code generation mode.')}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      >
        <CouponOfferCreateDrawerForm
          isSaving={isSaving}
          error={saveError}
          initialValue={initialValue}
          onCancel={() => setIsDrawerOpen(false)}
          onSubmit={(values) => void handleCreate(values)}
        />
      </MarketingDrawer>

      <OfferDetailDrawer offerId={detailOfferId} onClose={() => setDetailOfferId(null)} />
    </>
  );
}
