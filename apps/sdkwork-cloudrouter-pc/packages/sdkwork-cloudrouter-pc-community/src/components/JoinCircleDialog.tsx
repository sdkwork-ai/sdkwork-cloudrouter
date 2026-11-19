import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Loader2, X } from 'lucide-react';

import {
  CommunityService,
  activateCircleMembership,
  createCircleMembershipOrder,
  isCircleOrderPaid,
  type CircleMembershipOrderResult,
  type Community,
  type MembershipTier,
} from '../runtime.ts';

const PAYMENT_METHODS = [
  { id: 'wechat_pay', labelKey: 'communityUi.wechatPay' },
  { id: 'alipay', labelKey: 'communityUi.alipay' },
  { id: 'balance', labelKey: 'communityUi.balance' },
] as const;

const PAYMENT_POLL_INTERVAL_MS = 3000;

/**
 * Free and paid circle join flow.
 *
 * A paid join creates the membership order through sdkwork-order, opens the
 * shared cashier, and activates the membership only after the order status
 * reports paid. The dialog also polls while it is open, so returning from the
 * cashier completes activation without a manual refresh.
 */
export function JoinCircleDialog({
  circle,
  onClose,
  onJoined,
  open,
  tiers,
}: {
  readonly circle: Community;
  readonly onClose: () => void;
  readonly onJoined: () => void;
  readonly open: boolean;
  readonly tiers: readonly MembershipTier[];
}) {
  const { t } = useTranslation();
  const [selectedTierId, setSelectedTierId] = useState(tiers[0]?.id ?? '');
  const [lifetime, setLifetime] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>(PAYMENT_METHODS[0].id);
  const [order, setOrder] = useState<CircleMembershipOrderResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const activatedRef = useRef(false);

  const selectedTier = tiers.find((tier) => tier.id === selectedTierId) ?? tiers[0];
  const supportsLifetime = Boolean(selectedTier?.lifetimePrice && selectedTier?.lifetimePackageId);
  const useLifetime = lifetime && supportsLifetime;
  const packageId = useLifetime
    ? selectedTier?.lifetimePackageId
    : selectedTier?.catalogPackageId;
  const price = useLifetime ? selectedTier?.lifetimePrice : selectedTier?.price;

  const finishActivation = async (currentOrder: CircleMembershipOrderResult) => {
    if (!selectedTier || !packageId || activatedRef.current) {
      return;
    }
    if (!(await isCircleOrderPaid(currentOrder.orderId))) {
      return;
    }
    activatedRef.current = true;
    await activateCircleMembership(circle.id, currentOrder.orderId, selectedTier.id, packageId);
    onJoined();
  };

  // Poll the order while the dialog stays open so a cashier opened in another
  // tab completes the membership as soon as the payment settles.
  useEffect(() => {
    if (!order || !open) {
      return undefined;
    }
    let cancelled = false;
    const tick = () => {
      if (cancelled || activatedRef.current) return;
      void finishActivation(order).catch(() => {
        if (!cancelled) setError(t('communityUi.activateFailed'));
      });
    };
    tick();
    const timer = setInterval(tick, PAYMENT_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order, open, selectedTierId, lifetime]);

  useEffect(() => {
    if (!supportsLifetime) setLifetime(false);
  }, [supportsLifetime]);

  if (!open) {
    return null;
  }

  const joinFree = async () => {
    setBusy(true);
    setError('');
    try {
      await CommunityService.joinCommunity(circle.id);
      onJoined();
    } catch {
      setError(t('communityUi.activateFailed'));
    } finally {
      setBusy(false);
    }
  };

  const createOrder = async () => {
    if (!selectedTier || !packageId) {
      setError(t('communityUi.orderFailed'));
      return;
    }
    setBusy(true);
    setError('');
    try {
      const created = await createCircleMembershipOrder({
        circleId: circle.id,
        tierId: selectedTier.id,
        packageId,
        isLifetime: useLifetime,
        paymentMethod,
      });
      setOrder(created);
    } catch {
      setError(t('communityUi.orderFailed'));
    } finally {
      setBusy(false);
    }
  };

  const confirmPayment = async () => {
    if (!order) return;
    setBusy(true);
    setError('');
    try {
      await finishActivation(order);
      if (!activatedRef.current) {
        setError(t('communityUi.activateFailed'));
      }
    } catch {
      setError(t('communityUi.activateFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-label={t('communityUi.join')}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t('communityUi.join')}</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{circle.name}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={t('communityUi.back')} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {error ? (
          <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        ) : null}

        {!circle.isPaid ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">{t('communityUi.free')}</p>
            <button type="button" onClick={() => void joinFree()} disabled={busy} className="w-full rounded-xl bg-lobster-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-lobster-600 disabled:opacity-60">
              {busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" aria-hidden="true" /> : t('communityUi.join')}
            </button>
          </div>
        ) : order ? (
          <div className="space-y-4">
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              {t('communityUi.orderCreated', { orderNo: order.orderNo })}
            </p>
            <div className="flex flex-wrap gap-2">
              <a href={order.cashierUrl || `/cashier/${encodeURIComponent(order.orderId)}`} className="inline-flex items-center justify-center rounded-xl bg-lobster-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-lobster-600">
                {t('communityUi.openCashier')}
              </a>
              <button type="button" onClick={() => void confirmPayment()} disabled={busy} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
                {t('communityUi.markPaid')}
              </button>
            </div>
            <p className="text-xs text-slate-400">{t('communityUi.paymentPolling', 'This window checks the payment automatically.')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">{t('communityUi.chooseTier')}</p>
              <div className="space-y-2">
                {tiers.map((tier) => (
                  <label key={tier.id} className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3 text-sm ${selectedTierId === tier.id ? 'border-lobster-400 bg-lobster-500/5' : 'border-slate-200 dark:border-slate-700'}`}>
                    <span className="flex items-center gap-2">
                      <input type="radio" name="community-tier" value={tier.id} checked={selectedTierId === tier.id} onChange={() => setSelectedTierId(tier.id)} className="h-4 w-4" />
                      <span>
                        <span className="block font-medium text-slate-900 dark:text-white">{tier.name}</span>
                        <span className="block text-xs text-slate-500 dark:text-slate-400">{tier.durationDays} {t('communityUi.tierDuration')}</span>
                      </span>
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-white">¥{tier.price}</span>
                  </label>
                ))}
                {tiers.length === 0 ? <p className="text-sm text-slate-500">{t('communityUi.tiers')}: —</p> : null}
              </div>
              {supportsLifetime ? (
                <label className="mt-2 flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <input type="checkbox" checked={lifetime} onChange={(event) => setLifetime(event.target.checked)} className="h-4 w-4" />
                  {t('communityUi.lifetimePurchase', 'Lifetime membership')} · ¥{selectedTier?.lifetimePrice}
                </label>
              ) : null}
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">{t('communityUi.paymentMethod')}</p>
              <div className="flex flex-wrap gap-2">
                {PAYMENT_METHODS.map((method) => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setPaymentMethod(method.id)}
                    aria-pressed={paymentMethod === method.id}
                    className={`rounded-lg border px-3 py-1.5 text-sm ${paymentMethod === method.id ? 'border-lobster-400 bg-lobster-500/10 text-lobster-600 dark:text-lobster-300' : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'}`}
                  >
                    {t(method.labelKey)}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t('communityUi.amountDue', 'Amount due')}: <span className="font-semibold text-slate-900 dark:text-white">¥{price ?? 0}</span>
            </p>

            <button type="button" onClick={() => void createOrder()} disabled={busy} className="w-full rounded-xl bg-lobster-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-lobster-600 disabled:opacity-60">
              {busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" aria-hidden="true" /> : t('communityUi.createOrder')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
