import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { BottomPagination, resolveProblemMessage } from '@sdkwork/cloudroutes-pc-commons';
import { MembershipAdminPageShell } from '../components/MembershipAdminPageShell';
import { MembershipDrawer } from '../components/MembershipDrawer';
import { MembershipFormActions } from '../components/MembershipFormControls';
import { MembershipEmptyState } from '../components/MembershipEmptyState';
import {
  MembershipIconActionButton,
  MembershipTableActions,
  MembershipTablePanel,
  confirmMembershipAction,
  hasNextMembershipPage,
  membershipBillingCycleLabel,
  membershipPageLabel,
} from '../components/MembershipPageControls';
import { MembershipStatusBadge } from '../components/MembershipStatusBadge';
import { MembershipCategoryBadge } from '../components/MembershipCategoryBadge';
import {
  MembershipCategoryFilter,
  type MembershipCategoryFilterValue,
} from '../components/MembershipCategoryFilter';
import { MembershipPackageGroupDrawerForm } from '../forms/MembershipPackageGroupDrawerForm';
import {
  createMembershipAdminPackageGroup,
  deleteMembershipAdminPackageGroup,
  fetchMembershipAdminPackageGroups,
  updateMembershipAdminPackageGroup,
  type MembershipsAdminPackageGroup,
  type MembershipsAdminPackageGroupMutationInput,
  type MembershipsAdminPageInfo,
} from '../membershipsService';

export function MembershipPackageGroupsPage() {
  const { t } = useTranslation();
  const [groups, setGroups] = useState<MembershipsAdminPackageGroup[]>([]);
  const [editingGroup, setEditingGroup] = useState<MembershipsAdminPackageGroup | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [pageInfo, setPageInfo] = useState<MembershipsAdminPageInfo | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<MembershipCategoryFilterValue>('all');
  const requestIdRef = useRef(0);

  const loadGroups = useCallback(async (
    requestedPage: number,
    requestedPageSize: number,
    requestedCategory: MembershipCategoryFilterValue,
  ) => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchMembershipAdminPackageGroups({
        page: requestedPage,
        pageSize: requestedPageSize,
        category: requestedCategory === 'all' ? undefined : requestedCategory,
      });
      if (requestId !== requestIdRef.current) {
        return;
      }
      setGroups(result.items);
      setPageInfo(result.pageInfo);
    } catch (loadError) {
      if (requestId === requestIdRef.current) {
        setError(resolveProblemMessage(loadError, t, t('admin.commerce.memberships.groups.error', 'Package groups could not be loaded')));
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [t]);

  useEffect(() => {
    void loadGroups(page, pageSize, categoryFilter);
    return () => {
      requestIdRef.current += 1;
    };
  }, [loadGroups, page, pageSize, categoryFilter]);

  const handleCategoryFilterChange = (nextCategory: MembershipCategoryFilterValue) => {
    if (nextCategory === categoryFilter) {
      return;
    }
    setCategoryFilter(nextCategory);
    setPage(1);
  };

  const openCreateDrawer = () => {
    setEditingGroup(null);
    setIsDrawerOpen(true);
  };

  const openEditDrawer = (group: MembershipsAdminPackageGroup) => {
    setEditingGroup(group);
    setIsDrawerOpen(true);
  };

  const handleSaveGroup = async (input: MembershipsAdminPackageGroupMutationInput) => {
    setIsSaving(true);
    try {
      if (editingGroup) {
        await updateMembershipAdminPackageGroup(editingGroup.id, input);
      } else {
        await createMembershipAdminPackageGroup(input);
      }
      setIsDrawerOpen(false);
      setEditingGroup(null);
      await loadGroups(page, pageSize, categoryFilter);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteGroup = async (group: MembershipsAdminPackageGroup) => {
    if (!confirmMembershipAction(t('admin.commerce.memberships.groups.deleteConfirmNamed', 'Delete package group {{name}}?', { name: group.name }))) {
      return;
    }
    await deleteMembershipAdminPackageGroup(group.id);
    const targetPage = groups.length === 1 && page > 1 ? page - 1 : page;
    if (targetPage !== page) {
      setPage(targetPage);
      return;
    }
    await loadGroups(targetPage, pageSize, categoryFilter);
  };

  return (
    <>
      <MembershipAdminPageShell
        isLoading={isLoading}
        error={error}
        onRefresh={() => loadGroups(page, pageSize, categoryFilter)}
        actions={(
          <button type="button" onClick={openCreateDrawer} className="inline-flex items-center gap-1 rounded-md bg-lobster-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-lobster-700">
            <Plus className="h-3.5 w-3.5" />
            {t('admin.commerce.memberships.groups.addTitle', 'Add Package Group')}
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
              hasNextPage={hasNextMembershipPage(pageInfo, page, groups.length, pageSize)}
              itemCount={groups.length}
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
          {groups.length === 0 ? (
            <MembershipEmptyState title={t('admin.commerce.memberships.groups.empty', 'No package groups')} />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-white/5">
                  <th className="px-4 py-2.5 text-left font-medium text-slate-500">{t('admin.commerce.memberships.groups.table.group', 'Group')}</th>
                  <th className="px-4 py-2.5 text-left font-medium text-slate-500">{t('admin.commerce.memberships.groups.table.category', 'Category')}</th>
                  <th className="px-4 py-2.5 text-left font-medium text-slate-500">{t('admin.commerce.memberships.groups.table.billingCycle', 'Billing Cycle')}</th>
                  <th className="px-4 py-2.5 text-right font-medium text-slate-500">{t('admin.commerce.memberships.groups.table.duration', 'Duration')}</th>
                  <th className="px-4 py-2.5 text-right font-medium text-slate-500">{t('admin.commerce.memberships.groups.table.packages', 'Packages')}</th>
                  <th className="px-4 py-2.5 text-left font-medium text-slate-500">{t('admin.commerce.memberships.groups.table.status', 'Status')}</th>
                  <th className="px-4 py-2.5 text-right font-medium text-slate-500">{t('common.actions.actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => (
                  <tr key={group.id} className="border-b border-slate-50 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5">
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-slate-900 dark:text-white">{group.name}</div>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span>{group.code}</span>
                        {group.autoProvisioned ? (
                          <span className="inline-flex rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                            {t('admin.commerce.memberships.autoProvisioned', 'Auto-created')}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-2.5"><MembershipCategoryBadge category={group.category} /></td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{membershipBillingCycleLabel(group.billingCycle, t)}</td>
                    <td className="px-4 py-2.5 text-right text-slate-600 dark:text-slate-300">{t('admin.commerce.memberships.groups.form.durationOptionDays', '{{days}} days', { days: group.durationDays })}</td>
                    <td className="px-4 py-2.5 text-right text-slate-600 dark:text-slate-300">{group.packageCount}</td>
                    <td className="px-4 py-2.5"><MembershipStatusBadge status={group.status} /></td>
                    <td className="px-4 py-2.5">
                      <MembershipTableActions>
                        <MembershipIconActionButton label={t('common.actions.edit', 'Edit')} icon={<Pencil className="h-4 w-4" />} onClick={() => openEditDrawer(group)} />
                        <MembershipIconActionButton label={t('common.actions.delete', 'Delete')} icon={<Trash2 className="h-4 w-4" />} tone="danger" onClick={() => void handleDeleteGroup(group)} />
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
        title={editingGroup
          ? t('admin.commerce.memberships.groups.editTitle', 'Edit Package Group')
          : t('admin.commerce.memberships.groups.addTitle', 'Add Package Group')}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        footer={(
          <MembershipFormActions
            submitLabel={editingGroup
              ? t('admin.commerce.memberships.groups.form.updateSubmit', 'Update Group')
              : t('admin.commerce.memberships.groups.form.submit', 'Create Group')}
            isSaving={isSaving}
            submitFormId="membership-package-group-form"
            onCancel={() => setIsDrawerOpen(false)}
          />
        )}
      >
        <MembershipPackageGroupDrawerForm
          mode={editingGroup ? 'edit' : 'create'}
          initialValue={editingGroup}
          onSubmit={handleSaveGroup}
        />
      </MembershipDrawer>
    </>
  );
}
