import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Heart, ImagePlus, Loader2, MessageCircle, Send, Settings2, Users } from 'lucide-react';

import { JoinCircleDialog } from '../components/JoinCircleDialog.tsx';
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
  type Community,
  type CommunityGroup,
  type CommunityMember,
  type MembershipTier,
  type Post,
  type Resource,
} from '../runtime.ts';

type Tab = 'feed' | 'resources' | 'members' | 'groups' | 'about';

/**
 * Circle workspace: feed, resources, members, groups, and the about panel.
 * Owners reach the management workspace from the header; paid circles open the
 * order-backed join dialog.
 */
export function CommunityDetailPage() {
  const { t } = useTranslation();
  const { circleId = '' } = useParams<{ circleId: string }>();
  const navigate = useNavigate();
  const [circle, setCircle] = useState<Community | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [groups, setGroups] = useState<CommunityGroup[]>([]);
  const [tiers, setTiers] = useState<MembershipTier[]>([]);
  const [tab, setTab] = useState<Tab>('feed');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
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
    if (!circle || !content.trim() || publishing) return;
    setPublishing(true);
    try {
      const created = await CommunityService.createPost(circle.id, content.trim(), files);
      setPosts((current) => [created, ...current]);
      setContent('');
      setFiles([]);
    } finally {
      setPublishing(false);
    }
  };

  const handleLike = async (post: Post) => {
    if (!circle) return;
    await CommunityService.toggleLikePost(circle.id, post.id);
    setPosts((current) =>
      current.map((item) =>
        item.id === post.id
          ? { ...item, isLiked: !item.isLiked, likes: Math.max(0, item.likes + (item.isLiked ? -1 : 1)) }
          : item,
      ),
    );
  };

  const handleComment = async (post: Post) => {
    if (!circle) return;
    const text = (commentDrafts[post.id] ?? '').trim();
    if (!text) return;
    const created = await CommunityService.addComment(circle.id, post.id, text);
    setPosts((current) =>
      current.map((item) =>
        item.id === post.id
          ? { ...item, comments: item.comments + 1, commentsList: [...(item.commentsList ?? []), created] }
          : item,
      ),
    );
    setCommentDrafts((current) => ({ ...current, [post.id]: '' }));
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
  const memberName = members.find((member) => member.role === 'owner')?.name;

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

      <CommunityTabs
        active={tab}
        onChange={setTab}
        items={[
          { id: 'feed', label: t('communityUi.feed') },
          { id: 'resources', label: t('communityUi.resources') },
          { id: 'members', label: t('communityUi.members') },
          { id: 'groups', label: t('communityUi.groups') },
          { id: 'about', label: t('communityUi.about') },
        ]}
      />

      {tab === 'feed' ? (
        <div className="space-y-4">
          <form onSubmit={handlePublish} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <label className="sr-only" htmlFor="community-post-content">{t('communityUi.newPost')}</label>
            <textarea
              id="community-post-content"
              rows={3}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder={t('communityUi.postPlaceholder')}
              className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-lobster-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">
                <ImagePlus className="h-4 w-4" aria-hidden="true" />
                {files.length > 0 ? `${files.length} / 4` : t('communityUi.cover')}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={(event) => setFiles(Array.from(event.target.files ?? []).slice(0, 4))}
                />
              </label>
              <button type="submit" disabled={publishing || !content.trim()} className="inline-flex items-center gap-1.5 rounded-xl bg-lobster-500 px-4 py-2 text-sm font-semibold text-white hover:bg-lobster-600 disabled:opacity-50">
                {publishing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
                {publishing ? t('communityUi.publishing') : t('communityUi.publish')}
              </button>
            </div>
          </form>

          {posts.length === 0 ? <CommunityEmptyState title={t('communityUi.noPosts')} /> : null}
          {posts.map((post) => (
            <article key={post.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <header className="flex items-center gap-3">
                <CircleAvatar name={post.authorName} src={post.authorAvatar} className="h-10 w-10" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{post.authorName || t('communityUi.member')}</p>
                  <p className="text-xs text-slate-400">{formatDateTime(post.createdAt)}</p>
                </div>
              </header>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-200">{post.content}</p>
              {post.images && post.images.length > 0 ? (
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {post.images.map((image) => (
                    <img key={image} src={image} alt="" className="h-32 w-full rounded-lg object-cover" loading="lazy" />
                  ))}
                </div>
              ) : null}
              <div className="mt-4 flex items-center gap-4 border-t border-slate-100 pt-3 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <button type="button" onClick={() => void handleLike(post)} className={`inline-flex items-center gap-1.5 hover:text-lobster-500 ${post.isLiked ? 'text-lobster-500' : ''}`} aria-pressed={post.isLiked}>
                  <Heart className={`h-4 w-4 ${post.isLiked ? 'fill-current' : ''}`} aria-hidden="true" />
                  {post.likes}
                </button>
                <span className="inline-flex items-center gap-1.5">
                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                  {post.comments}
                </span>
              </div>
              {(post.commentsList ?? []).length > 0 ? (
                <ul className="mt-3 space-y-2 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-950/60">
                  {(post.commentsList ?? []).map((comment) => (
                    <li key={comment.id}>
                      <span className="font-medium text-slate-700 dark:text-slate-200">{comment.authorName}: </span>
                      <span className="text-slate-600 dark:text-slate-300">{comment.content}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="mt-3 flex gap-2">
                <label className="sr-only" htmlFor={`comment-${post.id}`}>{t('communityUi.commentPlaceholder')}</label>
                <input
                  id={`comment-${post.id}`}
                  value={commentDrafts[post.id] ?? ''}
                  onChange={(event) => setCommentDrafts((current) => ({ ...current, [post.id]: event.target.value }))}
                  placeholder={t('communityUi.commentPlaceholder')}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
                <button type="button" onClick={() => void handleComment(post)} className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white dark:bg-white dark:text-slate-900">
                  {t('communityUi.comment')}
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {tab === 'resources' ? (
        <div className="space-y-3">
          {resources.length === 0 ? <CommunityEmptyState title={t('communityUi.noResources')} /> : null}
          {resources.map((resource) => (
            <a key={resource.id} href={resource.url} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-lobster-300 dark:border-slate-800 dark:bg-slate-900">
              <span className="min-w-0">
                <span className="block truncate font-medium text-slate-900 dark:text-white">{resource.title}</span>
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
                    <img key={qr.url} src={qr.url} alt={qr.description} className="h-24 w-24 rounded-lg border border-slate-200 object-cover dark:border-slate-700" loading="lazy" />
                  ))}
                </div>
              ) : group.qrCodeUrl ? (
                <img src={group.qrCodeUrl} alt={group.name} className="h-24 w-24 rounded-lg border border-slate-200 object-cover dark:border-slate-700" loading="lazy" />
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
                <dd className="font-medium text-slate-900 dark:text-white">{memberName ?? '—'}</dd>
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

function formatDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}
