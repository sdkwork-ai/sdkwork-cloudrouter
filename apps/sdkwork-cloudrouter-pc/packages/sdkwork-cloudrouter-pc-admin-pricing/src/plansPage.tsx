import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Edit3, Plus } from 'lucide-react';
import { AdminTableShell, BottomPagination } from '@sdkwork/cloudroutes-pc-commons';
import { useTranslation } from 'react-i18next';
import {
  pricingService,
  type AdminBasePriceSide,
  type AdminPricingPlanItem,
  type AdminPricingPlanMutationInput,
  type AdminPricingStatus,
  type AdminRoundingMode,
} from './pricingService';
import {
  AdminPageShell,
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
} from './components';

type TranslationFunction = ReturnType<typeof useTranslation>['t'];

const BASE_PRICE_SIDES: AdminBasePriceSide[] = [
  'official_reference',
  'upstream_cost',
  'customer_charge',
  'internal_transfer',
];
const ROUNDING_MODES: AdminRoundingMode[] = ['half_up', 'half_even', 'up', 'down'];
const STATUSES: AdminPricingStatus[] = ['active', 'inactive'];

interface PlanFormState {
  planCode: string;
  planName: string;
  basePriceSide: AdminBasePriceSide;
  currencyCode: string;
  roundingMode: AdminRoundingMode;
  minimumChargeAmount: string;
  effectiveFrom: string;
  effectiveTo: string;
  status: AdminPricingStatus;
}

const EMPTY_PLAN_FORM: PlanFormState = {
  planCode: '',
  planName: '',
  basePriceSide: 'official_reference',
  currencyCode: 'CNY',
  roundingMode: 'half_up',
  minimumChargeAmount: '0',
  effectiveFrom: '',
  effectiveTo: '',
  status: 'active',
};

export function PricePlansAdmin() {
  const { t } = useTranslation();
  const [items, setItems] = useState<AdminPricingPlanItem[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [pageInfo, setPageInfo] = useState<{ totalItems?: string | number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<AdminPricingStatus | 'all'>('all');
  const [sideFilter, setSideFilter] = useState<AdminBasePriceSide | 'all'>('all');
  const [editing, setEditing] = useState<AdminPricingPlanItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<PlanFormState>(EMPTY_PLAN_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await pricingService.plans.list({
        page,
        pageSize,
        q: appliedSearch || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        basePriceSide: sideFilter === 'all' ? undefined : sideFilter,
      });
      setItems(result.items);
      setPageInfo(result.pageInfo);
    } catch (cause) {
      setError(errorMessageI18n(cause, t('admin.pricing.plans.errors.loadFailed'), t));
    } finally {
      setLoading(false);
    }
  }, [appliedSearch, page, pageSize, statusFilter, sideFilter, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalItems = useMemo(() => {
    const raw = pageInfo?.totalItems;
    return typeof raw === 'string' ? Number.parseInt(raw, 10) : (raw ?? 0);
  }, [pageInfo]);

  const openCreate = () => {
    setForm(EMPTY_PLAN_FORM);
    setFormError(null);
    setCreating(true);
    setEditing(null);
  };

  const openEdit = (item: AdminPricingPlanItem) => {
    setForm({
      planCode: item.planCode,
      planName: item.planName,
      basePriceSide: item.basePriceSide,
      currencyCode: item.currencyCode,
      roundingMode: item.roundingMode,
      minimumChargeAmount: item.minimumChargeAmount,
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
    const input = buildPlanInput(form, editing === null, t);
    if (!input) {
      return;
    }
    setBusy(true);
    try {
      if (editing) {
        await pricingService.plans.update(editing.id, input);
      } else {
        await pricingService.plans.create(input);
      }
      closePanel();
      await load();
    } catch (cause) {
      setFormError(errorMessageI18n(cause, t('admin.pricing.plans.errors.saveFailed'), t));
    } finally {
      setBusy(false);
    }
  };

  const setField = <K extends keyof PlanFormState>(key: K, value: PlanFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  return (
    <AdminPageShell>
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-white/10">
        <div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-white">{t('admin.pricing.plans.title')}</h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{t('admin.menu.home.pricingManagement')}</p>
        </div>
        <button type="button" className={primaryButtonClass} onClick={openCreate}>
          <Plus className="h-4 w-4" />
          {t('admin.pricing.plans.actions.new')}
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-3 px-5 py-3">
        <SearchBox value={search} onChange={setSearch} placeholder={t('admin.pricing.plans.search.placeholder')} />
        <button
          type="button"
          className={secondaryButtonClass}
          onClick={() => setAppliedSearch(search.trim())}
        >
          {t('admin.pricing.common.search.placeholder')}
        </button>
        <select
          className={`${selectClass} w-44`}
          value={sideFilter}
          onChange={(event) => {
            setSideFilter(event.target.value as AdminBasePriceSide | 'all');
            setPage(1);
          }}
        >
          <option value="all">{t('admin.pricing.plans.form.basePriceSide')}: All</option>
          {BASE_PRICE_SIDES.map((side) => (
            <option key={side} value={side}>
              {t(`admin.pricing.basePriceSide.${side}`)}
            </option>
          ))}
        </select>
        <select
          className={`${selectClass} w-36`}
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
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-5 pb-4">
        <AdminTableShell>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400 dark:border-white/10">
              <tr>
                <th className="px-3 py-2 font-medium">{t('admin.pricing.plans.table.planCode')}</th>
                <th className="px-3 py-2 font-medium">{t('admin.pricing.plans.table.planName')}</th>
                <th className="px-3 py-2 font-medium">{t('admin.pricing.plans.table.basePriceSide')}</th>
                <th className="px-3 py-2 font-medium">{t('admin.pricing.plans.table.currencyCode')}</th>
                <th className="px-3 py-2 font-medium">{t('admin.pricing.plans.table.roundingMode')}</th>
                <th className="px-3 py-2 font-medium">{t('admin.pricing.plans.table.minimumChargeAmount')}</th>
                <th className="px-3 py-2 font-medium">{t('admin.pricing.common.table.status')}</th>
                <th className="px-3 py-2 font-medium">{t('admin.pricing.common.updatedAt')}</th>
                <th className="px-3 py-2 font-medium">{t('admin.pricing.common.table.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {loading || items.length === 0 ? (
                <TableState
                  loading={loading}
                  empty={t('admin.pricing.plans.empty')}
                  colSpan={9}
                />
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-white/5">
                    <td className="px-3 py-2.5 font-medium text-slate-900 dark:text-white">{item.planCode}</td>
                    <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">{item.planName}</td>
                    <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">
                      {t(`admin.pricing.basePriceSide.${item.basePriceSide}`)}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">{item.currencyCode}</td>
                    <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">
                      {t(`admin.pricing.roundingMode.${item.roundingMode}`)}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">{item.minimumChargeAmount}</td>
                    <td className="px-3 py-2.5">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-3 py-2.5 text-slate-400 dark:text-slate-500">{item.updatedAt ?? '—'}</td>
                    <td className="px-3 py-2.5">
                      <button type="button" className={dangerButtonClass} onClick={() => openEdit(item)}>
                        <Edit3 className="h-3.5 w-3.5" />
                        {t('admin.pricing.common.actions.edit')}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </AdminTableShell>
        <div className="mt-3">
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
        </div>
      </div>
      <InlineError message={error} />
      {creating || editing ? (
        <SidePanel
          title={t(creating ? 'admin.pricing.plans.form.createTitle' : 'admin.pricing.plans.form.editTitle')}
          onClose={closePanel}
          footer={
            <>
              <button type="button" className={secondaryButtonClass} onClick={closePanel} disabled={busy}>
                {t('admin.pricing.common.form.cancel')}
              </button>
              <button type="submit" form="pricing-plan-form" className={primaryButtonClass} disabled={busy}>
                {t('admin.pricing.common.form.save')}
              </button>
            </>
          }
        >
          <form id="pricing-plan-form" className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <InlineError message={formError} />
            <Field label={t('admin.pricing.plans.form.planCode')}>
              <input
                className={inputClass}
                value={form.planCode}
                disabled={!creating}
                onChange={(event) => setField('planCode', event.target.value)}
                placeholder="e.g. standard-plan"
              />
            </Field>
            <Field label={t('admin.pricing.plans.form.planName')}>
              <input
                className={inputClass}
                value={form.planName}
                onChange={(event) => setField('planName', event.target.value)}
              />
            </Field>
            <Field label={t('admin.pricing.plans.form.basePriceSide')}>
              <select
                className={selectClass}
                value={form.basePriceSide}
                onChange={(event) => setField('basePriceSide', event.target.value as AdminBasePriceSide)}
              >
                {BASE_PRICE_SIDES.map((side) => (
                  <option key={side} value={side}>
                    {t(`admin.pricing.basePriceSide.${side}`)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t('admin.pricing.common.form.currencyCode')}>
              <input
                className={inputClass}
                value={form.currencyCode}
                onChange={(event) => setField('currencyCode', event.target.value.toUpperCase())}
                placeholder="CNY"
                maxLength={3}
              />
            </Field>
            <Field label={t('admin.pricing.plans.form.roundingMode')}>
              <select
                className={selectClass}
                value={form.roundingMode}
                onChange={(event) => setField('roundingMode', event.target.value as AdminRoundingMode)}
              >
                {ROUNDING_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {t(`admin.pricing.roundingMode.${mode}`)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t('admin.pricing.plans.form.minimumChargeAmount')}>
              <input
                className={inputClass}
                value={form.minimumChargeAmount}
                onChange={(event) => setField('minimumChargeAmount', event.target.value)}
                placeholder="0"
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
    </AdminPageShell>
  );
}

function buildPlanInput(
  form: PlanFormState,
  create: boolean,
  t: TranslationFunction,
): AdminPricingPlanMutationInput | null {
  const planCode = form.planCode.trim();
  const planName = form.planName.trim();
  if (create && !planCode) {
    return fail(t('admin.pricing.plans.form.planCodeRequired'));
  }
  if (!planName) {
    return fail(t('admin.pricing.plans.form.planNameRequired'));
  }
  return {
    planCode: planCode || undefined,
    planName,
    basePriceSide: form.basePriceSide,
    currencyCode: form.currencyCode.trim() || 'CNY',
    roundingMode: form.roundingMode,
    minimumChargeAmount: form.minimumChargeAmount.trim() || '0',
    effectiveFrom: form.effectiveFrom.trim() || undefined,
    effectiveTo: form.effectiveTo.trim() || undefined,
    status: form.status,
  };
}

function fail(message: string): null {
  throw new Error(message);
}
