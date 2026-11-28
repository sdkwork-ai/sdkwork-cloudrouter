import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  ExternalLink,
  Loader2,
  QrCode,
  RefreshCw,
  Wallet,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type {
  UpstreamRechargeOption,
  UpstreamRechargeOrder,
  UpstreamSupplierRechargeOverview,
} from '@sdkwork/cloudrouter-pc-admin-core/sdk';
import { errorMessageI18n, primaryButtonClass, secondaryButtonClass } from './components';
import {
  formatRechargeMoney,
  formatRechargePoints,
  rechargeOrderIsOpen,
  rechargeOrderStatusKey,
  rechargePointsUnitLabelKey,
} from './supplierRechargeCopy';
import {
  createUpstreamSupplierRechargeOrder,
  getUpstreamSupplierRecharge,
  getUpstreamSupplierRechargeOrder,
} from './supplierRechargeService';

/** Poll interval for an unpaid relay recharge order. */
const ORDER_POLL_INTERVAL_MS = 5_000;

/**
 * Relay recharge dialog, decoupled from the supplier page.
 *
 * The component owns only presentation and interaction: every relay exchange
 * goes through `supplierRechargeService` (backend API key calls). It mirrors
 * the console recharge sheet — package grid, custom amount, agreement, pay —
 * while rendering the relay's own package catalog and order payload.
 */
export function SupplierRechargeDialog({
  supplierId,
  supplierName,
  onClose,
  onBalanceChanged,
}: {
  supplierId: string;
  supplierName: string;
  onClose: () => void;
  /** Called once an order is paid so the supplier list can refresh its balance. */
  onBalanceChanged?: () => void;
}) {
  const { t } = useTranslation();
  const [overview, setOverview] = useState<UpstreamSupplierRechargeOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [order, setOrder] = useState<UpstreamRechargeOrder | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const value = await getUpstreamSupplierRecharge(supplierId);
      setOverview(value);
      setSelectedPackageId(value.options[0]?.packageId ?? null);
      setOrder(null);
      setAgreed(false);
      setCustomAmount('');
    } catch (cause) {
      setError(errorMessageI18n(cause, t('admin.upstream.supplier.recharge.errors.load'), t));
    } finally {
      setLoading(false);
    }
  }, [supplierId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, submitting]);

  const refreshOrder = useCallback(async () => {
    if (!order) return;
    try {
      const value = await getUpstreamSupplierRechargeOrder(supplierId, order.orderId);
      setOrder(value);
      if (!rechargeOrderIsOpen(value.status)) {
        onBalanceChanged?.();
      }
    } catch (cause) {
      setOrderError(errorMessageI18n(cause, t('admin.upstream.supplier.recharge.errors.order'), t));
    }
  }, [onBalanceChanged, order, supplierId, t]);

  useEffect(() => {
    if (!order || !rechargeOrderIsOpen(order.status)) return undefined;
    const timer = window.setInterval(() => {
      void refreshOrder();
    }, ORDER_POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [order, refreshOrder]);

  const pointsUnit = useMemo(() => {
    if (!overview) return '';
    const labelKey = rechargePointsUnitLabelKey(overview.pointsUnit);
    return labelKey ? t(labelKey) : overview.pointsUnit;
  }, [overview, t]);

  const selectedOption: UpstreamRechargeOption | null = useMemo(
    () => overview?.options.find((option) => option.packageId === selectedPackageId) ?? null,
    [overview, selectedPackageId],
  );
  const usingCustomAmount = selectedPackageId === null;
  const payableAmount = usingCustomAmount ? customAmount.trim() : selectedOption?.priceAmount ?? '';
  const currencyCode = overview?.currencyCode ?? selectedOption?.currencyCode ?? 'CNY';
  const estimatedPoints = useMemo(() => {
    if (!overview) return 0;
    if (selectedOption) return selectedOption.grantAmount;
    const amount = Number(customAmount);
    if (!Number.isFinite(amount) || amount <= 0) return 0;
    const reference = overview.options.find((option) => Number(option.priceAmount) > 0);
    if (!reference) return 0;
    const ratio = reference.grantAmount / Number(reference.priceAmount);
    return Math.floor(amount * ratio);
  }, [customAmount, overview, selectedOption]);

  const canPay = Boolean(
    overview
      && agreed
      && payableAmount
      && Number(payableAmount) > 0
      && !submitting
      && (overview.customAmountSupported || !usingCustomAmount),
  );

  const submitOrder = async () => {
    if (!overview || !canPay) return;
    setSubmitting(true);
    setOrderError(null);
    try {
      const created = await createUpstreamSupplierRechargeOrder(
        supplierId,
        usingCustomAmount
          ? { amount: customAmount.trim() }
          : { packageId: selectedOption?.packageId },
      );
      setOrder(created);
    } catch (cause) {
      setOrderError(errorMessageI18n(cause, t('admin.upstream.supplier.recharge.errors.create'), t));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[1px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="supplier-recharge-title"
        className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#171717]"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4 dark:border-white/10">
          <div className="min-w-0">
            <h2 id="supplier-recharge-title" className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
              <Wallet className="h-4 w-4 text-lobster-500" />
              {t('admin.upstream.supplier.recharge.title')}
            </h2>
            <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">
              {t('admin.upstream.supplier.recharge.subtitle', { name: supplierName })}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {t('admin.upstream.supplier.recharge.balanceLabel')}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 font-mono text-sm font-semibold text-slate-800 dark:bg-white/10 dark:text-white">
              {overview
                ? `${overview.balance.amount} ${
                    overview.balance.unit.trim().toUpperCase() === 'POINTS'
                      ? pointsUnit
                      : overview.balance.unit
                  }`.trim()
                : '-'}
            </span>
            <button type="button" onClick={onClose} aria-label={t('admin.upstream.common.aria.close')} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10">
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex h-64 items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('admin.upstream.supplier.recharge.state.loading')}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-8 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
              <AlertCircle className="h-5 w-5" />
              <span className="text-center">{error}</span>
              <button type="button" className={secondaryButtonClass} onClick={() => void load()}>
                <RefreshCw className="h-4 w-4" />
                {t('admin.upstream.supplier.recharge.actions.retry')}
              </button>
            </div>
          ) : overview ? (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="min-w-0">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {t('admin.upstream.supplier.recharge.packagesTitle')}
                  </h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {t('admin.upstream.supplier.recharge.accountLabel')}
                    <span className="ml-1 font-mono">{overview.accountCode ?? '-'}</span>
                  </span>
                </div>
                {overview.options.length === 0 && !overview.customAmountSupported ? (
                  <p className="rounded-lg border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
                    {t('admin.upstream.supplier.recharge.state.empty')}
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {overview.options.map((option) => {
                      const selected = !usingCustomAmount && option.packageId === selectedPackageId;
                      return (
                        <button
                          key={option.packageId}
                          type="button"
                          onClick={() => setSelectedPackageId(option.packageId)}
                          aria-pressed={selected}
                          className={`relative flex flex-col items-center gap-1 rounded-xl border px-3 py-5 text-center transition ${
                            selected
                              ? 'border-lobster-500 bg-lobster-50/70 ring-2 ring-lobster-500/20 dark:border-lobster-500/60 dark:bg-lobster-500/10'
                              : 'border-slate-200 hover:border-lobster-300 hover:bg-slate-50 dark:border-white/10 dark:hover:border-lobster-500/40 dark:hover:bg-white/[0.03]'
                          }`}
                        >
                          <span className="text-lg font-bold text-slate-900 dark:text-white">
                            {formatRechargePoints(option.grantAmount, pointsUnit)}
                          </span>
                          <span className="font-mono text-sm text-slate-600 dark:text-slate-300">
                            {formatRechargeMoney(option.priceAmount, option.currencyCode)}
                          </span>
                          {option.bonusPoints > 0 ? (
                            <span className="mt-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                              +{formatRechargePoints(option.bonusPoints, pointsUnit)}
                            </span>
                          ) : null}
                          {selected ? <Check className="absolute right-2 top-2 h-4 w-4 text-lobster-600 dark:text-lobster-300" /> : null}
                        </button>
                      );
                    })}
                    {overview.customAmountSupported ? (
                      <div
                        className={`flex flex-col items-center gap-2 rounded-xl border px-3 py-5 text-center transition ${
                          usingCustomAmount
                            ? 'border-lobster-500 bg-lobster-50/70 ring-2 ring-lobster-500/20 dark:border-lobster-500/60 dark:bg-lobster-500/10'
                            : 'border-slate-200 hover:border-lobster-300 hover:bg-slate-50 dark:border-white/10 dark:hover:border-lobster-500/40 dark:hover:bg-white/[0.03]'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedPackageId(null)}
                          aria-pressed={usingCustomAmount}
                          className="text-lg font-bold text-slate-900 dark:text-white"
                        >
                          {t('admin.upstream.supplier.recharge.customAmount')}
                        </button>
                        <input
                          aria-label={t('admin.upstream.supplier.recharge.customAmount')}
                          inputMode="decimal"
                          value={customAmount}
                          onFocus={() => setSelectedPackageId(null)}
                          onChange={(event) => {
                            setSelectedPackageId(null);
                            setCustomAmount(event.target.value.replace(/[^0-9.]/g, ''));
                          }}
                          placeholder={t('admin.upstream.supplier.recharge.customPlaceholder')}
                          className="h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-center font-mono text-sm text-slate-800 outline-none focus:border-lobster-500 dark:border-white/10 dark:bg-[#111] dark:text-white"
                        />
                        {overview.minAmount || overview.maxAmount ? (
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {overview.minAmount ? `≥ ${overview.minAmount}` : ''}
                            {overview.minAmount && overview.maxAmount ? ' · ' : ''}
                            {overview.maxAmount ? `≤ ${overview.maxAmount}` : ''}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                )}
                <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
                  {t('admin.upstream.supplier.recharge.balanceHint')}
                </p>
              </div>

              <aside className="flex min-w-0 flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                {order ? (
                  <RechargeOrderPanel
                    order={order}
                    pointsUnit={pointsUnit}
                    error={orderError}
                    onRefresh={() => void refreshOrder()}
                  />
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-slate-500 dark:text-slate-400">
                        {t('admin.upstream.supplier.recharge.pointsPreview')}
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {formatRechargePoints(estimatedPoints, pointsUnit)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 border-t border-slate-200 pt-3 text-sm dark:border-white/10">
                      <span className="text-slate-500 dark:text-slate-400">
                        {t('admin.upstream.supplier.recharge.amountPreview')}
                      </span>
                      <span className="font-mono text-base font-bold text-slate-900 dark:text-white">
                        {payableAmount ? formatRechargeMoney(payableAmount, currencyCode) : '-'}
                      </span>
                    </div>
                    <label className="mt-2 flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200">
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 shrink-0 accent-lobster-600"
                        checked={agreed}
                        onChange={(event) => setAgreed(event.currentTarget.checked)}
                      />
                      <span className="min-w-0">
                        {overview.agreement?.trim()
                          ? overview.agreement
                          : t('admin.upstream.supplier.recharge.agreement')}
                      </span>
                    </label>
                    <button
                      type="button"
                      className={`${primaryButtonClass} mt-1 w-full`}
                      disabled={!canPay}
                      onClick={() => void submitOrder()}
                    >
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      {submitting
                        ? t('admin.upstream.supplier.recharge.paying')
                        : t('admin.upstream.supplier.recharge.pay')}
                    </button>
                    {orderError ? (
                      <p role="alert" className="text-xs text-red-600 dark:text-red-300">{orderError}</p>
                    ) : null}
                  </>
                )}
              </aside>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function RechargeOrderPanel({
  order,
  pointsUnit,
  error,
  onRefresh,
}: {
  order: UpstreamRechargeOrder;
  pointsUnit: string;
  error: string | null;
  onRefresh: () => void;
}) {
  const { t } = useTranslation();
  const open = rechargeOrderIsOpen(order.status);
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
        {t('admin.upstream.supplier.recharge.order.title')}
      </h3>
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="text-slate-500 dark:text-slate-400">
          {t('admin.upstream.supplier.recharge.order.amount')}
        </span>
        <span className="font-mono font-bold text-slate-900 dark:text-white">
          {formatRechargeMoney(order.amount, order.currencyCode)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="text-slate-500 dark:text-slate-400">
          {t('admin.upstream.supplier.recharge.order.points')}
        </span>
        <span className="font-semibold text-slate-900 dark:text-white">
          {formatRechargePoints(order.points, pointsUnit)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="text-slate-500 dark:text-slate-400">
          {t('admin.upstream.supplier.recharge.order.status')}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            open
              ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'
              : order.status === 'paid'
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300'
          }`}
        >
          {t(rechargeOrderStatusKey(order.status))}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
        <span>{t('admin.upstream.supplier.recharge.order.number')}</span>
        <span className="truncate font-mono">{order.orderNo}</span>
      </div>
      {open ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-4 text-center dark:border-white/10 dark:bg-[#111]">
          <QrCode className="h-16 w-16 text-slate-800 dark:text-slate-100" />
          <p className="text-xs text-slate-600 dark:text-slate-300">
            {t('admin.upstream.supplier.recharge.order.qrHint')}
          </p>
          {order.qrCodePayload && !order.qrCodePayload.startsWith('http') ? (
            <code className="max-w-full break-all text-[10px] text-slate-500 dark:text-slate-400">
              {order.qrCodePayload}
            </code>
          ) : null}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {order.cashierUrl ? (
          <a
            className={`${primaryButtonClass} flex-1`}
            href={order.cashierUrl}
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink className="h-4 w-4" />
            {t('admin.upstream.supplier.recharge.order.openCashier')}
          </a>
        ) : null}
        <button type="button" className={`${secondaryButtonClass} flex-1`} onClick={onRefresh}>
          <RefreshCw className="h-4 w-4" />
          {t('admin.upstream.supplier.recharge.order.refresh')}
        </button>
      </div>
      {error ? <p role="alert" className="text-xs text-red-600 dark:text-red-300">{error}</p> : null}
    </div>
  );
}
