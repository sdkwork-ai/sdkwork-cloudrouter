import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Edit3, ExternalLink, Plus, RefreshCw, Settings2, Trash2 } from 'lucide-react';
import { AdminTableShell, ConfirmDialog } from '@sdkwork/clawroutes-pc-commons';
import { useTranslation } from 'react-i18next';
import type {
  CreateUpstreamSupplierRequest,
  UpstreamResourceEntitlementInput,
  UpstreamSupplier,
  UpstreamSupplierAuthMethodInput,
  UpstreamSupplierEndpointInput,
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
  textAreaClass,
} from './components';

type TranslationFunction = ReturnType<typeof useTranslation>['t'];

const emptyEndpoint = (): UpstreamSupplierEndpointInput => ({
  endpointCode: '',
  endpointName: '',
  baseUrl: '',
  environment: 1,
  priority: 100,
  routingWeight: 100,
  status: 1,
});

const emptyAuthMethod = (): UpstreamSupplierAuthMethodInput => ({
  authMethodCode: 'api-key',
  authMethodName: 'API Key',
  authType: 'api_key',
  priority: 100,
  status: 1,
  configSchema: {},
  runtimeAuthConfig: {
    credentialTransport: 'bearer',
    credentialParameter: 'Authorization',
    defaultHeaders: {},
  },
});

const emptyResource = (): UpstreamResourceEntitlementInput => ({
  resourceCode: '',
  resourceGroupCode: '',
  grantType: 'allow',
  priority: 100,
  status: 1,
});

export function SupplierTab() {
  const { t } = useTranslation();
  const [items, setItems] = useState<UpstreamSupplier[]>([]);
  const [query, setQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<UpstreamSupplier | null | undefined>(undefined);
  const [selected, setSelected] = useState<UpstreamSupplier | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UpstreamSupplier | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await upstreamService.suppliers.list({ page: 1, pageSize: 200, q: appliedQuery || undefined });
      setItems(page.items);
      setSelected((current) => current ? page.items.find((item) => item.id === current.id) ?? null : null);
    } catch (cause) {
      setError(errorMessage(cause, t('admin.upstream.common.errors.operationFailed')));
    } finally {
      setLoading(false);
    }
  }, [appliedQuery, t]);

  useEffect(() => { void load(); }, [load]);

  const submitSupplier = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const form = new FormData(event.currentTarget);
      const input = supplierInput(form, t);
      if (editing) {
        await upstreamService.suppliers.update(editing, input);
      } else {
        await upstreamService.suppliers.create(input);
      }
      setEditing(undefined);
      await load();
    } catch (cause) {
      setError(errorMessage(cause, t('admin.upstream.common.errors.operationFailed')));
    } finally {
      setBusy(false);
    }
  };

  const deleteSupplier = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    setError(null);
    try {
      await upstreamService.suppliers.delete(deleteTarget);
      setDeleteTarget(null);
      setSelected((current) => current?.id === deleteTarget.id ? null : current);
      await load();
    } catch (cause) {
      setError(errorMessage(cause, t('admin.upstream.common.errors.operationFailed')));
    } finally {
      setBusy(false);
    }
  };

  const updateSelected = (supplier: UpstreamSupplier) => {
    setSelected(supplier);
    setItems((current) => current.map((item) => item.id === supplier.id ? supplier : item));
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" data-admin-upstream-toolbar>
        <div data-admin-upstream-search><SearchBox value={query} placeholder={t('admin.upstream.supplier.search.placeholder')} onChange={setQuery} onSubmit={() => setAppliedQuery(query.trim())} /></div>
        <div className="flex gap-2">
          <button type="button" className={secondaryButtonClass} onClick={() => void load()} disabled={loading} title={t('common.actions.refresh')}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {t('common.actions.refresh')}
          </button>
          <button type="button" className={primaryButtonClass} onClick={() => setEditing(null)} data-admin-upstream-primary-action>
            <Plus className="h-4 w-4" />
            {t('admin.upstream.supplier.actions.new')}
          </button>
        </div>
      </div>
      <InlineError message={error} />
      <AdminTableShell>
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase text-slate-500 dark:bg-[#111] dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">{t('admin.upstream.supplier.table.supplier')}</th>
              <th className="px-4 py-3">{t('admin.upstream.supplier.table.type')}</th>
              <th className="px-4 py-3">{t('admin.upstream.supplier.table.protocolAdapter')}</th>
              <th className="px-4 py-3">{t('admin.upstream.supplier.table.region')}</th>
              <th className="px-4 py-3">{t('admin.upstream.supplier.table.status')}</th>
              <th className="px-4 py-3 text-right">{t('admin.upstream.supplier.table.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {items.length === 0 ? <TableState loading={loading} empty={t('admin.upstream.supplier.empty')} colSpan={6} /> : items.map((supplier) => (
              <tr key={supplier.id} className="text-slate-700 hover:bg-slate-50/80 dark:text-slate-200 dark:hover:bg-white/[0.03]">
                <td className="px-4 py-3">
                  <button type="button" onClick={() => setSelected(supplier)} className="text-left">
                    <span className="block font-semibold text-slate-900 dark:text-white">{supplier.displayName}</span>
                    <span className="mt-0.5 block font-mono text-xs text-slate-500">{supplier.supplierCode}</span>
                  </button>
                </td>
                <td className="px-4 py-3 capitalize">{supplier.supplierType}</td>
                <td className="px-4 py-3"><span className="font-medium">{supplier.protocolCode}</span><span className="block text-xs text-slate-500">{supplier.adapterCode}</span></td>
                <td className="px-4 py-3">{supplier.regionCode || '-'}</td>
                <td className="px-4 py-3"><StatusBadge status={supplier.status} healthy={supplier.healthStatus} /></td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button type="button" className={secondaryButtonClass} onClick={() => setSelected(supplier)} title={t('admin.upstream.common.actions.configure')}><Settings2 className="h-4 w-4" /></button>
                    <button type="button" className={secondaryButtonClass} onClick={() => setEditing(supplier)} title={t('common.actions.edit')}><Edit3 className="h-4 w-4" /></button>
                    <button type="button" className={dangerButtonClass} onClick={() => setDeleteTarget(supplier)} title={t('common.actions.delete')}><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </AdminTableShell>

      {editing !== undefined ? (
        <SupplierModal supplier={editing} busy={busy} onSubmit={submitSupplier} onClose={() => setEditing(undefined)} />
      ) : null}
      {selected ? (
        <SupplierCapabilities supplier={selected} onChanged={updateSelected} onClose={() => setSelected(null)} />
      ) : null}
      {deleteTarget ? (
        <ConfirmDialog
          title={t('admin.upstream.supplier.delete.title')}
          description={t('admin.upstream.supplier.delete.description', { name: deleteTarget.displayName })}
          confirmLabel={t('common.actions.delete')}
          tone="danger"
          isBusy={busy}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => void deleteSupplier()}
        />
      ) : null}
    </div>
  );
}

function SupplierModal({ supplier, busy, onSubmit, onClose }: { supplier: UpstreamSupplier | null; busy: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <Modal title={supplier ? t('admin.upstream.supplier.form.editTitle') : t('admin.upstream.supplier.form.createTitle')} busy={busy} submitLabel={supplier ? t('common.actions.saveChanges') : t('admin.upstream.supplier.form.createAction')} onSubmit={onSubmit} onClose={onClose}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('admin.upstream.supplier.form.supplierCode')} required><input name="supplierCode" className={inputClass} defaultValue={supplier?.supplierCode} disabled={Boolean(supplier)} required /></Field>
        <Field label={t('admin.upstream.supplier.form.supplierName')} required><input name="supplierName" className={inputClass} defaultValue={supplier?.supplierName} required /></Field>
        <Field label={t('admin.upstream.supplier.form.displayName')}><input name="displayName" className={inputClass} defaultValue={supplier?.displayName} /></Field>
        <Field label={t('admin.upstream.supplier.form.supplierType')} required><select name="supplierType" className={selectClass} defaultValue={supplier?.supplierType ?? 'official'}><option value="official">{t('admin.upstream.supplier.type.official')}</option><option value="relay">{t('admin.upstream.supplier.type.relay')}</option></select></Field>
        <Field label={t('admin.upstream.supplier.form.protocolCode')} required><input name="protocolCode" className={inputClass} defaultValue={supplier?.protocolCode ?? 'openai'} required /></Field>
        <Field label={t('admin.upstream.supplier.form.adapterCode')} required><input name="adapterCode" className={inputClass} defaultValue={supplier?.adapterCode ?? 'openai'} required /></Field>
        <Field label={t('admin.upstream.common.fields.regionCode')}><input name="regionCode" className={inputClass} defaultValue={supplier?.regionCode ?? ''} /></Field>
        <Field label={t('admin.upstream.common.fields.environment')}><select name="environment" className={selectClass} defaultValue={supplier?.environment ?? 1}><option value="1">{t('admin.upstream.common.environment.production')}</option><option value="2">{t('admin.upstream.common.environment.sandbox')}</option></select></Field>
        <Field label={t('admin.upstream.supplier.form.websiteUrl')}><input name="websiteUrl" type="url" className={inputClass} defaultValue={supplier?.websiteUrl ?? ''} /></Field>
        <Field label={t('admin.upstream.supplier.form.documentationUrl')}><input name="docsUrl" type="url" className={inputClass} defaultValue={supplier?.docsUrl ?? ''} /></Field>
        <Field label={t('admin.upstream.supplier.form.sortOrder')}><input name="sortOrder" type="number" min="0" className={inputClass} defaultValue={supplier?.sortOrder ?? 100} /></Field>
        <Field label={t('admin.upstream.common.fields.status')}><select name="status" className={selectClass} defaultValue={supplier?.status ?? 1}><option value="1">{t('common.status.active')}</option><option value="0">{t('common.status.disabled')}</option></select></Field>
        <div className="sm:col-span-2"><Field label={t('admin.upstream.common.fields.description')}><textarea name="description" className={textAreaClass} defaultValue={supplier?.description ?? ''} /></Field></div>
      </div>
    </Modal>
  );
}

function SupplierCapabilities({ supplier, onChanged, onClose }: { supplier: UpstreamSupplier; onChanged: (supplier: UpstreamSupplier) => void; onClose: () => void }) {
  const { t } = useTranslation();
  const [endpoints, setEndpoints] = useState<UpstreamSupplierEndpointInput[]>([]);
  const [authMethods, setAuthMethods] = useState<UpstreamSupplierAuthMethodInput[]>([]);
  const [resources, setResources] = useState<UpstreamResourceEntitlementInput[]>([]);
  const [loading, setLoading] = useState(true);
  const [busySection, setBusySection] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextEndpoints, nextAuthMethods, nextResources] = await Promise.all([
        upstreamService.suppliers.listEndpoints(supplier.id),
        upstreamService.suppliers.listAuthMethods(supplier.id),
        upstreamService.suppliers.listResources(supplier.id),
      ]);
      setEndpoints(nextEndpoints.map(({ endpointCode, endpointName, baseUrl, protocolCode, regionCode, environment, priority, routingWeight, timeoutMs, status }) => ({ endpointCode, endpointName, baseUrl, protocolCode, regionCode, environment, priority, routingWeight, timeoutMs, status })));
      setAuthMethods(nextAuthMethods.map(({ authMethodCode, authMethodName, authType, authorizationUrl, tokenUrl, scopes, configSchema, runtimeAuthConfig, priority, status }) => ({ authMethodCode, authMethodName, authType, authorizationUrl, tokenUrl, scopes, configSchema, runtimeAuthConfig, priority, status })));
      setResources(nextResources.map(({ resourceCode, resourceGroupCode, grantType, priority, status }) => ({ resourceCode, resourceGroupCode, grantType, priority, status })));
    } catch (cause) {
      setError(errorMessage(cause, t('admin.upstream.common.errors.operationFailed')));
    } finally {
      setLoading(false);
    }
  }, [supplier.id, t]);

  useEffect(() => { void load(); }, [load]);

  const save = async (section: 'endpoints' | 'authMethods' | 'resources') => {
    setBusySection(section);
    setError(null);
    try {
      if (section === 'endpoints') await upstreamService.suppliers.replaceEndpoints(supplier, { items: endpoints });
      if (section === 'authMethods') await upstreamService.suppliers.replaceAuthMethods(supplier, { items: authMethods });
      if (section === 'resources') await upstreamService.suppliers.replaceResources(supplier, { items: resources });
      const refreshed = await upstreamService.suppliers.retrieve(supplier.id);
      onChanged(refreshed);
      await load();
    } catch (cause) {
      setError(errorMessage(cause, t('admin.upstream.common.errors.operationFailed')));
    } finally {
      setBusySection(null);
    }
  };

  return (
    <SidePanel title={supplier.displayName} subtitle={`${supplier.supplierType} / ${supplier.protocolCode}`} onClose={onClose}>
      <div className="grid gap-6">
        <InlineError message={error} />
        {supplier.websiteUrl || supplier.docsUrl ? (
          <div className="flex flex-wrap gap-2">
            {supplier.websiteUrl ? <a className={secondaryButtonClass} href={supplier.websiteUrl} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" />{t('admin.upstream.supplier.links.website')}</a> : null}
            {supplier.docsUrl ? <a className={secondaryButtonClass} href={supplier.docsUrl} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" />{t('admin.upstream.supplier.links.documentation')}</a> : null}
          </div>
        ) : null}
        <Section title={t('admin.upstream.supplier.endpoints.title')} action={<button type="button" className={secondaryButtonClass} onClick={() => setEndpoints((current) => [...current, emptyEndpoint()])}><Plus className="h-4 w-4" />{t('admin.upstream.common.actions.add')}</button>}>
          <div className="grid gap-3">
            {endpoints.map((endpoint, index) => (
              <div key={`${endpoint.endpointCode}-${index}`} className="grid gap-2 rounded-md border border-slate-200 p-3 dark:border-white/10 sm:grid-cols-2">
                <input aria-label={t('admin.upstream.supplier.endpoints.code')} placeholder={t('admin.upstream.supplier.endpoints.code')} className={inputClass} value={endpoint.endpointCode} onChange={(event) => setEndpoints(updateAt(endpoints, index, { endpointCode: event.currentTarget.value }))} />
                <input aria-label={t('admin.upstream.supplier.endpoints.name')} placeholder={t('admin.upstream.supplier.endpoints.name')} className={inputClass} value={endpoint.endpointName} onChange={(event) => setEndpoints(updateAt(endpoints, index, { endpointName: event.currentTarget.value }))} />
                <input aria-label={t('admin.upstream.common.fields.baseUrl')} placeholder="https://api.example.com/v1" className={`${inputClass} sm:col-span-2`} value={endpoint.baseUrl} onChange={(event) => setEndpoints(updateAt(endpoints, index, { baseUrl: event.currentTarget.value }))} />
                <input aria-label={t('admin.upstream.common.fields.regionCode')} placeholder={t('admin.upstream.common.fields.regionCode')} className={inputClass} value={endpoint.regionCode ?? ''} onChange={(event) => setEndpoints(updateAt(endpoints, index, { regionCode: emptyToNull(event.currentTarget.value) }))} />
                <div className="flex gap-2"><input aria-label={t('admin.upstream.common.fields.priority')} title={t('admin.upstream.common.fields.priority')} type="number" min="0" className={inputClass} value={endpoint.priority ?? 100} onChange={(event) => setEndpoints(updateAt(endpoints, index, { priority: Number(event.currentTarget.value) }))} /><input aria-label={t('admin.upstream.common.fields.weight')} title={t('admin.upstream.common.fields.weight')} type="number" min="0" className={inputClass} value={endpoint.routingWeight ?? 100} onChange={(event) => setEndpoints(updateAt(endpoints, index, { routingWeight: Number(event.currentTarget.value) }))} /><button type="button" title={t('common.actions.delete')} className={dangerButtonClass} onClick={() => setEndpoints(removeAt(endpoints, index))}><Trash2 className="h-4 w-4" /></button></div>
              </div>
            ))}
            {!loading && endpoints.length === 0 ? <p className="py-6 text-center text-sm text-slate-500">{t('admin.upstream.supplier.endpoints.empty')}</p> : null}
            <button type="button" className={primaryButtonClass} disabled={busySection !== null} onClick={() => void save('endpoints')}>{t('admin.upstream.supplier.endpoints.save')}</button>
          </div>
        </Section>
        <Section title={t('admin.upstream.supplier.auth.title')} action={<button type="button" className={secondaryButtonClass} onClick={() => setAuthMethods((current) => [...current, emptyAuthMethod()])}><Plus className="h-4 w-4" />{t('admin.upstream.common.actions.add')}</button>}>
          <div className="grid gap-3">
            {authMethods.map((method, index) => (
              <div key={`${method.authMethodCode}-${index}`} className="grid gap-2 rounded-md border border-slate-200 p-3 dark:border-white/10 sm:grid-cols-2">
                <input aria-label={t('admin.upstream.supplier.auth.code')} placeholder={t('admin.upstream.supplier.auth.code')} className={inputClass} value={method.authMethodCode} onChange={(event) => setAuthMethods(updateAt(authMethods, index, { authMethodCode: event.currentTarget.value }))} />
                <input aria-label={t('admin.upstream.supplier.auth.name')} placeholder={t('admin.upstream.supplier.auth.name')} className={inputClass} value={method.authMethodName} onChange={(event) => setAuthMethods(updateAt(authMethods, index, { authMethodName: event.currentTarget.value }))} />
                <select aria-label={t('admin.upstream.supplier.auth.type')} className={selectClass} value={method.authType} onChange={(event) => setAuthMethods(updateAt(authMethods, index, authTypePatch(event.currentTarget.value as UpstreamSupplierAuthMethodInput['authType'])))}>
                  <option value="api_key">{t('admin.upstream.supplier.auth.type.apiKey')}</option><option value="bearer_token">{t('admin.upstream.supplier.auth.type.bearerToken')}</option><option value="oauth2_client_credentials">{t('admin.upstream.supplier.auth.type.clientCredentials')}</option><option value="oauth2_authorization_code">{t('admin.upstream.supplier.auth.type.authorizationCode')}</option><option value="aws_sigv4">{t('admin.upstream.supplier.auth.type.awsSigv4')}</option><option value="custom">{t('admin.upstream.supplier.auth.type.custom')}</option>
                </select>
                <input aria-label={t('admin.upstream.supplier.auth.credentialParameter')} placeholder={t('admin.upstream.supplier.auth.credentialParameter')} className={inputClass} value={method.runtimeAuthConfig.credentialParameter ?? ''} onChange={(event) => setAuthMethods(updateAt(authMethods, index, { runtimeAuthConfig: { ...method.runtimeAuthConfig, credentialParameter: emptyToNull(event.currentTarget.value) } }))} />
                {method.authType.startsWith('oauth2_') ? <><input aria-label={t('admin.upstream.supplier.auth.authorizationUrl')} placeholder={t('admin.upstream.supplier.auth.authorizationUrl')} className={inputClass} value={method.authorizationUrl ?? ''} onChange={(event) => setAuthMethods(updateAt(authMethods, index, { authorizationUrl: emptyToNull(event.currentTarget.value) }))} /><input aria-label={t('admin.upstream.supplier.auth.tokenUrl')} placeholder={t('admin.upstream.supplier.auth.tokenUrl')} className={inputClass} value={method.tokenUrl ?? ''} onChange={(event) => setAuthMethods(updateAt(authMethods, index, { tokenUrl: emptyToNull(event.currentTarget.value) }))} /></> : null}
                <div className="flex items-center justify-end sm:col-span-2"><button type="button" className={dangerButtonClass} onClick={() => setAuthMethods(removeAt(authMethods, index))}><Trash2 className="h-4 w-4" />{t('admin.upstream.common.actions.remove')}</button></div>
              </div>
            ))}
            {!loading && authMethods.length === 0 ? <p className="py-6 text-center text-sm text-slate-500">{t('admin.upstream.supplier.auth.empty')}</p> : null}
            <button type="button" className={primaryButtonClass} disabled={busySection !== null} onClick={() => void save('authMethods')}>{t('admin.upstream.supplier.auth.save')}</button>
          </div>
        </Section>
        <Section title={t('admin.upstream.supplier.resources.title')} action={<button type="button" className={secondaryButtonClass} onClick={() => setResources((current) => [...current, emptyResource()])}><Plus className="h-4 w-4" />{t('admin.upstream.common.actions.add')}</button>}>
          <div className="grid gap-2">
            {resources.map((resource, index) => (
              <div key={`${resource.resourceCode}-${index}`} className="grid gap-2 rounded-md border border-slate-200 p-3 dark:border-white/10 sm:grid-cols-[1fr_1fr_120px_40px]">
                <input aria-label={t('admin.upstream.common.fields.resourceCode')} placeholder={t('admin.upstream.common.fields.resourceCode')} className={inputClass} value={resource.resourceCode ?? ''} onChange={(event) => setResources(updateAt(resources, index, { resourceCode: emptyToNull(event.currentTarget.value) }))} />
                <input aria-label={t('admin.upstream.common.fields.resourceGroupCode')} placeholder={t('admin.upstream.common.fields.resourceGroupCode')} className={inputClass} value={resource.resourceGroupCode ?? ''} onChange={(event) => setResources(updateAt(resources, index, { resourceGroupCode: emptyToNull(event.currentTarget.value) }))} />
                <select aria-label={t('admin.upstream.common.grant.label')} className={selectClass} value={resource.grantType ?? 'allow'} onChange={(event) => setResources(updateAt(resources, index, { grantType: event.currentTarget.value as 'allow' | 'deny' }))}><option value="allow">{t('admin.upstream.common.grant.allow')}</option><option value="deny">{t('admin.upstream.common.grant.deny')}</option></select>
                <button type="button" title={t('common.actions.delete')} className={dangerButtonClass} onClick={() => setResources(removeAt(resources, index))}><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
            {!loading && resources.length === 0 ? <p className="py-6 text-center text-sm text-slate-500">{t('admin.upstream.supplier.resources.empty')}</p> : null}
            <button type="button" className={primaryButtonClass} disabled={busySection !== null} onClick={() => void save('resources')}>{t('admin.upstream.supplier.resources.save')}</button>
          </div>
        </Section>
      </div>
    </SidePanel>
  );
}

function supplierInput(form: FormData, t: TranslationFunction): CreateUpstreamSupplierRequest {
  return {
    supplierCode: required(form, 'supplierCode', t('admin.upstream.supplier.form.supplierCode'), t),
    supplierName: required(form, 'supplierName', t('admin.upstream.supplier.form.supplierName'), t),
    displayName: optional(form, 'displayName'),
    supplierType: required(form, 'supplierType', t('admin.upstream.supplier.form.supplierType'), t) as 'official' | 'relay',
    protocolCode: required(form, 'protocolCode', t('admin.upstream.supplier.form.protocolCode'), t),
    adapterCode: required(form, 'adapterCode', t('admin.upstream.supplier.form.adapterCode'), t),
    regionCode: optional(form, 'regionCode'),
    websiteUrl: optional(form, 'websiteUrl'),
    docsUrl: optional(form, 'docsUrl'),
    description: optional(form, 'description'),
    environment: numeric(form, 'environment', 1),
    sortOrder: numeric(form, 'sortOrder', 100),
    status: numeric(form, 'status', 1),
  };
}

function authTypePatch(authType: UpstreamSupplierAuthMethodInput['authType']): Partial<UpstreamSupplierAuthMethodInput> {
  const credentialTransport = authType === 'aws_sigv4' || authType === 'custom' ? 'provider_adapter' : authType.startsWith('oauth2_') ? 'bearer' : 'bearer';
  return { authType, runtimeAuthConfig: { credentialTransport, credentialParameter: credentialTransport === 'bearer' ? 'Authorization' : null, defaultHeaders: {} } };
}

function updateAt<T>(items: T[], index: number, patch: Partial<T>): T[] {
  return items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item);
}

function removeAt<T>(items: T[], index: number): T[] {
  return items.filter((_, itemIndex) => itemIndex !== index);
}

function required(form: FormData, key: string, field: string, t: TranslationFunction): string {
  const value = String(form.get(key) ?? '').trim();
  if (!value) throw new Error(t('admin.upstream.common.validation.required', { field }));
  return value;
}

function optional(form: FormData, key: string): string | null {
  return String(form.get(key) ?? '').trim() || null;
}

function numeric(form: FormData, key: string, fallback: number): number {
  const value = Number(form.get(key));
  return Number.isFinite(value) ? value : fallback;
}

function emptyToNull(value: string): string | null {
  return value.trim() || null;
}
