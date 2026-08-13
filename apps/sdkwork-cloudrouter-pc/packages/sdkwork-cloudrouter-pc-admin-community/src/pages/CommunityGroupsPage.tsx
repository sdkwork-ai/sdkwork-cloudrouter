import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Plus, QrCode, Trash2 } from 'lucide-react';
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
import { GroupDrawerForm } from '../forms/GroupDrawerForm';
import {
  createCommunityAdminGroup,
  deleteCommunityAdminGroup,
  fetchCommunityAdminGroups,
  updateCommunityAdminGroup,
  type CommunityAdminGroupItem,
  type CommunityAdminGroupMutationInput,
} from '../communityService';
import { formatCommunityCount, formatCommunityDateTime } from '../communityFormat';

export function CommunityGroupsPage() {
  const { t } = useTranslation();
  const [categoryId, setCategoryId] = useState('');
  const [groups, setGroups] = useState<CommunityAdminGroupItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editingGroup, setEditingGroup] = useState<CommunityAdminGroupItem | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const requestIdRef = useRef(0);

  const loadGroups = useCallback(async (requestedCategoryId: string) => {
    if (!requestedCategoryId) {
      setGroups([]);
      setIsLoading(false);
      return;
    }
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);
    try {
      const items = await fetchCommunityAdminGroups(requestedCategoryId);
      if (requestId !== requestIdRef.current) {
        return;
      }
      setGroups(items);
    } catch (loadError) {
      if (requestId === requestIdRef.current) {
        setError(
          resolveProblemMessage(
            loadError,
            t,
            t('admin.community.groups.error', 'Community groups could not be loaded'),
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
    void loadGroups(categoryId);
    return () => {
      requestIdRef.current += 1;
    };
  }, [loadGroups, categoryId]);

  const handleSaveGroup = async (input: CommunityAdminGroupMutationInput) => {
    setIsSaving(true);
    try {
      if (editingGroup) {
        await updateCommunityAdminGroup(categoryId, editingGroup.id, input);
      } else {
        await createCommunityAdminGroup(categoryId, input);
      }
      setIsCreateOpen(false);
      setIsEditOpen(false);
      setEditingGroup(null);
      await loadGroups(categoryId);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteGroup = async (group: CommunityAdminGroupItem) => {
    if (!confirmCommunityAction(
      t('admin.community.groups.deleteConfirm', 'Delete group "{{name}}"?', { name: group.name }),
    )) {
      return;
    }
    await deleteCommunityAdminGroup(categoryId, group.id);
    await loadGroups(categoryId);
  };

  if (!categoryId) {
    return (
      <CommunityAdminPageShell
        isLoading={false}
        error={null}
        onRefresh={() => void loadGroups(categoryId)}
        actions={(
          <>
            <CommunityCirclePicker value={categoryId} onChange={setCategoryId} />
            <button
              type="button"
              disabled
              className="inline-flex items-center gap-1 rounded-md bg-lobster-600 px-3 py-1.5 text-xs font-medium text-white opacity-40"
            >
              <Plus className="h-3.5 w-3.5" />
              {t('admin.community.groups.add', 'Create group')}
            </button>
          </>
        )}
      >
        <CommunityEmptyState title={t('admin.community.groups.pickCircle', 'Select a circle to manage its groups')} />
      </CommunityAdminPageShell>
    );
  }

  return (
    <CommunityAdminPageShell
      isLoading={isLoading}
      error={error}
      onRefresh={() => void loadGroups(categoryId)}
      actions={(
        <>
          <CommunityCirclePicker value={categoryId} onChange={setCategoryId} />
          <button
            type="button"
            disabled={!categoryId}
            onClick={() => {
              setEditingGroup(null);
              setIsCreateOpen(true);
            }}
            className="inline-flex items-center gap-1 rounded-md bg-lobster-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-lobster-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" />
            {t('admin.community.groups.add', 'Create group')}
          </button>
        </>
      )}
    >
      <CommunityTablePanel>
        {groups.length === 0 ? (
          <CommunityEmptyState title={t('admin.community.groups.empty', 'No groups in this circle')} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left dark:border-white/10">
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.community.groups.column.group', 'Group')}</th>
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.community.groups.column.platform', 'Platform')}</th>
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.community.groups.column.members', 'Members')}</th>
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.community.groups.column.qrCodes', 'QR codes')}</th>
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.community.groups.column.updated', 'Updated')}</th>
                <th className="px-4 py-2.5 text-right font-medium text-slate-500">{t('admin.community.groups.column.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <tr key={group.id} className="border-b border-slate-50 hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/5">
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-slate-900 dark:text-white">{group.name}</p>
                    {group.description ? (
                      <p className="max-w-72 truncate text-xs text-slate-400">{group.description}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                    {t(`admin.community.groups.platform.${group.platform.toLowerCase()}`, group.platform)}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                    {formatCommunityCount(group.memberCount)}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300">
                      <QrCode className="h-3.5 w-3.5" />
                      {group.qrCodes.length}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">
                    {formatCommunityDateTime(group.updatedAt)}
                  </td>
                  <td className="px-4 py-2.5">
                    <CommunityTableActions>
                      <CommunityIconActionButton
                        label={t('common.actions.edit', 'Edit')}
                        icon={<Pencil className="h-4 w-4" />}
                        onClick={() => {
                          setEditingGroup(group);
                          setIsEditOpen(true);
                        }}
                      />
                      <CommunityIconActionButton
                        label={t('common.actions.delete', 'Delete')}
                        icon={<Trash2 className="h-4 w-4" />}
                        tone="danger"
                        onClick={() => void handleDeleteGroup(group)}
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
        title={t('admin.community.groups.addTitle', 'Create group')}
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        footer={(
          <CommunityFormActions
            submitLabel={t('admin.community.groups.form.submit', 'Create group')}
            isSaving={isSaving}
            submitFormId="community-group-form"
            onCancel={() => setIsCreateOpen(false)}
          />
        )}
      >
        <GroupDrawerForm mode="create" onSubmit={handleSaveGroup} />
      </CommunityDrawer>

      <CommunityDrawer
        title={t('admin.community.groups.editTitle', 'Edit group')}
        description={editingGroup?.name}
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        footer={(
          <CommunityFormActions
            submitLabel={t('admin.community.groups.form.updateSubmit', 'Update group')}
            isSaving={isSaving}
            submitFormId="community-group-form"
            onCancel={() => setIsEditOpen(false)}
          />
        )}
      >
        <GroupDrawerForm
          mode="edit"
          initialValue={editingGroup}
          onSubmit={handleSaveGroup}
        />
      </CommunityDrawer>
    </CommunityAdminPageShell>
  );
}
