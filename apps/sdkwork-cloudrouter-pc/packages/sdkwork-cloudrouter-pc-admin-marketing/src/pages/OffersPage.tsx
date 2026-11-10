import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Eye, Pencil, Plus, Power, PowerOff, Trash2 } from 'lucide-react';
import { ConfirmDialog, resolveProblemMessage } from '@sdkwork/cloudroutes-pc-commons';
import type { ApiRecord } from '@sdkwork/cloudroutes-pc-commons/runtime';
import {
  MarketingDrawer,
  MarketingStatusBadge,
} from '../components/MarketingDrawer';
import { OfferDetailDrawer } from '../components/OfferDetailDrawer';
import { MarketingOverviewBar } from '../components/MarketingOverviewBar';
import { MarketingInlineAlert } from '../components/MarketingInlineAlert';
import {
  MarketingIconActionButton,
  MarketingTableActions,
} from '../components/MarketingPageControls';
import { MarketingListView, type MarketingColumn } from '../components/MarketingListView';
import { CouponOfferCreateDrawerForm } from '../forms/CouponOfferCreateDrawerForm';
import { CouponBenefitSummary } from '../components/CouponBenefitSummary';
import { marketingEnumLabel } from '../components/MarketingValueBadge';
import {
  backendPromotionOffersList,
  buildCouponOfferUpdateRequest,
  createCouponOffer,
  createIdempotencyKey,
  deletePromotionOffer,
  formatMarketingInteger,
  isUnlimitedPromotionStock,
  MARKETING_EMPTY_VALUE,
  offerRecordToEditFormValues,
  offerRecordToFormValues,
  readMarketingProblemStatus,
  readMarketingProblemTraceId,
  readPromotionOfferVersion,
  retrievePromotionOffer,
  updatePromotionOffer,
  updatePromotionOfferStatus,
  type CouponOfferCreateFormValues,
} from '../marketingService';
import { usePromotionReferences } from '../usePromotionReferences';

/** 待确认的破坏性操作：删除或启停用。 */
type OfferPendingAction =
  | { kind: 'delete'; record: ApiRecord }
  | { kind: 'toggle'; record: ApiRecord; targetStatus: 'active' | 'disabled' };

/** 行内错误：人类可读原因 + 可复制的 traceId。 */
type OfferActionError = { message: string; traceId: string | null };

/** 抽屉内的编辑错误：乐观锁冲突可原地重载，其他失败只展示原因与 traceId。 */
type OfferEditError = { kind: 'conflict' | 'error'; message: string; traceId: string | null };

/**
 * 编辑会话：`version` 是 `retrievePromotionOffer` 返回的 int64 十进制字符串，
 * 原样保存、原样提交；重载只替换它，不动抽屉里已输入的其他字段。
 */
type OfferEditSession = {
  offerId: string;
  version: string;
  initialValues: CouponOfferCreateFormValues;
};

/** 成功反馈停留时长（设计规范 §2.5：约 3 秒后自动消失，可手动关闭）。 */
const SUCCESS_FEEDBACK_MS = 3000;

/** 交互对象的可读名称：优先展示名称，缺失时回退 id。 */
function readOfferName(record: ApiRecord): string {
  const name = record['displayName'];
  const text = name === null || name === undefined ? '' : String(name).trim();
  return text || String(record['id']);
}

/** 汇总同一 offer 下所有库存池的计数；返回 int64 十进制字符串或 null。 */
function sumStockQuantity(stocks: ApiRecord[], key: string): string | null {
  let total = 0n;
  let found = false;
  for (const stock of stocks) {
    const raw = stock[key];
    const text = typeof raw === 'string' || typeof raw === 'number' ? String(raw).trim() : '';
    if (/^\d+$/u.test(text)) {
      total += BigInt(text);
      found = true;
    }
  }
  return found ? total.toString() : null;
}

export function OffersPage() {
  const { t } = useTranslation();
  const { stockByOffer } = usePromotionReferences();
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [initialValues, setInitialValues] = useState<Partial<CouponOfferCreateFormValues> | undefined>(undefined);
  const [editSession, setEditSession] = useState<OfferEditSession | null>(null);
  const [editError, setEditError] = useState<OfferEditError | null>(null);
  const [isEditLoading, setIsEditLoading] = useState(false);
  const [isEditReloading, setIsEditReloading] = useState(false);
  const [detailOfferId, setDetailOfferId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [pendingAction, setPendingAction] = useState<OfferPendingAction | null>(null);
  const [actionError, setActionError] = useState<OfferActionError | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isActionBusy, setIsActionBusy] = useState(false);

  useEffect(() => {
    if (!successMessage) {
      return;
    }
    const timer = window.setTimeout(() => setSuccessMessage(null), SUCCESS_FEEDBACK_MS);
    return () => window.clearTimeout(timer);
  }, [successMessage]);

  const refresh = () => setRefreshKey((current) => current + 1);

  const closeOfferDrawer = () => {
    setIsCreateDrawerOpen(false);
    setInitialValues(undefined);
    setEditSession(null);
    setEditError(null);
    setSaveError(null);
  };

  const openCreateDrawer = (initial?: Partial<CouponOfferCreateFormValues>) => {
    setSaveError(null);
    setActionError(null);
    setSuccessMessage(null);
    setEditError(null);
    setEditSession(null);
    setInitialValues(initial);
    setIsCreateDrawerOpen(true);
  };

  const handleCreate = async (values: CouponOfferCreateFormValues) => {
    const isDuplicate = initialValues !== undefined;
    setIsSaving(true);
    setSaveError(null);
    setSuccessMessage(null);
    try {
      await createCouponOffer(values, createIdempotencyKey());
      setIsCreateDrawerOpen(false);
      setInitialValues(undefined);
      setSuccessMessage(isDuplicate
        ? t('admin.marketing.promotions.offers.duplicateSuccess', 'Coupon "{{name}}" duplicated.', { name: values.displayName.trim() })
        : t('admin.marketing.promotions.offers.createSuccess', 'Coupon "{{name}}" created.', { name: values.displayName.trim() }));
      refresh();
    } catch (createError) {
      const message = resolveProblemMessage(createError, t, t('admin.marketing.promotions.offers.createError', 'Failed to create coupon'));
      // 优惠券创建接口无幂等键：部分失败后重试可能产生重复记录，提示先确认列表
      setSaveError(`${message} ${t('admin.marketing.coupon.form.retryHint', 'The coupon may have been created; refresh the list to confirm before retrying.')}`);
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * 打开编辑抽屉：先 `retrievePromotionOffer` 读取权威现值与 `version`，再预填。
   * 优惠券在打开前已被删除（404）时直接提示并刷新列表，不打开空抽屉。
   */
  const openEditDrawer = async (offerId: string) => {
    setSaveError(null);
    setEditError(null);
    setActionError(null);
    setSuccessMessage(null);
    setInitialValues(undefined);
    setIsCreateDrawerOpen(false);
    setIsEditLoading(true);
    try {
      const offer = await retrievePromotionOffer(offerId);
      const record = offer as unknown as ApiRecord;
      setEditSession({
        offerId,
        version: readPromotionOfferVersion(record),
        initialValues: offerRecordToEditFormValues(record),
      });
    } catch (loadError) {
      if (readMarketingProblemStatus(loadError) === 404) {
        setActionError({ message: t('admin.marketing.promotions.offers.notFound', 'This coupon no longer exists.'), traceId: null });
        refresh();
      } else {
        setActionError({
          message: resolveProblemMessage(
            loadError,
            t,
            t('admin.marketing.promotions.offers.editLoadError', 'Failed to load the coupon for editing'),
          ),
          traceId: readMarketingProblemTraceId(loadError),
        });
      }
    } finally {
      setIsEditLoading(false);
    }
  };

  /**
   * 提交编辑：`version` 由表单在提交时回传（即 `retrievePromotionOffer` 的
   * 原始十进制字符串，未经过 Number）。409 表示其他会话已改动该优惠券：
   * 保持抽屉打开并提示重载，绝不丢掉运营已输入的内容。
   */
  const handleEdit = async (values: CouponOfferCreateFormValues, version?: string) => {
    const session = editSession;
    if (!session) {
      return;
    }
    setIsSaving(true);
    setEditError(null);
    setSuccessMessage(null);
    try {
      await updatePromotionOffer(
        session.offerId,
        buildCouponOfferUpdateRequest(values, version ?? session.version),
      );
      setEditSession(null);
      setSuccessMessage(t('admin.marketing.promotions.offers.editSuccess', 'Coupon "{{name}}" updated.', { name: values.displayName.trim() }));
      refresh();
    } catch (updateError) {
      const status = readMarketingProblemStatus(updateError);
      if (status === 409) {
        setEditError({
          kind: 'conflict',
          message: t(
            'admin.marketing.promotions.offers.editConflict',
            'This coupon was changed by another session. Reload the offer to get its latest version, then save again.',
          ),
          traceId: readMarketingProblemTraceId(updateError),
        });
      } else if (status === 404) {
        setEditSession(null);
        setActionError({ message: t('admin.marketing.promotions.offers.notFound', 'This coupon no longer exists.'), traceId: null });
        refresh();
      } else {
        setEditError({
          kind: 'error',
          message: resolveProblemMessage(
            updateError,
            t,
            t('admin.marketing.promotions.offers.editError', 'Failed to update coupon'),
          ),
          traceId: readMarketingProblemTraceId(updateError),
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * 409 后重新读取优惠券：只刷新 `version`（及名称）并清掉冲突提示，
   * 抽屉与表单实例保持挂载，运营已输入的值不会被重置。
   */
  const reloadEditOffer = async () => {
    const session = editSession;
    if (!session) {
      return;
    }
    setIsEditReloading(true);
    setEditError(null);
    try {
      const offer = await retrievePromotionOffer(session.offerId);
      const record = offer as unknown as ApiRecord;
      setEditSession((current) => current
        ? {
            ...current,
            version: readPromotionOfferVersion(record),
          }
        : current);
    } catch (reloadError) {
      if (readMarketingProblemStatus(reloadError) === 404) {
        setEditSession(null);
        setActionError({ message: t('admin.marketing.promotions.offers.notFound', 'This coupon no longer exists.'), traceId: null });
        refresh();
      } else {
        setEditError({
          kind: 'error',
          message: resolveProblemMessage(
            reloadError,
            t,
            t('admin.marketing.promotions.offers.editReloadError', 'Failed to reload the offer'),
          ),
          traceId: readMarketingProblemTraceId(reloadError),
        });
      }
    } finally {
      setIsEditReloading(false);
    }
  };

  const requestToggleStatus = (record: ApiRecord) => {
    setActionError(null);
    setSuccessMessage(null);
    setPendingAction({
      kind: 'toggle',
      record,
      targetStatus: record['status'] === 'active' ? 'disabled' : 'active',
    });
  };

  const requestDelete = (record: ApiRecord) => {
    setActionError(null);
    setSuccessMessage(null);
    if (record['status'] === 'active') {
      setActionError({
        message: t('admin.marketing.promotions.offers.disableFirst', 'Disable the offer before deleting it.'),
        traceId: null,
      });
      return;
    }
    setPendingAction({ kind: 'delete', record });
  };

  const confirmPendingAction = async () => {
    const action = pendingAction;
    if (!action) {
      return;
    }
    setPendingAction(null);
    setActionError(null);
    setSuccessMessage(null);
    setIsActionBusy(true);
    const offerId = String(action.record['id']);
    const offerName = readOfferName(action.record);
    try {
      if (action.kind === 'delete') {
        await deletePromotionOffer(offerId);
        setSuccessMessage(t('admin.marketing.promotions.offers.deleteSuccess', 'Coupon "{{name}}" deleted.', { name: offerName }));
      } else {
        await updatePromotionOfferStatus(offerId, action.targetStatus);
        setSuccessMessage(action.targetStatus === 'disabled'
          ? t('admin.marketing.promotions.offers.disableSuccess', 'Coupon "{{name}}" disabled.', { name: offerName })
          : t('admin.marketing.promotions.offers.enableSuccess', 'Coupon "{{name}}" enabled.', { name: offerName }));
      }
      refresh();
    } catch (actionFailure) {
      // 后端对“仍有已发放库存/券码”的优惠券返回 409：直接告诉运营先停用，
      // 而不是展示一条与业务无关的原始失败信息。
      const inUse = action.kind === 'delete' && readMarketingProblemStatus(actionFailure) === 409;
      setActionError({
        message: inUse
          ? t(
              'admin.marketing.promotions.offers.deleteInUse',
              'This coupon is in use and cannot be deleted. Disable the coupon first, then delete it.',
            )
          : resolveProblemMessage(
              actionFailure,
              t,
              action.kind === 'delete'
                ? t('admin.marketing.promotions.offers.deleteError', 'Failed to delete offer')
                : t('admin.marketing.promotions.offers.statusError', 'Failed to update offer status'),
            ),
        traceId: readMarketingProblemTraceId(actionFailure),
      });
    } finally {
      setIsActionBusy(false);
    }
  };

  const columns: MarketingColumn<ApiRecord>[] = [
    { key: 'offerNo', label: t('admin.col.offerNo', 'Offer No'), truncate: true },
    {
      key: 'displayName',
      label: t('admin.col.name', 'Name'),
      truncate: true,
      render: (value) => (
        <span className="font-medium text-slate-900 dark:text-white">
          {value === null || value === undefined || String(value).trim() === ''
            ? MARKETING_EMPTY_VALUE
            : String(value)}
        </span>
      ),
    },
    {
      key: 'offerType',
      label: t('admin.col.type', 'Type'),
      render: (value) => marketingEnumLabel(value, 'admin.marketing.enums.offerType', t),
    },
    {
      key: 'audienceScope',
      label: t('admin.col.audience', 'Audience'),
      render: (value) => marketingEnumLabel(value, 'admin.marketing.enums.audience', t),
    },
    {
      key: 'couponBenefit',
      label: t('admin.col.benefit', 'Benefit'),
      render: (_value, record) => <CouponBenefitSummary record={record} />,
    },
    {
      key: 'issuance',
      label: t('admin.col.issuance', 'Issued / Stock'),
      numeric: true,
      render: (_value, record) => {
        const stocks = stockByOffer[String(record['id'])] ?? [];
        if (stocks.length === 0) {
          return MARKETING_EMPTY_VALUE;
        }
        const claimed = sumStockQuantity(stocks, 'claimedQuantity');
        const unlimited = stocks.some((stock) => isUnlimitedPromotionStock(stock));
        const total = sumStockQuantity(stocks, 'totalQuantity');
        return (
          <span className="text-xs tabular-nums">
            {formatMarketingInteger(claimed)} / {formatMarketingInteger(total, { unlimited })}
          </span>
        );
      },
    },
    {
      key: 'status',
      label: t('admin.col.status', 'Status'),
      render: (value) => (
        <MarketingStatusBadge
          status={value}
          domain="offer"
          activeLabel={t('admin.marketing.promotions.status.active', 'Active')}
          inactiveLabel={t('admin.marketing.promotions.status.inactive', 'Inactive')}
        />
      ),
    },
    { key: 'startsAt', label: t('admin.col.starts', 'Starts') },
    { key: 'endsAt', label: t('admin.col.ends', 'Ends') },
    { key: 'updatedAt', label: t('admin.col.updated', 'Updated') },
  ];

  const pendingName = pendingAction
    ? String(pendingAction.record['displayName'] ?? pendingAction.record['id'])
    : '';

  return (
    <>
      <MarketingOverviewBar />
      {actionError ? (
        <MarketingInlineAlert
          message={actionError.message}
          traceId={actionError.traceId}
          onDismiss={() => setActionError(null)}
        />
      ) : successMessage ? (
        <MarketingInlineAlert
          tone="success"
          message={successMessage}
          onDismiss={() => setSuccessMessage(null)}
        />
      ) : null}
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
            className="inline-flex items-center gap-1 rounded-md bg-lobster-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-lobster-700 focus-visible:ring-2 focus-visible:ring-lobster-500"
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
                label={t('admin.marketing.promotions.offers.edit', 'Edit')}
                icon={<Pencil className="h-4 w-4" />}
                disabled={isActionBusy || isEditLoading}
                onClick={() => void openEditDrawer(String(record['id']))}
              />
              <MarketingIconActionButton
                label={t('admin.marketing.promotions.offers.copy', 'Duplicate')}
                icon={<Copy className="h-4 w-4" />}
                onClick={() => openCreateDrawer(offerRecordToFormValues(record, t('admin.marketing.coupon.form.copySuffix', ' (Copy)')))}
              />
              <MarketingIconActionButton
                label={active
                  ? t('admin.marketing.promotions.offers.disable', 'Disable')
                  : t('admin.marketing.promotions.offers.enable', 'Enable')}
                icon={active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                disabled={isActionBusy}
                onClick={() => requestToggleStatus(record)}
              />
              <MarketingIconActionButton
                label={t('admin.marketing.promotions.offers.delete', 'Delete')}
                icon={<Trash2 className="h-4 w-4" />}
                tone="danger"
                disabled={isActionBusy}
                onClick={() => requestDelete(record)}
              />
            </MarketingTableActions>
          );
        }}
      />

      <MarketingDrawer
        title={editSession
          ? t('admin.marketing.coupon.form.editTitle', 'Edit Coupon')
          : t('admin.marketing.coupon.form.title', 'Create Coupon')}
        description={editSession
          ? t('admin.marketing.coupon.form.editSubtitle', 'Update the coupon rule. Saving creates a new version of the rule.')
          : initialValues
            ? t('admin.marketing.coupon.form.copySubtitle', 'Duplicate of an existing coupon. Adjust and submit to create.')
            : t('admin.marketing.coupon.form.subtitle', 'Define the coupon benefit, issuance settings, and code generation mode.')}
        isOpen={isCreateDrawerOpen || editSession !== null}
        onClose={closeOfferDrawer}
        side="left"
        footer={(
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={closeOfferDrawer}
              className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
            >
              {t('common.actions.cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              form="couponOfferCreateForm"
              disabled={isSaving}
              className="rounded-md bg-lobster-600 px-4 py-2 text-sm font-medium text-white hover:bg-lobster-700 disabled:opacity-50"
            >
              {isSaving
                ? t('common.actions.saving', 'Saving...')
                : editSession
                  ? t('admin.marketing.coupon.form.save', 'Save Changes')
                  : t('admin.marketing.coupon.form.create', 'Create Coupon')}
            </button>
          </div>
        )}
      >
        {editError ? (
          <div className="mb-4">
            <MarketingInlineAlert
              message={editError.message}
              traceId={editError.traceId}
              action={editError.kind === 'conflict' ? (
                <button
                  type="button"
                  disabled={isEditReloading}
                  onClick={() => void reloadEditOffer()}
                  className="inline-flex items-center rounded-md border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-500/30 dark:bg-white/10 dark:text-red-300 dark:hover:bg-white/20"
                >
                  {t('admin.marketing.promotions.offers.editReload', 'Reload offer')}
                </button>
              ) : undefined}
            />
          </div>
        ) : null}
        <CouponOfferCreateDrawerForm
          key={editSession?.offerId ?? 'create'}
          mode={editSession ? 'edit' : 'create'}
          error={editSession ? null : saveError}
          initialValues={editSession ? editSession.initialValues : initialValues}
          initialVersion={editSession?.version}
          onSubmit={(values, version) => {
            if (editSession) {
              void handleEdit(values, version);
              return;
            }
            void handleCreate(values);
          }}
        />
      </MarketingDrawer>

      <OfferDetailDrawer
        offerId={detailOfferId}
        onClose={() => setDetailOfferId(null)}
        onEdit={(offerId) => {
          setDetailOfferId(null);
          void openEditDrawer(offerId);
        }}
      />

      {pendingAction ? (
        <ConfirmDialog
          tone={pendingAction.kind === 'delete' || pendingAction.targetStatus === 'disabled' ? 'danger' : 'default'}
          title={pendingAction.kind === 'delete'
            ? t('admin.marketing.promotions.offers.deleteDialog.title', 'Delete coupon?')
            : pendingAction.targetStatus === 'disabled'
              ? t('admin.marketing.promotions.offers.disableDialog.title', 'Disable coupon?')
              : t('admin.marketing.promotions.offers.enableDialog.title', 'Enable coupon?')}
          description={pendingAction.kind === 'delete'
            ? t('admin.marketing.promotions.offers.deleteConfirm', 'Delete coupon {{name}}? This cannot be undone.', { name: pendingName })
            : pendingAction.targetStatus === 'disabled'
              ? t(
                  'admin.marketing.promotions.offers.disableDialog.body',
                  'Disabling "{{name}}" stops redemptions immediately: users can no longer claim or redeem this coupon.',
                  { name: pendingName },
                )
              : t(
                  'admin.marketing.promotions.offers.enableDialog.body',
                  'Enabling "{{name}}" starts redemptions again: users can claim and redeem this coupon immediately.',
                  { name: pendingName },
                )}
          confirmLabel={pendingAction.kind === 'delete'
            ? t('admin.marketing.promotions.offers.deleteDialog.confirm', 'Delete coupon')
            : pendingAction.targetStatus === 'disabled'
              ? t('admin.marketing.promotions.offers.disableDialog.confirm', 'Disable coupon')
              : t('admin.marketing.promotions.offers.enableDialog.confirm', 'Enable coupon')}
          cancelLabel={t('common.actions.cancel', 'Cancel')}
          onConfirm={() => void confirmPendingAction()}
          onCancel={() => setPendingAction(null)}
        />
      ) : null}
    </>
  );
}
