/**
 * Refund processing dialogs.
 *
 * Create refund (intent picker + amount + reason + high-risk confirmation)
 * and retry failed refund (refund-no confirmation). Every write goes through
 * the payment backend SDK with a stable per-dialog-session Idempotency-Key
 * (reused across retries so a timed-out submit cannot create a duplicate
 * refund); the amount is entered in yuan and converted to the backend's
 * integer smallest-unit (minor units) string using string arithmetic
 * (no floating point).
 */

import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  readAdminResourceRecordList,
  type AdminResourceRecord,
} from '@sdkwork/cloudroutes-pc-commons';
import { createClientOperationToken } from '@sdkwork/cloudroutes-pc-commons/idempotency';
import type {
  CreateRefundCommand,
  RetryRefundCommand,
} from '@sdkwork/payment-backend-sdk';
import { backendPaymentsIntentsList } from '../paymentsService';
import {
  DialogFieldLabel as FieldLabel,
  FormError,
  PaymentDialog,
  SelectField,
  TextField,
} from './PaymentMaintenanceDialogs';

export interface RefundCreateFormValues {
  paymentIntentId: string;
  /** Refund amount in yuan with up to two decimals; empty means full refund. */
  amount: string;
  reasonCode: string;
  confirmPaymentIntentNo: string;
  /**
   * Stable per-dialog-session idempotency key. Generated once when the dialog
   * opens and reused for every submission of the same form, so a timed-out
   * request can be retried without creating a duplicate refund: the backend
   * replays the recorded result for a matching key and payload.
   */
  idempotencyKey: string;
}

export interface RefundRetryFormValues {
  confirmRefundNo: string;
  /** Stable per-dialog-session idempotency key, same semantics as create. */
  idempotencyKey: string;
}

const REFUND_REASON_CODES = [
  'customer_request',
  'duplicate',
  'fraud',
  'service_failure',
  'other',
] as const;

/**
 * Translates a backend enum value through the payments value dictionary
 * (`value.<group>.<raw>`), falling back to the raw value when the locale key
 * is absent. Mirrors the list-cell formatting used by the admin sections.
 */
export function translateEnumValue(t: ReturnType<typeof useTranslation>['t'], group: string, value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  const raw = String(value);
  return t(`admin.commerce.payments.value.${group}.${raw}`, { defaultValue: raw });
}

/**
 * Converts a yuan-decimal input ("12.50", "12", "0.01") into the backend's
 * integer smallest-unit string ("1250", "1200", "1") using string arithmetic.
 * Returns `null` when the input is empty (full refund) or malformed.
 */
export function yuanToMinorUnitsString(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    return null;
  }
  const [yuanPart, decimalPart = ''] = trimmed.split('.');
  const cents = decimalPart.padEnd(2, '0');
  const minor = `${yuanPart}${cents}`.replace(/^0+(?=\d)/, '');
  return minor === '' ? '0' : minor;
}

/**
 * ISO 4217 currencies whose smallest unit equals the primary unit (no minor
 * unit). Their amounts must be displayed as-is instead of divided by 100.
 */
const ZERO_DECIMAL_CURRENCIES = new Set([
  'BIF', 'CLP', 'DJF', 'GNF', 'IDR', 'ISK', 'JPY', 'KMF', 'KRW', 'PYG',
  'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF',
]);

/**
 * Formats a backend amount for display. Refund amounts are integer minor
 * units ("1250" -> "12.50"); values that already carry a decimal separator
 * (e.g. dev test intents) are shown as-is, and zero-decimal currencies
 * (JPY, KRW, ...) keep the raw integer.
 */
export function formatRefundAmount(value: unknown, currencyCode?: string): string {
  const raw = value === null || value === undefined || value === '' ? '-' : String(value);
  if (raw === '-') {
    return raw;
  }
  if (raw.includes('.')) {
    return raw;
  }
  if (currencyCode && ZERO_DECIMAL_CURRENCIES.has(currencyCode.trim().toUpperCase())) {
    return raw;
  }
  const minor = Number(raw);
  if (!Number.isFinite(minor)) {
    return raw;
  }
  return (minor / 100).toFixed(2);
}

export function buildRefundCreateCommand(values: RefundCreateFormValues): CreateRefundCommand {
  const amount = yuanToMinorUnitsString(values.amount);
  return {
    paymentIntentId: values.paymentIntentId.trim(),
    ...(amount === null ? {} : { amount }),
    reasonCode: values.reasonCode as CreateRefundCommand['reasonCode'],
    confirmPaymentIntentNo: values.confirmPaymentIntentNo.trim(),
  };
}

export function buildRefundRetryCommand(values: RefundRetryFormValues): RetryRefundCommand {
  return {
    confirmRefundNo: values.confirmRefundNo.trim(),
    expectedStatus: 'failed',
  };
}

// ---------------------------------------------------------------------------
// Intent picker (succeeded intents only — the refundable set)
// ---------------------------------------------------------------------------

function useRefundableIntentOptions(enabled: boolean): AdminResourceRecord[] {
  const [options, setOptions] = useState<AdminResourceRecord[]>([]);
  useEffect(() => {
    if (!enabled) {
      return;
    }
    let active = true;
    void backendPaymentsIntentsList({ status: 'succeeded', page: 1, pageSize: 50 })
      .then((result) => {
        if (active) {
          setOptions(readAdminResourceRecordList(result));
        }
      })
      .catch(() => {
        if (active) {
          setOptions([]);
        }
      });
    return () => {
      active = false;
    };
  }, [enabled]);
  return options;
}

// ---------------------------------------------------------------------------
// Create refund dialog
// ---------------------------------------------------------------------------

export interface RefundCreateDialogProps {
  initialIntentId?: string;
  initialIntentNo?: string;
  saving: boolean;
  onClose(): void;
  onSubmit(values: RefundCreateFormValues): void;
}

export function RefundCreateDialog({ initialIntentId, initialIntentNo, saving, onClose, onSubmit }: RefundCreateDialogProps) {
  const { t } = useTranslation();
  const intents = useRefundableIntentOptions(!initialIntentId);
  const [values, setValues] = useState<RefundCreateFormValues>(() => ({
    paymentIntentId: initialIntentId ?? '',
    amount: '',
    reasonCode: 'customer_request',
    confirmPaymentIntentNo: '',
    idempotencyKey: createClientOperationToken('payment-refund'),
  }));
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof RefundCreateFormValues>(key: K, value: RefundCreateFormValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const selectedIntentNo = values.paymentIntentId
    ? String(intents.find((intent) => String(intent.id ?? '') === values.paymentIntentId)?.paymentIntentNo ?? '')
    : '';
  const targetIntentNo = initialIntentNo ?? selectedIntentNo;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!values.paymentIntentId.trim()) {
      setError(t('admin.commerce.payments.refunds.create.form.paymentIntentRequired', 'Select the payment intent to refund.'));
      return;
    }
    const amount = values.amount.trim();
    const minor = yuanToMinorUnitsString(amount);
    if (amount && minor === null) {
      setError(t('admin.commerce.payments.refunds.create.form.amountMalformed', 'Enter a valid refund amount with up to two decimals.'));
      return;
    }
    if (minor !== null && minor === '0') {
      setError(t('admin.commerce.payments.refunds.create.form.amountInvalid', 'Refund amount must be greater than zero.'));
      return;
    }
    if (values.reasonCode.trim() && !(REFUND_REASON_CODES as readonly string[]).includes(values.reasonCode)) {
      setError(t('admin.commerce.payments.refunds.create.form.reasonInvalid', 'Choose a valid refund reason.'));
      return;
    }
    if (!values.confirmPaymentIntentNo.trim()) {
      setError(t('admin.commerce.payments.refunds.create.form.confirmRequired', 'Type the payment intent number to confirm the refund.'));
      return;
    }
    if (values.confirmPaymentIntentNo.trim() !== targetIntentNo) {
      setError(t('admin.commerce.payments.refunds.create.form.confirmMismatch', 'The confirmation number does not match the selected payment intent.'));
      return;
    }
    onSubmit(values);
  }

  return (
    <PaymentDialog
      onClose={onClose}
      onSubmit={handleSubmit}
      saving={saving}
      title={t('admin.commerce.payments.refunds.create.title', 'Create refund')}
      description={t('admin.commerce.payments.refunds.create.desc', 'Refunds are idempotent and limited to the original payment amount. Leaving the amount empty refunds the full amount.')}
    >
      {initialIntentId ? (
        <div className="md:col-span-2">
          <FieldLabel label={t('admin.commerce.payments.refunds.create.form.paymentIntent', 'Payment intent')}>
            <div className="mt-1.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
              <span className="font-mono text-xs">{initialIntentNo ?? initialIntentId}</span>
            </div>
          </FieldLabel>
        </div>
      ) : (
        <div className="md:col-span-2">
          <FieldLabel label={t('admin.commerce.payments.refunds.create.form.paymentIntent', 'Payment intent')}>
            <select
              className="mt-1.5 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-[#202020] dark:text-white"
              disabled={saving}
              onChange={(event) => set('paymentIntentId', event.target.value)}
              value={values.paymentIntentId}
            >
              <option value="">{t('admin.commerce.payments.refunds.create.form.paymentIntentEmpty', 'Select a succeeded payment intent')}</option>
              {intents.map((intent) => (
                <option key={String(intent.id ?? '')} value={String(intent.id ?? '')}>
                  {String(intent.paymentIntentNo ?? intent.id ?? '')}
                </option>
              ))}
            </select>
          </FieldLabel>
        </div>
      )}
      <TextField
        description={t('admin.commerce.payments.refunds.create.form.amountHint', 'Leave empty to refund the full payment amount.')}
        inputMode="decimal"
        label={t('admin.commerce.payments.refunds.create.form.amount', 'Refund amount (yuan)')}
        placeholder="12.50"
        value={values.amount}
        onChange={(value) => set('amount', value)}
      />
      <SelectField
        label={t('admin.commerce.payments.refunds.create.form.reasonCode', 'Refund reason')}
        options={REFUND_REASON_CODES}
        translateOptionPrefix="admin.commerce.payments.value.reasonCode"
        value={values.reasonCode}
        onChange={(value) => set('reasonCode', value)}
      />
      <TextField
        description={t('admin.commerce.payments.refunds.create.form.confirmHint', 'Type the full payment intent number. This is a high-risk action confirmation.')}
        label={t('admin.commerce.payments.refunds.create.form.confirmPaymentIntentNo', 'Confirm payment intent no')}
        required
        value={values.confirmPaymentIntentNo}
        onChange={(value) => set('confirmPaymentIntentNo', value)}
      />
      {error ? <FormError message={error} /> : null}
    </PaymentDialog>
  );
}

// ---------------------------------------------------------------------------
// Retry refund dialog
// ---------------------------------------------------------------------------

export interface RefundRetryDialogProps {
  record: AdminResourceRecord;
  saving: boolean;
  onClose(): void;
  onSubmit(values: RefundRetryFormValues): void;
}

export function RefundRetryDialog({ record, saving, onClose, onSubmit }: RefundRetryDialogProps) {
  const { t } = useTranslation();
  const refundNo = String(record.refundNo ?? record.id ?? '');
  const [values, setValues] = useState<RefundRetryFormValues>({
    confirmRefundNo: '',
    idempotencyKey: createClientOperationToken('payment-refund-retry'),
  });
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!values.confirmRefundNo.trim()) {
      setError(t('admin.commerce.payments.refunds.retry.form.confirmRequired', 'Type the refund number to retry it.'));
      return;
    }
    if (values.confirmRefundNo.trim() !== refundNo) {
      setError(t('admin.commerce.payments.refunds.retry.form.confirmMismatch', 'The confirmation number does not match this refund.'));
      return;
    }
    onSubmit(values);
  }

  return (
    <PaymentDialog
      onClose={onClose}
      onSubmit={handleSubmit}
      saving={saving}
      title={t('admin.commerce.payments.refunds.retry.title', 'Retry refund')}
      description={t('admin.commerce.payments.refunds.retry.desc', 'Re-submit a failed refund to the provider. The operation is idempotent and keeps the original refund number.')}
    >
      <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 md:col-span-2">
        <div className="flex items-start justify-between gap-4 py-1">
          <span>{t('admin.commerce.payments.col.refundNo', 'Refund No')}</span>
          <span className="font-mono text-xs">{refundNo}</span>
        </div>
        <div className="flex items-start justify-between gap-4 py-1">
          <span>{t('admin.col.amount', 'Amount')}</span>
          <span className="font-mono text-xs">{formatRefundAmount(record.amount, String(record.currencyCode ?? ''))} {String(record.currencyCode ?? '')}</span>
        </div>
        <div className="flex items-start justify-between gap-4 py-1">
          <span>{t('admin.col.status', 'Status')}</span>
          <span className="font-mono text-xs">{translateEnumValue(t, 'status', record.status)}</span>
        </div>
      </div>
      <TextField
        description={t('admin.commerce.payments.refunds.retry.form.confirmHint', 'Type the full refund number. This is a high-risk action confirmation.')}
        label={t('admin.commerce.payments.refunds.retry.form.confirmRefundNo', 'Confirm refund no')}
        required
        value={values.confirmRefundNo}
        onChange={(value) => setValues((prev) => ({ ...prev, confirmRefundNo: value }))}
      />
      {error ? <FormError message={error} /> : null}
    </PaymentDialog>
  );
}
