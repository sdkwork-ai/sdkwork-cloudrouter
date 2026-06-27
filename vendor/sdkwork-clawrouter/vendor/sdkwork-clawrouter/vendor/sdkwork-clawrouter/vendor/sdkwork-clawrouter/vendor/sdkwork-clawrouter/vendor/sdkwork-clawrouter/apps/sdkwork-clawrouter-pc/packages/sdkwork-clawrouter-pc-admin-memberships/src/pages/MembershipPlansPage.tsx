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
import { MembershipPlanDrawerForm } from '../forms/MembershipPlanDrawerForm';
import {
  createMembershipAdminPlan,
  deleteMembershipAdminPlan,
  fetchMembershipAdminPlans,
  updateMembershipAdminPlan,
  type MembershipsAdminPlanItem,
  type MembershipsAdminPlanMutationInput,
} from '../membershipsService';

export function MembershipPlansPage() {
  const { t } = useTranslation();
  const [plans, setPlans] = useState<MembershipsAdminPlanItem[]>([]);
  const [editingPlan, setEditingPlan] = useState<MembershipsAdminPlanItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPlans = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setPlans(await fetchMembershipAdminPlans());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t('admin.commerce.memberships.plans.error', 'Membership levels could not be loaded'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadPlans();
  }, [loadPlans]);

  const openCreateDrawer = () => {
    setEditingPlan(null);
    setIsDrawerOpen(true);
  };

  const openEditDrawer = (plan: MembershipsAdminPlanItem) => {
    setEditingPlan(plan);
    setIsDrawerOpen(true);
  };

  const handleSavePlan = async (input: MembershipsAdminPlanMutationInput) => {
    if (editingPlan) {
      await updateMembershipAdminPlan(editingPlan.id, input);
    } else {
      await createMembershipAdminPlan(input);
    }
    setIsDrawerOpen(false);
    setEditingPlan(null);
    await loadPlans();
  };

  const handleDeletePlan = async (plan: MembershipsAdminPlanItem) => {
    if (!confirmMembershipAction(t('admin.commerce.memberships.plans.deleteConfirmNamed', 'Delete membership level {{name}}?', { name: plan.name }))) {
      return;
    }
    await deleteMembershipAdminPlan(plan.id);
    await loadPlans();
  };

  return (
    <>
      <MembershipAdminPageShell
        isLoading={isLoading}
        error={error}
        onRefresh={loadPlans}
        actions={(
          <button type="button" onClick={openCreateDrawer} className="inline-flex items-center gap-1 rounded-md bg-lobster-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-lobster-700">
            <Plus className="h-3.5 w-3.5" />
            {t('admin.commerce.memberships.plans.add', 'Add Level')}
          </button>
        )}
      >
        <MembershipTablePanel>
          {plans.length === 0 ? (
            <MembershipEmptyState title={t('admin.commerce.memberships.plans.empty', 'No membership levels')} />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-white/5">
                  <th className="px-4 py-2.5 text-left font-medium text-slate-500">{t('admin.commerce.memberships.plans.table.level', 'Level')}</th>
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
                    <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-white">{plan.name}</td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{plan.levelCode || plan.planNo}</td>
                    <td className="px-4 py-2.5 text-right text-slate-600 dark:text-slate-300">{plan.rank}</td>
                    <td className="px-4 py-2.5 text-right text-slate-600 dark:text-slate-300">{plan.benefitCount}</td>
                    <td className="px-4 py-2.5"><MembershipStatusBadge status={plan.status} /></td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{plan.updatedAt}</td>
                    <td className="px-4 py-2.5">
                      <MembershipTableActions>
                        <MembershipIconActionButton label={t('common.actions.edit', 'Edit')} icon={<Pencil className="h-4 w-4" />} onClick={() => openEditDrawer(plan)} />
                        <MembershipIconActionButton label={t('common.actions.delete', 'Delete')} icon={<Trash2 className="h-4 w-4" />} tone="danger" onClick={() => void handleDeletePlan(plan)} />
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
      >
        <MembershipPlanDrawerForm
          mode={editingPlan ? 'edit' : 'create'}
          initialValue={editingPlan}
          onCancel={() => setIsDrawerOpen(false)}
          onSubmit={handleSavePlan}
        />
      </MembershipDrawer>
    </>
  );
}
