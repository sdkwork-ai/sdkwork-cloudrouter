import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Ban, CalendarClock } from 'lucide-react';
import { ConfirmDialog, resolveProblemMessage } from '@sdkwork/cloudroutes-pc-commons';
import type { ApiRecord } from '@sdkwork/cloudroutes-pc-commons/runtime';
import { MarketingListView, type MarketingColumn, type MarketingStatusOption } from '../components/MarketingListView';
import { MarketingStatusBadge, marketingEnumLabel } from '../components/MarketingValueBadge';
import { MarketingInlineAlert } from '../components/MarketingInlineAlert';
import {
  MarketingIconActionButton,
  MarketingTableActions,
} from '../components/MarketingPageControls';
import {
  backendExtendPromotionUserCoupon,
  backendPromotionUserCouponsList,
  backendVoidPromotionUserCoupon,
  formatMarketingTimestamp,
  MARKETING_EMPTY_VALUE,
  readMarketingProblemStatus,
  readMarketingProblemTraceId,
  toDatetimeLocal,
  toIsoString,
} from '../marketingService';
import { usePromotionReferences } from '../usePromotionReferences';

/**
 * 用户券的真实状态词表（promotion_user_coupon.status）。后端按大小写敏感等值
 * 过滤，因此这里必须逐个列出 claimed/…/active，不能复用 active/disabled 开关。
 */
const userCouponStatusOptions: MarketingStatusOption[] = [
  { value: 'claimed', labelKey: 'admin.marketing.enums.userCouponStatus.claimed', fallback: 'Claimed' },
  { value: 'redeemed', labelKey: 'admin.marketing.enums.userCouponStatus.redeemed', fallback: 'Redeemed' },
  { value: 'pending', labelKey: 'admin.marketing.enums.userCouponStatus.pending', fallback: 'Pending' },
  { value: 'expired', labelKey: 'admin.marketing.enums.userCouponStatus.expired', fallback: 'Expired' },
  { value: 'disabled', labelKey: 'admin.marketing.enums.userCouponStatus.disabled', fallback: 'Disabled' },
  { value: 'voided', labelKey: 'admin.marketing.enums.userCouponStatus.voided', fallback: 'Voided' },
  { value: 'cancelled', labelKey: 'admin.marketing.enums.userCouponStatus.cancelled', fallback: 'Cancelled' },
  { value: 'used', labelKey: 'admin.marketing.enums.userCouponStatus.used', fallback: 'Used' },
  { value: 'active', labelKey: 'admin.marketing.enums.userCouponStatus.active', fallback: 'Active' },
];

/**
 * 止损操作（作废/延期）允许的钱包券状态，与后端守卫一致：
 * 已领取未使用、生效中、待生效。已核销（redeemed）不在此列——那是退款流程，
 * 不能用作废来"止损"。
 */
const USER_COUPON_STOP_LOSS_STATUSES = new Set(['claimed', 'active', 'pending']);

/** 成功反馈停留时长（设计规范 §2.5：约 3 秒后自动消失，可手动关闭）。 */
const SUCCESS_FEEDBACK_MS = 3000;

/** 待确认的止损操作。 */
type UserCouponPendingAction =
  | { kind: 'void'; record: ApiRecord }
  | { kind: 'extend'; record: ApiRecord };

/** 页面级或对话框内的失败：人类可读原因 + 可复制的 traceId。 */
type UserCouponActionError = { message: string; traceId: string | null };

/** 交互对象的可读名称：优先券号，缺失时回退记录 id。 */
function readUserCouponLabel(record: ApiRecord): string {
  const couponNo = String(record['couponNo'] ?? '').trim();
  return couponNo || String(record['id'] ?? '').trim();
}

/** 行状态原值（后端小写状态；空值展示为占位符）。 */
function readUserCouponStatus(record: ApiRecord): string {
  return String(record['status'] ?? '').trim();
}

export function UserCouponsPage() {
  const { t, i18n } = useTranslation();
  const { offerNames, stockNames } = usePromotionReferences();
  const [refreshKey, setRefreshKey] = useState(0);
  const [pendingAction, setPendingAction] = useState<UserCouponPendingAction | null>(null);
  const [reason, setReason] = useState('');
  const [expiresAtLocal, setExpiresAtLocal] = useState('');
  const [minExpiresAtLocal, setMinExpiresAtLocal] = useState('');
  const [voidError, setVoidError] = useState<UserCouponActionError | null>(null);
  const [extendError, setExtendError] = useState<UserCouponActionError | null>(null);
  const [extendValidation, setExtendValidation] = useState<string | null>(null);
  const [pageError, setPageError] = useState<UserCouponActionError | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isActionBusy, setIsActionBusy] = useState(false);
  const reasonFieldId = useId();
  const reasonHintId = useId();
  const expiryFieldId = useId();
  const expiryHintId = useId();

  useEffect(() => {
    if (!successMessage) {
      return;
    }
    const timer = window.setTimeout(() => setSuccessMessage(null), SUCCESS_FEEDBACK_MS);
    return () => window.clearTimeout(timer);
  }, [successMessage]);

  const refresh = () => setRefreshKey((current) => current + 1);

  const openVoidDialog = (record: ApiRecord) => {
    setPageError(null);
    setSuccessMessage(null);
    setVoidError(null);
    setExtendError(null);
    setExtendValidation(null);
    setReason('');
    setPendingAction({ kind: 'void', record });
  };

  const openExtendDialog = (record: ApiRecord) => {
    setPageError(null);
    setSuccessMessage(null);
    setVoidError(null);
    setExtendError(null);
    setExtendValidation(null);
    setReason('');
    const currentExpiry = String(record['expiresAt'] ?? '').trim();
    // 默认值 = 当前到期时间；最小值 = 现在（后端仍按数据库时钟再校验一次）。
    setExpiresAtLocal(currentExpiry ? toDatetimeLocal(currentExpiry) : '');
    setMinExpiresAtLocal(toDatetimeLocal(new Date().toISOString()));
    setPendingAction({ kind: 'extend', record });
  };

  const closeDialog = () => {
    if (isActionBusy) {
      return;
    }
    setPendingAction(null);
    setVoidError(null);
    setExtendError(null);
    setExtendValidation(null);
  };

  const submitVoid = async () => {
    const action = pendingAction;
    if (!action || action.kind !== 'void' || isActionBusy) {
      return;
    }
    // 服务端同样按 trim 后 1..256 校验；这里先 trim，确认按钮在空值时是禁用的。
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      return;
    }
    const couponLabel = readUserCouponLabel(action.record);
    setIsActionBusy(true);
    setVoidError(null);
    try {
      await backendVoidPromotionUserCoupon(String(action.record['id']), trimmedReason);
      setPendingAction(null);
      setSuccessMessage(t(
        'admin.marketing.promotions.userCoupons.voidSuccess',
        'Coupon "{{coupon}}" voided.',
        { coupon: couponLabel },
      ));
      refresh();
    } catch (cause) {
      const status = readMarketingProblemStatus(cause);
      const traceId = readMarketingProblemTraceId(cause);
      if (status === 404) {
        // 记录已不存在：关闭对话框并在列表上方展示后端 problem 原文 + traceId，同时刷新。
        setPendingAction(null);
        setPageError({
          message: resolveProblemMessage(
            cause,
            t,
            t('admin.marketing.promotions.userCoupons.notFound', 'This coupon no longer exists.'),
          ),
          traceId,
        });
        refresh();
      } else {
        setVoidError({
          message: resolveProblemMessage(
            cause,
            t,
            t('admin.marketing.promotions.userCoupons.voidError', 'Failed to void the coupon'),
          ),
          traceId,
        });
      }
    } finally {
      setIsActionBusy(false);
    }
  };

  const submitExtend = async () => {
    const action = pendingAction;
    if (!action || action.kind !== 'extend' || isActionBusy) {
      return;
    }
    const value = expiresAtLocal.trim();
    if (!value) {
      setExtendValidation(t('admin.marketing.promotions.userCoupons.extendDialog.invalid', 'Choose a valid date and time.'));
      return;
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      setExtendValidation(t('admin.marketing.promotions.userCoupons.extendDialog.invalid', 'Choose a valid date and time.'));
      return;
    }
    // 客户端先拦截"过去时间"，避免无谓请求；后端 400 的原文仍会贴回字段下方（见 catch）。
    if (parsed.getTime() <= Date.now()) {
      setExtendValidation(t('admin.marketing.promotions.userCoupons.extendDialog.past', 'The new expiry must be in the future.'));
      return;
    }
    setExtendValidation(null);
    setExtendError(null);
    setIsActionBusy(true);
    const couponLabel = readUserCouponLabel(action.record);
    try {
      const result = await backendExtendPromotionUserCoupon(
        String(action.record['id']),
        toIsoString(value),
      );
      setPendingAction(null);
      setSuccessMessage(t(
        'admin.marketing.promotions.userCoupons.extendSuccess',
        'Coupon "{{coupon}}" now expires at {{expiresAt}}.',
        { coupon: couponLabel, expiresAt: formatMarketingTimestamp(result.expiresAt, i18n.language) },
      ));
      refresh();
    } catch (cause) {
      const status = readMarketingProblemStatus(cause);
      const traceId = readMarketingProblemTraceId(cause);
      if (status === 400) {
        // 后端按数据库时钟判定过去时间：把 ProblemDetail 原文贴在字段下方，
        // 而不是替换成一条与业务无关的通用失败。
        setExtendError({
          message: resolveProblemMessage(
            cause,
            t,
            t('admin.marketing.promotions.userCoupons.extendDialog.past', 'The new expiry must be in the future.'),
          ),
          traceId,
        });
      } else if (status === 404) {
        setPendingAction(null);
        setPageError({
          message: resolveProblemMessage(
            cause,
            t,
            t('admin.marketing.promotions.userCoupons.notFound', 'This coupon no longer exists.'),
          ),
          traceId,
        });
        refresh();
      } else {
        setExtendError({
          message: resolveProblemMessage(
            cause,
            t,
            t('admin.marketing.promotions.userCoupons.extendError', 'Failed to extend the coupon'),
          ),
          traceId,
        });
      }
    } finally {
      setIsActionBusy(false);
    }
  };

  const columns: MarketingColumn<ApiRecord>[] = [
    { key: 'couponNo', label: t('admin.col.coupon', 'Coupon') },
    { key: 'couponCode', label: t('admin.col.code', 'Code') },
    { key: 'ownerUserId', label: t('admin.col.user', 'User') },
    { key: 'stockId', label: t('admin.col.stock', 'Stock'), render: (value) => stockNames[String(value)] || String(value) },
    { key: 'offerId', label: t('admin.col.offer', 'Offer'), render: (value) => offerNames[String(value)] || String(value) },
    {
      key: 'status',
      label: t('admin.col.status', 'Status'),
      render: (value) => <MarketingStatusBadge status={value} domain="userCoupon" />,
    },
    { key: 'claimedAt', label: t('admin.col.claimedAt', 'Claimed At') },
    { key: 'validFrom', label: t('admin.col.validFrom', 'Valid From') },
    { key: 'expiresAt', label: t('admin.col.expires', 'Expires') },
    { key: 'redeemedAt', label: t('admin.col.redeemedAt', 'Redeemed At') },
    {
      key: 'sourceType',
      label: t('admin.col.sourceType', 'Source'),
      render: (value) => (value
        ? marketingEnumLabel(value, 'admin.marketing.enums.sourceType', t)
        : t('admin.marketing.enums.sourceType.claim', 'User Claim')),
    },
  ];

  const pendingCouponLabel = pendingAction ? readUserCouponLabel(pendingAction.record) : '';
  const blockedTitleFor = (status: string) => t(
    'admin.marketing.promotions.userCoupons.stopLossBlocked',
    'Only claimed, active, or pending coupons can be voided or extended; this coupon is {{status}}.',
    { status: status || MARKETING_EMPTY_VALUE },
  );
  const currentExpiryLabel = pendingAction?.kind === 'extend'
    ? formatMarketingTimestamp(String(pendingAction.record['expiresAt'] ?? ''), i18n.language)
    : MARKETING_EMPTY_VALUE;

  return (
    <>
      <MarketingListView
        title={t('admin.marketing.promotions.userCoupons.title', 'Claim Records')}
        description={t('admin.marketing.promotions.userCoupons.desc', 'Coupons claimed by users, with the issued code, owner, and lifecycle timestamps.')}
        load={backendPromotionUserCouponsList}
        columns={columns}
        showStatusFilter
        statusOptions={userCouponStatusOptions}
        searchPlaceholder={t('admin.marketing.promotions.userCoupons.search', 'Search by user id or coupon no')}
        exportable
        exportFileName="claim-records.csv"
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
          const status = readUserCouponStatus(record);
          const blocked = !USER_COUPON_STOP_LOSS_STATUSES.has(status);
          const couponLabel = readUserCouponLabel(record);
          const voidLabel = t(
            'admin.marketing.promotions.userCoupons.voidAria',
            'Void coupon {{coupon}}',
            { coupon: couponLabel },
          );
          const extendLabel = t(
            'admin.marketing.promotions.userCoupons.extendAria',
            'Extend coupon {{coupon}} expiry',
            { coupon: couponLabel },
          );
          return (
            <MarketingTableActions>
              <MarketingIconActionButton
                label={voidLabel}
                title={blocked ? blockedTitleFor(status) : voidLabel}
                icon={<Ban className="h-4 w-4" aria-hidden="true" />}
                tone="danger"
                disabled={isActionBusy || blocked}
                onClick={() => openVoidDialog(record)}
              />
              <MarketingIconActionButton
                label={extendLabel}
                title={blocked ? blockedTitleFor(status) : extendLabel}
                icon={<CalendarClock className="h-4 w-4" aria-hidden="true" />}
                disabled={isActionBusy || blocked}
                onClick={() => openExtendDialog(record)}
              />
            </MarketingTableActions>
          );
        }}
      />

      {pendingAction?.kind === 'void' ? (
        <ConfirmDialog
          tone="danger"
          title={t('admin.marketing.promotions.userCoupons.voidDialog.title', 'Void coupon?')}
          description={t(
            'admin.marketing.promotions.userCoupons.voidDialog.body',
            'Void coupon "{{coupon}}"? The customer can no longer redeem it and the coupon is unusable immediately. This cannot be undone.',
            { coupon: pendingCouponLabel },
          )}
          confirmLabel={isActionBusy
            ? t('common.actions.saving', 'Saving...')
            : t('admin.marketing.promotions.userCoupons.voidDialog.confirm', 'Void coupon')}
          confirmDisabled={isActionBusy || reason.trim().length === 0}
          cancelLabel={t('common.actions.cancel', 'Cancel')}
          onConfirm={() => void submitVoid()}
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
              setVoidError(null);
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
          {voidError ? (
            <div className="mt-2">
              <MarketingInlineAlert message={voidError.message} traceId={voidError.traceId} />
            </div>
          ) : null}
        </ConfirmDialog>
      ) : null}

      {pendingAction?.kind === 'extend' ? (
        <ConfirmDialog
          title={t('admin.marketing.promotions.userCoupons.extendDialog.title', 'Extend coupon expiry?')}
          description={t(
            'admin.marketing.promotions.userCoupons.extendDialog.body',
            'Extend coupon "{{coupon}}"? The coupon stays usable until the new expiry, which must be in the future.',
            { coupon: pendingCouponLabel },
          )}
          confirmLabel={isActionBusy
            ? t('common.actions.saving', 'Saving...')
            : t('admin.marketing.promotions.userCoupons.extendDialog.confirm', 'Extend expiry')}
          confirmDisabled={isActionBusy || expiresAtLocal.trim().length === 0}
          cancelLabel={t('common.actions.cancel', 'Cancel')}
          onConfirm={() => void submitExtend()}
          onCancel={closeDialog}
        >
          <label
            htmlFor={expiryFieldId}
            className="block text-xs font-medium text-slate-600 dark:text-slate-300"
          >
            {t('admin.marketing.promotions.userCoupons.extendDialog.field', 'New expiry')}
          </label>
          <input
            id={expiryFieldId}
            type="datetime-local"
            value={expiresAtLocal}
            min={minExpiresAtLocal}
            onChange={(event) => {
              setExpiresAtLocal(event.target.value);
              setExtendValidation(null);
              setExtendError(null);
            }}
            aria-describedby={expiryHintId}
            aria-invalid={extendValidation !== null || extendError !== null}
            className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-lobster-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-lobster-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
          />
          <p id={expiryHintId} className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t(
              'admin.marketing.promotions.userCoupons.extendDialog.current',
              'Current expiry: {{expiresAt}}',
              { expiresAt: currentExpiryLabel },
            )}
          </p>
          {extendValidation ? (
            <p role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400">
              {extendValidation}
            </p>
          ) : null}
          {extendError ? (
            <div className="mt-2">
              <MarketingInlineAlert message={extendError.message} traceId={extendError.traceId} />
            </div>
          ) : null}
        </ConfirmDialog>
      ) : null}
    </>
  );
}
