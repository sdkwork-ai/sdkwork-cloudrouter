import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { ChevronDown, Edit3, Plus, Trash2 } from 'lucide-react';
import { BottomPagination } from '@sdkwork/cloudroutes-pc-commons';
import { useTranslation } from 'react-i18next';
import {
  pricingService,
  type AdminOfficialPricingProductCatalog,
  type AdminOfficialPricingProductItem,
  type AdminOfficialPricingRateItem,
  type AdminPricingPlanItem,
  type AdminPricingRuleItem,
  type AdminPricingRuleMutationInput,
  type AdminPricingSchedule,
  type AdminPricingScheduleWindow,
  type AdminPricingStatus,
} from './pricingService';
import {
  buildPriceSettingProductRows,
  formatPricingMoney,
  normalizePricingDecimal,
  officialRateQualifier,
  officialRateUnit,
  type PriceSettingProductRow,
} from './priceSettingModel';
import {
  AdminListToolbar,
  AdminPageShell,
  AdminTableArea,
  errorMessageI18n,
  Field,
  InlineError,
  inputClass,
  primaryButtonClass,
  SearchBox,
  secondaryButtonClass,
  selectClass,
  toolbarSelectClass,
  SidePanel,
  StatusBadge,
  TableState,
} from './components';

type TranslationFunction = ReturnType<typeof useTranslation>['t'];
export const PRICE_SETTING_RESOURCE_TYPES = ['all', 'llm', 'image', 'video', 'audio', 'music', 'embedding', 'sound', 'api', 'other'] as const;
type PriceSettingResourceType = (typeof PRICE_SETTING_RESOURCE_TYPES)[number];
const STATUSES: AdminPricingStatus[] = ['active', 'inactive'];
const DAY_OPTIONS = [1, 2, 3, 4, 5, 6, 7] as const;
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
type PriceSettingMode = 'standard' | 'time_window';

const DEFAULT_WINDOW: AdminPricingScheduleWindow = {
  windowCode: 'business-hours',
  daysOfWeek: [1, 2, 3, 4, 5],
  startTime: '09:00',
  endTime: '12:00',
  endDayOffset: 0,
};

export interface PriceSettingMeterForm {
  key: string;
  rateCode?: string;
  ruleId?: string;
  ruleCode?: string;
  meterCode: string;
  operationCode: string;
  unitCode: string;
  unitSize: string;
  official?: AdminOfficialPricingRateItem;
  customerPrice: string;
}

export interface PriceSettingFormState {
  catalogKey: string;
  vendorCode: string;
  productCode: string;
  providerCode: string;
  regionCode: string;
  resourceType: Exclude<PriceSettingResourceType, 'all'>;
  pricingPlanId: string;
  meterPrices: PriceSettingMeterForm[];
  priceMode: PriceSettingMode;
  timeZone: string;
  weeklyWindows: AdminPricingScheduleWindow[];
  includeDates: string;
  excludeDates: string;
  priority: string;
  effectiveFrom: string;
  effectiveTo: string;
  status: AdminPricingStatus;
}

function emptyMeter(key = 'meter-1'): PriceSettingMeterForm {
  return { key, meterCode: '', operationCode: '', unitCode: 'unit', unitSize: '1', customerPrice: '' };
}

const EMPTY_FORM: PriceSettingFormState = {
  catalogKey: '', vendorCode: '', productCode: '', providerCode: '', regionCode: '', resourceType: 'llm', pricingPlanId: '',
  meterPrices: [emptyMeter()], priceMode: 'standard', timeZone: 'Asia/Shanghai', weeklyWindows: [{ ...DEFAULT_WINDOW }],
  includeDates: '', excludeDates: '', priority: '100', effectiveFrom: '', effectiveTo: '', status: 'active',
};

export function PriceSettingsAdmin() {
  const { t, i18n } = useTranslation();
  const displayLocale = i18n.resolvedLanguage ?? i18n.language ?? 'en-US';
  const [officialCatalog, setOfficialCatalog] = useState<AdminOfficialPricingProductCatalog | null>(null);
  const [rules, setRules] = useState<AdminPricingRuleItem[]>([]);
  const [plans, setPlans] = useState<AdminPricingPlanItem[]>([]);
  const [resourceType, setResourceType] = useState<PriceSettingResourceType>('all');
  const [regionCode, setRegionCode] = useState('');
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [form, setForm] = useState<PriceSettingFormState>(EMPTY_FORM);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [pricingRules, pricingPlans, officialPrices] = await Promise.all([
        pricingService.rules.list({ page: 1, pageSize: 200, q: appliedSearch || undefined }),
        pricingService.plans.list({ page: 1, pageSize: 200, status: 'active' }),
        pricingService.officialProducts.list({ category: resourceType, q: appliedSearch || undefined, regionCode: regionCode || undefined, page, pageSize }),
      ]);
      setRules(pricingRules.items); setPlans(pricingPlans.items); setOfficialCatalog(officialPrices);
      setForm((current) => current.pricingPlanId || !pricingPlans.items[0] ? current : { ...current, pricingPlanId: pricingPlans.items[0].id });
    } catch (cause) {
      setError(errorMessageI18n(cause, t('admin.pricing.settings.errors.loadFailed'), t));
    } finally { setLoading(false); }
  }, [appliedSearch, page, pageSize, regionCode, resourceType, t]);

  useEffect(() => { void load(); }, [load]);

  const productRows = useMemo(() => buildPriceSettingProductRows(officialCatalog?.items ?? [], rules), [officialCatalog?.items, rules]);
  const customRules = useMemo(() => {
    if (page !== 1) return [];
    const normalizedSearch = appliedSearch.trim().toLowerCase();
    return rules.filter((rule) => !productRows.matchedRuleIds.has(rule.id)).filter((rule) => !rule.catalogKey)
      .filter((rule) => resourceType === 'all' || resourceTypeOf(rule) === resourceType)
      .filter((rule) => !normalizedSearch || [rule.productCode, rule.operationCode, rule.meterCode, rule.ruleCode].filter(Boolean).some((value) => value!.toLowerCase().includes(normalizedSearch)));
  }, [appliedSearch, page, productRows.matchedRuleIds, resourceType, rules]);
  const counts = useMemo(() => {
    const values = new Map<PriceSettingResourceType, string>(PRICE_SETTING_RESOURCE_TYPES.map((type) => [type, '0']));
    for (const group of officialCatalog?.groups ?? []) if (isPriceSettingResourceType(group.code)) values.set(group.code, group.count);
    if (!officialCatalog?.groups.some((group) => group.code === 'all') && resourceType === 'all' && officialCatalog?.pageInfo.totalItems) values.set('all', officialCatalog.pageInfo.totalItems);
    return values;
  }, [officialCatalog, resourceType]);
  const resourceTabs = useMemo(() => {
    const supported = new Set((officialCatalog?.groups ?? []).map((group) => group.code).filter(isPriceSettingResourceType));
    supported.add(resourceType);
    return PRICE_SETTING_RESOURCE_TYPES.filter((type) => type === 'all' || supported.has(type));
  }, [officialCatalog?.groups, resourceType]);
  const summary = useMemo(() => ({
    products: productRows.rows.length,
    meters: productRows.rows.reduce((total, row) => total + row.prices.length, 0),
    configured: productRows.rows.reduce((total, row) => total + row.prices.filter((item) => item.rule).length, 0),
  }), [productRows.rows]);
  const hasNextPage = officialCatalog?.pageInfo.hasMore ?? (officialCatalog?.pageInfo.totalPages ? page < officialCatalog.pageInfo.totalPages : false);

  const openCreate = () => { setForm({ ...EMPTY_FORM, pricingPlanId: plans[0]?.id ?? '', weeklyWindows: [{ ...DEFAULT_WINDOW }], meterPrices: [emptyMeter()] }); setFormError(null); setCreating(true); setPanelOpen(true); };
  const openProductSetting = (row: PriceSettingProductRow) => {
    const firstRule = row.prices.find((item) => item.rule)?.rule;
    const firstSchedule = row.prices.find((item) => item.rule?.schedule)?.rule?.schedule;
    setForm({
      catalogKey: row.product.catalogKey ?? '', vendorCode: row.product.vendorCode, productCode: row.product.productCode, providerCode: row.product.providerCode, regionCode: row.product.regionCode,
      resourceType: resourceTypeOfProduct(row.product), pricingPlanId: firstRule?.pricingPlanId ?? plans[0]?.id ?? '',
      meterPrices: row.prices.map(({ official, rule }) => ({ key: official.rateCode, rateCode: official.rateCode, ruleId: rule?.id, ruleCode: rule?.ruleCode, meterCode: official.meterCode, operationCode: official.operationCode, unitCode: official.unitCode, unitSize: official.unitSize, official, customerPrice: normalizePricingDecimal(rule?.unitPriceOverride) })),
      priceMode: firstSchedule ? 'time_window' : 'standard', timeZone: firstSchedule?.timeZone ?? 'Asia/Shanghai',
      weeklyWindows: firstSchedule?.weeklyWindows.map((window) => ({ ...window, daysOfWeek: [...window.daysOfWeek] })) ?? [{ ...DEFAULT_WINDOW }],
      includeDates: firstSchedule?.includeDates.join(', ') ?? '', excludeDates: firstSchedule?.excludeDates.join(', ') ?? '', priority: String(firstRule?.priority ?? 100), effectiveFrom: firstRule?.effectiveFrom ?? '', effectiveTo: firstRule?.effectiveTo ?? '', status: firstRule?.status ?? 'active',
    });
    setFormError(null); setCreating(false); setPanelOpen(true);
  };
  const openCustomSetting = (rule: AdminPricingRuleItem) => {
    setForm({
      catalogKey: rule.catalogKey ?? '', vendorCode: vendorFromCatalogKey(rule.catalogKey) || rule.providerCode || '', productCode: rule.productCode ?? rule.catalogKey ?? '', providerCode: rule.providerCode ?? '', regionCode: rule.regionCode ?? '', resourceType: resourceTypeOf(rule), pricingPlanId: rule.pricingPlanId,
      meterPrices: [{ key: `rule:${rule.id}`, ruleId: rule.id, ruleCode: rule.ruleCode, meterCode: rule.meterCode ?? '', operationCode: rule.operationCode ?? '', unitCode: 'unit', unitSize: '1', customerPrice: normalizePricingDecimal(rule.unitPriceOverride) }],
      priceMode: rule.schedule ? 'time_window' : 'standard', timeZone: rule.schedule?.timeZone ?? 'Asia/Shanghai', weeklyWindows: rule.schedule?.weeklyWindows.map((window) => ({ ...window, daysOfWeek: [...window.daysOfWeek] })) ?? [{ ...DEFAULT_WINDOW }], includeDates: rule.schedule?.includeDates.join(', ') ?? '', excludeDates: rule.schedule?.excludeDates.join(', ') ?? '', priority: String(rule.priority), effectiveFrom: rule.effectiveFrom ?? '', effectiveTo: rule.effectiveTo ?? '', status: rule.status,
    });
    setFormError(null); setCreating(false); setPanelOpen(true);
  };
  const closePanel = () => { setCreating(false); setFormError(null); setPanelOpen(false); };
  const setField = <K extends keyof PriceSettingFormState>(key: K, value: PriceSettingFormState[K]) => setForm((current) => ({ ...current, [key]: value }));
  const updateMeter = (index: number, patch: Partial<PriceSettingMeterForm>) => setForm((current) => ({ ...current, meterPrices: current.meterPrices.map((meter, meterIndex) => meterIndex === index ? { ...meter, ...patch } : meter) }));
  const addMeter = () => setForm((current) => ({ ...current, meterPrices: [...current.meterPrices, emptyMeter(`meter-${current.meterPrices.length + 1}-${Date.now()}`)] }));
  const removeMeter = (index: number) => setForm((current) => ({ ...current, meterPrices: current.meterPrices.filter((_, meterIndex) => meterIndex !== index) }));
  const updateWindow = (index: number, patch: Partial<AdminPricingScheduleWindow>) => setForm((current) => ({ ...current, weeklyWindows: current.weeklyWindows.map((window, windowIndex) => windowIndex === index ? { ...window, ...patch } : window) }));
  const toggleWindowDay = (index: number, day: number) => { const window = form.weeklyWindows[index]; if (!window) return; updateWindow(index, { daysOfWeek: window.daysOfWeek.includes(day) ? window.daysOfWeek.filter((value) => value !== day) : [...window.daysOfWeek, day].sort((left, right) => left - right) }); };
  const addWindow = () => setForm((current) => { const existing = new Set(current.weeklyWindows.map((window) => window.windowCode)); let suffix = current.weeklyWindows.length + 1; let windowCode = `window-${suffix}`; while (existing.has(windowCode)) { suffix += 1; windowCode = `window-${suffix}`; } return { ...current, priceMode: 'time_window', weeklyWindows: [...current.weeklyWindows, { ...DEFAULT_WINDOW, windowCode }] }; });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setFormError(null);
    try {
      const mutations = buildPriceSettingMutations(form, t); setBusy(true);
      for (const mutation of mutations) {
        if (mutation.id) await pricingService.rules.update(mutation.id, mutation.input);
        else await pricingService.rules.create(mutation.input);
      }
      closePanel(); await load();
    } catch (cause) { setFormError(errorMessageI18n(cause, t('admin.pricing.settings.errors.saveFailed'), t)); } finally { setBusy(false); }
  };

  return <AdminPageShell>
    <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-white/10"><div><h1 className="text-lg font-semibold text-slate-900 dark:text-white">{t('admin.pricing.settings.title')}</h1><p className="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-400">{t('admin.pricing.settings.subtitle')}</p></div><button type="button" className={primaryButtonClass} onClick={openCreate}><Plus className="h-4 w-4" aria-hidden="true" />{t('admin.pricing.settings.actions.new')}</button></div>
    <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-slate-200 px-5 pt-3 dark:border-white/10" role="tablist" aria-label={t('admin.pricing.settings.tabs.label')}>{resourceTabs.map((type) => <button key={type} type="button" role="tab" aria-selected={resourceType === type} onClick={() => { setResourceType(type); setPage(1); }} className={`whitespace-nowrap border-b-2 px-3 pb-2.5 text-sm font-medium transition ${resourceType === type ? 'border-lobster-500 text-lobster-600 dark:text-lobster-400' : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}>{t(`admin.pricing.settings.resource.${type}`)} <span className="ml-1 text-xs tabular-nums text-slate-400">{counts.get(type) ?? 0}</span></button>)}</div>
    <div className="grid shrink-0 grid-cols-1 border-b border-slate-200 bg-slate-50/70 sm:grid-cols-3 dark:border-white/10 dark:bg-white/[0.03]"><SummaryMetric label={t('admin.pricing.settings.summary.products')} value={String(summary.products)} /><SummaryMetric label={t('admin.pricing.settings.summary.meters')} value={String(summary.meters)} /><SummaryMetric label={t('admin.pricing.settings.summary.configured')} value={`${summary.configured}/${summary.meters || 0}`} /></div>
    <AdminListToolbar filters={<div className="flex min-w-0 flex-wrap items-center gap-2"><SearchBox value={search} onChange={setSearch} onSubmit={(value) => { setAppliedSearch(value); setPage(1); }} placeholder={t('admin.pricing.settings.search.placeholder')} /><select className={toolbarSelectClass} value={resourceType} aria-label={t('admin.pricing.settings.filters.resourceType')} onChange={(event) => { setResourceType(event.target.value as PriceSettingResourceType); setPage(1); }}>{resourceTabs.map((type) => <option key={type} value={type}>{t(`admin.pricing.settings.resource.${type}`)}</option>)}</select><select className={toolbarSelectClass} value={regionCode} aria-label={t('admin.pricing.settings.filters.region')} onChange={(event) => { setRegionCode(event.target.value); setPage(1); }}><option value="">{t('admin.pricing.settings.filters.allRegions')}</option>{(officialCatalog?.regions ?? []).map((region) => <option key={region.code} value={region.code}>{region.code} ({region.count})</option>)}</select></div>} />
    <AdminTableArea footer={<BottomPagination page={page} pageSize={pageSize} itemCount={productRows.rows.length + customRules.length} hasNextPage={hasNextPage} pageLabel={t('admin.pricing.common.pagination.page', 'Page {page}')} pageSizeLabel={t('admin.pricing.common.pagination.rows', 'Rows')} previousLabel={t('admin.pricing.common.pagination.previous', 'Previous page')} nextLabel={t('admin.pricing.common.pagination.next', 'Next page')} showingLabel={t('admin.pricing.common.pagination.showing', 'Showing')} onPreviousPage={() => setPage((current) => Math.max(1, current - 1))} onNextPage={() => setPage((current) => current + 1)} onPageSizeChange={(value) => { setPageSize(value); setPage(1); }} pageSizeOptions={[20, 50, 100]} />}>
      <table className="w-full min-w-[1360px] table-fixed text-left text-sm"><thead className="sticky top-0 z-10 border-b border-slate-200 bg-white text-xs uppercase tracking-wide text-slate-400 dark:border-white/10 dark:bg-slate-900"><tr><th className="w-[16%] px-4 py-3 font-medium">{t('admin.pricing.settings.table.resourceName')}</th><th className="w-[10%] px-4 py-3 font-medium">{t('admin.pricing.settings.table.resourceType')}</th><th className="w-[19%] px-4 py-3 font-medium">{t('admin.pricing.settings.table.pricingObject')}</th><th className="w-[25%] px-4 py-3 font-medium">{t('admin.pricing.settings.table.officialPrice')}</th><th className="w-[22%] px-4 py-3 font-medium">{t('admin.pricing.settings.table.customerPrice')}</th><th className="w-[8%] px-4 py-3 text-right font-medium">{t('admin.pricing.settings.table.actions')}</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-white/5">{loading || (productRows.rows.length === 0 && customRules.length === 0) ? <TableState loading={loading} empty={t('admin.pricing.settings.empty')} colSpan={6} /> : <>{productRows.rows.map((row) => <ProductPriceTableRow key={row.key} row={row} plans={plans} locale={displayLocale} t={t} onEdit={openProductSetting} />)}{customRules.map((rule) => <CustomPriceTableRow key={`rule:${rule.id}`} rule={rule} plans={plans} locale={displayLocale} t={t} onEdit={openCustomSetting} />)}</>}</tbody></table>
    </AdminTableArea>
    <InlineError message={error} />
    {panelOpen ? <SidePanel wide title={t(creating ? 'admin.pricing.settings.form.createTitle' : 'admin.pricing.settings.form.editTitle')} description={t('admin.pricing.settings.form.batchDescription')} onClose={closePanel} footer={<><button type="button" className={secondaryButtonClass} onClick={closePanel} disabled={busy}>{t('admin.pricing.common.form.cancel')}</button><button type="submit" form="price-setting-form" className={primaryButtonClass} disabled={busy}>{t('admin.pricing.settings.form.saveItems', { count: form.meterPrices.length })}</button></>}>
      <form id="price-setting-form" className="flex flex-col gap-5" onSubmit={handleSubmit}><InlineError message={formError} />
        <section className="rounded-lg border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.04]"><div className="mb-3 flex items-center justify-between gap-3"><div><h3 className="text-sm font-semibold text-slate-900 dark:text-white">{t('admin.pricing.settings.form.objectTitle')}</h3><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('admin.pricing.settings.form.objectHint')}</p></div><span className="rounded-full bg-lobster-50 px-2.5 py-1 text-xs font-medium text-lobster-700 dark:bg-lobster-500/10 dark:text-lobster-300">{t(`admin.pricing.settings.resource.${form.resourceType}`)}</span></div><div className="grid gap-4 md:grid-cols-2"><Field label={t('admin.pricing.settings.form.vendor')} hint={t('admin.pricing.settings.form.vendorHint')}><input className={inputClass} value={form.vendorCode} onChange={(event) => setField('vendorCode', event.target.value)} placeholder="openai / anthropic" readOnly={Boolean(form.catalogKey)} required /></Field><Field label={t('admin.pricing.settings.form.product')} hint={t('admin.pricing.settings.form.productHint')}><input className={inputClass} value={form.productCode} onChange={(event) => setField('productCode', event.target.value)} placeholder="gpt-4o / image-generation" required /></Field><Field label={t('admin.pricing.settings.form.resourceType')}><select className={selectClass} value={form.resourceType} onChange={(event) => setField('resourceType', event.target.value as PriceSettingFormState['resourceType'])}>{PRICE_SETTING_RESOURCE_TYPES.filter((type) => type !== 'all').map((type) => <option key={type} value={type}>{t(`admin.pricing.settings.resource.${type}`)}</option>)}</select></Field><Field label={t('admin.pricing.settings.form.provider')} hint={t('admin.pricing.settings.form.providerHint')}><input className={inputClass} value={form.providerCode} onChange={(event) => setField('providerCode', event.target.value)} placeholder="openrouter / aliyun" /></Field><Field label={t('admin.pricing.settings.form.region')} hint={t('admin.pricing.settings.form.regionHint')}><input className={inputClass} value={form.regionCode} onChange={(event) => setField('regionCode', event.target.value)} placeholder="global / cn" /></Field></div></section>
        <section><div className="mb-3 flex items-end justify-between gap-3"><div><h3 className="text-sm font-semibold text-slate-900 dark:text-white">{t('admin.pricing.settings.form.priceGroupTitle')}</h3><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('admin.pricing.settings.form.priceGroupHint')}</p></div><button type="button" className={secondaryButtonClass} onClick={addMeter}><Plus className="h-3.5 w-3.5" aria-hidden="true" />{t('admin.pricing.settings.form.addMeter')}</button></div><div className="overflow-hidden rounded-lg border border-slate-200 dark:border-white/10"><div className="hidden grid-cols-[minmax(150px,1fr)_minmax(150px,1fr)_180px_36px] gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400 md:grid dark:border-white/10 dark:bg-white/[0.04]"><span>{t('admin.pricing.settings.form.meter')}</span><span>{t('admin.pricing.settings.table.officialPrice')}</span><span>{t('admin.pricing.settings.form.customerPrice')}</span><span /></div><div className="divide-y divide-slate-200 dark:divide-white/10">{form.meterPrices.map((meter, index) => <MeterFormRow key={meter.key} meter={meter} index={index} locale={displayLocale} t={t} updateMeter={updateMeter} removeMeter={removeMeter} />)}</div></div></section>
        <section className="grid gap-4 rounded-lg border border-slate-200 p-4 md:grid-cols-2 dark:border-white/10"><Field label={t('admin.pricing.settings.form.pricingPlan')}><select className={selectClass} value={form.pricingPlanId} onChange={(event) => setField('pricingPlanId', event.target.value)} required><option value="">{t('admin.pricing.settings.form.pricingPlanPlaceholder')}</option>{plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.planName} ({plan.planCode})</option>)}</select></Field><Field label={t('admin.pricing.common.form.priority')}><input className={inputClass} value={form.priority} onChange={(event) => setField('priority', event.target.value)} inputMode="numeric" /></Field><Field label={t('admin.pricing.common.form.status')}><select className={selectClass} value={form.status} onChange={(event) => setField('status', event.target.value as AdminPricingStatus)}>{STATUSES.map((value) => <option key={value} value={value}>{t(`admin.pricing.common.status.${value}`)}</option>)}</select></Field><Field label={t('admin.pricing.settings.form.catalogKey')} hint={t('admin.pricing.settings.form.optional')}><input className={inputClass} value={form.catalogKey} onChange={(event) => setField('catalogKey', event.target.value)} placeholder="vendor/model" /></Field></section>
        <details className="rounded-lg border border-slate-200 dark:border-white/10"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white"><span>{t('admin.pricing.settings.form.advancedTitle')}</span><ChevronDown className="h-4 w-4 text-slate-400" aria-hidden="true" /></summary><div className="flex flex-col gap-4 border-t border-slate-200 px-4 py-4 dark:border-white/10"><Field label={t('admin.pricing.settings.form.priceMode')} hint={t('admin.pricing.settings.form.priceModeHint')}><div className="grid grid-cols-2 gap-2" role="group" aria-label={t('admin.pricing.settings.form.priceMode')}>{(['standard', 'time_window'] as const).map((mode) => <button key={mode} type="button" className={`rounded-md border px-3 py-2 text-sm font-medium transition ${form.priceMode === mode ? 'border-lobster-500 bg-lobster-50 text-lobster-700 dark:bg-lobster-500/10 dark:text-lobster-300' : 'border-slate-200 text-slate-600 hover:border-lobster-300 dark:border-white/10 dark:text-slate-300'}`} onClick={() => { setField('priceMode', mode); if (mode === 'time_window' && form.weeklyWindows.length === 0) setField('weeklyWindows', [{ ...DEFAULT_WINDOW }]); }}>{t(`admin.pricing.settings.mode.${mode === 'time_window' ? 'timeWindow' : 'standard'}`)}</button>)}</div></Field>{form.priceMode === 'time_window' ? <TimeWindowFields form={form} t={t} updateWindow={updateWindow} toggleWindowDay={toggleWindowDay} addWindow={addWindow} setField={setField} /> : null}<div className="grid gap-4 md:grid-cols-2"><Field label={t('admin.pricing.common.form.effectiveFrom')}><input className={inputClass} value={form.effectiveFrom} onChange={(event) => setField('effectiveFrom', event.target.value)} placeholder="YYYY-MM-DD HH:MM:SS" /></Field><Field label={t('admin.pricing.common.form.effectiveTo')}><input className={inputClass} value={form.effectiveTo} onChange={(event) => setField('effectiveTo', event.target.value)} placeholder="YYYY-MM-DD HH:MM:SS" /></Field></div></div></details>
      </form>
    </SidePanel> : null}
  </AdminPageShell>;
}

function SummaryMetric({ label, value }: { label: string; value: string }) { return <div className="border-b border-slate-200 px-5 py-3 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0 dark:border-white/10"><div className="text-xs text-slate-500 dark:text-slate-400">{label}</div><div className="mt-1 text-lg font-semibold tabular-nums text-slate-900 dark:text-white">{value}</div></div>; }

function ProductPriceTableRow({ row, plans, locale, t, onEdit }: { row: PriceSettingProductRow; plans: AdminPricingPlanItem[]; locale: string; t: TranslationFunction; onEdit: (row: PriceSettingProductRow) => void }) {
  const resourceType = resourceTypeOfProduct(row.product);
  return <tr className="align-top hover:bg-slate-50 dark:hover:bg-white/5"><td className="px-4 py-4 text-slate-900 dark:text-white"><div className="break-words font-semibold">{row.product.productDisplayName || row.product.resourceCode || row.product.productCode}</div><div className="mt-2 break-all font-mono text-xs text-slate-400">{row.product.productCode}</div></td><td className="px-4 py-4"><span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 dark:bg-white/10 dark:text-slate-300">{t(`admin.pricing.settings.resource.${resourceType}`)}</span><div className="mt-2 break-all text-[11px] text-slate-400">{row.product.resourceType || resourceType}</div></td><td className="px-4 py-4 text-[11px] text-slate-500 dark:text-slate-400"><div>{t('admin.pricing.settings.scope.vendor')}: {row.product.vendorCode || '—'}</div><div className="mt-1">{t('admin.pricing.settings.scope.provider')}: {row.product.providerCode || '—'}</div><div className="mt-1">{t('admin.pricing.settings.scope.region')}: {row.product.regionCode || '—'}</div><div className="mt-1">{t('admin.pricing.settings.table.rateCount', { count: row.prices.length })}</div></td><td className="px-4 py-4"><div className="flex flex-col gap-2">{row.prices.map(({ official }) => <OfficialRateLine key={official.rateCode} official={official} locale={locale} t={t} />)}</div></td><td className="px-4 py-4"><div className="flex flex-col gap-2">{row.prices.map(({ official, rule }) => <CustomerRateLine key={official.rateCode} official={official} rule={rule} plans={plans} locale={locale} t={t} />)}</div></td><td className="px-4 py-4 text-right"><button type="button" className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-2 text-xs font-semibold text-lobster-600 transition hover:bg-lobster-50 dark:text-lobster-300 dark:hover:bg-lobster-500/10" onClick={() => onEdit(row)}><Edit3 className="h-3.5 w-3.5" aria-hidden="true" />{t('admin.pricing.settings.actions.editGroup')}</button></td></tr>;
}

function OfficialRateLine({ official, locale, t }: { official: AdminOfficialPricingRateItem; locale: string; t: TranslationFunction }) {
  const qualifier = officialRateQualifier(official);
  return <div className="rounded-md border border-slate-200/80 bg-slate-50/60 px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="font-medium text-slate-800 dark:text-slate-100">{meterLabel(official, t)}</div><div className="mt-0.5 break-all text-[11px] text-slate-400">{official.operationDisplayName || official.operationCode} · {official.meterCode}</div></div><div className="shrink-0 text-right tabular-nums"><div className="font-semibold text-slate-900 dark:text-white">{formatPricingMoney(official.unitPrice, official.currencyCode, locale)}</div><div className="mt-0.5 text-[11px] text-slate-400">/ {officialRateUnit(official)}</div></div></div>{qualifier ? <div className="mt-1 break-words text-[11px] text-slate-400">{qualifier}</div> : null}{official.tiers.map((tier) => <div key={tier.tierCode} className="mt-1 text-[11px] tabular-nums text-slate-500 dark:text-slate-400">{tier.tierCode}: {formatPricingMoney(tier.unitPrice, tier.currencyCode, locale)} / {tier.unitSize} {official.unitCode} · {t('admin.pricing.settings.table.flatAmount')} {formatPricingMoney(tier.flatAmount, tier.currencyCode, locale)}</div>)}</div>;
}

type CustomerRateDescriptor = Pick<AdminOfficialPricingRateItem, 'meterCode' | 'meterDisplayName' | 'currencyCode'>;

function CustomerRateLine({ official, rule, plans, locale, t }: { official: CustomerRateDescriptor; rule?: AdminPricingRuleItem; plans: AdminPricingPlanItem[]; locale: string; t: TranslationFunction }) {
  const plan = rule ? plans.find((item) => item.id === rule.pricingPlanId) : undefined;
  return <div className="rounded-md border border-slate-200/80 px-3 py-2 dark:border-white/10"><div className="flex items-center justify-between gap-3"><span className="font-medium text-slate-700 dark:text-slate-200">{meterLabel(official, t)}</span>{rule ? <StatusBadge status={rule.status} /> : <span className="text-xs text-slate-400">{t('admin.pricing.settings.table.notConfigured')}</span>}</div><div className="mt-1 flex items-baseline justify-between gap-3"><span className={`tabular-nums ${rule ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-400'}`}>{rule ? formatPricingMoney(rule.unitPriceOverride, plan?.currencyCode ?? official.currencyCode, locale) : '—'}</span>{rule ? <span className="text-[11px] text-slate-400">{rule.schedule ? t('admin.pricing.settings.mode.timeWindow') : t('admin.pricing.settings.mode.standard')} · {rule.planCode ?? plan?.planCode ?? rule.pricingPlanId}</span> : null}</div></div>;
}

function CustomPriceTableRow({ rule, plans, locale, t, onEdit }: { rule: AdminPricingRuleItem; plans: AdminPricingPlanItem[]; locale: string; t: TranslationFunction; onEdit: (rule: AdminPricingRuleItem) => void }) {
  const plan = plans.find((item) => item.id === rule.pricingPlanId);
  const official: CustomerRateDescriptor = { meterCode: rule.meterCode || rule.operationCode || 'default', meterDisplayName: rule.meterCode || rule.operationCode || t('admin.pricing.settings.table.defaultMeter'), currencyCode: plan?.currencyCode ?? 'CNY' };
  const resourceType = resourceTypeOf(rule);
  return <tr className="align-top hover:bg-slate-50 dark:hover:bg-white/5"><td className="px-4 py-4 text-slate-900 dark:text-white"><div className="break-words font-semibold">{rule.productCode || rule.ruleCode}</div><div className="mt-2 text-xs text-slate-400">{t('admin.pricing.settings.table.customPrice')}</div></td><td className="px-4 py-4"><span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 dark:bg-white/10 dark:text-slate-300">{t(`admin.pricing.settings.resource.${resourceType}`)}</span><div className="mt-2 break-all text-[11px] text-slate-400">{resourceType}</div></td><td className="px-4 py-4 text-[11px] text-slate-500 dark:text-slate-400"><div>{t('admin.pricing.settings.scope.provider')}: {rule.providerCode || '—'}</div><div className="mt-1">{t('admin.pricing.settings.scope.region')}: {rule.regionCode || '—'}</div></td><td className="px-4 py-4 text-sm text-slate-400">{t('admin.pricing.settings.table.noOfficial')}</td><td className="px-4 py-4"><CustomerRateLine official={official} rule={rule} plans={plans} locale={locale} t={t} /></td><td className="px-4 py-4 text-right"><button type="button" className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-2 text-xs font-semibold text-lobster-600 transition hover:bg-lobster-50 dark:text-lobster-300 dark:hover:bg-lobster-500/10" onClick={() => onEdit(rule)}><Edit3 className="h-3.5 w-3.5" aria-hidden="true" />{t('admin.pricing.settings.common.edit')}</button></td></tr>;
}

function MeterFormRow({ meter, index, locale, t, updateMeter, removeMeter }: { meter: PriceSettingMeterForm; index: number; locale: string; t: TranslationFunction; updateMeter: (index: number, patch: Partial<PriceSettingMeterForm>) => void; removeMeter: (index: number) => void }) {
  return <div className="grid gap-3 px-3 py-3 md:grid-cols-[minmax(150px,1fr)_minmax(150px,1fr)_180px_36px] md:items-start"><div className="grid gap-2"><input className={inputClass} value={meter.meterCode} onChange={(event) => updateMeter(index, { meterCode: event.target.value })} placeholder={t('admin.pricing.settings.form.meterPlaceholder')} required={!meter.operationCode} /><input className={inputClass} value={meter.operationCode} onChange={(event) => updateMeter(index, { operationCode: event.target.value })} placeholder={t('admin.pricing.settings.form.operationPlaceholder')} required={!meter.meterCode} /><div className="text-[11px] text-slate-400">{meter.unitSize} {meter.unitCode}{meter.ruleId ? ` · ${t('admin.pricing.settings.form.existing')}` : ''}</div></div><div className="min-h-9 rounded-md bg-slate-50 px-3 py-2 dark:bg-white/[0.04]">{meter.official ? <><div className="font-semibold tabular-nums text-slate-900 dark:text-white">{formatPricingMoney(meter.official.unitPrice, meter.official.currencyCode, locale)}</div><div className="mt-0.5 text-[11px] text-slate-400">/ {officialRateUnit(meter.official)}</div></> : <span className="text-xs text-slate-400">{t('admin.pricing.settings.table.noOfficial')}</span>}</div><div><label className="mb-1 block text-[11px] font-medium text-slate-500 dark:text-slate-400">{t('admin.pricing.settings.form.customerPrice')}</label><input className={inputClass} value={meter.customerPrice} onChange={(event) => updateMeter(index, { customerPrice: event.target.value })} placeholder="0.01" inputMode="decimal" required /></div><button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10" title={t('admin.pricing.settings.form.removeMeter')} aria-label={t('admin.pricing.settings.form.removeMeter')} onClick={() => removeMeter(index)}><Trash2 className="h-4 w-4" aria-hidden="true" /></button></div>;
}

function TimeWindowFields({ form, t, updateWindow, toggleWindowDay, addWindow, setField }: { form: PriceSettingFormState; t: TranslationFunction; updateWindow: (index: number, patch: Partial<AdminPricingScheduleWindow>) => void; toggleWindowDay: (index: number, day: number) => void; addWindow: () => void; setField: <K extends keyof PriceSettingFormState>(key: K, value: PriceSettingFormState[K]) => void }) {
  return <div className="flex flex-col gap-4 rounded-md bg-slate-50 p-3 dark:bg-white/[0.04]"><Field label={t('admin.pricing.settings.form.timeZone')} hint={t('admin.pricing.settings.form.timeZoneHint')}><input className={inputClass} list="pricing-time-zones" value={form.timeZone} onChange={(event) => setField('timeZone', event.target.value)} placeholder="Asia/Shanghai" required /><datalist id="pricing-time-zones"><option value="UTC" /><option value="Asia/Shanghai" /><option value="Asia/Tokyo" /><option value="America/Los_Angeles" /><option value="America/New_York" /><option value="Europe/London" /></datalist></Field><div className="flex items-center justify-between"><span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('admin.pricing.settings.form.windows')}</span><button type="button" className={secondaryButtonClass} onClick={addWindow}><Plus className="h-3.5 w-3.5" aria-hidden="true" />{t('admin.pricing.settings.form.addWindow')}</button></div>{form.weeklyWindows.map((window, index) => <div key={index} className="flex flex-col gap-3 rounded-md border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-slate-900"><div className="grid gap-3 md:grid-cols-[1fr_1fr_36px]"><Field label={t('admin.pricing.settings.form.windowCode')}><input className={inputClass} value={window.windowCode} onChange={(event) => updateWindow(index, { windowCode: event.target.value })} required /></Field><div className="grid grid-cols-2 gap-2"><Field label={t('admin.pricing.settings.form.startTime')}><input type="time" className={inputClass} value={window.startTime} onChange={(event) => updateWindow(index, { startTime: event.target.value })} required /></Field><Field label={t('admin.pricing.settings.form.endTime')}><input type="time" className={inputClass} value={window.endTime} onChange={(event) => updateWindow(index, { endTime: event.target.value })} required /></Field></div><button type="button" className="mt-5 inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10" title={t('admin.pricing.settings.form.removeWindow')} aria-label={t('admin.pricing.settings.form.removeWindow')} disabled={form.weeklyWindows.length <= 1} onClick={() => setField('weeklyWindows', form.weeklyWindows.filter((_, windowIndex) => windowIndex !== index))}><Trash2 className="h-4 w-4" aria-hidden="true" /></button></div><div><span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">{t('admin.pricing.settings.form.days')}</span><div className="flex flex-wrap gap-2">{DAY_OPTIONS.map((day, dayIndex) => <label key={day} className="inline-flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300"><input type="checkbox" checked={window.daysOfWeek.includes(day)} onChange={() => toggleWindowDay(index, day)} />{t(`admin.pricing.settings.days.${day}`, DAY_LABELS[dayIndex])}</label>)}</div></div><label className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300"><input type="checkbox" checked={window.endDayOffset === 1} onChange={(event) => updateWindow(index, { endDayOffset: event.target.checked ? 1 : 0 })} />{t('admin.pricing.settings.form.crossMidnight')}</label></div>)}</div>;
}

function isPriceSettingResourceType(value: string): value is PriceSettingResourceType { return PRICE_SETTING_RESOURCE_TYPES.includes(value as PriceSettingResourceType); }
function resourceTypeOfProduct(item: AdminOfficialPricingProductItem): Exclude<PriceSettingResourceType, 'all'> { return item.groupCodes.find((code: string): code is Exclude<PriceSettingResourceType, 'all'> => code !== 'all' && isPriceSettingResourceType(code)) ?? 'other'; }
function meterLabel(item: Pick<AdminOfficialPricingRateItem, 'meterCode' | 'meterDisplayName'>, t: TranslationFunction): string { const knownKey = MODEL_METER_LABEL_KEYS[item.meterCode.toLowerCase()]; return knownKey ? t(knownKey) : item.meterDisplayName || item.meterCode; }
const MODEL_METER_LABEL_KEYS: Record<string, string> = { llm_input_token: 'admin.pricing.settings.meter.input', llm_output_token: 'admin.pricing.settings.meter.output', llm_reasoning_token: 'admin.pricing.settings.meter.reasoning', llm_cache_read_token: 'admin.pricing.settings.meter.cacheRead', llm_cache_write_token: 'admin.pricing.settings.meter.cacheWrite', llm_cache_storage_token_hour: 'admin.pricing.settings.meter.cacheStorage' };
function resourceTypeOf(item: Pick<AdminPricingRuleItem, 'productCode' | 'operationCode' | 'meterCode' | 'catalogKey'>): Exclude<PriceSettingResourceType, 'all'> { const value = [item.productCode, item.operationCode, item.meterCode, item.catalogKey].filter(Boolean).join(' ').toLowerCase(); if (value.includes('embedding')) return 'embedding'; if (value.includes('image') || value.includes('vision')) return 'image'; if (value.includes('video')) return 'video'; if (value.includes('music')) return 'music'; if (value.includes('sound') || value.includes('sfx')) return 'sound'; if (value.includes('audio') || value.includes('speech') || value.includes('transcri')) return 'audio'; if (value.includes('api') || value.includes('request') || value.includes('result')) return 'api'; if (value.includes('chat') || value.includes('completion') || value.includes('llm') || value.includes('gpt') || value.includes('claude') || value.includes('gemini') || value.includes('deepseek') || value.includes('qwen') || value.includes('mistral') || value.includes('llama') || value.includes('glm') || value.includes('kimi') || value.includes('ernie') || value.includes('doubao') || value.includes('minimax') || value.includes('grok') || value.includes('command')) return 'llm'; return 'other'; }
function vendorFromCatalogKey(catalogKey: string | undefined): string { return catalogKey?.split('/')[0]?.trim() ?? ''; }

export function buildPriceSettingMutations(form: PriceSettingFormState, t: TranslationFunction): Array<{ id?: string; input: AdminPricingRuleMutationInput }> {
  const productCode = form.productCode.trim();
  const vendorCode = form.vendorCode.trim();
  if (!productCode) throw new Error(t('admin.pricing.settings.form.productRequired'));
  if (!vendorCode) throw new Error(t('admin.pricing.settings.form.vendorRequired'));
  if (!form.pricingPlanId.trim()) throw new Error(t('admin.pricing.settings.form.pricingPlanRequired'));
  if (form.meterPrices.length === 0) throw new Error(t('admin.pricing.settings.form.metersRequired'));
  const priority = Number.parseInt(form.priority, 10);
  if (!Number.isInteger(priority) || priority < 0) throw new Error(t('admin.pricing.settings.form.priorityInvalid'));
  const schedule = buildPriceSchedule(form, t);
  const now = Date.now();
  const catalogKey = form.catalogKey.trim() || `${vendorCode}/${productCode}`;
  return form.meterPrices.map((meter, index) => {
    const meterCode = meter.meterCode.trim();
    const operationCode = meter.operationCode.trim();
    if (!meterCode && !operationCode) throw new Error(t('admin.pricing.settings.form.meterRequired'));
    const unitPrice = meter.customerPrice.trim();
    if (!/^[0-9]+(?:\.[0-9]{1,12})?$/.test(unitPrice)) throw new Error(t('admin.pricing.settings.form.unitPriceRequired'));
    const ruleCode = meter.ruleCode || `${productCode}-${meterCode || operationCode || 'default'}-${now}-${index}`.replace(/[^A-Za-z0-9_.:-]/g, '-').slice(0, 96);
    return {
      id: meter.ruleId,
      input: {
        ruleCode: meter.ruleId ? meter.ruleCode : ruleCode,
        pricingPlanId: form.pricingPlanId.trim(),
        productCode,
        operationCode: operationCode || undefined,
        meterCode: meterCode || undefined,
        providerCode: form.providerCode.trim() || undefined,
        regionCode: form.regionCode.trim() || undefined,
        catalogKey,
        formulaMode: 'unit_price_override',
        unitPriceOverride: unitPrice,
        schedule,
        priority,
        effectiveFrom: form.effectiveFrom.trim() || undefined,
        effectiveTo: form.effectiveTo.trim() || undefined,
        status: form.status,
      },
    };
  });
}

function buildPriceSchedule(form: PriceSettingFormState, t: TranslationFunction): AdminPricingSchedule | undefined {
  if (form.priceMode === 'standard') return undefined;

  const timeZone = form.timeZone.trim();
  if (!timeZone || !isIanaTimeZone(timeZone)) {
    throw new Error(t('admin.pricing.settings.form.timeZoneInvalid'));
  }
  if (form.weeklyWindows.length === 0) {
    throw new Error(t('admin.pricing.settings.form.windowsRequired'));
  }

  const windowCodes = new Set<string>();
  const weeklyWindows = form.weeklyWindows.map((window) => {
    const windowCode = window.windowCode.trim();
    if (!windowCode || windowCodes.has(windowCode)) {
      throw new Error(t('admin.pricing.settings.form.windowCodeInvalid'));
    }
    windowCodes.add(windowCode);
    if (window.daysOfWeek.length === 0) {
      throw new Error(t('admin.pricing.settings.form.daysRequired'));
    }
    if (!isClockTime(window.startTime) || !isClockTime(window.endTime)) {
      throw new Error(t('admin.pricing.settings.form.timeInvalid'));
    }

    const startTime = normalizeClockTime(window.startTime);
    const endTime = normalizeClockTime(window.endTime);
    const crossesMidnight = window.endDayOffset === 1;
    if ((!crossesMidnight && startTime >= endTime) || (crossesMidnight && startTime <= endTime)) {
      throw new Error(t('admin.pricing.settings.form.timeOrderInvalid'));
    }

    return {
      ...window,
      windowCode,
      startTime,
      endTime,
      daysOfWeek: [...new Set(window.daysOfWeek)].sort((left, right) => left - right),
    };
  });

  const includeDates = parseDateList(form.includeDates, t);
  const excludeDates = parseDateList(form.excludeDates, t);
  if (includeDates.some((date) => excludeDates.includes(date))) {
    throw new Error(t('admin.pricing.settings.form.dateOverlapInvalid'));
  }

  return { timeZone, weeklyWindows, includeDates, excludeDates };
}

function parseDateList(value: string, t: TranslationFunction): string[] {
  const dates = value.split(/[\s,]+/).map((date) => date.trim()).filter(Boolean);
  if (dates.length > 366) throw new Error(t('admin.pricing.settings.form.dateCountInvalid'));
  if (dates.some((date) => !/^\d{4}-\d{2}-\d{2}$/.test(date))) {
    throw new Error(t('admin.pricing.settings.form.dateInvalid'));
  }
  if (new Set(dates).size !== dates.length) {
    throw new Error(t('admin.pricing.settings.form.dateDuplicateInvalid'));
  }
  return dates;
}

function isClockTime(value: string): boolean {
  return /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value);
}

function normalizeClockTime(value: string): string {
  return value.length === 5 ? `${value}:00` : value;
}

function isIanaTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}
