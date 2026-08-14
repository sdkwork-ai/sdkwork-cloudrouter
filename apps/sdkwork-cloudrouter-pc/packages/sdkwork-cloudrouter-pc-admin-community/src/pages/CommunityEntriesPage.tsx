import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Pin,
  PinOff,
  Star,
  StarOff,
  Trash2,
} from 'lucide-react';
import { BottomPagination, resolveProblemMessage } from '@sdkwork/cloudroutes-pc-commons';
import { CommunityAdminPageShell } from '../components/CommunityAdminPageShell';
import {
  CommunityEmptyState,
} from '../components/CommunityEmptyState';
import {
  CommunityIconActionButton,
  CommunityTableActions,
  CommunityTablePanel,
  communityPageLabel,
  confirmCommunityAction,
  hasNextCommunityPage,
} from '../components/CommunityPageControls';
import {
  deleteCommunityAdminEntry,
  fetchCommunityAdminEntries,
  setCommunityAdminEntryFeatured,
  setCommunityAdminEntryPinned,
  type CommunityAdminEntryItem,
  type CommunityAdminPageInfo,
} from '../communityService';
import {
  communityKindLabel,
  CommunityStatusBadge,
} from '../components/CommunityStatusBadge';
import { formatCommunityDateTime } from '../communityFormat';

type CommunityEntryKindFilterValue = 'all' | 'announcement' | 'discussion' | 'question' | 'resource' | 'service';
type CommunityEntryStateFilterValue = 'all' | 'approved' | 'pending-review' | 'flagged' | 'rejected' | 'draft';

const kindOptions: { value: CommunityEntryKindFilterValue; fallback: string }[] = [
  { value: 'all', fallback: 'All kinds' },
  { value: 'announcement', fallback: 'Announcement' },
  { value: 'discussion', fallback: 'Discussion' },
  { value: 'question', fallback: 'Question' },
  { value: 'resource', fallback: 'Resource' },
  { value: 'service', fallback: 'Service' },
];

const stateOptions: { value: CommunityEntryStateFilterValue; fallback: string }[] = [
  { value: 'all', fallback: 'All states' },
  { value: 'approved', fallback: 'Approved' },
  { value: 'pending-review', fallback: 'Pending review' },
  { value: 'flagged', fallback: 'Flagged' },
  { value: 'rejected', fallback: 'Rejected' },
  { value: 'draft', fallback: 'Draft' },
];

export function CommunityEntriesPage() {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<CommunityAdminEntryItem[]>([]);
  const [pageInfo, setPageInfo] = useState<CommunityAdminPageInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [kindFilter, setKindFilter] = useState<CommunityEntryKindFilterValue>('all');
  const [stateFilter, setStateFilter] = useState<CommunityEntryStateFilterValue>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const requestIdRef = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(searchQuery.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  const loadEntries = useCallback(async (requestedPage: number, requestedPageSize: number, requestedKind: CommunityEntryKindFilterValue, requestedState: CommunityEntryStateFilterValue, requestedQuery: string) => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchCommunityAdminEntries({
        page: requestedPage,
        pageSize: requestedPageSize,
        kind: requestedKind === 'all' ? undefined : requestedKind,
        reviewState: requestedState === 'all' ? undefined : requestedState,
        q: requestedQuery || undefined,
      });
      if (requestId !== requestIdRef.current) {
        return;
      }
      setEntries(result.items);
      setPageInfo(result.pageInfo);
    } catch (loadError) {
      if (requestId === requestIdRef.current) {
        setError(
          resolveProblemMessage(
            loadError,
            t,
            t('admin.community.entries.error', 'Community entries could not be loaded'),
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
    void loadEntries(page, pageSize, kindFilter, stateFilter, debouncedQuery);
    return () => {
      requestIdRef.current += 1;
    };
  }, [loadEntries, page, pageSize, kindFilter, stateFilter, debouncedQuery]);

  const refreshCurrent = () => void loadEntries(page, pageSize, kindFilter, stateFilter, debouncedQuery);

  const handleToggleFeatured = async (entry: CommunityAdminEntryItem) => {
    const updated = await setCommunityAdminEntryFeatured(entry.id, !entry.isFeatured);
    setEntries((current) => current.map((item) => (item.id === updated.id ? updated : item)));
  };

  const handleTogglePinned = async (entry: CommunityAdminEntryItem) => {
    const updated = await setCommunityAdminEntryPinned(entry.id, !entry.isPinned);
    setEntries((current) => current.map((item) => (item.id === updated.id ? updated : item)));
  };

  const handleDeleteEntry = async (entry: CommunityAdminEntryItem) => {
    if (!confirmCommunityAction(
      t('admin.community.entries.deleteConfirm', 'Delete entry "{{title}}"?', { title: entry.title }),
    )) {
      return;
    }
    await deleteCommunityAdminEntry(entry.id);
    await refreshCurrent();
  };

  const selectClassName = 'rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 dark:border-white/20 dark:bg-white/5 dark:text-slate-300';

  return (
    <CommunityAdminPageShell
      isLoading={isLoading}
      error={error}
      onRefresh={refreshCurrent}
      actions={(
        <input
          value={searchQuery}
          onChange={(event) => {
            setSearchQuery(event.target.value);
            setPage(1);
          }}
          placeholder={t('admin.community.entries.searchPlaceholder', 'Search entries...')}
          className="w-56 rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 dark:border-white/20 dark:bg-white/5 dark:text-slate-300"
        />
      )}
    >
      <div className="flex shrink-0 flex-wrap items-center gap-3">
        <select
          value={kindFilter}
          onChange={(event) => {
            setKindFilter(event.target.value as CommunityEntryKindFilterValue);
            setPage(1);
          }}
          className={selectClassName}
          aria-label={t('admin.community.entries.kindFilter', 'Filter by kind')}
        >
          {kindOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {t(`admin.community.kind.${option.value}`, option.fallback)}
            </option>
          ))}
        </select>
        <select
          value={stateFilter}
          onChange={(event) => {
            setStateFilter(event.target.value as CommunityEntryStateFilterValue);
            setPage(1);
          }}
          className={selectClassName}
          aria-label={t('admin.community.entries.stateFilter', 'Filter by review state')}
        >
          {stateOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {t(`admin.community.reviewState.${option.value}`, option.fallback)}
            </option>
          ))}
        </select>
        <span className="text-xs text-slate-400">
          {t('admin.community.entries.managementHint', 'All posts including drafts and rejected content.')}
        </span>
      </div>

      <CommunityTablePanel footer={(
        <BottomPagination
          disabled={isLoading}
          hasNextPage={hasNextCommunityPage(pageInfo, page, entries.length, pageSize)}
          itemCount={entries.length}
          nextLabel={t('common.pagination.next', 'Next page')}
          onNextPage={() => setPage((current) => current + 1)}
          onPageSizeChange={(nextPageSize) => {
            setPage(1);
            setPageSize(nextPageSize);
          }}
          onPreviousPage={() => setPage((current) => Math.max(1, current - 1))}
          page={page}
          pageLabel={communityPageLabel(t, page, pageInfo)}
          pageSize={pageSize}
          pageSizeLabel={t('common.pagination.rows', 'Rows')}
          pageSizeOptions={[20, 50, 100]}
          previousLabel={t('common.pagination.previous', 'Previous page')}
          showingLabel={t('common.pagination.showing', 'Showing')}
        />
      )}>
        {entries.length === 0 ? (
          <CommunityEmptyState title={t('admin.community.entries.empty', 'No entries match the current filters')} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left dark:border-white/10">
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.community.entries.column.title', 'Title')}</th>
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.community.entries.column.author', 'Author')}</th>
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.community.entries.column.kind', 'Kind')}</th>
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.community.entries.column.state', 'State')}</th>
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.community.entries.column.metrics', 'Views / Comments')}</th>
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.community.entries.column.updated', 'Updated')}</th>
                <th className="px-4 py-2.5 text-right font-medium text-slate-500">{t('admin.community.entries.column.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
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
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                    {entry.viewCount} / {entry.commentCount}
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">
                    {formatCommunityDateTime(entry.updatedAt)}
                  </td>
                  <td className="px-4 py-2.5">
                    <CommunityTableActions>
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
    </CommunityAdminPageShell>
  );
}
