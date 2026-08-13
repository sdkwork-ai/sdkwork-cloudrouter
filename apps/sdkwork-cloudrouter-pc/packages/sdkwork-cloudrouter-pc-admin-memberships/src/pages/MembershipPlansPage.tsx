import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Plus } from 'lucide-react';
import { BottomPagination, resolveProblemMessage } from '@sdkwork/cloudroutes-pc-commons';
import { MembershipAdminPageShell } from '../components/MembershipAdminPageShell';
import { MembershipDrawer } from '../components/MembershipDrawer';
import { MembershipFormActions } from '../components/MembershipFormControls';
import { MembershipEmptyState } from '../components/MembershipEmptyState';
import {
  MembershipIconActionButton,
  MembershipTableActions,
  MembershipTablePanel,
  hasNextMembershipPage,
  membershipPageLabel,
} from '../components/MembershipPageControls';
import { MembershipStatusBadge } from '../components/MembershipStatusBadge';
import { MembershipCategoryBadge } from '../components/MembershipCategoryBadge';
import {
  MembershipCategoryFilter,
  type MembershipCategoryFilterValue,
} from '../components/MembershipCategoryFilter';
import { MembershipPlanDrawerForm } from '../forms/MembershipPlanDrawerForm';
import {
  createMembershipAdminPlan,
  fetchMembershipAdminPlans,
  updateMembershipAdminPlan,
  type MembershipsAdminPlanItem,
  type MembershipsAdminPlanMutationInput,
  type MembershipsAdminPageInfo,
} from '../membershipsService';
import { formatMembershipDateTime } from '../membershipFormat';

export function MembershipPlansPage() {
  const { t, i18n } = useTranslation();
  const displayLocale = i18n.resolvedLanguage ?? i18n.language ?? 'en-US';
  const [plans, setPlans] = useState<MembershipsAdminPlanItem[]>([]);
  const [editingPlan, setEditingPlan] = useState<MembershipsAdminPlanItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [pageInfo, setPageInfo] = useState<MembershipsAdminPageInfo | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<MembershipCategoryFilterValue>('all');
  const requestIdRef = useRef(0);

  const loadPlans = useCallback(async (
    requestedPage: number,
    requestedPageSize: number,
    requestedCategory: MembershipCategoryFilterValue,
  ) => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchMembershipAdminPlans({
        page: requestedPage,
        pageSize: requestedPageSize,
        category: requestedCategory === 'all' ? undefined : requestedCategory,
      });
      if (requestId !== requestIdRef.current) {
        return;
      }
      setPlans(result.items);
      setPageInfo(result.pageInfo);
    } catch (loadError) {
      if (requestId === requestIdRef.current) {
        setError(resolveProblemMessage(loadError, t, t('admin.commerce.memberships.plans.error', 'Membership levels could not be loaded')));
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [t]);

  useEffect(() => {
    void loadPlans(page, pageSize, categoryFilter);
    return () => {
      requestIdRef.current += 1;
    };
  }, [loadPlans, page, pageSize, categoryFilter]);

  const handleCategoryFilterChange = (nextCategory: MembershipCategoryFilterValue) => {
    if (nextCategory === categoryFilter) {
      return;
    }
    setCategoryFilter(nextCategory);
    setPage(1);
  };

  const openCreateDrawer = () => {
    setEditingPlan(null);
    setIsDrawerOpen(true);
  };

  const openEditDrawer = (plan: MembershipsAdminPlanItem) => {
    setEditingPlan(plan);
    setIsDrawerOpen(true);
  };

  const handleSavePlan = async (input: MembershipsAdminPlanMutationInput) => {
    setIsSaving(true);
    try {
      if (editingPlan) {
        await updateMembershipAdminPlan(editingPlan.id, input);
      } else {
        await createMembershipAdminPlan(input);
      }
      setIsDrawerOpen(false);
      setEditingPlan(null);
      await loadPlans(page, pageSize, categoryFilter);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <MembershipAdminPageShell
        isLoading={isLoading}
        error={error}
        onRefresh={() => loadPlans(page, pageSize, categoryFilter)}
        actions={(
          <button type="button" onClick={openCreateDrawer} className="inline-flex items-center gap-1 rounded-md bg-lobster-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-lobster-700">
            <Plus className="h-3.5 w-3.5" />
            {t('admin.commerce.memberships.plans.add', 'Add Level')}
          </button>
        )}
      >
        <div className="flex shrink-0 items-center justify-between gap-3">
          <MembershipCategoryFilter value={categoryFilter} onChange={handleCategoryFilterChange} />
          <span className="text-xs text-slate-400">{t('admin.commerce.memberships.category.filterHint', 'Filter by plan family')}</span>
        </div>
        <MembershipTablePanel
          footer={(
            <BottomPagination
              disabled={isLoading}
              hasNextPage={hasNextMembershipPage(pageInfo, page, plans.length, pageSize)}
              itemCount={plans.length}
              nextLabel={t('common.pagination.next', 'Next page')}
              onNextPage={() => setPage((current) => current + 1)}
              onPageSizeChange={(nextPageSize) => {
                setPage(1);
                setPageSize(nextPageSize);
              }}
              onPreviousPage={() => setPage((current) => Math.max(1, current - 1))}
              page={page}
              pageLabel={membershipPageLabel(t, page, pageInfo)}
              pageSize={pageSize}
              pageSizeLabel={t('common.pagination.rows', 'Rows')}
              pageSizeOptions={[20, 50, 100]}
              previousLabel={t('common.pagination.previous', 'Previous page')}
              showingLabel={t('common.pagination.showing', 'Showing')}
            />
          )}
        >
          {plans.length === 0 ? (
            <MembershipEmptyState title={t('admin.commerce.memberships.plans.empty', 'No membership levels')} />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-white/5">
                  <th className="px-4 py-2.5 text-left font-medium text-slate-500">{t('admin.commerce.memberships.plans.table.level', 'Level')}</th>
                  <th className="px-4 py-2.5 text-left font-medium text-slate-500">{t('admin.commerce.memberships.plans.table.category', 'Category')}</th>
                  <th className="px-4 py-2.5 text-left font-medium text-slate-500">{t('admin.commerce.memberships.plans.table.code', 'Code')}</th>
                  <th className="px-4 py-2.5 text-right font-medium text-slate-500">{t('admin.commerce.memberships.plans.table.rank', 'Rank')}</th>
                  <th className="px-4 py-2.5 text-right font-medium text-slate-500">{t('admin.commerce.memberships.plans.table.benefits', 'Benefits')}</th>
                  <th className="px-4 py-2.5 text-left font-medium text-slate-500">{t('admin.commerce.memberships.plans.table.status', 'Status')}</th>
                  <th className="px-4 py-2.5 text-left font-medium text-slate-500">{t('admin.commerce.memberships.plans.table.updated', 'Updated')}</th>
                  <th className="px-4 py-2.5 text-right font-medium text-slate-500">{t('common.actions.actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((plan) => (
                  <tr key={plan.id} className="border-b border-slate-50 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5">
                    <td className="px-4 py-2.5">
                      <span className="font-medium text-slate-900 dark:text-white">{plan.name}</span>
                      {plan.autoProvisioned ? (
                        <span className="ml-2 inline-flex rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                          {t('admin.commerce.memberships.autoProvisioned', 'Auto-created')}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-2.5"><MembershipCategoryBadge category={plan.category} /></td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{plan.levelCode || plan.planNo}</td>
                    <td className="px-4 py-2.5 text-right text-slate-600 dark:text-slate-300">{plan.rank}</td>
                    <td className="px-4 py-2.5 text-right text-slate-600 dark:text-slate-300">{plan.benefitCount}</td>
                    <td className="px-4 py-2.5"><MembershipStatusBadge status={plan.status} /></td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{formatMembershipDateTime(plan.updatedAt, displayLocale)}</td>
                    <td className="px-4 py-2.5">
                      <MembershipTableActions>
                        <MembershipIconActionButton label={t('common.actions.edit', 'Edit')} icon={<Pencil className="h-4 w-4" />} onClick={() => openEditDrawer(plan)} />
                      </MembershipTableActions>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </MembershipTablePanel>
      </MembershipAdminPageShell>

      <MembershipDrawer
        title={editingPlan
          ? t('admin.commerce.memberships.plans.editTitle', 'Edit Membership Level')
          : t('admin.commerce.memberships.plans.addTitle', 'Add Membership Level')}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        footer={(
          <MembershipFormActions
            submitLabel={editingPlan
              ? t('admin.commerce.memberships.plans.form.updateSubmit', 'Update Level')
              : t('admin.commerce.memberships.plans.form.submit', 'Create Level')}
            isSaving={isSaving}
            submitFormId="membership-plan-form"
            onCancel={() => setIsDrawerOpen(false)}
          />
        )}
      >
        <MembershipPlanDrawerForm
          mode={editingPlan ? 'edit' : 'create'}
          initialValue={editingPlan}
          onSubmit={handleSavePlan}
        />
      </MembershipDrawer>
    </>
  );
}
