import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Activity,
  CheckCircle2,
  Copy,
  Globe2,
  Loader2,
  Plus,
  Power,
  PowerOff,
  RefreshCw,
  Star,
  Trash2,
} from 'lucide-react';
import {
  copyTextToClipboard,
  resolveProblemMessage,
} from '@sdkwork/cloudroutes-pc-commons';
import {
  hasPortalPermission,
  readPortalPermissionScope,
  subscribePortalSessionChange,
} from '@sdkwork/cloudroutes-pc-commons/runtime';
import type {
  NotifyDomain,
  PaymentDomainSetting,
} from '@sdkwork/cloudrouter-pc-admin-core/sdk';
import {
  backendPaymentDomainSettingRetrieve,
  backendPaymentDomainSettingUpdate,
  backendPaymentNotifyDomainCreate,
  backendPaymentNotifyDomainDelete,
  backendPaymentNotifyDomainsList,
  backendPaymentNotifyDomainUpdate,
} from '../paymentsService';
import {
  FormError,
  PaymentConfirmDialog,
  SelectField,
  TextField,
} from '../forms/PaymentMaintenanceDialogs';

type Protocol = 'https' | 'http';
type SettingStatus = 'active' | 'inactive';

interface H5DomainForm {
  protocol: Protocol;
  hostname: string;
  port: string;
  status: SettingStatus;
}

interface CallbackDomainForm {
  protocol: Protocol;
  hostname: string;
  port: string;
  isDefault: boolean;
}

const EMPTY_H5_FORM: H5DomainForm = {
  protocol: 'https',
  hostname: '',
  port: '',
  status: 'active',
};

const EMPTY_CALLBACK_FORM: CallbackDomainForm = {
  protocol: 'https',
  hostname: '',
  port: '',
  isDefault: true,
};

function asProtocol(value: unknown): Protocol {
  return value === 'http' ? 'http' : 'https';
}

function asStatus(value: unknown): SettingStatus {
  return value === 'inactive' ? 'inactive' : 'active';
}

function readOptionalPort(value: unknown): string {
  return typeof value === 'number' && Number.isFinite(value) ? String(value) : '';
}

function h5FormFromSetting(setting: PaymentDomainSetting | null): H5DomainForm {
  if (!setting || !setting.configured) {
    return { ...EMPTY_H5_FORM };
  }
  return {
    protocol: asProtocol(setting.h5Protocol),
    hostname: setting.h5Hostname ?? '',
    port: readOptionalPort(setting.h5Port),
    status: asStatus(setting.h5Status),
  };
}

/** Parses an optional port field; `undefined` means "invalid". */
function parseOptionalPort(raw: string): number | null | undefined {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  if (!/^[0-9]+$/.test(trimmed)) {
    return undefined;
  }
  const port = Number(trimmed);
  return Number.isInteger(port) && port >= 1 && port <= 65535 ? port : undefined;
}

/** Hostname[:port] of the browser origin, for one-click quick configuration. */
function currentBrowserHost(): { hostname: string; port: string; protocol: Protocol } | null {
  if (typeof window === 'undefined' || !window.location) {
    return null;
  }
  const { hostname, port, protocol } = window.location;
  if (!hostname) {
    return null;
  }
  return {
    hostname,
    port: port && port !== '80' && port !== '443' ? port : '',
    protocol: protocol === 'http:' ? 'http' : 'https',
  };
}

function notifyDomainLabel(domain: NotifyDomain): string {
  return domain.port ? `${domain.hostname}:${domain.port}` : domain.hostname;
}

function buildBaseUrl(protocol: Protocol, hostname: string, port: number | null): string {
  if (!hostname) {
    return '';
  }
  return port ? `${protocol}://${hostname}:${port}` : `${protocol}://${hostname}`;
}

function CopyableValue({ label, value }: { label: string; value: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
          {value || '-'}
        </code>
        <button
          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
          disabled={!value}
          onClick={() => {
            void copyTextToClipboard(value).then((result) => {
              if (result.ok) {
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1500);
              }
            });
          }}
          type="button"
        >
          <Copy className="h-3 w-3" />
          {copied ? t('admin.commerce.payments.domainSettings.copied', 'Copied') : t('admin.commerce.payments.domainSettings.copy', 'Copy')}
        </button>
      </div>
    </div>
  );
}

/**
 * Payment center → 支付设置 → 域名设置.
 *
 * Owns two operator settings that drive generated payment QR codes:
 * 1. the H5 payment domain (`commerce_payment_domain_setting`), used to build
 *    the order cashier deep-link / QR payload and the default H5 return URL;
 * 2. the callback (notify) domains (`commerce_payment_notify_domain`), used to
 *    build the PSP payment/refund webhook URLs, with a quick-add form.
 */
export function PaymentDomainSettingsAdmin() {
  const { t } = useTranslation();
  const [permissionScope, setPermissionScope] = useState(() => readPortalPermissionScope());
  const canUpdate = useMemo(
    () => hasPortalPermission('commerce.payments.domain_settings.update', permissionScope),
    [permissionScope],
  );

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [setting, setSetting] = useState<PaymentDomainSetting | null>(null);
  const [h5Form, setH5Form] = useState<H5DomainForm>(EMPTY_H5_FORM);
  const [h5Saving, setH5Saving] = useState(false);
  const [h5Error, setH5Error] = useState<string | null>(null);

  const [notifyDomains, setNotifyDomains] = useState<NotifyDomain[]>([]);
  const [callbackForm, setCallbackForm] = useState<CallbackDomainForm>(EMPTY_CALLBACK_FORM);
  const [callbackSaving, setCallbackSaving] = useState(false);
  const [callbackError, setCallbackError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<NotifyDomain | null>(null);

  useEffect(() => {
    const sync = () => setPermissionScope(readPortalPermissionScope());
    sync();
    return subscribePortalSessionChange(sync);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [nextSetting, page] = await Promise.all([
        backendPaymentDomainSettingRetrieve(),
        backendPaymentNotifyDomainsList(),
      ]);
      setSetting(nextSetting);
      setH5Form(h5FormFromSetting(nextSetting));
      setNotifyDomains(page.items);
    } catch (error) {
      setLoadError(resolveProblemMessage(
        error,
        t,
        t('admin.commerce.payments.domainSettings.loadError', 'Domain settings could not be loaded.'),
      ));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateH5 = (patch: Partial<H5DomainForm>) =>
    setH5Form((current) => ({ ...current, ...patch }));

  const updateCallback = (patch: Partial<CallbackDomainForm>) =>
    setCallbackForm((current) => ({ ...current, ...patch }));

  const fillFromCurrentHost = () => {
    const current = currentBrowserHost();
    if (!current) {
      return;
    }
    updateH5({ protocol: current.protocol, hostname: current.hostname, port: current.port });
  };

  const fillCallbackFromCurrentHost = () => {
    const current = currentBrowserHost();
    if (!current) {
      return;
    }
    updateCallback({ protocol: current.protocol, hostname: current.hostname, port: current.port });
  };

  const submitH5 = async () => {
    setH5Error(null);
    const hostname = h5Form.hostname.trim();
    if (!hostname) {
      setH5Error(t('admin.commerce.payments.domainSettings.h5.hostnameRequired', 'Enter the H5 domain hostname (without scheme or path).'));
      return;
    }
    const port = parseOptionalPort(h5Form.port);
    if (port === undefined) {
      setH5Error(t('admin.commerce.payments.domainSettings.portInvalid', 'Port must be an integer between 1 and 65535.'));
      return;
    }
    setH5Saving(true);
    try {
      const saved = await backendPaymentDomainSettingUpdate({
        h5Protocol: h5Form.protocol,
        h5Hostname: hostname,
        h5Port: port,
        h5Status: h5Form.status,
      });
      setSetting(saved);
      setH5Form(h5FormFromSetting(saved));
      setMessage({
        kind: 'success',
        text: t('admin.commerce.payments.domainSettings.h5.saved', 'H5 payment domain saved. New QR codes use it immediately.'),
      });
    } catch (error) {
      setMessage({
        kind: 'error',
        text: resolveProblemMessage(
          error,
          t,
          t('admin.commerce.payments.domainSettings.h5.saveError', 'H5 payment domain could not be saved.'),
        ),
      });
    } finally {
      setH5Saving(false);
    }
  };

  const submitCallback = async () => {
    setCallbackError(null);
    const hostname = callbackForm.hostname.trim();
    if (!hostname) {
      setCallbackError(t('admin.commerce.payments.domainSettings.h5.hostnameRequired', 'Enter the H5 domain hostname (without scheme or path).'));
      return;
    }
    const port = parseOptionalPort(callbackForm.port);
    if (port === undefined) {
      setCallbackError(t('admin.commerce.payments.domainSettings.portInvalid', 'Port must be an integer between 1 and 65535.'));
      return;
    }
    setCallbackSaving(true);
    try {
      const created = await backendPaymentNotifyDomainCreate({
        protocol: callbackForm.protocol,
        hostname,
        port,
        isDefault: callbackForm.isDefault,
        status: 'active',
      });
      setNotifyDomains((current) => {
        const rest = callbackForm.isDefault
          ? current.map((domain) => ({ ...domain, isDefault: false }))
          : current;
        return [...rest, created];
      });
      setCallbackForm({ ...EMPTY_CALLBACK_FORM, protocol: callbackForm.protocol });
      setMessage({
        kind: 'success',
        text: t('admin.commerce.payments.domainSettings.callback.added', 'Callback domain added.'),
      });
    } catch (error) {
      setMessage({
        kind: 'error',
        text: resolveProblemMessage(
          error,
          t,
          t('admin.commerce.payments.domainSettings.callback.addError', 'Callback domain could not be added.'),
        ),
      });
    } finally {
      setCallbackSaving(false);
    }
  };

  const patchNotifyDomain = async (domain: NotifyDomain, patch: { isDefault?: boolean; status?: SettingStatus }) => {
    try {
      const updated = await backendPaymentNotifyDomainUpdate(domain.id, patch);
      setNotifyDomains((current) => current.map((item) => {
        if (item.id === updated.id) {
          return updated;
        }
        return patch.isDefault ? { ...item, isDefault: false } : item;
      }));
      setMessage({
        kind: 'success',
        text: t('admin.commerce.payments.domainSettings.callback.updated', 'Callback domain updated.'),
      });
    } catch (error) {
      setMessage({
        kind: 'error',
        text: resolveProblemMessage(
          error,
          t,
          t('admin.commerce.payments.domainSettings.callback.updateError', 'Callback domain could not be updated.'),
        ),
      });
    }
  };

  const deleteNotifyDomain = async (domain: NotifyDomain) => {
    try {
      await backendPaymentNotifyDomainDelete(domain.id);
      setNotifyDomains((current) => current.filter((item) => item.id !== domain.id));
      setMessage({
        kind: 'success',
        text: t('admin.commerce.payments.domainSettings.callback.deleted', 'Callback domain deleted.'),
      });
    } catch (error) {
      setMessage({
        kind: 'error',
        text: resolveProblemMessage(
          error,
          t,
          t('admin.commerce.payments.domainSettings.callback.deleteError', 'Callback domain could not be deleted.'),
        ),
      });
    } finally {
      setPendingDelete(null);
    }
  };

  const parsedH5Port = parseOptionalPort(h5Form.port);
  const h5BaseUrl = parsedH5Port === undefined
    ? ''
    : buildBaseUrl(h5Form.protocol, h5Form.hostname.trim(), parsedH5Port);
  const savedBaseUrl = setting?.configured ? setting.h5BaseUrl : '';

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400" data-admin-payment-domain-settings>
        <Loader2 className="h-4 w-4 animate-spin" />
        {t('admin.commerce.payments.domainSettings.loading', 'Loading domain settings...')}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4 overflow-auto p-1" data-admin-payment-domain-settings>
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Globe2 className="h-5 w-5 text-lobster-500" />
          <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
            {t('admin.commerce.payments.domainSettings.title', 'Domain Settings')}
          </h1>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t('admin.commerce.payments.domainSettings.desc', 'Configure the H5 payment domain used to build cashier links / QR codes and the callback (notify) domains PSPs call back on.')}
        </p>
      </header>

      {message ? (
        <div
          className={message.kind === 'success'
            ? 'flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200'
            : 'flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200'}
          role="status"
        >
          {message.kind === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <Activity className="h-4 w-4" />}
          <span>{message.text}</span>
        </div>
      ) : null}

      {loadError ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200" role="alert">
          <span>{loadError}</span>
          <button className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-xs hover:bg-red-100 dark:border-red-500/30 dark:hover:bg-red-500/20" onClick={() => void load()} type="button">
            <RefreshCw className="h-3 w-3" />
            {t('admin.commerce.payments.domainSettings.retry', 'Retry')}
          </button>
        </div>
      ) : null}

      {!canUpdate ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200" role="status">
          {t('admin.commerce.payments.domainSettings.readOnly', 'You do not have permission to change payment domain settings.')}
        </div>
      ) : null}

      <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#1c1c1c]" aria-labelledby="payment-h5-domain-title">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white" id="payment-h5-domain-title">
            {t('admin.commerce.payments.domainSettings.h5.title', 'H5 payment domain')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('admin.commerce.payments.domainSettings.h5.desc', 'Origin used to build the order cashier deep-link and the QR code payload. When empty, the deployment default (SDKWORK_COMMERCE_CASHIER_BASE_URL) is used.')}
          </p>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <SelectField
            disabled={!canUpdate}
            label={t('admin.commerce.payments.domainSettings.protocol', 'Protocol')}
            onChange={(value) => updateH5({ protocol: asProtocol(value) })}
            options={[
              { label: 'https', value: 'https' },
              { label: 'http', value: 'http' },
            ]}
            value={h5Form.protocol}
          />
          <TextField
            disabled={!canUpdate}
            label={t('admin.commerce.payments.domainSettings.hostname', 'Domain')}
            onChange={(value) => updateH5({ hostname: value })}
            placeholder={t('admin.commerce.payments.domainSettings.hostnamePlaceholder', 'h5.example.com')}
            value={h5Form.hostname}
          />
          <TextField
            disabled={!canUpdate}
            label={t('admin.commerce.payments.domainSettings.port', 'Port (optional)')}
            onChange={(value) => updateH5({ port: value })}
            placeholder={t('admin.commerce.payments.domainSettings.portPlaceholder', '443')}
            value={h5Form.port}
          />
          <SelectField
            disabled={!canUpdate}
            label={t('admin.commerce.payments.domainSettings.status', 'Status')}
            onChange={(value) => updateH5({ status: asStatus(value) })}
            options={[
              { label: t('admin.commerce.payments.domainSettings.status.active', 'Active'), value: 'active' },
              { label: t('admin.commerce.payments.domainSettings.status.inactive', 'Inactive'), value: 'inactive' },
            ]}
            value={h5Form.status}
          />
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <CopyableValue
            label={t('admin.commerce.payments.domainSettings.h5.baseUrl', 'Cashier base URL')}
            value={h5BaseUrl || savedBaseUrl}
          />
          <CopyableValue
            label={t('admin.commerce.payments.domainSettings.h5.template', 'Cashier link template')}
            value={setting?.configured ? setting.cashierUrlTemplate : ''}
          />
        </div>
        {!setting?.configured ? (
          <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
            {t('admin.commerce.payments.domainSettings.h5.notConfigured', 'Not configured — checkout uses the deployment default origin.')}
          </p>
        ) : null}
        {h5Error ? <div className="mt-3"><FormError message={h5Error} /></div> : null}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            className="inline-flex items-center gap-1.5 rounded-md bg-lobster-500 px-3 py-2 text-sm font-medium text-white hover:bg-lobster-600 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!canUpdate || h5Saving}
            onClick={() => void submitH5()}
            type="button"
          >
            {h5Saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {t('admin.commerce.payments.domainSettings.h5.save', 'Save domain settings')}
          </button>
          <button
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
            onClick={fillFromCurrentHost}
            type="button"
          >
            <Globe2 className="h-4 w-4" />
            {t('admin.commerce.payments.domainSettings.useCurrentHost', 'Use current host')}
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#1c1c1c]" aria-labelledby="payment-callback-domain-title">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white" id="payment-callback-domain-title">
            {t('admin.commerce.payments.domainSettings.callback.title', 'Callback domain')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('admin.commerce.payments.domainSettings.callback.desc', 'Domains used to build the PSP payment/refund webhook URLs. Exactly one active domain is the default; it wins over the deployment webhook base.')}
          </p>
        </div>

        {notifyDomains.length === 0 ? (
          <p className="mt-4 rounded-md border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500 dark:border-white/15 dark:text-slate-400">
            {t('admin.commerce.payments.domainSettings.callback.empty', 'No callback domain configured yet. Add one so PSPs can reach the order gateway.')}
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-2">
            {notifyDomains.map((domain) => (
              <li
                className="flex flex-col gap-2 rounded-lg border border-slate-200 px-3 py-2.5 md:flex-row md:items-center md:justify-between dark:border-white/10"
                key={domain.id}
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="text-sm font-medium text-slate-900 dark:text-white">{notifyDomainLabel(domain)}</code>
                    {domain.isDefault ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-lobster-50 px-2 py-0.5 text-xs text-lobster-600 dark:bg-lobster-500/15 dark:text-lobster-300">
                        <Star className="h-3 w-3" />
                        {t('admin.commerce.payments.domainSettings.callback.default', 'Default')}
                      </span>
                    ) : null}
                    <span className={domain.status === 'active'
                      ? 'rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                      : 'rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-white/10 dark:text-slate-300'}
                    >
                      {domain.status === 'active'
                        ? t('admin.commerce.payments.domainSettings.status.active', 'Active')
                        : t('admin.commerce.payments.domainSettings.status.inactive', 'Inactive')}
                    </span>
                  </div>
                  <CopyableValue label={t('admin.commerce.payments.domainSettings.callback.paymentUrl', 'Payment webhook URL')} value={domain.paymentNotifyUrl} />
                  <CopyableValue label={t('admin.commerce.payments.domainSettings.callback.refundUrl', 'Refund webhook URL')} value={domain.refundNotifyUrl} />
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {!domain.isDefault && domain.status === 'active' ? (
                    <button
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
                      disabled={!canUpdate}
                      onClick={() => void patchNotifyDomain(domain, { isDefault: true })}
                      type="button"
                    >
                      <Star className="h-3 w-3" />
                      {t('admin.commerce.payments.domainSettings.callback.setDefault', 'Set default')}
                    </button>
                  ) : null}
                  {domain.status === 'active' ? (
                    <button
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
                      disabled={!canUpdate}
                      onClick={() => void patchNotifyDomain(domain, { status: 'inactive' })}
                      type="button"
                    >
                      <PowerOff className="h-3 w-3" />
                      {t('admin.commerce.payments.domainSettings.callback.disable', 'Disable')}
                    </button>
                  ) : (
                    <button
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
                      disabled={!canUpdate}
                      onClick={() => void patchNotifyDomain(domain, { status: 'active' })}
                      type="button"
                    >
                      <Power className="h-3 w-3" />
                      {t('admin.commerce.payments.domainSettings.callback.enable', 'Enable')}
                    </button>
                  )}
                  <button
                    className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-500/30 dark:text-red-300 dark:hover:bg-red-500/10"
                    disabled={!canUpdate}
                    onClick={() => setPendingDelete(domain)}
                    type="button"
                  >
                    <Trash2 className="h-3 w-3" />
                    {t('admin.commerce.payments.domainSettings.callback.delete', 'Delete')}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-5 rounded-lg border border-slate-200 p-3 dark:border-white/10">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {t('admin.commerce.payments.domainSettings.callback.addTitle', 'Quick add callback domain')}
          </h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <SelectField
              disabled={!canUpdate}
              label={t('admin.commerce.payments.domainSettings.protocol', 'Protocol')}
              onChange={(value) => updateCallback({ protocol: asProtocol(value) })}
              options={[
                { label: 'https', value: 'https' },
                { label: 'http', value: 'http' },
              ]}
              value={callbackForm.protocol}
            />
            <TextField
              disabled={!canUpdate}
              label={t('admin.commerce.payments.domainSettings.hostname', 'Domain')}
              onChange={(value) => updateCallback({ hostname: value })}
              placeholder={t('admin.commerce.payments.domainSettings.hostnamePlaceholder', 'h5.example.com')}
              value={callbackForm.hostname}
            />
            <TextField
              disabled={!canUpdate}
              label={t('admin.commerce.payments.domainSettings.port', 'Port (optional)')}
              onChange={(value) => updateCallback({ port: value })}
              placeholder={t('admin.commerce.payments.domainSettings.portPlaceholder', '443')}
              value={callbackForm.port}
            />
            <label className="flex items-end gap-2 pb-2 text-sm text-slate-700 dark:text-slate-200">
              <input
                checked={callbackForm.isDefault}
                className="h-4 w-4 rounded border-slate-300"
                disabled={!canUpdate}
                onChange={(event) => updateCallback({ isDefault: event.target.checked })}
                type="checkbox"
              />
              {t('admin.commerce.payments.domainSettings.callback.isDefault', 'Set as default')}
            </label>
          </div>
          {callbackError ? <div className="mt-3"><FormError message={callbackError} /></div> : null}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              className="inline-flex items-center gap-1.5 rounded-md bg-lobster-500 px-3 py-2 text-sm font-medium text-white hover:bg-lobster-600 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!canUpdate || callbackSaving}
              onClick={() => void submitCallback()}
              type="button"
            >
              {callbackSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {t('admin.commerce.payments.domainSettings.callback.add', 'Add callback domain')}
            </button>
            <button
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
              onClick={fillCallbackFromCurrentHost}
              type="button"
            >
              <Globe2 className="h-4 w-4" />
              {t('admin.commerce.payments.domainSettings.useCurrentHost', 'Use current host')}
            </button>
          </div>
        </div>
      </section>

      {pendingDelete ? (
        <PaymentConfirmDialog
          confirmLabel={t('admin.commerce.payments.domainSettings.callback.delete', 'Delete')}
          description={t(
            'admin.commerce.payments.domainSettings.callback.deleteConfirm',
            'Delete callback domain {{hostname}}?',
            { hostname: notifyDomainLabel(pendingDelete) },
          )}
          onClose={() => setPendingDelete(null)}
          onConfirm={() => void deleteNotifyDomain(pendingDelete)}
          processing={false}
          title={t('admin.commerce.payments.domainSettings.callback.delete', 'Delete')}
        />
      ) : null}
    </div>
  );
}
