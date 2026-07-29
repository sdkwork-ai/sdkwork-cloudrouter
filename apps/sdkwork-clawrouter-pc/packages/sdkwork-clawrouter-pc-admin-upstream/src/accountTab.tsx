import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { CheckCircle2, Edit3, KeyRound, Plus, RefreshCw, Settings2, Trash2, XCircle } from 'lucide-react';
import { AdminTableShell, ConfirmDialog, CopyButton } from '@sdkwork/clawroutes-pc-commons';
import { useTranslation } from 'react-i18next';
import type {
  CreateUpstreamAccountRequest,
  UpstreamAccount,
  UpstreamAccountCredential,
  UpstreamAccountCredentialCreated,
  UpstreamAccountVerification,
  UpstreamSupplier,
  UpstreamSupplierAuthMethod,
  UpstreamSupplierEndpoint,
} from '@sdkwork/clawrouter-pc-admin-core/sdk';
import { upstreamService } from './upstreamService';
import {
  dangerButtonClass,
  errorMessage,
  Field,
  InlineError,
  inputClass,
  Modal,
  primaryButtonClass,
  SearchBox,
  secondaryButtonClass,
  Section,
  selectClass,
  SidePanel,
  StatusBadge,
  TableState,
} from './components';

type TranslationFunction = ReturnType<typeof useTranslation>['t'];

export function AccountTab() {
  const { t } = useTranslation();
  const [items, setItems] = useState<UpstreamAccount[]>([]);
  const [suppliers, setSuppliers] = useState<UpstreamSupplier[]>([]);
  const [query, setQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<UpstreamAccount | null | undefined>(undefined);
  const [selected, setSelected] = useState<UpstreamAccount | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UpstreamAccount | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [accountPage, supplierPage] = await Promise.all([
        upstreamService.accounts.list({ page: 1, pageSize: 200, q: appliedQuery || undefined }),
        upstreamService.suppliers.list({ page: 1, pageSize: 200 }),
      ]);
      setItems(accountPage.items);
      setSuppliers(supplierPage.items);
      setSelected((current) => current ? accountPage.items.find((item) => item.id === current.id) ?? null : null);
    } catch (cause) {
      setError(errorMessage(cause, t('admin.upstream.common.errors.operationFailed')));
    } finally {
      setLoading(false);
    }
  }, [appliedQuery, t]);

  useEffect(() => { void load(); }, [load]);

  const submitAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const input = accountInput(new FormData(event.currentTarget), t);
      if (editing) await upstreamService.accounts.update(editing, input);
      else await upstreamService.accounts.create(input);
      setEditing(undefined);
      await load();
    } catch (cause) {
      setError(errorMessage(cause, t('admin.upstream.common.errors.operationFailed')));
    } finally {
      setBusy(false);
    }
  };

  const deleteAccount = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    setError(null);
    try {
      await upstreamService.accounts.delete(deleteTarget);
      setSelected((current) => current?.id === deleteTarget.id ? null : current);
      setDeleteTarget(null);
      await load();
    } catch (cause) {
      setError(errorMessage(cause, t('admin.upstream.common.errors.operationFailed')));
    } finally {
      setBusy(false);
    }
  };

  const supplierName = (supplierId: string) => suppliers.find((item) => item.id === supplierId)?.displayName ?? supplierId;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchBox value={query} placeholder={t('admin.upstream.account.search.placeholder')} onChange={setQuery} onSubmit={() => setAppliedQuery(query.trim())} />
        <div className="flex gap-2">
          <button type="button" className={secondaryButtonClass} onClick={() => void load()} disabled={loading}><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />{t('common.actions.refresh')}</button>
          <button type="button" className={primaryButtonClass} onClick={() => setEditing(null)} disabled={suppliers.length === 0}><Plus className="h-4 w-4" />{t('admin.upstream.account.actions.new')}</button>
        </div>
      </div>
      <InlineError message={error} />
      <AdminTableShell>
        <table className="w-full min-w-[1040px] text-left text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase text-slate-500 dark:bg-[#111] dark:text-slate-400">
            <tr><th className="px-4 py-3">{t('admin.upstream.account.table.account')}</th><th className="px-4 py-3">{t('admin.upstream.account.table.supplier')}</th><th className="px-4 py-3">{t('admin.upstream.account.table.authentication')}</th><th className="px-4 py-3">{t('admin.upstream.account.table.costMultiplier')}</th><th className="px-4 py-3">{t('admin.upstream.account.table.quota')}</th><th className="px-4 py-3">{t('admin.upstream.account.table.status')}</th><th className="px-4 py-3 text-right">{t('admin.upstream.account.table.actions')}</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {items.length === 0 ? <TableState loading={loading} empty={t('admin.upstream.account.empty')} colSpan={7} /> : items.map((account) => (
              <tr key={account.id} className="text-slate-700 hover:bg-slate-50/80 dark:text-slate-200 dark:hover:bg-white/[0.03]">
                <td className="px-4 py-3"><button type="button" className="text-left" onClick={() => setSelected(account)}><span className="block font-semibold text-slate-900 dark:text-white">{account.accountName}</span><span className="block font-mono text-xs text-slate-500">{account.accountCode}</span></button></td>
                <td className="px-4 py-3"><span className="font-medium">{supplierName(account.supplierId)}</span><span className="block text-xs text-slate-500">{account.supplierCode}</span></td>
                <td className="px-4 py-3"><span className="font-mono text-xs">{account.authMethodCode}</span></td>
                <td className="px-4 py-3 font-mono">{account.contractCostMultiplier}</td>
                <td className="px-4 py-3"><span>{account.quotaUsed ?? '0'} / {account.quotaLimit ?? '-'}</span><span className="block text-xs text-slate-500">{t('admin.upstream.account.table.rpm', { value: account.rpmLimit ?? '-' })}</span></td>
                <td className="px-4 py-3"><StatusBadge status={account.status} healthy={account.healthStatus} /></td>
                <td className="px-4 py-3"><div className="flex justify-end gap-1"><button type="button" className={secondaryButtonClass} onClick={() => setSelected(account)} title={t('admin.upstream.account.actions.credentials')}><Settings2 className="h-4 w-4" /></button><button type="button" className={secondaryButtonClass} onClick={() => setEditing(account)} title={t('common.actions.edit')}><Edit3 className="h-4 w-4" /></button><button type="button" className={dangerButtonClass} onClick={() => setDeleteTarget(account)} title={t('common.actions.delete')}><Trash2 className="h-4 w-4" /></button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </AdminTableShell>
      {editing !== undefined ? <AccountModal account={editing} suppliers={suppliers} busy={busy} onSubmit={submitAccount} onClose={() => setEditing(undefined)} /> : null}
      {selected ? <AccountCredentials account={selected} supplier={suppliers.find((item) => item.id === selected.supplierId) ?? null} onClose={() => setSelected(null)} onAccountChanged={(account) => { setSelected(account); setItems((current) => current.map((item) => item.id === account.id ? account : item)); }} /> : null}
      {deleteTarget ? <ConfirmDialog title={t('admin.upstream.account.delete.title')} description={t('admin.upstream.account.delete.description', { name: deleteTarget.accountName })} confirmLabel={t('common.actions.delete')} tone="danger" isBusy={busy} onCancel={() => setDeleteTarget(null)} onConfirm={() => void deleteAccount()} /> : null}
    </div>
  );
}

function AccountModal({ account, suppliers, busy, onSubmit, onClose }: { account: UpstreamAccount | null; suppliers: UpstreamSupplier[]; busy: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onClose: () => void }) {
  const { t } = useTranslation();
  const [supplierId, setSupplierId] = useState(account?.supplierId ?? suppliers[0]?.id ?? '');
  const [authMethods, setAuthMethods] = useState<UpstreamSupplierAuthMethod[]>([]);
  const [endpoints, setEndpoints] = useState<UpstreamSupplierEndpoint[]>([]);

  useEffect(() => {
    if (!supplierId) return;
    void Promise.all([
      upstreamService.suppliers.listAuthMethods(supplierId),
      upstreamService.suppliers.listEndpoints(supplierId),
    ]).then(([nextMethods, nextEndpoints]) => {
      setAuthMethods(nextMethods);
      setEndpoints(nextEndpoints);
    });
  }, [supplierId]);

  return (
    <Modal title={account ? t('admin.upstream.account.form.editTitle') : t('admin.upstream.account.form.createTitle')} busy={busy} submitLabel={account ? t('common.actions.saveChanges') : t('admin.upstream.account.form.createAction')} onSubmit={onSubmit} onClose={onClose}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('admin.upstream.account.form.accountCode')} required><input name="accountCode" className={inputClass} defaultValue={account?.accountCode} disabled={Boolean(account)} required /></Field>
        <Field label={t('admin.upstream.account.form.accountName')} required><input name="accountName" className={inputClass} defaultValue={account?.accountName} required /></Field>
        <Field label={t('admin.upstream.account.form.supplier')} required><select name="supplierId" className={selectClass} value={supplierId} onChange={(event) => setSupplierId(event.currentTarget.value)} required>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.displayName}</option>)}</select></Field>
        <Field label={t('admin.upstream.account.form.authMethod')} required><select name="authMethodCode" className={selectClass} defaultValue={account?.authMethodCode} required><option value="">{t('admin.upstream.account.form.selectMethod')}</option>{authMethods.map((method) => <option key={method.id} value={method.authMethodCode}>{method.authMethodName}</option>)}</select></Field>
        <Field label={t('admin.upstream.account.form.preferredBaseUrl')}><select name="preferredEndpointId" className={selectClass} defaultValue={account?.preferredEndpointId ?? ''}><option value="">{t('admin.upstream.account.form.automatic')}</option>{endpoints.map((endpoint) => <option key={endpoint.id} value={endpoint.id}>{endpoint.endpointName} ({endpoint.baseUrl})</option>)}</select></Field>
        <Field label={t('admin.upstream.account.form.accountType')}><input name="accountType" className={inputClass} defaultValue={account?.accountType ?? 'standard'} /></Field>
        <Field label={t('admin.upstream.account.form.externalAccountId')}><input name="externalAccountId" className={inputClass} defaultValue={account?.externalAccountId ?? ''} /></Field>
        <Field label={t('admin.upstream.common.fields.regionCode')}><input name="regionCode" className={inputClass} defaultValue={account?.regionCode ?? ''} /></Field>
        <Field label={t('admin.upstream.account.form.contractCostMultiplier')} required><input name="contractCostMultiplier" type="number" min="0" step="0.000001" className={inputClass} defaultValue={account?.contractCostMultiplier ?? '1'} required /></Field>
        <Field label={t('admin.upstream.account.form.quotaLimit')}><input name="quotaLimit" type="number" min="0" step="0.000001" className={inputClass} defaultValue={account?.quotaLimit ?? ''} /></Field>
        <Field label={t('admin.upstream.account.form.rpmLimit')}><input name="rpmLimit" type="number" min="0" step="1" className={inputClass} defaultValue={account?.rpmLimit ?? ''} /></Field>
        <Field label={t('admin.upstream.account.form.timeoutMs')}><input name="timeoutMs" type="number" min="100" max="600000" className={inputClass} defaultValue={account?.timeoutMs ?? 120000} /></Field>
        <Field label={t('admin.upstream.account.form.balanceCurrency')}><input name="upstreamBalanceCurrency" className={inputClass} defaultValue={account?.upstreamBalanceCurrency ?? 'USD'} maxLength={3} /></Field>
        <Field label={t('admin.upstream.common.fields.status')}><select name="status" className={selectClass} defaultValue={account?.status ?? 1}><option value="1">{t('common.status.active')}</option><option value="0">{t('common.status.disabled')}</option></select></Field>
      </div>
    </Modal>
  );
}

function AccountCredentials({ account, supplier, onAccountChanged, onClose }: { account: UpstreamAccount; supplier: UpstreamSupplier | null; onAccountChanged: (account: UpstreamAccount) => void; onClose: () => void }) {
  const { t } = useTranslation();
  const [credentials, setCredentials] = useState<UpstreamAccountCredential[]>([]);
  const [endpoints, setEndpoints] = useState<UpstreamSupplierEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [created, setCreated] = useState<UpstreamAccountCredentialCreated | null>(null);
  const [verification, setVerification] = useState<UpstreamAccountVerification | null>(null);
  const [credentialId, setCredentialId] = useState('');
  const [endpointId, setEndpointId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextCredentials, nextEndpoints] = await Promise.all([
        upstreamService.accounts.listCredentials(account.id, { page: 1, pageSize: 200 }),
        upstreamService.suppliers.listEndpoints(account.supplierId),
      ]);
      setCredentials(nextCredentials);
      setEndpoints(nextEndpoints);
      setCredentialId((current) => current || nextCredentials[0]?.id || '');
      setEndpointId((current) => current || account.preferredEndpointId || nextEndpoints[0]?.id || '');
    } catch (cause) {
      setError(errorMessage(cause, t('admin.upstream.common.errors.operationFailed')));
    } finally {
      setLoading(false);
    }
  }, [account.id, account.preferredEndpointId, account.supplierId, t]);

  useEffect(() => { void load(); }, [load]);

  const createCredential = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const form = new FormData(event.currentTarget);
      const result = await upstreamService.accounts.createCredential(account.id, {
        credentialName: required(form, 'credentialName', t('admin.upstream.account.credentials.name'), t),
        secret: required(form, 'secret', t('admin.upstream.account.credentials.secret'), t),
        expiresAt: optional(form, 'expiresAt'),
        priority: numeric(form, 'priority', 100),
      });
      setCreateOpen(false);
      setCreated(result);
      await load();
      onAccountChanged(await upstreamService.accounts.retrieve(account.id));
    } catch (cause) {
      setError(errorMessage(cause, t('admin.upstream.common.errors.operationFailed')));
    } finally {
      setBusy(false);
    }
  };

  const deleteCredential = async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      await upstreamService.accounts.deleteCredential(account.id, id);
      await load();
    } catch (cause) {
      setError(errorMessage(cause, t('admin.upstream.common.errors.operationFailed')));
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setBusy(true);
    setError(null);
    setVerification(null);
    try {
      setVerification(await upstreamService.accounts.verify(account.id, {
        credentialId: credentialId || undefined,
        endpointId: endpointId || undefined,
        timeoutMs: account.timeoutMs ?? undefined,
      }));
      onAccountChanged(await upstreamService.accounts.retrieve(account.id));
    } catch (cause) {
      setError(errorMessage(cause, t('admin.upstream.common.errors.operationFailed')));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SidePanel title={account.accountName} subtitle={`${supplier?.displayName ?? account.supplierCode} / ${account.authMethodCode}`} onClose={onClose}>
      <div className="grid gap-6">
        <InlineError message={error} />
        <Section title={t('admin.upstream.account.credentials.title')} action={<button type="button" className={secondaryButtonClass} onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" />{t('admin.upstream.account.credentials.add')}</button>}>
          <div className="grid gap-2">
            {credentials.map((credential) => (
              <div key={credential.id} className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2 dark:border-white/10">
                <div className="min-w-0"><span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">{credential.credentialName}</span><span className="block truncate font-mono text-xs text-slate-500">{credential.maskedLabel ?? credential.credentialVersion}</span></div>
                <div className="flex items-center gap-2"><StatusBadge status={credential.status} /><button type="button" className={dangerButtonClass} onClick={() => void deleteCredential(credential.id)} disabled={busy}><Trash2 className="h-4 w-4" /></button></div>
              </div>
            ))}
            {!loading && credentials.length === 0 ? <p className="py-6 text-center text-sm text-slate-500">{t('admin.upstream.account.credentials.empty')}</p> : null}
          </div>
        </Section>
        <Section title={t('admin.upstream.account.verification.title')}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t('admin.upstream.account.verification.credential')}><select className={selectClass} value={credentialId} onChange={(event) => setCredentialId(event.currentTarget.value)}><option value="">{t('admin.upstream.account.form.automatic')}</option>{credentials.map((credential) => <option key={credential.id} value={credential.id}>{credential.credentialName}</option>)}</select></Field>
            <Field label={t('admin.upstream.common.fields.baseUrl')}><select className={selectClass} value={endpointId} onChange={(event) => setEndpointId(event.currentTarget.value)}><option value="">{t('admin.upstream.account.form.automatic')}</option>{endpoints.map((endpoint) => <option key={endpoint.id} value={endpoint.id}>{endpoint.endpointName}</option>)}</select></Field>
            <button type="button" className={`${primaryButtonClass} sm:col-span-2`} onClick={() => void verify()} disabled={busy || credentials.length === 0}>{t('admin.upstream.account.verification.verify')}</button>
            {verification ? <div className={`flex items-start gap-2 rounded-md border px-3 py-3 text-sm sm:col-span-2 ${verification.success ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200' : 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200'}`}>{verification.success ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <XCircle className="h-5 w-5 shrink-0" />}<div><span className="font-semibold">{verification.message}</span><span className="block text-xs opacity-80">{t('admin.upstream.account.verification.resultMeta', { status: verification.statusCode ?? '-', latency: verification.latencyMs })}</span></div></div> : null}
          </div>
        </Section>
      </div>
      {createOpen ? <Modal title={t('admin.upstream.account.credentials.createTitle')} busy={busy} submitLabel={t('admin.upstream.account.credentials.store')} onSubmit={createCredential} onClose={() => setCreateOpen(false)}><div className="grid gap-4"><Field label={t('admin.upstream.account.credentials.name')} required><input name="credentialName" className={inputClass} required /></Field><Field label={t('admin.upstream.account.credentials.secret')} required hint={t('admin.upstream.account.credentials.secretHint')}><input name="secret" type="password" autoComplete="new-password" className={inputClass} required /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label={t('admin.upstream.common.fields.priority')}><input name="priority" type="number" min="0" className={inputClass} defaultValue="100" /></Field><Field label={t('admin.upstream.account.credentials.expiresAt')}><input name="expiresAt" type="datetime-local" className={inputClass} /></Field></div></div></Modal> : null}
      {created ? <Modal title={t('admin.upstream.account.credentials.createdTitle')} description={t('admin.upstream.account.credentials.createdDescription')} busy={false} submitLabel={t('admin.upstream.account.credentials.createdAction')} onSubmit={(event) => { event.preventDefault(); setCreated(null); }} onClose={() => setCreated(null)}><div className="rounded-md border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10"><div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-200"><KeyRound className="h-4 w-4" />{t('admin.upstream.account.credentials.oneTimeSecret')}</div><div className="flex items-center gap-2 rounded-md bg-white p-2 font-mono text-sm text-slate-900 dark:bg-black dark:text-white"><code className="min-w-0 flex-1 break-all">{created.rawSecret}</code><CopyButton text={created.rawSecret} /></div></div></Modal> : null}
    </SidePanel>
  );
}

function accountInput(form: FormData, t: TranslationFunction): CreateUpstreamAccountRequest {
  return {
    accountCode: required(form, 'accountCode', t('admin.upstream.account.form.accountCode'), t),
    accountName: required(form, 'accountName', t('admin.upstream.account.form.accountName'), t),
    supplierId: required(form, 'supplierId', t('admin.upstream.account.form.supplier'), t),
    authMethodCode: required(form, 'authMethodCode', t('admin.upstream.account.form.authMethod'), t),
    accountType: optional(form, 'accountType'),
    externalAccountId: optional(form, 'externalAccountId'),
    preferredEndpointId: optional(form, 'preferredEndpointId'),
    regionCode: optional(form, 'regionCode'),
    contractCostMultiplier: required(form, 'contractCostMultiplier', t('admin.upstream.account.form.contractCostMultiplier'), t),
    quotaLimit: optional(form, 'quotaLimit'),
    rpmLimit: optional(form, 'rpmLimit'),
    timeoutMs: numeric(form, 'timeoutMs', 120000, t('admin.upstream.account.form.timeoutMs'), t),
    upstreamBalanceCurrency: optional(form, 'upstreamBalanceCurrency'),
    status: numeric(form, 'status', 1),
  };
}

function required(form: FormData, key: string, field: string, t: TranslationFunction): string {
  const value = String(form.get(key) ?? '').trim();
  if (!value) throw new Error(t('admin.upstream.common.validation.required', { field }));
  return value;
}

function optional(form: FormData, key: string): string | null {
  return String(form.get(key) ?? '').trim() || null;
}

function numeric(form: FormData, key: string, fallback: number, field?: string, t?: TranslationFunction): number {
  const raw = String(form.get(key) ?? '').trim();
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error(t && field ? t('admin.upstream.common.validation.numeric', { field }) : key);
  return value;
}
