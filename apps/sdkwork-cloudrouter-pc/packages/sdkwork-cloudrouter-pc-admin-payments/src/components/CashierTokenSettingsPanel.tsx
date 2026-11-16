import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Eye,
  KeyRound,
  Loader2,
  Pencil,
  Power,
  PowerOff,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import type { CashierTokenSecretReveal, CashierTokenSetting } from '@sdkwork/cloudrouter-pc-admin-core/sdk';
import { resolveProblemMessage } from '@sdkwork/cloudroutes-pc-commons';

import {
  backendPaymentCashierTokenSettingRetrieve,
  backendPaymentCashierTokenSettingRevealKey,
  backendPaymentCashierTokenSettingRotate,
  backendPaymentCashierTokenSettingSetKey,
  backendPaymentCashierTokenSettingUpdate,
} from '../paymentsService';
import {
  FormError,
  PaymentConfirmDialog,
} from '../forms/PaymentMaintenanceDialogs';
import {
  CashierTokenRevealDialog,
  CashierTokenSetDialog,
} from './CashierTokenKeyDialogs';

export interface CashierTokenSettingsPanelProps {
  /** Whether the operator may change the key or the anonymous-cashier switch. */
  readonly canManage: boolean;
}

const SECTION_CLASS =
  'w-full min-w-0 rounded-xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#1c1c1c]';
const SECONDARY_BUTTON_CLASS =
  'inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5';
const PRIMARY_BUTTON_CLASS =
  'inline-flex items-center gap-1.5 rounded-md bg-lobster-500 px-3 py-2 text-sm font-medium text-white hover:bg-lobster-600 disabled:cursor-not-allowed disabled:opacity-60';
const DANGER_BUTTON_CLASS =
  'inline-flex items-center gap-1.5 rounded-md border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-500/30 dark:text-red-300 dark:hover:bg-red-500/10';

const INFO_CARD_CLASS =
  'min-w-0 rounded-lg border border-slate-200 p-3 dark:border-white/10';

/**
 * Anonymous-cashier signing-key panel (支付设置 → 收银台密钥).
 *
 * The payment QR only carries `s1.<22>`; the real signed capability token is
 * stored encrypted in the payment database. The signing key shown/managed here
 * signs that stored token. The deployment key-encryption key only protects the
 * stored secret and is never returned by the API.
 *
 * Layout follows the sibling payment-settings pages: a full-width page body
 * containing stacked, full-width sections instead of a centered fixed column.
 */
export function CashierTokenSettingsPanel({ canManage }: CashierTokenSettingsPanelProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [setting, setSetting] = useState<CashierTokenSetting | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [disableConfirmOpen, setDisableConfirmOpen] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [revealed, setRevealed] = useState<CashierTokenSecretReveal | null>(null);
  const [setDialogOpen, setSetDialogOpen] = useState(false);
  const [savingKey, setSavingKey] = useState(false);
  const [setKeyError, setSetKeyError] = useState<string | null>(null);

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
      const next = await backendPaymentCashierTokenSettingRotate(setting?.keyEpoch);
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
      // A conflict means the epoch moved (another admin or a retried request);
      // refresh so the next attempt uses the current expected epoch.
      void load();
    } finally {
      setRotating(false);
    }
  };

  const updateEnabled = async (enabled: boolean) => {
    if (updating || !setting) {
      return;
    }
    setUpdating(true);
    setActionError(null);
    setNotice(null);
    try {
      const next = await backendPaymentCashierTokenSettingUpdate(enabled);
      setSetting(next);
      setDisableConfirmOpen(false);
      const state = next.enabled
        ? t('admin.commerce.payments.cashierToken.enabled', 'Enabled')
        : t('admin.commerce.payments.cashierToken.disabled', 'Disabled');
      setNotice(t(
        'admin.commerce.payments.cashierToken.updateSuccess',
        'The anonymous cashier is now {{state}}.',
        { state },
      ));
    } catch (error) {
      // Keep the failure visible instead of leaving the confirm overlay open.
      setDisableConfirmOpen(false);
      setActionError(resolveProblemMessage(
        error,
        t,
        t('admin.commerce.payments.cashierToken.updateError', 'The anonymous cashier setting could not be updated.'),
      ));
    } finally {
      setUpdating(false);
    }
  };

  const toggleEnabled = () => {
    if (!setting || updating) {
      return;
    }
    if (setting.enabled) {
      setNotice(null);
      setActionError(null);
      setDisableConfirmOpen(true);
      return;
    }
    void updateEnabled(true);
  };

  /** Loads the stored signing key for the reveal dialog. */
  const openReveal = async () => {
    if (revealing) {
      return;
    }
    setRevealing(true);
    setActionError(null);
    setNotice(null);
    try {
      setRevealed(await backendPaymentCashierTokenSettingRevealKey());
    } catch (error) {
      setActionError(resolveProblemMessage(
        error,
        t,
        t('admin.commerce.payments.cashierToken.revealError', 'The cashier signing key could not be read.'),
      ));
    } finally {
      setRevealing(false);
    }
  };

  /** Stores an operator-supplied signing key. */
  const saveKey = async (key: string) => {
    if (savingKey) {
      return;
    }
    setSavingKey(true);
    setSetKeyError(null);
    try {
      const next = await backendPaymentCashierTokenSettingSetKey(key, setting?.keyEpoch);
      setSetting(next);
      setSetDialogOpen(false);
      setNotice(t(
        'admin.commerce.payments.cashierToken.setSuccess',
        'The signing key was saved. New cashier links use epoch {{epoch}}.',
        { epoch: next.keyEpoch },
      ));
    } catch (error) {
      setSetKeyError(resolveProblemMessage(
        error,
        t,
        t('admin.commerce.payments.cashierToken.setError', 'The cashier signing key could not be saved.'),
      ));
      // Refresh the public metadata without unmounting the dialog: a stale
      // `expectedEpoch` (another admin rotated/saved first) must not leave the
      // operator retrying against the same stale epoch.
      try {
        setSetting(await backendPaymentCashierTokenSettingRetrieve());
      } catch {
        // Keep the save error; the next explicit load will surface the read error.
      }
    } finally {
      setSavingKey(false);
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

  const revealSourceLabel = (source: string | null | undefined): string => {
    switch (source) {
      case 'tenant':
        return t('admin.commerce.payments.cashierToken.sourceTenant', 'This tenant');
      case 'platform':
        return t('admin.commerce.payments.cashierToken.sourcePlatform', 'Platform fallback');
      case 'deployment':
        return t('admin.commerce.payments.cashierToken.revealSourceNotConfigured', 'Not configured');
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

  if (loading) {
    return (
      <div
        className="flex w-full min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500 dark:border-white/10 dark:bg-[#1c1c1c] dark:text-slate-400"
        role="status"
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        {t('admin.commerce.payments.cashierToken.loading', 'Loading key epoch...')}
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={SECTION_CLASS}>
        <FormError message={loadError} />
        <button
          className={`mt-3 ${SECONDARY_BUTTON_CLASS}`}
          onClick={() => void load()}
          type="button"
        >
          <RefreshCw className="h-4 w-4" />
          {t('admin.commerce.payments.cashierToken.retry', 'Retry')}
        </button>
      </div>
    );
  }

  if (!setting) {
    return null;
  }

  const keyConfigured = setting.signingKeyConfigured;

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      {notice ? <p className="px-1 text-xs text-emerald-600 dark:text-emerald-400" role="status">{notice}</p> : null}
      {actionError ? <p className="px-1 text-xs text-red-600 dark:text-red-400" role="alert">{actionError}</p> : null}
      <section aria-labelledby="cashier-token-overview-title" className={SECTION_CLASS}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden="true" />
            <div className="min-w-0">
              <h2
                className="text-sm font-semibold text-slate-900 dark:text-white"
                id="cashier-token-overview-title"
              >
                {t('admin.commerce.payments.cashierToken.overviewTitle', '密钥状态')}
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {t(
                  'admin.commerce.payments.cashierToken.overviewDesc',
                  'The cashier QR carries a short ID only; this key signs the token stored on the server.',
                )}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              className={SECONDARY_BUTTON_CLASS}
              disabled={loading}
              onClick={() => {
                // Drop stale action messages: the refreshed metadata is the new
                // source of truth after another operator changed the key.
                setNotice(null);
                setActionError(null);
                void load();
              }}
              type="button"
            >
              <RefreshCw className="h-4 w-4" />
              {t('admin.commerce.payments.cashierToken.refresh', 'Refresh')}
            </button>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${setting.enabled
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                : 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400'}`}
            >
              {setting.enabled
                ? t('admin.commerce.payments.cashierToken.enabled', 'Enabled')
                : t('admin.commerce.payments.cashierToken.disabled', 'Disabled')}
            </span>
            <button
              className={setting.enabled ? DANGER_BUTTON_CLASS : SECONDARY_BUTTON_CLASS}
              disabled={!canManage || updating || rotating || !setting}
              onClick={toggleEnabled}
              type="button"
            >
              {updating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : setting.enabled ? (
                <PowerOff className="h-4 w-4" />
              ) : (
                <Power className="h-4 w-4" />
              )}
              {setting.enabled
                ? t('admin.commerce.payments.cashierToken.disable', 'Disable anonymous cashier')
                : t('admin.commerce.payments.cashierToken.enable', 'Enable anonymous cashier')}
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className={INFO_CARD_CLASS}>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('admin.commerce.payments.cashierToken.epoch', 'Key epoch')}
            </p>
            <p className="mt-1 font-mono text-lg font-semibold text-slate-900 dark:text-white">
              {setting.keyEpoch}
            </p>
          </div>
          <div className={INFO_CARD_CLASS}>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('admin.commerce.payments.cashierToken.source', 'Effective scope')}
            </p>
            <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
              {sourceLabel(setting.source)}
            </p>
          </div>
          <div className={INFO_CARD_CLASS}>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('admin.commerce.payments.cashierToken.signingKey', 'Signing key')}
            </p>
            <p className={`mt-1 text-sm font-medium ${keyConfigured ? 'text-slate-900 dark:text-white' : 'text-amber-600 dark:text-amber-400'}`}>
              {keyConfigured
                ? t('admin.commerce.payments.cashierToken.signingKeyConfigured', 'Configured (encrypted in the payment database)')
                : t('admin.commerce.payments.cashierToken.signingKeyMissing', 'Not configured yet (generated on first use or rotation)')}
            </p>
          </div>
          <div className={INFO_CARD_CLASS}>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('admin.commerce.payments.cashierToken.keyFingerprint', 'Key fingerprint')}
            </p>
            <p
              className="mt-1 truncate font-mono text-xs font-medium text-slate-900 dark:text-white"
              title={setting.keyFingerprint || undefined}
            >
              {setting.keyFingerprint ? `${setting.keyFingerprint.slice(0, 16)}…` : '—'}
            </p>
          </div>
          <div className={INFO_CARD_CLASS}>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('admin.commerce.payments.cashierToken.keyProvider', 'Key provider')}
            </p>
            <p
              className="mt-1 truncate text-sm font-medium text-slate-900 dark:text-white"
              title={setting.keyProvider || undefined}
            >
              {setting.keyProvider || '—'}
            </p>
          </div>
          <div className={INFO_CARD_CLASS}>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('admin.commerce.payments.cashierToken.rotatedAt', 'Last rotated')}
            </p>
            <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
              {formatTime(setting.rotatedAt)}
            </p>
          </div>
          <div className={INFO_CARD_CLASS}>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('admin.commerce.payments.cashierToken.rotatedBy', 'Rotated by')}
            </p>
            <p
              className="mt-1 truncate text-sm font-medium text-slate-900 dark:text-white"
              title={setting.rotatedBy || undefined}
            >
              {setting.rotatedBy || '—'}
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="cashier-token-key-title" className={SECTION_CLASS}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <KeyRound className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden="true" />
            <div className="min-w-0">
              <h2
                className="text-sm font-semibold text-slate-900 dark:text-white"
                id="cashier-token-key-title"
              >
                {t('admin.commerce.payments.cashierToken.keyManagementTitle', '密钥管理')}
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {t(
                  'admin.commerce.payments.cashierToken.keyManagementHint',
                  'View the stored key, replace it with your own, or generate a fresh one. Saving or rotating advances the epoch immediately.',
                )}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              className={SECONDARY_BUTTON_CLASS}
              disabled={!canManage || revealing || !setting}
              onClick={() => void openReveal()}
              type="button"
            >
              {revealing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
              {t('admin.commerce.payments.cashierToken.reveal', 'View key')}
            </button>
            <button
              className={PRIMARY_BUTTON_CLASS}
              disabled={!canManage || loading || !setting}
              onClick={() => {
                setNotice(null);
                setActionError(null);
                setSetKeyError(null);
                setSetDialogOpen(true);
              }}
              type="button"
            >
              <Pencil className="h-4 w-4" />
              {t('admin.commerce.payments.cashierToken.set', 'Set key manually')}
            </button>
            <button
              className={SECONDARY_BUTTON_CLASS}
              disabled={!canManage || rotating || updating || !setting}
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

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className={INFO_CARD_CLASS}>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('admin.commerce.payments.cashierToken.keyStatus', 'Stored key')}
            </p>
            <p className={`mt-1 text-sm font-medium ${keyConfigured ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
              {keyConfigured
                ? t('admin.commerce.payments.cashierToken.keyStatusConfigured', 'Configured')
                : t('admin.commerce.payments.cashierToken.keyStatusMissing', 'Not configured yet')}
            </p>
          </div>
          <div className={INFO_CARD_CLASS}>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('admin.commerce.payments.cashierToken.keyFormat', 'Accepted format')}
            </p>
            <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
              {t('admin.commerce.payments.cashierToken.keyFormatValue', '32–512 characters: A–Z, a–z, 0–9, - _ + / =')}
            </p>
          </div>
          <div className={INFO_CARD_CLASS}>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('admin.commerce.payments.cashierToken.keyRotationGrace', 'Grace window')}
            </p>
            <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
              {t('admin.commerce.payments.cashierToken.keyRotationGraceValue', 'Previous key accepted for 1 hour')}
            </p>
          </div>
        </div>

      </section>

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

      {disableConfirmOpen ? (
        <PaymentConfirmDialog
          confirmLabel={t('admin.commerce.payments.cashierToken.disable', 'Disable anonymous cashier')}
          description={t(
            'admin.commerce.payments.cashierToken.disableConfirm',
            'Disabling stops new cashier links immediately and existing short links / tokens stop resolving. Enable it again to restore unexpired links.',
          )}
          onClose={() => setDisableConfirmOpen(false)}
          onConfirm={() => void updateEnabled(false)}
          processing={updating}
          title={t('admin.commerce.payments.cashierToken.disableTitle', 'Disable anonymous cashier')}
        />
      ) : null}

      {revealed ? (
        <CashierTokenRevealDialog
          fingerprint={setting.keyFingerprint || undefined}
          onClose={() => setRevealed(null)}
          revealed={revealed}
          sourceLabel={revealSourceLabel(revealed.source)}
        />
      ) : null}

      {setDialogOpen ? (
        <CashierTokenSetDialog
          {...(setting.keyEpoch ? { initialExpectedEpoch: setting.keyEpoch } : {})}
          error={setKeyError}
          onClose={() => setSetDialogOpen(false)}
          onSave={(key) => void saveKey(key)}
          saving={savingKey}
        />
      ) : null}
    </div>
  );
}
