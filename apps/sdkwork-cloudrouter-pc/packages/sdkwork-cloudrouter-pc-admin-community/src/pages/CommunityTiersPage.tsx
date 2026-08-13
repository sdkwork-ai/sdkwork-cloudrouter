import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
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
import { TierDrawerForm } from '../forms/TierDrawerForm';
import {
  createCommunityAdminTier,
  deleteCommunityAdminTier,
  fetchCommunityAdminTiers,
  publishCommunityAdminTier,
  unpublishCommunityAdminTier,
  updateCommunityAdminTier,
  type CommunityAdminTierItem,
  type CommunityAdminTierMutationInput,
} from '../communityService';
import { formatCommunityMoney } from '../communityFormat';

export function CommunityTiersPage() {
  const { t } = useTranslation();
  const [categoryId, setCategoryId] = useState('');
  const [tiers, setTiers] = useState<CommunityAdminTierItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editingTier, setEditingTier] = useState<CommunityAdminTierItem | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const requestIdRef = useRef(0);

  const loadTiers = useCallback(async (requestedCategoryId: string) => {
    if (!requestedCategoryId) {
      setTiers([]);
      setIsLoading(false);
      return;
    }
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);
    try {
      const items = await fetchCommunityAdminTiers(requestedCategoryId);
      if (requestId !== requestIdRef.current) {
        return;
      }
      setTiers(items);
    } catch (loadError) {
      if (requestId === requestIdRef.current) {
        setError(
          resolveProblemMessage(
            loadError,
            t,
            t('admin.community.tiers.error', 'Membership tiers could not be loaded'),
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
    void loadTiers(categoryId);
    return () => {
      requestIdRef.current += 1;
    };
  }, [loadTiers, categoryId]);

  const handleSaveTier = async (input: CommunityAdminTierMutationInput) => {
    setIsSaving(true);
    try {
      if (editingTier) {
        await updateCommunityAdminTier(categoryId, editingTier.id, input);
      } else {
        await createCommunityAdminTier(categoryId, input);
      }
      setIsCreateOpen(false);
      setIsEditOpen(false);
      setEditingTier(null);
      await loadTiers(categoryId);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTier = async (tier: CommunityAdminTierItem) => {
    if (!confirmCommunityAction(
      t('admin.community.tiers.deleteConfirm', 'Delete tier "{{name}}"?', { name: tier.name }),
    )) {
      return;
    }
    await deleteCommunityAdminTier(categoryId, tier.id);
    await loadTiers(categoryId);
  };

  const handlePublish = async (tier: CommunityAdminTierItem) => {
    const updated = await publishCommunityAdminTier(categoryId, tier.id);
    setTiers((current) => current.map((item) => (item.id === updated.id ? updated : item)));
  };

  const handleUnpublish = async (tier: CommunityAdminTierItem) => {
    const updated = await unpublishCommunityAdminTier(categoryId, tier.id);
    setTiers((current) => current.map((item) => (item.id === updated.id ? updated : item)));
  };

  if (!categoryId) {
    return (
      <CommunityAdminPageShell
        isLoading={false}
        error={null}
        onRefresh={() => void loadTiers(categoryId)}
        actions={(
          <>
            <CommunityCirclePicker value={categoryId} onChange={setCategoryId} />
            <button
              type="button"
              disabled
              className="inline-flex items-center gap-1 rounded-md bg-lobster-600 px-3 py-1.5 text-xs font-medium text-white opacity-40"
            >
              <Plus className="h-3.5 w-3.5" />
              {t('admin.community.tiers.add', 'Create tier')}
            </button>
          </>
        )}
      >
        <CommunityEmptyState title={t('admin.community.tiers.pickCircle', 'Select a circle to manage its membership tiers')} />
      </CommunityAdminPageShell>
    );
  }

  return (
    <CommunityAdminPageShell
      isLoading={isLoading}
      error={error}
      onRefresh={() => void loadTiers(categoryId)}
      actions={(
        <>
          <CommunityCirclePicker value={categoryId} onChange={setCategoryId} />
          <button
            type="button"
            disabled={!categoryId}
            onClick={() => {
              setEditingTier(null);
              setIsCreateOpen(true);
            }}
            className="inline-flex items-center gap-1 rounded-md bg-lobster-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-lobster-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" />
            {t('admin.community.tiers.add', 'Create tier')}
          </button>
        </>
      )}
    >
      <div className="flex shrink-0 items-center justify-between gap-3">
        <span className="text-xs text-slate-400">
          {t('admin.community.tiers.monetizeHint', 'Paid membership tiers. Publishing registers the tier with the circle commerce catalog.')}
        </span>
      </div>

      <CommunityTablePanel>
        {tiers.length === 0 ? (
          <CommunityEmptyState title={t('admin.community.tiers.empty', 'No tiers in this circle')} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left dark:border-white/10">
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.community.tiers.column.tier', 'Tier')}</th>
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.community.tiers.column.price', 'Price')}</th>
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.community.tiers.column.duration', 'Duration')}</th>
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.community.tiers.column.benefits', 'Benefits')}</th>
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.community.tiers.column.sort', 'Sort')}</th>
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.community.tiers.column.status', 'Status')}</th>
                <th className="px-4 py-2.5 text-right font-medium text-slate-500">{t('admin.community.tiers.column.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {tiers.map((tier) => (
                <tr key={tier.id} className="border-b border-slate-50 hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/5">
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-slate-900 dark:text-white">{tier.name}</p>
                    {tier.description ? (
                      <p className="max-w-72 truncate text-xs text-slate-400">{tier.description}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                    {formatCommunityMoney(tier.price)}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                    {tier.durationDays === '36500'
                      ? t('admin.community.tiers.lifetime', 'Lifetime')
                      : `${tier.durationDays} ${t('admin.community.tiers.days', 'days')}`}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{tier.benefits.length}</td>
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{tier.sortOrder}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${tier.enabled
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                      : 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400'}`}
                    >
                      {tier.enabled
                        ? t('admin.community.tiers.published', 'Published')
                        : t('admin.community.tiers.draft', 'Draft')}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <CommunityTableActions>
                      {tier.enabled ? (
                        <CommunityIconActionButton
                          label={t('admin.community.tiers.unpublish', 'Unpublish')}
                          icon={<ArrowDownToLine className="h-4 w-4" />}
                          onClick={() => void handleUnpublish(tier)}
                        />
                      ) : (
                        <CommunityIconActionButton
                          label={t('admin.community.tiers.publish', 'Publish')}
                          icon={<ArrowUpFromLine className="h-4 w-4" />}
                          onClick={() => void handlePublish(tier)}
                        />
                      )}
                      <CommunityIconActionButton
                        label={t('common.actions.edit', 'Edit')}
                        icon={<Pencil className="h-4 w-4" />}
                        onClick={() => {
                          setEditingTier(tier);
                          setIsEditOpen(true);
                        }}
                      />
                      <CommunityIconActionButton
                        label={t('common.actions.delete', 'Delete')}
                        icon={<Trash2 className="h-4 w-4" />}
                        tone="danger"
                        onClick={() => void handleDeleteTier(tier)}
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
        title={t('admin.community.tiers.addTitle', 'Create tier')}
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        footer={(
          <CommunityFormActions
            submitLabel={t('admin.community.tiers.form.submit', 'Create tier')}
            isSaving={isSaving}
            submitFormId="community-tier-form"
            onCancel={() => setIsCreateOpen(false)}
          />
        )}
      >
        <TierDrawerForm mode="create" onSubmit={handleSaveTier} />
      </CommunityDrawer>

      <CommunityDrawer
        title={t('admin.community.tiers.editTitle', 'Edit tier')}
        description={editingTier?.name}
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        footer={(
          <CommunityFormActions
            submitLabel={t('admin.community.tiers.form.updateSubmit', 'Update tier')}
            isSaving={isSaving}
            submitFormId="community-tier-form"
            onCancel={() => setIsEditOpen(false)}
          />
        )}
      >
        <TierDrawerForm
          mode="edit"
          initialValue={editingTier}
          onSubmit={handleSaveTier}
        />
      </CommunityDrawer>
    </CommunityAdminPageShell>
  );
}
