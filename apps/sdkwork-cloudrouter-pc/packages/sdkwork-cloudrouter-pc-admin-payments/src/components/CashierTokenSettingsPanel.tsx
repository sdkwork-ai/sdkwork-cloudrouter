import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyRound, Loader2, Power, PowerOff, RefreshCw } from 'lucide-react';
import type { CashierTokenSetting } from '@sdkwork/cloudrouter-pc-admin-core/sdk';
import { resolveProblemMessage } from '@sdkwork/cloudroutes-pc-commons';

import {
  backendPaymentCashierTokenSettingRetrieve,
  backendPaymentCashierTokenSettingRotate,
  backendPaymentCashierTokenSettingUpdate,
} from '../paymentsService';
import {
  FormError,
  PaymentConfirmDialog,
} from '../forms/PaymentMaintenanceDialogs';

export interface CashierTokenSettingsPanelProps {
  /** Whether the operator may enable/disable or rotate the signing key. */
  readonly canRotate: boolean;
}

/**
 * Anonymous-cashier signing-key panel (支付设置 → 收银台密钥).
 *
 * The panel shows only public metadata (status, epoch, rotation, provider). The
 * signing key is generated here and stored encrypted in the payment database;
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
  const [updating, setUpdating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

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
    setActionError(null);
    setNotice(null);
    try {
      const next = await backendPaymentCashierTokenSettingRotate();
      setSetting(next);
      setConfirmOpen(false);
      setNotice(t(
        'admin.commerce.payments.cashierToken.rotateSuccess',
        'The signing key is now epoch {{epoch}}. New cashier links use it immediately.',
        { epoch: next.keyEpoch },
      ));
    } catch (error) {
      // Close the dialog so the failure is visible in the panel body instead of
      // being hidden behind the confirm overlay.
      setConfirmOpen(false);
      setActionError(resolveProblemMessage(
        error,
        t,
        t('admin.commerce.payments.cashierToken.rotateError', 'The cashier signing key could not be rotated.'),
      ));
    } finally {
      setRotating(false);
    }
  };

  const toggleEnabled = async () => {
    if (updating || !setting) {
      return;
    }
    setUpdating(true);
    setActionError(null);
    setNotice(null);
    try {
      const next = await backendPaymentCashierTokenSettingUpdate(!setting.enabled);
      setSetting(next);
      const state = next.enabled
        ? t('admin.commerce.payments.cashierToken.enabled', 'Enabled')
        : t('admin.commerce.payments.cashierToken.disabled', 'Disabled');
      setNotice(t(
        'admin.commerce.payments.cashierToken.updateSuccess',
        'The anonymous cashier is now {{state}}.',
        { state },
      ));
    } catch (error) {
      setActionError(resolveProblemMessage(
        error,
        t,
        t('admin.commerce.payments.cashierToken.updateError', 'The anonymous cashier setting could not be updated.'),
      ));
    } finally {
      setUpdating(false);
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
                'The anonymous cashier signs each QR link with a signing key that the payment center generates and stores encrypted in the payment database. Rotating creates a new key immediately; links issued under the previous key keep working until they expire (up to 15 minutes, and the previous key is kept for one hour). The deployment key-encryption key only protects the stored secret and is never shown here.',
              )}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
            disabled={!canRotate || updating || rotating || loading || !setting}
            onClick={() => void toggleEnabled()}
            type="button"
          >
            {updating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : setting?.enabled ? (
              <PowerOff className="h-4 w-4" />
            ) : (
              <Power className="h-4 w-4" />
            )}
            {setting?.enabled
              ? t('admin.commerce.payments.cashierToken.disable', 'Disable anonymous cashier')
              : t('admin.commerce.payments.cashierToken.enable', 'Enable anonymous cashier')}
          </button>
          <button
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
            disabled={!canRotate || rotating || updating || loading || !setting}
            onClick={() => {
              setNotice(null);
              setActionError(null);
              setConfirmOpen(true);
            }}
            type="button"
          >
            {rotating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {t('admin.commerce.payments.cashierToken.rotate', 'Rotate key')}
          </button>
        </div>
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
                {t('admin.commerce.payments.cashierToken.status', 'Status')}
              </p>
              <p className={`mt-1 text-sm font-medium ${setting.enabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
                {setting.enabled
                  ? t('admin.commerce.payments.cashierToken.enabled', 'Enabled')
                  : t('admin.commerce.payments.cashierToken.disabled', 'Disabled')}
              </p>
            </div>
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
                {t('admin.commerce.payments.cashierToken.signingKey', 'Signing key')}
              </p>
              <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
                {setting.signingKeyConfigured
                  ? t('admin.commerce.payments.cashierToken.signingKeyConfigured', 'Configured (encrypted in the payment database)')
                  : t('admin.commerce.payments.cashierToken.signingKeyMissing', 'Not configured yet (generated on first use or rotation)')}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3 dark:border-white/10">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('admin.commerce.payments.cashierToken.keyProvider', 'Key provider')}
              </p>
              <p className="mt-1 truncate text-sm font-medium text-slate-900 dark:text-white" title={setting.keyProvider || undefined}>
                {setting.keyProvider || '—'}
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
      {actionError ? <p className="mt-3 text-xs text-red-600 dark:text-red-400">{actionError}</p> : null}

      {confirmOpen ? (
        <PaymentConfirmDialog
          confirmLabel={t('admin.commerce.payments.cashierToken.rotate', 'Rotate key')}
          description={t(
            'admin.commerce.payments.cashierToken.rotateConfirm',
            'Rotate the cashier signing key? A new key is generated and stored immediately; links issued under the previous key keep working until they expire (up to 15 minutes, previous key retained for one hour).',
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
