import { useTranslation } from 'react-i18next';
import { formatPaymentEnumValue } from '../paymentFormat';

/**
 * Status pill shared by the payment record drawers.
 *
 * Color is never the only signal: the pill always renders the translated status
 * label, so color-blind operators and screen readers get the same information.
 */

const STATUS_TONES: Record<string, string> = {
  succeeded: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300',
  processed: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300',
  active: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300',
  created: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300',
  pending: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300',
  processing: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300',
  submitted: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300',
  failed: 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300',
  canceled: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300',
  closed: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300',
};

const DEFAULT_TONE = 'border-slate-200 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300';

export function PaymentStatusPill({ status }: { status: unknown }) {
  const { t } = useTranslation();
  const value = status === null || status === undefined || status === '' ? '-' : String(status);
  const tone = STATUS_TONES[value] ?? DEFAULT_TONE;
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${tone}`}>
      {value === '-' ? '-' : formatPaymentEnumValue(t, 'admin.commerce.payments.value.status', value)}
    </span>
  );
}
