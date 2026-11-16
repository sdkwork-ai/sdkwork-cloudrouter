import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyRound, Loader2, RefreshCw } from 'lucide-react';
import type { CashierTokenSetting } from '@sdkwork/cloudrouter-pc-admin-core/sdk';
import { resolveProblemMessage } from '@sdkwork/cloudroutes-pc-commons';

import {
  backendPaymentCashierTokenSettingRetrieve,
  backendPaymentCashierTokenSettingRotate,
} from '../paymentsService';
import {
  FormError,
  PaymentConfirmDialog,
} from '../forms/PaymentMaintenanceDialogs';

export interface CashierTokenSettingsPanelProps {
  /** Whether the operator may rotate the epoch. */
  readonly canRotate: boolean;
}

/**
 * Anonymous-cashier key epoch panel (支付设置 → 收银台密钥).
 *
 * The panel intentionally shows only the public epoch and rotation metadata. The
 * signing secret is generated here and stored encrypted in the payment database;
 * the deployment key-encryption key is never returned by the API, so there is
 * nothing sensitive to copy out of this screen.
 */
export function CashierTokenSettingsPanel({ canRotate }: CashierTokenSettingsPanelProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [setting, setSetting] = useState<CashierTokenSetting | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [rotateError, setRotateError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setSetting(await backendPaymentCashierTokenSettingRetrieve());
    } catch (error) {
      setLoadError(resolveProblemMessage(
        error,
        t,
        t('admin.commerce.payments.cashierToken.loadError', 'The cashier token setting could not be loaded.'),
      ));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const rotate = async () => {
    if (rotating) {
      return;
    }
    setRotating(true);
    setRotateError(null);
    setNotice(null);
    try {
      const next = await backendPaymentCashierTokenSettingRotate();
      setSetting(next);
      setConfirmOpen(false);
      setNotice(t(
        'admin.commerce.payments.cashierToken.rotateSuccess',
        'The key epoch is now {{epoch}}. New cashier links use it immediately.',
        { epoch: next.keyEpoch },
      ));
    } catch (error) {
      // Close the dialog so the failure is visible in the panel body instead of
      // being hidden behind the confirm overlay.
      setConfirmOpen(false);
      setRotateError(resolveProblemMessage(
        error,
        t,
        t('admin.commerce.payments.cashierToken.rotateError', 'The key epoch could not be rotated.'),
      ));
    } finally {
      setRotating(false);
    }
  };

  const sourceLabel = (source: CashierTokenSetting['source']): string => {
    switch (source) {
      case 'tenant':
        return t('admin.commerce.payments.cashierToken.sourceTenant', 'This tenant');
      case 'platform':
        return t('admin.commerce.payments.cashierToken.sourcePlatform', 'Platform fallback');
      default:
        return t('admin.commerce.payments.cashierToken.sourceDefault', 'Installation default');
    }
  };

  const formatTime = (value: string | null | undefined): string => {
    if (!value) {
      return '—';
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#141414]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-lobster-500/10 text-lobster-500">
            <KeyRound className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              {t('admin.commerce.payments.cashierToken.title', 'Cashier signing key')}
            </h2>
            <p className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
              {t(
                'admin.commerce.payments.cashierToken.desc',
                'The anonymous cashier signs each QR link with a key derived from the deployment root secret and this tenant key epoch. Rotating changes the epoch for new links only; links issued under the previous epoch keep working until they expire (15 minutes). The secret itself is never stored in the payment database or shown here.',
              )}
            </p>
          </div>
        </div>
        <button
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
          disabled={!canRotate || rotating || loading || !setting}
          onClick={() => {
            setNotice(null);
            setRotateError(null);
            setConfirmOpen(true);
          }}
          type="button"
        >
          {rotating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {t('admin.commerce.payments.cashierToken.rotate', 'Rotate key')}
        </button>
      </div>

      {loading ? (
        <div className="mt-5 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400" role="status">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t('admin.commerce.payments.cashierToken.loading', 'Loading key epoch...')}
        </div>
      ) : loadError ? (
        <div className="mt-5">
          <FormError message={loadError} />
          <button
            className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-60 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
            onClick={() => void load()}
            type="button"
          >
            <RefreshCw className="h-4 w-4" />
            {t('admin.commerce.payments.cashierToken.retry', 'Retry')}
          </button>
        </div>
      ) : setting ? (
        <>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border border-slate-200 p-3 dark:border-white/10">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('admin.commerce.payments.cashierToken.epoch', 'Key epoch')}
              </p>
              <p className="mt-1 font-mono text-lg font-semibold text-slate-900 dark:text-white">
                {setting.keyEpoch}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3 dark:border-white/10">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('admin.commerce.payments.cashierToken.source', 'Effective scope')}
              </p>
              <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
                {sourceLabel(setting.source)}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3 dark:border-white/10">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('admin.commerce.payments.cashierToken.rotatedAt', 'Last rotated')}
              </p>
              <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
                {formatTime(setting.rotatedAt)}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3 dark:border-white/10">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('admin.commerce.payments.cashierToken.rotatedBy', 'Rotated by')}
              </p>
              <p className="mt-1 truncate text-sm font-medium text-slate-900 dark:text-white" title={setting.rotatedBy || undefined}>
                {setting.rotatedBy || '—'}
              </p>
            </div>
          </div>
        </>
      ) : null}

      {notice ? <p className="mt-3 text-xs text-emerald-600 dark:text-emerald-400">{notice}</p> : null}
      {rotateError ? <p className="mt-3 text-xs text-red-600 dark:text-red-400">{rotateError}</p> : null}

      {confirmOpen ? (
        <PaymentConfirmDialog
          confirmLabel={t('admin.commerce.payments.cashierToken.rotate', 'Rotate key')}
          description={t(
            'admin.commerce.payments.cashierToken.rotateConfirm',
            'Rotate the cashier signing key epoch? New links use the new epoch immediately; links issued under the previous epoch keep working until they expire (up to 15 minutes).',
          )}
          onClose={() => setConfirmOpen(false)}
          onConfirm={() => void rotate()}
          processing={rotating}
          title={t('admin.commerce.payments.cashierToken.rotateTitle', 'Rotate cashier signing key')}
        />
      ) : null}
    </section>
  );
}
