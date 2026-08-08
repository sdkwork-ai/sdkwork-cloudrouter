import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Building2, Check, Edit3, ExternalLink, Plus, RefreshCw, Settings2, Share2, Sparkles, Trash2 } from 'lucide-react';
import { AdminTableShell, ConfirmDialog } from '@sdkwork/cloudroutes-pc-commons';
import { useTranslation } from 'react-i18next';
import type {
  CreateUpstreamSupplierRequest,
  UpstreamResourceCatalogResponse,
  UpstreamResourceEntitlementInput,
  UpstreamSupplier,
  UpstreamSupplierAuthMethodInput,
  UpstreamSupplierEndpointInput,
} from '@sdkwork/cloudrouter-pc-admin-core/sdk';
import { upstreamService } from './upstreamService';
import { resolveVendorBaseUrl, vendorStandardBaseUrl } from './vendorBaseUrlRules';
import { emptyResourceSelection, ResourcePicker, toEntitlements, toSelection, type ResourceSelection } from './resourcePicker';
import {
  dangerButtonClass,
  errorMessage,
  errorMessageI18n,
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
  UpstreamPageShell,
} from './components';

type SupplierType = 'official' | 'relay';

interface SupplierFormValues {
  supplierName: string;
  displayName: string;
  description: string;
  supplierType: SupplierType;
  defaultVendorCode: string | null;
  adapterCode: string;
  protocolCode: string;
  websiteUrl: string;
  docsUrl: string;
  regionCode: string;
  environment: number;
  sortOrder: number;
  status: number;
  resources: UpstreamResourceEntitlementInput[];
}

export function UpstreamSupplierAdmin() {
  return (
    <UpstreamPageShell>
      <SupplierAdminPanel />
    </UpstreamPageShell>
  );
}

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
    credentialParameter: null,
    defaultHeaders: {},
  },
});

function SupplierTypeBadge({ type }: { type: SupplierType }) {
  const { t } = useTranslation();
  const official = type === 'official';
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-1 text-xs font-semibold ${official ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'}`}>
      {official ? <Building2 className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
      {official ? t('admin.upstream.supplier.type.official') : t('admin.upstream.supplier.type.relay')}
    </span>
  );
}

export function SupplierAdminPanel() {
  const { t } = useTranslation();
  const [items, setItems] = useState<UpstreamSupplier[]>([]);
  const [query, setQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | SupplierType>('all');
  const [catalog, setCatalog] = useState<UpstreamResourceCatalogResponse | null>(null);
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
      setError(errorMessageI18n(cause, t('admin.upstream.common.errors.operationFailed'), t));
    } finally {
      setLoading(false);
    }
  }, [appliedQuery, t]);

  useEffect(() => { void load(); }, [load]);

  const loadCatalog = useCallback(async () => {
    if (catalog) return;
    try {
      const value = await upstreamService.fetchResourceCatalog();
      if (!value || !Array.isArray(value.resources) || !Array.isArray(value.resourceGroups)) {
        setError(t('admin.upstream.common.errors.operationFailed'));
        return;
      }
      setCatalog(value);
    } catch (cause) {
      setError(errorMessageI18n(cause, t('admin.upstream.common.errors.operationFailed'), t));
    }
  }, [catalog, t]);

  useEffect(() => { void loadCatalog(); }, [loadCatalog]);

  const filteredItems = useMemo(() => {
    if (typeFilter === 'all') return items;
    return items.filter((item) => item.supplierType === typeFilter);
  }, [items, typeFilter]);

  const officialCount = useMemo(() => items.filter((item) => item.supplierType === 'official').length, [items]);
  const relayCount = useMemo(() => items.filter((item) => item.supplierType === 'relay').length, [items]);

  const submitSupplier = async (values: SupplierFormValues) => {
    setBusy(true);
    setError(null);
    try {
      const input: CreateUpstreamSupplierRequest = {
        supplierName: values.supplierName,
        displayName: values.displayName || null,
        description: values.description || null,
        supplierType: values.supplierType,
        defaultVendorCode: values.defaultVendorCode,
        adapterCode: values.adapterCode,
        protocolCode: values.protocolCode,
        websiteUrl: values.websiteUrl || null,
        docsUrl: values.docsUrl || null,
        regionCode: values.regionCode || null,
        environment: values.environment,
        sortOrder: values.sortOrder,
        status: values.status,
      };
      let supplier: UpstreamSupplier;
      if (editing) {
        supplier = await upstreamService.suppliers.update(editing, input);
      } else {
        supplier = await upstreamService.suppliers.create(input);
      }
      if (values.resources.length > 0) {
        try {
          await upstreamService.suppliers.replaceResources(supplier, { items: values.resources });
        } catch (cause) {
          setEditing(undefined);
          setSelected(supplier);
          setError(t('admin.upstream.supplier.errors.resourcesNotSaved'));
          await load();
          return;
        }
      }
      setEditing(undefined);
      await load();
    } catch (cause) {
      setError(errorMessageI18n(cause, t('admin.upstream.common.errors.operationFailed'), t));
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
      setError(errorMessageI18n(cause, t('admin.upstream.common.errors.operationFailed'), t));
    } finally {
      setBusy(false);
    }
  };

  const updateSelected = (supplier: UpstreamSupplier) => {
    setSelected(supplier);
    setItems((current) => current.map((item) => item.id === supplier.id ? supplier : item));
  };

  const typeFilterOptions: { value: 'all' | SupplierType; label: string }[] = [
    { value: 'all', label: t('admin.upstream.supplier.filter.all') },
    { value: 'official', label: t('admin.upstream.supplier.filter.official') },
    { value: 'relay', label: t('admin.upstream.supplier.filter.relay') },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" data-admin-upstream-toolbar>
        <div className="flex flex-wrap items-center gap-2">
          <div data-admin-upstream-search><SearchBox value={query} placeholder={t('admin.upstream.supplier.search.placeholder')} onChange={setQuery} onSubmit={setAppliedQuery} /></div>
          <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 dark:border-white/10 dark:bg-[#171717]">
            {typeFilterOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setTypeFilter(option.value)}
                className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${typeFilter === option.value ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="hidden items-center gap-2 text-xs text-slate-500 dark:text-slate-400 md:flex">
            <span className="inline-flex items-center gap-1"><Building2 className="h-3.5 w-3.5 text-indigo-500" />{t('admin.upstream.supplier.stats.official', { count: officialCount })}</span>
            <span className="text-slate-300 dark:text-slate-600">·</span>
            <span className="inline-flex items-center gap-1"><Share2 className="h-3.5 w-3.5 text-amber-500" />{t('admin.upstream.supplier.stats.relay', { count: relayCount })}</span>
          </div>
        </div>
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
            {filteredItems.length === 0 ? <TableState loading={loading} empty={t('admin.upstream.supplier.empty')} colSpan={6} /> : filteredItems.map((supplier) => (
              <tr key={supplier.id} className="text-slate-700 hover:bg-slate-50/80 dark:text-slate-200 dark:hover:bg-white/[0.03]">
                <td className="px-4 py-3">
                  <button type="button" onClick={() => setSelected(supplier)} className="text-left">
                    <span className="block font-semibold text-slate-900 dark:text-white">{supplier.displayName}</span>
                    <span className="mt-0.5 block font-mono text-xs text-slate-500">{supplier.supplierCode}</span>
                  </button>
                </td>
                <td className="px-4 py-3"><SupplierTypeBadge type={supplier.supplierType as SupplierType} /></td>
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
        <SupplierModal supplier={editing} catalog={catalog} busy={busy} onSubmit={(values) => void submitSupplier(values)} onClose={() => setEditing(undefined)} />
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

function SupplierModal({ supplier, catalog, busy, onSubmit, onClose }: { supplier: UpstreamSupplier | null; catalog: UpstreamResourceCatalogResponse | null; busy: boolean; onSubmit: (values: SupplierFormValues) => void; onClose: () => void }) {
  const { t } = useTranslation();
  const [supplierType, setSupplierType] = useState<SupplierType>(supplier?.supplierType as SupplierType ?? 'official');
  const [defaultVendorCode, setDefaultVendorCode] = useState<string | null>(supplier?.defaultVendorCode ?? null);
  const [adapterCode, setAdapterCode] = useState(supplier?.adapterCode ?? 'openai');
  const [selection, setSelection] = useState<ResourceSelection>(emptyResourceSelection());
  const [resourcesLoading, setResourcesLoading] = useState(Boolean(supplier));
  const [formError, setFormError] = useState<string | null>(null);

  const vendorResources = useMemo(() => (catalog?.resources ?? []).filter((resource) => resource.resourceType === 'vendor'), [catalog]);
  const grantableVendorResources = useMemo(() => {
    if (!defaultVendorCode) return [];
    return (catalog?.resources ?? []).filter((resource) => resource.vendorCode === defaultVendorCode);
  }, [catalog, defaultVendorCode]);
  const vendorGranted = useMemo(() => {
    if (!defaultVendorCode) return false;
    return grantableVendorResources.length > 0 && grantableVendorResources.every((resource) => selection.resourceCodes.includes(resource.resourceCode));
  }, [grantableVendorResources, selection.resourceCodes]);

  useEffect(() => {
    if (!supplier) return;
    let cancelled = false;
    void upstreamService.suppliers.listResources(supplier.id)
      .then((items) => {
        if (!cancelled) setSelection(toSelection(items.map(({ resourceCode, resourceGroupCode, grantType, priority, status }) => ({ resourceCode, resourceGroupCode, grantType, priority, status }))));
      })
      .catch((cause) => {
        if (!cancelled) setFormError(errorMessageI18n(cause, t('admin.upstream.common.errors.operationFailed'), t));
      })
      .finally(() => {
        if (!cancelled) setResourcesLoading(false);
      });
    return () => { cancelled = true; };
  }, [supplier, t]);

  const handleVendorChange = (vendorCode: string) => {
    setDefaultVendorCode(vendorCode);
    if (adapterCode === 'openai' || adapterCode === '') {
      setAdapterCode(vendorCode);
    }
    // 官方供应商的资源集由所选 Vendor 决定：自动勾选其全部资源，资源分组清空，无需用户手动选择
    if (vendorCode) {
      const vendorResourceCodes = (catalog?.resources ?? [])
        .filter((resource) => resource.vendorCode === vendorCode)
        .map((resource) => resource.resourceCode);
      setSelection({ resourceCodes: vendorResourceCodes, resourceGroupCodes: [] });
    }
  };

  const grantVendor = () => {
    setSelection((current) => {
      const selected = new Set(current.resourceCodes);
      grantableVendorResources.forEach((resource) => selected.add(resource.resourceCode));
      return { ...current, resourceCodes: [...selected] };
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    if (!supplierType) return;
    if (supplierType === 'official' && !defaultVendorCode) {
      setFormError(t('admin.upstream.supplier.form.vendor.required'));
      return;
    }
    const values = valuesFromForm(event.currentTarget, supplierType, defaultVendorCode, selection);
    if (!values) {
      setFormError(t('admin.upstream.common.validation.required', { field: t('admin.upstream.supplier.form.supplierName') }));
      return;
    }
    onSubmit(values);
  };

  return (
    <Modal title={supplier ? t('admin.upstream.supplier.form.editTitle') : t('admin.upstream.supplier.form.createTitle')} busy={busy || resourcesLoading} submitLabel={supplier ? t('common.actions.saveChanges') : t('admin.upstream.supplier.form.createAction')} size="xl" fillHeight onSubmit={handleSubmit} onClose={onClose}>
      <div className="grid gap-5 lg:h-full lg:min-h-0 lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)] lg:grid-rows-[minmax(0,1fr)]">
        <div className="grid min-w-0 gap-5 lg:min-h-0 lg:overflow-y-auto">
          <InlineError message={formError} />
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">{t('admin.upstream.supplier.form.supplierType')}<span className="ml-1 text-red-500">*</span></p>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setSupplierType('official')}
                className={`flex items-start gap-3 rounded-lg border p-3 text-left transition ${supplierType === 'official' ? 'border-indigo-500 bg-indigo-50/70 ring-2 ring-indigo-500/20 dark:border-indigo-500/60 dark:bg-indigo-500/10' : 'border-slate-200 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/[0.03]'}`}
              >
                <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${supplierType === 'official' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400'}`}>
                  <Building2 className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-slate-900 dark:text-white">{t('admin.upstream.supplier.type.official')}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-slate-500 dark:text-slate-400">{t('admin.upstream.supplier.type.official.hint')}</span>
                </span>
                {supplierType === 'official' ? <Check className="ml-auto h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-300" /> : null}
              </button>
              <button
                type="button"
                onClick={() => { setSupplierType('relay'); setDefaultVendorCode(null); }}
                className={`flex items-start gap-3 rounded-lg border p-3 text-left transition ${supplierType === 'relay' ? 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-500/20 dark:border-amber-500/60 dark:bg-amber-500/10' : 'border-slate-200 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/[0.03]'}`}
              >
                <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${supplierType === 'relay' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400'}`}>
                  <Share2 className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-slate-900 dark:text-white">{t('admin.upstream.supplier.type.relay')}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-slate-500 dark:text-slate-400">{t('admin.upstream.supplier.type.relay.hint')}</span>
                </span>
                {supplierType === 'relay' ? <Check className="ml-auto h-4 w-4 shrink-0 text-amber-500" /> : null}
              </button>
            </div>
          </div>

          {supplierType === 'official' ? (
            <div className="rounded-md border border-slate-200 p-3 dark:border-white/10">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <Field label={t('admin.upstream.supplier.form.vendor.label')} required className="flex-1">
                  <select
                    className={selectClass}
                    value={defaultVendorCode ?? ''}
                    onChange={(event) => handleVendorChange(event.currentTarget.value)}
                    disabled={vendorResources.length === 0}
                  >
                    <option value="">{t('admin.upstream.supplier.form.vendor.placeholder')}</option>
                    {vendorResources.map((resource) => (
                      <option key={resource.resourceCode} value={resource.vendorCode ?? ''}>{resource.displayName} ({resource.vendorCode})</option>
                    ))}
                  </select>
                </Field>
                <button type="button" className={secondaryButtonClass} onClick={grantVendor} disabled={!defaultVendorCode || grantableVendorResources.length === 0}>
                  {vendorGranted ? <Check className="h-4 w-4 text-emerald-500" /> : null}
                  {vendorGranted ? t('admin.upstream.supplier.form.vendor.granted') : t('admin.upstream.supplier.form.vendor.grantAll')}
                </button>
              </div>
            </div>
          ) : null}

        <FormSection title={t('admin.upstream.supplier.form.section.basic')}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('admin.upstream.supplier.form.supplierName')} required><input name="supplierName" className={inputClass} defaultValue={supplier?.supplierName} required /></Field>
            <Field label={t('admin.upstream.supplier.form.displayName')} hint={t('admin.upstream.supplier.form.displayNameHint')}><input name="displayName" className={inputClass} defaultValue={supplier?.displayName} /></Field>
          </div>
        </FormSection>
        <FormSection title={t('admin.upstream.supplier.form.section.protocol')}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('admin.upstream.supplier.form.protocolCode')} required><input name="protocolCode" className={inputClass} defaultValue={supplier?.protocolCode ?? 'openai'} required /></Field>
            <Field label={t('admin.upstream.supplier.form.adapterCode')} required><input name="adapterCode" className={inputClass} value={adapterCode} onChange={(event) => setAdapterCode(event.currentTarget.value)} required /></Field>
            <Field label={t('admin.upstream.common.fields.environment')}><select name="environment" className={selectClass} defaultValue={supplier?.environment ?? 1}><option value="1">{t('admin.upstream.common.environment.production')}</option><option value="2">{t('admin.upstream.common.environment.sandbox')}</option></select></Field>
            <Field label={t('admin.upstream.common.fields.status')}><select name="status" className={selectClass} defaultValue={supplier?.status ?? 1}><option value="1">{t('common.status.active')}</option><option value="0">{t('common.status.disabled')}</option></select></Field>
            <Field label={t('admin.upstream.supplier.form.sortOrder')}><input name="sortOrder" type="number" min="0" className={inputClass} defaultValue={supplier?.sortOrder ?? 100} /></Field>
            <Field label={t('admin.upstream.common.fields.regionCode')} hint={t('admin.upstream.common.fields.regionCodeHint')}><input name="regionCode" className={inputClass} defaultValue={supplier?.regionCode ?? ''} /></Field>
          </div>
        </FormSection>
        <FormSection title={t('admin.upstream.supplier.form.section.links')}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('admin.upstream.supplier.form.websiteUrl')}><input name="websiteUrl" type="url" className={inputClass} defaultValue={supplier?.websiteUrl ?? ''} /></Field>
            <Field label={t('admin.upstream.supplier.form.documentationUrl')}><input name="docsUrl" type="url" className={inputClass} defaultValue={supplier?.docsUrl ?? ''} /></Field>
          </div>
          <div className="mt-4"><Field label={t('admin.upstream.common.fields.description')}><textarea name="description" className={textAreaClass} defaultValue={supplier?.description ?? ''} /></Field></div>
        </FormSection>
        </div>

        <div className="flex min-w-0 flex-col lg:min-h-0">
          <div className="mb-3 border-b border-slate-200 pb-3 dark:border-white/10">
            <p className="text-sm font-bold text-slate-900 dark:text-white">{t('admin.upstream.supplier.form.resources.title')}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{t('admin.upstream.supplier.form.resources.description')}</p>
          </div>
          {catalog ? (
            <ResourcePicker
              resources={catalog.resources}
              resourceGroups={catalog.resourceGroups}
              selection={selection}
              onChange={setSelection}
              flat
              className="flex min-h-0 flex-1 flex-col"
              listClassName="min-h-0 max-h-72 flex-1 lg:max-h-none"
            />
          ) : (
            <div className="rounded-md border border-slate-200 p-4 text-center text-sm text-slate-500 dark:border-white/10">{t('admin.upstream.common.errors.operationFailed')}</div>
          )}
        </div>
      </div>
    </Modal>
  );
}

function valuesFromForm(form: HTMLFormElement, supplierType: SupplierType, defaultVendorCode: string | null, selection: ResourceSelection): SupplierFormValues | null {
  const formData = new FormData(form);
  const read = (key: string) => String(formData.get(key) ?? '').trim();
  const supplierName = read('supplierName');
  if (!supplierName) return null;
  return {
    supplierName,
    displayName: read('displayName'),
    description: read('description'),
    supplierType,
    defaultVendorCode,
    adapterCode: read('adapterCode') || 'openai',
    protocolCode: read('protocolCode') || 'openai',
    websiteUrl: read('websiteUrl'),
    docsUrl: read('docsUrl'),
    regionCode: read('regionCode'),
    environment: numericFormValue(formData, 'environment', 1),
    sortOrder: numericFormValue(formData, 'sortOrder', 100),
    status: numericFormValue(formData, 'status', 1),
    resources: toEntitlements(selection),
  };
}

function numericFormValue(form: FormData, key: string, fallback: number): number {
  const value = Number(form.get(key));
  return Number.isFinite(value) ? value : fallback;
}

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="min-w-0">
      <h3 className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">{title}</h3>
      {children}
    </section>
  );
}

function SupplierCapabilities({ supplier, onChanged, onClose }: { supplier: UpstreamSupplier; onChanged: (supplier: UpstreamSupplier) => void; onClose: () => void }) {
  const { t } = useTranslation();
  const [endpoints, setEndpoints] = useState<UpstreamSupplierEndpointInput[]>([]);
  const [authMethods, setAuthMethods] = useState<UpstreamSupplierAuthMethodInput[]>([]);
  const [resources, setResources] = useState<UpstreamResourceEntitlementInput[]>([]);
  const [catalog, setCatalog] = useState<UpstreamResourceCatalogResponse | null>(null);
  const [resourcePickerOpen, setResourcePickerOpen] = useState(false);
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
      setAuthMethods(nextAuthMethods.map(({ authMethodCode, authMethodName, authType, configSchema, runtimeAuthConfig, priority, status }) => ({ authMethodCode, authMethodName, authType, configSchema, runtimeAuthConfig, priority, status })));
      setResources(nextResources.map(({ resourceCode, resourceGroupCode, grantType, priority, status }) => ({ resourceCode, resourceGroupCode, grantType, priority, status })));
    } catch (cause) {
      setError(errorMessageI18n(cause, t('admin.upstream.common.errors.operationFailed'), t));
    } finally {
      setLoading(false);
    }
  }, [supplier.id, t]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    let cancelled = false;
    void upstreamService.fetchResourceCatalog()
      .then((value) => {
        if (!cancelled && value && Array.isArray(value.resources) && Array.isArray(value.resourceGroups)) {
          setCatalog(value);
        }
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

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
      setResourcePickerOpen(false);
    } catch (cause) {
      setError(errorMessageI18n(cause, t('admin.upstream.common.errors.operationFailed'), t));
    } finally {
      setBusySection(null);
    }
  };

  const resourceSelection: ResourceSelection = toSelection(resources);
  const setResourceSelection = (next: ResourceSelection) => {
    setResources(toEntitlements(next));
  };
  const removeResource = (index: number) => {
    setResources((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };
  const resourceLabel = (item: UpstreamResourceEntitlementInput) => {
    const code = item.resourceCode ?? item.resourceGroupCode ?? '';
    const resource = catalog?.resources.find((entry) => entry.resourceCode === code);
    const group = catalog?.resourceGroups.find((entry) => entry.groupCode === code);
    return resource?.displayName ?? group?.groupName ?? code;
  };

  // 当前 Vendor 的标准 Base URL（有规则时展示提示）；无 Vendor 或未收录时为空
  const vendorStandardUrl = useMemo(() => vendorStandardBaseUrl(supplier.defaultVendorCode), [supplier.defaultVendorCode]);
  // 运行时默认端点 = active 端点中 priority 最小者（priority ASC → routing_weight DESC → id ASC）
  const defaultEndpointIndex = useMemo(() => {
    let bestIndex = -1;
    endpoints.forEach((endpoint, index) => {
      if (endpoint.status !== 1) return;
      if (bestIndex === -1 || (endpoint.priority ?? 100) < (endpoints[bestIndex].priority ?? 100)) {
        bestIndex = index;
      }
    });
    return bestIndex;
  }, [endpoints]);

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
                {defaultEndpointIndex === index ? <span className="inline-flex w-fit items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300 sm:col-span-2">{t('admin.upstream.supplier.endpoints.default')}</span> : null}
                <input aria-label={t('admin.upstream.supplier.endpoints.code')} placeholder={t('admin.upstream.supplier.endpoints.code')} className={inputClass} value={endpoint.endpointCode} onChange={(event) => setEndpoints(updateAt(endpoints, index, { endpointCode: event.currentTarget.value }))} />
                <input aria-label={t('admin.upstream.supplier.endpoints.name')} placeholder={t('admin.upstream.supplier.endpoints.name')} className={inputClass} value={endpoint.endpointName} onChange={(event) => setEndpoints(updateAt(endpoints, index, { endpointName: event.currentTarget.value }))} />
                <div className="grid gap-1.5 sm:col-span-2">
                  <div className="flex gap-2">
                    <input aria-label={t('admin.upstream.common.fields.baseUrl')} placeholder="https://api.example.com/v1" className={inputClass} value={endpoint.baseUrl} onChange={(event) => setEndpoints(updateAt(endpoints, index, { baseUrl: event.currentTarget.value }))} />
                    <button type="button" title={t('admin.upstream.supplier.endpoints.generate.title')} className={secondaryButtonClass} onClick={() => setEndpoints(updateAt(endpoints, index, { baseUrl: resolveVendorBaseUrl(supplier.defaultVendorCode, endpoint.baseUrl) }))}><Sparkles className="h-4 w-4" /></button>
                  </div>
                  {vendorStandardUrl ? <p className="text-xs text-slate-500 dark:text-slate-400">{t('admin.upstream.supplier.endpoints.generate.hint', { standard: vendorStandardUrl })}</p> : null}
                </div>
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
                  <option value="api_key">{t('admin.upstream.supplier.auth.type.apiKey')}</option><option value="bearer_token">{t('admin.upstream.supplier.auth.type.bearerToken')}</option><option value="custom">{t('admin.upstream.supplier.auth.type.custom')}</option>
                </select>
                <select aria-label={t('admin.upstream.supplier.auth.transport')} className={selectClass} value={method.runtimeAuthConfig.credentialTransport} disabled={method.authType === 'bearer_token'} onChange={(event) => setAuthMethods(updateAt(authMethods, index, { runtimeAuthConfig: authTransportConfig(event.currentTarget.value as 'bearer' | 'header' | 'query') }))}>
                  <option value="bearer">{t('admin.upstream.supplier.auth.transport.bearer')}</option><option value="header">{t('admin.upstream.supplier.auth.transport.header')}</option><option value="query">{t('admin.upstream.supplier.auth.transport.query')}</option>
                </select>
                {method.runtimeAuthConfig.credentialTransport !== 'bearer' ? <input aria-label={t('admin.upstream.supplier.auth.credentialParameter')} placeholder={t('admin.upstream.supplier.auth.credentialParameter')} className={inputClass} value={method.runtimeAuthConfig.credentialParameter ?? ''} onChange={(event) => setAuthMethods(updateAt(authMethods, index, { runtimeAuthConfig: { ...method.runtimeAuthConfig, credentialParameter: emptyToNull(event.currentTarget.value) } }))} /> : null}
                <div className="flex items-center justify-end sm:col-span-2"><button type="button" className={dangerButtonClass} onClick={() => setAuthMethods(removeAt(authMethods, index))}><Trash2 className="h-4 w-4" />{t('admin.upstream.common.actions.remove')}</button></div>
              </div>
            ))}
            {!loading && authMethods.length === 0 ? <p className="py-6 text-center text-sm text-slate-500">{t('admin.upstream.supplier.auth.empty')}</p> : null}
            <button type="button" className={primaryButtonClass} disabled={busySection !== null} onClick={() => void save('authMethods')}>{t('admin.upstream.supplier.auth.save')}</button>
          </div>
        </Section>
        <Section title={t('admin.upstream.supplier.resources.title')} action={<button type="button" className={secondaryButtonClass} onClick={() => setResourcePickerOpen((current) => !current)}><Plus className="h-4 w-4" />{t('admin.upstream.supplier.resources.add')}</button>}>
          <div className="grid gap-3">
            {resourcePickerOpen && catalog ? (
              <ResourcePicker resources={catalog.resources} resourceGroups={catalog.resourceGroups} selection={resourceSelection} onChange={setResourceSelection} />
            ) : null}
            {resources.length === 0 && !resourcePickerOpen ? <p className="py-6 text-center text-sm text-slate-500">{t('admin.upstream.supplier.resources.empty')}</p> : null}
            <div className="flex flex-wrap gap-2">
              {resources.map((resource, index) => (
                <span key={`${resource.resourceCode ?? resource.resourceGroupCode}-${index}`} className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 py-1 pl-2.5 pr-1.5 dark:border-white/10 dark:bg-white/5">
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-medium text-slate-700 dark:text-slate-200">{resourceLabel(resource)}</span>
                    <span className="block truncate font-mono text-[10px] text-slate-400">{resource.resourceCode ?? resource.resourceGroupCode}</span>
                  </span>
                  <button type="button" title={t('common.actions.delete')} className="rounded-full p-0.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-300" onClick={() => removeResource(index)}><Trash2 className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
            <button type="button" className={primaryButtonClass} disabled={busySection !== null} onClick={() => void save('resources')}>{t('admin.upstream.supplier.resources.save')}</button>
          </div>
        </Section>
      </div>
    </SidePanel>
  );
}

function authTypePatch(authType: UpstreamSupplierAuthMethodInput['authType']): Partial<UpstreamSupplierAuthMethodInput> {
  return { authType, runtimeAuthConfig: authTransportConfig('bearer') };
}

function authTransportConfig(credentialTransport: 'bearer' | 'header' | 'query') {
  const credentialParameter = credentialTransport === 'header'
    ? 'x-api-key'
    : credentialTransport === 'query'
      ? 'key'
      : null;
  return { credentialTransport, credentialParameter, defaultHeaders: {} };
}

function updateAt<T>(items: T[], index: number, patch: Partial<T>): T[] {
  return items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item);
}

function removeAt<T>(items: T[], index: number): T[] {
  return items.filter((_, itemIndex) => itemIndex !== index);
}

function emptyToNull(value: string): string | null {
  return value.trim() || null;
}
