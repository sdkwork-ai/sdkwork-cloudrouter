import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { showToast } from '@sdkwork/ui-mobile-react';

export interface CashierEntryErrorPageProps {
  /** Operator-facing detail already localized by the host, when available. */
  readonly message?: string;
  /** Retry callback; defaults to reloading the page. */
  readonly onRetry?: () => void;
}

/**
 * Terminal cashier entry state for an unusable link.
 *
 * A scanned QR must never bounce to the login screen: the payer has no account
 * context and no way to understand why a payment page became a sign-in form. This
 * renders the cashier chrome, surfaces the failure as a toast, and offers a
 * reload — the only recovery a payer can act on.
 */
export function CashierEntryErrorPage({ message, onRetry }: CashierEntryErrorPageProps) {
  const { t } = useTranslation();
  const detail =
    message?.trim() ||
    t('orders.cashier_entry_error_desc', '支付链接已失效或暂时不可用，请重新扫码或联系商家。');

  useEffect(() => {
    showToast(detail);
  }, [detail]);

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
      return;
    }
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-canvas px-5 py-6">
      <h1 className="mb-4 text-center text-[17px] font-semibold text-text-main">
        {t('orders.cashier_title', '收银台')}
      </h1>
      <div className="rounded-2xl bg-surface p-5 shadow-sm">
        <p className="text-[15px] font-medium text-text-main">
          {t('orders.cashier_entry_error_title', '暂时无法打开收银台')}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-text-sub">{detail}</p>
        <button
          type="button"
          onClick={handleRetry}
          className="mt-5 w-full rounded-xl bg-brand-fill py-3 text-[15px] font-medium text-on-brand active:opacity-80"
        >
          {t('orders.cashier_entry_error_retry', '重新加载')}
        </button>
      </div>
    </div>
  );
}
