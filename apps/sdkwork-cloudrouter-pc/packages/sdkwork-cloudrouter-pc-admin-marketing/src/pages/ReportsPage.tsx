import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BusinessStatePanel,
  BusinessStateTableRow,
  resolveProblemMessage,
} from '@sdkwork/cloudroutes-pc-commons';
import { MarketingInlineAlert } from '../components/MarketingInlineAlert';
import {
  backendPromotionReport,
  formatMarketingAmountMinor,
  formatMarketingInteger,
  formatMarketingRateBp,
  formatMarketingTimestamp,
  MARKETING_EMPTY_VALUE,
  readMarketingProblemTraceId,
  toDatetimeLocal,
  toIsoString,
  type PromotionReport,
  type PromotionReportWindow,
} from '../marketingService';

/** 默认统计窗口：最近 30 天（服务端在省略 from/to 时使用同一默认值）。 */
const REPORT_WINDOW_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/** 报表加载失败：人类可读原因 + 可复制的后端 `traceId`。 */
type ReportLoadError = { message: string; traceId: string | null };

/** `datetime-local` 表单的初始值（本地墙钟 `YYYY-MM-DDTHH:mm`）。 */
interface ReportWindowInputs {
  fromInput: string;
  toInput: string;
  /** 与输入框对应的 RFC 3339 值，作为首次请求的窗口。 */
  from: string;
  to: string;
}

function resolveDefaultReportWindow(now: Date = new Date()): ReportWindowInputs {
  const from = new Date(now.getTime() - REPORT_WINDOW_DAYS * DAY_MS);
  const fromInput = toDatetimeLocal(from.toISOString());
  const toInput = toDatetimeLocal(now.toISOString());
  return {
    fromInput,
    toInput,
    from: toIsoString(fromInput),
    to: toIsoString(toInput),
  };
}

/** `datetime-local` → RFC 3339；空值或不可解析的输入返回 `null`。 */
function parseReportWindowInput(value: string): string | null {
  if (!value.trim()) {
    return null;
  }
  try {
    return toIsoString(value);
  } catch {
    return null;
  }
}

/**
 * 把多个 int64 计数字符串相加（BigInt，绝不经过 `Number`）。
 * 任一计数不是非负整数时返回 `null`，页面展示 `—` 而不是一个错的合计。
 */
function sumReportCounts(values: string[]): string | null {
  let total = 0n;
  for (const value of values) {
    const raw = typeof value === 'string' ? value.trim() : '';
    if (!/^\d+$/u.test(raw)) {
      return null;
    }
    total += BigInt(raw);
  }
  return total.toString();
}

/**
 * 计数是否为正。无法解析的计数按“有数据”处理：宁可展示一张空表，
 * 也不把真实活动误报成“该窗口内没有数据”。
 */
function isPositiveReportCount(value: unknown): boolean {
  const raw = typeof value === 'number' && Number.isSafeInteger(value)
    ? String(value)
    : typeof value === 'string'
      ? value.trim()
      : '';
  if (!/^\d+$/u.test(raw)) {
    return true;
  }
  return BigInt(raw) > 0n;
}

function readReportRows<T>(rows: T[] | null | undefined): T[] {
  return Array.isArray(rows) ? rows : [];
}

/** 页面级空态：窗口内没有任何计数、币种金额或热门优惠。 */
function isPromotionReportEmpty(report: PromotionReport): boolean {
  const counts = report.counts;
  const countValues: unknown[] = [
    counts.issuedCodes,
    counts.claimedCoupons,
    counts.redeemedCoupons,
    counts.expiredCoupons,
    counts.voidedCoupons,
    counts.disabledCodes,
    counts.applicationsApplied,
    counts.applicationsSettled,
    counts.applicationsReleased,
  ];
  if (countValues.some(isPositiveReportCount)) {
    return false;
  }
  return readReportRows(report.byCurrency).length === 0 && readReportRows(report.topOffers).length === 0;
}

/** KPI 卡片（设计规范 §2.2）：标签 + 数值均为文本，`tabular-nums`，不靠颜色传达信息。 */
function ReportKpiCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-white/10 dark:bg-white/[0.02]">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900 dark:text-white">{value}</p>
      {hint ? (
        <p className="mt-1 text-[11px] tabular-nums text-slate-400 dark:text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

/** 首次载入的骨架卡：占位但不编造数值，屏幕阅读器只感知 `aria-busy`。 */
function ReportKpiSkeletonCard() {
  return (
    <div
      aria-hidden="true"
      className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-white/10 dark:bg-white/[0.02]"
    >
      <div className="h-3 w-16 rounded bg-slate-100 dark:bg-white/10" />
      <div className="mt-2 h-6 w-20 rounded bg-slate-100 dark:bg-white/10" />
    </div>
  );
}

/** 首次载入骨架：KPI 条 + 表格式占位，保持页面结构不变。 */
function ReportSkeleton() {
  const { t } = useTranslation();
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-4">
      <span className="sr-only">{t('admin.marketing.reports.loading', 'Loading report...')}</span>
      <div aria-hidden="true" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((index) => <ReportKpiSkeletonCard key={index} />)}
      </div>
      <div aria-hidden="true" className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((index) => <ReportKpiSkeletonCard key={index} />)}
      </div>
      <div aria-hidden="true" className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.02]">
        <div className="h-3 w-40 rounded bg-slate-100 dark:bg-white/10" />
        {[0, 1, 2].map((index) => (
          <div key={index} className="mt-3 h-3 w-full rounded bg-slate-100 dark:bg-white/10" />
        ))}
      </div>
    </div>
  );
}

function ReportRateCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-white/10 dark:bg-white/[0.02]">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}

type PromotionReportCurrencyRow = PromotionReport['byCurrency'][number];

interface MoneyColumn {
  key: string;
  labelKey: string;
  fallback: string;
  read: (row: PromotionReportCurrencyRow) => string;
}

/** 分币种金额列：最小单位字符串交给 `formatMarketingAmountMinor` 统一渲染。 */
const MONEY_COLUMNS: MoneyColumn[] = [
  {
    key: 'applied',
    labelKey: 'admin.marketing.reports.currency.col.applied',
    fallback: 'Discount applied',
    read: (row) => row.discountAppliedMinor,
  },
  {
    key: 'settled',
    labelKey: 'admin.marketing.reports.currency.col.settled',
    fallback: 'Discount settled',
    read: (row) => row.discountSettledMinor,
  },
  {
    key: 'budgetTotal',
    labelKey: 'admin.marketing.reports.currency.col.budgetTotal',
    fallback: 'Budget total',
    read: (row) => row.budgetTotalMinor,
  },
  {
    key: 'budgetReserved',
    labelKey: 'admin.marketing.reports.currency.col.budgetReserved',
    fallback: 'Budget reserved',
    read: (row) => row.budgetReservedMinor,
  },
  {
    key: 'budgetUsed',
    labelKey: 'admin.marketing.reports.currency.col.budgetUsed',
    fallback: 'Budget used',
    read: (row) => row.budgetUsedMinor,
  },
];

function ReportTableHeaderCell({ label, numeric = false }: { label: string; numeric?: boolean }) {
  return (
    <th
      scope="col"
      className={`px-4 py-2 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 ${numeric ? 'text-right' : 'text-left'}`}
    >
      {label}
    </th>
  );
}

function MoneyByCurrencyTable({ rows }: { rows: PromotionReport['byCurrency'] }) {
  const { t, i18n } = useTranslation();
  const currencyRows = readReportRows(rows);
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.02]">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-slate-50 dark:bg-white/[0.03]">
          <tr className="border-b border-slate-200 dark:border-white/10">
            <ReportTableHeaderCell label={t('admin.col.currency', 'Currency')} />
            {MONEY_COLUMNS.map((column) => (
              <ReportTableHeaderCell
                key={column.key}
                label={t(column.labelKey, column.fallback)}
                numeric
              />
            ))}
          </tr>
        </thead>
        <tbody>
          {currencyRows.length === 0 ? (
            <BusinessStateTableRow
              kind="empty"
              colSpan={MONEY_COLUMNS.length + 1}
              title={t('admin.marketing.reports.currency.empty', 'No currency totals in this window')}
              description={t(
                'admin.marketing.reports.currency.emptyDesc',
                'No discount was applied or settled in any currency during the window.',
              )}
            />
          ) : (
            currencyRows.map((row) => (
              <tr
                key={row.currencyCode}
                className="h-11 border-b border-slate-100 transition-colors last:border-b-0 hover:bg-slate-50/70 dark:border-white/5 dark:hover:bg-white/[0.03]"
              >
                <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-white">{row.currencyCode}</td>
                {MONEY_COLUMNS.map((column) => (
                  <td
                    key={column.key}
                    className="px-4 py-2.5 text-right tabular-nums text-slate-600 dark:text-slate-300"
                  >
                    {formatMarketingAmountMinor(column.read(row), row.currencyCode, i18n.language)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function TopOffersTable({ rows }: { rows: PromotionReport['topOffers'] }) {
  const { t, i18n } = useTranslation();
  const offerRows = readReportRows(rows);
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.02]">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-slate-50 dark:bg-white/[0.03]">
          <tr className="border-b border-slate-200 dark:border-white/10">
            <ReportTableHeaderCell label={t('admin.marketing.reports.topOffers.col.offerNo', 'Offer No')} />
            <ReportTableHeaderCell label={t('admin.col.offer', 'Offer')} />
            <ReportTableHeaderCell label={t('admin.col.redeemed', 'Redeemed')} numeric />
            <ReportTableHeaderCell
              label={t('admin.marketing.reports.topOffers.col.settled', 'Settled amount')}
              numeric
            />
          </tr>
        </thead>
        <tbody>
          {offerRows.length === 0 ? (
            <BusinessStateTableRow
              kind="empty"
              colSpan={4}
              title={t('admin.marketing.reports.topOffers.empty', 'No redeemed offers in this window')}
              description={t(
                'admin.marketing.reports.topOffers.emptyDesc',
                'No coupon of any offer was redeemed during the window.',
              )}
            />
          ) : (
            offerRows.map((row) => {
              const offerName = typeof row.displayName === 'string' ? row.displayName.trim() : '';
              const offerNo = typeof row.offerNo === 'string' ? row.offerNo.trim() : '';
              return (
                <tr
                  key={row.offerId}
                  className="h-11 border-b border-slate-100 transition-colors last:border-b-0 hover:bg-slate-50/70 dark:border-white/5 dark:hover:bg-white/[0.03]"
                >
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-500 dark:text-slate-400">
                    {offerNo || MARKETING_EMPTY_VALUE}
                  </td>
                  <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-white">
                    {offerName ? (
                      <span className="block max-w-[18rem] truncate" title={offerName}>{offerName}</span>
                    ) : MARKETING_EMPTY_VALUE}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-600 dark:text-slate-300">
                    {formatMarketingInteger(row.redeemed)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-600 dark:text-slate-300">
                    {formatMarketingAmountMinor(row.discountSettledMinor, row.currencyCode, i18n.language)}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

export function ReportsPage() {
  const { t, i18n } = useTranslation();
  const [initialWindow] = useState(resolveDefaultReportWindow);
  const [fromInput, setFromInput] = useState(initialWindow.fromInput);
  const [toInput, setToInput] = useState(initialWindow.toInput);
  const [windowError, setWindowError] = useState<string | null>(null);
  const [report, setReport] = useState<PromotionReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ReportLoadError | null>(null);
  // 最近一次应用的窗口：重试重放同一个窗口，而不是重新读取输入框（可能已被改动）。
  const lastWindowRef = useRef<PromotionReportWindow>({
    from: initialWindow.from,
    to: initialWindow.to,
  });
  // 先发后到的旧窗口响应不得覆盖新窗口：与列表页相同的请求序号守卫。
  const requestIdRef = useRef(0);

  const fromFieldId = useId();
  const toFieldId = useId();
  const windowHintId = useId();
  const windowErrorId = useId();
  const countsHeadingId = useId();
  const applicationsHeadingId = useId();
  const ratesHeadingId = useId();
  const ratesHintId = useId();
  const currencyHeadingId = useId();
  const topOffersHeadingId = useId();

  const loadReport = useCallback(async (window: PromotionReportWindow) => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    try {
      const result = await backendPromotionReport(window);
      if (requestId !== requestIdRef.current) {
        return;
      }
      setReport(result);
      setError(null);
    } catch (loadError) {
      if (requestId !== requestIdRef.current) {
        return;
      }
      // 失败时保留已有报表：刷新失败不该清空上一份成功数据。
      setError({
        message: resolveProblemMessage(
          loadError,
          t,
          t('admin.marketing.reports.loadError', 'Report data could not be loaded'),
        ),
        traceId: readMarketingProblemTraceId(loadError),
      });
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [t]);

  useEffect(() => {
    void loadReport(lastWindowRef.current);
    return () => {
      // 卸载或重新订阅时让在途响应失效，避免对已卸载页面 setState。
      requestIdRef.current += 1;
    };
  }, [loadReport]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const from = parseReportWindowInput(fromInput);
    const to = parseReportWindowInput(toInput);
    if (!from || !to) {
      setWindowError(t('admin.marketing.reports.window.incomplete', 'Choose a start and an end time.'));
      return;
    }
    if (new Date(from).getTime() > new Date(to).getTime()) {
      setWindowError(
        t('admin.marketing.reports.window.invalidRange', 'The start time must be on or before the end time.'),
      );
      return;
    }
    setWindowError(null);
    lastWindowRef.current = { from, to };
    void loadReport({ from, to });
  };

  const retry = () => {
    void loadReport(lastWindowRef.current);
  };

  const reportIsEmpty = report !== null ? isPromotionReportEmpty(report) : false;
  const counts = report?.counts;
  const expiredVoidedDisabled = counts
    ? sumReportCounts([counts.expiredCoupons, counts.voidedCoupons, counts.disabledCodes])
    : null;

  const inputClassName = 'h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-lobster-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-lobster-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-200';

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1">
      {/* 唯一页头（设计规范 §2.2）。 */}
      <div className="shrink-0">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">
          {t('admin.marketing.reports.title', 'Coupon Reports')}
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {t(
            'admin.marketing.reports.desc',
            'Issuance, claiming, redemption, and discount budget outcomes for a time window.',
          )}
        </p>
      </div>

      <form
        noValidate
        onSubmit={handleSubmit}
        aria-label={t('admin.marketing.reports.window.label', 'Report window')}
        className="shrink-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.02]"
      >
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label
              htmlFor={fromFieldId}
              className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300"
            >
              {t('admin.marketing.reports.window.from', 'From')}
            </label>
            <input
              id={fromFieldId}
              type="datetime-local"
              value={fromInput}
              onChange={(event) => {
                setFromInput(event.target.value);
                setWindowError(null);
              }}
              aria-invalid={windowError !== null ? true : undefined}
              aria-describedby={windowError !== null ? windowErrorId : windowHintId}
              className={`${inputClassName} w-56`}
            />
          </div>
          <div>
            <label
              htmlFor={toFieldId}
              className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300"
            >
              {t('admin.marketing.reports.window.to', 'To')}
            </label>
            <input
              id={toFieldId}
              type="datetime-local"
              value={toInput}
              onChange={(event) => {
                setToInput(event.target.value);
                setWindowError(null);
              }}
              aria-invalid={windowError !== null ? true : undefined}
              aria-describedby={windowError !== null ? windowErrorId : windowHintId}
              className={`${inputClassName} w-56`}
            />
          </div>
          <button
            type="submit"
            className="inline-flex h-9 items-center rounded-md bg-lobster-600 px-4 text-sm font-medium text-white hover:bg-lobster-700 focus-visible:ring-2 focus-visible:ring-lobster-500"
          >
            {t('admin.marketing.reports.window.apply', 'Apply')}
          </button>
        </div>
        <p id={windowHintId} className="mt-2 text-xs text-slate-400 dark:text-slate-500">
          {t(
            'admin.marketing.reports.window.hint',
            'Defaults to the last 30 days. Times use your local time zone.',
          )}
        </p>
        {report ? (
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            {t('admin.marketing.reports.window.range', 'Window: {{from}} – {{to}}', {
              from: formatMarketingTimestamp(report.from, i18n.language),
              to: formatMarketingTimestamp(report.to, i18n.language),
            })}
          </p>
        ) : null}
        {windowError !== null ? (
          <p id={windowErrorId} role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400">
            {windowError}
          </p>
        ) : null}
      </form>

      {error ? (
        <MarketingInlineAlert
          message={error.message}
          traceId={error.traceId}
          action={(
            <button
              type="button"
              onClick={retry}
              disabled={isLoading}
              className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-lobster-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
            >
              {t('admin.marketing.reports.retry', 'Retry')}
            </button>
          )}
        />
      ) : null}

      {isLoading && report !== null ? (
        <div
          role="progressbar"
          aria-label={t('admin.marketing.reports.refreshing', 'Refreshing report')}
          className="h-[2px] w-full shrink-0 overflow-hidden rounded bg-slate-100 dark:bg-white/10"
        >
          <div className="h-full w-1/3 animate-pulse bg-lobster-500" />
        </div>
      ) : null}

      {isLoading && report === null ? <ReportSkeleton /> : null}

      {report !== null && !reportIsEmpty ? (
        <div className="flex flex-col gap-4" aria-busy={isLoading ? true : undefined}>
          <section aria-labelledby={countsHeadingId} className="flex flex-col gap-2">
            <h3 id={countsHeadingId} className="text-sm font-semibold text-slate-900 dark:text-white">
              {t('admin.marketing.reports.counts.title', 'Codes and coupons')}
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <ReportKpiCard
                label={t('admin.marketing.reports.kpi.issued', 'Issued codes')}
                value={formatMarketingInteger(counts?.issuedCodes)}
              />
              <ReportKpiCard
                label={t('admin.marketing.reports.kpi.claimed', 'Claimed coupons')}
                value={formatMarketingInteger(counts?.claimedCoupons)}
              />
              <ReportKpiCard
                label={t('admin.marketing.reports.kpi.redeemed', 'Redeemed coupons')}
                value={formatMarketingInteger(counts?.redeemedCoupons)}
              />
              <ReportKpiCard
                label={t('admin.marketing.reports.kpi.expiredVoidedDisabled', 'Expired + voided + disabled')}
                value={expiredVoidedDisabled !== null
                  ? formatMarketingInteger(expiredVoidedDisabled)
                  : MARKETING_EMPTY_VALUE}
                hint={counts
                  ? t(
                      'admin.marketing.reports.kpi.expiredVoidedDisabledBreakdown',
                      'Expired {{expired}} · Voided {{voided}} · Disabled {{disabled}}',
                      {
                        expired: formatMarketingInteger(counts.expiredCoupons),
                        voided: formatMarketingInteger(counts.voidedCoupons),
                        disabled: formatMarketingInteger(counts.disabledCodes),
                      },
                    )
                  : undefined}
              />
            </div>
          </section>

          <section aria-labelledby={applicationsHeadingId} className="flex flex-col gap-2">
            <h3 id={applicationsHeadingId} className="text-sm font-semibold text-slate-900 dark:text-white">
              {t('admin.marketing.reports.applications.title', 'Discount applications')}
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <ReportKpiCard
                label={t('admin.marketing.reports.kpi.applicationsApplied', 'Applications applied')}
                value={formatMarketingInteger(counts?.applicationsApplied)}
              />
              <ReportKpiCard
                label={t('admin.marketing.reports.kpi.applicationsSettled', 'Applications settled')}
                value={formatMarketingInteger(counts?.applicationsSettled)}
              />
              <ReportKpiCard
                label={t('admin.marketing.reports.kpi.applicationsReleased', 'Applications released')}
                value={formatMarketingInteger(counts?.applicationsReleased)}
              />
            </div>
          </section>

          <section aria-labelledby={ratesHeadingId} aria-describedby={ratesHintId} className="flex flex-col gap-2">
            <h3 id={ratesHeadingId} className="text-sm font-semibold text-slate-900 dark:text-white">
              {t('admin.marketing.reports.rates.title', 'Rates')}
            </h3>
            <p id={ratesHintId} className="text-xs text-slate-500 dark:text-slate-400">
              {t('admin.marketing.reports.rates.hint', 'of issued codes in the selected window')}
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <ReportRateCard
                label={t('admin.marketing.reports.rates.claim', 'Claim rate')}
                value={formatMarketingRateBp(report.rates.claimRateBp)}
              />
              <ReportRateCard
                label={t('admin.marketing.reports.rates.redemption', 'Redemption rate')}
                value={formatMarketingRateBp(report.rates.redemptionRateBp)}
              />
              <ReportRateCard
                label={t('admin.marketing.reports.rates.void', 'Void rate')}
                value={formatMarketingRateBp(report.rates.voidRateBp)}
              />
            </div>
          </section>

          <section aria-labelledby={currencyHeadingId} className="flex flex-col gap-2">
            <h3 id={currencyHeadingId} className="text-sm font-semibold text-slate-900 dark:text-white">
              {t('admin.marketing.reports.currency.title', 'Money by currency')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t(
                'admin.marketing.reports.currency.desc',
                'Applied and settled amounts cover the selected window; budget figures are a current snapshot.',
              )}
            </p>
            <MoneyByCurrencyTable rows={report.byCurrency} />
          </section>

          <section aria-labelledby={topOffersHeadingId} className="flex flex-col gap-2">
            <h3 id={topOffersHeadingId} className="text-sm font-semibold text-slate-900 dark:text-white">
              {t('admin.marketing.reports.topOffers.title', 'Top offers')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t(
                'admin.marketing.reports.topOffers.desc',
                'Offers with the most redeemed coupons in the window (up to 5).',
              )}
            </p>
            <TopOffersTable rows={report.topOffers} />
          </section>
        </div>
      ) : null}

      {!isLoading && report !== null && reportIsEmpty && error === null ? (
        <BusinessStatePanel
          kind="empty"
          title={t('admin.marketing.reports.empty.title', 'No data in this window')}
          description={t(
            'admin.marketing.reports.empty.desc',
            'No coupon or discount activity was recorded between {{from}} and {{to}}. Adjust the window and apply again.',
            {
              from: formatMarketingTimestamp(report.from, i18n.language),
              to: formatMarketingTimestamp(report.to, i18n.language),
            },
          )}
          className="rounded-lg border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.02]"
        />
      ) : null}
    </div>
  );
}
