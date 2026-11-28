import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Pencil, Plus, RefreshCw, ShieldOff } from 'lucide-react';
import { BottomPagination, BusinessStatePanel, resolveProblemMessage } from '@sdkwork/cloudroutes-pc-commons';
import { MembershipAudienceBadge } from '../components/MembershipAudienceBadge';
import { MembershipBillingCycleChips, MembershipPurchaseModelBadge } from '../components/MembershipPurchaseModelBadge';
import { MembershipCategoryBadge } from '../components/MembershipCategoryBadge';
import { MembershipDrawer } from '../components/MembershipDrawer';
import { MembershipEmptyState } from '../components/MembershipEmptyState';
import { MembershipFormActions } from '../components/MembershipFormControls';
import { MembershipPlanQuadrantNav } from '../components/MembershipPlanQuadrantNav';
import { MembershipPlanSummaryStrip } from '../components/MembershipPlanSummaryStrip';
import { MembershipSegmentedFilter } from '../components/MembershipSegmentedFilter';
import { MembershipStatusBadge } from '../components/MembershipStatusBadge';
import {
  MembershipIconActionButton,
  MembershipTableActions,
  MembershipTablePanel,
  confirmMembershipAction,
  hasNextMembershipPage,
  membershipPageLabel,
} from '../components/MembershipPageControls';
import { MembershipPlanDrawerForm } from '../forms/MembershipPlanDrawerForm';
import {
  disableMembershipAdminPlan,
  createMembershipAdminPlan,
  fetchMembershipAdminPlans,
  updateMembershipAdminPlan,
  type MembershipsAdminAudience,
  type MembershipsAdminPlanItem,
  type MembershipsAdminPlanMutationInput,
  type MembershipsAdminPageInfo,
} from '../membershipsService';
import { formatMembershipDateTime } from '../membershipFormat';
import {
  MEMBERSHIP_AUDIENCE_FILTERS,
  MEMBERSHIP_PURCHASE_MODEL_FILTERS,
  countPlansByQuadrant,
  filterPlans,
  groupPlansByAudience,
  isSubscriptionCycle,
  summarizePlans,
  type MembershipsAdminAudienceFilter,
  type MembershipsAdminPurchaseModelFilter,
} from '../planTaxonomy';

const PLAN_STATUS_FILTERS: Array<{ value: string; labelKey: string; fallback: string }> = [
  { value: 'all', labelKey: 'admin.commerce.memberships.planStatusFilter.all', fallback: 'All statuses' },
  { value: 'active', labelKey: 'admin.commerce.memberships.status.active', fallback: 'Active' },
  { value: 'inactive', labelKey: 'admin.commerce.memberships.status.inactive', fallback: 'Inactive' },
  { value: 'disabled', labelKey: 'admin.commerce.memberships.status.disabled', fallback: 'Disabled' },
];

const PLAN_FAMILY_FILTERS: Array<{ value: string; labelKey: string; fallback: string }> = [
  { value: 'all', labelKey: 'admin.commerce.memberships.category.all', fallback: 'All' },
  { value: 'token', labelKey: 'admin.commerce.memberships.category.token', fallback: 'Token Plan' },
  { value: 'community', labelKey: 'admin.commerce.memberships.category.community', fallback: 'Community' },
];

/**
 * Membership plans console.
 *
 * Information architecture: audience (who buys) x purchase model (how it is
 * billed) is the first decision, plan family and lifecycle status refine it, and
 * the table only ever shows the resulting slice. The backend is asked for the
 * audience slice (it owns the catalog taxonomy); the purchase model is derived
 * from each plan's real package coverage so it can never disagree with the
 * packages that sell it.
 */
export function MembershipPlansPage() {
  const { t, i18n } = useTranslation();
  const displayLocale = i18n.resolvedLanguage ?? i18n.language ?? 'en-US';

  const [plans, setPlans] = useState<MembershipsAdminPlanItem[]>([]);
  const [editingPlan, setEditingPlan] = useState<MembershipsAdminPlanItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [pageInfo, setPageInfo] = useState<MembershipsAdminPageInfo | null>(null);
  const [audienceFilter, setAudienceFilter] = useState<MembershipsAdminAudienceFilter>('all');
  const [purchaseModelFilter, setPurchaseModelFilter] = useState<MembershipsAdminPurchaseModelFilter>('all');
  const [familyFilter, setFamilyFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const requestIdRef = useRef(0);

  const loadPlans = useCallback(async (
    requestedPage: number,
    requestedPageSize: number,
    requestedAudience: MembershipsAdminAudienceFilter,
    requestedPurchaseModel: MembershipsAdminPurchaseModelFilter,
    requestedStatus: string,
    options: { background?: boolean } = {},
  ) => {
    const requestId = ++requestIdRef.current;
    if (options.background) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);
    try {
      const result = await fetchMembershipAdminPlans({
        page: requestedPage,
        pageSize: requestedPageSize,
        audience: requestedAudience === 'all' ? undefined : requestedAudience,
        // Pushed to the server so pagination and totals stay truthful; the
        // purchase model is derived from package coverage server-side.
        purchaseModel: requestedPurchaseModel === 'all' ? undefined : requestedPurchaseModel,
        status: requestedStatus === 'all' ? undefined : requestedStatus,
      });
      if (requestId !== requestIdRef.current) {
        return;
      }
      setPlans(result.items);
      setPageInfo(result.pageInfo);
    } catch (loadError) {
      if (requestId === requestIdRef.current) {
        setError(resolveProblemMessage(
          loadError,
          t,
          t('admin.commerce.memberships.plans.error', 'Membership plans could not be loaded'),
        ));
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [t]);

  useEffect(() => {
    void loadPlans(page, pageSize, audienceFilter, purchaseModelFilter, statusFilter);
    return () => {
      requestIdRef.current += 1;
    };
  }, [loadPlans, page, pageSize, audienceFilter, purchaseModelFilter, statusFilter]);

  const visiblePlans = useMemo(
    () => filterPlans(plans, {
      // The API already returns the audience slice; re-applying the filter keeps
      // the table correct against a backend that predates the `audience` query
      // parameter instead of mislabelling the other audience under one header.
      audience: audienceFilter,
      purchaseModel: purchaseModelFilter,
      category: familyFilter,
    }),
    [plans, audienceFilter, purchaseModelFilter, familyFilter],
  );

  // Quadrant counts are only truthful over the complete catalog slice. Both
  // classification filters narrow the server result set to one audience and/or
  // one purchase model, so counting the returned rows would report `0` for every
  // quadrant that is currently filtered out. Rather than print a false zero, the
  // cards show counts only in the unfiltered catalog view.
  const quadrantBase = useMemo(
    () => filterPlans(plans, { audience: 'all', purchaseModel: 'all', category: familyFilter }),
    [plans, familyFilter],
  );
  const quadrantCounts = useMemo(
    () => (audienceFilter === 'all' && purchaseModelFilter === 'all'
      ? countPlansByQuadrant(quadrantBase)
      : undefined),
    [audienceFilter, purchaseModelFilter, quadrantBase],
  );

  const summary = useMemo(() => summarizePlans(visiblePlans), [visiblePlans]);
  const planGroups = useMemo(
    () => (audienceFilter === 'all'
      ? groupPlansByAudience(visiblePlans)
      : [{ audience: audienceFilter, plans: [...visiblePlans].sort((left, right) => left.rank - right.rank) }]),
    [audienceFilter, visiblePlans],
  );

  const hasActiveClassification = audienceFilter !== 'all' || purchaseModelFilter !== 'all';
  const hasActiveFilters = hasActiveClassification || familyFilter !== 'all' || statusFilter !== 'all';

  const resetFilters = () => {
    setAudienceFilter('all');
    setPurchaseModelFilter('all');
    setFamilyFilter('all');
    setStatusFilter('all');
    setPage(1);
  };

  const handleAudienceChange = (nextAudience: MembershipsAdminAudienceFilter) => {
    if (nextAudience === audienceFilter) {
      return;
    }
    setAudienceFilter(nextAudience);
    setPage(1);
  };

  const handlePurchaseModelChange = (nextPurchaseModel: MembershipsAdminPurchaseModelFilter) => {
    if (nextPurchaseModel === purchaseModelFilter) {
      return;
    }
    setPurchaseModelFilter(nextPurchaseModel);
    setPage(1);
  };

  const handleQuadrantSelect = (
    nextAudience: MembershipsAdminAudienceFilter,
    nextPurchaseModel: MembershipsAdminPurchaseModelFilter,
  ) => {
    setAudienceFilter(nextAudience);
    setPurchaseModelFilter(nextPurchaseModel);
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
      await loadPlans(page, pageSize, audienceFilter, purchaseModelFilter, statusFilter, { background: true });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisablePlan = async (plan: MembershipsAdminPlanItem) => {
    const confirmed = confirmMembershipAction(t(
      'admin.commerce.memberships.plans.disableConfirm',
      'Stop selling "{{name}}"? Existing subscriptions keep working, but the plan can no longer be purchased.',
      { name: plan.name },
    ));
    if (!confirmed) {
      return;
    }
    setError(null);
    try {
      await disableMembershipAdminPlan(plan.id);
      await loadPlans(page, pageSize, audienceFilter, purchaseModelFilter, statusFilter, { background: true });
    } catch (disableError) {
      setError(resolveProblemMessage(
        disableError,
        t,
        t('admin.commerce.memberships.plans.disableError', 'Membership plan could not be disabled'),
      ));
    }
  };

  const handleCreateForAudience = (audience: Extract<MembershipsAdminAudienceFilter, MembershipsAdminAudience>) => {
    setAudienceFilter(audience);
    // A brand-new plan has no package yet, so it is `unlisted` and would be
    // hidden by an active purchase-model filter right after creation.
    setPurchaseModelFilter('all');
    setEditingPlan(null);
    setIsDrawerOpen(true);
  };

  if (isLoading) {
    return (
      <BusinessStatePanel
        kind="loading"
        title={t('admin.commerce.memberships.plans.loading', 'Loading membership plans...')}
        className="min-h-48"
      />
    );
  }

  if (error && plans.length === 0) {
    return (
      <BusinessStatePanel
        kind="error"
        title={t('admin.commerce.memberships.error', 'Membership data could not be loaded')}
        description={error}
        onRetry={() => loadPlans(page, pageSize, audienceFilter, purchaseModelFilter, statusFilter)}
        className="min-h-48"
      />
    );
  }

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
        <header className="flex shrink-0 flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
              {t('admin.commerce.memberships.plans.title', 'Plans & memberships')}
            </h1>
            <p className="mt-1 max-w-3xl text-xs text-slate-500 dark:text-slate-400">
              {t(
                'admin.commerce.memberships.plans.description',
                'Plans define the membership tier and its benefits. Each plan is sold by personal users or by enterprise organizations, and its purchase model comes from the packages that sell it.',
              )}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => loadPlans(page, pageSize, audienceFilter, purchaseModelFilter, statusFilter, { background: true })}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
            >
              {isRefreshing
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <RefreshCw className="h-3.5 w-3.5" />}
              {t('common.actions.reload', 'Reload')}
            </button>
            <button
              type="button"
              onClick={openCreateDrawer}
              className="inline-flex items-center gap-1 rounded-md bg-lobster-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-lobster-700"
            >
              <Plus className="h-3.5 w-3.5" />
              {t('admin.commerce.memberships.plans.add', 'New plan')}
            </button>
          </div>
        </header>

        <MembershipPlanQuadrantNav
          audience={audienceFilter}
          purchaseModel={purchaseModelFilter}
          counts={quadrantCounts}
          onSelect={handleQuadrantSelect}
        />

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <MembershipSegmentedFilter
            label={t('admin.commerce.memberships.audience.filterLabel', 'Audience filter')}
            value={audienceFilter}
            options={MEMBERSHIP_AUDIENCE_FILTERS}
            onChange={handleAudienceChange}
          />
          <MembershipSegmentedFilter
            label={t('admin.commerce.memberships.purchaseModel.filterLabel', 'Purchase model filter')}
            value={purchaseModelFilter}
            options={MEMBERSHIP_PURCHASE_MODEL_FILTERS}
            onChange={handlePurchaseModelChange}
          />
          <label className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
            <span>{t('admin.commerce.memberships.plans.filter.family', 'Plan family')}</span>
            <select
              value={familyFilter}
              onChange={(event) => {
                setFamilyFilter(event.target.value);
                setPage(1);
              }}
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
            >
              {PLAN_FAMILY_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>{t(option.labelKey, option.fallback)}</option>
              ))}
            </select>
          </label>
          <label className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
            <span>{t('admin.commerce.memberships.plans.filter.status', 'Status')}</span>
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPage(1);
              }}
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
            >
              {PLAN_STATUS_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>{t(option.labelKey, option.fallback)}</option>
              ))}
            </select>
          </label>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {t('admin.commerce.memberships.plans.filter.resultCount', '{{count}} plans in view', { count: visiblePlans.length })}
          </span>
          <MembershipPlanSummaryStrip summary={summary} />
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs font-medium text-lobster-600 hover:text-lobster-700 dark:text-lobster-400"
            >
              {t('admin.commerce.memberships.plans.filter.reset', 'Reset filters')}
            </button>
          ) : null}
        </div>

        {error ? (
          <div className="shrink-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        ) : null}

        <MembershipTablePanel
          footer={(
            <BottomPagination
              disabled={isLoading || isRefreshing}
              hasNextPage={hasNextMembershipPage(pageInfo, page, plans.length, pageSize)}
              itemCount={visiblePlans.length}
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
          {visiblePlans.length === 0 ? (
            <MembershipEmptyState
              title={hasActiveClassification
                ? t(
                  'admin.commerce.memberships.plans.emptyFiltered',
                  'No plan matches this audience and purchase model yet',
                )
                : t('admin.commerce.memberships.plans.empty', 'No membership plans')}
            />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-white/5">
                  <th className="px-4 py-2.5 text-left font-medium text-slate-500">{t('admin.commerce.memberships.plans.table.plan', 'Plan')}</th>
                  <th className="px-4 py-2.5 text-left font-medium text-slate-500">{t('admin.commerce.memberships.plans.table.audience', 'Audience')}</th>
                  <th className="px-4 py-2.5 text-left font-medium text-slate-500">{t('admin.commerce.memberships.plans.table.family', 'Family')}</th>
                  <th className="px-4 py-2.5 text-left font-medium text-slate-500">{t('admin.commerce.memberships.plans.table.purchaseModel', 'Purchase model')}</th>
                  <th className="px-4 py-2.5 text-left font-medium text-slate-500">{t('admin.commerce.memberships.plans.table.billingCycles', 'Billing cycles')}</th>
                  <th className="px-4 py-2.5 text-right font-medium text-slate-500">{t('admin.commerce.memberships.plans.table.packages', 'Packages')}</th>
                  <th className="px-4 py-2.5 text-right font-medium text-slate-500">{t('admin.commerce.memberships.plans.table.benefits', 'Benefits')}</th>
                  <th className="px-4 py-2.5 text-left font-medium text-slate-500">{t('admin.commerce.memberships.plans.table.status', 'Status')}</th>
                  <th className="px-4 py-2.5 text-left font-medium text-slate-500">{t('admin.commerce.memberships.plans.table.updated', 'Updated')}</th>
                  <th className="px-4 py-2.5 text-right font-medium text-slate-500">{t('common.actions.actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {planGroups.map((group) => (
                  <PlanGroupRows
                    key={group.audience}
                    audience={group.audience}
                    plans={group.plans}
                    displayLocale={displayLocale}
                    showGroupHeader={audienceFilter === 'all' && planGroups.length > 1}
                    onEdit={openEditDrawer}
                    onDisable={(plan) => void handleDisablePlan(plan)}
                    onCreate={(audience) => handleCreateForAudience(audience)}
                  />
                ))}
              </tbody>
            </table>
          )}
        </MembershipTablePanel>
      </div>

      <MembershipDrawer
        title={editingPlan
          ? t('admin.commerce.memberships.plans.editTitle', 'Edit membership plan')
          : t('admin.commerce.memberships.plans.addTitle', 'New membership plan')}
        description={t(
          'admin.commerce.memberships.plans.formDescription',
          'Audience decides who can buy this plan; packages decide how it is billed.',
        )}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        footer={(
          <MembershipFormActions
            submitLabel={editingPlan
              ? t('admin.commerce.memberships.plans.form.updateSubmit', 'Save plan')
              : t('admin.commerce.memberships.plans.form.submit', 'Create plan')}
            isSaving={isSaving}
            submitFormId="membership-plan-form"
            onCancel={() => setIsDrawerOpen(false)}
          />
        )}
      >
        <MembershipPlanDrawerForm
          mode={editingPlan ? 'edit' : 'create'}
          initialValue={editingPlan}
          defaultAudience={audienceFilter === 'all' ? 'personal' : audienceFilter}
          onSubmit={handleSavePlan}
        />
      </MembershipDrawer>
    </>
  );
}

interface PlanGroupRowsProps {
  audience: MembershipsAdminAudience;
  plans: MembershipsAdminPlanItem[];
  displayLocale: string;
  showGroupHeader: boolean;
  onEdit: (plan: MembershipsAdminPlanItem) => void;
  onDisable: (plan: MembershipsAdminPlanItem) => void;
  onCreate: (audience: MembershipsAdminAudience) => void;
}

/**
 * Rows for one audience section.
 *
 * Grouping by audience keeps "who buys this" visible even when the operator
 * looks at the whole catalog, instead of forcing them to read a badge per row.
 */
function PlanGroupRows({
  audience,
  plans: audiencePlans,
  displayLocale,
  showGroupHeader,
  onEdit,
  onDisable,
  onCreate,
}: PlanGroupRowsProps) {
  const { t } = useTranslation();
  const subscriptionCount = audiencePlans.filter(
    (plan) => plan.billingCycles.some((cycle) => isSubscriptionCycle(cycle)),
  ).length;

  return (
    <>
      {showGroupHeader ? (
        <tr className="bg-slate-50/80 dark:bg-white/[0.03]">
          <td colSpan={10} className="px-4 py-2">
            <div className="flex flex-wrap items-center gap-2">
              <MembershipAudienceBadge audience={audience} />
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {t('admin.commerce.memberships.plans.groupSummary', '{{count}} plans · {{subscription}} with a subscription package', {
                  count: audiencePlans.length,
                  subscription: subscriptionCount,
                })}
              </span>
              <button
                type="button"
                onClick={() => onCreate(audience)}
                className="ml-auto text-xs font-medium text-lobster-600 hover:text-lobster-700 dark:text-lobster-400"
              >
                {audience === 'team'
                  ? t('admin.commerce.memberships.plans.addTeam', 'New enterprise plan')
                  : t('admin.commerce.memberships.plans.addPersonal', 'New personal plan')}
              </button>
            </div>
          </td>
        </tr>
      ) : null}
      {audiencePlans.map((plan) => (
        <tr key={plan.id} className="border-b border-slate-50 hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/5">
          <td className="px-4 py-2.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-medium text-slate-900 dark:text-white">{plan.name}</span>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-white/10 dark:text-slate-300">
                {t('admin.commerce.memberships.plans.rankShort', 'Lv.{{rank}}', { rank: plan.rank })}
              </span>
              {plan.autoProvisioned ? (
                <span className="inline-flex rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                  {t('admin.commerce.memberships.autoProvisioned', 'Auto-created')}
                </span>
              ) : null}
            </div>
            <span className="mt-0.5 block font-mono text-[11px] text-slate-400 dark:text-slate-500">{plan.levelCode || plan.planNo}</span>
          </td>
          <td className="px-4 py-2.5"><MembershipAudienceBadge audience={plan.audience} /></td>
          <td className="px-4 py-2.5"><MembershipCategoryBadge category={plan.category} /></td>
          <td className="px-4 py-2.5"><MembershipPurchaseModelBadge billingCycles={plan.billingCycles} /></td>
          <td className="px-4 py-2.5"><MembershipBillingCycleChips billingCycles={plan.billingCycles} /></td>
          <td className="px-4 py-2.5 text-right tabular-nums">
            <span className={plan.packageCount === 0 ? 'font-medium text-amber-600 dark:text-amber-400' : 'text-slate-600 dark:text-slate-300'}>
              {plan.packageCount}
            </span>
          </td>
          <td className="px-4 py-2.5 text-right tabular-nums text-slate-600 dark:text-slate-300">{plan.benefitCount}</td>
          <td className="px-4 py-2.5"><MembershipStatusBadge status={plan.status} /></td>
          <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{formatMembershipDateTime(plan.updatedAt, displayLocale)}</td>
          <td className="px-4 py-2.5">
            <MembershipTableActions>
              <MembershipIconActionButton
                label={t('common.actions.edit', 'Edit')}
                icon={<Pencil className="h-4 w-4" />}
                onClick={() => onEdit(plan)}
              />
              {plan.status !== 'disabled' ? (
                <MembershipIconActionButton
                  label={t('admin.commerce.memberships.plans.disable', 'Stop selling')}
                  icon={<ShieldOff className="h-4 w-4" />}
                  tone="danger"
                  onClick={() => onDisable(plan)}
                />
              ) : null}
            </MembershipTableActions>
          </td>
        </tr>
      ))}
    </>
  );
}
