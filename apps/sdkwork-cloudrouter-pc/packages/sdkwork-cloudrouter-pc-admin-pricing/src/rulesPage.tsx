import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Edit3, Plus, Trash2 } from 'lucide-react';
import { BottomPagination, ConfirmDialog } from '@sdkwork/cloudroutes-pc-commons';
import { useTranslation } from 'react-i18next';
import {
  pricingService,
  type AdminFormulaMode,
  type AdminPricingCondition,
  type AdminPricingPlanItem,
  type AdminPricingRuleItem,
  type AdminPricingRuleMutationInput,
  type AdminPricingSchedule,
  type AdminPricingStatus,
} from './pricingService';
import {
  AdminListToolbar,
  AdminPageShell,
  AdminTableArea,
  dangerButtonClass,
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
  toolbarSelectClass,
} from './components';

type TranslationFunction = ReturnType<typeof useTranslation>['t'];

const FORMULA_MODES: AdminFormulaMode[] = ['multiplier_markup', 'unit_price_override'];
const STATUSES: AdminPricingStatus[] = ['active', 'inactive'];

interface RuleFormState {
  ruleCode: string;
  pricingPlanId: string;
  productCode: string;
  operationCode: string;
  meterCode: string;
  providerCode: string;
  regionCode: string;
  catalogKey: string;
  formulaMode: AdminFormulaMode;
  multiplier: string;
  markupAmount: string;
  unitPriceOverride: string;
  conditionsJson: string;
  scheduleJson: string;
  priority: string;
  effectiveFrom: string;
  effectiveTo: string;
  status: AdminPricingStatus;
}

const EMPTY_RULE_FORM: RuleFormState = {
  ruleCode: '',
  pricingPlanId: '',
  productCode: '',
  operationCode: '',
  meterCode: '',
  providerCode: '',
  regionCode: '',
  catalogKey: '',
  formulaMode: 'multiplier_markup',
  multiplier: '1',
  markupAmount: '0',
  unitPriceOverride: '',
  conditionsJson: '[]',
  scheduleJson: '',
  priority: '100',
  effectiveFrom: '',
  effectiveTo: '',
  status: 'active',
};

export function PricingRulesAdmin() {
  const { t } = useTranslation();
  const [items, setItems] = useState<AdminPricingRuleItem[]>([]);
  const [plans, setPlans] = useState<AdminPricingPlanItem[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [pageInfo, setPageInfo] = useState<{ totalItems?: string | number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<AdminPricingStatus | 'all'>('all');
  const [editing, setEditing] = useState<AdminPricingRuleItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminPricingRuleItem | null>(null);
  const [form, setForm] = useState<RuleFormState>(EMPTY_RULE_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rulesResult, plansResult] = await Promise.all([
        pricingService.rules.list({
          page,
          pageSize,
          q: appliedSearch || undefined,
          pricingPlanId: planFilter || undefined,
          status: statusFilter === 'all' ? undefined : statusFilter,
        }),
        pricingService.plans.list({ page: 1, pageSize: 200 }),
      ]);
      setItems(rulesResult.items);
      setPageInfo(rulesResult.pageInfo);
      setPlans(plansResult.items);
    } catch (cause) {
      setError(errorMessageI18n(cause, t('admin.pricing.rules.errors.loadFailed'), t));
    } finally {
      setLoading(false);
    }
  }, [appliedSearch, page, pageSize, planFilter, statusFilter, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalItems = useMemo(() => {
    const raw = pageInfo?.totalItems;
    return typeof raw === 'string' ? Number.parseInt(raw, 10) : (raw ?? 0);
  }, [pageInfo]);

  const openCreate = () => {
    setForm(EMPTY_RULE_FORM);
    setFormError(null);
    setCreating(true);
    setEditing(null);
  };

  const openEdit = (item: AdminPricingRuleItem) => {
    setForm({
      ruleCode: item.ruleCode,
      pricingPlanId: item.pricingPlanId,
      productCode: item.productCode ?? '',
      operationCode: item.operationCode ?? '',
      meterCode: item.meterCode ?? '',
      providerCode: item.providerCode ?? '',
      regionCode: item.regionCode ?? '',
      catalogKey: item.catalogKey ?? '',
      formulaMode: item.formulaMode,
      multiplier: item.multiplier,
      markupAmount: item.markupAmount,
      unitPriceOverride: item.unitPriceOverride ?? '',
      conditionsJson: JSON.stringify(item.conditions ?? [], null, 2),
      scheduleJson: item.schedule ? JSON.stringify(item.schedule, null, 2) : '',
      priority: String(item.priority),
      effectiveFrom: item.effectiveFrom ?? '',
      effectiveTo: item.effectiveTo ?? '',
      status: item.status,
    });
    setFormError(null);
    setEditing(item);
    setCreating(false);
  };

  const closePanel = () => {
    setCreating(false);
    setEditing(null);
    setFormError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    const input = buildRuleInput(form, editing === null, t);
    if (!input) {
      return;
    }
    setBusy(true);
    try {
      if (editing) {
        await pricingService.rules.update(editing.id, input);
      } else {
        await pricingService.rules.create(input);
      }
      closePanel();
      await load();
    } catch (cause) {
      setFormError(errorMessageI18n(cause, t('admin.pricing.rules.errors.saveFailed'), t));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await pricingService.rules.delete(deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch (cause) {
      setError(errorMessageI18n(cause, t('admin.pricing.rules.errors.deleteFailed'), t));
    } finally {
      setBusy(false);
    }
  };

  const setField = <K extends keyof RuleFormState>(key: K, value: RuleFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  return (
    <AdminPageShell>
      <AdminListToolbar
        filters={
          <>
            <SearchBox
              value={search}
              onChange={setSearch}
              onSubmit={(value) => {
                setAppliedSearch(value);
                setPage(1);
              }}
              placeholder={t('admin.pricing.rules.search.placeholder')}
            />
            <select
              className={toolbarSelectClass}
              value={planFilter}
              onChange={(event) => {
                setPlanFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="">{t('admin.pricing.rules.form.pricingPlanId')}: All</option>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.planName} ({plan.planCode})
                </option>
              ))}
            </select>
            <select
              className={toolbarSelectClass}
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as AdminPricingStatus | 'all');
                setPage(1);
              }}
            >
              <option value="all">{t('admin.pricing.common.table.status')}: All</option>
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {t(`admin.pricing.common.status.${status}`)}
                </option>
              ))}
            </select>
          </>
        }
        actions={
          <button type="button" className={primaryButtonClass} onClick={openCreate}>
            <Plus className="h-4 w-4" />
            {t('admin.pricing.rules.actions.new')}
          </button>
        }
      />
      <AdminTableArea
        footer={
          <BottomPagination
            page={page}
            pageSize={pageSize}
            itemCount={items.length}
            hasNextPage={Boolean(pageInfo?.totalItems && totalItems > page * pageSize)}
            pageLabel={t('admin.pricing.common.pagination.page', 'Page {page}')}
            pageSizeLabel={t('admin.pricing.common.pagination.rows', 'Rows')}
            previousLabel={t('admin.pricing.common.pagination.previous', 'Previous page')}
            nextLabel={t('admin.pricing.common.pagination.next', 'Next page')}
            showingLabel={t('admin.pricing.common.pagination.showing', 'Showing')}
            onPreviousPage={() => setPage((current) => Math.max(1, current - 1))}
            onNextPage={() => setPage((current) => current + 1)}
            onPageSizeChange={(nextPageSize) => {
              setPageSize(nextPageSize);
              setPage(1);
            }}
            pageSizeOptions={[20, 50, 100]}
          />
        }
      >
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 z-10 border-b border-slate-200 bg-white text-xs uppercase tracking-wide text-slate-400 dark:border-white/10 dark:bg-slate-900">
            <tr>
              <th className="px-3 py-2 font-medium">{t('admin.pricing.rules.table.ruleCode')}</th>
              <th className="px-3 py-2 font-medium">{t('admin.pricing.rules.table.plan')}</th>
              <th className="px-3 py-2 font-medium">{t('admin.pricing.rules.table.formulaMode')}</th>
              <th className="px-3 py-2 font-medium">{t('admin.pricing.rules.table.multiplier')}</th>
              <th className="px-3 py-2 font-medium">{t('admin.pricing.rules.table.markupAmount')}</th>
              <th className="px-3 py-2 font-medium">{t('admin.pricing.rules.table.unitPriceOverride')}</th>
              <th className="px-3 py-2 font-medium">{t('admin.pricing.rules.table.priority')}</th>
              <th className="px-3 py-2 font-medium">{t('admin.pricing.common.table.status')}</th>
              <th className="px-3 py-2 font-medium">{t('admin.pricing.common.table.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {loading || items.length === 0 ? (
              <TableState loading={loading} empty={t('admin.pricing.rules.empty')} colSpan={9} />
            ) : (
              items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-white/5">
                  <td className="px-3 py-2.5 font-medium text-slate-900 dark:text-white">{item.ruleCode}</td>
                  <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">
                    {item.planCode ?? item.pricingPlanId}
                  </td>
                  <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">
                    {t(`admin.pricing.formulaMode.${item.formulaMode}`)}
                  </td>
                  <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">{item.multiplier}</td>
                  <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">{item.markupAmount}</td>
                  <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">{item.unitPriceOverride ?? '—'}</td>
                  <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">{item.priority}</td>
                  <td className="px-3 py-2.5">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <button type="button" className={dangerButtonClass} onClick={() => openEdit(item)}>
                        <Edit3 className="h-3.5 w-3.5" />
                        {t('admin.pricing.common.actions.edit')}
                      </button>
                      <button
                        type="button"
                        className={dangerButtonClass}
                        onClick={() => setDeleteTarget(item)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {t('admin.pricing.common.actions.delete')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </AdminTableArea>
      <InlineError message={error} />
      {creating || editing ? (
        <SidePanel
          title={t(creating ? 'admin.pricing.rules.form.createTitle' : 'admin.pricing.rules.form.editTitle')}
          onClose={closePanel}
          footer={
            <>
              <button type="button" className={secondaryButtonClass} onClick={closePanel} disabled={busy}>
                {t('admin.pricing.common.form.cancel')}
              </button>
              <button type="submit" form="pricing-rule-form" className={primaryButtonClass} disabled={busy}>
                {t('admin.pricing.common.form.save')}
              </button>
            </>
          }
        >
          <form id="pricing-rule-form" className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <InlineError message={formError} />
            <Field label={t('admin.pricing.rules.form.ruleCode')}>
              <input
                className={inputClass}
                value={form.ruleCode}
                disabled={!creating}
                onChange={(event) => setField('ruleCode', event.target.value)}
                placeholder="e.g. llm-standard"
              />
            </Field>
            <Field label={t('admin.pricing.rules.form.pricingPlanId')}>
              <select
                className={selectClass}
                value={form.pricingPlanId}
                onChange={(event) => setField('pricingPlanId', event.target.value)}
              >
                <option value="">—</option>
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.planName} ({plan.planCode})
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t('admin.pricing.rules.form.formulaMode')}>
              <select
                className={selectClass}
                value={form.formulaMode}
                onChange={(event) => setField('formulaMode', event.target.value as AdminFormulaMode)}
              >
                {FORMULA_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {t(`admin.pricing.formulaMode.${mode}`)}
                  </option>
                ))}
              </select>
            </Field>
            {form.formulaMode === 'multiplier_markup' ? (
              <div className="grid grid-cols-2 gap-4">
                <Field label={t('admin.pricing.rules.form.multiplier')}>
                  <input
                    className={inputClass}
                    value={form.multiplier}
                    onChange={(event) => setField('multiplier', event.target.value)}
                    placeholder="1"
                  />
                </Field>
                <Field label={t('admin.pricing.rules.form.markupAmount')}>
                  <input
                    className={inputClass}
                    value={form.markupAmount}
                    onChange={(event) => setField('markupAmount', event.target.value)}
                    placeholder="0"
                  />
                </Field>
              </div>
            ) : (
              <Field label={t('admin.pricing.rules.form.unitPriceOverride')}>
                <input
                  className={inputClass}
                  value={form.unitPriceOverride}
                  onChange={(event) => setField('unitPriceOverride', event.target.value)}
                  placeholder="e.g. 0.02"
                />
              </Field>
            )}
            <Field label={t('admin.pricing.rules.form.conditions', 'Conditions JSON')} hint={t('admin.pricing.rules.form.conditionsHint', 'Use dimensionCode, operatorCode, and a scalar or scalar array value.')}>
              <textarea
                className={`${inputClass} min-h-24 font-mono text-xs`}
                value={form.conditionsJson}
                onChange={(event) => setField('conditionsJson', event.target.value)}
                spellCheck={false}
              />
            </Field>
            <Field label={t('admin.pricing.rules.form.schedule', 'Schedule JSON')} hint={t('admin.pricing.rules.form.scheduleHint', 'Leave empty for standard pricing; provide IANA timeZone and weeklyWindows for time-window pricing.')}>
              <textarea
                className={`${inputClass} min-h-32 font-mono text-xs`}
                value={form.scheduleJson}
                onChange={(event) => setField('scheduleJson', event.target.value)}
                placeholder={'{"timeZone":"Asia/Shanghai","weeklyWindows":[],"includeDates":[],"excludeDates":[]}' }
                spellCheck={false}
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label={`${t('admin.pricing.rules.form.productCode')} (${t('admin.pricing.rules.form.optional')})`}>
                <input
                  className={inputClass}
                  value={form.productCode}
                  onChange={(event) => setField('productCode', event.target.value)}
                />
              </Field>
              <Field label={`${t('admin.pricing.rules.form.operationCode')} (${t('admin.pricing.rules.form.optional')})`}>
                <input
                  className={inputClass}
                  value={form.operationCode}
                  onChange={(event) => setField('operationCode', event.target.value)}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label={`${t('admin.pricing.rules.form.meterCode')} (${t('admin.pricing.rules.form.optional')})`}>
                <input
                  className={inputClass}
                  value={form.meterCode}
                  onChange={(event) => setField('meterCode', event.target.value)}
                />
              </Field>
              <Field label={`${t('admin.pricing.rules.form.providerCode')} (${t('admin.pricing.rules.form.optional')})`}>
                <input
                  className={inputClass}
                  value={form.providerCode}
                  onChange={(event) => setField('providerCode', event.target.value)}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label={`${t('admin.pricing.rules.form.regionCode')} (${t('admin.pricing.rules.form.optional')})`}>
                <input
                  className={inputClass}
                  value={form.regionCode}
                  onChange={(event) => setField('regionCode', event.target.value)}
                />
              </Field>
              <Field label={`${t('admin.pricing.rules.form.catalogKey')} (${t('admin.pricing.rules.form.optional')})`}>
                <input
                  className={inputClass}
                  value={form.catalogKey}
                  onChange={(event) => setField('catalogKey', event.target.value)}
                />
              </Field>
            </div>
            <Field label={t('admin.pricing.common.form.priority')}>
              <input
                className={inputClass}
                value={form.priority}
                onChange={(event) => setField('priority', event.target.value)}
                placeholder="100"
              />
            </Field>
            <Field label={t('admin.pricing.common.form.effectiveFrom')} hint={t('admin.pricing.common.form.effectiveHint')}>
              <input
                className={inputClass}
                value={form.effectiveFrom}
                onChange={(event) => setField('effectiveFrom', event.target.value)}
                placeholder="YYYY-MM-DD HH:MM:SS"
              />
            </Field>
            <Field label={t('admin.pricing.common.form.effectiveTo')}>
              <input
                className={inputClass}
                value={form.effectiveTo}
                onChange={(event) => setField('effectiveTo', event.target.value)}
                placeholder="YYYY-MM-DD HH:MM:SS"
              />
            </Field>
            <Field label={t('admin.pricing.common.form.status')}>
              <select
                className={selectClass}
                value={form.status}
                onChange={(event) => setField('status', event.target.value as AdminPricingStatus)}
              >
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {t(`admin.pricing.common.status.${status}`)}
                  </option>
                ))}
              </select>
            </Field>
          </form>
        </SidePanel>
      ) : null}
      {deleteTarget ? (
        <ConfirmDialog
          title={t('admin.pricing.rules.delete.title')}
          description={t('admin.pricing.rules.delete.description', { name: deleteTarget.ruleCode })}
          isBusy={busy}
          confirmLabel={t('admin.pricing.common.actions.delete')}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      ) : null}
    </AdminPageShell>
  );
}

function buildRuleInput(
  form: RuleFormState,
  create: boolean,
  t: TranslationFunction,
): AdminPricingRuleMutationInput | null {
  const ruleCode = form.ruleCode.trim();
  if (create && !ruleCode) {
    return fail(t('admin.pricing.rules.form.ruleCodeRequired'));
  }
  if (!form.pricingPlanId.trim()) {
    return fail(t('admin.pricing.rules.form.pricingPlanRequired'));
  }
  const priority = Number.parseInt(form.priority.trim(), 10);
  if (!Number.isInteger(priority) || priority < 0) {
    return fail('priority must be a non-negative integer');
  }
  return {
    ruleCode: ruleCode || undefined,
    pricingPlanId: form.pricingPlanId.trim(),
    productCode: form.productCode.trim() || undefined,
    operationCode: form.operationCode.trim() || undefined,
    meterCode: form.meterCode.trim() || undefined,
    providerCode: form.providerCode.trim() || undefined,
    regionCode: form.regionCode.trim() || undefined,
    catalogKey: form.catalogKey.trim() || undefined,
    formulaMode: form.formulaMode,
    multiplier: form.formulaMode === 'multiplier_markup' ? form.multiplier.trim() || '1' : undefined,
    markupAmount: form.formulaMode === 'multiplier_markup' ? form.markupAmount.trim() || '0' : undefined,
    unitPriceOverride:
      form.formulaMode === 'unit_price_override'
        ? form.unitPriceOverride.trim() || undefined
        : undefined,
    conditions: parseJsonField<AdminPricingCondition[]>(form.conditionsJson, 'conditions', []),
    schedule: parseOptionalJsonField<AdminPricingSchedule>(form.scheduleJson, 'schedule'),
    priority,
    effectiveFrom: form.effectiveFrom.trim() || undefined,
    effectiveTo: form.effectiveTo.trim() || undefined,
    status: form.status,
  };
}

function fail(message: string): null {
  throw new Error(message);
}

function parseJsonField<T>(value: string, fieldName: string, fallback: T): T {
  if (!value.trim()) {
    return fallback;
  }
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`${fieldName} must be valid JSON`);
  }
}

function parseOptionalJsonField<T>(value: string, fieldName: string): T | undefined {
  return value.trim() ? parseJsonField<T>(value, fieldName, undefined as T) : undefined;
}
