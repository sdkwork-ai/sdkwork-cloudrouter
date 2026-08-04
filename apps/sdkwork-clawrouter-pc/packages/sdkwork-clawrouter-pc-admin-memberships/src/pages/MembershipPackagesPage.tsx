import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react';
import { BottomPagination } from '@sdkwork/clawroutes-pc-commons';
import { formatMoney } from '@sdkwork/clawroutes-pc-commons/sdkwork-utils';
import { MembershipAdminPageShell } from '../components/MembershipAdminPageShell';
import { MembershipDialog } from '../components/MembershipDialog';
import { MembershipDrawer } from '../components/MembershipDrawer';
import { MembershipEmptyState } from '../components/MembershipEmptyState';
import {
  MembershipIconActionButton,
  MembershipTableActions,
  MembershipTablePanel,
  confirmMembershipAction,
  hasNextMembershipPage,
  membershipPageLabel,
} from '../components/MembershipPageControls';
import { MembershipStatusBadge } from '../components/MembershipStatusBadge';
import { MembershipPackageDrawerForm } from '../forms/MembershipPackageDrawerForm';
import { MembershipPackageGroupDrawerForm } from '../forms/MembershipPackageGroupDrawerForm';
import {
  createMembershipAdminPackage,
  createMembershipAdminPackageGroup,
  deleteMembershipAdminPackage,
  deleteMembershipAdminPackageGroup,
  fetchMembershipAdminPackageGroups,
  fetchMembershipAdminPackages,
  fetchMembershipAdminPlans,
  updateMembershipAdminPackage,
  updateMembershipAdminPackageGroup,
  type MembershipsAdminPackageGroup,
  type MembershipsAdminPackageGroupMutationInput,
  type MembershipsAdminPackageItem,
  type MembershipsAdminPackageMutationInput,
  type MembershipsAdminPageInfo,
  type MembershipsAdminPlanItem,
} from '../membershipsService';

export function MembershipPackagesPage() {
  const { t, i18n } = useTranslation();
  const displayLocale = i18n.resolvedLanguage ?? i18n.language ?? 'en-US';
  const [groups, setGroups] = useState<MembershipsAdminPackageGroup[]>([]);
  const [packages, setPackages] = useState<MembershipsAdminPackageItem[]>([]);
  const [plans, setPlans] = useState<MembershipsAdminPlanItem[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [editingPackage, setEditingPackage] = useState<MembershipsAdminPackageItem | null>(null);
  const [editingGroup, setEditingGroup] = useState<MembershipsAdminPackageGroup | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [isReferenceLoading, setIsReferenceLoading] = useState(true);
  const [isPackageLoading, setIsPackageLoading] = useState(false);
  const [referenceError, setReferenceError] = useState<string | null>(null);
  const [packageError, setPackageError] = useState<string | null>(null);
  const [groupPage, setGroupPage] = useState(1);
  const [groupPageInfo, setGroupPageInfo] = useState<MembershipsAdminPageInfo | null>(null);
  const [planPage, setPlanPage] = useState(1);
  const [planPageInfo, setPlanPageInfo] = useState<MembershipsAdminPageInfo | null>(null);
  const [packagePage, setPackagePage] = useState(1);
  const [packagePageSize, setPackagePageSize] = useState(20);
  const [packagePageInfo, setPackagePageInfo] = useState<MembershipsAdminPageInfo | null>(null);
  const referenceRequestIdRef = useRef(0);
  const packageRequestIdRef = useRef(0);
  const referencePageSize = 20;

  const loadReferenceData = useCallback(async (
    requestedGroupPage: number,
    requestedPlanPage: number,
    preferredGroupId?: string,
  ) => {
    const requestId = ++referenceRequestIdRef.current;
    setIsReferenceLoading(true);
    setReferenceError(null);
    try {
      const [groupResult, planResult] = await Promise.all([
        fetchMembershipAdminPackageGroups({ page: requestedGroupPage, pageSize: referencePageSize }),
        fetchMembershipAdminPlans({ page: requestedPlanPage, pageSize: referencePageSize }),
      ]);
      if (requestId !== referenceRequestIdRef.current) {
        return;
      }
      setGroups(groupResult.items);
      setGroupPageInfo(groupResult.pageInfo);
      setPlans(planResult.items);
      setPlanPageInfo(planResult.pageInfo);
      setSelectedGroupId((current) => {
        const requestedGroupId = preferredGroupId ?? current;
        if (requestedGroupId && groupResult.items.some((group) => group.id === requestedGroupId)) {
          return requestedGroupId;
        }
        return groupResult.items[0]?.id ?? null;
      });
    } catch (loadError) {
      if (requestId === referenceRequestIdRef.current) {
        setReferenceError(loadError instanceof Error ? loadError.message : t('admin.commerce.memberships.packages.error', 'Membership packages could not be loaded'));
      }
    } finally {
      if (requestId === referenceRequestIdRef.current) {
        setIsReferenceLoading(false);
      }
    }
  }, [t]);

  const loadPackages = useCallback(async (
    requestedPage: number,
    requestedGroupId: string | null,
  ) => {
    const requestId = ++packageRequestIdRef.current;
    if (!requestedGroupId) {
      setPackages([]);
      setPackagePageInfo(null);
      setPackageError(null);
      setIsPackageLoading(false);
      return;
    }
    setIsPackageLoading(true);
    setPackageError(null);
    try {
      const result = await fetchMembershipAdminPackages({
        page: requestedPage,
        pageSize: packagePageSize,
        packageGroupId: requestedGroupId,
      });
      if (requestId !== packageRequestIdRef.current) {
        return;
      }
      setPackages(result.items);
      setPackagePageInfo(result.pageInfo);
    } catch (loadError) {
      if (requestId === packageRequestIdRef.current) {
        setPackageError(loadError instanceof Error ? loadError.message : t('admin.commerce.memberships.packages.error', 'Membership packages could not be loaded'));
      }
    } finally {
      if (requestId === packageRequestIdRef.current) {
        setIsPackageLoading(false);
      }
    }
  }, [packagePageSize, t]);

  const refreshPage = useCallback(async () => {
    await Promise.all([
      loadReferenceData(groupPage, planPage),
      loadPackages(packagePage, selectedGroupId),
    ]);
  }, [groupPage, loadPackages, loadReferenceData, packagePage, planPage, selectedGroupId]);

  useEffect(() => {
    void loadReferenceData(groupPage, planPage);
    return () => {
      referenceRequestIdRef.current += 1;
    };
  }, [groupPage, loadReferenceData, planPage]);

  useEffect(() => {
    void loadPackages(packagePage, selectedGroupId);
    return () => {
      packageRequestIdRef.current += 1;
    };
  }, [loadPackages, packagePage, selectedGroupId]);

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === selectedGroupId) ?? null,
    [groups, selectedGroupId],
  );
  const openCreateDrawer = () => {
    setEditingPackage(null);
    setIsDrawerOpen(true);
  };

  const openEditDrawer = (item: MembershipsAdminPackageItem) => {
    setEditingPackage(item);
    setIsDrawerOpen(true);
  };

  const openCreateGroupDialog = () => {
    setEditingGroup(null);
    setIsGroupDialogOpen(true);
  };

  const openEditGroupDialog = (group: MembershipsAdminPackageGroup) => {
    setEditingGroup(group);
    setIsGroupDialogOpen(true);
  };

  const handleSavePackage = async (input: MembershipsAdminPackageMutationInput) => {
    if (editingPackage) {
      await updateMembershipAdminPackage(editingPackage.id, input);
    } else {
      await createMembershipAdminPackage(input);
    }
    setIsDrawerOpen(false);
    setEditingPackage(null);
    await loadPackages(packagePage, selectedGroupId);
  };

  const handleSaveGroup = async (input: MembershipsAdminPackageGroupMutationInput) => {
    const savedGroup = editingGroup
      ? await updateMembershipAdminPackageGroup(editingGroup.id, input)
      : await createMembershipAdminPackageGroup(input);
    setIsGroupDialogOpen(false);
    setEditingGroup(null);
    setSelectedGroupId(savedGroup.id);
    const targetGroupPage = editingGroup ? groupPage : 1;
    if (targetGroupPage !== groupPage) {
      setGroupPage(targetGroupPage);
      return;
    }
    await loadReferenceData(targetGroupPage, planPage, savedGroup.id);
  };

  const handleDeletePackage = async (item: MembershipsAdminPackageItem) => {
    if (!confirmMembershipAction(t('admin.commerce.memberships.packages.deleteConfirmNamed', 'Delete membership package {{name}}?', { name: item.name || item.packageNo }))) {
      return;
    }
    await deleteMembershipAdminPackage(item.id);
    const targetPage = packages.length === 1 && packagePage > 1 ? packagePage - 1 : packagePage;
    if (targetPage !== packagePage) {
      setPackagePage(targetPage);
      return;
    }
    await loadPackages(targetPage, selectedGroupId);
  };

  const handleDeleteGroup = async (group: MembershipsAdminPackageGroup) => {
    if (!confirmMembershipAction(t('admin.commerce.memberships.groups.deleteConfirmNamed', 'Delete package group {{name}}?', { name: group.name }))) {
      return;
    }
    await deleteMembershipAdminPackageGroup(group.id);
    if (selectedGroupId === group.id) {
      setSelectedGroupId(null);
      setPackagePage(1);
    }
    const targetGroupPage = groups.length === 1 && groupPage > 1 ? groupPage - 1 : groupPage;
    if (targetGroupPage !== groupPage) {
      setGroupPage(targetGroupPage);
      return;
    }
    await loadReferenceData(targetGroupPage, planPage);
  };

  return (
    <>
      <MembershipAdminPageShell
        isLoading={isReferenceLoading || isPackageLoading}
        error={packageError ?? referenceError}
        onRefresh={refreshPage}
        actions={(
          <button
            type="button"
            onClick={openCreateDrawer}
            className="inline-flex items-center gap-1 rounded-md bg-lobster-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-lobster-700"
          >
            <Plus className="h-3.5 w-3.5" />
            {t('admin.commerce.memberships.packages.add', 'Add Package')}
          </button>
        )}
      >
        <div className="grid min-h-[560px] gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="flex min-h-0 flex-col rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
            <div data-admin-membership-package-groups-header className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-white/10">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{t('admin.commerce.memberships.groups.title', 'Package Groups')}</h3>
              <div data-admin-membership-package-group-add>
                <MembershipIconActionButton
                  label={t('admin.commerce.memberships.groups.addTitle', 'Add Package Group')}
                  icon={<Plus className="h-4 w-4" />}
                  onClick={openCreateGroupDialog}
                />
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {groups.length === 0 ? (
                <MembershipEmptyState title={t('admin.commerce.memberships.groups.empty', 'No package groups')} />
              ) : groups.map((group) => (
                <div
                  key={group.id}
                  className={`flex items-center gap-1 rounded-lg transition-colors ${
                    selectedGroupId === group.id
                      ? 'bg-lobster-50 dark:bg-lobster-500/10'
                      : 'hover:bg-slate-50 dark:hover:bg-white/5'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setPackagePage(1);
                      setSelectedGroupId(group.id);
                    }}
                    className="flex min-w-0 flex-1 items-center justify-between px-3 py-2.5 text-left"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-slate-800 dark:text-slate-200">{group.name}</span>
                      <span className="mt-0.5 block text-xs text-slate-400">{t('admin.commerce.memberships.groups.packagesCount', '{{count}} packages', { count: group.packageCount })}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                  </button>
                  <div className="flex shrink-0 items-center gap-1 pr-2">
                    <div data-admin-membership-package-group-edit>
                      <MembershipIconActionButton
                        label={t('common.actions.edit', 'Edit')}
                        icon={<Pencil className="h-4 w-4" />}
                        onClick={() => openEditGroupDialog(group)}
                      />
                    </div>
                    <div data-admin-membership-package-group-delete>
                      <MembershipIconActionButton
                        label={t('common.actions.delete', 'Delete')}
                        icon={<Trash2 className="h-4 w-4" />}
                        tone="danger"
                        onClick={() => void handleDeleteGroup(group)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 px-3 py-2 dark:border-white/10">
              <MembershipIconActionButton
                label={t('common.pagination.previous', 'Previous page')}
                icon={<ChevronLeft className="h-4 w-4" />}
                disabled={isReferenceLoading || groupPage <= 1}
                onClick={() => setGroupPage((current) => Math.max(1, current - 1))}
              />
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {membershipPageLabel(t('common.pagination.page', 'Page'), groupPage, groupPageInfo)}
              </span>
              <MembershipIconActionButton
                label={t('common.pagination.next', 'Next page')}
                icon={<ChevronRight className="h-4 w-4" />}
                disabled={isReferenceLoading || !hasNextMembershipPage(groupPageInfo, groupPage, groups.length, referencePageSize)}
                onClick={() => setGroupPage((current) => current + 1)}
              />
            </div>
          </div>

          <MembershipTablePanel
            footer={(
              <BottomPagination
                disabled={isPackageLoading}
                hasNextPage={hasNextMembershipPage(packagePageInfo, packagePage, packages.length, packagePageSize)}
                itemCount={packages.length}
                nextLabel={t('common.pagination.next', 'Next page')}
                onNextPage={() => setPackagePage((current) => current + 1)}
                onPageSizeChange={(nextPageSize) => {
                  setPackagePage(1);
                  setPackagePageSize(nextPageSize);
                }}
                onPreviousPage={() => setPackagePage((current) => Math.max(1, current - 1))}
                page={packagePage}
                pageLabel={membershipPageLabel(t('common.pagination.page', 'Page'), packagePage, packagePageInfo)}
                pageSize={packagePageSize}
                pageSizeLabel={t('common.pagination.rows', 'Rows')}
                pageSizeOptions={[20, 50, 100]}
                previousLabel={t('common.pagination.previous', 'Previous page')}
                showingLabel={t('common.pagination.showing', 'Showing')}
              />
            )}
          >
            <div className="border-b border-slate-200 px-4 py-3 dark:border-white/10">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                {selectedGroup?.name ?? t('admin.commerce.memberships.packages.table.packages', 'Packages')}
              </h3>
              {selectedGroup?.description ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{selectedGroup.description}</p> : null}
            </div>
            {packages.length === 0 ? (
              <MembershipEmptyState title={t('admin.commerce.memberships.packages.emptyGroup', 'No packages in this group')} />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-white/5">
                    <th className="px-4 py-2.5 text-left font-medium text-slate-500">{t('admin.commerce.memberships.packages.table.package', 'Package')}</th>
                    <th className="px-4 py-2.5 text-left font-medium text-slate-500">{t('admin.commerce.memberships.packages.table.plan', 'Plan')}</th>
                    <th className="px-4 py-2.5 text-right font-medium text-slate-500">{t('admin.commerce.memberships.packages.table.price', 'Price')}</th>
                    <th className="px-4 py-2.5 text-left font-medium text-slate-500">{t('admin.commerce.memberships.packages.table.duration', 'Duration')}</th>
                    <th className="px-4 py-2.5 text-left font-medium text-slate-500">{t('admin.commerce.memberships.packages.table.status', 'Status')}</th>
                    <th className="px-4 py-2.5 text-right font-medium text-slate-500">{t('common.actions.actions', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {packages.map((item) => (
                    <tr key={item.id} className="border-b border-slate-50 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5">
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-slate-900 dark:text-white">{item.name || item.packageNo}</div>
                        <div className="text-xs text-slate-400">{item.packageNo}</div>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{item.planId}</td>
                      <td className="px-4 py-2.5 text-right text-slate-600 dark:text-slate-300">
                        {formatMoney(item.priceAmount, { currency: item.currencyCode, locale: displayLocale, mode: 'symbol' }) ?? `${item.priceAmount} ${item.currencyCode}`}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{item.durationDays}d</td>
                      <td className="px-4 py-2.5"><MembershipStatusBadge status={item.status} /></td>
                      <td className="px-4 py-2.5">
                        <MembershipTableActions>
                          <MembershipIconActionButton label={t('common.actions.edit', 'Edit')} icon={<Pencil className="h-4 w-4" />} onClick={() => openEditDrawer(item)} />
                          <MembershipIconActionButton label={t('common.actions.delete', 'Delete')} icon={<Trash2 className="h-4 w-4" />} tone="danger" onClick={() => void handleDeletePackage(item)} />
                        </MembershipTableActions>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </MembershipTablePanel>
        </div>
      </MembershipAdminPageShell>

      <MembershipDrawer
        title={editingPackage
          ? t('admin.commerce.memberships.packages.editTitle', 'Edit Membership Package')
          : t('admin.commerce.memberships.packages.addTitle', 'Add Membership Package')}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      >
        <MembershipPackageDrawerForm
          mode={editingPackage ? 'edit' : 'create'}
          initialValue={editingPackage}
          groups={groups}
          plans={plans}
          defaultGroupId={selectedGroupId}
          groupPagination={{
            page: groupPage,
            hasNextPage: hasNextMembershipPage(groupPageInfo, groupPage, groups.length, referencePageSize),
            isLoading: isReferenceLoading,
            onNextPage: () => setGroupPage((current) => current + 1),
            onPreviousPage: () => setGroupPage((current) => Math.max(1, current - 1)),
          }}
          planPagination={{
            page: planPage,
            hasNextPage: hasNextMembershipPage(planPageInfo, planPage, plans.length, referencePageSize),
            isLoading: isReferenceLoading,
            onNextPage: () => setPlanPage((current) => current + 1),
            onPreviousPage: () => setPlanPage((current) => Math.max(1, current - 1)),
          }}
          onCancel={() => setIsDrawerOpen(false)}
          onSubmit={handleSavePackage}
        />
      </MembershipDrawer>

      <MembershipDialog
        title={editingGroup
          ? t('admin.commerce.memberships.groups.editTitle', 'Edit Package Group')
          : t('admin.commerce.memberships.groups.addTitle', 'Add Package Group')}
        isOpen={isGroupDialogOpen}
        onClose={() => setIsGroupDialogOpen(false)}
      >
        <MembershipPackageGroupDrawerForm
          mode={editingGroup ? 'edit' : 'create'}
          initialValue={editingGroup}
          onCancel={() => setIsGroupDialogOpen(false)}
          onSubmit={handleSaveGroup}
        />
      </MembershipDialog>
    </>
  );
}
