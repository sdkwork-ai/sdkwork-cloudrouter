import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Edit3, Plus, Trash2 } from 'lucide-react';
import { AdminTableShell, BottomPagination, ConfirmDialog } from '@sdkwork/cloudroutes-pc-commons';
import { useTranslation } from 'react-i18next';
import {
  pricingService,
  type AdminPricingPlanItem,
  type AdminPricingStatus,
  type AdminRateCardItem,
  type AdminRateCardMutationInput,
  type AdminRateCardSubjectType,
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

const SUBJECT_TYPES: AdminRateCardSubjectType[] = [
  'default',
  'api_key',
  'account_group',
  'account',
  'user',
  'organization',
];
const STATUSES: AdminPricingStatus[] = ['active', 'inactive'];

interface RateCardFormState {
  subjectType: AdminRateCardSubjectType;
  subjectId: string;
  subjectCode: string;
  pricingPlanId: string;
  priority: string;
  effectiveFrom: string;
  effectiveTo: string;
  status: AdminPricingStatus;
}

const EMPTY_RATE_CARD_FORM: RateCardFormState = {
  subjectType: 'default',
  subjectId: '',
  subjectCode: '',
  pricingPlanId: '',
  priority: '100',
  effectiveFrom: '',
  effectiveTo: '',
  status: 'active',
};

export function RateCardsAdmin() {
  const { t } = useTranslation();
  const [items, setItems] = useState<AdminRateCardItem[]>([]);
  const [plans, setPlans] = useState<AdminPricingPlanItem[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [pageInfo, setPageInfo] = useState<{ totalItems?: string | number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subjectTypeFilter, setSubjectTypeFilter] = useState<AdminRateCardSubjectType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<AdminPricingStatus | 'all'>('all');
  const [editing, setEditing] = useState<AdminRateCardItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminRateCardItem | null>(null);
  const [form, setForm] = useState<RateCardFormState>(EMPTY_RATE_CARD_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cardsResult, plansResult] = await Promise.all([
        pricingService.rateCards.list({
          page,
          pageSize,
          subjectType: subjectTypeFilter === 'all' ? undefined : subjectTypeFilter,
          status: statusFilter === 'all' ? undefined : statusFilter,
        }),
        pricingService.plans.list({ page: 1, pageSize: 200, status: 'active' }),
      ]);
      setItems(cardsResult.items);
      setPageInfo(cardsResult.pageInfo);
      setPlans(plansResult.items);
    } catch (cause) {
      setError(errorMessageI18n(cause, t('admin.pricing.rateCards.errors.loadFailed'), t));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, subjectTypeFilter, statusFilter, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalItems = useMemo(() => {
    const raw = pageInfo?.totalItems;
    return typeof raw === 'string' ? Number.parseInt(raw, 10) : (raw ?? 0);
  }, [pageInfo]);

  const openCreate = () => {
    setForm(EMPTY_RATE_CARD_FORM);
    setFormError(null);
    setCreating(true);
    setEditing(null);
  };

  const openEdit = (item: AdminRateCardItem) => {
    setForm({
      subjectType: item.subjectType,
      subjectId: item.subjectId ?? '',
      subjectCode: item.subjectCode ?? '',
      pricingPlanId: item.pricingPlanId,
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
    const input = buildRateCardInput(form, t);
    if (!input) {
      return;
    }
    setBusy(true);
    try {
      if (editing) {
        await pricingService.rateCards.update(editing.id, input);
      } else {
        await pricingService.rateCards.create(input);
      }
      closePanel();
      await load();
    } catch (cause) {
      setFormError(errorMessageI18n(cause, t('admin.pricing.rateCards.errors.saveFailed'), t));
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
      await pricingService.rateCards.delete(deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch (cause) {
      setError(errorMessageI18n(cause, t('admin.pricing.rateCards.errors.deleteFailed'), t));
    } finally {
      setBusy(false);
    }
  };

  const setField = <K extends keyof RateCardFormState>(key: K, value: RateCardFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  return (
    <AdminPageShell>
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-white/10">
        <div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-white">{t('admin.pricing.rateCards.title')}</h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{t('admin.menu.home.pricingManagement')}</p>
        </div>
        <button type="button" className={primaryButtonClass} onClick={openCreate}>
          <Plus className="h-4 w-4" />
          {t('admin.pricing.rateCards.actions.new')}
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-3 px-5 py-3">
        <select
          className={`${selectClass} w-44`}
          value={subjectTypeFilter}
          onChange={(event) => {
            setSubjectTypeFilter(event.target.value as AdminRateCardSubjectType | 'all');
            setPage(1);
          }}
        >
          <option value="all">{t('admin.pricing.rateCards.table.subjectType')}: All</option>
          {SUBJECT_TYPES.map((subjectType) => (
            <option key={subjectType} value={subjectType}>
              {t(`admin.pricing.subjectType.${subjectType}`)}
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
                <th className="px-3 py-2 font-medium">{t('admin.pricing.rateCards.table.subjectType')}</th>
                <th className="px-3 py-2 font-medium">{t('admin.pricing.rateCards.table.subject')}</th>
                <th className="px-3 py-2 font-medium">{t('admin.pricing.rateCards.table.plan')}</th>
                <th className="px-3 py-2 font-medium">{t('admin.pricing.rateCards.table.priority')}</th>
                <th className="px-3 py-2 font-medium">{t('admin.pricing.rateCards.table.effectiveFrom')}</th>
                <th className="px-3 py-2 font-medium">{t('admin.pricing.rateCards.table.effectiveTo')}</th>
                <th className="px-3 py-2 font-medium">{t('admin.pricing.common.table.status')}</th>
                <th className="px-3 py-2 font-medium">{t('admin.pricing.common.table.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {loading || items.length === 0 ? (
                <TableState loading={loading} empty={t('admin.pricing.rateCards.empty')} colSpan={8} />
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-white/5">
                    <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">
                      {t(`admin.pricing.subjectType.${item.subjectType}`)}
                    </td>
                    <td className="px-3 py-2.5 font-medium text-slate-900 dark:text-white">
                      {item.subjectId ?? item.subjectCode ?? '—'}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">
                      {item.planName ?? item.planCode ?? item.pricingPlanId}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">{item.priority}</td>
                    <td className="px-3 py-2.5 text-slate-400 dark:text-slate-500">{item.effectiveFrom ?? '—'}</td>
                    <td className="px-3 py-2.5 text-slate-400 dark:text-slate-500">{item.effectiveTo ?? '—'}</td>
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
          title={t(creating ? 'admin.pricing.rateCards.form.createTitle' : 'admin.pricing.rateCards.form.editTitle')}
          onClose={closePanel}
          footer={
            <>
              <button type="button" className={secondaryButtonClass} onClick={closePanel} disabled={busy}>
                {t('admin.pricing.common.form.cancel')}
              </button>
              <button type="submit" form="pricing-rate-card-form" className={primaryButtonClass} disabled={busy}>
                {t('admin.pricing.common.form.save')}
              </button>
            </>
          }
        >
          <form id="pricing-rate-card-form" className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <InlineError message={formError} />
            <Field label={t('admin.pricing.rateCards.form.subjectType')}>
              <select
                className={selectClass}
                value={form.subjectType}
                onChange={(event) => setField('subjectType', event.target.value as AdminRateCardSubjectType)}
              >
                {SUBJECT_TYPES.map((subjectType) => (
                  <option key={subjectType} value={subjectType}>
                    {t(`admin.pricing.subjectType.${subjectType}`)}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label={t('admin.pricing.rateCards.form.subjectId')} hint={t('admin.pricing.rateCards.form.subjectHint')}>
                <input
                  className={inputClass}
                  value={form.subjectId}
                  onChange={(event) => setField('subjectId', event.target.value)}
                  placeholder="e.g. 1234567890"
                />
              </Field>
              <Field label={t('admin.pricing.rateCards.form.subjectCode')}>
                <input
                  className={inputClass}
                  value={form.subjectCode}
                  onChange={(event) => setField('subjectCode', event.target.value)}
                  placeholder="e.g. group-001"
                />
              </Field>
            </div>
            <Field label={t('admin.pricing.rateCards.form.pricingPlanId')}>
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
          title={t('admin.pricing.rateCards.delete.title')}
          description={t('admin.pricing.rateCards.delete.description')}
          isBusy={busy}
          confirmLabel={t('admin.pricing.common.actions.delete')}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      ) : null}
    </AdminPageShell>
  );
}

function buildRateCardInput(
  form: RateCardFormState,
  t: TranslationFunction,
): AdminRateCardMutationInput | null {
  if (!form.pricingPlanId.trim()) {
    return fail(t('admin.pricing.rateCards.form.pricingPlanRequired'));
  }
  const subjectId = form.subjectId.trim();
  const subjectCode = form.subjectCode.trim();
  if ((subjectId !== '') === (subjectCode !== '')) {
    return fail(t('admin.pricing.rateCards.form.subjectRequired'));
  }
  const priority = Number.parseInt(form.priority.trim(), 10);
  if (!Number.isInteger(priority) || priority < 0) {
    return fail('priority must be a non-negative integer');
  }
  return {
    subjectType: form.subjectType,
    subjectId: subjectId || undefined,
    subjectCode: subjectCode || undefined,
    pricingPlanId: form.pricingPlanId.trim(),
    priority,
    effectiveFrom: form.effectiveFrom.trim() || undefined,
    effectiveTo: form.effectiveTo.trim() || undefined,
    status: form.status,
  };
}

function fail(message: string): null {
  throw new Error(message);
}
