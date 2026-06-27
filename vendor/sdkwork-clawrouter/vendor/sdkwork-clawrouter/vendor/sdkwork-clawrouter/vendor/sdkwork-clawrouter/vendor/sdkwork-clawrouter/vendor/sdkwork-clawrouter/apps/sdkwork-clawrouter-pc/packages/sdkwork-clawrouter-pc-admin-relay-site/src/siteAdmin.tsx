import React, { useEffect, useMemo, useState } from 'react';
import { AdminTableShell, BusinessStateTableRow, ConfirmDialog, readMediaResourceUrl } from '@sdkwork/clawroutes-pc-commons';
import { Edit, Globe2, Image as ImageIcon, Loader2, Plus, RefreshCw, Search, Trash2, Upload, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ModelService, type Vendor } from '@sdkwork/models-pc-admin-catalog/modelService';
import { VendorPickerModal } from '@sdkwork/models-pc-admin-catalog/vendorPickerModal';
import { SiteService, type SiteItem } from './siteService';

type SiteFormFieldErrorKey = 'siteName' | 'displayName' | 'baseUrl' | 'websiteUrl' | 'docsUrl' | 'domains' | 'vendorCodes';


export function SiteAdmin() {
  const { t } = useTranslation();
  const [sites, setSites] = useState<SiteItem[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSiteModalOpen, setIsSiteModalOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<SiteItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SiteItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const selectedSite = sites.find((site) => site.id === selectedSiteId) ?? null;

  const loadSites = async (query = search) => {
    setLoading(true);
    setLoadError(null);
    try {
      const normalizedQuery = query.trim();
      const [items, vendorItems] = await Promise.all([
        normalizedQuery ? SiteService.fetchSites(normalizedQuery) : SiteService.fetchSites(),
        ModelService.fetchVendors(),
      ]);
      setSites(items);
      setVendors(vendorItems);
      const nextSelectedId = items.some((item) => item.id === selectedSiteId)
        ? selectedSiteId
        : items[0]?.id ?? null;
      setSelectedSiteId(nextSelectedId);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Failed to load sites');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSites();
  }, []);

  const openCreateSite = () => {
    setEditingSite(null);
    setIsSiteModalOpen(true);
  };

  const openEditSite = (site: SiteItem) => {
    setEditingSite(site);
    setIsSiteModalOpen(true);
  };

  const handleSiteSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setLoadError(null);
    try {
      const input = siteInputFromForm(formData);
      if (editingSite) {
        const updated = await SiteService.updateSite(editingSite.id, input);
        setSites((current) => current.map((site) => (site.id === updated.id ? updated : site)));
      } else {
        const created = await SiteService.createSite(input);
        setSites((current) => [...current, created]);
        setSelectedSiteId(created.id);
      }
      setIsSiteModalOpen(false);
      setEditingSite(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Failed to save site');
    }
  };

  const confirmDeleteSite = async () => {
    if (!deleteTarget) {
      return;
    }
    setDeleting(true);
    setLoadError(null);
    try {
      const deleted = await SiteService.deleteSite(deleteTarget.id);
      if (deleted) {
        setSites((current) => current.filter((item) => item.id !== deleteTarget.id));
        setSelectedSiteId((current) => (current === deleteTarget.id ? null : current));
      }
      setDeleteTarget(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : t('admin.model.site.errors.deleteFailed'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-slate-50 text-slate-900 dark:bg-[#0f0f10] dark:text-slate-100">
      <AdminTableShell
        data-admin-site-table-card
        className="flex-1 min-h-0"
        viewportClassName="min-h-0 flex-1"
        viewportProps={{ 'data-admin-site-table-viewport': true }}
        header={(
          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  void loadSites(search);
                }
              }}
              placeholder={t('admin.model.site.search.placeholder')}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => void loadSites(search)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
            >
              <RefreshCw className="h-4 w-4" />
              {t('common.actions.refresh')}
            </button>
            <button
              type="button"
              onClick={openCreateSite}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              {t('admin.model.site.actions.add')}
            </button>
          </div>
        </div>
        )}
      >

        {loadError && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
            {loadError}
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#171719]">
          <table className="w-full min-w-[1040px] text-left text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-[#121212] dark:text-slate-400">
              <tr>
                <th className="px-5 py-3">{t('admin.model.site.table.name')}</th>
                <th className="px-5 py-3">{t('admin.model.site.table.baseUrl')}</th>
                <th className="px-5 py-3">{t('admin.model.site.table.domains')}</th>
                <th className="px-5 py-3">{t('admin.model.site.table.vendors')}</th>
                <th className="px-5 py-3">{t('admin.model.site.table.healthStatus')}</th>
                <th className="px-5 py-3">{t('admin.model.site.table.status')}</th>
                <th className="px-5 py-3 text-right">{t('admin.model.table.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/10">
              {loading ? (
                <BusinessStateTableRow colSpan={7} icon={<Loader2 className="h-5 w-5 animate-spin" />} title={t('admin.model.site.state.loading')} />
              ) : sites.length === 0 ? (
                <BusinessStateTableRow colSpan={7} icon={<Globe2 className="h-5 w-5" />} title={t('admin.model.site.state.empty')} />
              ) : sites.map((site) => (
                <tr
                  key={site.id}
                  className={`cursor-pointer transition hover:bg-slate-50 dark:hover:bg-white/5 ${selectedSite?.id === site.id ? 'bg-indigo-50/70 dark:bg-indigo-500/10' : ''}`}
                  onClick={() => setSelectedSiteId(site.id)}
                >
                  <td className="px-5 py-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <SiteLogo site={site} />
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-slate-900 dark:text-white">{site.displayName}</div>
                        <div className="truncate text-xs text-slate-500">{site.siteName}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-slate-600 dark:text-slate-300">{site.baseUrl}</td>
                  <td className="px-5 py-4">
                    <SiteDomainList site={site} />
                  </td>
                  <td className="px-5 py-4">
                    <SiteVendorList site={site} vendors={vendors} />
                  </td>
                  <td className="px-5 py-4">
                    <StatusPill value={site.healthStatus} />
                  </td>
                  <td className="px-5 py-4">
                    <StatusPill value={site.status} />
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={(event) => { event.stopPropagation(); openEditSite(site); }} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/10 dark:hover:text-white">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={(event) => { event.stopPropagation(); setDeleteTarget(site); }} className="rounded-lg p-2 text-rose-500 transition hover:bg-rose-50 dark:hover:bg-rose-500/10">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminTableShell>

      {isSiteModalOpen && (
        <SiteFormModal
          site={editingSite}
          vendors={vendors}
          onSubmit={handleSiteSubmit}
          onClose={() => { setIsSiteModalOpen(false); setEditingSite(null); }}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title={t('admin.model.site.deleteDialog.title')}
          description={t('admin.model.site.deleteDialog.description', { name: deleteTarget.displayName })}
          confirmLabel={t('admin.model.site.actions.delete')}
          cancelLabel={t('common.actions.cancel')}
          isBusy={deleting}
          tone="danger"
          onConfirm={() => void confirmDeleteSite()}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}


function SiteLogo({ site }: { site: SiteItem }) {
  const logoUrl = readMediaResourceUrl(site.logo);
  if (!logoUrl) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-400 dark:border-white/10 dark:bg-white/5">
        <Globe2 className="h-4 w-4" />
      </div>
    );
  }
  return (
    <img
      src={logoUrl}
      alt=""
      className="h-10 w-10 shrink-0 rounded-lg border border-slate-200 bg-white object-contain p-1 dark:border-white/10 dark:bg-white"
    />
  );
}

function SiteDomainList({ site }: { site: SiteItem }) {
  const domains = siteDomains(site);
  if (domains.length === 0) {
    return <span className="text-xs text-slate-400">-</span>;
  }
  return (
    <div className="flex max-w-[260px] flex-wrap gap-1.5">
      {domains.slice(0, 3).map((domain) => (
        <span key={domain} className="max-w-[180px] truncate rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 dark:bg-white/10 dark:text-slate-300">
          {domain}
        </span>
      ))}
      {domains.length > 3 && (
        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500 dark:bg-white/10 dark:text-slate-400">
          +{domains.length - 3}
        </span>
      )}
    </div>
  );
}

function SiteVendorList({ site, vendors }: { site: SiteItem; vendors: readonly Vendor[] }) {
  if (site.vendorCodes.length === 0) {
    return <span className="text-xs text-slate-400">-</span>;
  }
  return (
    <div className="flex max-w-[220px] flex-wrap gap-1.5">
      {site.vendorCodes.slice(0, 3).map((vendorCode) => (
        <span key={vendorCode} className="max-w-[150px] truncate rounded-md bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-200">
          {vendorLabel(vendorCode, vendors)}
        </span>
      ))}
      {site.vendorCodes.length > 3 && (
        <span className="rounded-md bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
          +{site.vendorCodes.length - 3}
        </span>
      )}
    </div>
  );
}


function SiteFormModal({ site, vendors, onSubmit, onClose }: { site: SiteItem | null; vendors: readonly Vendor[]; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void; onClose: () => void }) {
  const { t } = useTranslation();
  const [logo, setLogo] = useState(() => site?.logo ?? null);
  const [isVendorPickerOpen, setIsVendorPickerOpen] = useState(false);
  const [selectedVendorCodes, setSelectedVendorCodes] = useState<string[]>(() => site?.vendorCodes ?? []);
  const [domainInputs, setDomainInputs] = useState<string[]>(() => {
    const domains = siteDomains(site);
    return domains.length > 0 ? domains : [''];
  });
  const [siteFormErrors, setSiteFormErrors] = useState<Partial<Record<SiteFormFieldErrorKey, string>>>({});
  const logoPreviewUrl = readMediaResourceUrl(logo);
  const vendorByCode = useMemo(() => new Map(vendors.map((vendor) => [vendor.vendorCode, vendor])), [vendors]);

  const clearSiteFormError = (field: SiteFormFieldErrorKey) => {
    setSiteFormErrors((current) => {
      if (!current[field]) {
        return current;
      }
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (result) {
        setLogo({
          kind: 'image',
          source: 'data_url',
          url: result,
          publicUrl: result,
          fileName: file.name,
          mimeType: file.type || 'image/*',
          sizeBytes: String(file.size),
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const selectVendorCode = (vendorCode: string) => {
    clearSiteFormError('vendorCodes');
    setSelectedVendorCodes((current) => current.includes(vendorCode) ? current : [...current, vendorCode]);
  };

  const removeSelectedVendorCode = (vendorCode: string) => {
    clearSiteFormError('vendorCodes');
    setSelectedVendorCodes((current) => current.filter((item) => item !== vendorCode));
  };

  const updateDomainInput = (index: number, value: string) => {
    clearSiteFormError('domains');
    setDomainInputs((current) => current.map((item, itemIndex) => (itemIndex === index ? value : item)));
  };

  const addDomainInput = () => {
    clearSiteFormError('domains');
    setDomainInputs((current) => [...current, '']);
  };

  const removeDomainInput = (index: number) => {
    clearSiteFormError('domains');
    setDomainInputs((current) => {
      if (current.length <= 1) {
        return [''];
      }
      const next = current.filter((_, itemIndex) => itemIndex !== index);
      return next.length > 0 ? next : [''];
    });
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    const formData = new FormData(event.currentTarget);
    const errors = validateSiteFormDraft(formData, domainInputs, selectedVendorCodes, t);
    if (Object.keys(errors).length > 0) {
      event.preventDefault();
      setSiteFormErrors(errors);
      return;
    }
    setSiteFormErrors({});
    onSubmit(event);
  };

  useEffect(() => {
    if (selectedVendorCodes.length > 0) {
      clearSiteFormError('vendorCodes');
    }
  }, [selectedVendorCodes]);

  return (
    <div data-admin-site-form-drawer className="fixed inset-0 z-[60] flex justify-start bg-slate-950/50 backdrop-blur-sm">
      <aside data-admin-site-form-drawer-panel className="flex h-full w-[min(94vw,1120px)] flex-col overflow-hidden rounded-r-2xl border-r border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#171719]">
        <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-white/10">
          <h3 className="font-semibold text-slate-900 dark:text-white">{site ? t('admin.model.site.form.editTitle') : t('admin.model.site.form.createTitle')}</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <input name="logo" type="hidden" value={logo ? JSON.stringify(logo) : ''} />
          <input name="vendorCodes" type="hidden" value={JSON.stringify(selectedVendorCodes)} />
          <input name="domains" type="hidden" value={domainInputs.join('\n')} />
          <div data-admin-site-form-layout className="grid min-h-0 flex-1 gap-0 overflow-hidden lg:grid-cols-[minmax(0,1fr)_minmax(320px,380px)]">
            <div className="min-h-0 overflow-y-auto p-5">
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormInput name="siteName" label={t('admin.model.site.form.siteName')} defaultValue={site?.siteName} required error={siteFormErrors.siteName} onChange={() => clearSiteFormError('siteName')} />
                  <FormInput name="displayName" label={t('admin.model.site.form.displayName')} defaultValue={site?.displayName} required error={siteFormErrors.displayName} onChange={() => clearSiteFormError('displayName')} />
                  <FormInput name="baseUrl" label={t('admin.model.site.form.baseUrl')} defaultValue={site?.baseUrl} required error={siteFormErrors.baseUrl} onChange={() => clearSiteFormError('baseUrl')} />
                  <FormInput name="websiteUrl" label={t('admin.model.site.form.websiteUrl')} defaultValue={site?.websiteUrl ?? ''} error={siteFormErrors.websiteUrl} onChange={() => clearSiteFormError('websiteUrl')} />
                  <FormInput name="docsUrl" label={t('admin.model.site.form.docsUrl')} defaultValue={site?.docsUrl ?? ''} error={siteFormErrors.docsUrl} onChange={() => clearSiteFormError('docsUrl')} />
                  <FormInput name="regionCode" label={t('admin.model.site.form.regionCode')} defaultValue={site?.regionCode ?? ''} />
                  <FormInput name="maskedLabel" label={t('admin.model.site.form.maskedLabel')} defaultValue="" />
                </div>

                <div className="grid gap-4 sm:grid-cols-[220px_minmax(0,1fr)]">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{t('admin.model.site.form.logo')}</span>
                    <span
                      data-admin-site-logo-upload-panel
                      className="relative flex h-28 w-28 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-slate-400 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 dark:border-white/10 dark:bg-white/5 dark:hover:border-indigo-500/40 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300"
                    >
                      <span data-admin-site-logo-upload-placeholder className="flex h-full w-full items-center justify-center">
                        {logoPreviewUrl ? (
                          <img src={logoPreviewUrl} alt="" className="h-full w-full object-contain p-3" />
                        ) : (
                          <ImageIcon className="h-9 w-9" />
                        )}
                      </span>
                      <span className="absolute bottom-2 right-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm ring-1 ring-slate-200 dark:bg-[#171719] dark:text-slate-300 dark:ring-white/10">
                        <Upload className="h-4 w-4" />
                      </span>
                      <input data-admin-site-logo-upload-control type="file" accept="image/*" onChange={handleLogoChange} className="sr-only" />
                    </span>
                  </label>
                  <div>
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <span className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('admin.model.site.form.domains')}</span>
                      <button
                        type="button"
                        data-admin-site-domain-add
                        onClick={addDomainInput}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-indigo-500/40 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-200"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        {t('admin.model.site.form.addDomain')}
                      </button>
                    </div>
                    <div data-admin-site-domain-input-list className={`space-y-2 rounded-xl border p-2 ${siteFormErrors.domains ? 'border-rose-300 bg-rose-50/40 dark:border-rose-500/50 dark:bg-rose-500/10' : 'border-slate-200 bg-slate-50/70 dark:border-white/10 dark:bg-white/5'}`}>
                      {domainInputs.map((domain, index) => (
                        <div key={index} data-admin-site-domain-input-row className="flex items-center gap-2">
                          <input
                            data-admin-site-domain-input
                            value={domain}
                            onChange={(event) => updateDomainInput(index, event.currentTarget.value)}
                            placeholder={t('admin.model.site.form.domainPlaceholder')}
                            aria-invalid={Boolean(siteFormErrors.domains)}
                            className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-white/10 dark:bg-[#171719] dark:text-white"
                          />
                          <button
                            type="button"
                            data-admin-site-domain-remove
                            onClick={() => removeDomainInput(index)}
                            disabled={domainInputs.length <= 1}
                            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-500 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
                            title={t('admin.model.site.form.removeDomain')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                    {siteFormErrors.domains && <span className="mt-1.5 block text-xs font-medium text-rose-600 dark:text-rose-300">{siteFormErrors.domains}</span>}
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{t('admin.model.site.form.description')}</label>
                  <textarea name="description" defaultValue={site?.description ?? ''} rows={3} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-white/10 dark:bg-white/5 dark:text-white" />
                </div>
              </div>
            </div>
            <aside data-admin-site-supported-vendors-panel className="flex min-h-0 flex-col border-t border-slate-200 bg-slate-50/70 p-5 dark:border-white/10 dark:bg-[#121214] lg:border-l lg:border-t-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{t('admin.model.site.form.supportedVendors')}</h4>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('admin.model.site.form.supportedVendorsHint')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsVendorPickerOpen(true)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t('admin.model.site.form.selectVendors')}
                </button>
              </div>
              {siteFormErrors.vendorCodes && <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">{siteFormErrors.vendorCodes}</div>}
              <div data-admin-site-supported-vendor-table className="mt-4 min-h-0 flex-1 overflow-auto rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#171719]">
                {selectedVendorCodes.length === 0 ? (
                  <div className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400">{t('admin.model.site.form.noVendors')}</div>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 bg-slate-50 text-xs font-semibold text-slate-500 dark:bg-[#121214] dark:text-slate-400">
                      <tr>
                        <th className="px-3 py-2">{t('admin.model.site.form.vendorColumns.vendor')}</th>
                        <th className="px-3 py-2">{t('admin.model.site.form.vendorColumns.code')}</th>
                        <th className="px-3 py-2">{t('admin.model.site.form.vendorColumns.status')}</th>
                        <th className="px-3 py-2 text-right">{t('admin.model.table.actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                      {selectedVendorCodes.map((vendorCode) => {
                        const vendor = vendorByCode.get(vendorCode);
                        return (
                          <tr key={vendorCode} data-admin-site-supported-vendor-row className="hover:bg-slate-50 dark:hover:bg-white/5">
                            <td className="min-w-0 px-3 py-2">
                              <div className="truncate font-medium text-slate-900 dark:text-white">{vendor?.name ?? vendorCode}</div>
                            </td>
                            <td className="px-3 py-2 font-mono text-xs text-slate-500">{vendorCode}</td>
                            <td className="px-3 py-2 text-xs text-slate-500">{vendor?.status ?? '-'}</td>
                            <td className="px-3 py-2">
                              <div className="flex justify-end">
                                <button
                                  type="button"
                                  data-admin-site-supported-vendor-remove
                                  onClick={() => removeSelectedVendorCode(vendorCode)}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-rose-500 transition hover:bg-rose-50 dark:hover:bg-rose-500/10"
                                  title={t('admin.model.site.form.removeVendor')}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </aside>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-slate-200 p-5 dark:border-white/10">
            <div className="text-xs text-slate-500 dark:text-slate-400">{t('admin.model.site.form.saveHint')}</div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10">{t('common.actions.cancel')}</button>
              <button type="submit" className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700">{t('common.actions.save')}</button>
            </div>
          </div>
        </form>
      </aside>
      <button type="button" aria-label={t('common.actions.closeDrawer')} className="flex-1" onClick={onClose} />
      {isVendorPickerOpen && (
        <VendorPickerModal
          selectionMode="multiple"
          vendors={vendors}
          title={t('admin.model.site.form.supportedVendors')}
          searchPlaceholder={t('admin.model.mapping.form.vendorPicker.searchPlaceholder')}
          selectedVendorCodes={selectedVendorCodes}
          onSelectionChange={setSelectedVendorCodes}
          onSelect={(vendor) => {
            selectVendorCode(vendor.vendorCode);
          }}
          onClose={() => setIsVendorPickerOpen(false)}
        />
      )}
    </div>
  );
}


function FormInput({
  name,
  label,
  defaultValue,
  required = false,
  error,
  onChange,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  required?: boolean;
  error?: string;
  onChange?: () => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue ?? ''}
        required={required}
        onChange={onChange}
        aria-invalid={Boolean(error)}
        className={`w-full rounded-xl border bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:ring-1 dark:bg-white/5 dark:text-white ${error ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500 dark:border-rose-500/50' : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 dark:border-white/10'}`}
      />
      {error && <span className="mt-1.5 block text-xs font-medium text-rose-600 dark:text-rose-300">{error}</span>}
    </label>
  );
}


function StatusPill({ value }: { value: string }) {
  const tone = value === 'active' || value === 'healthy' || value === 'success'
    ? 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-500/30'
    : value === 'disabled' || value === 'unhealthy' || value === 'failed'
      ? 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-200 dark:ring-rose-500/30'
      : 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/30';
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${tone}`}>
      {value}
    </span>
  );
}


function validateSiteFormDraft(
  formData: FormData,
  domainInputs: readonly string[],
  selectedVendorCodes: readonly string[],
  t: (key: string, options?: Record<string, unknown>) => string,
): Partial<Record<SiteFormFieldErrorKey, string>> {
  const errors: Partial<Record<SiteFormFieldErrorKey, string>> = {};
  if (!readFormString(formData, 'siteName')) {
    errors.siteName = t('admin.model.site.form.validation.siteNameRequired');
  }
  if (!readFormString(formData, 'displayName')) {
    errors.displayName = t('admin.model.site.form.validation.displayNameRequired');
  }
  const baseUrl = readFormString(formData, 'baseUrl');
  if (!baseUrl) {
    errors.baseUrl = t('admin.model.site.form.validation.baseUrlRequired');
  } else if (!isValidHttpUrl(baseUrl)) {
    errors.baseUrl = t('admin.model.site.form.validation.urlInvalid');
  }
  for (const field of ['websiteUrl', 'docsUrl'] as const) {
    const value = readFormString(formData, field);
    if (value && !isValidHttpUrl(value)) {
      errors[field] = t('admin.model.site.form.validation.urlInvalid');
    }
  }
  const normalizedDomains = domainInputs.map((domain) => domain.trim()).filter(Boolean);
  const seenDomains = new Set<string>();
  for (const domain of normalizedDomains) {
    const normalizedDomain = domain.toLowerCase();
    if (!isValidSiteDomain(domain)) {
      errors.domains = t('admin.model.site.form.validation.domainInvalid', { domain });
      break;
    }
    if (seenDomains.has(normalizedDomain)) {
      errors.domains = t('admin.model.site.form.validation.domainDuplicate', { domain });
      break;
    }
    seenDomains.add(normalizedDomain);
  }
  if (selectedVendorCodes.length === 0) {
    errors.vendorCodes = t('admin.model.site.form.validation.vendorRequired');
  }
  return errors;
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isValidSiteDomain(value: string): boolean {
  const domain = value.trim();
  if (!domain || domain.length > 253 || /\s/u.test(domain) || /[/?#]/u.test(domain) || /^https?:\/\//iu.test(domain)) {
    return false;
  }
  const withoutPort = domain.startsWith('[')
    ? domain
    : domain.replace(/:\d{1,5}$/u, '');
  if (withoutPort === 'localhost') {
    return true;
  }
  return /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])$/iu.test(withoutPort);
}

function siteInputFromForm(formData: FormData) {
  const siteName = readFormString(formData, 'siteName');
  const displayName = readFormString(formData, 'displayName') || siteName;
  const baseUrl = readFormString(formData, 'baseUrl');
  const domains = parseMultilineFormList(formData, 'domains');
  const vendorCodes = parseJsonStringArrayFormValue(formData, 'vendorCodes');
  return {
    siteName,
    displayName,
    baseUrl,
    description: readOptionalFormString(formData, 'description'),
    websiteUrl: readOptionalFormString(formData, 'websiteUrl'),
    docsUrl: readOptionalFormString(formData, 'docsUrl'),
    logo: readSiteLogoFromForm(formData),
    domains,
    vendorCodes,
    regionCode: readOptionalFormString(formData, 'regionCode'),
    maskedLabel: readOptionalFormString(formData, 'maskedLabel'),
    siteType: 'relay' as const,
    environment: 'production' as const,
    status: 'active' as const,
  };
}

function siteDomains(site: SiteItem | null): string[] {
  if (!site) {
    return [];
  }
  const domains = site.domains.length > 0 ? site.domains : [site.baseUrl, site.websiteUrl, site.docsUrl].filter((value): value is string => Boolean(value));
  return domains
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}


function vendorLabel(vendorCode: string, vendors: readonly Vendor[]): string {
  return vendors.find((vendor) => vendor.vendorCode === vendorCode)?.name ?? vendorCode;
}
function readFormString(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

function readOptionalFormString(formData: FormData, name: string): string | null {
  const value = readFormString(formData, name);
  return value || null;
}

function readSiteLogoFromForm(formData: FormData) {
  const value = readFormString(formData, 'logo');
  if (!value) {
    return null;
  }
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && typeof parsed.kind === 'string' && typeof parsed.source === 'string') {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

function parseMultilineFormList(formData: FormData, name: string): string[] {
  return readFormString(formData, name)
    .split(/[\n,]+/u)
    .map((value) => value.trim())
    .filter((value, index, values) => value.length > 0 && values.indexOf(value) === index);
}

function parseJsonStringArrayFormValue(formData: FormData, name: string): string[] {
  const value = readFormString(formData, name);
  if (!value) {
    return [];
  }
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter((item, index, values) => item.length > 0 && values.indexOf(item) === index);
    }
  } catch {
    return [];
  }
  return [];
}

