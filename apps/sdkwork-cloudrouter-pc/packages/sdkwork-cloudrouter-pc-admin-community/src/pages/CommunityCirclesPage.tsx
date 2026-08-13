import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Pencil,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { resolveProblemMessage } from '@sdkwork/cloudroutes-pc-commons';
import { CommunityAdminPageShell } from '../components/CommunityAdminPageShell';
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
import { CircleDrawerForm } from '../forms/CircleDrawerForm';
import {
  createCommunityAdminCategory,
  deleteCommunityAdminCategory,
  fetchCommunityAdminCategories,
  rebuildCommunityAdminRecommendations,
  updateCommunityAdminCategory,
  updateCommunityAdminCircle,
  type CommunityAdminCategoryCreateInput,
  type CommunityAdminCategoryItem,
  type CommunityAdminCircleUpdateInput,
} from '../communityService';
import { formatCommunityCount, formatCommunityMoney } from '../communityFormat';

export function CommunityCirclesPage() {
  const { t } = useTranslation();
  const [circles, setCircles] = useState<CommunityAdminCategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRebuilding, setIsRebuilding] = useState(false);
  const [editingCircle, setEditingCircle] = useState<CommunityAdminCategoryItem | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const requestIdRef = useRef(0);

  const loadCircles = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);
    try {
      const items = await fetchCommunityAdminCategories();
      if (requestId !== requestIdRef.current) {
        return;
      }
      setCircles(items);
    } catch (loadError) {
      if (requestId === requestIdRef.current) {
        setError(
          resolveProblemMessage(
            loadError,
            t,
            t('admin.community.circles.error', 'Circles could not be loaded'),
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
    void loadCircles();
    return () => {
      requestIdRef.current += 1;
    };
  }, [loadCircles]);

  const handleSaveCircle = async (
    input: CommunityAdminCategoryCreateInput,
    circle?: CommunityAdminCircleUpdateInput,
  ) => {
    setIsSaving(true);
    try {
      if (editingCircle) {
        await updateCommunityAdminCategory(editingCircle.id, input);
        await updateCommunityAdminCircle(editingCircle.id, circle ?? { title: input.title });
      } else {
        await createCommunityAdminCategory(input);
      }
      setIsCreateOpen(false);
      setIsEditOpen(false);
      setEditingCircle(null);
      await loadCircles();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCircle = async (circle: CommunityAdminCategoryItem) => {
    if (!confirmCommunityAction(
      t('admin.community.circles.deleteConfirm', 'Delete circle "{{name}}" and all of its content?', { name: circle.title }),
    )) {
      return;
    }
    await deleteCommunityAdminCategory(circle.id);
    await loadCircles();
  };

  const handleRebuildRecommendations = async () => {
    if (!confirmCommunityAction(
      t('admin.community.circles.rebuildConfirm', 'Rebuild the recommendation snapshot for all circles?'),
    )) {
      return;
    }
    setIsRebuilding(true);
    try {
      await rebuildCommunityAdminRecommendations();
    } finally {
      setIsRebuilding(false);
    }
  };

  return (
    <CommunityAdminPageShell
      isLoading={isLoading}
      error={error}
      onRefresh={() => void loadCircles()}
      actions={(
        <>
          <button
            type="button"
            onClick={() => void handleRebuildRecommendations()}
            disabled={isRebuilding}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRebuilding ? 'animate-spin' : ''}`} />
            {t('admin.community.circles.rebuild', 'Rebuild recommendations')}
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingCircle(null);
              setIsCreateOpen(true);
            }}
            className="inline-flex items-center gap-1 rounded-md bg-lobster-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-lobster-700"
          >
            <Plus className="h-3.5 w-3.5" />
            {t('admin.community.circles.add', 'Create circle')}
          </button>
        </>
      )}
    >
      <CommunityTablePanel>
        {circles.length === 0 ? (
          <CommunityEmptyState title={t('admin.community.circles.empty', 'No circles yet')} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left dark:border-white/10">
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.community.circles.column.circle', 'Circle')}</th>
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.community.circles.column.slug', 'Slug')}</th>
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.community.circles.column.members', 'Members')}</th>
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.community.circles.column.posts', 'Posts')}</th>
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.community.circles.column.monetize', 'Monetization')}</th>
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.community.circles.column.status', 'Status')}</th>
                <th className="px-4 py-2.5 text-right font-medium text-slate-500">{t('admin.community.circles.column.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {circles.map((circle) => (
                <tr key={circle.id} className="border-b border-slate-50 hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/5">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      {circle.avatar ? (
                        <img src={circle.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
                      ) : (
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-lobster-100 text-xs font-semibold text-lobster-700 dark:bg-lobster-500/10 dark:text-lobster-300">
                          {circle.title.slice(0, 1).toUpperCase()}
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900 dark:text-white">{circle.title}</p>
                        {circle.isRecommended ? (
                          <span className="inline-flex items-center gap-1 text-xs text-lobster-600 dark:text-lobster-300">
                            <Sparkles className="h-3 w-3" />
                            {t('admin.community.circles.recommended', 'Recommended')}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">{circle.slug}</td>
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                    {formatCommunityCount(circle.memberCount)}
                    {circle.memberLimit ? ` / ${formatCommunityCount(circle.memberLimit)}` : ''}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                    {formatCommunityCount(circle.postCount)}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                    {circle.isPaid
                      ? `${t('admin.community.circles.paid', 'Paid')} ${formatCommunityMoney(circle.price)}`
                      : t('admin.community.circles.free', 'Free')}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${circle.enabled
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                      : 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400'}`}
                    >
                      {circle.enabled
                        ? t('admin.community.status.enabled', 'Enabled')
                        : t('admin.community.status.disabled', 'Disabled')}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <CommunityTableActions>
                      <CommunityIconActionButton
                        label={t('common.actions.edit', 'Edit')}
                        icon={<Pencil className="h-4 w-4" />}
                        onClick={() => {
                          setEditingCircle(circle);
                          setIsEditOpen(true);
                        }}
                      />
                      <CommunityIconActionButton
                        label={t('common.actions.delete', 'Delete')}
                        icon={<Trash2 className="h-4 w-4" />}
                        tone="danger"
                        onClick={() => void handleDeleteCircle(circle)}
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
        title={t('admin.community.circles.addTitle', 'Create circle')}
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        footer={(
          <CommunityFormActions
            submitLabel={t('admin.community.circles.form.submit', 'Create circle')}
            isSaving={isSaving}
            submitFormId="community-circle-form"
            onCancel={() => setIsCreateOpen(false)}
          />
        )}
      >
        <CircleDrawerForm mode="create" onSubmit={(input) => handleSaveCircle(input)} />
      </CommunityDrawer>

      <CommunityDrawer
        title={t('admin.community.circles.editTitle', 'Edit circle')}
        description={editingCircle?.title}
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        footer={(
          <CommunityFormActions
            submitLabel={t('admin.community.circles.form.updateSubmit', 'Update circle')}
            isSaving={isSaving}
            submitFormId="community-circle-form"
            onCancel={() => setIsEditOpen(false)}
          />
        )}
      >
        <CircleDrawerForm
          mode="edit"
          initialValue={editingCircle}
          onSubmit={(input, circle) => handleSaveCircle(input, circle)}
        />
      </CommunityDrawer>
    </CommunityAdminPageShell>
  );
}
