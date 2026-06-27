import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { MembershipAdminPageShell } from '../components/MembershipAdminPageShell';
import { MembershipDrawer } from '../components/MembershipDrawer';
import { MembershipEmptyState } from '../components/MembershipEmptyState';
import {
  MembershipIconActionButton,
  MembershipTableActions,
  MembershipTablePanel,
  confirmMembershipAction,
} from '../components/MembershipPageControls';
import { MembershipStatusBadge } from '../components/MembershipStatusBadge';
import { MembershipPackageDrawerForm } from '../forms/MembershipPackageDrawerForm';
import {
  createMembershipAdminPackage,
  deleteMembershipAdminPackage,
  fetchMembershipAdminPackageCatalog,
  updateMembershipAdminPackage,
  type MembershipsAdminPackageGroup,
  type MembershipsAdminPackageItem,
  type MembershipsAdminPackageMutationInput,
  type MembershipsAdminPlanItem,
} from '../membershipsService';

export function MembershipVipPackagesPage() {
  const { t } = useTranslation();
  const [groups, setGroups] = useState<MembershipsAdminPackageGroup[]>([]);
  const [packages, setPackages] = useState<MembershipsAdminPackageItem[]>([]);
  const [plans, setPlans] = useState<MembershipsAdminPlanItem[]>([]);
  const [editingPackage, setEditingPackage] = useState<MembershipsAdminPackageItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const groupNameById = useMemo(() => new Map(groups.map((group) => [group.id, group.name])), [groups]);
  const planNameById = useMemo(() => new Map(plans.map((plan) => [plan.id, plan.name])), [plans]);

  const loadPackages = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const catalog = await fetchMembershipAdminPackageCatalog();
      setGroups(catalog.groups);
      setPackages(catalog.packages);
      setPlans(catalog.plans);
    } catch (loadError) {
      setError(loadError instanceof Error
        ? loadError.message
        : t('admin.commerce.memberships.vipPackages.error', 'VIP packages could not be loaded'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadPackages();
  }, [loadPackages]);

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
    await loadPackages();
  };

  const handleDeletePackage = async (item: MembershipsAdminPackageItem) => {
    if (!confirmMembershipAction(t('admin.commerce.memberships.vipPackages.deleteConfirmNamed', 'Delete VIP package {{name}}?', { name: item.name || item.packageNo }))) {
      return;
    }
    await deleteMembershipAdminPackage(item.id);
    await loadPackages();
  };

  return (
    <>
      <MembershipAdminPageShell
        isLoading={isLoading}
        error={error}
        onRefresh={loadPackages}
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

          <MembershipTablePanel>
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
          translationKeyPrefix="admin.commerce.memberships.vipPackages"
          onCancel={() => setIsDrawerOpen(false)}
          onSubmit={handleSavePackage}
        />
      </MembershipDrawer>
    </>
  );
}
