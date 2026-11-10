import { useEffect, useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog, resolveProblemMessage } from '@sdkwork/cloudroutes-pc-commons';
import type { ApiRecord } from '@sdkwork/cloudroutes-pc-commons/runtime';
import {
  MarketingListView,
  type MarketingColumn,
  type MarketingLoadParams,
  type MarketingStatusOption,
} from '../components/MarketingListView';
import { MarketingStatusBadge, marketingEnumLabel } from '../components/MarketingValueBadge';
import { MarketingInlineAlert } from '../components/MarketingInlineAlert';
import { MarketingTableActions } from '../components/MarketingPageControls';
import {
  backendPromotionDiscountApplicationsList,
  backendReleasePromotionDiscountApplication,
  backendSettlePromotionDiscountApplication,
  formatMarketingAmountMinor,
  MARKETING_EMPTY_VALUE,
  readMarketingProblemStatus,
  readMarketingProblemTraceId,
} from '../marketingService';
import { usePromotionReferences } from '../usePromotionReferences';

/**
 * 抵扣申请的真实状态词表（discount_application.status）。后端按大小写敏感
 * 等值过滤，不能复用 active/disabled 开关。
 */
const discountApplicationStatusOptions: MarketingStatusOption[] = [
  { value: 'applied', labelKey: 'admin.marketing.enums.applicationStatus.applied', fallback: 'Applied' },
  { value: 'settled', labelKey: 'admin.marketing.enums.applicationStatus.settled', fallback: 'Settled' },
  { value: 'released', labelKey: 'admin.marketing.enums.applicationStatus.released', fallback: 'Released' },
  { value: 'rolled_back', labelKey: 'admin.marketing.enums.applicationStatus.rolled_back', fallback: 'Rolled Back' },
];

/**
 * 只有 `applied` 的申请可以结算或释放（后端对其余状态返回 409）。
 * 服务端守卫是权威，这里只用来提前禁用按钮并解释原因。
 */
const SETTLEABLE_APPLICATION_STATUS = 'applied';

/** 成功反馈停留时长（设计规范 §2.5：约 3 秒后自动消失，可手动关闭）。 */
const SUCCESS_FEEDBACK_MS = 3000;

/** 待确认的结算/释放操作。 */
type DiscountApplicationPendingAction =
  | { kind: 'settle'; record: ApiRecord }
  | { kind: 'release'; record: ApiRecord };

/** 页面级或对话框内的失败：人类可读原因 + 可复制的 traceId。 */
type DiscountApplicationActionError = { message: string; traceId: string | null };

/** 申请单 id（int64 十进制字符串，只读取不转换）。 */
function readDiscountApplicationId(record: ApiRecord): string {
  return String(record['id'] ?? '').trim();
}

/** 行状态原值（后端小写状态）。 */
function readDiscountApplicationStatus(record: ApiRecord): string {
  return String(record['status'] ?? '').trim();
}

/** 交互对象的可读名称：优先订单号，其次订单 id、申请单号、记录 id。 */
function readDiscountApplicationOrderLabel(record: ApiRecord): string {
  for (const key of ['orderNo', 'orderId', 'applicationNo', 'id']) {
    const value = String(record[key] ?? '').trim();
    if (value) {
      return value;
    }
  }
  return '';
}

/** 申请单抵扣金额（最小单位 → 金额 + 币种）；缺失时为 `—`。 */
function readDiscountApplicationAmountLabel(record: ApiRecord, locale: string): string {
  const raw = record['discountAmount'];
  return formatMarketingAmountMinor(
    raw === null || raw === undefined ? undefined : String(raw),
    String(record['currencyCode'] ?? ''),
    locale,
  );
}

/** 引用筛选输入：可选精确匹配，空值不进入 query。 */
function ReferenceFilterInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (nextValue: string) => void;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={label}
      aria-label={label}
      className="h-8 w-40 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 placeholder:text-slate-400 focus:border-lobster-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-lobster-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
    />
  );
}

/** 行内次级按钮：结算/释放共用同一视觉规范（h-8、圆角、边框、禁用态）。 */
const discountApplicationActionClassName =
  'inline-flex h-8 items-center rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-lobster-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10';

/**
 * 核销记录（抵扣申请）列表。
 *
 * 除既有搜索/状态外，支持按订单、券码、钱包券三个引用精确筛选：
 * 生成 SDK 的入参是 `orderId` / `codeId` / `userCouponId`，wire 参数名分别是
 * `order_id` / `code_id` / `user_coupon_id`。任一筛选变化都会回到第 1 页
 * （`extraFilters` 节点身份变化由 `MarketingListView` 处理）。
 *
 * 行内动作：`settlements.create`（结算，无请求体）与 `releases.create`
 * （释放，必填原因 1..256）。两者都只允许 `applied` 状态，成功后刷新列表并
 * 在页面顶部给出带金额的成功反馈；409/404 展示后端问题原文 + 可复制 traceId。
 */
export function DiscountApplicationsPage() {
  const { t, i18n } = useTranslation();
  const { offerNames } = usePromotionReferences();
  const [orderId, setOrderId] = useState('');
  const [codeId, setCodeId] = useState('');
  const [userCouponId, setUserCouponId] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [pendingAction, setPendingAction] = useState<DiscountApplicationPendingAction | null>(null);
  const [reason, setReason] = useState('');
  // 对话框内失败（409）：保留对话框，让运营看到问题原文后决定是否重试。
  const [dialogError, setDialogError] = useState<DiscountApplicationActionError | null>(null);
  // 页面级失败（404 等）：对话框关闭后在列表上方展示。
  const [pageError, setPageError] = useState<DiscountApplicationActionError | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isActionBusy, setIsActionBusy] = useState(false);
  const reasonFieldId = useId();
  const reasonHintId = useId();

  useEffect(() => {
    if (!successMessage) {
      return;
    }
    const timer = window.setTimeout(() => setSuccessMessage(null), SUCCESS_FEEDBACK_MS);
    return () => window.clearTimeout(timer);
  }, [successMessage]);

  const refresh = () => setRefreshKey((current) => current + 1);

  const openAction = (action: DiscountApplicationPendingAction) => {
    setPageError(null);
    setSuccessMessage(null);
    setDialogError(null);
    setReason('');
    setPendingAction(action);
  };

  const closeDialog = () => {
    if (isActionBusy) {
      return;
    }
    setPendingAction(null);
    setDialogError(null);
  };

  /** 统一处理失败：409 留在对话框，404 关闭对话框并刷新（记录已不存在）。 */
  const handleActionFailure = (cause: unknown, fallback: string) => {
    const status = readMarketingProblemStatus(cause);
    const traceId = readMarketingProblemTraceId(cause);
    const message = resolveProblemMessage(cause, t, fallback);
    if (status === 404) {
      setPendingAction(null);
      setPageError({ message, traceId });
      refresh();
      return;
    }
    setDialogError({ message, traceId });
  };

  const submitSettle = async () => {
    const action = pendingAction;
    if (!action || action.kind !== 'settle' || isActionBusy) {
      return;
    }
    const applicationId = readDiscountApplicationId(action.record);
    if (!applicationId) {
      return;
    }
    const orderLabel = readDiscountApplicationOrderLabel(action.record);
    const amountLabel = readDiscountApplicationAmountLabel(action.record, i18n.language);
    setIsActionBusy(true);
    setDialogError(null);
    try {
      const result = await backendSettlePromotionDiscountApplication(applicationId);
      setPendingAction(null);
      setSuccessMessage(t(
        'admin.marketing.promotions.discountApplications.settleSuccess',
        'Settled the discount for order {{order}} ({{amount}}). Budget settled: {{settledAmount}}.',
        {
          order: orderLabel,
          amount: amountLabel,
          settledAmount: formatMarketingAmountMinor(
            result.settledAmountMinor,
            String(action.record['currencyCode'] ?? ''),
            i18n.language,
          ),
        },
      ));
      refresh();
    } catch (cause) {
      handleActionFailure(
        cause,
        t(
          'admin.marketing.promotions.discountApplications.settleError',
          'Failed to settle the discount application',
        ),
      );
    } finally {
      setIsActionBusy(false);
    }
  };

  const submitRelease = async () => {
    const action = pendingAction;
    if (!action || action.kind !== 'release' || isActionBusy) {
      return;
    }
    // 服务端同样按 trim 后 1..256 校验；这里先 trim，空值时确认按钮就是禁用的。
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      return;
    }
    const applicationId = readDiscountApplicationId(action.record);
    if (!applicationId) {
      return;
    }
    const orderLabel = readDiscountApplicationOrderLabel(action.record);
    const amountLabel = readDiscountApplicationAmountLabel(action.record, i18n.language);
    setIsActionBusy(true);
    setDialogError(null);
    try {
      const result = await backendReleasePromotionDiscountApplication(applicationId, trimmedReason);
      setPendingAction(null);
      setSuccessMessage(t(
        'admin.marketing.promotions.discountApplications.releaseSuccess',
        'Released the discount for order {{order}} ({{amount}}). Budget released: {{releasedAmount}}.',
        {
          order: orderLabel,
          amount: amountLabel,
          releasedAmount: formatMarketingAmountMinor(
            result.releasedAmountMinor,
            String(action.record['currencyCode'] ?? ''),
            i18n.language,
          ),
        },
      ));
      refresh();
    } catch (cause) {
      handleActionFailure(
        cause,
        t(
          'admin.marketing.promotions.discountApplications.releaseError',
          'Failed to release the discount application',
        ),
      );
    } finally {
      setIsActionBusy(false);
    }
  };

  const load = useMemo(() => (params: MarketingLoadParams) =>
    backendPromotionDiscountApplicationsList({
      ...params,
      ...(orderId.trim() ? { orderId: orderId.trim() } : {}),
      ...(codeId.trim() ? { codeId: codeId.trim() } : {}),
      ...(userCouponId.trim() ? { userCouponId: userCouponId.trim() } : {}),
    }), [orderId, codeId, userCouponId]);

  // 该节点必须 memo：身份变化即"筛选条件变化"，列表据此回到第 1 页并重新拉取。
  const extraFilters = useMemo(() => (
    <div
      className="flex flex-wrap items-center gap-2"
      role="group"
      aria-label={t('admin.marketing.promotions.discountApplications.filterGroup', 'Filter by reference')}
    >
      <ReferenceFilterInput
        label={t('admin.marketing.promotions.discountApplications.filterOrderId', 'Order ID')}
        value={orderId}
        onChange={setOrderId}
      />
      <ReferenceFilterInput
        label={t('admin.marketing.promotions.discountApplications.filterCodeId', 'Code ID')}
        value={codeId}
        onChange={setCodeId}
      />
      <ReferenceFilterInput
        label={t('admin.marketing.promotions.discountApplications.filterUserCouponId', 'User Coupon ID')}
        value={userCouponId}
        onChange={setUserCouponId}
      />
    </div>
  ), [orderId, codeId, userCouponId, t]);

  const columns: MarketingColumn<ApiRecord>[] = [
    { key: 'applicationNo', label: t('admin.col.application', 'Application') },
    { key: 'orderNo', label: t('admin.col.order', 'Order') },
    { key: 'orderId', label: t('admin.col.orderId', 'Order Id') },
    { key: 'offerId', label: t('admin.col.offer', 'Offer'), render: (value) => offerNames[String(value)] || String(value) },
    {
      key: 'discountType',
      label: t('admin.col.discountType', 'Discount Type'),
      render: (value) => marketingEnumLabel(value, 'admin.marketing.enums.discountType', t),
    },
    {
      key: 'discountAmount',
      label: t('admin.col.discount', 'Discount'),
      align: 'right',
      render: (value, record) => formatMarketingAmountMinor(
        value === null || value === undefined ? undefined : String(value),
        String(record['currencyCode'] ?? ''),
        i18n.language,
      ),
    },
    {
      key: 'status',
      label: t('admin.col.status', 'Status'),
      render: (value) => <MarketingStatusBadge status={value} domain="application" />,
    },
    { key: 'appliedAt', label: t('admin.col.appliedAt', 'Applied At') },
    { key: 'settledAt', label: t('admin.col.settledAt', 'Settled At') },
    { key: 'releasedAt', label: t('admin.col.releasedAt', 'Released At') },
    { key: 'rolledBackAt', label: t('admin.col.rolledBackAt', 'Rolled Back At') },
  ];

  const pendingOrderLabel = pendingAction ? readDiscountApplicationOrderLabel(pendingAction.record) : '';
  const pendingAmountLabel = pendingAction
    ? readDiscountApplicationAmountLabel(pendingAction.record, i18n.language)
    : MARKETING_EMPTY_VALUE;

  return (
    <>
      <MarketingListView
        title={t('admin.marketing.promotions.discountApplications.title', 'Usage History')}
        description={t('admin.marketing.promotions.discountApplications.desc', 'Coupon usage history: checkout applications, settlements, releases, and reversals tied to orders.')}
        load={load}
        columns={columns}
        showStatusFilter
        statusOptions={discountApplicationStatusOptions}
        searchPlaceholder={t('admin.marketing.promotions.discountApplications.search', 'Search by application no or order no')}
        extraFilters={extraFilters}
        exportable
        exportFileName="usage-history.csv"
        refreshKey={refreshKey}
        banner={pageError ? (
          <MarketingInlineAlert
            message={pageError.message}
            traceId={pageError.traceId}
            onDismiss={() => setPageError(null)}
          />
        ) : successMessage ? (
          <MarketingInlineAlert
            tone="success"
            message={successMessage}
            onDismiss={() => setSuccessMessage(null)}
          />
        ) : null}
        rowActions={(record) => {
          const applicationId = readDiscountApplicationId(record);
          const status = readDiscountApplicationStatus(record);
          const orderLabel = readDiscountApplicationOrderLabel(record);
          // 只有 applied 可以结算/释放；其余状态按钮禁用，并在 title 里说明当前状态。
          const blockedTitle = !applicationId
            ? t(
                'admin.marketing.promotions.discountApplications.missingId',
                'This row has no application id, so it cannot be settled or released.',
              )
            : status !== SETTLEABLE_APPLICATION_STATUS
              ? t(
                  'admin.marketing.promotions.discountApplications.actionBlocked',
                  'Only applied discount applications can be settled or released; this application is {{status}}.',
                  { status: status || MARKETING_EMPTY_VALUE },
                )
              : null;
          const settleLabel = t(
            'admin.marketing.promotions.discountApplications.settleAria',
            'Settle the discount for order {{order}}',
            { order: orderLabel },
          );
          const releaseLabel = t(
            'admin.marketing.promotions.discountApplications.releaseAria',
            'Release the discount for order {{order}}',
            { order: orderLabel },
          );
          return (
            <MarketingTableActions>
              <button
                type="button"
                aria-label={settleLabel}
                title={blockedTitle ?? settleLabel}
                disabled={isActionBusy || blockedTitle !== null}
                onClick={() => openAction({ kind: 'settle', record })}
                className={discountApplicationActionClassName}
              >
                {t('admin.marketing.promotions.discountApplications.settle', 'Settle')}
              </button>
              <button
                type="button"
                aria-label={releaseLabel}
                title={blockedTitle ?? releaseLabel}
                disabled={isActionBusy || blockedTitle !== null}
                onClick={() => openAction({ kind: 'release', record })}
                className={discountApplicationActionClassName}
              >
                {t('admin.marketing.promotions.discountApplications.release', 'Release')}
              </button>
            </MarketingTableActions>
          );
        }}
      />

      {pendingAction?.kind === 'settle' ? (
        <ConfirmDialog
          title={t('admin.marketing.promotions.discountApplications.settleDialog.title', 'Settle discount application?')}
          description={t(
            'admin.marketing.promotions.discountApplications.settleDialog.body',
            'Settle the discount for order {{order}} of {{amount}}? The reserved budget becomes spent and the application can no longer be released.',
            { order: pendingOrderLabel, amount: pendingAmountLabel },
          )}
          confirmLabel={isActionBusy
            ? t('common.actions.saving', 'Saving...')
            : t('admin.marketing.promotions.discountApplications.settleDialog.confirm', 'Settle')}
          confirmDisabled={isActionBusy}
          cancelLabel={t('common.actions.cancel', 'Cancel')}
          onConfirm={() => void submitSettle()}
          onCancel={closeDialog}
        >
          {dialogError ? (
            <MarketingInlineAlert message={dialogError.message} traceId={dialogError.traceId} />
          ) : null}
        </ConfirmDialog>
      ) : null}

      {pendingAction?.kind === 'release' ? (
        <ConfirmDialog
          title={t('admin.marketing.promotions.discountApplications.releaseDialog.title', 'Release discount application?')}
          description={t(
            'admin.marketing.promotions.discountApplications.releaseDialog.body',
            'Release the discount for order {{order}} of {{amount}}? The reserved budget returns to the available pool and the application can no longer be settled.',
            { order: pendingOrderLabel, amount: pendingAmountLabel },
          )}
          confirmLabel={isActionBusy
            ? t('common.actions.saving', 'Saving...')
            : t('admin.marketing.promotions.discountApplications.releaseDialog.confirm', 'Release')}
          confirmDisabled={isActionBusy || reason.trim().length === 0}
          cancelLabel={t('common.actions.cancel', 'Cancel')}
          onConfirm={() => void submitRelease()}
          onCancel={closeDialog}
        >
          <label
            htmlFor={reasonFieldId}
            className="block text-xs font-medium text-slate-600 dark:text-slate-300"
          >
            {t('admin.marketing.promotions.stopLoss.reason.label', 'Reason')}
          </label>
          <textarea
            id={reasonFieldId}
            rows={3}
            maxLength={256}
            required
            value={reason}
            onChange={(event) => {
              setReason(event.target.value);
              setDialogError(null);
            }}
            aria-describedby={reasonHintId}
            aria-required="true"
            className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-lobster-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-lobster-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
          />
          <p id={reasonHintId} className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t(
              'admin.marketing.promotions.stopLoss.reason.hint',
              'Required (1–256 characters). Stored with the audit record.',
            )}
          </p>
          {dialogError ? (
            <div className="mt-2">
              <MarketingInlineAlert message={dialogError.message} traceId={dialogError.traceId} />
            </div>
          ) : null}
        </ConfirmDialog>
      ) : null}
    </>
  );
}
