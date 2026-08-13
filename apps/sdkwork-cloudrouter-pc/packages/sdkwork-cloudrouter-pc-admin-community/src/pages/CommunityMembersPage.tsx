import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, UserCog } from 'lucide-react';
import { resolveProblemMessage } from '@sdkwork/cloudroutes-pc-commons';
import { CommunityAdminPageShell } from '../components/CommunityAdminPageShell';
import { CommunityCirclePicker } from '../components/CommunityCirclePicker';
import {
  CommunityEmptyState,
} from '../components/CommunityEmptyState';
import {
  CommunityIconActionButton,
  CommunityTableActions,
  CommunityTablePanel,
  confirmCommunityAction,
} from '../components/CommunityPageControls';
import { CommunityDrawer } from '../components/CommunityDrawer';
import { CommunityFormActions } from '../components/CommunityFormControls';
import { MemberPatchDrawerForm } from '../forms/MemberPatchDrawerForm';
import {
  fetchCommunityAdminMembers,
  removeCommunityAdminMember,
  updateCommunityAdminMember,
  type CommunityAdminMemberItem,
  type CommunityAdminMemberPatchInput,
} from '../communityService';
import {
  CommunityRoleBadge,
  CommunityStatusBadge,
} from '../components/CommunityStatusBadge';
import { formatCommunityDateTime } from '../communityFormat';

export function CommunityMembersPage() {
  const { t } = useTranslation();
  const [categoryId, setCategoryId] = useState('');
  const [members, setMembers] = useState<CommunityAdminMemberItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editingMember, setEditingMember] = useState<CommunityAdminMemberItem | null>(null);
  const [isPatchOpen, setIsPatchOpen] = useState(false);
  const requestIdRef = useRef(0);

  const loadMembers = useCallback(async (requestedCategoryId: string) => {
    if (!requestedCategoryId) {
      setMembers([]);
      setIsLoading(false);
      return;
    }
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);
    try {
      const items = await fetchCommunityAdminMembers(requestedCategoryId);
      if (requestId !== requestIdRef.current) {
        return;
      }
      setMembers(items);
    } catch (loadError) {
      if (requestId === requestIdRef.current) {
        setError(
          resolveProblemMessage(
            loadError,
            t,
            t('admin.community.members.error', 'Community members could not be loaded'),
          ),
        );
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [t]);

  useEffect(() => {
    void loadMembers(categoryId);
    return () => {
      requestIdRef.current += 1;
    };
  }, [loadMembers, categoryId]);

  const handlePatchMember = async (input: CommunityAdminMemberPatchInput) => {
    if (!editingMember) {
      return;
    }
    setIsSaving(true);
    try {
      const updated = await updateCommunityAdminMember(categoryId, editingMember.id, input);
      setMembers((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setIsPatchOpen(false);
      setEditingMember(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveMember = async (member: CommunityAdminMemberItem) => {
    if (!confirmCommunityAction(
      t('admin.community.members.removeConfirm', 'Remove "{{name}}" from this circle?', { name: member.userName }),
    )) {
      return;
    }
    await removeCommunityAdminMember(categoryId, member.id);
    await loadMembers(categoryId);
  };

  if (!categoryId) {
    return (
      <CommunityAdminPageShell
        isLoading={false}
        error={null}
        onRefresh={() => void loadMembers(categoryId)}
        actions={(
          <CommunityCirclePicker value={categoryId} onChange={setCategoryId} />
        )}
      >
        <CommunityEmptyState title={t('admin.community.members.pickCircle', 'Select a circle to manage its members')} />
      </CommunityAdminPageShell>
    );
  }

  return (
    <CommunityAdminPageShell
      isLoading={isLoading}
      error={error}
      onRefresh={() => void loadMembers(categoryId)}
      actions={(
        <CommunityCirclePicker value={categoryId} onChange={setCategoryId} />
      )}
    >
      <CommunityTablePanel>
        {members.length === 0 ? (
          <CommunityEmptyState title={t('admin.community.members.empty', 'No members in this circle')} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left dark:border-white/10">
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.community.members.column.member', 'Member')}</th>
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.community.members.column.role', 'Role')}</th>
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.community.members.column.status', 'Status')}</th>
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.community.members.column.tier', 'Tier')}</th>
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.community.members.column.joined', 'Joined')}</th>
                <th className="px-4 py-2.5 text-right font-medium text-slate-500">{t('admin.community.members.column.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id} className="border-b border-slate-50 hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/5">
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-slate-900 dark:text-white">{member.userName}</p>
                    <p className="text-xs text-slate-400">{member.userId}</p>
                  </td>
                  <td className="px-4 py-2.5">
                    <CommunityRoleBadge role={member.role} />
                  </td>
                  <td className="px-4 py-2.5">
                    <CommunityStatusBadge status={member.status} />
                  </td>
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                    {member.tierName ?? t('admin.community.members.noTier', 'None')}
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">
                    {formatCommunityDateTime(member.joinedAt)}
                  </td>
                  <td className="px-4 py-2.5">
                    <CommunityTableActions>
                      <CommunityIconActionButton
                        label={t('admin.community.members.adjust', 'Adjust role / status')}
                        icon={<UserCog className="h-4 w-4" />}
                        onClick={() => {
                          setEditingMember(member);
                          setIsPatchOpen(true);
                        }}
                      />
                      <CommunityIconActionButton
                        label={t('common.actions.remove', 'Remove')}
                        icon={<Trash2 className="h-4 w-4" />}
                        tone="danger"
                        onClick={() => void handleRemoveMember(member)}
                      />
                    </CommunityTableActions>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CommunityTablePanel>

      <CommunityDrawer
        title={t('admin.community.members.adjustTitle', 'Adjust member')}
        description={editingMember?.userName}
        isOpen={isPatchOpen}
        onClose={() => setIsPatchOpen(false)}
        footer={(
          <CommunityFormActions
            submitLabel={t('admin.community.members.form.submit', 'Save changes')}
            isSaving={isSaving}
            submitFormId="community-member-form"
            onCancel={() => setIsPatchOpen(false)}
          />
        )}
      >
        {editingMember ? (
          <MemberPatchDrawerForm initialValue={editingMember} onSubmit={handlePatchMember} />
        ) : null}
      </CommunityDrawer>
    </CommunityAdminPageShell>
  );
}
