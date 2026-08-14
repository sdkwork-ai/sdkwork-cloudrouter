import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckSquare,
  Pin,
  PinOff,
  Star,
  StarOff,
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
import { ModerationDrawerForm } from '../forms/ModerationDrawerForm';
import {
  deleteCommunityAdminEntry,
  fetchCommunityAdminModerationQueue,
  setCommunityAdminEntryFeatured,
  setCommunityAdminEntryPinned,
  updateCommunityAdminModeration,
  type CommunityAdminEntryItem,
  type CommunityAdminModerationInput,
} from '../communityService';
import {
  communityKindLabel,
  CommunityStatusBadge,
} from '../components/CommunityStatusBadge';
import { formatCommunityDateTime } from '../communityFormat';

export function CommunityModerationPage() {
  const { t } = useTranslation();
  const [queue, setQueue] = useState<CommunityAdminEntryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [reviewingEntry, setReviewingEntry] = useState<CommunityAdminEntryItem | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const requestIdRef = useRef(0);

  const loadQueue = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);
    try {
      const items = await fetchCommunityAdminModerationQueue();
      if (requestId !== requestIdRef.current) {
        return;
      }
      setQueue(items);
    } catch (loadError) {
      if (requestId === requestIdRef.current) {
        setError(
          resolveProblemMessage(
            loadError,
            t,
            t('admin.community.moderation.error', 'Moderation queue could not be loaded'),
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
    void loadQueue();
    return () => {
      requestIdRef.current += 1;
    };
  }, [loadQueue]);

  const handleModerate = async (input: CommunityAdminModerationInput) => {
    if (!reviewingEntry) {
      return;
    }
    setIsSaving(true);
    try {
      await updateCommunityAdminModeration(reviewingEntry.id, input);
      setIsReviewOpen(false);
      setReviewingEntry(null);
      await loadQueue();
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleFeatured = async (entry: CommunityAdminEntryItem) => {
    const updated = await setCommunityAdminEntryFeatured(entry.id, !entry.isFeatured);
    setQueue((current) => current.map((item) => (item.id === updated.id ? updated : item)));
  };

  const handleTogglePinned = async (entry: CommunityAdminEntryItem) => {
    const updated = await setCommunityAdminEntryPinned(entry.id, !entry.isPinned);
    setQueue((current) => current.map((item) => (item.id === updated.id ? updated : item)));
  };

  const handleDeleteEntry = async (entry: CommunityAdminEntryItem) => {
    if (!confirmCommunityAction(
      t('admin.community.moderation.deleteConfirm', 'Delete entry "{{title}}"?', { title: entry.title }),
    )) {
      return;
    }
    await deleteCommunityAdminEntry(entry.id);
    await loadQueue();
  };

  return (
    <CommunityAdminPageShell
      isLoading={isLoading}
      error={error}
      onRefresh={() => void loadQueue()}
    >
      <div className="flex shrink-0 items-center justify-between gap-3">
        <span className="text-xs text-slate-400">
          {t('admin.community.moderation.queueHint', 'Posts waiting for a moderation decision.')}
        </span>
      </div>

      <CommunityTablePanel>
        {queue.length === 0 ? (
          <CommunityEmptyState title={t('admin.community.moderation.empty', 'The moderation queue is empty')} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left dark:border-white/10">
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.community.moderation.column.title', 'Title')}</th>
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.community.moderation.column.author', 'Author')}</th>
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.community.moderation.column.kind', 'Kind')}</th>
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.community.moderation.column.state', 'State')}</th>
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.community.moderation.column.updated', 'Submitted')}</th>
                <th className="px-4 py-2.5 text-right font-medium text-slate-500">{t('admin.community.moderation.column.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((entry) => (
                <tr key={entry.id} className="border-b border-slate-50 hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/5">
                  <td className="max-w-72 px-4 py-2.5">
                    <p className="truncate font-medium text-slate-900 dark:text-white">
                      {entry.isPinned ? <Pin className="mr-1 inline h-3.5 w-3.5 text-lobster-500" /> : null}
                      {entry.isFeatured ? <Star className="mr-1 inline h-3.5 w-3.5 text-lobster-500" /> : null}
                      {entry.title}
                    </p>
                    {entry.categoryLabel ? (
                      <p className="truncate text-xs text-slate-400">{entry.categoryLabel}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{entry.authorName}</td>
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                    {communityKindLabel(entry.kind, t)}
                  </td>
                  <td className="px-4 py-2.5">
                    <CommunityStatusBadge status={entry.reviewState} />
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">
                    {formatCommunityDateTime(entry.updatedAt)}
                  </td>
                  <td className="px-4 py-2.5">
                    <CommunityTableActions>
                      <CommunityIconActionButton
                        label={t('admin.community.moderation.review', 'Review')}
                        icon={<CheckSquare className="h-4 w-4" />}
                        onClick={() => {
                          setReviewingEntry(entry);
                          setIsReviewOpen(true);
                        }}
                      />
                      <CommunityIconActionButton
                        label={entry.isFeatured
                          ? t('admin.community.entries.unfeature', 'Remove featured')
                          : t('admin.community.entries.feature', 'Mark featured')}
                        icon={entry.isFeatured ? <StarOff className="h-4 w-4" /> : <Star className="h-4 w-4" />}
                        onClick={() => void handleToggleFeatured(entry)}
                      />
                      <CommunityIconActionButton
                        label={entry.isPinned
                          ? t('admin.community.entries.unpin', 'Unpin')
                          : t('admin.community.entries.pin', 'Pin')}
                        icon={entry.isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                        onClick={() => void handleTogglePinned(entry)}
                      />
                      <CommunityIconActionButton
                        label={t('common.actions.delete', 'Delete')}
                        icon={<Trash2 className="h-4 w-4" />}
                        tone="danger"
                        onClick={() => void handleDeleteEntry(entry)}
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
        title={t('admin.community.moderation.reviewTitle', 'Review entry')}
        description={reviewingEntry?.title}
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        footer={(
          <CommunityFormActions
            submitLabel={t('admin.community.moderation.form.submit', 'Apply decision')}
            isSaving={isSaving}
            submitFormId="community-moderation-form"
            onCancel={() => setIsReviewOpen(false)}
          />
        )}
      >
        {reviewingEntry ? (
          <ModerationDrawerForm initialValue={reviewingEntry} onSubmit={handleModerate} />
        ) : null}
      </CommunityDrawer>
    </CommunityAdminPageShell>
  );
}
