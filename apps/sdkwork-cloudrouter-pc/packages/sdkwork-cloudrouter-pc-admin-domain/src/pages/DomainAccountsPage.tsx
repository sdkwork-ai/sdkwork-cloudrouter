import { useMemo, useState } from 'react';
import { KeyRound, Plus, RefreshCw, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { AdminTableShell, resolveProblemMessage } from '@sdkwork/cloudroutes-pc-commons';

import {
  DomainCheckbox,
  DomainField,
  DomainFormDialog,
  DomainInlineNotice,
  DomainPrimaryButton,
  DomainSecondaryButton,
  DomainSectionIntro,
  DomainSelect,
  DomainStateRows,
  DomainStatusPill,
  DomainTableHead,
  DomainTextInput,
} from '../components/domainUi';
import { domainCenterService } from '../domainService';
import {
  cloudAccountScopeLabel,
  cloudAccountStatusLabel,
  cloudAccountStatusTone,
  dnsProviderLabelOf,
  translateDomainLabel,
} from '../domainLabels';
import { useDomainCloudAccounts, usableDnsAccounts } from '../hooks/useDomainResources';
import {
  toCreateCloudAccountInput,
  validateCloudAccountForm,
  type DomainCloudAccountForm,
  type DomainFieldErrors,
} from '../domainValidation';
const EMPTY_ACCOUNT_FORM: DomainCloudAccountForm = {
  displayName: '',
  accountCode: '',
  dnsProvider: 'ALIYUN_DNS',
  scopeType: 'tenant',
  environment: 'production',
  isDefault: false,
  accessKeyId: '',
  secretAccessKey: '',
  confirmsCredential: false,
};

export function DomainAccountsPage() {
  const { t } = useTranslation();
  const accounts = useDomainCloudAccounts();
  const [search, setSearch] = useState('');
  const [providerFilter, setProviderFilter] = useState<'ALL' | 'ALIYUN_DNS' | 'DNSPOD' | 'CLOUDFLARE'>('ALL');
  const [createOpen, setCreateOpen] = useState(false);

  const rows = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return accounts.data.filter((account) => {
      if (providerFilter !== 'ALL' && account.dnsProvider !== providerFilter) {
        return false;
      }
      if (keyword.length === 0) {
        return true;
      }
      return (
        account.displayName.toLowerCase().includes(keyword)
        || account.accountCode.toLowerCase().includes(keyword)
        || account.vendorCode.toLowerCase().includes(keyword)
      );
    });
  }, [accounts.data, search, providerFilter]);

  const usable = usableDnsAccounts(accounts.data).length;

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4 overflow-hidden">
      <DomainSectionIntro
        title={t('admin.domainCenter.accounts.title', 'DNS automation accounts')}
        description={t(
          'admin.domainCenter.accounts.description',
          'A DNS-capable cloud account is the credential the control plane uses to publish ownership TXT records, present DNS-01 challenges, and sync or edit resolution records. Credentials are held and rotated by the platform account center; this surface only records that one exists.',
        )}
        actions={
          <>
            <DomainSecondaryButton onClick={accounts.reload} disabled={accounts.status === 'loading'}>
              <RefreshCw className={`h-4 w-4 ${accounts.status === 'loading' ? 'animate-spin' : ''}`} />
              {t('admin.domainCenter.actions.refresh', 'Refresh')}
            </DomainSecondaryButton>
            <DomainPrimaryButton onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              {t('admin.domainCenter.accounts.actions.create', 'Add DNS account')}
            </DomainPrimaryButton>
          </>
        }
      />

      <div className="grid shrink-0 grid-cols-2 gap-3 lg:grid-cols-4">
        <AccountMetric
          label={t('admin.domainCenter.accounts.metrics.total', 'Accounts')}
          value={accounts.data.length}
        />
        <AccountMetric
          label={t('admin.domainCenter.accounts.metrics.usable', 'Usable for automation')}
          value={usable}
          tone="text-emerald-600 dark:text-emerald-300"
        />
        <AccountMetric
          label={t('admin.domainCenter.accounts.metrics.missingCredential', 'Missing credential')}
          value={accounts.data.filter((account) => !account.credentialConfigured).length}
          tone="text-amber-600 dark:text-amber-300"
        />
        <AccountMetric
          label={t('admin.domainCenter.accounts.metrics.unsupported', 'No supported family')}
          value={accounts.data.filter((account) => !account.dnsProvider).length}
        />
      </div>

      <AdminTableShell
        className="min-h-0 flex-1 rounded-xl dark:bg-[#1a1a1a]"
        header={
          <div className="flex flex-col gap-3 border-b border-slate-200 p-3 dark:border-white/10 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 flex-1 flex-col gap-2 md:flex-row md:items-center">
              <div className="relative min-w-0 flex-1 md:max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t('admin.domainCenter.accounts.search', 'Search account, code, or vendor')}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-800 outline-none transition focus:border-lobster-500 focus:ring-2 focus:ring-lobster-500/15 dark:border-white/10 dark:bg-[#121212] dark:text-white"
                />
              </div>
              <DomainSelect
                value={providerFilter}
                onChange={setProviderFilter}
                options={[
                  { value: 'ALL', label: t('admin.domainCenter.accounts.filter.allProviders', 'All providers') },
                  { value: 'ALIYUN_DNS', label: 'Aliyun DNS' },
                  { value: 'DNSPOD', label: 'DNSPod' },
                  { value: 'CLOUDFLARE', label: 'Cloudflare' },
                ]}
              />
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              {t('admin.domainCenter.accounts.count', '{{count}} accounts', { count: rows.length })}
            </div>
          </div>
        }
      >
        <table className="w-full min-w-[1040px] whitespace-nowrap text-left text-sm">
          <DomainTableHead
            columns={[
              t('admin.domainCenter.columns.account', 'Account'),
              t('admin.domainCenter.columns.vendor', 'Vendor'),
              t('admin.domainCenter.columns.dnsProvider', 'DNS provider'),
              t('admin.domainCenter.columns.scope', 'Scope'),
              t('admin.domainCenter.columns.environment', 'Environment'),
              t('admin.domainCenter.columns.credential', 'Credential'),
              t('admin.domainCenter.columns.default', 'Default'),
            ]}
          />
          <tbody className="divide-y divide-slate-100 text-xs text-slate-700 dark:divide-white/5 dark:text-slate-300">
            {accounts.status === 'loading' || accounts.status === 'idle' ? (
              <DomainStateRows colSpan={7} kind="loading" title={t('admin.domainCenter.accounts.loading', 'Loading accounts...')} />
            ) : accounts.status === 'error' ? (
              <DomainStateRows
                colSpan={7}
                kind="error"
                title={t('admin.domainCenter.accounts.loadError', 'Accounts could not be loaded')}
                description={resolveProblemMessage(accounts.error, t, t('admin.domainCenter.errors.load', 'Request failed'))}
                onRetry={accounts.reload}
                retryLabel={t('common.actions.retry', 'Retry')}
              />
            ) : rows.length === 0 ? (
              <DomainStateRows
                colSpan={7}
                kind="empty"
                title={t('admin.domainCenter.accounts.empty', 'No DNS automation account')}
                description={t(
                  'admin.domainCenter.accounts.emptyDesc',
                  'Add an Aliyun DNS, DNSPod, or Cloudflare account so certificates can validate through DNS-01 and zones can sync resolution records.',
                )}
                action={{
                  label: t('admin.domainCenter.accounts.actions.create', 'Add DNS account'),
                  onClick: () => setCreateOpen(true),
                }}
              />
            ) : (
              rows.map((account) => (
                <tr key={account.id} className="transition hover:bg-slate-50 dark:hover:bg-white/5">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <KeyRound className="h-4 w-4 shrink-0 text-lobster-500" />
                      <div className="min-w-0">
                        <div className="text-[12px] font-semibold text-slate-900 dark:text-white">
                          {account.displayName}
                        </div>
                        <div className="mt-0.5 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                          {account.accountCode}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">{account.vendorCode}</td>
                  <td className="px-4 py-3">
                    {translateDomainLabel(t, dnsProviderLabelOf(account.dnsProvider))}
                  </td>
                  <td className="px-4 py-3">
                    <DomainStatusPill
                      label={translateDomainLabel(t, cloudAccountScopeLabel(account.scopeType))}
                      tone={account.tenantGlobal ? 'info' : 'neutral'}
                    />
                  </td>
                  <td className="px-4 py-3">{account.environment ?? '—'}</td>
                  <td className="px-4 py-3">
                    <DomainStatusPill
                      label={
                        account.credentialConfigured
                          ? t('admin.domainCenter.accounts.credentialConfigured', 'Configured')
                          : t('admin.domainCenter.accounts.credentialMissing', 'Missing')
                      }
                      tone={account.credentialConfigured ? 'success' : 'danger'}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <DomainStatusPill
                      label={translateDomainLabel(t, cloudAccountStatusLabel(account))}
                      tone={cloudAccountStatusTone(account)}
                      title={account.isDefault ? t('admin.domainCenter.accounts.isDefault', 'Default for its vendor') : undefined}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </AdminTableShell>

      <DomainInlineNotice
        tone="info"
        title={t('admin.domainCenter.accounts.custodyTitle', 'Credentials never leave the account center')}
        description={t(
          'admin.domainCenter.accounts.custodyDesc',
          'The secret half of an account is written once and never returned. This page shows whether a credential exists, not its value.',
        )}
      />

      {createOpen ? (
        <CloudAccountDialog
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false);
            accounts.reload();
          }}
        />
      ) : null}
    </div>
  );
}

function AccountMetric({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-white/10 dark:bg-[#1a1a1a]">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${tone ?? 'text-slate-800 dark:text-slate-100'}`}>
        {value}
      </div>
    </div>
  );
}

function CloudAccountDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState<DomainCloudAccountForm>(EMPTY_ACCOUNT_FORM);
  const [errors, setErrors] = useState<DomainFieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const needsAccessKeyId = form.dnsProvider === 'ALIYUN_DNS' || form.dnsProvider === 'DNSPOD';

  const submit = async () => {
    const nextErrors = validateCloudAccountForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }
    setBusy(true);
    setSubmitError(null);
    setNotice(null);
    try {
      const registration = await domainCenterService.createCloudAccount(toCreateCloudAccountInput(form));
      if (registration.reused) {
        setNotice(
          t(
            'admin.domainCenter.accounts.created.reused',
            'An equivalent account already existed and was reused; its credential was left untouched.',
          ),
        );
      } else {
        setNotice(
          registration.credentialApplied
            ? t('admin.domainCenter.accounts.created.applied', 'Account created and credential stored.')
            : t('admin.domainCenter.accounts.created.created', 'Account created without a new credential.'),
        );
        onCreated();
      }
    } catch (cause) {
      setSubmitError(
        resolveProblemMessage(cause, t, t('admin.domainCenter.accounts.errors.create', 'DNS account could not be created')),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <DomainFormDialog
      wide
      busy={busy}
      onClose={onClose}
      title={t('admin.domainCenter.accounts.dialog.createTitle', 'Add DNS automation account')}
      description={t(
        'admin.domainCenter.accounts.dialog.description',
        'Pick the DNS family first: the credential fields are the vendor\'s own. Aliyun and DNSPod authenticate with a key pair; Cloudflare uses a bearer token. The secret is sent once and stored sealed.',
      )}
      footer={
        <>
          <DomainSecondaryButton onClick={onClose} disabled={busy}>
            {t('common.actions.cancel', 'Cancel')}
          </DomainSecondaryButton>
          <DomainPrimaryButton onClick={() => void submit()} disabled={busy}>
            {busy ? t('common.actions.saving', 'Saving...') : t('common.actions.create', 'Create')}
          </DomainPrimaryButton>
        </>
      }
    >
      {submitError ? <DomainInlineNotice tone="danger" title={submitError} /> : null}
      {notice ? <DomainInlineNotice tone="success" title={notice} /> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <DomainField
          required
          label={t('admin.domainCenter.accounts.fields.displayName', 'Display name')}
          error={errors.displayName ? t(errors.displayName, 'Invalid display name') : undefined}
        >
          <DomainTextInput
            autoFocus
            disabled={busy}
            value={form.displayName}
            onChange={(value) => setForm((current) => ({ ...current, displayName: value }))}
            placeholder={t('admin.domainCenter.accounts.fields.displayNamePlaceholder', 'Aliyun main')}
          />
        </DomainField>
        <DomainField
          label={t('admin.domainCenter.accounts.fields.accountCode', 'Account code')}
          hint={t('admin.domainCenter.accounts.fields.accountCodeHint', 'Optional stable code, e.g. aliyun-main')}
          error={errors.accountCode ? t(errors.accountCode, 'Invalid account code') : undefined}
        >
          <DomainTextInput
            mono
            disabled={busy}
            value={form.accountCode}
            onChange={(value) => setForm((current) => ({ ...current, accountCode: value }))}
            placeholder="aliyun-main"
          />
        </DomainField>
        <DomainField required label={t('admin.domainCenter.accounts.fields.dnsProvider', 'DNS provider')}>
          <DomainSelect
            value={form.dnsProvider}
            onChange={(value) => setForm((current) => ({ ...current, dnsProvider: value }))}
            options={[
              { value: 'ALIYUN_DNS', label: 'Aliyun DNS' },
              { value: 'DNSPOD', label: 'DNSPod' },
              { value: 'CLOUDFLARE', label: 'Cloudflare' },
            ]}
          />
        </DomainField>
        <DomainField label={t('admin.domainCenter.accounts.fields.scope', 'Scope')}>
          <DomainSelect
            value={form.scopeType}
            onChange={(value) => setForm((current) => ({ ...current, scopeType: value }))}
            options={[
              { value: 'tenant', label: t('admin.domainCenter.status.tenantScope', 'Tenant') },
              { value: 'platform', label: t('admin.domainCenter.status.platformScope', 'Platform') },
              { value: 'user', label: t('admin.domainCenter.status.userScope', 'Mine only') },
            ]}
          />
        </DomainField>
        <DomainField label={t('admin.domainCenter.accounts.fields.environment', 'Environment')}>
          <DomainSelect
            value={form.environment}
            onChange={(value) => setForm((current) => ({ ...current, environment: value }))}
            options={[
              { value: 'production', label: 'Production' },
              { value: 'sandbox', label: 'Sandbox' },
              { value: 'development', label: 'Development' },
            ]}
          />
        </DomainField>
        <DomainField
          required={needsAccessKeyId}
          label={t('admin.domainCenter.accounts.fields.accessKeyId', 'Access key id / login id')}
          hint={needsAccessKeyId
            ? t('admin.domainCenter.accounts.fields.accessKeyIdHint', 'Aliyun AccessKeyId or DNSPod LoginId')
            : t('admin.domainCenter.accounts.fields.accessKeyIdNa', 'Not used by Cloudflare (bearer token)')}
          error={errors.accessKeyId ? t(errors.accessKeyId, 'Access key id is required') : undefined}
        >
          <DomainTextInput
            mono
            disabled={busy || !needsAccessKeyId}
            value={form.accessKeyId}
            onChange={(value) => setForm((current) => ({ ...current, accessKeyId: value }))}
          />
        </DomainField>
        <DomainField
          required
          label={t('admin.domainCenter.accounts.fields.secretAccessKey', 'Secret access key / API token')}
          hint={t('admin.domainCenter.accounts.fields.secretHint', 'Write-only. Never returned after submission.')}
          error={errors.secretAccessKey ? t(errors.secretAccessKey, 'Secret is required') : undefined}
        >
          <DomainTextInput
            type="password"
            mono
            disabled={busy}
            value={form.secretAccessKey}
            onChange={(value) => setForm((current) => ({ ...current, secretAccessKey: value }))}
          />
        </DomainField>
      </div>

      <DomainCheckbox
        checked={form.isDefault}
        onChange={(checked) => setForm((current) => ({ ...current, isDefault: checked }))}
        label={t('admin.domainCenter.accounts.fields.isDefault', 'Make this the default account for its vendor')}
      />
      <div>
        <DomainCheckbox
          checked={form.confirmsCredential}
          onChange={(checked) => setForm((current) => ({ ...current, confirmsCredential: checked }))}
          label={t(
            'admin.domainCenter.accounts.fields.confirm',
            'I confirm this credential is active for the selected vendor and may edit the zones it will publish into.',
          )}
        />
        {errors.confirmsCredential ? (
          <div role="alert" className="mt-1 text-[11px] text-red-600 dark:text-red-400">
            {t(errors.confirmsCredential, 'Please confirm the credential before saving')}
          </div>
        ) : null}
      </div>
      <DomainInlineNotice
        tone="warning"
        title={t('admin.domainCenter.accounts.scopeNotice', 'Least privilege')}
        description={t(
          'admin.domainCenter.accounts.scopeNoticeDesc',
          'Grant the credential permission to edit only the zones the platform will publish into; DNS credentials are the highest-impact secret on this surface.',
        )}
      />
    </DomainFormDialog>
  );
}
