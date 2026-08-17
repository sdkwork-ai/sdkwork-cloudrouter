import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Edit3, Plus, Trash2 } from 'lucide-react';
import { BottomPagination } from '@sdkwork/cloudroutes-pc-commons';
import { useTranslation } from 'react-i18next';
import {
  pricingService,
  type AdminOfficialPricingCatalog,
  type AdminOfficialPricingRateItem,
  type AdminPricingPlanItem,
  type AdminPricingRuleItem,
  type AdminPricingRuleMutationInput,
  type AdminPricingSchedule,
  type AdminPricingScheduleWindow,
  type AdminPricingStatus,
} from './pricingService';
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

interface PriceSettingFormState {
  catalogKey: string;
  productCode: string;
  operationCode: string;
  meterCode: string;
  providerCode: string;
  regionCode: string;
  pricingPlanId: string;
  unitPrice: string;
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

const EMPTY_FORM: PriceSettingFormState = {
  catalogKey: '',
  productCode: '',
  operationCode: '',
  meterCode: '',
  providerCode: '',
  regionCode: '',
  pricingPlanId: '',
  unitPrice: '',
  priceMode: 'standard',
  timeZone: 'Asia/Shanghai',
  weeklyWindows: [DEFAULT_WINDOW],
  includeDates: '',
  excludeDates: '',
  priority: '100',
  effectiveFrom: '',
  effectiveTo: '',
  status: 'active',
};

export function PriceSettingsAdmin() {
  const { t } = useTranslation();
  const [officialCatalog, setOfficialCatalog] = useState<AdminOfficialPricingCatalog | null>(null);
  const [rules, setRules] = useState<AdminPricingRuleItem[]>([]);
  const [plans, setPlans] = useState<AdminPricingPlanItem[]>([]);
  const [resourceType, setResourceType] = useState<PriceSettingResourceType>('all');
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminPricingRuleItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<PriceSettingFormState>(EMPTY_FORM);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pricingRules, pricingPlans, officialPrices] = await Promise.all([
        pricingService.rules.list({ page: 1, pageSize: 200, q: appliedSearch || undefined }),
        pricingService.plans.list({ page: 1, pageSize: 200, status: 'active' }),
        pricingService.officialRates.list({
          category: resourceType,
          q: appliedSearch || undefined,
          page,
          pageSize,
        }),
      ]);
      setRules(pricingRules.items);
      setPlans(pricingPlans.items);
      setOfficialCatalog(officialPrices);
      setForm((current) => current.pricingPlanId || !pricingPlans.items[0]
        ? current
        : { ...current, pricingPlanId: pricingPlans.items[0].id });
    } catch (cause) {
      setError(errorMessageI18n(cause, t('admin.pricing.settings.errors.loadFailed'), t));
    } finally {
      setLoading(false);
    }
  }, [appliedSearch, page, pageSize, resourceType, t]);

  useEffect(() => { void load(); }, [load]);

  const rows = useMemo(() => buildPriceSettingRows(officialCatalog?.items ?? [], rules, resourceType, appliedSearch, page), [appliedSearch, officialCatalog?.items, page, resourceType, rules]);
  const counts = useMemo(() => {
    const values = new Map<PriceSettingResourceType, string>(PRICE_SETTING_RESOURCE_TYPES.map((type) => [type, '0']));
    for (const group of officialCatalog?.groups ?? []) {
      if (isPriceSettingResourceType(group.code)) values.set(group.code, group.count);
    }
    if (officialCatalog?.pageInfo.totalItems) values.set('all', officialCatalog.pageInfo.totalItems);
    return values;
  }, [officialCatalog]);
  const hasNextPage = officialCatalog?.pageInfo.hasMore
    ?? (officialCatalog?.pageInfo.totalPages ? page < officialCatalog.pageInfo.totalPages : false);

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, pricingPlanId: plans[0]?.id ?? '', weeklyWindows: [{ ...DEFAULT_WINDOW }] });
    setFormError(null);
    setCreating(true);
    setEditing(null);
  };
  const openOfficialRate = (official: AdminOfficialPricingRateItem, rule?: AdminPricingRuleItem) => {
    if (rule) {
      openEdit(rule);
      return;
    }
    setForm({
      ...EMPTY_FORM,
      catalogKey: official.catalogKey ?? '',
      productCode: official.productCode,
      operationCode: official.operationCode,
      meterCode: official.meterCode,
      providerCode: official.providerCode,
      regionCode: official.regionCode,
      pricingPlanId: plans[0]?.id ?? '',
      unitPrice: official.unitPrice,
      weeklyWindows: [{ ...DEFAULT_WINDOW }],
    });
    setFormError(null);
    setCreating(true);
    setEditing(null);
  };
  const openEdit = (item: AdminPricingRuleItem) => {
    setForm({
      catalogKey: item.catalogKey ?? '',
      productCode: item.productCode ?? item.catalogKey ?? '',
      operationCode: item.operationCode ?? '',
      meterCode: item.meterCode ?? '',
      providerCode: item.providerCode ?? '',
      regionCode: item.regionCode ?? '',
      pricingPlanId: item.pricingPlanId,
      unitPrice: item.unitPriceOverride ?? '',
      priceMode: item.schedule ? 'time_window' : 'standard',
      timeZone: item.schedule?.timeZone ?? 'Asia/Shanghai',
      weeklyWindows: item.schedule?.weeklyWindows.map((window) => ({ ...window, daysOfWeek: [...window.daysOfWeek] })) ?? [{ ...DEFAULT_WINDOW }],
      includeDates: item.schedule?.includeDates.join(', ') ?? '',
      excludeDates: item.schedule?.excludeDates.join(', ') ?? '',
      priority: String(item.priority),
      effectiveFrom: item.effectiveFrom ?? '',
      effectiveTo: item.effectiveTo ?? '',
      status: item.status,
    });
    setFormError(null);
    setEditing(item);
    setCreating(false);
  };
  const closePanel = () => { setCreating(false); setEditing(null); setFormError(null); };
  const setField = <K extends keyof PriceSettingFormState>(key: K, value: PriceSettingFormState[K]) => setForm((current) => ({ ...current, [key]: value }));
  const updateWindow = (index: number, patch: Partial<AdminPricingScheduleWindow>) => {
    setForm((current) => ({
      ...current,
      weeklyWindows: current.weeklyWindows.map((window, windowIndex) => windowIndex === index ? { ...window, ...patch } : window),
    }));
  };
  const toggleWindowDay = (index: number, day: number) => {
    const window = form.weeklyWindows[index];
    if (!window) return;
    const daysOfWeek = window.daysOfWeek.includes(day)
      ? window.daysOfWeek.filter((value) => value !== day)
      : [...window.daysOfWeek, day].sort((left, right) => left - right);
    updateWindow(index, { daysOfWeek });
  };
  const addWindow = () => setForm((current) => {
    const existing = new Set(current.weeklyWindows.map((window) => window.windowCode));
    let suffix = current.weeklyWindows.length + 1;
    let windowCode = `window-${suffix}`;
    while (existing.has(windowCode)) {
      suffix += 1;
      windowCode = `window-${suffix}`;
    }
    return { ...current, priceMode: 'time_window', weeklyWindows: [...current.weeklyWindows, { ...DEFAULT_WINDOW, windowCode, daysOfWeek: [1, 2, 3, 4, 5] }] };
  });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    try {
      const input = buildPriceSettingInput(form, editing === null, t, editing?.ruleCode);
      setBusy(true);
      if (editing) await pricingService.rules.update(editing.id, input);
      else await pricingService.rules.create(input);
      closePanel();
      await load();
    } catch (cause) {
      setFormError(errorMessageI18n(cause, t('admin.pricing.settings.errors.saveFailed'), t));
    } finally { setBusy(false); }
  };

  return (
    <AdminPageShell>
      <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-white/10">
        <div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-white">{t('admin.pricing.settings.title')}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('admin.pricing.settings.subtitle')}</p>
        </div>
        <button type="button" className={primaryButtonClass} onClick={openCreate}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          {t('admin.pricing.settings.actions.new')}
        </button>
      </div>
      <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-slate-200 px-5 pt-3 dark:border-white/10" role="tablist" aria-label={t('admin.pricing.settings.tabs.label')}>
        {PRICE_SETTING_RESOURCE_TYPES.map((type) => (
          <button key={type} type="button" role="tab" aria-selected={resourceType === type} onClick={() => { setResourceType(type); setPage(1); }} className={`whitespace-nowrap border-b-2 px-3 pb-2.5 text-sm font-medium transition ${resourceType === type ? 'border-lobster-500 text-lobster-600 dark:text-lobster-400' : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}>
            {t(`admin.pricing.settings.resource.${type}`)} <span className="ml-1 text-xs tabular-nums text-slate-400">{counts.get(type) ?? 0}</span>
          </button>
        ))}
      </div>
      <AdminListToolbar
        filters={<SearchBox value={search} onChange={setSearch} onSubmit={(value) => { setAppliedSearch(value); setPage(1); }} placeholder={t('admin.pricing.settings.search.placeholder')} />}
      />
      <AdminTableArea footer={<BottomPagination page={page} pageSize={pageSize} itemCount={rows.length} hasNextPage={hasNextPage} pageLabel={t('admin.pricing.common.pagination.page', 'Page {page}')} pageSizeLabel={t('admin.pricing.common.pagination.rows', 'Rows')} previousLabel={t('admin.pricing.common.pagination.previous', 'Previous page')} nextLabel={t('admin.pricing.common.pagination.next', 'Next page')} showingLabel={t('admin.pricing.common.pagination.showing', 'Showing')} onPreviousPage={() => setPage((current) => Math.max(1, current - 1))} onNextPage={() => setPage((current) => current + 1)} onPageSizeChange={(value) => { setPageSize(value); setPage(1); }} pageSizeOptions={[20, 50, 100]} />}>
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 z-10 border-b border-slate-200 bg-white text-xs uppercase tracking-wide text-slate-400 dark:border-white/10 dark:bg-slate-900"><tr>
            <th className="px-3 py-2 font-medium">{t('admin.pricing.settings.table.product')}</th>
            <th className="px-3 py-2 font-medium">{t('admin.pricing.settings.table.type')}</th>
            <th className="px-3 py-2 font-medium">{t('admin.pricing.settings.table.meter')}</th>
            <th className="px-3 py-2 font-medium">{t('admin.pricing.settings.table.officialPrice')}</th>
            <th className="px-3 py-2 font-medium">{t('admin.pricing.settings.table.customerPrice')}</th>
            <th className="px-3 py-2 font-medium">{t('admin.pricing.settings.table.plan')}</th>
            <th className="px-3 py-2 font-medium">{t('admin.pricing.settings.table.mode')}</th>
            <th className="px-3 py-2 font-medium">{t('admin.pricing.settings.table.scope')}</th>
            <th className="px-3 py-2 font-medium">{t('admin.pricing.common.table.status')}</th>
            <th className="px-3 py-2 font-medium">{t('admin.pricing.common.table.actions')}</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {loading || rows.length === 0 ? <TableState loading={loading} empty={t('admin.pricing.settings.empty')} colSpan={10} /> : rows.map(({ key, official, rule }) => (
              <tr key={key} className="hover:bg-slate-50 dark:hover:bg-white/5">
                <td className="px-3 py-2.5 text-slate-900 dark:text-white"><div className="font-medium">{official?.productDisplayName || rule?.productCode || rule?.catalogKey || rule?.ruleCode}</div>{official && official.productDisplayName !== official.productCode ? <div className="mt-0.5 text-xs text-slate-400">{official.productCode}</div> : null}</td>
                <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">{t(`admin.pricing.settings.resource.${official ? resourceTypeOfOfficial(official) : resourceTypeOf(rule!)}`)}</td>
                <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">{official?.meterDisplayName || rule?.meterCode || rule?.operationCode || '—'}{official?.unitCode ? <div className="mt-0.5 text-xs text-slate-400">{official.unitCode}</div> : null}</td>
                <td className="px-3 py-2.5 font-medium tabular-nums text-slate-900 dark:text-white">{official ? formatOfficialPrice(official) : '—'}</td>
                <td className="px-3 py-2.5 font-medium tabular-nums text-slate-900 dark:text-white">{rule?.unitPriceOverride ?? '—'}</td>
                <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">{rule ? rule.planCode ?? rule.pricingPlanId : '—'}</td>
                <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">{rule ? rule.schedule ? t('admin.pricing.settings.mode.timeWindow') : t('admin.pricing.settings.mode.standard') : '—'}</td>
                <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">{[official?.providerCode ?? rule?.providerCode, official?.regionCode ?? rule?.regionCode].filter(Boolean).join(' / ') || t('admin.pricing.settings.table.defaultScope')}</td>
                <td className="px-3 py-2.5">{rule ? <StatusBadge status={rule.status} /> : <span className="text-xs text-slate-400">{t('admin.pricing.settings.table.notConfigured')}</span>}</td>
                <td className="px-3 py-2.5"><button type="button" className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-semibold text-lobster-600 transition hover:bg-lobster-50 dark:text-lobster-300 dark:hover:bg-lobster-500/10" onClick={() => official ? openOfficialRate(official, rule) : openEdit(rule!)}><Edit3 className="h-3.5 w-3.5" aria-hidden="true" />{t(rule ? 'admin.pricing.common.actions.edit' : 'admin.pricing.settings.actions.setPrice')}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </AdminTableArea>
      <InlineError message={error} />
      {creating || editing ? <SidePanel title={t(creating ? 'admin.pricing.settings.form.createTitle' : 'admin.pricing.settings.form.editTitle')} onClose={closePanel} footer={<><button type="button" className={secondaryButtonClass} onClick={closePanel} disabled={busy}>{t('admin.pricing.common.form.cancel')}</button><button type="submit" form="price-setting-form" className={primaryButtonClass} disabled={busy}>{t('admin.pricing.common.form.save')}</button></>}>
        <form id="price-setting-form" className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <InlineError message={formError} />
          <Field label={t('admin.pricing.settings.form.product')} hint={t('admin.pricing.settings.form.productHint')}><input className={inputClass} value={form.productCode} onChange={(event) => setField('productCode', event.target.value)} placeholder="gpt-4o / image-generation" required /></Field>
          <div className="grid grid-cols-2 gap-4"><Field label={t('admin.pricing.settings.form.meter')}><input className={inputClass} value={form.meterCode} onChange={(event) => setField('meterCode', event.target.value)} placeholder="input_token" /></Field><Field label={t('admin.pricing.settings.form.operation')}><input className={inputClass} value={form.operationCode} onChange={(event) => setField('operationCode', event.target.value)} placeholder="chat.completions" /></Field></div>
          <Field label={t('admin.pricing.settings.form.unitPrice')} hint={t('admin.pricing.settings.form.unitPriceHint')}><input className={inputClass} value={form.unitPrice} onChange={(event) => setField('unitPrice', event.target.value)} placeholder="0.01" inputMode="decimal" required /></Field>
          <Field label={t('admin.pricing.settings.form.priceMode')} hint={t('admin.pricing.settings.form.priceModeHint')}>
            <div className="grid grid-cols-2 gap-2" role="group" aria-label={t('admin.pricing.settings.form.priceMode')}>
              {(['standard', 'time_window'] as const).map((mode) => <button key={mode} type="button" className={`rounded-md border px-3 py-2 text-sm font-medium transition ${form.priceMode === mode ? 'border-lobster-500 bg-lobster-50 text-lobster-700 dark:bg-lobster-500/10 dark:text-lobster-300' : 'border-slate-200 text-slate-600 hover:border-lobster-300 dark:border-white/10 dark:text-slate-300'}`} onClick={() => { setField('priceMode', mode); if (mode === 'time_window' && form.weeklyWindows.length === 0) setField('weeklyWindows', [{ ...DEFAULT_WINDOW }]); }}>{t(`admin.pricing.settings.mode.${mode === 'time_window' ? 'timeWindow' : 'standard'}`)}</button>)}
            </div>
          </Field>
          {form.priceMode === 'time_window' ? <div className="flex flex-col gap-4 rounded-md border border-slate-200 p-3 dark:border-white/10">
            <Field label={t('admin.pricing.settings.form.timeZone')} hint={t('admin.pricing.settings.form.timeZoneHint')}><input className={inputClass} list="pricing-time-zones" value={form.timeZone} onChange={(event) => setField('timeZone', event.target.value)} placeholder="Asia/Shanghai" required /><datalist id="pricing-time-zones"><option value="UTC" /><option value="Asia/Shanghai" /><option value="Asia/Tokyo" /><option value="America/Los_Angeles" /><option value="America/New_York" /><option value="Europe/London" /></datalist></Field>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between"><span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('admin.pricing.settings.form.windows')}</span><button type="button" className={secondaryButtonClass} onClick={addWindow}><Plus className="h-3.5 w-3.5" aria-hidden="true" />{t('admin.pricing.settings.form.addWindow')}</button></div>
              {form.weeklyWindows.map((window, index) => <div key={index} className="flex flex-col gap-3 rounded-md bg-slate-50 p-3 dark:bg-white/5">
                <div className="flex items-end gap-2"><Field label={t('admin.pricing.settings.form.windowCode')}><input className={inputClass} value={window.windowCode} onChange={(event) => updateWindow(index, { windowCode: event.target.value })} required /></Field><button type="button" className="mb-0.5 inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10" title={t('admin.pricing.settings.form.removeWindow')} aria-label={t('admin.pricing.settings.form.removeWindow')} disabled={form.weeklyWindows.length <= 1} onClick={() => setForm((current) => ({ ...current, weeklyWindows: current.weeklyWindows.filter((_, windowIndex) => windowIndex !== index) }))}><Trash2 className="h-4 w-4" aria-hidden="true" /></button></div>
                <div><span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">{t('admin.pricing.settings.form.days')}</span><div className="flex flex-wrap gap-2">{DAY_OPTIONS.map((day, dayIndex) => <label key={day} className="inline-flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300"><input type="checkbox" checked={window.daysOfWeek.includes(day)} onChange={() => toggleWindowDay(index, day)} />{t(`admin.pricing.settings.days.${day}`, DAY_LABELS[dayIndex])}</label>)}</div></div>
                <div className="grid grid-cols-2 gap-3"><Field label={t('admin.pricing.settings.form.startTime')}><input type="time" className={inputClass} value={window.startTime} onChange={(event) => updateWindow(index, { startTime: event.target.value })} required /></Field><Field label={t('admin.pricing.settings.form.endTime')}><input type="time" className={inputClass} value={window.endTime} onChange={(event) => updateWindow(index, { endTime: event.target.value })} required /></Field></div>
                <label className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300"><input type="checkbox" checked={window.endDayOffset === 1} onChange={(event) => updateWindow(index, { endDayOffset: event.target.checked ? 1 : 0 })} />{t('admin.pricing.settings.form.crossMidnight')}</label>
              </div>)}
            </div>
            <div className="grid grid-cols-2 gap-3"><Field label={t('admin.pricing.settings.form.includeDates')} hint={t('admin.pricing.settings.form.datesHint')}><input className={inputClass} value={form.includeDates} onChange={(event) => setField('includeDates', event.target.value)} placeholder="2026-01-01, 2026-02-01" /></Field><Field label={t('admin.pricing.settings.form.excludeDates')} hint={t('admin.pricing.settings.form.datesHint')}><input className={inputClass} value={form.excludeDates} onChange={(event) => setField('excludeDates', event.target.value)} placeholder="2026-01-02" /></Field></div>
          </div> : null}
          <Field label={t('admin.pricing.settings.form.pricingPlan')}><select className={selectClass} value={form.pricingPlanId} onChange={(event) => setField('pricingPlanId', event.target.value)} required><option value="">{t('admin.pricing.settings.form.pricingPlanPlaceholder')}</option>{plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.planName} ({plan.planCode})</option>)}</select></Field>
          <div className="grid grid-cols-2 gap-4"><Field label={t('admin.pricing.settings.form.provider')}><input className={inputClass} value={form.providerCode} onChange={(event) => setField('providerCode', event.target.value)} placeholder={t('admin.pricing.settings.form.optional')} /></Field><Field label={t('admin.pricing.settings.form.region')}><input className={inputClass} value={form.regionCode} onChange={(event) => setField('regionCode', event.target.value)} placeholder="global" /></Field></div>
          <Field label={t('admin.pricing.common.form.priority')}><input className={inputClass} value={form.priority} onChange={(event) => setField('priority', event.target.value)} inputMode="numeric" /></Field>
          <div className="grid grid-cols-2 gap-4"><Field label={t('admin.pricing.common.form.effectiveFrom')}><input className={inputClass} value={form.effectiveFrom} onChange={(event) => setField('effectiveFrom', event.target.value)} placeholder="YYYY-MM-DD HH:MM:SS" /></Field><Field label={t('admin.pricing.common.form.effectiveTo')}><input className={inputClass} value={form.effectiveTo} onChange={(event) => setField('effectiveTo', event.target.value)} placeholder="YYYY-MM-DD HH:MM:SS" /></Field></div>
          <Field label={t('admin.pricing.common.form.status')}><select className={selectClass} value={form.status} onChange={(event) => setField('status', event.target.value as AdminPricingStatus)}>{STATUSES.map((value) => <option key={value} value={value}>{t(`admin.pricing.common.status.${value}`)}</option>)}</select></Field>
        </form>
      </SidePanel> : null}
    </AdminPageShell>
  );
}

interface PriceSettingRow {
  key: string;
  official?: AdminOfficialPricingRateItem;
  rule?: AdminPricingRuleItem;
}

function buildPriceSettingRows(
  officialRates: AdminOfficialPricingRateItem[],
  rules: AdminPricingRuleItem[],
  resourceType: PriceSettingResourceType,
  search: string,
  page: number,
): PriceSettingRow[] {
  const matchedRuleIds = new Set<string>();
  const officialRows = officialRates.map((official) => {
    const matches = rules
      .filter((rule) => pricingRuleMatchesOfficialRate(rule, official))
      .sort((left, right) => ruleSpecificity(right) - ruleSpecificity(left) || left.priority - right.priority);
    for (const match of matches) matchedRuleIds.add(match.id);
    return { key: `official:${official.rateCode}`, official, rule: matches[0] };
  });
  if (page !== 1) return officialRows;

  const normalizedSearch = search.trim().toLowerCase();
  const customRows = rules
    .filter((rule) => !matchedRuleIds.has(rule.id))
    .filter((rule) => resourceType === 'all' || resourceTypeOf(rule) === resourceType)
    .filter((rule) => !normalizedSearch || [rule.productCode, rule.catalogKey, rule.operationCode, rule.meterCode, rule.ruleCode]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(normalizedSearch)))
    .map((rule) => ({ key: `rule:${rule.id}`, rule }));
  return [...officialRows, ...customRows];
}

function pricingRuleMatchesOfficialRate(rule: AdminPricingRuleItem, official: AdminOfficialPricingRateItem): boolean {
  if (!rule.productCode && !rule.catalogKey) return false;
  return dimensionMatches(rule.productCode, official.productCode)
    && dimensionMatches(rule.operationCode, official.operationCode)
    && dimensionMatches(rule.meterCode, official.meterCode)
    && dimensionMatches(rule.providerCode, official.providerCode)
    && dimensionMatches(rule.regionCode, official.regionCode)
    && dimensionMatches(rule.catalogKey, official.catalogKey ?? undefined);
}

function dimensionMatches(expected: string | undefined, actual: string | undefined): boolean {
  return !expected || expected.trim().toLowerCase() === actual?.trim().toLowerCase();
}

function ruleSpecificity(rule: AdminPricingRuleItem): number {
  return [rule.productCode, rule.operationCode, rule.meterCode, rule.providerCode, rule.regionCode, rule.catalogKey]
    .filter(Boolean).length;
}

function isPriceSettingResourceType(value: string): value is PriceSettingResourceType {
  return PRICE_SETTING_RESOURCE_TYPES.includes(value as PriceSettingResourceType);
}

function resourceTypeOfOfficial(item: AdminOfficialPricingRateItem): Exclude<PriceSettingResourceType, 'all'> {
  return item.groupCodes.find((code): code is Exclude<PriceSettingResourceType, 'all'> => code !== 'all' && isPriceSettingResourceType(code)) ?? 'other';
}

function formatOfficialPrice(item: AdminOfficialPricingRateItem): string {
  const unit = item.unitSize === '1' ? item.unitCode : `${item.unitSize} ${item.unitCode}`;
  return `${item.currencyCode} ${item.unitPrice} / ${unit}`;
}

function resourceTypeOf(item: Pick<AdminPricingRuleItem, 'productCode' | 'operationCode' | 'meterCode' | 'catalogKey'>): Exclude<PriceSettingResourceType, 'all'> {
  const value = [item.productCode, item.operationCode, item.meterCode, item.catalogKey].filter(Boolean).join(' ').toLowerCase();
  if (value.includes('embedding')) return 'embedding';
  if (value.includes('image') || value.includes('vision')) return 'image';
  if (value.includes('video')) return 'video';
  if (value.includes('music')) return 'music';
  if (value.includes('sound') || value.includes('sfx')) return 'sound';
  if (value.includes('audio') || value.includes('speech') || value.includes('transcri')) return 'audio';
  if (value.includes('api') || value.includes('request') || value.includes('result')) return 'api';
  if (value.includes('chat') || value.includes('completion') || value.includes('llm') || value.includes('gpt') || value.includes('claude') || value.includes('gemini') || value.includes('deepseek') || value.includes('qwen') || value.includes('mistral') || value.includes('llama') || value.includes('glm') || value.includes('kimi') || value.includes('ernie') || value.includes('doubao') || value.includes('minimax') || value.includes('grok') || value.includes('command')) return 'llm';
  return 'other';
}

function buildPriceSettingInput(form: PriceSettingFormState, create: boolean, t: TranslationFunction, existingRuleCode?: string): AdminPricingRuleMutationInput {
  const productCode = form.productCode.trim();
  if (!productCode) throw new Error(t('admin.pricing.settings.form.productRequired'));
  if (!form.pricingPlanId.trim()) throw new Error(t('admin.pricing.settings.form.pricingPlanRequired'));
  const unitPrice = form.unitPrice.trim();
  if (!/^[0-9]+(?:\.[0-9]{1,12})?$/.test(unitPrice)) throw new Error(t('admin.pricing.settings.form.unitPriceRequired'));
  const priority = Number.parseInt(form.priority, 10);
  if (!Number.isInteger(priority) || priority < 0) throw new Error(t('admin.pricing.settings.form.priorityInvalid'));
  const schedule = buildPriceSchedule(form, t);
  return {
    ruleCode: create ? `${productCode}-${form.meterCode.trim() || form.operationCode.trim() || 'default'}-${Date.now()}`.replace(/[^A-Za-z0-9_.:-]/g, '-').slice(0, 96) : existingRuleCode,
    pricingPlanId: form.pricingPlanId.trim(),
    productCode,
    operationCode: form.operationCode.trim() || undefined,
    meterCode: form.meterCode.trim() || undefined,
    providerCode: form.providerCode.trim() || undefined,
    regionCode: form.regionCode.trim() || undefined,
    catalogKey: form.catalogKey.trim() || undefined,
    formulaMode: 'unit_price_override',
    unitPriceOverride: unitPrice,
    schedule,
    priority,
    effectiveFrom: form.effectiveFrom.trim() || undefined,
    effectiveTo: form.effectiveTo.trim() || undefined,
    status: form.status,
  };
}

function buildPriceSchedule(form: PriceSettingFormState, t: TranslationFunction): AdminPricingSchedule | undefined {
  if (form.priceMode === 'standard') return undefined;
  const timeZone = form.timeZone.trim();
  if (!timeZone || !isIanaTimeZone(timeZone)) throw new Error(t('admin.pricing.settings.form.timeZoneInvalid'));
  if (form.weeklyWindows.length === 0) throw new Error(t('admin.pricing.settings.form.windowsRequired'));
  const windowCodes = new Set<string>();
  const weeklyWindows = form.weeklyWindows.map((window) => {
    const windowCode = window.windowCode.trim();
    if (!windowCode || windowCodes.has(windowCode)) throw new Error(t('admin.pricing.settings.form.windowCodeInvalid'));
    windowCodes.add(windowCode);
    if (window.daysOfWeek.length === 0) throw new Error(t('admin.pricing.settings.form.daysRequired'));
    if (!isClockTime(window.startTime) || !isClockTime(window.endTime)) throw new Error(t('admin.pricing.settings.form.timeInvalid'));
    const startTime = normalizeClockTime(window.startTime);
    const endTime = normalizeClockTime(window.endTime);
    if ((window.endDayOffset === 0 && startTime >= endTime) || (window.endDayOffset === 1 && startTime <= endTime)) throw new Error(t('admin.pricing.settings.form.timeOrderInvalid'));
    return { ...window, windowCode, startTime, endTime, daysOfWeek: [...new Set(window.daysOfWeek)].sort((left, right) => left - right) };
  });
  const includeDates = parseDateList(form.includeDates, t);
  const excludeDates = parseDateList(form.excludeDates, t);
  if (includeDates.some((date) => excludeDates.includes(date))) throw new Error(t('admin.pricing.settings.form.dateOverlapInvalid'));
  return { timeZone, weeklyWindows, includeDates, excludeDates };
}

function parseDateList(value: string, t: TranslationFunction): string[] {
  const dates = value.split(/[\s,]+/).map((date) => date.trim()).filter(Boolean);
  if (dates.length > 366) throw new Error(t('admin.pricing.settings.form.dateCountInvalid'));
  if (dates.some((date) => !/^\d{4}-\d{2}-\d{2}$/.test(date))) throw new Error(t('admin.pricing.settings.form.dateInvalid'));
  if (new Set(dates).size !== dates.length) throw new Error(t('admin.pricing.settings.form.dateDuplicateInvalid'));
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
