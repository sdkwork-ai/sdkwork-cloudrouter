import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil } from 'lucide-react';
import { MembershipAdminPageShell } from '../components/MembershipAdminPageShell';
import { MembershipDrawer } from '../components/MembershipDrawer';
import { MembershipEmptyState } from '../components/MembershipEmptyState';
import {
  MembershipIconActionButton,
  MembershipTableActions,
  MembershipTablePanel,
} from '../components/MembershipPageControls';
import { MembershipStatusBadge } from '../components/MembershipStatusBadge';
import { MembershipMemberStatusDrawerForm } from '../forms/MembershipMemberStatusDrawerForm';
import {
  fetchMembershipAdminMembers,
  updateMembershipAdminMemberStatus,
  type MembershipsAdminMemberStatus,
  type MembershipsAdminRecord,
} from '../membershipsService';

export function MembershipMembersPage() {
  const { t } = useTranslation();
  const [members, setMembers] = useState<MembershipsAdminRecord[]>([]);
  const [editingMember, setEditingMember] = useState<MembershipsAdminRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setMembers(await fetchMembershipAdminMembers());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t('admin.commerce.memberships.members.error', 'Membership records could not be loaded'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  const handleUpdateStatus = async (status: MembershipsAdminMemberStatus) => {
    if (!editingMember) {
      return;
    }
    await updateMembershipAdminMemberStatus(recordText(editingMember, ['id', 'membership_id', 'membership_no']), { status });
    setEditingMember(null);
    await loadMembers();
  };

  return (
    <>
      <MembershipAdminPageShell
        isLoading={isLoading}
        error={error}
        onRefresh={loadMembers}
      >
        <MembershipTablePanel>
          {members.length === 0 ? (
            <MembershipEmptyState title={t('admin.commerce.memberships.empty', 'No membership records')} />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-white/5">
                  <th className="px-4 py-2.5 text-left font-medium text-slate-500">{t('admin.commerce.memberships.members.table.membership', 'Membership')}</th>
                  <th className="px-4 py-2.5 text-left font-medium text-slate-500">{t('admin.commerce.memberships.members.table.user', 'User')}</th>
                  <th className="px-4 py-2.5 text-left font-medium text-slate-500">{t('admin.commerce.memberships.members.table.plan', 'Plan')}</th>
                  <th className="px-4 py-2.5 text-left font-medium text-slate-500">{t('admin.commerce.memberships.members.table.status', 'Status')}</th>
                  <th className="px-4 py-2.5 text-left font-medium text-slate-500">{t('admin.commerce.memberships.members.table.expires', 'Expires')}</th>
                  <th className="px-4 py-2.5 text-right font-medium text-slate-500">{t('common.actions.actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member, index) => (
                  <tr key={recordText(member, ['id', 'membership_no']) || index} className="border-b border-slate-50 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5">
                    <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-white">{recordText(member, ['membership_no', 'id'])}</td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{recordText(member, ['owner_user_id', 'user_id'])}</td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{recordText(member, ['plan_id', 'plan_no'])}</td>
                    <td className="px-4 py-2.5"><MembershipStatusBadge status={recordText(member, ['status'])} /></td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{recordText(member, ['expires_at', 'expiresAt'])}</td>
                    <td className="px-4 py-2.5">
                      <MembershipTableActions>
                        <MembershipIconActionButton label={t('admin.commerce.memberships.members.statusForm.edit', 'Update status')} icon={<Pencil className="h-4 w-4" />} onClick={() => setEditingMember(member)} />
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
        title={t('admin.commerce.memberships.members.statusForm.title', 'Update Member Status')}
        isOpen={editingMember !== null}
        onClose={() => setEditingMember(null)}
      >
        {editingMember ? (
          <MembershipMemberStatusDrawerForm
            initialValue={editingMember}
            onCancel={() => setEditingMember(null)}
            onSubmit={handleUpdateStatus}
          />
        ) : null}
      </MembershipDrawer>
    </>
  );
}

function recordText(record: MembershipsAdminRecord, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value);
    }
  }
  return '';
}
