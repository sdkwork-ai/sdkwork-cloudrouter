import { useCallback, useEffect, useState } from 'react';
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
import { MembershipPackageGroupDrawerForm } from '../forms/MembershipPackageGroupDrawerForm';
import {
  createMembershipAdminPackageGroup,
  deleteMembershipAdminPackageGroup,
  fetchMembershipAdminPackageGroups,
  updateMembershipAdminPackageGroup,
  type MembershipsAdminPackageGroup,
  type MembershipsAdminPackageGroupMutationInput,
} from '../membershipsService';

export function MembershipPackageGroupsPage() {
  const { t } = useTranslation();
  const [groups, setGroups] = useState<MembershipsAdminPackageGroup[]>([]);
  const [editingGroup, setEditingGroup] = useState<MembershipsAdminPackageGroup | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadGroups = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setGroups(await fetchMembershipAdminPackageGroups());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t('admin.commerce.memberships.groups.error', 'Package groups could not be loaded'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadGroups();
  }, [loadGroups]);

  const openCreateDrawer = () => {
    setEditingGroup(null);
    setIsDrawerOpen(true);
  };

  const openEditDrawer = (group: MembershipsAdminPackageGroup) => {
    setEditingGroup(group);
    setIsDrawerOpen(true);
  };

  const handleSaveGroup = async (input: MembershipsAdminPackageGroupMutationInput) => {
    if (editingGroup) {
      await updateMembershipAdminPackageGroup(editingGroup.id, input);
    } else {
      await createMembershipAdminPackageGroup(input);
    }
    setIsDrawerOpen(false);
    setEditingGroup(null);
    await loadGroups();
  };

  const handleDeleteGroup = async (group: MembershipsAdminPackageGroup) => {
    if (!confirmMembershipAction(t('admin.commerce.memberships.groups.deleteConfirmNamed', 'Delete package group {{name}}?', { name: group.name }))) {
      return;
    }
    await deleteMembershipAdminPackageGroup(group.id);
    await loadGroups();
  };

  return (
    <>
      <MembershipAdminPageShell
        isLoading={isLoading}
        error={error}
        onRefresh={loadGroups}
        actions={(
          <button type="button" onClick={openCreateDrawer} className="inline-flex items-center gap-1 rounded-md bg-lobster-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-lobster-700">
            <Plus className="h-3.5 w-3.5" />
            {t('admin.commerce.memberships.groups.addTitle', 'Add Package Group')}
          </button>
        )}
      >
        <MembershipTablePanel>
          {groups.length === 0 ? (
            <MembershipEmptyState title={t('admin.commerce.memberships.groups.empty', 'No package groups')} />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-white/5">
                  <th className="px-4 py-2.5 text-left font-medium text-slate-500">{t('admin.commerce.memberships.groups.table.group', 'Group')}</th>
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
                      <div className="text-xs text-slate-400">{group.code}</div>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{group.billingCycle}</td>
                    <td className="px-4 py-2.5 text-right text-slate-600 dark:text-slate-300">{group.durationDays}d</td>
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
      >
        <MembershipPackageGroupDrawerForm
          mode={editingGroup ? 'edit' : 'create'}
          initialValue={editingGroup}
          onCancel={() => setIsDrawerOpen(false)}
          onSubmit={handleSaveGroup}
        />
      </MembershipDrawer>
    </>
  );
}
