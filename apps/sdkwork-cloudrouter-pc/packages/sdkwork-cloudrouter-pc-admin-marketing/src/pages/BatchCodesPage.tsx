import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Ban, FileDown } from 'lucide-react';
import { ConfirmDialog, resolveProblemMessage } from '@sdkwork/cloudroutes-pc-commons';
import type { ApiRecord } from '@sdkwork/cloudroutes-pc-commons/runtime';
import { MarketingBatchStatusBadge, MarketingStatusBadge } from '../components/MarketingDrawer';
import { MarketingInlineAlert } from '../components/MarketingInlineAlert';
import { MarketingListView, type MarketingColumn, type MarketingLoadParams } from '../components/MarketingListView';
import { marketingEnumLabel } from '../components/MarketingValueBadge';
import {
  backendDisablePromotionBatchCodes,
  backendExportPromotionBatchCodes,
  backendPromotionCodeBatchesList,
  backendPromotionCodesList,
  formatMarketingInteger,
  MARKETING_EMPTY_VALUE,
  readMarketingProblemTraceId,
} from '../marketingService';
import { buildCsvText, downloadMarketingCsv } from '../marketingCsv';

/** 受审计导出的文件名沿用既有约定（内容只来自 `codeBatches.codeExports.create`）。 */
const BATCH_CODES_AUDITED_EXPORT_FILE_NAME = 'batch-codes-full-secret.csv';

interface BatchExportNotice {
  count: number;
  batchLabel: string;
}

interface BatchExportError {
  message: string;
  traceId: string | null;
}

/** 批量停用结果：计数是 int64 字符串，原样保存，展示时再格式化。 */
interface BatchDisableNotice {
  disabledCount: string;
  skippedCount: string;
  batchLabel: string;
}

export function BatchCodesPage({ batchId }: { batchId: string }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [batch, setBatch] = useState<ApiRecord | null>(null);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportNotice, setExportNotice] = useState<BatchExportNotice | null>(null);
  const [exportTruncated, setExportTruncated] = useState(false);
  const [exportError, setExportError] = useState<BatchExportError | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isDisableDialogOpen, setIsDisableDialogOpen] = useState(false);
  const [disableReason, setDisableReason] = useState('');
  const [isDisabling, setIsDisabling] = useState(false);
  const [disableNotice, setDisableNotice] = useState<BatchDisableNotice | null>(null);
  const [disableError, setDisableError] = useState<BatchExportError | null>(null);
  const exportButtonRef = useRef<HTMLButtonElement>(null);
  const exportConfirmButtonRef = useRef<HTMLButtonElement>(null);
  const exportDialogTitleId = useId();
  const exportDialogBodyId = useId();
  const disableReasonFieldId = useId();
  const disableReasonHintId = useId();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        // Reference load bounded to one server page (PAGINATION_SPEC §8).
        // When the batch header is not on the first page, the header area
        // renders an explicit unavailable state instead of silently falling
        // back to the bare id; the codes list below stays fully functional.
        const page = await backendPromotionCodeBatchesList({ page: 1, pageSize: 200 });
        if (cancelled) return;
        const matched = page.items.find((item) => String(item['id']) === batchId);
        setBatch(matched ?? null);
        setBatchError(null);
      } catch (cause) {
        if (!cancelled) {
          setBatch(null);
          setBatchError(cause instanceof Error ? cause.message : String(cause));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [batchId]);

  const batchLabel = batch ? String(batch['batchNo']) : batchId;

  // 导出确认面板：打开时聚焦确认按钮，Esc 取消并把焦点还给导出按钮（不使用原生 confirm）。
  useEffect(() => {
    if (!isExportDialogOpen) {
      return;
    }
    exportConfirmButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isExporting) {
        setIsExportDialogOpen(false);
        exportButtonRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isExportDialogOpen, isExporting]);

  const loadCodes = useMemo(() => (params: MarketingLoadParams) =>
    backendPromotionCodesList({
      page: params.page,
      pageSize: params.pageSize,
      q: params.q,
      status: params.status,
      codeBatchId: batchId,
    }), [batchId]);

  const openExportDialog = () => {
    setExportError(null);
    setExportNotice(null);
    setExportTruncated(false);
    setIsExportDialogOpen(true);
  };

  const handleConfirmExport = async () => {
    setIsExporting(true);
    setExportError(null);
    setExportNotice(null);
    setExportTruncated(false);
    try {
      // 唯一获取批次完整券码的入口：受审计的 `codeBatches.codeExports.create`。
      const result = await backendExportPromotionBatchCodes(batchId);
      downloadMarketingCsv(
        BATCH_CODES_AUDITED_EXPORT_FILE_NAME,
        buildCsvText(
          [t('admin.col.codeNo', 'Code No'), t('admin.col.code', 'Code')],
          result.items.map((item) => [item.codeNo, item.code]),
        ),
      );
      setExportNotice({ count: result.count, batchLabel });
      setExportTruncated(result.truncated);
      setIsExportDialogOpen(false);
    } catch (cause) {
      setExportError({
        message: resolveProblemMessage(
          cause,
          t,
          t('admin.marketing.promotions.batchCodes.exportFullError', 'Failed to export the batch codes'),
        ),
        traceId: readMarketingProblemTraceId(cause),
      });
    } finally {
      setIsExporting(false);
    }
  };

  const openDisableDialog = () => {
    setDisableError(null);
    setDisableNotice(null);
    setDisableReason('');
    setIsDisableDialogOpen(true);
  };

  const closeDisableDialog = () => {
    if (isDisabling) {
      return;
    }
    setIsDisableDialogOpen(false);
    setDisableError(null);
  };

  /**
   * 批量停用批次内"可用"券码（`codeBatches.disables.create`）。
   *
   * 后端只停用 `active` 且从未被领取的券码；已被领取的券码会被守卫跳过并计入
   * `skippedCount`，继续可核销——结果必须如实报告，不能只说"已停用"。
   */
  const submitDisableUnused = async () => {
    if (isDisabling) {
      return;
    }
    const trimmedReason = disableReason.trim();
    if (!trimmedReason) {
      return;
    }
    setIsDisabling(true);
    setDisableError(null);
    setDisableNotice(null);
    try {
      const result = await backendDisablePromotionBatchCodes(batchId, trimmedReason);
      setDisableNotice({
        disabledCount: result.disabledCount,
        skippedCount: result.skippedCount,
        batchLabel,
      });
      setIsDisableDialogOpen(false);
      setRefreshKey((current) => current + 1);
    } catch (cause) {
      setIsDisableDialogOpen(false);
      setDisableError({
        message: resolveProblemMessage(
          cause,
          t,
          t('admin.marketing.promotions.batchCodes.disableUnusedError', 'Failed to disable the unused codes'),
        ),
        traceId: readMarketingProblemTraceId(cause),
      });
      // 失败后刷新：批次/券码状态可能已被并发改变。
      setRefreshKey((current) => current + 1);
    } finally {
      setIsDisabling(false);
    }
  };

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

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      {batchError && (
        <div className="shrink-0 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
          {t('admin.marketing.promotions.batchCodes.loadError', 'Batch header failed to load')}: {batchError}
        </div>
      )}
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
              {String(batch['batchNo'])}
              {' · '}
              {t('admin.col.generated', 'Generated')}: {String(batch['generatedQuantity'])}
              {' · '}
              {String(batch['codePrefix'] || '-')}
              {' · '}
              <MarketingBatchStatusBadge status={batch['status']} />
            </p>
          ) : (
            !batchError && (
              <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">
                {t(
                  'admin.marketing.promotions.batchCodes.headerUnavailable',
                  'Batch header is outside the first reference page; showing codes for batch {{batchId}} only.',
                  { batchId },
                )}
              </p>
            )
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={openDisableDialog}
            disabled={isDisabling}
            aria-busy={isDisabling ? true : undefined}
            // 可访问名称带批次上下文，避免读屏只听到“停用未使用券码”。
            aria-label={t(
              'admin.marketing.promotions.batchCodes.disableUnusedAria',
              'Disable unused codes (audited) for batch {{batchNo}}',
              { batchNo: batchLabel },
            )}
            title={t(
              'admin.marketing.promotions.batchCodes.disableUnusedAria',
              'Disable unused codes (audited) for batch {{batchNo}}',
              { batchNo: batchLabel },
            )}
            className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-500/30 dark:bg-white/5 dark:text-red-300 dark:hover:bg-red-500/10"
          >
            <Ban className="h-3.5 w-3.5" aria-hidden="true" />
            {isDisabling
              ? t('admin.marketing.promotions.batchCodes.disableUnusedBusy', 'Disabling...')
              : t('admin.marketing.promotions.batchCodes.disableUnused', 'Disable unused codes (audited)')}
          </button>
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
        refreshKey={refreshKey}
        toolbarActions={(
          <button
            ref={exportButtonRef}
            type="button"
            onClick={openExportDialog}
            disabled={isExporting}
            aria-busy={isExporting ? true : undefined}
            // 可访问名称带批次上下文，避免读屏只听到“导出完整券码”。
            aria-label={t(
              'admin.marketing.promotions.batchCodes.exportFullAria',
              'Export full codes (audited) for batch {{batchNo}}',
              { batchNo: batchLabel },
            )}
            title={t(
              'admin.marketing.promotions.batchCodes.exportFullAria',
              'Export full codes (audited) for batch {{batchNo}}',
              { batchNo: batchLabel },
            )}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-lobster-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
          >
            <FileDown className="h-3.5 w-3.5" aria-hidden="true" />
            {isExporting
              ? t('admin.marketing.promotions.batchCodes.exportFullBusy', 'Exporting...')
              : t('admin.marketing.promotions.batchCodes.exportFull', 'Export full codes (audited)')}
          </button>
        )}
        banner={(
          <>
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
                message={t(
                  'admin.marketing.promotions.batchCodes.disableUnusedSuccess',
                  'Disabled {{disabledCount}} unused codes in batch {{batchNo}}; skipped {{skippedCount}} claimed or inactive codes.',
                  {
                    disabledCount: formatMarketingInteger(disableNotice.disabledCount, { locale: i18n.language }),
                    skippedCount: formatMarketingInteger(disableNotice.skippedCount, { locale: i18n.language }),
                    batchNo: disableNotice.batchLabel,
                  },
                )}
                onDismiss={() => setDisableNotice(null)}
              />
            ) : null}
            {disableNotice && disableNotice.skippedCount.replace(/^0+/u, '') !== '' ? (
              <MarketingInlineAlert
                tone="warning"
                message={t(
                  'admin.marketing.promotions.batchCodes.disableUnusedSkipped',
                  '{{skippedCount}} codes were skipped because they are already claimed or no longer active. Those coupons stay redeemable.',
                  {
                    skippedCount: formatMarketingInteger(disableNotice.skippedCount, { locale: i18n.language }),
                  },
                )}
              />
            ) : null}
            {exportError ? (
              <MarketingInlineAlert
                tone="danger"
                message={exportError.message}
                traceId={exportError.traceId}
                onDismiss={() => setExportError(null)}
              />
            ) : null}
            {exportNotice ? (
              <MarketingInlineAlert
                tone="success"
                message={t(
                  'admin.marketing.promotions.batchCodes.exportFullSuccess',
                  'Exported {{exportedCount}} codes from batch {{batchNo}}; the export is recorded in the audit log.',
                  {
                    exportedCount: formatMarketingInteger(exportNotice.count, { locale: i18n.language }),
                    batchNo: exportNotice.batchLabel,
                  },
                )}
                onDismiss={() => setExportNotice(null)}
              />
            ) : null}
            {exportTruncated ? (
              <MarketingInlineAlert
                tone="warning"
                message={t(
                  'admin.marketing.promotions.batchCodes.exportFullTruncated',
                  'This batch holds more than 5000 codes; only the first 5000 were exported.',
                )}
              />
            ) : null}
            {isExportDialogOpen ? (
              <section
                role="alertdialog"
                aria-labelledby={exportDialogTitleId}
                aria-describedby={exportDialogBodyId}
                className="shrink-0 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
              >
                <h3 id={exportDialogTitleId} className="text-sm font-semibold">
                  {t(
                    'admin.marketing.promotions.batchCodes.exportFullTitle',
                    'Export full coupon codes for batch {{batchNo}}?',
                    { batchNo: batchLabel },
                  )}
                </h3>
                <p id={exportDialogBodyId} className="mt-1">
                  {t(
                    'admin.marketing.promotions.batchCodes.exportFullBody',
                    'This calls the audited export operation: the action is recorded in the audit log, and at most 5000 codes are returned for the batch. Store the file securely.',
                  )}
                </p>
                <div className="mt-3 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsExportDialogOpen(false);
                      exportButtonRef.current?.focus();
                    }}
                    disabled={isExporting}
                    className="inline-flex items-center rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-lobster-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                  >
                    {t('common.actions.cancel', 'Cancel')}
                  </button>
                  <button
                    ref={exportConfirmButtonRef}
                    type="button"
                    onClick={() => void handleConfirmExport()}
                    disabled={isExporting}
                    aria-busy={isExporting ? true : undefined}
                    className="inline-flex items-center rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 focus-visible:ring-2 focus-visible:ring-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isExporting
                      ? t('admin.marketing.promotions.batchCodes.exportFullBusy', 'Exporting...')
                      : t(
                        'admin.marketing.promotions.batchCodes.exportFullConfirm',
                        'Export up to 5000 codes',
                      )}
                  </button>
                </div>
              </section>
            ) : null}
          </>
        )}
      />

      {isDisableDialogOpen ? (
        <ConfirmDialog
          tone="danger"
          title={t(
            'admin.marketing.promotions.batchCodes.disableUnusedTitle',
            'Disable unused codes in batch {{batchNo}}?',
            { batchNo: batchLabel },
          )}
          description={t(
            'admin.marketing.promotions.batchCodes.disableUnusedBody',
            'Every active, never-claimed code in batch {{batchNo}} becomes unusable immediately. Codes that are already claimed are skipped and stay redeemable. This cannot be undone.',
            { batchNo: batchLabel },
          )}
          confirmLabel={isDisabling
            ? t('common.actions.saving', 'Saving...')
            : t('admin.marketing.promotions.batchCodes.disableUnusedConfirm', 'Disable unused codes')}
          confirmDisabled={isDisabling || disableReason.trim().length === 0}
          cancelLabel={t('common.actions.cancel', 'Cancel')}
          onConfirm={() => void submitDisableUnused()}
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
    </div>
  );
}
