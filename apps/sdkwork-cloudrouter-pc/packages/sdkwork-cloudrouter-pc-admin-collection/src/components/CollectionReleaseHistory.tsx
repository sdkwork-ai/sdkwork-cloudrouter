import { useEffect, useState } from 'react';
import { History, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { resolveProblemMessage } from '@sdkwork/cloudroutes-pc-commons';
import {
  CollectionService,
  type AdminCollectionRelease,
  type CollectionPageInfo,
} from '../collectionService';
import { formatDateTime, releaseStatusLabel } from '../collectionUi';

export interface CollectionReleaseHistoryProps {
  collectionId: string;
}

/**
 * Publish release history for one collection.
 *
 * Releases are immutable snapshots created by `updateCollectionStatus`; the
 * drawer lists them newest-first, a page at a time, so a long-lived collection
 * does not load an unbounded history into the editor.
 */
export function CollectionReleaseHistory({ collectionId }: CollectionReleaseHistoryProps) {
  const { t, i18n } = useTranslation();
  const [releases, setReleases] = useState<AdminCollectionRelease[]>([]);
  const [pageInfo, setPageInfo] = useState<CollectionPageInfo | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    void CollectionService.listCollectionReleases(collectionId, { page, pageSize: 10 })
      .then((result) => {
        if (!active) {
          return;
        }
        setPageInfo(result.pageInfo);
        setReleases((current) => {
          if (page === 1) {
            return result.items;
          }
          // A concurrent publish shifts the offset window; keep the list a
          // set keyed by release id instead of rendering duplicates.
          const seen = new Set(current.map((release) => release.id));
          return [...current, ...result.items.filter((release) => !seen.has(release.id))];
        });
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(resolveProblemMessage(
            loadError,
            t,
            t('admin.collections.releases.errors.load', 'Failed to load publish releases'),
          ));
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [collectionId, page, refreshToken, t]);

  const reload = () => {
    setPage(1);
    setRefreshToken((value) => value + 1);
  };

  return (
    <section data-admin-collection-releases className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
          <History className="h-4 w-4 text-lobster-500" />
          {t('admin.collections.releases.title', 'Publish releases')}
          {(pageInfo?.totalItems ?? releases.length) > 0 ? (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300">
              {pageInfo?.totalItems ?? releases.length}
            </span>
          ) : null}
        </h3>
        <button
          type="button"
          onClick={reload}
          disabled={loading}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          {t('admin.collections.actions.refresh', 'Refresh')}
        </button>
      </div>

      {loading && releases.length === 0 ? (
        <p className="rounded-lg border border-slate-200 px-3 py-3 text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
          {t('admin.collections.releases.loading', 'Loading releases...')}
        </p>
      ) : error && releases.length === 0 ? (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </p>
      ) : releases.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 px-3 py-3 text-xs text-slate-500 dark:border-white/15 dark:text-slate-400">
          {t('admin.collections.releases.empty', 'This collection has not been published yet.')}
        </p>
      ) : (
        <>
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-white/5 dark:border-white/10">
            {releases.map((release) => (
              <li key={release.id} data-admin-collection-release className="flex flex-wrap items-center gap-3 px-3 py-2">
                <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-700 dark:bg-white/10 dark:text-slate-200">
                  #{release.releaseNo}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-semibold text-slate-800 dark:text-slate-100">
                    {release.name || `#${release.releaseNo}`}
                  </div>
                  <div className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">
                    {release.notes || t('admin.collections.releases.notesEmpty', 'No release notes')}
                  </div>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {t('admin.collections.releases.itemCount', {
                    total: Number(release.itemCount),
                    defaultValue: '{{total}} items',
                  })}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {releaseStatusLabel(t, release.releaseStatus)}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {formatDateTime(release.publishedAt, i18n.language)}
                </span>
              </li>
            ))}
          </ul>
          {error ? (
            <p role="alert" className="text-xs text-red-600 dark:text-red-300">{error}</p>
          ) : null}
          {pageInfo?.hasNextPage ? (
            <button
              type="button"
              data-admin-collection-releases-more
              onClick={() => setPage((current) => current + 1)}
              disabled={loading}
              className="self-center rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
            >
              {loading
                ? t('admin.collections.releases.loadingMore', 'Loading...')
                : t('admin.collections.releases.loadMore', 'Load more releases')}
            </button>
          ) : null}
        </>
      )}
    </section>
  );
}
