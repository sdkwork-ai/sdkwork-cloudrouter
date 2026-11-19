import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ImagePlus, Loader2, Plus, Send, Settings2, Users } from 'lucide-react';

import { JoinCircleDialog } from '../components/JoinCircleDialog.tsx';
import { CommunityMediaImage } from '../components/CommunityMediaImage.tsx';
import { PostCard } from '../components/PostCard.tsx';
import {
  CircleAvatar,
  CommunityEmptyState,
  CommunityErrorState,
  CommunityPage,
  CommunitySpinner,
  CommunityTabs,
} from '../components/CommunityShell.tsx';
import { getCurrentAppSession } from '@sdkwork/cloudroutes-pc-commons/session-service';
import {
  CommunityService,
  ensureCommunityPcRuntime,
  resolveCommunityResourceUrl,
  uploadCommunityImages,
  type Community,
  type CommunityGroup,
  type CommunityMember,
  type MembershipTier,
  type Post,
  type Resource,
} from '../runtime.ts';

type StandardTab = 'feed' | 'resources' | 'members' | 'groups' | 'about';
type CustomTab = 'news' | 'docs' | 'repos' | 'software';
type Tab = StandardTab | CustomTab;
type ComposerSection = 'feed' | 'resources' | CustomTab;

const CUSTOM_TABS: readonly CustomTab[] = ['news', 'docs', 'repos', 'software'];
const DEFAULT_TABS: readonly StandardTab[] = ['feed', 'resources', 'groups'];

/**
 * Circle workspace: feed, resources, members, groups, custom tab feeds, and
 * the about panel. Owners reach the management workspace from the header;
 * paid circles open the order-backed join dialog.
 */
export function CommunityDetailPage() {
  const { t } = useTranslation();
  const { circleId = '' } = useParams<{ circleId: string }>();
  const navigate = useNavigate();
  const [circle, setCircle] = useState<Community | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [customPosts, setCustomPosts] = useState<Post[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [groups, setGroups] = useState<CommunityGroup[]>([]);
  const [tiers, setTiers] = useState<MembershipTier[]>([]);
  const [tab, setTab] = useState<Tab>('feed');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [composerSection, setComposerSection] = useState<ComposerSection>('feed');
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [resourceUrl, setResourceUrl] = useState('');
  const [resourceType, setResourceType] = useState('link');
  const [publishing, setPublishing] = useState(false);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const currentUserId = getCurrentAppSession()?.context?.userId;

  const load = useCallback(async () => {
    if (!circleId) {
      return;
    }
    ensureCommunityPcRuntime();
    setLoading(true);
    setError(false);
    try {
      const [loadedCircle, loadedTiers] = await Promise.all([
        CommunityService.getCommunityById(circleId),
        CommunityService.getMembershipTiers(circleId).catch(() => []),
      ]);
      if (!loadedCircle) {
        setCircle(null);
        return;
      }
      setCircle(loadedCircle);
      setTiers(loadedTiers);
      const [loadedPosts, loadedResources, loadedMembers, loadedGroups] = await Promise.all([
        CommunityService.getPostsByCommunity(circleId).catch(() => []),
        CommunityService.getResourcesByCommunity(circleId).catch(() => []),
        CommunityService.getMembersByCommunity(circleId).catch(() => []),
        CommunityService.getGroupsByCommunity(circleId).catch(() => []),
      ]);
      setPosts(loadedPosts);
      setResources(loadedResources);
      setMembers(loadedMembers);
      setGroups(loadedGroups);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [circleId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!circleId || !CUSTOM_TABS.includes(tab as CustomTab)) {
      setCustomPosts([]);
      return undefined;
    }
    let cancelled = false;
    void CommunityService.getPostsByCommunityTag(circleId, tab)
      .then((loaded) => {
        if (!cancelled) setCustomPosts(loaded);
      })
      .catch(() => {
        if (!cancelled) setCustomPosts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [circleId, tab]);

  // Keep the composer pointed at the tab the reader is looking at, so a post
  // never lands in a different tab than the one that was open.
  useEffect(() => {
    if (tab === 'feed' || tab === 'resources' || CUSTOM_TABS.includes(tab as CustomTab)) {
      setComposerSection(tab === 'feed' ? 'feed' : (tab as ComposerSection));
    }
  }, [tab]);

  const tabs = useMemo(() => {
    if (!circle) return [] as { id: Tab; label: string }[];
    const configured = circle.tabs?.length ? circle.tabs : [...DEFAULT_TABS];
    const allowed = new Set<string>(configured);
    const labels: Record<string, string> = {
      feeds: t('communityUi.feed'),
      resources: t('communityUi.resources'),
      groups: t('communityUi.groups'),
      news: t('communityUi.tabNews', 'News'),
      docs: t('communityUi.tabDocs', 'Docs'),
      repos: t('communityUi.tabRepos', 'Repositories'),
      software: t('communityUi.tabSoftware', 'Software'),
      members: t('communityUi.members'),
      about: t('communityUi.about'),
    };
    const ids: string[] = [];
    for (const id of ['feeds', 'resources', 'groups', 'news', 'docs', 'repos', 'software']) {
      if (allowed.has(id)) ids.push(id);
    }
    ids.push('members', 'about');
    return ids.map((id) => ({
      id: (id === 'feeds' ? 'feed' : id) as Tab,
      label: labels[id] ?? id,
    }));
  }, [circle, t]);

  const handleJoin = async () => {
    if (!circle) return;
    if (circle.isPaid) {
      setJoinOpen(true);
      return;
    }
    await CommunityService.joinCommunity(circle.id);
    await load();
  };

  const handleLeave = async () => {
    if (!circle || !window.confirm(t('communityUi.leaveConfirm'))) return;
    await CommunityService.leaveCommunity(circle.id);
    await load();
  };

  const handlePublish = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!circle || publishing) return;
    setPublishing(true);
    try {
      if (composerSection === 'resources') {
        if (!title.trim() || !resourceUrl.trim()) return;
        await CommunityService.createResource(circle.id, {
          title: title.trim(),
          url: resourceUrl.trim(),
          type: resourceType,
          description: content.trim(),
        });
        setTitle('');
        setResourceUrl('');
        setContent('');
        setResources(await CommunityService.getResourcesByCommunity(circle.id));
        setTab('resources');
      } else {
        const isCustom = CUSTOM_TABS.includes(composerSection as CustomTab);
        if (!content.trim() && files.length === 0) return;
        await CommunityService.createPost(circle.id, content.trim(), files, {
          ...(title.trim() ? { title: title.trim() } : {}),
          ...(isCustom ? { tags: [composerSection] } : {}),
        });
        setTitle('');
        setContent('');
        setFiles([]);
        if (isCustom) {
          setCustomPosts(await CommunityService.getPostsByCommunityTag(circle.id, composerSection));
        } else {
          setPosts(await CommunityService.getPostsByCommunity(circle.id));
        }
      }
    } finally {
      setPublishing(false);
    }
  };

  const handleLike = async (post: Post, fromCustomTab = false) => {
    if (!circle) return;
    await CommunityService.toggleLikePost(circle.id, post.id);
    const update = (current: Post[]) =>
      current.map((item) =>
        item.id === post.id
          ? { ...item, isLiked: !item.isLiked, likes: Math.max(0, item.likes + (item.isLiked ? -1 : 1)) }
          : item,
      );
    if (fromCustomTab) setCustomPosts(update);
    else setPosts(update);
  };

  const handleComment = async (post: Post, fromCustomTab = false) => {
    if (!circle) return;
    const text = (commentDrafts[post.id] ?? '').trim();
    if (!text) return;
    const created = await CommunityService.addComment(circle.id, post.id, text);
    const update = (current: Post[]) =>
      current.map((item) =>
        item.id === post.id
          ? { ...item, comments: item.comments + 1, commentsList: [...(item.commentsList ?? []), created] }
          : item,
      );
    if (fromCustomTab) setCustomPosts(update);
    else setPosts(update);
    setCommentDrafts((current) => ({ ...current, [post.id]: '' }));
  };

  const handleDeletePost = async (post: Post, fromCustomTab = false) => {
    if (!circle || !window.confirm(t('communityUi.deletePostConfirm', 'Delete this post?'))) return;
    await CommunityService.deletePost(circle.id, post.id);
    const remove = (current: Post[]) => current.filter((item) => item.id !== post.id);
    if (fromCustomTab) setCustomPosts(remove);
    else setPosts(remove);
  };

  if (loading) {
    return (
      <CommunityPage>
        <CommunitySpinner label={t('communityUi.loading')} />
      </CommunityPage>
    );
  }

  if (error) {
    return (
      <CommunityPage>
        <CommunityErrorState onRetry={() => void load()} />
      </CommunityPage>
    );
  }

  if (!circle) {
    return (
      <CommunityPage>
        <CommunityEmptyState
          title={t('communityUi.notFound')}
          action={
            <Link to="/community" className="rounded-xl bg-lobster-500 px-4 py-2 text-sm font-semibold text-white">
              {t('communityUi.back')}
            </Link>
          }
        />
      </CommunityPage>
    );
  }

  const isOwner = Boolean(currentUserId && circle.ownerId === currentUserId);
  const ownerName = members.find((member) => member.role === 'owner')?.name;
  const publishable = tab === 'feed'
    || tab === 'resources'
    || CUSTOM_TABS.includes(tab as CustomTab);
  const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-lobster-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white';

  return (
    <CommunityPage>
      <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="relative h-40 bg-slate-100 dark:bg-slate-800 sm:h-52">
          {circle.coverImage ? <img src={circle.coverImage} alt="" className="h-full w-full object-cover" /> : null}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 to-transparent" />
        </div>
        <div className="relative px-5 pb-5">
          <div className="-mt-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <CircleAvatar name={circle.name} src={circle.avatar} className="h-20 w-20 border-4 border-white dark:border-slate-900" />
              <div className="pb-1">
                <h1 className="text-2xl font-bold text-slate-950 dark:text-white">{circle.name}</h1>
                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                  {circle.memberCount} {t('communityUi.members')} · {circle.postCount} {t('communityUi.posts')}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {isOwner ? (
                <button type="button" onClick={() => navigate(`/community/${circle.id}/manage`)} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                  <Settings2 className="h-4 w-4" aria-hidden="true" />
                  {t('communityUi.manage')}
                </button>
              ) : null}
              {circle.isJoined ? (
                <button type="button" onClick={() => void handleLeave()} className="rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                  {t('communityUi.leave')}
                </button>
              ) : (
                <button type="button" onClick={() => void handleJoin()} className="rounded-xl bg-lobster-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-lobster-600">
                  {circle.isPaid && circle.price ? t('communityUi.joinPaid', { price: circle.price }) : t('communityUi.join')}
                </button>
              )}
            </div>
          </div>
          {circle.description ? <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">{circle.description}</p> : null}
          {circle.tags.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {circle.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">#{tag}</span>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <CommunityTabs active={tab} onChange={setTab} items={tabs} />

      {publishable ? (
        <form onSubmit={handlePublish} className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400" htmlFor="community-composer-section">
              {t('communityUi.publishTo', 'Publish to')}
            </label>
            <select
              id="community-composer-section"
              value={composerSection}
              onChange={(event) => setComposerSection(event.target.value as ComposerSection)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              <option value="feed">{t('communityUi.feed')}</option>
              <option value="news">{t('communityUi.tabNews', 'News')}</option>
              <option value="docs">{t('communityUi.tabDocs', 'Docs')}</option>
              <option value="repos">{t('communityUi.tabRepos', 'Repositories')}</option>
              <option value="software">{t('communityUi.tabSoftware', 'Software')}</option>
              <option value="resources">{t('communityUi.resources')}</option>
            </select>
          </div>
          {composerSection !== 'feed' ? (
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t('communityUi.titlePlaceholder', 'Title')}
              className={`${inputClass} mb-2`}
            />
          ) : null}
          {composerSection === 'resources' ? (
            <div className="mb-2 grid gap-2 sm:grid-cols-[2fr_1fr]">
              <input value={resourceUrl} onChange={(event) => setResourceUrl(event.target.value)} placeholder={t('communityUi.resourceUrl', 'Resource URL')} className={inputClass} />
              <select value={resourceType} onChange={(event) => setResourceType(event.target.value)} className={inputClass}>
                {['link', 'doc', 'pdf', 'video', 'repo', 'software'].map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
              <label className="text-xs text-slate-500 dark:text-slate-400 sm:col-span-2">
                {t('communityUi.uploadResource', 'Or upload a file')}
                <input
                  type="file"
                  className="mt-1 block w-full text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold dark:text-slate-400 dark:file:bg-slate-800 dark:file:text-slate-200"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    void uploadCommunityImages([file]).then(([uri]) => {
                      if (uri) setResourceUrl(uri);
                    });
                  }}
                />
              </label>
            </div>
          ) : null}
          <label className="sr-only" htmlFor="community-post-content">{t('communityUi.newPost')}</label>
          <textarea
            id="community-post-content"
            rows={3}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder={composerSection === 'resources' ? t('communityUi.resourceDesc', 'Resource description') : t('communityUi.postPlaceholder')}
            className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-lobster-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            {composerSection !== 'resources' ? (
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">
                <ImagePlus className="h-4 w-4" aria-hidden="true" />
                {files.length > 0 ? `${files.length} / 4` : t('communityUi.addImages')}
                <input type="file" accept="image/*" multiple className="sr-only" onChange={(event) => setFiles(Array.from(event.target.files ?? []).slice(0, 4))} />
              </label>
            ) : <span />}
            <button type="submit" disabled={publishing} className="inline-flex items-center gap-1.5 rounded-xl bg-lobster-500 px-4 py-2 text-sm font-semibold text-white hover:bg-lobster-600 disabled:opacity-50">
              {publishing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
              {publishing ? t('communityUi.publishing') : t('communityUi.publish')}
            </button>
          </div>
        </form>
      ) : null}

      {tab === 'feed' ? (
        <div className="space-y-4">
          {posts.length === 0 ? <CommunityEmptyState title={t('communityUi.noPosts')} /> : null}
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              detailHref={`/community/${circle.id}/post/${post.id}`}
              commentDraft={commentDrafts[post.id] ?? ''}
              onCommentDraftChange={(value) => setCommentDrafts((current) => ({ ...current, [post.id]: value }))}
              onLike={() => void handleLike(post)}
              onComment={() => void handleComment(post)}
              {...(post.authorId && post.authorId === currentUserId ? { onDelete: () => void handleDeletePost(post) } : {})}
            />
          ))}
        </div>
      ) : null}

      {CUSTOM_TABS.includes(tab as CustomTab) ? (
        <div className="space-y-4">
          {customPosts.length === 0 ? <CommunityEmptyState title={t('communityUi.emptyTab', 'No entries in this tab yet')} action={<button type="button" onClick={() => { setComposerSection(tab as CustomTab); setTab('feed'); }} className="inline-flex items-center gap-1.5 rounded-xl bg-lobster-500 px-4 py-2 text-sm font-semibold text-white"><Plus className="h-4 w-4" aria-hidden="true" />{t('communityUi.publish')}</button>} /> : null}
          {customPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              detailHref={`/community/${circle.id}/post/${post.id}`}
              commentDraft={commentDrafts[post.id] ?? ''}
              onCommentDraftChange={(value) => setCommentDrafts((current) => ({ ...current, [post.id]: value }))}
              onLike={() => void handleLike(post, true)}
              onComment={() => void handleComment(post, true)}
              {...(post.authorId && post.authorId === currentUserId ? { onDelete: () => void handleDeletePost(post, true) } : {})}
            />
          ))}
        </div>
      ) : null}

      {tab === 'resources' ? (
        <div className="space-y-3">
          {resources.length === 0 ? <CommunityEmptyState title={t('communityUi.noResources')} /> : null}
          {resources.map((resource) => (
            <a
              key={resource.id}
              href={resource.url}
              target="_blank"
              rel="noreferrer"
              onClick={(event) => {
                if (!resource.url.startsWith('drive://')) return;
                event.preventDefault();
                void resolveCommunityResourceUrl(resource.url).then((url) => {
                  if (url && typeof window !== 'undefined') {
                    window.open(url, '_blank', 'noopener,noreferrer');
                  }
                });
              }}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-lobster-300 dark:border-slate-800 dark:bg-slate-900"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium text-slate-900 dark:text-white">
                  {resource.title}
                  {resource.reviewState && resource.reviewState !== 'approved' ? (
                    <span className="ml-2 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                      {t('communityUi.pendingReview', 'Pending review')}
                    </span>
                  ) : null}
                </span>
                <span className="mt-0.5 block text-xs text-slate-400">{resource.type} · {t('communityUi.resourceBy', { name: resource.uploadedBy })}</span>
              </span>
              <span className="text-sm text-lobster-500">{resource.size ?? '↗'}</span>
            </a>
          ))}
        </div>
      ) : null}

      {tab === 'members' ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {members.length === 0 ? <CommunityEmptyState title={t('communityUi.noMembers')} /> : null}
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {members.map((member) => (
              <li key={member.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="flex min-w-0 items-center gap-3">
                  <CircleAvatar name={member.name} src={member.avatar} className="h-9 w-9" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-slate-900 dark:text-white">{member.name}</span>
                    <span className="block text-xs text-slate-400">{member.tierName ?? member.bio ?? ''}</span>
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2 text-xs">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600 dark:bg-slate-800 dark:text-slate-300">{member.role}</span>
                  <span className={`rounded-full px-2 py-0.5 ${member.status === 'active' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>{member.status}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {tab === 'groups' ? (
        <div className="space-y-3">
          {groups.length === 0 ? <CommunityEmptyState title={t('communityUi.noGroups')} /> : null}
          {groups.map((group) => (
            <div key={group.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-medium text-slate-900 dark:text-white">
                  <Users className="h-4 w-4 text-slate-400" aria-hidden="true" />
                  {group.name}
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">{group.platform}</span>
                </p>
                {group.description ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{group.description}</p> : null}
                <p className="mt-1 text-xs text-slate-400">{group.memberCount} {t('communityUi.members')}</p>
              </div>
              {(group.qrCodes ?? []).length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {(group.qrCodes ?? []).map((qr) => (
                    <CommunityMediaImage key={qr.url} uri={qr.url} alt={qr.description} className="h-24 w-24 rounded-lg border border-slate-200 object-cover dark:border-slate-700" />
                  ))}
                </div>
              ) : group.qrCodeUrl ? (
                <CommunityMediaImage uri={group.qrCodeUrl} alt={group.name} className="h-24 w-24 rounded-lg border border-slate-200 object-cover dark:border-slate-700" />
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {tab === 'about' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">{t('communityUi.about')}</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300">{circle.description || '—'}</p>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500 dark:text-slate-400">{t('communityUi.owner')}</dt>
                <dd className="font-medium text-slate-900 dark:text-white">{ownerName ?? '—'}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500 dark:text-slate-400">{t('communityUi.memberLimit')}</dt>
                <dd className="font-medium text-slate-900 dark:text-white">{circle.memberLimit ?? '∞'}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500 dark:text-slate-400">{t('communityUi.price')}</dt>
                <dd className="font-medium text-slate-900 dark:text-white">{circle.isPaid ? `¥${circle.price ?? 0}` : t('communityUi.free')}</dd>
              </div>
            </dl>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">{t('communityUi.tiers')}</h2>
            {tiers.length === 0 ? <p className="mt-2 text-sm text-slate-500">{t('communityUi.tiers')}: —</p> : null}
            <ul className="mt-3 space-y-2">
              {tiers.map((tier) => (
                <li key={tier.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5 text-sm dark:bg-slate-950/60">
                  <span>
                    <span className="block font-medium text-slate-900 dark:text-white">{tier.name}</span>
                    <span className="block text-xs text-slate-400">{tier.durationDays} {t('communityUi.tierDuration')}</span>
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-white">¥{tier.price}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      ) : null}

      <JoinCircleDialog
        circle={circle}
        open={joinOpen}
        tiers={tiers}
        onClose={() => setJoinOpen(false)}
        onJoined={() => {
          setJoinOpen(false);
          void load();
        }}
      />
    </CommunityPage>
  );
}
