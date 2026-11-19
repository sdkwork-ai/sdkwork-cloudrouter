import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Compass, Plus, Search, Sparkles } from 'lucide-react';

import {
  CommunityEmptyState,
  CommunityErrorState,
  CommunityPage,
  CommunityPageHeader,
  CommunitySpinner,
  CommunityTabs,
  CircleAvatar,
} from '../components/CommunityShell.tsx';
import { CommunityService, ensureCommunityPcRuntime, type Community } from '../runtime.ts';

type Scope = 'discover' | 'mine' | 'recommended';

function formatCount(value: number | undefined, suffix: string): string {
  return `${value ?? 0} ${suffix}`;
}

/**
 * Circle discovery workspace: search, scope tabs, and the circle card grid.
 * The "mine" scope uses the membership state the backend already returns on
 * each category, so no per-circle membership request is issued.
 */
export function CommunityHubPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const scope = normalizeScope(searchParams.get('scope'));
  const [communities, setCommunities] = useState<Community[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    ensureCommunityPcRuntime();
    setLoading(true);
    setError(false);
    try {
      setCommunities(await CommunityService.getCommunities());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return communities.filter((community) => {
      if (scope === 'mine' && !community.isJoined) return false;
      if (scope === 'recommended' && !community.isRecommended) return false;
      if (!normalized) return true;
      return (
        community.name.toLowerCase().includes(normalized)
        || community.description.toLowerCase().includes(normalized)
        || community.tags.some((tag) => tag.toLowerCase().includes(normalized))
      );
    });
  }, [communities, query, scope]);

  return (
    <CommunityPage>
      <CommunityPageHeader
        title={t('communityUi.title')}
        subtitle={t('communityUi.subtitle')}
        actions={
          <button
            type="button"
            onClick={() => navigate('/community/new')}
            className="inline-flex items-center gap-2 rounded-xl bg-lobster-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-lobster-600"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t('communityUi.create')}
          </button>
        }
      />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CommunityTabs
          active={scope}
          onChange={(next) => setSearchParams(next === 'discover' ? {} : { scope: next }, { replace: true })}
          items={[
            { id: 'discover', label: t('communityUi.discover') },
            { id: 'mine', label: t('communityUi.mine') },
            { id: 'recommended', label: t('communityUi.recommended') },
          ]}
        />
        <label className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus-within:border-lobster-400 dark:border-slate-700 dark:bg-slate-900 sm:w-72">
          <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
          <span className="sr-only">{t('communityUi.searchPlaceholder')}</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('communityUi.searchPlaceholder')}
            className="w-full bg-transparent text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
          />
        </label>
      </div>

      {loading ? <CommunitySpinner label={t('communityUi.loading')} /> : null}
      {!loading && error ? <CommunityErrorState onRetry={() => void load()} /> : null}
      {!loading && !error && visible.length === 0 ? (
        <CommunityEmptyState
          hint={t('communityUi.emptyHint')}
          title={t('communityUi.empty')}
          action={
            <button
              type="button"
              onClick={() => navigate('/community/new')}
              className="rounded-xl bg-lobster-500 px-4 py-2 text-sm font-semibold text-white hover:bg-lobster-600"
            >
              {t('communityUi.create')}
            </button>
          }
        />
      ) : null}
      {!loading && !error && visible.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((community) => (
            <Link
              key={community.id}
              to={`/community/${community.id}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-lobster-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="relative h-28 bg-slate-100 dark:bg-slate-800">
                {community.coverImage ? (
                  <img src={community.coverImage} alt="" className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <div className="flex h-full items-center justify-center bg-gradient-to-br from-lobster-500/15 to-amber-500/15">
                    <Compass className="h-7 w-7 text-lobster-500/70" aria-hidden="true" />
                  </div>
                )}
                {community.isRecommended ? (
                  <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-amber-600 shadow-sm dark:bg-slate-950/80">
                    <Sparkles className="h-3 w-3" aria-hidden="true" />
                    {t('communityUi.recommended')}
                  </span>
                ) : null}
              </div>
              <div className="flex flex-1 flex-col p-4">
                <div className="-mt-9 mb-2">
                  <CircleAvatar name={community.name} src={community.avatar} className="h-14 w-14 border-4 border-white dark:border-slate-900" />
                </div>
                <div className="flex items-start justify-between gap-2">
                  <h2 className="line-clamp-1 font-semibold text-slate-900 dark:text-white">{community.name}</h2>
                  {community.isJoined ? (
                    <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      {t('communityUi.joined')}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 line-clamp-2 flex-1 text-sm text-slate-500 dark:text-slate-400">
                  {community.description || t('communityUi.about')}
                </p>
                <div className="mt-3 flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
                  <span>{formatCount(community.memberCount, t('communityUi.members'))}</span>
                  <span>{formatCount(community.postCount, t('communityUi.posts'))}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : null}
    </CommunityPage>
  );
}

function normalizeScope(value: string | null): Scope {
  return value === 'mine' || value === 'recommended' ? value : 'discover';
}
