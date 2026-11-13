import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, Wallet } from 'lucide-react';
import { SDKWORK_SUBSCRIPTION_I18N_KEYS } from '@sdkwork/membership-pc-subscription/catalog';
import {
  SdkworkOrderCheckoutDialog,
  type SdkworkOrderCheckoutDialogCopy,
} from '@sdkwork/order-pc-checkout';
import { Button, StatusNotice } from '@sdkwork/ui-pc-react';

import {
  createCloudRouterCashierCheckoutDriver,
  formatCloudRouterCashierAmount,
  isCloudRouterCashierPayable,
  isCloudRouterCashierSettled,
  loadCloudRouterCashierOrder,
  toCloudRouterCashierSummary,
  type CloudRouterCashierOrder,
} from './cashierService.js';

const CHECKOUT_KEYS = SDKWORK_SUBSCRIPTION_I18N_KEYS.checkout;

/** Backend order subjects that should render as localized plan titles. */
const SUBJECT_KEYS: Readonly<Record<string, string>> = {
  membership: 'cloudrouter.cashier.subject_membership',
  'membership subscription': 'cloudrouter.cashier.subject_membership',
  vip: 'cloudrouter.cashier.subject_membership',
  points_recharge: 'cloudrouter.cashier.subject_points_recharge',
  'points recharge': 'cloudrouter.cashier.subject_points_recharge',
  token_bank_recharge: 'cloudrouter.cashier.subject_token_bank_recharge',
  'token bank recharge': 'cloudrouter.cashier.subject_token_bank_recharge',
};

/**
 * PC cashier page mounted at the unified cashier route (`/cashier/:orderId`)
 * and the im-aligned order cashier route (`/me/orders/:orderId/cashier`).
 *
 * The page owns data loading and the order-owned checkout dialog; the payment
 * protocol lives in the Order App SDK behind
 * `createCloudRouterCashierCheckoutDriver`.
 */
export function CloudRouterCashierPage() {
  const { orderId = '' } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? i18n.language ?? 'en-US';
  const [order, setOrder] = useState<CloudRouterCashierOrder | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  const goToWallet = useCallback(() => {
    navigate('/console/wallet');
  }, [navigate]);

  useEffect(() => {
    if (!orderId) {
      return undefined;
    }
    let active = true;
    setLoadFailed(false);
    setOrder(null);
    void loadCloudRouterCashierOrder(orderId).then(
      (loaded) => {
        if (active) setOrder(loaded);
      },
      () => {
        if (active) setLoadFailed(true);
      },
    );
    return () => {
      active = false;
    };
  }, [orderId, reloadToken]);

  const localizedSubject = useMemo(() => {
    const subject = order?.subject?.trim() ?? '';
    const key = SUBJECT_KEYS[subject.toLowerCase()];
    return key ? t(key, subject) : subject;
  }, [order?.subject, t]);

  const summary = useMemo(
    () => (order ? toCloudRouterCashierSummary(order, localizedSubject, locale) : null),
    [locale, localizedSubject, order],
  );

  const driver = useMemo(
    () => (order && isCloudRouterCashierPayable(order)
      ? createCloudRouterCashierCheckoutDriver(order)
      : null),
    [order],
  );

  const copy = useMemo<SdkworkOrderCheckoutDialogCopy>(() => ({
    activationDescription: t(
      CHECKOUT_KEYS.activationDescription,
      'Your purchase is activated as soon as payment completes.',
    ),
    activationTitle: t(CHECKOUT_KEYS.activationTitle, 'Instant activation'),
    close: t(CHECKOUT_KEYS.close, 'Close'),
    completed: t(CHECKOUT_KEYS.completed, 'Payment completed'),
    creatingPayment: t(CHECKOUT_KEYS.creatingPayment, 'Creating payment QR code...'),
    expired: t(CHECKOUT_KEYS.expired, 'Order expired'),
    expiredDescription: t(
      CHECKOUT_KEYS.expiredDescription,
      'This order has expired. Create a new order to continue.',
    ),
    expiresIn: t(CHECKOUT_KEYS.expiresIn, 'Order expires in'),
    paymentUnavailable: t(CHECKOUT_KEYS.paymentUnavailableTitle, 'Payment is temporarily unavailable'),
    paymentUnavailableDescription: t(
      CHECKOUT_KEYS.paymentUnavailableDescription,
      'A payment QR code cannot be created right now. Try again later.',
    ),
    payByQr: t(CHECKOUT_KEYS.payByQr, 'Scan to pay'),
    price: t(CHECKOUT_KEYS.price, 'Price'),
    retry: t(CHECKOUT_KEYS.retry, 'Retry'),
    scanPrompt: t(CHECKOUT_KEYS.scanPrompt, 'Scan to complete payment'),
    secureDescription: t(CHECKOUT_KEYS.secureDescription, 'Payments run through the platform payment service.'),
    secureTitle: t(CHECKOUT_KEYS.secureTitle, 'Secure checkout'),
    selectedItem: t('cloudrouter.cashier.orderLabel', 'Order'),
    title: t('cloudrouter.cashier.title', 'Cashier'),
  }), [t]);

  if (!orderId) {
    return (
      <CashierFrame title={t('cloudrouter.cashier.title', 'Cashier')}>
        <StatusNotice
          title={t('cloudrouter.cashier.notPayable', 'This order is not payable in its current state.')}
          tone="danger"
        >
          {t('cloudrouter.cashier.missingOrder', 'The cashier URL is missing its order id.')}
        </StatusNotice>
        <CashierBackButton label={t('cloudrouter.cashier.backToWallet', 'Back to wallet')} onClick={goToWallet} />
      </CashierFrame>
    );
  }

  if (loadFailed) {
    return (
      <CashierFrame title={t('cloudrouter.cashier.title', 'Cashier')}>
        <StatusNotice
          title={t('cloudrouter.cashier.loadFailed', 'The order failed to load. Try again.')}
          tone="danger"
        >
          <Button
            onClick={() => setReloadToken((current) => current + 1)}
            type="button"
            variant="secondary"
          >
            {t('cloudrouter.cashier.retry', 'Retry')}
          </Button>
        </StatusNotice>
        <CashierBackButton label={t('cloudrouter.cashier.backToWallet', 'Back to wallet')} onClick={goToWallet} />
      </CashierFrame>
    );
  }

  if (!order) {
    return (
      <CashierFrame title={t('cloudrouter.cashier.title', 'Cashier')}>
        <div
          className="flex items-center justify-center gap-2 py-16 text-sm text-[var(--sdk-color-text-secondary)]"
          role="status"
        >
          <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
          {t('cloudrouter.cashier.loading', 'Loading order...')}
        </div>
      </CashierFrame>
    );
  }

  if (!isCloudRouterCashierPayable(order)) {
    const settled = isCloudRouterCashierSettled(order);
    const amount = formatCloudRouterCashierAmount(order, locale);
    return (
      <CashierFrame title={t('cloudrouter.cashier.title', 'Cashier')}>
        <div className="rounded-xl border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel)] p-6 text-center">
          <p className="text-lg font-semibold text-[var(--sdk-color-text-primary)]">
            {settled
              ? t('cloudrouter.cashier.paid', 'Payment completed. The order will be processed shortly.')
              : t('cloudrouter.cashier.notPayable', 'This order is not payable in its current state.')}
          </p>
          <p className="mt-2 text-sm text-[var(--sdk-color-text-secondary)]">
            {localizedSubject || order.subject || order.orderSn}
          </p>
          <p className="mt-1 text-sm text-[var(--sdk-color-text-secondary)]">{amount}</p>
          <div className="mt-5 flex justify-center">
            <CashierBackButton
              label={t('cloudrouter.cashier.backToWallet', 'Back to wallet')}
              onClick={goToWallet}
            />
          </div>
        </div>
      </CashierFrame>
    );
  }

  return (
    <CashierFrame title={t('cloudrouter.cashier.title', 'Cashier')}>
      {summary && driver ? (
        <SdkworkOrderCheckoutDialog
          copy={copy}
          driver={driver}
          isOpen
          onClose={goToWallet}
          summary={summary}
        />
      ) : null}
    </CashierFrame>
  );
}

function CashierFrame({ children, title }: { children: ReactNode; title: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--sdk-color-surface-canvas)] px-6 py-10">
      <div className="w-full max-w-3xl">
        <h1 className="mb-4 text-2xl font-semibold text-[var(--sdk-color-text-primary)]">{title}</h1>
        {children}
      </div>
    </div>
  );
}

function CashierBackButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button className="mt-4" onClick={onClick} type="button" variant="secondary">
      <Wallet aria-hidden="true" className="mr-2 h-4 w-4" />
      {label}
    </Button>
  );
}
