import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Ban, Eye, RotateCcw, X } from 'lucide-react';
import { ConfirmDialog, resolveProblemMessage } from '@sdkwork/cloudroutes-pc-commons';
import type { ApiRecord } from '@sdkwork/cloudroutes-pc-commons/runtime';
import { MarketingStatusBadge } from '../components/MarketingDrawer';
import { MarketingInlineAlert } from '../components/MarketingInlineAlert';
import { MarketingListView, type MarketingColumn } from '../components/MarketingListView';
import {
  MarketingIconActionButton,
  MarketingTableActions,
} from '../components/MarketingPageControls';
import { marketingEnumLabel } from '../components/MarketingValueBadge';
import { CopyablePromotionCode } from '../components/CopyablePromotionCode';
import {
  backendDisablePromotionCode,
  backendPromotionCodesList,
  backendReissuePromotionCode,
  backendRevealPromotionCode,
  isValidCustomCouponCode,
  MARKETING_EMPTY_VALUE,
  readMarketingProblemStatus,
  readMarketingProblemTraceId,
} from '../marketingService';
import { usePromotionReferences } from '../usePromotionReferences';

/**
 * 列表行 → 揭示操作的路径参数（券码 id）。
 *
 * 生成 SDK 的券码列表项把券码 id 放在 `id`；`codeId` 是同义前向兼容别名。
 * 两者都缺失时返回空串，行内的揭示按钮会被禁用，而不是发一个空 id 请求。
 */
function readPromotionCodeId(record: ApiRecord): string {
  for (const key of ['codeId', 'id']) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
}

/** 行上下文标签：优先脱敏券码，其次券码编号，用于拼接可访问名称。 */
function readPromotionCodeRowLabel(record: ApiRecord): string {
  const masked = String(record['codeMasked'] ?? '').trim();
  if (masked) {
    return masked;
  }
  return String(record['codeNo'] ?? '').trim();
}

/**
 * 读取券码已领取数量（int64 十进制字符串）。只接受纯数字，空值/异常值返回空串，
 * 页面据此把"停用"按钮禁用并给出解释，而不是发出一个必然被后端拒绝的请求。
 */
function readPromotionCodeClaimedQuantity(record: ApiRecord): string {
  const raw = record['claimedQuantity'];
  const text = typeof raw === 'string' || typeof raw === 'number' ? String(raw).trim() : '';
  return /^\d+$/u.test(text) ? text : '';
}

/** 已领取数量是否大于 0（避免 `Number` 转换，int64 以字符串比较）。 */
function hasPromotionCodeBeenClaimed(record: ApiRecord): boolean {
  const quantity = readPromotionCodeClaimedQuantity(record);
  return quantity !== '' && quantity.replace(/^0+/u, '') !== '';
}

/**
 * 补发对话框里可选新码的输入归一化：**按键入即转大写**，与服务端 trim 后
 * 转大写的存储形态一致；不静默删除字符，非法字符由校验提示。
 */
function normalizeReissueCodeInput(value: string): string {
  return value.toUpperCase();
}

/**
 * 显式新码是否可提交。空串表示由服务端生成，不参与校验；非空时复用与
 * 批次自定义券码相同的规则（4–64 位 `A-Z0-9-_`），与后端守卫一致。
 */
function isReissueCodeValid(normalizedCode: string): boolean {
  return normalizedCode === '' || isValidCustomCouponCode(normalizedCode);
}

interface RevealedCode {
  codeId: string;
  codeNo: string;
  code: string;
  /** 触发揭示的行上下文，用于面板文案与复制按钮的可访问名称。 */
  rowLabel: string;
}

/** 行内操作的失败：人类可读原因 + 可复制的 traceId。 */
interface CodeActionError {
  message: string;
  traceId: string | null;
}

export function CodesPage() {
  const { t } = useTranslation();
  const { offerNames, stockNames } = usePromotionReferences();
  const [revealed, setRevealed] = useState<RevealedCode | null>(null);
  const [revealError, setRevealError] = useState<CodeActionError | null>(null);
  const [revealingCodeId, setRevealingCodeId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [pendingDisable, setPendingDisable] = useState<ApiRecord | null>(null);
  const [disableReason, setDisableReason] = useState('');
  const [disableError, setDisableError] = useState<CodeActionError | null>(null);
  const [disableNotice, setDisableNotice] = useState<string | null>(null);
  const [isDisabling, setIsDisabling] = useState(false);
  const [pendingReissue, setPendingReissue] = useState<ApiRecord | null>(null);
  const [reissueReason, setReissueReason] = useState('');
  const [reissueCode, setReissueCode] = useState('');
  const [reissueDialogError, setReissueDialogError] = useState<CodeActionError | null>(null);
  const [reissuePageError, setReissuePageError] = useState<CodeActionError | null>(null);
  const [reissueNotice, setReissueNotice] = useState<string | null>(null);
  const [isReissuing, setIsReissuing] = useState(false);
  const revealPanelRef = useRef<HTMLElement>(null);
  const revealButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const revealTitleId = useId();
  const revealNoticeId = useId();
  const disableReasonFieldId = useId();
  const disableReasonHintId = useId();
  const reissueReasonFieldId = useId();
  const reissueReasonHintId = useId();
  const reissueCodeFieldId = useId();
  const reissueCodeHintId = useId();
  const reissueCodeErrorId = useId();

  const openDisableDialog = (record: ApiRecord) => {
    setRevealError(null);
    setDisableError(null);
    setDisableNotice(null);
    setDisableReason('');
    setPendingDisable(record);
  };

  const closeDisableDialog = () => {
    if (isDisabling) {
      return;
    }
    setPendingDisable(null);
    setDisableError(null);
  };

  /**
   * 停用券码（`codes.disables.create`）：守卫要求券码 `active` 且从未被领取，
   * 因此行内按钮在已领取/非 active 时就是禁用的；这里仍按服务端问题原文反馈
   * 409/404，并把 traceId 放进列表上方的现有反馈条。
   */
  const submitDisable = async () => {
    const record = pendingDisable;
    if (!record || isDisabling) {
      return;
    }
    const trimmedReason = disableReason.trim();
    if (!trimmedReason) {
      return;
    }
    const codeId = readPromotionCodeId(record);
    if (!codeId) {
      return;
    }
    const rowLabel = readPromotionCodeRowLabel(record);
    setIsDisabling(true);
    setDisableError(null);
    try {
      await backendDisablePromotionCode(codeId, trimmedReason);
      setPendingDisable(null);
      setDisableNotice(t(
        'admin.marketing.promotions.codes.disableSuccess',
        'Code {{code}} disabled.',
        { code: rowLabel },
      ));
      setRefreshKey((current) => current + 1);
    } catch (cause) {
      setPendingDisable(null);
      setDisableError({
        message: resolveProblemMessage(
          cause,
          t,
          t('admin.marketing.promotions.codes.disableError', 'Failed to disable the code'),
        ),
        traceId: readMarketingProblemTraceId(cause),
      });
      // 失败往往意味着状态已被并发改变（例如刚被领取）：刷新列表让行内守卫与徽标同步。
      setRefreshKey((current) => current + 1);
    } finally {
      setIsDisabling(false);
    }
  };

  const openReissueDialog = (record: ApiRecord) => {
    setReissuePageError(null);
    setReissueNotice(null);
    setReissueDialogError(null);
    setReissueReason('');
    setReissueCode('');
    setPendingReissue(record);
  };

  const closeReissueDialog = () => {
    if (isReissuing) {
      return;
    }
    setPendingReissue(null);
    setReissueDialogError(null);
  };

  /**
   * 补发券码（`codes.reissues.create`）：守卫与停用相同——原券码必须 `active`
   * 且从未被领取。成功只展示**脱敏**结果（`codeNo` / `codeMasked`），完整新码
   * 必须由运营在新行上走受审计的揭示操作，绝不在此处回显。
   *
   * 409/404（已领取、非 active、显式新码冲突或原码已不存在）时**不刷新列表**：
   * 保持界面与提交前一致，避免把服务端已发生的变更误呈现为“操作成功”。
   */
  const submitReissue = async () => {
    const record = pendingReissue;
    if (!record || isReissuing) {
      return;
    }
    const trimmedReason = reissueReason.trim();
    if (!trimmedReason) {
      return;
    }
    const explicitCode = reissueCode.trim().toUpperCase();
    if (!isReissueCodeValid(explicitCode)) {
      return;
    }
    const codeId = readPromotionCodeId(record);
    if (!codeId) {
      return;
    }
    setIsReissuing(true);
    setReissueDialogError(null);
    try {
      const result = await backendReissuePromotionCode(codeId, trimmedReason, explicitCode || undefined);
      setPendingReissue(null);
      setReissueNotice(t(
        'admin.marketing.promotions.codes.reissueSuccess',
        'Code reissued as {{codeNo}} ({{codeMasked}}). The full new code can be revealed from the new row.',
        { codeNo: result.codeNo, codeMasked: result.codeMasked },
      ));
      setRefreshKey((current) => current + 1);
    } catch (cause) {
      const issue: CodeActionError = {
        message: resolveProblemMessage(
          cause,
          t,
          t('admin.marketing.promotions.codes.reissueError', 'Failed to reissue the code'),
        ),
        traceId: readMarketingProblemTraceId(cause),
      };
      const status = readMarketingProblemStatus(cause);
      if (status === 409 || status === 404) {
        setPendingReissue(null);
        setReissuePageError(issue);
      } else {
        setReissueDialogError(issue);
      }
    } finally {
      setIsReissuing(false);
    }
  };

  const handleReveal = async (record: ApiRecord) => {
    const codeId = readPromotionCodeId(record);
    if (!codeId || revealingCodeId !== null) {
      return;
    }
    setRevealingCodeId(codeId);
    setRevealError(null);
    setRevealed(null);
    try {
      // 唯一获取完整券码的入口：受审计的 `codes.reveals.create`。
      const result = await backendRevealPromotionCode(codeId);
      setRevealed({
        codeId,
        codeNo: result.codeNo,
        code: result.code,
        rowLabel: readPromotionCodeRowLabel(record),
      });
    } catch (cause) {
      setRevealError({
        message: resolveProblemMessage(
          cause,
          t,
          t('admin.marketing.promotions.codes.revealError', 'Failed to reveal the code'),
        ),
        traceId: readMarketingProblemTraceId(cause),
      });
    } finally {
      setRevealingCodeId(null);
    }
  };

  const closeReveal = (codeId?: string) => {
    setRevealed(null);
    if (codeId) {
      revealButtonRefs.current.get(codeId)?.focus();
    }
  };

  // 揭示面板不设焦点陷阱（设计规范 §4 允许非模态面板），但打开时聚焦面板，
  // Esc 关闭并把焦点还给触发它的行内按钮。
  useEffect(() => {
    if (!revealed) {
      return;
    }
    const revealedCodeId = revealed.codeId;
    revealPanelRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setRevealed(null);
        revealButtonRefs.current.get(revealedCodeId)?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [revealed]);

  const columns: MarketingColumn<ApiRecord>[] = [
    { key: 'codeNo', label: t('admin.col.codeNo', 'Code No') },
    {
      // 券码列只展示后端脱敏值；完整码即便仍在列表响应里也不进入 DOM。
      key: 'codeMasked',
      label: t('admin.col.code', 'Code'),
      render: (_value, record) => {
        const masked = String(record['codeMasked'] ?? '').trim();
        const last4 = String(record['codeLast4'] ?? '').trim();
        return (
          <span className="tabular-nums" title={last4 || undefined}>
            {masked || MARKETING_EMPTY_VALUE}
          </span>
        );
      },
    },
    { key: 'codeType', label: t('admin.col.type', 'Type'), render: (value) => marketingEnumLabel(value, 'admin.marketing.enums.codeType', t) },
    { key: 'stockId', label: t('admin.col.stock', 'Stock'), render: (value) => stockNames[String(value)] || String(value) },
    { key: 'offerId', label: t('admin.col.offer', 'Offer'), render: (value) => offerNames[String(value)] || String(value) },
    { key: 'maxClaims', label: t('admin.col.maxClaims', 'Max Claims'), align: 'right' },
    { key: 'claimedQuantity', label: t('admin.col.claimed', 'Claimed'), align: 'right' },
    {
      key: 'status',
      label: t('admin.col.status', 'Status'),
      render: (value) => (
        <MarketingStatusBadge
          status={value}
          domain="code"
          activeLabel={t('admin.marketing.promotions.status.active', 'Active')}
          inactiveLabel={t('admin.marketing.promotions.status.inactive', 'Inactive')}
        />
      ),
    },
    { key: 'startsAt', label: t('admin.col.starts', 'Valid From') },
    { key: 'expiresAt', label: t('admin.col.expires', 'Valid Until') },
  ];

  // 可选新码：空白表示由服务端生成；非空时按 4–64 位 A-Z0-9-_ 校验并贴出内联提示。
  const trimmedReissueCode = reissueCode.trim();
  const reissueCodeInvalid = trimmedReissueCode.length > 0 && !isReissueCodeValid(trimmedReissueCode);

  return (
    <>
      <MarketingListView
        title={t('admin.marketing.promotions.promotionCodes.title', 'Code Query')}
        description={t('admin.marketing.promotions.promotionCodes.desc', 'Unified coupon code query across all pre-generated pools, with masked code display.')}
        load={backendPromotionCodesList}
        columns={columns}
        showStatusFilter
        searchPlaceholder={t('admin.marketing.promotions.codes.search', 'Search by code or code no')}
        exportable
        exportFileName="codes.csv"
        refreshKey={refreshKey}
        rowActions={(record) => {
          const codeId = readPromotionCodeId(record);
          const rowLabel = readPromotionCodeRowLabel(record);
          const isRevealing = revealingCodeId === codeId;
          const status = String(record['status'] ?? '').trim();
          const disableAria = t(
            'admin.marketing.promotions.codes.disableAria',
            'Disable code {{code}}',
            { code: rowLabel },
          );
          // 守卫（与后端一致）：券码必须 active 且从未被领取；否则解释原因并禁用。
          const disableBlocked = !codeId
            ? t(
                'admin.marketing.promotions.codes.disableUnavailable',
                'Disable is unavailable because this row has no code id',
              )
            : hasPromotionCodeBeenClaimed(record)
              ? t(
                  'admin.marketing.promotions.codes.disableClaimed',
                  'Only an unused code can be disabled; this code has already been claimed.',
                )
              : status !== 'active'
                ? t(
                    'admin.marketing.promotions.codes.disableNotActive',
                    'Only an active code can be disabled; this code is {{status}}.',
                    { status: status || MARKETING_EMPTY_VALUE },
                  )
                : null;
          const reissueAria = t(
            'admin.marketing.promotions.codes.reissueAria',
            'Reissue code {{code}}',
            { code: rowLabel },
          );
          // 补发与停用共用同一守卫：只有 active 且从未被领取的券码可补发。
          const reissueBlocked = !codeId
            ? t(
                'admin.marketing.promotions.codes.reissueUnavailable',
                'Reissue is unavailable because this row has no code id',
              )
            : hasPromotionCodeBeenClaimed(record)
              ? t(
                  'admin.marketing.promotions.codes.reissueClaimed',
                  'Only an unused code can be reissued; this code has already been claimed.',
                )
              : status !== 'active'
                ? t(
                    'admin.marketing.promotions.codes.reissueNotActive',
                    'Only an active code can be reissued; this code is {{status}}.',
                    { status: status || MARKETING_EMPTY_VALUE },
                  )
                : null;
          return (
            <MarketingTableActions>
              <button
                type="button"
                ref={(node) => {
                  if (node) {
                    revealButtonRefs.current.set(codeId, node);
                  } else {
                    revealButtonRefs.current.delete(codeId);
                  }
                }}
                onClick={() => void handleReveal(record)}
                disabled={!codeId || isRevealing}
                // 可访问名称必须带行上下文（脱敏券码），否则读屏只能听到一串 Reveal。
                aria-label={t(
                  'admin.marketing.promotions.codes.revealAria',
                  'Reveal full code for code {{code}}',
                  { code: rowLabel },
                )}
                title={codeId
                  ? t('admin.marketing.promotions.codes.revealAria', 'Reveal full code for code {{code}}', { code: rowLabel })
                  : t('admin.marketing.promotions.codes.revealUnavailable', 'Reveal is unavailable because this row has no code id')}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-lobster-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
              >
                <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                {isRevealing
                  ? t('admin.marketing.promotions.codes.revealing', 'Revealing...')
                  : t('admin.marketing.promotions.codes.reveal', 'Reveal')}
              </button>
              <MarketingIconActionButton
                label={reissueAria}
                title={reissueBlocked ?? reissueAria}
                icon={<RotateCcw className="h-4 w-4" aria-hidden="true" />}
                disabled={isReissuing || reissueBlocked !== null}
                onClick={() => openReissueDialog(record)}
              />
              <MarketingIconActionButton
                label={disableAria}
                title={disableBlocked ?? disableAria}
                icon={<Ban className="h-4 w-4" aria-hidden="true" />}
                tone="danger"
                disabled={isDisabling || disableBlocked !== null}
                onClick={() => openDisableDialog(record)}
              />
            </MarketingTableActions>
          );
        }}
        banner={(
          <>
            {reissuePageError ? (
              <MarketingInlineAlert
                tone="danger"
                message={reissuePageError.message}
                traceId={reissuePageError.traceId}
                onDismiss={() => setReissuePageError(null)}
              />
            ) : null}
            {reissueNotice ? (
              <MarketingInlineAlert
                tone="success"
                message={reissueNotice}
                onDismiss={() => setReissueNotice(null)}
              />
            ) : null}
            {disableError ? (
              <MarketingInlineAlert
                tone="danger"
                message={disableError.message}
                traceId={disableError.traceId}
                onDismiss={() => setDisableError(null)}
              />
            ) : null}
            {disableNotice ? (
              <MarketingInlineAlert
                tone="success"
                message={disableNotice}
                onDismiss={() => setDisableNotice(null)}
              />
            ) : null}
            {revealError ? (
              <MarketingInlineAlert
                tone="danger"
                message={revealError.message}
                traceId={revealError.traceId}
                onDismiss={() => setRevealError(null)}
              />
            ) : null}
          {revealed ? (
            <section
              ref={revealPanelRef}
              role="dialog"
              aria-modal="false"
              aria-labelledby={revealTitleId}
              aria-describedby={revealNoticeId}
              tabIndex={-1}
              className="shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-lobster-500 dark:border-white/10 dark:bg-white/5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 id={revealTitleId} className="text-sm font-semibold text-slate-900 dark:text-white">
                    {t(
                      'admin.marketing.promotions.codes.revealedTitle',
                      'Revealed code {{codeNo}}',
                      { codeNo: revealed.codeNo },
                    )}
                  </h3>
                  <p id={revealNoticeId} className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                    {t(
                      'admin.marketing.promotions.codes.auditNotice',
                      'This access has been recorded in the audit log.',
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => closeReveal(revealed.codeId)}
                  aria-label={t(
                    'admin.marketing.promotions.codes.closeReveal',
                    'Close revealed code for code {{code}}',
                    { code: revealed.rowLabel },
                  )}
                  className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-white/60 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-lobster-500 dark:hover:bg-white/10 dark:hover:text-white"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#171717]">
                <CopyablePromotionCode
                  code={revealed.code}
                  masked={false}
                  label={t(
                    'admin.marketing.promotions.codes.copyRevealed',
                    'Copy full code for code {{code}}',
                    { code: revealed.rowLabel },
                  )}
                />
              </div>
            </section>
          ) : null}
        </>
      )}
      />

      {pendingDisable ? (
        <ConfirmDialog
          tone="danger"
          title={t('admin.marketing.promotions.codes.disableDialog.title', 'Disable code?')}
          description={t(
            'admin.marketing.promotions.codes.disableDialog.body',
            'Disable code "{{code}}"? The code can no longer be redeemed, and this cannot be undone. Codes that are already claimed are not affected.',
            { code: readPromotionCodeRowLabel(pendingDisable) },
          )}
          confirmLabel={isDisabling
            ? t('common.actions.saving', 'Saving...')
            : t('admin.marketing.promotions.codes.disableDialog.confirm', 'Disable code')}
          confirmDisabled={isDisabling || disableReason.trim().length === 0}
          cancelLabel={t('common.actions.cancel', 'Cancel')}
          onConfirm={() => void submitDisable()}
          onCancel={closeDisableDialog}
        >
          <label
            htmlFor={disableReasonFieldId}
            className="block text-xs font-medium text-slate-600 dark:text-slate-300"
          >
            {t('admin.marketing.promotions.stopLoss.reason.label', 'Reason')}
          </label>
          <textarea
            id={disableReasonFieldId}
            rows={3}
            maxLength={256}
            required
            value={disableReason}
            onChange={(event) => setDisableReason(event.target.value)}
            aria-describedby={disableReasonHintId}
            aria-required="true"
            className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-lobster-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-lobster-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
          />
          <p id={disableReasonHintId} className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t(
              'admin.marketing.promotions.stopLoss.reason.hint',
              'Required (1–256 characters). Stored with the audit record.',
            )}
          </p>
        </ConfirmDialog>
      ) : null}

      {pendingReissue ? (
        <ConfirmDialog
          tone="danger"
          title={t('admin.marketing.promotions.codes.reissueDialog.title', 'Reissue code?')}
          description={t(
            'admin.marketing.promotions.codes.reissueDialog.body',
            'Reissue code "{{code}}"? The old code stops working immediately, and a new code is issued in the same stock with the same validity window and max claims. This action is recorded in the audit log and cannot be undone.',
            { code: readPromotionCodeRowLabel(pendingReissue) },
          )}
          confirmLabel={isReissuing
            ? t('common.actions.saving', 'Saving...')
            : t('admin.marketing.promotions.codes.reissueDialog.confirm', 'Reissue code')}
          confirmDisabled={isReissuing || reissueReason.trim().length === 0 || reissueCodeInvalid}
          cancelLabel={t('common.actions.cancel', 'Cancel')}
          onConfirm={() => void submitReissue()}
          onCancel={closeReissueDialog}
        >
          <label
            htmlFor={reissueReasonFieldId}
            className="block text-xs font-medium text-slate-600 dark:text-slate-300"
          >
            {t('admin.marketing.promotions.stopLoss.reason.label', 'Reason')}
          </label>
          <textarea
            id={reissueReasonFieldId}
            rows={3}
            maxLength={256}
            required
            value={reissueReason}
            onChange={(event) => {
              setReissueReason(event.target.value);
              setReissueDialogError(null);
            }}
            aria-describedby={reissueReasonHintId}
            aria-required="true"
            className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-lobster-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-lobster-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
          />
          <p id={reissueReasonHintId} className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t(
              'admin.marketing.promotions.stopLoss.reason.hint',
              'Required (1–256 characters). Stored with the audit record.',
            )}
          </p>
          <div className="mt-3">
            <label
              htmlFor={reissueCodeFieldId}
              className="block text-xs font-medium text-slate-600 dark:text-slate-300"
            >
              {t('admin.marketing.promotions.codes.reissueDialog.code', 'New code (optional)')}
            </label>
            <input
              id={reissueCodeFieldId}
              type="text"
              value={reissueCode}
              // 键入即转大写（服务端同样 trim 后转大写存储），非法字符保持原样以给出提示。
              onChange={(event) => {
                setReissueCode(normalizeReissueCodeInput(event.target.value));
                setReissueDialogError(null);
              }}
              aria-describedby={reissueCodeInvalid ? `${reissueCodeHintId} ${reissueCodeErrorId}` : reissueCodeHintId}
              aria-invalid={reissueCodeInvalid}
              className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-lobster-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-lobster-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
            />
            <p id={reissueCodeHintId} className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {t(
                'admin.marketing.promotions.codes.reissueDialog.codeHint',
                'Leave blank to let the server generate a code. Otherwise use 4–64 characters: A–Z, 0–9, hyphen (-), or underscore (_).',
              )}
            </p>
            {reissueCodeInvalid ? (
              <p id={reissueCodeErrorId} role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400">
                {t(
                  'admin.marketing.promotions.codes.reissueDialog.codeInvalid',
                  'Use 4–64 characters: A–Z, 0–9, hyphen (-), or underscore (_).',
                )}
              </p>
            ) : null}
          </div>
          {reissueDialogError ? (
            <div className="mt-2">
              <MarketingInlineAlert
                message={reissueDialogError.message}
                traceId={reissueDialogError.traceId}
              />
            </div>
          ) : null}
        </ConfirmDialog>
      ) : null}
    </>
  );
}
