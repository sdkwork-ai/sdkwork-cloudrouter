import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { BottomPagination } from '@sdkwork/clawroutes-pc-commons';
import { MembershipAdminPageShell } from '../components/MembershipAdminPageShell';
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
import {
  createMembershipAdminPackage,
  deleteMembershipAdminPackage,
  fetchMembershipAdminPackageGroups,
  fetchMembershipAdminPackages,
  fetchMembershipAdminPlans,
  updateMembershipAdminPackage,
  type MembershipsAdminPackageGroup,
  type MembershipsAdminPackageItem,
  type MembershipsAdminPackageMutationInput,
  type MembershipsAdminPageInfo,
  type MembershipsAdminPlanItem,
} from '../membershipsService';

export function MembershipVipPackagesPage() {
  const { t } = useTranslation();
  const [groups, setGroups] = useState<MembershipsAdminPackageGroup[]>([]);
  const [packages, setPackages] = useState<MembershipsAdminPackageItem[]>([]);
  const [plans, setPlans] = useState<MembershipsAdminPlanItem[]>([]);
  const [editingPackage, setEditingPackage] = useState<MembershipsAdminPackageItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isReferenceLoading, setIsReferenceLoading] = useState(true);
  const [isPackageLoading, setIsPackageLoading] = useState(true);
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

  const groupNameById = useMemo(() => new Map(groups.map((group) => [group.id, group.name])), [groups]);
  const planNameById = useMemo(() => new Map(plans.map((plan) => [plan.id, plan.name])), [plans]);

  const loadReferenceData = useCallback(async (
    requestedGroupPage: number,
    requestedPlanPage: number,
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
    } catch (loadError) {
      if (requestId === referenceRequestIdRef.current) {
        setReferenceError(loadError instanceof Error
          ? loadError.message
          : t('admin.commerce.memberships.vipPackages.error', 'VIP packages could not be loaded'));
      }
    } finally {
      if (requestId === referenceRequestIdRef.current) {
        setIsReferenceLoading(false);
      }
    }
  }, [t]);

  const loadPackages = useCallback(async (requestedPage: number) => {
    const requestId = ++packageRequestIdRef.current;
    setIsPackageLoading(true);
    setPackageError(null);
    try {
      const result = await fetchMembershipAdminPackages({
        page: requestedPage,
        pageSize: packagePageSize,
      });
      if (requestId !== packageRequestIdRef.current) {
        return;
      }
      setPackages(result.items);
      setPackagePageInfo(result.pageInfo);
    } catch (loadError) {
      if (requestId === packageRequestIdRef.current) {
        setPackageError(loadError instanceof Error
          ? loadError.message
          : t('admin.commerce.memberships.vipPackages.error', 'VIP packages could not be loaded'));
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
      loadPackages(packagePage),
    ]);
  }, [groupPage, loadPackages, loadReferenceData, packagePage, planPage]);

  useEffect(() => {
    void loadReferenceData(groupPage, planPage);
    return () => {
      referenceRequestIdRef.current += 1;
    };
  }, [groupPage, loadReferenceData, planPage]);

  useEffect(() => {
    void loadPackages(packagePage);
    return () => {
      packageRequestIdRef.current += 1;
    };
  }, [loadPackages, packagePage]);

  const openCreateDrawer = () => {
    setEditingPackage(null);
    setIsDrawerOpen(true);
  };

  const openEditDrawer = (item: MembershipsAdminPackageItem) => {
    setEditingPackage(item);
    setIsDrawerOpen(true);
  };

  const handleSavePackage = async (input: MembershipsAdminPackageMutationInput) => {
    if (editingPackage) {
      await updateMembershipAdminPackage(editingPackage.id, input);
    } else {
      await createMembershipAdminPackage(input);
    }
    setIsDrawerOpen(false);
    setEditingPackage(null);
    await loadPackages(packagePage);
  };

  const handleDeletePackage = async (item: MembershipsAdminPackageItem) => {
    if (!confirmMembershipAction(t('admin.commerce.memberships.vipPackages.deleteConfirmNamed', 'Delete VIP package {{name}}?', { name: item.name || item.packageNo }))) {
      return;
    }
    await deleteMembershipAdminPackage(item.id);
    const targetPage = packages.length === 1 && packagePage > 1 ? packagePage - 1 : packagePage;
    if (targetPage !== packagePage) {
      setPackagePage(targetPage);
      return;
    }
    await loadPackages(targetPage);
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
            data-admin-membership-vip-package-add
            onClick={openCreateDrawer}
            className="inline-flex items-center gap-1 rounded-md bg-lobster-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-lobster-700"
          >
            <Plus className="h-3.5 w-3.5" />
            {t('admin.commerce.memberships.vipPackages.add', 'Add VIP Package')}
          </button>
        )}
      >
        <div data-admin-membership-vip-packages-page className="grid gap-4">
          <div>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
              {t('admin.commerce.memberships.vipPackages.title', 'VIP Packages')}
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {t('admin.commerce.memberships.vipPackages.desc', 'Manage VIP membership packages used by the VIP purchase page.')}
            </p>
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
            {packages.length === 0 ? (
              <MembershipEmptyState title={t('admin.commerce.memberships.vipPackages.empty', 'No VIP packages')} />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-white/5">
                    <th className="px-4 py-2.5 text-left font-medium text-slate-500">{t('admin.commerce.memberships.vipPackages.table.package', 'Package')}</th>
                    <th className="px-4 py-2.5 text-left font-medium text-slate-500">{t('admin.commerce.memberships.vipPackages.table.group', 'Group')}</th>
                    <th className="px-4 py-2.5 text-left font-medium text-slate-500">{t('admin.commerce.memberships.vipPackages.table.plan', 'Plan')}</th>
                    <th className="px-4 py-2.5 text-right font-medium text-slate-500">{t('admin.commerce.memberships.vipPackages.table.price', 'Price')}</th>
                    <th className="px-4 py-2.5 text-left font-medium text-slate-500">{t('admin.commerce.memberships.vipPackages.table.duration', 'Duration')}</th>
                    <th className="px-4 py-2.5 text-left font-medium text-slate-500">{t('admin.commerce.memberships.vipPackages.table.status', 'Status')}</th>
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
                      <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                        {groupNameById.get(item.groupId) ?? item.groupId}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                        {planNameById.get(item.planId) ?? item.planId}
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-600 dark:text-slate-300">{item.priceAmount} {item.currencyCode}</td>
                      <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{item.durationDays}d</td>
                      <td className="px-4 py-2.5"><MembershipStatusBadge status={item.status} /></td>
                      <td className="px-4 py-2.5">
                        <MembershipTableActions>
                          <div data-admin-membership-vip-package-edit>
                            <MembershipIconActionButton label={t('common.actions.edit', 'Edit')} icon={<Pencil className="h-4 w-4" />} onClick={() => openEditDrawer(item)} />
                          </div>
                          <div data-admin-membership-vip-package-delete>
                            <MembershipIconActionButton label={t('common.actions.delete', 'Delete')} icon={<Trash2 className="h-4 w-4" />} tone="danger" onClick={() => void handleDeletePackage(item)} />
                          </div>
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
          ? t('admin.commerce.memberships.vipPackages.editTitle', 'Edit VIP Package')
          : t('admin.commerce.memberships.vipPackages.addTitle', 'Add VIP Package')}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      >
        <MembershipPackageDrawerForm
          mode={editingPackage ? 'edit' : 'create'}
          initialValue={editingPackage}
          groups={groups}
          plans={plans}
          defaultGroupId={groups[0]?.id ?? null}
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
          translationKeyPrefix="admin.commerce.memberships.vipPackages"
          onCancel={() => setIsDrawerOpen(false)}
          onSubmit={handleSavePackage}
        />
      </MembershipDrawer>
    </>
  );
}
