import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Edit3, Plus, Trash2 } from 'lucide-react';
import { BottomPagination } from '@sdkwork/cloudroutes-pc-commons';
import { useTranslation } from 'react-i18next';
import {
  pricingService,
  type AdminOfficialPricingProductCatalog,
  type AdminOfficialPricingProductItem,
  type AdminOfficialPricingRateItem,
  type AdminPricingPlanItem,
  type AdminPricingCondition,
  type AdminPricingRuleItem,
  type AdminPricingRuleMutationInput,
  type AdminPricingSchedule,
  type AdminPricingScheduleWindow,
  type AdminPricingStatus,
} from './pricingService';
import {
  buildPriceSettingProductRows,
  formatPriceSettingVariantTabLabel,
  formatPricingMeterLabel,
  formatPricingMoney,
  formatPricingOperationLabel,
  formatPricingUnitLabel,
  formatPricingQuantity,
  formatOfficialRateScheduleLines,
  groupPriceSettingRatesByVariant,
  normalizePricingDecimal,
  officialRateVariantLabel,
  officialRateUnit,
  pricingRuleLifecycle,
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
  existingFormulaMode?: AdminPricingRuleItem['formulaMode'];
  existingMultiplier?: string;
  existingMarkupAmount?: string;
  conditions?: AdminPricingCondition[];
}

export interface PriceSettingMutation {
  action: 'upsert' | 'delete';
  id?: string;
  input?: AdminPricingRuleMutationInput;
}

export interface PriceSettingFormState {
  catalogKey: string;
  vendorCode: string;
  productCode: string;
  resourceCode: string;
  resourceDisplayName: string;
  providerCode: string;
  regionCode: string;
  resourceType: Exclude<PriceSettingResourceType, 'all'>;
  pricingPlanId: string;
  meterPrices: PriceSettingMeterForm[];
  removedRuleIds: string[];
  priceMode: PriceSettingMode;
  timeZone: string;
  weeklyWindows: AdminPricingScheduleWindow[];
  includeDates: string;
  excludeDates: string;
  priority: string;
  effectiveFrom: string;
  effectiveTo: string;
  status: AdminPricingStatus;
  /** Saving a price group applies one shared lifecycle policy to every meter. */
  metadataConflict?: boolean;
  acknowledgeMetadataConflict?: boolean;
}

function emptyMeter(key = 'meter-1'): PriceSettingMeterForm {
  return { key, meterCode: '', operationCode: '', unitCode: 'unit', unitSize: '1', customerPrice: '' };
}

const EMPTY_FORM: PriceSettingFormState = {
  catalogKey: '', vendorCode: '', productCode: '', resourceCode: '', resourceDisplayName: '', providerCode: '', regionCode: '', resourceType: 'llm', pricingPlanId: '',
  meterPrices: [emptyMeter()], priceMode: 'standard', timeZone: 'Asia/Shanghai', weeklyWindows: [{ ...DEFAULT_WINDOW }],
  removedRuleIds: [],
  includeDates: '', excludeDates: '', priority: '100', effectiveFrom: '', effectiveTo: '', status: 'active',
  metadataConflict: false, acknowledgeMetadataConflict: false,
};

export function PriceSettingsAdmin() {
  const { t, i18n } = useTranslation();
  const displayLocale = i18n.resolvedLanguage ?? i18n.language ?? 'en-US';
  const [officialCatalog, setOfficialCatalog] = useState<AdminOfficialPricingProductCatalog | null>(null);
  const [rules, setRules] = useState<AdminPricingRuleItem[]>([]);
  const [plans, setPlans] = useState<AdminPricingPlanItem[]>([]);
  const [pricingPlanId, setPricingPlanId] = useState('');
  const [resourceType, setResourceType] = useState<PriceSettingResourceType>('all');
  const [vendorCodes, setVendorCodes] = useState<string[]>([]);
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
  const loadSequence = useRef(0);

  const load = useCallback(async () => {
    const sequence = ++loadSequence.current;
    setLoading(true); setError(null);
    try {
      const pricingPlanItems = await pricingService.plans.listAll({ pageSize: 200, status: 'active' });
      const pricingPlans = { items: pricingPlanItems };
      const resolvedPlanId = pricingPlanId || pricingPlans.items[0]?.id || '';
      const [pricingRules, officialPrices] = await Promise.all([
        // Rules are loaded without the server-side keyword filter because the
        // product catalog search also covers display names, vendors, and
        // catalog keys that the admin rule endpoint does not index. Resolve
        // the plan first so the initial load never fetches every plan's rules.
        pricingService.rules.listAll({ pageSize: 200, pricingPlanId: resolvedPlanId || undefined }),
        pricingService.officialProducts.list({ category: resourceType, q: appliedSearch || undefined, vendorCodes: vendorCodes.length > 0 ? vendorCodes : undefined, regionCode: regionCode || undefined, page, pageSize }),
      ]);
      if (sequence !== loadSequence.current) return;
      setRules(pricingRules); setPlans(pricingPlans.items); setOfficialCatalog(officialPrices); setPricingPlanId(resolvedPlanId);
      setForm((current) => current.pricingPlanId || !resolvedPlanId ? current : { ...current, pricingPlanId: resolvedPlanId });
    } catch (cause) {
      if (sequence !== loadSequence.current) return;
      setError(errorMessageI18n(cause, t('admin.pricing.settings.errors.loadFailed'), t));
    } finally {
      if (sequence === loadSequence.current) setLoading(false);
    }
  }, [appliedSearch, page, pageSize, pricingPlanId, regionCode, resourceType, t, vendorCodes]);

  useEffect(() => { void load(); }, [load]);

  const planRules = useMemo(
    () => pricingPlanId ? rules.filter((rule) => rule.pricingPlanId === pricingPlanId) : [],
    [pricingPlanId, rules],
  );
  const productRows = useMemo(() => buildPriceSettingProductRows(officialCatalog?.items ?? [], planRules), [officialCatalog?.items, planRules]);
  const customRules = useMemo(() => {
    if (page !== 1) return [];
    const normalizedSearch = appliedSearch.trim().toLowerCase();
    return planRules.filter((rule) => !productRows.matchedRuleIds.has(rule.id)).filter(isProductScopedRule)
      .filter((rule) => vendorCodes.length === 0 || vendorCodes.includes(vendorFromCatalogKey(rule.catalogKey) || rule.providerCode || ''))
      .filter((rule) => !regionCode || (rule.regionCode ?? '') === regionCode)
      .filter((rule) => resourceType === 'all' || resourceTypeOf(rule) === resourceType)
      .filter((rule) => !normalizedSearch || [rule.productCode, rule.operationCode, rule.meterCode, rule.ruleCode, rule.catalogKey, rule.providerCode, rule.regionCode].filter(Boolean).some((value) => value!.toLowerCase().includes(normalizedSearch)));
  }, [appliedSearch, page, planRules, productRows.matchedRuleIds, regionCode, resourceType, vendorCodes]);
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
  const vendorOptions = useMemo(() => {
    const options = new Map((officialCatalog?.vendors ?? []).map((vendor) => [vendor.code, { code: vendor.code, count: formatPricingQuantity(vendor.count, vendor.count) }]));
    for (const code of vendorCodes) if (!options.has(code)) options.set(code, { code, count: '0' });
    return [...options.values()];
  }, [officialCatalog?.vendors, vendorCodes]);
  const summary = useMemo(() => ({
    products: productRows.rows.length,
    meters: productRows.rows.reduce((total, row) => total + row.prices.length, 0),
    configured: productRows.rows.reduce((total, row) => total + row.prices.filter((item) => pricingRuleLifecycle(item.rule) === 'active').length, 0),
  }), [productRows.rows]);
  const hasNextPage = officialCatalog?.pageInfo.hasMore ?? (officialCatalog?.pageInfo.totalPages ? page < officialCatalog.pageInfo.totalPages : false);

  const openCreate = () => { setForm({ ...EMPTY_FORM, pricingPlanId: pricingPlanId || plans[0]?.id || '', weeklyWindows: [{ ...DEFAULT_WINDOW }], meterPrices: [emptyMeter()] }); setFormError(null); setCreating(true); setPanelOpen(true); };
  const openProductSetting = (row: PriceSettingProductRow) => {
    const firstRule = row.prices.find((item) => item.rule)?.rule;
    const firstSchedule = row.prices.find((item) => item.rule?.schedule)?.rule?.schedule;
    const existingRules = row.prices
      .map((item) => item.rule)
      .filter((rule): rule is AdminPricingRuleItem => Boolean(rule));
    setForm({
      catalogKey: row.product.catalogKey ?? '', vendorCode: row.product.vendorCode, productCode: row.product.productCode, resourceCode: row.product.resourceCode, resourceDisplayName: row.product.resourceDisplayName, providerCode: row.product.providerCode, regionCode: row.product.regionCode,
      resourceType: resourceTypeOfProduct(row.product), pricingPlanId: pricingPlanId || firstRule?.pricingPlanId || plans[0]?.id || '',
      meterPrices: row.prices.map(({ official, rule }) => ({ key: official.rateCode, rateCode: official.rateCode, ruleId: rule?.id, ruleCode: rule?.ruleCode, meterCode: official.meterCode, operationCode: official.operationCode, unitCode: official.unitCode, unitSize: formatPricingQuantity(official.unitSize, official.unitSize), official, customerPrice: normalizePricingDecimal(rule?.unitPriceOverride), existingFormulaMode: rule?.formulaMode, existingMultiplier: normalizePricingDecimal(rule?.multiplier) || rule?.multiplier, existingMarkupAmount: normalizePricingDecimal(rule?.markupAmount) || rule?.markupAmount, conditions: rule?.conditions ?? [] })),
      removedRuleIds: [],
      priceMode: firstSchedule ? 'time_window' : 'standard', timeZone: firstSchedule?.timeZone ?? 'Asia/Shanghai',
      weeklyWindows: firstSchedule?.weeklyWindows.map((window) => ({ ...window, daysOfWeek: [...window.daysOfWeek] })) ?? [{ ...DEFAULT_WINDOW }],
      includeDates: firstSchedule?.includeDates.join(', ') ?? '', excludeDates: firstSchedule?.excludeDates.join(', ') ?? '', priority: String(firstRule?.priority ?? 100), effectiveFrom: firstRule?.effectiveFrom ?? '', effectiveTo: firstRule?.effectiveTo ?? '', status: firstRule?.status ?? 'active',
      metadataConflict: hasSharedMetadataConflict(existingRules), acknowledgeMetadataConflict: false,
    });
    setFormError(null); setCreating(false); setPanelOpen(true);
  };
  const openCustomSetting = (rule: AdminPricingRuleItem) => {
    setForm({
      catalogKey: rule.catalogKey ?? '', vendorCode: vendorFromCatalogKey(rule.catalogKey) || rule.providerCode || '', productCode: rule.productCode ?? rule.catalogKey ?? '', resourceCode: resourceFromCatalogKey(rule.catalogKey) || rule.productCode || '', resourceDisplayName: resourceFromCatalogKey(rule.catalogKey) || rule.productCode || '', providerCode: rule.providerCode ?? '', regionCode: rule.regionCode ?? '', resourceType: resourceTypeOf(rule), pricingPlanId: rule.pricingPlanId,
      meterPrices: [{ key: `rule:${rule.id}`, ruleId: rule.id, ruleCode: rule.ruleCode, meterCode: rule.meterCode ?? '', operationCode: rule.operationCode ?? '', unitCode: 'unit', unitSize: '1', customerPrice: normalizePricingDecimal(rule.unitPriceOverride), existingFormulaMode: rule.formulaMode, existingMultiplier: normalizePricingDecimal(rule.multiplier) || rule.multiplier, existingMarkupAmount: normalizePricingDecimal(rule.markupAmount) || rule.markupAmount, conditions: rule.conditions }],
      removedRuleIds: [],
      priceMode: rule.schedule ? 'time_window' : 'standard', timeZone: rule.schedule?.timeZone ?? 'Asia/Shanghai', weeklyWindows: rule.schedule?.weeklyWindows.map((window) => ({ ...window, daysOfWeek: [...window.daysOfWeek] })) ?? [{ ...DEFAULT_WINDOW }], includeDates: rule.schedule?.includeDates.join(', ') ?? '', excludeDates: rule.schedule?.excludeDates.join(', ') ?? '', priority: String(rule.priority), effectiveFrom: rule.effectiveFrom ?? '', effectiveTo: rule.effectiveTo ?? '', status: rule.status,
      metadataConflict: false, acknowledgeMetadataConflict: false,
    });
    setFormError(null); setCreating(false); setPanelOpen(true);
  };
  const closePanel = () => { setCreating(false); setFormError(null); setPanelOpen(false); };
  const setField = <K extends keyof PriceSettingFormState>(key: K, value: PriceSettingFormState[K]) => setForm((current) => ({ ...current, [key]: value }));
  const updateMeter = (index: number, patch: Partial<PriceSettingMeterForm>) => setForm((current) => ({ ...current, meterPrices: current.meterPrices.map((meter, meterIndex) => meterIndex === index ? { ...meter, ...patch } : meter) }));
  const addMeter = () => setForm((current) => ({ ...current, meterPrices: [...current.meterPrices, emptyMeter(`meter-${current.meterPrices.length + 1}-${Date.now()}`)] }));
  const removeMeter = (index: number) => setForm((current) => {
    const meter = current.meterPrices[index];
    const removedRuleIds = meter?.ruleId && !current.removedRuleIds.includes(meter.ruleId)
      ? [...current.removedRuleIds, meter.ruleId]
      : current.removedRuleIds;
    return { ...current, removedRuleIds, meterPrices: current.meterPrices.filter((_, meterIndex) => meterIndex !== index) };
  });
  const updateWindow = (index: number, patch: Partial<AdminPricingScheduleWindow>) => setForm((current) => ({ ...current, weeklyWindows: current.weeklyWindows.map((window, windowIndex) => windowIndex === index ? { ...window, ...patch } : window) }));
  const toggleWindowDay = (index: number, day: number) => { const window = form.weeklyWindows[index]; if (!window) return; updateWindow(index, { daysOfWeek: window.daysOfWeek.includes(day) ? window.daysOfWeek.filter((value) => value !== day) : [...window.daysOfWeek, day].sort((left, right) => left - right) }); };
  const addWindow = () => setForm((current) => { const existing = new Set(current.weeklyWindows.map((window) => window.windowCode)); let suffix = current.weeklyWindows.length + 1; let windowCode = `window-${suffix}`; while (existing.has(windowCode)) { suffix += 1; windowCode = `window-${suffix}`; } return { ...current, priceMode: 'time_window', weeklyWindows: [...current.weeklyWindows, { ...DEFAULT_WINDOW, windowCode }] }; });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setFormError(null);
    const applied: AppliedPriceSettingMutation[] = [];
    try {
      let confirmedForm = form;
      if (form.metadataConflict && !form.acknowledgeMetadataConflict) {
        if (!window.confirm(t('admin.pricing.settings.form.metadataConflictConfirm'))) {
          throw new Error(t('admin.pricing.settings.form.metadataConflictRequired'));
        }
        confirmedForm = { ...form, acknowledgeMetadataConflict: true };
      }
      const mutations = buildPriceSettingMutations(confirmedForm, t); setBusy(true);
      for (const mutation of mutations) {
        if (mutation.action === 'delete') {
          if (mutation.id) {
            const before = rules.find((rule) => rule.id === mutation.id);
            await pricingService.rules.delete(mutation.id);
            applied.push({ mutation, before });
          }
        } else if (mutation.id) {
          const before = rules.find((rule) => rule.id === mutation.id);
          const after = await pricingService.rules.update(mutation.id, mutation.input!);
          applied.push({ mutation, before, afterId: after.id });
        } else {
          const after = await pricingService.rules.create(mutation.input!);
          applied.push({ mutation, afterId: after.id });
        }
      }
      closePanel(); await load();
    } catch (cause) {
      const rollbackErrors = await rollbackPriceSettingMutations(applied);
      const baseMessage = errorMessageI18n(cause, t('admin.pricing.settings.errors.saveFailed'), t);
      setFormError(rollbackErrors.length > 0
        ? `${baseMessage} ${t('admin.pricing.settings.errors.partialSave', { count: rollbackErrors.length })}`
        : baseMessage);
      // The individual endpoints are transactional, but the group operation
      // is not. Refresh after both success and failure so the UI reflects the
      // authoritative server state, including any irrecoverable partial save.
      await load();
    } finally { setBusy(false); }
  };

  return <AdminPageShell>
    <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-white/10"><div><h1 className="text-lg font-semibold text-slate-900 dark:text-white">{t('admin.pricing.settings.title')}</h1><p className="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-400">{t('admin.pricing.settings.subtitle')}</p></div><button type="button" className={primaryButtonClass} onClick={openCreate}><Plus className="h-4 w-4" aria-hidden="true" />{t('admin.pricing.settings.actions.new')}</button></div>
    <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-slate-200 px-5 pt-3 dark:border-white/10" role="tablist" aria-label={t('admin.pricing.settings.tabs.label')}>{resourceTabs.map((type) => <button key={type} type="button" role="tab" aria-selected={resourceType === type} onClick={() => { setResourceType(type); setPage(1); }} className={`whitespace-nowrap border-b-2 px-3 pb-2.5 text-sm font-medium transition ${resourceType === type ? 'border-lobster-500 text-lobster-600 dark:text-lobster-400' : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}>{resourceTypeLabel(type, t)} <span className="ml-1 text-xs tabular-nums text-slate-400">{counts.get(type) ?? 0}</span></button>)}</div>
    <div className="grid shrink-0 grid-cols-1 border-b border-slate-200 bg-slate-50/70 sm:grid-cols-3 dark:border-white/10 dark:bg-white/[0.03]"><SummaryMetric label={t('admin.pricing.settings.summary.products')} value={String(summary.products)} /><SummaryMetric label={t('admin.pricing.settings.summary.meters')} value={String(summary.meters)} /><SummaryMetric label={t('admin.pricing.settings.summary.configured')} value={`${summary.configured}/${summary.meters || 0}`} /></div>
    <AdminListToolbar filters={<div className="flex min-w-0 flex-wrap items-center gap-2"><SearchBox value={search} onChange={setSearch} onSubmit={(value) => { setAppliedSearch(value); setPage(1); }} placeholder={t('admin.pricing.settings.search.placeholder')} /><VendorMultiSelect vendors={vendorOptions} value={vendorCodes} onChange={(next) => { setVendorCodes(next); setPage(1); }} placeholder={t('admin.pricing.settings.filters.allVendors')} /><select className={toolbarSelectClass} value={pricingPlanId} aria-label={t('admin.pricing.settings.filters.pricingPlan')} onChange={(event) => { setPricingPlanId(event.target.value); setPage(1); }}>{plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.planName || plan.planCode}</option>)}</select><select className={toolbarSelectClass} value={resourceType} aria-label={t('admin.pricing.settings.filters.resourceType')} onChange={(event) => { setResourceType(event.target.value as PriceSettingResourceType); setPage(1); }}>{resourceTabs.map((type) => <option key={type} value={type}>{resourceTypeLabel(type, t)}</option>)}</select><select className={toolbarSelectClass} value={regionCode} aria-label={t('admin.pricing.settings.filters.region')} onChange={(event) => { setRegionCode(event.target.value); setPage(1); }}><option value="">{t('admin.pricing.settings.filters.allRegions')}</option>{(officialCatalog?.regions ?? []).map((region) => <option key={region.code} value={region.code}>{region.code} ({formatPricingQuantity(region.count)})</option>)}</select></div>} />
    <AdminTableArea footer={<BottomPagination page={page} pageSize={pageSize} itemCount={productRows.rows.length + customRules.length} hasNextPage={hasNextPage} pageLabel={t('admin.pricing.common.pagination.page', { page })} pageSizeLabel={t('admin.pricing.common.pagination.rows')} previousLabel={t('admin.pricing.common.pagination.previous')} nextLabel={t('admin.pricing.common.pagination.next')} showingLabel={t('admin.pricing.common.pagination.showing')} onPreviousPage={() => setPage((current) => Math.max(1, current - 1))} onNextPage={() => setPage((current) => current + 1)} onPageSizeChange={(value) => { setPageSize(value); setPage(1); }} pageSizeOptions={[20, 50, 100]} />}>
      <table className="w-full min-w-[1360px] table-fixed text-left text-sm"><thead className="sticky top-0 z-10 border-b border-slate-200 bg-white text-xs uppercase tracking-wide text-slate-400 dark:border-white/10 dark:bg-slate-900"><tr><th className="w-[16%] px-4 py-3 font-medium">{t('admin.pricing.settings.table.resourceName')}</th><th className="w-[10%] px-4 py-3 font-medium">{t('admin.pricing.settings.table.resourceType')}</th><th className="w-[19%] px-4 py-3 font-medium">{t('admin.pricing.settings.table.pricingObject')}</th><th className="w-[25%] px-4 py-3 font-medium">{t('admin.pricing.settings.table.officialPrice')}</th><th className="w-[22%] px-4 py-3 font-medium">{t('admin.pricing.settings.table.customerPrice')}</th><th className="w-[8%] px-4 py-3 text-right font-medium">{t('admin.pricing.settings.table.actions')}</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-white/5">{loading || (productRows.rows.length === 0 && customRules.length === 0) ? <TableState loading={loading} empty={t('admin.pricing.settings.empty')} colSpan={6} /> : <>{productRows.rows.map((row) => <ProductPriceTableRow key={row.key} row={row} activeResourceType={resourceType} plans={plans} locale={displayLocale} t={t} onEdit={openProductSetting} />)}{customRules.map((rule) => <CustomPriceTableRow key={`rule:${rule.id}`} rule={rule} plans={plans} locale={displayLocale} t={t} onEdit={openCustomSetting} />)}</>}</tbody></table>
    </AdminTableArea>
    <InlineError message={error} />
    {panelOpen ? <SidePanel wide title={t(creating ? 'admin.pricing.settings.form.createTitle' : 'admin.pricing.settings.form.editTitle')} description={t('admin.pricing.settings.form.batchDescription')} onClose={closePanel} footer={<><button type="button" className={secondaryButtonClass} onClick={closePanel} disabled={busy}>{t('admin.pricing.common.form.cancel')}</button><button type="submit" form="price-setting-form" className={primaryButtonClass} disabled={busy}>{t('admin.pricing.settings.form.saveItems', { count: form.meterPrices.length })}</button></>}>
      <form id="price-setting-form" className="flex flex-col gap-5" onSubmit={handleSubmit}><InlineError message={formError} />
        <section className="rounded-lg border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.04]"><div className="mb-3 flex items-center justify-between gap-3"><div><h3 className="text-sm font-semibold text-slate-900 dark:text-white">{t('admin.pricing.settings.form.objectTitle')}</h3><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('admin.pricing.settings.form.objectHint')}</p></div><span className="rounded-full bg-lobster-50 px-2.5 py-1 text-xs font-medium text-lobster-700 dark:bg-lobster-500/10 dark:text-lobster-300">{resourceTypeLabel(form.resourceType, t)}</span></div>{form.resourceCode ? <div className="mb-4 border-b border-slate-200 pb-4 dark:border-white/10"><div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{t('admin.pricing.settings.form.resourceIdentity')}</div><div className="mt-1 text-base font-semibold text-slate-900 dark:text-white">{form.resourceDisplayName || form.resourceCode}</div><div className="mt-1 break-all font-mono text-xs text-slate-500 dark:text-slate-400">{form.resourceCode}{form.catalogKey && form.catalogKey !== form.resourceCode ? ` · ${form.catalogKey}` : ''}</div></div> : null}<div className="grid gap-4 md:grid-cols-2"><Field label={t('admin.pricing.settings.form.vendor')} hint={t('admin.pricing.settings.form.vendorHint')}><input className={inputClass} value={form.vendorCode} onChange={(event) => setField('vendorCode', event.target.value)} placeholder="openai / anthropic" readOnly={Boolean(form.catalogKey)} required /></Field><Field label={t('admin.pricing.settings.form.product')} hint={t('admin.pricing.settings.form.productHint')}><input className={inputClass} value={form.productCode} onChange={(event) => setField('productCode', event.target.value)} placeholder="gpt-4o / image-generation" required /></Field><Field label={t('admin.pricing.settings.form.resourceType')}><select className={selectClass} value={form.resourceType} onChange={(event) => setField('resourceType', event.target.value as PriceSettingFormState['resourceType'])}>{PRICE_SETTING_RESOURCE_TYPES.filter((type) => type !== 'all').map((type) => <option key={type} value={type}>{resourceTypeLabel(type, t)}</option>)}</select></Field><Field label={t('admin.pricing.settings.form.provider')} hint={t('admin.pricing.settings.form.providerHint')}><input className={inputClass} value={form.providerCode} onChange={(event) => setField('providerCode', event.target.value)} placeholder="openrouter / aliyun" /></Field><Field label={t('admin.pricing.settings.form.region')} hint={t('admin.pricing.settings.form.regionHint')}><input className={inputClass} value={form.regionCode} onChange={(event) => setField('regionCode', event.target.value)} placeholder="global / cn" /></Field></div></section>
        <section><div className="mb-3 flex items-end justify-between gap-3"><div><h3 className="text-sm font-semibold text-slate-900 dark:text-white">{t('admin.pricing.settings.form.priceGroupTitle')}</h3><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('admin.pricing.settings.form.priceGroupHint')}</p></div><button type="button" className={secondaryButtonClass} onClick={addMeter}><Plus className="h-3.5 w-3.5" aria-hidden="true" />{t('admin.pricing.settings.form.addMeter')}</button></div><div className="overflow-hidden rounded-lg border border-slate-200 dark:border-white/10"><div className="hidden grid-cols-[minmax(150px,1fr)_minmax(150px,1fr)_180px_36px] gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400 md:grid dark:border-white/10 dark:bg-white/[0.04]"><span>{t('admin.pricing.settings.form.meter')}</span><span>{t('admin.pricing.settings.table.officialPrice')}</span><span>{t('admin.pricing.settings.form.customerPrice')}</span><span /></div><div className="divide-y divide-slate-200 dark:divide-white/10">{form.meterPrices.map((meter, index) => <MeterFormRow key={meter.key} meter={meter} index={index} locale={displayLocale} t={t} updateMeter={updateMeter} removeMeter={removeMeter} />)}</div></div></section>
        <section className="grid gap-4 rounded-lg border border-slate-200 p-4 md:grid-cols-2 dark:border-white/10"><Field label={t('admin.pricing.settings.form.pricingPlan')} hint={t('admin.pricing.settings.form.pricingPlanHint')}><select className={selectClass} value={form.pricingPlanId} onChange={(event) => setField('pricingPlanId', event.target.value)} disabled={!creating} required><option value="">{t('admin.pricing.settings.form.pricingPlanPlaceholder')}</option>{plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.planName} ({plan.planCode})</option>)}</select></Field><Field label={t('admin.pricing.common.form.priority')}><input className={inputClass} value={form.priority} onChange={(event) => setField('priority', event.target.value)} inputMode="numeric" /></Field><Field label={t('admin.pricing.common.form.status')}><select className={selectClass} value={form.status} onChange={(event) => setField('status', event.target.value as AdminPricingStatus)}>{STATUSES.map((value) => <option key={value} value={value}>{t(`admin.pricing.common.status.${value}`)}</option>)}</select></Field><Field label={t('admin.pricing.settings.form.catalogKey')} hint={t('admin.pricing.settings.form.optional')}><input className={inputClass} value={form.catalogKey} onChange={(event) => setField('catalogKey', event.target.value)} placeholder="vendor/model" /></Field></section>
        <details className="rounded-lg border border-slate-200 dark:border-white/10"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white"><span>{t('admin.pricing.settings.form.advancedTitle')}</span><ChevronDown className="h-4 w-4 text-slate-400" aria-hidden="true" /></summary><div className="flex flex-col gap-4 border-t border-slate-200 px-4 py-4 dark:border-white/10"><Field label={t('admin.pricing.settings.form.priceMode')} hint={t('admin.pricing.settings.form.priceModeHint')}><div className="grid grid-cols-2 gap-2" role="group" aria-label={t('admin.pricing.settings.form.priceMode')}>{(['standard', 'time_window'] as const).map((mode) => <button key={mode} type="button" className={`rounded-md border px-3 py-2 text-sm font-medium transition ${form.priceMode === mode ? 'border-lobster-500 bg-lobster-50 text-lobster-700 dark:bg-lobster-500/10 dark:text-lobster-300' : 'border-slate-200 text-slate-600 hover:border-lobster-300 dark:border-white/10 dark:text-slate-300'}`} onClick={() => { setField('priceMode', mode); if (mode === 'time_window' && form.weeklyWindows.length === 0) setField('weeklyWindows', [{ ...DEFAULT_WINDOW }]); }}>{t(`admin.pricing.settings.mode.${mode === 'time_window' ? 'timeWindow' : 'standard'}`)}</button>)}</div></Field>{form.priceMode === 'time_window' ? <TimeWindowFields form={form} t={t} updateWindow={updateWindow} toggleWindowDay={toggleWindowDay} addWindow={addWindow} setField={setField} /> : null}<div className="grid gap-4 md:grid-cols-2"><Field label={t('admin.pricing.common.form.effectiveFrom')}><input className={inputClass} value={form.effectiveFrom} onChange={(event) => setField('effectiveFrom', event.target.value)} placeholder="2026-08-20T00:00:00Z" /></Field><Field label={t('admin.pricing.common.form.effectiveTo')}><input className={inputClass} value={form.effectiveTo} onChange={(event) => setField('effectiveTo', event.target.value)} placeholder="2026-08-20T00:00:00Z" /></Field></div></div></details>
      </form>
    </SidePanel> : null}
  </AdminPageShell>;
}

interface AppliedPriceSettingMutation {
  mutation: PriceSettingMutation;
  before?: AdminPricingRuleItem;
  afterId?: string;
}

async function rollbackPriceSettingMutations(
  applied: readonly AppliedPriceSettingMutation[],
): Promise<unknown[]> {
  const errors: unknown[] = [];
  for (const entry of [...applied].reverse()) {
    try {
      if (entry.mutation.action === 'delete') {
        if (!entry.before) throw new Error('deleted pricing rule snapshot is unavailable');
        await pricingService.rules.create(ruleToMutationInput(entry.before, true));
      } else if (entry.mutation.id) {
        if (!entry.before) throw new Error('updated pricing rule snapshot is unavailable');
        await pricingService.rules.update(entry.mutation.id, ruleToMutationInput(entry.before, false));
      } else if (entry.afterId) {
        await pricingService.rules.delete(entry.afterId);
      }
    } catch (error) {
      errors.push(error);
    }
  }
  return errors;
}

function ruleToMutationInput(
  rule: AdminPricingRuleItem,
  includeRuleCode: boolean,
): AdminPricingRuleMutationInput {
  return {
    ...(includeRuleCode ? { ruleCode: rule.ruleCode } : {}),
    pricingPlanId: rule.pricingPlanId,
    productCode: rule.productCode,
    operationCode: rule.operationCode,
    meterCode: rule.meterCode,
    providerCode: rule.providerCode,
    regionCode: rule.regionCode,
    catalogKey: rule.catalogKey,
    formulaMode: rule.formulaMode,
    multiplier: rule.multiplier,
    markupAmount: rule.markupAmount,
    unitPriceOverride: rule.unitPriceOverride,
    conditions: rule.conditions,
    schedule: rule.schedule,
    priority: rule.priority,
    effectiveFrom: rule.effectiveFrom,
    effectiveTo: rule.effectiveTo,
    status: rule.status,
  };
}

function SummaryMetric({ label, value }: { label: string; value: string }) { return <div className="border-b border-slate-200 px-5 py-3 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0 dark:border-white/10"><div className="text-xs text-slate-500 dark:text-slate-400">{label}</div><div className="mt-1 text-lg font-semibold tabular-nums text-slate-900 dark:text-white">{value}</div></div>; }

function VendorMultiSelect({ vendors, value, onChange, placeholder }: { vendors: { code: string; count: string }[]; value: string[]; onChange: (next: string[]) => void; placeholder: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [panelStyle, setPanelStyle] = useState<{ top: number; left: number; width: number } | null>(null);

  const updatePosition = useCallback(() => {
    const trigger = rootRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const width = Math.max(rect.width, 288);
    const left = Math.min(rect.left, Math.max(8, window.innerWidth - width - 8));
    setPanelStyle({ top: rect.bottom + 4, left, width });
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setPanelStyle(null);
      return;
    }
    updatePosition();
    const recompute = () => updatePosition();
    window.addEventListener('resize', recompute);
    window.addEventListener('scroll', recompute, true);
    return () => {
      window.removeEventListener('resize', recompute);
      window.removeEventListener('scroll', recompute, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const closeOnOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const toggle = (code: string) => onChange(value.includes(code) ? value.filter((item) => item !== code) : [...value, code]);
  const visible = value.slice(0, 2);

  return (
    <div ref={rootRef} className="relative w-52 shrink-0">
      <button
        type="button"
        className={`flex h-9 w-full items-center gap-1.5 rounded-md border px-2.5 text-left text-sm transition ${open ? 'border-lobster-500 ring-2 ring-lobster-500/15' : 'border-slate-300 hover:border-slate-400 dark:border-white/10 dark:hover:border-white/20'} ${value.length > 0 ? 'bg-white text-slate-900 dark:bg-white/5 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
          {value.length === 0 ? (
            <span className="truncate">{placeholder}</span>
          ) : (
            <>
              {visible.map((code) => (
                <span key={code} className="max-w-[92px] truncate rounded-full bg-lobster-50 px-1.5 py-0.5 text-xs font-medium text-lobster-700 dark:bg-lobster-500/10 dark:text-lobster-200">
                  {code}
                </span>
              ))}
              {value.length > visible.length ? (
                <span className="shrink-0 text-xs font-medium text-slate-500 dark:text-slate-400">+{value.length - visible.length}</span>
              ) : null}
            </>
          )}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && panelStyle
        ? createPortal(
            <div
              ref={panelRef}
              role="listbox"
              aria-multiselectable
              className="fixed z-[200] max-h-64 overflow-y-auto rounded-md border border-slate-200 bg-white p-1 shadow-lg dark:border-white/10 dark:bg-[#171717]"
              style={{ top: panelStyle.top, left: panelStyle.left, width: panelStyle.width }}
            >
              {vendors.length === 0 ? (
                <div className="px-2 py-3 text-xs text-slate-400">{placeholder}</div>
              ) : (
                vendors.map((vendor) => (
                  <label
                    key={vendor.code}
                    className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${value.includes(vendor.code) ? 'bg-lobster-50 text-lobster-700 dark:bg-lobster-500/10 dark:text-lobster-200' : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5'}`}
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 shrink-0 accent-lobster-600"
                      checked={value.includes(vendor.code)}
                      onChange={() => toggle(vendor.code)}
                    />
                    <span className="min-w-0 flex-1 truncate">{vendor.code}</span>
                    <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">{formatPricingQuantity(vendor.count)}</span>
                  </label>
                ))
              )}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function ProductPriceTableRow({ row, activeResourceType, plans, locale, t, onEdit }: { row: PriceSettingProductRow; activeResourceType: PriceSettingResourceType; plans: AdminPricingPlanItem[]; locale: string; t: TranslationFunction; onEdit: (row: PriceSettingProductRow) => void }) {
  const resourceType = activeResourceType === 'all' ? resourceTypeOfProduct(row.product) : activeResourceType;
  const translate = pricingConditionTranslate(t);
  const variantGroups = useMemo(() => groupPriceSettingRatesByVariant(row.prices), [row.prices]);
  const [activeVariant, setActiveVariant] = useState(variantGroups[0]?.key ?? 'standard');
  useEffect(() => {
    if (!variantGroups.some((group) => group.key === activeVariant)) {
      setActiveVariant(variantGroups[0]?.key ?? 'standard');
    }
  }, [activeVariant, variantGroups]);
  const activePrices = variantGroups.find((group) => group.key === activeVariant)?.prices ?? row.prices;
  const showVariantTabs = variantGroups.length > 1;
  return (
    <tr className="align-top hover:bg-slate-50 dark:hover:bg-white/5">
      <td className="px-4 py-4 text-slate-900 dark:text-white">
        <div className="break-words font-semibold">{row.product.resourceDisplayName || row.product.resourceCode || row.product.productDisplayName}</div>
        <div className="mt-1 break-all font-mono text-xs text-slate-500 dark:text-slate-400">{row.product.resourceCode}</div>
        {row.product.catalogKey && row.product.catalogKey !== row.product.resourceCode ? <div className="mt-1 break-all text-[11px] text-slate-400">{row.product.catalogKey}</div> : null}
      </td>
      <td className="px-4 py-4">
        <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 dark:bg-white/10 dark:text-slate-300">{resourceTypeLabel(resourceType, t)}</span>
      </td>
      <td className="px-4 py-4 text-[11px] text-slate-500 dark:text-slate-400">
        <div>{t('admin.pricing.settings.scope.vendor')}: {row.product.vendorCode || '—'}</div>
        <div className="mt-1">{t('admin.pricing.settings.scope.provider')}: {row.product.providerCode || '—'}</div>
        <div className="mt-1">{t('admin.pricing.settings.scope.region')}: {row.product.regionCode || '—'}</div>
        <div className="mt-1">{t('admin.pricing.settings.scope.product')}: {row.product.productCode || '—'}</div>
        <div className="mt-2">{t('admin.pricing.settings.table.rateCount', { count: activePrices.length })}</div>
      </td>
      <td className="px-4 py-4">
        {showVariantTabs ? (
          <PriceVariantTabs
            groups={variantGroups}
            activeKey={activeVariant}
            onChange={setActiveVariant}
            translate={translate}
            t={t}
            className="mb-2"
          />
        ) : null}
        <div className="flex flex-col gap-2">
          {activePrices.map(({ official }) => (
            <OfficialRateLine key={official.rateCode} official={official} locale={locale} t={t} showVariantBadge={!showVariantTabs} />
          ))}
        </div>
      </td>
      <td className="px-4 py-4">
        {showVariantTabs ? (
          <PriceVariantTabs
            groups={variantGroups}
            activeKey={activeVariant}
            onChange={setActiveVariant}
            translate={translate}
            t={t}
            className="mb-2"
          />
        ) : null}
        <div className="flex flex-col gap-2">
          {activePrices.map(({ official, rule }) => (
            <CustomerRateLine key={official.rateCode} official={official} rule={rule} plans={plans} locale={locale} t={t} showVariantBadge={!showVariantTabs} />
          ))}
        </div>
      </td>
      <td className="px-4 py-4 text-right">
        <button type="button" className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-2 text-xs font-semibold text-lobster-600 transition hover:bg-lobster-50 dark:text-lobster-300 dark:hover:bg-lobster-500/10" onClick={() => onEdit(row)}>
          <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
          {t('admin.pricing.settings.actions.editGroup')}
        </button>
      </td>
    </tr>
  );
}

function PriceVariantTabs({
  groups,
  activeKey,
  onChange,
  translate,
  t,
  className = '',
}: {
  groups: ReturnType<typeof groupPriceSettingRatesByVariant>;
  activeKey: string;
  onChange: (key: string) => void;
  translate: (key: string, fallback?: string) => string;
  t: TranslationFunction;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap gap-1 ${className}`.trim()} role="tablist" aria-label={t('admin.pricing.settings.tabs.variants')}>
      {groups.map((group) => {
        const selected = group.key === activeKey;
        const label = formatPriceSettingVariantTabLabel(group.key, translate);
        const scheduleLines = formatOfficialRateScheduleLines(group.prices[0]?.official.schedule, translate);
        return (
          <button
            key={group.key}
            type="button"
            role="tab"
            aria-selected={selected}
            title={scheduleLines.length > 0 ? `${t('admin.pricing.schedule.title')}\n${scheduleLines.join('\n')}` : undefined}
            onClick={() => onChange(group.key)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${selected ? 'bg-lobster-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/15'}`}
          >
            {label}
            <span className={`ml-1 tabular-nums ${selected ? 'text-white/80' : 'text-slate-400'}`}>{group.prices.length}</span>
          </button>
        );
      })}
    </div>
  );
}

function OfficialRateLine({ official, locale, t, showVariantBadge = true }: { official: AdminOfficialPricingRateItem; locale: string; t: TranslationFunction; showVariantBadge?: boolean }) {
  const translate = pricingConditionTranslate(t);
  const variantLabel = showVariantBadge ? officialRateVariantLabel(official, translate) : undefined;
  const scheduleLines = formatOfficialRateScheduleLines(official.schedule, translate);
  return (
    <div className="group/rate relative rounded-md border border-slate-200/80 bg-slate-50/60 px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-medium text-slate-800 dark:text-slate-100">{formatPricingMeterLabel(official, translate)}</span>
            {variantLabel ? (
              <span
                className={`inline-flex cursor-help rounded-full px-1.5 py-0.5 text-[10px] font-medium ${scheduleLines.length > 0 ? 'bg-amber-50 text-amber-700 underline decoration-dotted underline-offset-2 dark:bg-amber-500/10 dark:text-amber-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'}`}
              >
                {variantLabel}
              </span>
            ) : null}
          </div>
          <div className="mt-0.5 break-all text-[11px] text-slate-400">
            {formatPricingOperationLabel(official, translate)}
          </div>
        </div>
        <div className="shrink-0 text-right tabular-nums">
          <div className="font-semibold text-slate-900 dark:text-white">{formatPricingMoney(official.unitPrice, official.currencyCode, locale)}</div>
          <div className="mt-0.5 text-[11px] text-slate-400">/ {officialRateUnit(official, translate)}</div>
        </div>
      </div>
      {official.tiers.map((tier) => (
        <div key={tier.tierCode} className="mt-1 text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
          {formatPricingConditionScalarLabel(tier.tierCode, translate)}: {formatPricingMoney(tier.unitPrice, tier.currencyCode, locale)} / {formatPricingQuantity(tier.unitSize)} {formatPricingUnitLabel(official.unitCode, translate)} · {t('admin.pricing.settings.table.flatAmount')} {formatPricingMoney(tier.flatAmount, tier.currencyCode, locale)}
        </div>
      ))}
      {scheduleLines.length > 0 ? (
        <div
          role="tooltip"
          className="pointer-events-none absolute left-0 top-full z-40 mt-1 hidden w-max max-w-xs rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-[11px] leading-5 text-slate-600 shadow-lg group-hover/rate:block dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-300"
        >
          <div className="mb-1 font-semibold text-slate-800 dark:text-slate-100">{t('admin.pricing.schedule.title')}</div>
          {scheduleLines.map((line) => (
            <div key={line}>{line}</div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

type CustomerRateDescriptor = Pick<AdminOfficialPricingRateItem, 'meterCode' | 'meterDisplayName' | 'currencyCode' | 'conditions' | 'rateVariant'>
  & Partial<Pick<AdminOfficialPricingRateItem, 'unitPrice' | 'unitCode' | 'unitSize' | 'schedule'>>;

function CustomerRateLine({ official, rule, plans, locale, t, showVariantBadge = true }: { official: CustomerRateDescriptor; rule?: AdminPricingRuleItem; plans: AdminPricingPlanItem[]; locale: string; t: TranslationFunction; showVariantBadge?: boolean }) {
  const plan = rulesFindPlan(plans, rule);
  const lifecycle = pricingRuleLifecycle(rule);
  const salesPriceConfigured = lifecycle === 'active';
  const hasOfficialPrice = Boolean(official.unitPrice);
  const currency = plan?.currencyCode ?? official.currencyCode;
  const currencyMismatch = Boolean(salesPriceConfigured && rule && plan && official.currencyCode && plan.currencyCode !== official.currencyCode);
  const translate = pricingConditionTranslate(t);
  const variantLabel = showVariantBadge ? officialRateVariantLabel(official, translate) : undefined;
  const scheduleLines = formatOfficialRateScheduleLines(official.schedule ?? rule?.schedule, translate);
  const fallbackLabel = !hasOfficialPrice
    ? t('admin.pricing.settings.table.noOfficialFallback')
    : lifecycle === 'missing'
      ? t('admin.pricing.settings.table.followOfficial')
      : t(`admin.pricing.settings.table.fallback.${lifecycle}`);
  const salesValue = currencyMismatch
    ? t('admin.pricing.settings.table.currencyMismatch')
    : salesPriceConfigured && rule?.formulaMode === 'unit_price_override' && rule.unitPriceOverride
    ? formatPricingMoney(rule.unitPriceOverride, currency, locale)
    : salesPriceConfigured && rule
      ? t('admin.pricing.settings.table.formulaPrice')
      : hasOfficialPrice ? formatPricingMoney(official.unitPrice, official.currencyCode, locale) : '—';
  return (
    <div className={`group/rate relative rounded-md border px-3 py-2 dark:border-white/10 ${currencyMismatch ? 'border-red-200 bg-red-50/60 dark:border-red-500/30 dark:bg-red-500/10' : salesPriceConfigured ? 'border-lobster-200 bg-lobster-50/40 dark:bg-lobster-500/5' : 'border-slate-200/80 bg-slate-50/50 dark:bg-white/[0.02]'}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 flex-wrap items-center gap-1.5 font-medium text-slate-700 dark:text-slate-200">
          <span>{formatPricingMeterLabel(official, translate)}</span>
          {variantLabel ? (
            <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium ${scheduleLines.length > 0 ? 'cursor-help bg-amber-50 text-amber-700 underline decoration-dotted underline-offset-2 dark:bg-amber-500/10 dark:text-amber-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'}`}>
              {variantLabel}
            </span>
          ) : null}
        </span>
        {currencyMismatch ? <span className="text-[11px] font-medium text-red-600 dark:text-red-300">{t('admin.pricing.settings.table.currencyMismatch')}</span> : salesPriceConfigured && rule ? <StatusBadge status={rule.status} /> : <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{fallbackLabel}</span>}
      </div>
      <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className={`tabular-nums ${currencyMismatch ? 'font-semibold text-red-700 dark:text-red-200' : salesPriceConfigured ? 'font-semibold text-slate-900 dark:text-white' : 'font-medium text-slate-600 dark:text-slate-300'}`}>{salesValue}</span>
        {currencyMismatch ? <span className="text-[11px] text-red-500 dark:text-red-300">{official.currencyCode} → {plan?.currencyCode}</span> : salesPriceConfigured && rule ? <span className="text-[11px] text-slate-400">{rule.schedule ? t('admin.pricing.settings.mode.timeWindow') : t('admin.pricing.settings.mode.standard')} · {rule.planCode ?? plan?.planCode ?? rule.pricingPlanId}</span> : hasOfficialPrice ? <span className="text-[11px] text-slate-400">{t('admin.pricing.settings.table.officialFallbackValue', { value: formatPricingMoney(official.unitPrice, official.currencyCode, locale) })}</span> : <span className="text-[11px] text-amber-600 dark:text-amber-300">{t('admin.pricing.settings.table.noOfficialFallback')}</span>}
      </div>
      {scheduleLines.length > 0 ? (
        <div
          role="tooltip"
          className="pointer-events-none absolute left-0 top-full z-40 mt-1 hidden w-max max-w-xs rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-[11px] leading-5 text-slate-600 shadow-lg group-hover/rate:block dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-300"
        >
          <div className="mb-1 font-semibold text-slate-800 dark:text-slate-100">{t('admin.pricing.schedule.title')}</div>
          {scheduleLines.map((line) => (
            <div key={line}>{line}</div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function rulesFindPlan(plans: AdminPricingPlanItem[], rule?: AdminPricingRuleItem) {
  return rule ? plans.find((item) => item.id === rule.pricingPlanId) : undefined;
}

function pricingConditionTranslate(t: TranslationFunction): (key: string, fallback?: string) => string {
  return (key, fallback) => {
    const translated = String(t(key, fallback === undefined ? undefined : { defaultValue: fallback }));
    if (translated && translated !== key) return translated;
    return fallback ?? key;
  };
}

const RESOURCE_TYPE_FALLBACKS: Record<PriceSettingResourceType, string> = {
  all: 'All',
  llm: 'Text models',
  image: 'Image models',
  video: 'Video models',
  audio: 'Audio models',
  music: 'Music models',
  embedding: 'Embeddings',
  sound: 'Sound effect models',
  api: 'API calls',
  other: 'Other resources',
};

function resourceTypeLabel(type: string, t: TranslationFunction): string {
  const key = `admin.pricing.settings.resource.${type}`;
  const fallback = RESOURCE_TYPE_FALLBACKS[type as PriceSettingResourceType];
  if (fallback) {
    const translated = String(t(key, { defaultValue: fallback }));
    return translated === key ? fallback : translated;
  }
  return String(t('admin.pricing.settings.resource.unknown', { defaultValue: `Other (${type})`, code: type }))
    .replace(/\{\{\s*code\s*\}\}/g, type);
}

function formatPricingConditionScalarLabel(value: string, translate: (key: string, fallback?: string) => string): string {
  const key = `admin.pricing.condition.value.${value.trim().toLowerCase().replace(/-/g, '_')}`;
  const translated = translate(key, '');
  return translated && translated !== key ? translated : value;
}

function CustomPriceTableRow({ rule, plans, locale, t, onEdit }: { rule: AdminPricingRuleItem; plans: AdminPricingPlanItem[]; locale: string; t: TranslationFunction; onEdit: (rule: AdminPricingRuleItem) => void }) {
  const plan = plans.find((item) => item.id === rule.pricingPlanId);
  const official: CustomerRateDescriptor = { meterCode: rule.meterCode || rule.operationCode || 'default', meterDisplayName: rule.meterCode || rule.operationCode || t('admin.pricing.settings.table.defaultMeter'), currencyCode: plan?.currencyCode ?? 'CNY', conditions: rule.conditions ?? [], schedule: rule.schedule, rateVariant: rule.schedule ? 'time_window' : undefined };
  const resourceType = resourceTypeOf(rule);
  const resourceCode = resourceFromCatalogKey(rule.catalogKey) || rule.productCode || rule.ruleCode;
  return <tr className="align-top hover:bg-slate-50 dark:hover:bg-white/5"><td className="px-4 py-4 text-slate-900 dark:text-white"><div className="break-words font-semibold">{resourceCode}</div><div className="mt-1 break-all font-mono text-xs text-slate-500 dark:text-slate-400">{rule.catalogKey || rule.productCode || rule.ruleCode}</div><div className="mt-2 text-xs text-slate-400">{t('admin.pricing.settings.table.customPrice')}</div></td><td className="px-4 py-4"><span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 dark:bg-white/10 dark:text-slate-300">{resourceTypeLabel(resourceType, t)}</span></td><td className="px-4 py-4 text-[11px] text-slate-500 dark:text-slate-400"><div>{t('admin.pricing.settings.scope.provider')}: {rule.providerCode || '—'}</div><div className="mt-1">{t('admin.pricing.settings.scope.region')}: {rule.regionCode || '—'}</div><div className="mt-1">{t('admin.pricing.settings.scope.product')}: {rule.productCode || '—'}</div></td><td className="px-4 py-4 text-sm text-slate-400">{t('admin.pricing.settings.table.noOfficial')}</td><td className="px-4 py-4"><CustomerRateLine official={official} rule={rule} plans={plans} locale={locale} t={t} /></td><td className="px-4 py-4 text-right"><button type="button" className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-2 text-xs font-semibold text-lobster-600 transition hover:bg-lobster-50 dark:text-lobster-300 dark:hover:bg-lobster-500/10" onClick={() => onEdit(rule)}><Edit3 className="h-3.5 w-3.5" aria-hidden="true" />{t('admin.pricing.settings.common.edit')}</button></td></tr>;
}

function MeterFormRow({ meter, index, locale, t, updateMeter, removeMeter }: { meter: PriceSettingMeterForm; index: number; locale: string; t: TranslationFunction; updateMeter: (index: number, patch: Partial<PriceSettingMeterForm>) => void; removeMeter: (index: number) => void }) {
  const formula = meter.existingFormulaMode === 'multiplier_markup';
  const translate = pricingConditionTranslate(t);
  const variantLabel = meter.official ? officialRateVariantLabel(meter.official, translate) : undefined;
  const scheduleLines = meter.official ? formatOfficialRateScheduleLines(meter.official.schedule, translate) : [];
  return <div className="grid gap-3 px-3 py-3 md:grid-cols-[minmax(150px,1fr)_minmax(150px,1fr)_180px_36px] md:items-start"><div className="grid gap-2"><input className={inputClass} value={meter.meterCode} onChange={(event) => updateMeter(index, { meterCode: event.target.value })} placeholder={t('admin.pricing.settings.form.meterPlaceholder')} required={!meter.operationCode} /><input className={inputClass} value={meter.operationCode} onChange={(event) => updateMeter(index, { operationCode: event.target.value })} placeholder={t('admin.pricing.settings.form.operationPlaceholder')} required={!meter.meterCode} /><div className="text-[11px] text-slate-400">{formatPricingQuantity(meter.unitSize)} {formatPricingUnitLabel(meter.unitCode, translate)}{variantLabel ? ` · ${variantLabel}` : ''}{meter.ruleId ? ` · ${t('admin.pricing.settings.form.existing')}` : ''}</div></div><div className="group/rate relative min-h-9 rounded-md bg-slate-50 px-3 py-2 dark:bg-white/[0.04]">{meter.official ? <><div className="font-semibold tabular-nums text-slate-900 dark:text-white">{formatPricingMoney(meter.official.unitPrice, meter.official.currencyCode, locale)}</div><div className="mt-0.5 text-[11px] text-slate-400">/ {officialRateUnit(meter.official, translate)}{variantLabel ? ` · ${variantLabel}` : ''}</div>{scheduleLines.length > 0 ? <div role="tooltip" className="pointer-events-none absolute left-0 top-full z-40 mt-1 hidden w-max max-w-xs rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-[11px] leading-5 text-slate-600 shadow-lg group-hover/rate:block dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-300"><div className="mb-1 font-semibold text-slate-800 dark:text-slate-100">{t('admin.pricing.schedule.title')}</div>{scheduleLines.map((line) => <div key={line}>{line}</div>)}</div> : null}</> : <span className="text-xs text-slate-400">{t('admin.pricing.settings.table.noOfficial')}</span>}</div><div><label className="mb-1 block text-[11px] font-medium text-slate-500 dark:text-slate-400">{t('admin.pricing.settings.form.customerPrice')}</label><input className={inputClass} value={meter.customerPrice} onChange={(event) => updateMeter(index, { customerPrice: event.target.value, existingFormulaMode: event.target.value.trim() ? undefined : meter.existingFormulaMode })} placeholder={formula ? t('admin.pricing.settings.form.formulaPreserved') : t('admin.pricing.settings.form.followOfficialPlaceholder')} inputMode="decimal" /><div className="mt-1 text-[11px] text-slate-400">{formula ? t('admin.pricing.settings.form.formulaPreservedHint', { multiplier: normalizePricingDecimal(meter.existingMultiplier) || '1', markup: normalizePricingDecimal(meter.existingMarkupAmount) || '0' }) : t('admin.pricing.settings.form.followOfficialHint')}</div></div><button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-white/10 dark:hover:text-white" title={t('admin.pricing.settings.form.removeMeter')} aria-label={t('admin.pricing.settings.form.removeMeter')} onClick={() => removeMeter(index)}><Trash2 className="h-4 w-4" aria-hidden="true" /></button></div>;
}

function TimeWindowFields({ form, t, updateWindow, toggleWindowDay, addWindow, setField }: { form: PriceSettingFormState; t: TranslationFunction; updateWindow: (index: number, patch: Partial<AdminPricingScheduleWindow>) => void; toggleWindowDay: (index: number, day: number) => void; addWindow: () => void; setField: <K extends keyof PriceSettingFormState>(key: K, value: PriceSettingFormState[K]) => void }) {
  return <div className="flex flex-col gap-4 rounded-md bg-slate-50 p-3 dark:bg-white/[0.04]"><Field label={t('admin.pricing.settings.form.timeZone')} hint={t('admin.pricing.settings.form.timeZoneHint')}><input className={inputClass} list="pricing-time-zones" value={form.timeZone} onChange={(event) => setField('timeZone', event.target.value)} placeholder="Asia/Shanghai" required /><datalist id="pricing-time-zones"><option value="UTC" /><option value="Asia/Shanghai" /><option value="Asia/Tokyo" /><option value="America/Los_Angeles" /><option value="America/New_York" /><option value="Europe/London" /></datalist></Field><div className="flex items-center justify-between"><span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('admin.pricing.settings.form.windows')}</span><button type="button" className={secondaryButtonClass} onClick={addWindow}><Plus className="h-3.5 w-3.5" aria-hidden="true" />{t('admin.pricing.settings.form.addWindow')}</button></div>{form.weeklyWindows.map((window, index) => <div key={index} className="flex flex-col gap-3 rounded-md border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-slate-900"><div className="grid gap-3 md:grid-cols-[1fr_1fr_36px]"><Field label={t('admin.pricing.settings.form.windowCode')}><input className={inputClass} value={window.windowCode} onChange={(event) => updateWindow(index, { windowCode: event.target.value })} required /></Field><div className="grid grid-cols-2 gap-2"><Field label={t('admin.pricing.settings.form.startTime')}><input type="time" className={inputClass} value={window.startTime} onChange={(event) => updateWindow(index, { startTime: event.target.value })} required /></Field><Field label={t('admin.pricing.settings.form.endTime')}><input type="time" className={inputClass} value={window.endTime} onChange={(event) => updateWindow(index, { endTime: event.target.value })} required /></Field></div><button type="button" className="mt-5 inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10" title={t('admin.pricing.settings.form.removeWindow')} aria-label={t('admin.pricing.settings.form.removeWindow')} disabled={form.weeklyWindows.length <= 1} onClick={() => setField('weeklyWindows', form.weeklyWindows.filter((_, windowIndex) => windowIndex !== index))}><Trash2 className="h-4 w-4" aria-hidden="true" /></button></div><div><span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">{t('admin.pricing.settings.form.days')}</span><div className="flex flex-wrap gap-2">{DAY_OPTIONS.map((day, dayIndex) => <label key={day} className="inline-flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300"><input type="checkbox" checked={window.daysOfWeek.includes(day)} onChange={() => toggleWindowDay(index, day)} />{t(`admin.pricing.settings.days.${day}`, { defaultValue: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][dayIndex] })}</label>)}</div></div><label className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300"><input type="checkbox" checked={window.endDayOffset === 1} onChange={(event) => updateWindow(index, { endDayOffset: event.target.checked ? 1 : 0 })} />{t('admin.pricing.settings.form.crossMidnight')}</label></div>)}</div>;
}

function isPriceSettingResourceType(value: string): value is PriceSettingResourceType { return PRICE_SETTING_RESOURCE_TYPES.includes(value as PriceSettingResourceType); }
function resourceTypeOfProduct(item: AdminOfficialPricingProductItem): Exclude<PriceSettingResourceType, 'all'> { return item.groupCodes.find((code: string): code is Exclude<PriceSettingResourceType, 'all'> => code !== 'all' && isPriceSettingResourceType(code)) ?? 'other'; }
function resourceTypeOf(item: Pick<AdminPricingRuleItem, 'productCode' | 'operationCode' | 'meterCode' | 'catalogKey'>): Exclude<PriceSettingResourceType, 'all'> { const value = [item.productCode, item.operationCode, item.meterCode, item.catalogKey].filter(Boolean).join(' ').toLowerCase(); if (value.includes('embedding')) return 'embedding'; if (value.includes('image') || value.includes('vision')) return 'image'; if (value.includes('video')) return 'video'; if (value.includes('music')) return 'music'; if (value.includes('sound') || value.includes('sfx')) return 'sound'; if (value.includes('audio') || value.includes('speech') || value.includes('transcri')) return 'audio'; if (value.includes('api') || value.includes('request') || value.includes('result')) return 'api'; if (value.includes('chat') || value.includes('completion') || value.includes('llm') || value.includes('gpt') || value.includes('claude') || value.includes('gemini') || value.includes('deepseek') || value.includes('qwen') || value.includes('mistral') || value.includes('llama') || value.includes('glm') || value.includes('kimi') || value.includes('ernie') || value.includes('doubao') || value.includes('minimax') || value.includes('grok') || value.includes('command')) return 'llm'; return 'other'; }
function isProductScopedRule(rule: AdminPricingRuleItem): boolean { return Boolean(rule.productCode || rule.catalogKey || rule.operationCode || rule.meterCode || rule.providerCode || rule.regionCode); }
function vendorFromCatalogKey(catalogKey: string | undefined): string { return catalogKey?.split('/')[0]?.trim() ?? ''; }
function resourceFromCatalogKey(catalogKey: string | undefined): string { return catalogKey?.split('/').slice(1).join('/').trim() ?? ''; }

function hasSharedMetadataConflict(rules: readonly AdminPricingRuleItem[]): boolean {
  if (rules.length < 2) return false;
  const first = pricingMetadataSignature(rules[0]);
  return rules.slice(1).some((rule) => pricingMetadataSignature(rule) !== first);
}

function pricingMetadataSignature(rule: AdminPricingRuleItem): string {
  const schedule = rule.schedule
    ? {
      timeZone: rule.schedule.timeZone,
      weeklyWindows: rule.schedule.weeklyWindows
        .map((window) => ({ ...window, daysOfWeek: [...window.daysOfWeek].sort((left, right) => left - right) }))
        .sort((left, right) => left.windowCode.localeCompare(right.windowCode)),
      includeDates: [...rule.schedule.includeDates].sort(),
      excludeDates: [...rule.schedule.excludeDates].sort(),
    }
    : null;
  return JSON.stringify({
    schedule,
    priority: rule.priority,
    effectiveFrom: rule.effectiveFrom ?? null,
    effectiveTo: rule.effectiveTo ?? null,
    status: rule.status,
  });
}

export function buildPriceSettingMutations(form: PriceSettingFormState, t: TranslationFunction): PriceSettingMutation[] {
  const productCode = form.productCode.trim();
  const vendorCode = form.vendorCode.trim();
  if (!productCode) throw new Error(t('admin.pricing.settings.form.productRequired'));
  if (!vendorCode) throw new Error(t('admin.pricing.settings.form.vendorRequired'));
  if (!form.pricingPlanId.trim()) throw new Error(t('admin.pricing.settings.form.pricingPlanRequired'));
  if (form.meterPrices.length === 0 && form.removedRuleIds.length === 0) throw new Error(t('admin.pricing.settings.form.metersRequired'));
  if (form.metadataConflict && !form.acknowledgeMetadataConflict) {
    throw new Error(t('admin.pricing.settings.form.metadataConflictRequired'));
  }
  const priority = Number.parseInt(form.priority, 10);
  if (!Number.isInteger(priority) || priority < 0) throw new Error(t('admin.pricing.settings.form.priorityInvalid'));
  const effectiveFrom = parseFormTimestamp(form.effectiveFrom);
  const effectiveTo = parseFormTimestamp(form.effectiveTo);
  if (form.effectiveFrom.trim() && effectiveFrom === undefined) throw new Error(t('admin.pricing.settings.form.datetimeInvalid'));
  if (form.effectiveTo.trim() && effectiveTo === undefined) throw new Error(t('admin.pricing.settings.form.datetimeInvalid'));
  if (effectiveFrom !== undefined && effectiveTo !== undefined && effectiveTo <= effectiveFrom) {
    throw new Error(t('admin.pricing.settings.form.datetimeOrderInvalid'));
  }
  const schedule = buildPriceSchedule(form, t);
  const now = Date.now();
  const catalogKey = form.catalogKey.trim() || `${vendorCode}/${productCode}`;
  const mutations = form.meterPrices.flatMap((meter, index): PriceSettingMutation[] => {
    const meterCode = meter.meterCode.trim();
    const operationCode = meter.operationCode.trim();
    if (!meterCode && !operationCode) throw new Error(t('admin.pricing.settings.form.meterRequired'));
    const unitPrice = meter.customerPrice.trim();
    if (!unitPrice) {
      if (!meter.ruleId) return [];
      if (meter.existingFormulaMode === 'multiplier_markup') {
        return [{
          action: 'upsert',
          id: meter.ruleId,
          input: {
            ruleCode: meter.ruleCode,
            pricingPlanId: form.pricingPlanId.trim(),
            productCode,
            operationCode: operationCode || undefined,
            meterCode: meterCode || undefined,
            providerCode: form.providerCode.trim() || undefined,
            regionCode: form.regionCode.trim() || undefined,
            catalogKey,
            formulaMode: 'multiplier_markup',
            multiplier: meter.existingMultiplier || '1',
            markupAmount: meter.existingMarkupAmount || '0',
            schedule,
            priority,
            effectiveFrom: form.effectiveFrom.trim() || undefined,
            effectiveTo: form.effectiveTo.trim() || undefined,
            status: form.status,
            conditions: meter.conditions ?? [],
          },
        }];
      }
      return [{ action: 'delete', id: meter.ruleId }];
    }
    if (!/^[0-9]+(?:\.[0-9]{1,12})?$/.test(unitPrice)) throw new Error(t('admin.pricing.settings.form.unitPriceRequired'));
    const normalizedUnitPrice = normalizePricingDecimal(unitPrice);
    if (!normalizedUnitPrice || !/^[0-9]+(?:\.[0-9]{1,12})?$/.test(normalizedUnitPrice)) {
      throw new Error(t('admin.pricing.settings.form.unitPriceRequired'));
    }
    const ruleCode = meter.ruleCode || `${productCode}-${meterCode || operationCode || 'default'}-${now}-${index}`.replace(/[^A-Za-z0-9_.:-]/g, '-').slice(0, 96);
    return [{
      action: 'upsert',
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
        unitPriceOverride: normalizedUnitPrice,
        schedule,
        priority,
        effectiveFrom: form.effectiveFrom.trim() || undefined,
        effectiveTo: form.effectiveTo.trim() || undefined,
        status: form.status,
        conditions: meter.conditions ?? [],
      },
    }];
  });
  const removed = form.removedRuleIds
    .filter((id) => !mutations.some((mutation) => mutation.id === id))
    .map((id): PriceSettingMutation => ({ action: 'delete', id }));
  const allMutations = [...mutations, ...removed];
  if (allMutations.length === 0) throw new Error(t('admin.pricing.settings.form.salesPriceRequired'));
  return allMutations;
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
  if (dates.some((date) => !/^\d{4}-\d{2}-\d{2}$/.test(date) || !isValidIsoDate(date))) {
    throw new Error(t('admin.pricing.settings.form.dateInvalid'));
  }
  if (new Set(dates).size !== dates.length) {
    throw new Error(t('admin.pricing.settings.form.dateDuplicateInvalid'));
  }
  return dates;
}

function isValidIsoDate(value: string): boolean {
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function parseFormTimestamp(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : undefined;
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
