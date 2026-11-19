import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Heart, MessageCircle, Send } from 'lucide-react';

import { CircleAvatar, CommunityPage, CommunitySpinner } from '../components/CommunityShell.tsx';
import { CommunityService, ensureCommunityPcRuntime, type Community, type Post } from '../runtime.ts';

/** Deep-linkable post view. Comments post through the same community service. */
export function CommunityEntryPage() {
  const { t } = useTranslation();
  const { circleId = '', entryId = '' } = useParams<{ circleId: string; entryId: string }>();
  const [circle, setCircle] = useState<Community | null>(null);
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');

  useEffect(() => {
    let active = true;
    ensureCommunityPcRuntime();
    void (async () => {
      const loadedCircle = await CommunityService.getCommunityById(circleId).catch(() => undefined);
      const posts = await CommunityService.getPostsByCommunity(circleId).catch(() => []);
      if (!active) return;
      setCircle(loadedCircle ?? null);
      setPost(posts.find((item) => item.id === entryId) ?? null);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [circleId, entryId]);

  if (loading) {
    return <CommunityPage><CommunitySpinner label={t('communityUi.loading')} /></CommunityPage>;
  }

  if (!post) {
    return (
      <CommunityPage>
        <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700">{t('communityUi.noPosts')}</p>
      </CommunityPage>
    );
  }

  const submitComment = async () => {
    if (!comment.trim()) return;
    const created = await CommunityService.addComment(circleId, post.id, comment.trim());
    setPost({ ...post, comments: post.comments + 1, commentsList: [...(post.commentsList ?? []), created] });
    setComment('');
  };

  return (
    <CommunityPage>
      <div className="mx-auto max-w-3xl">
        <Link to={`/community/${circleId}`} className="mb-4 inline-block text-sm font-medium text-slate-500 hover:text-lobster-500">
          ← {circle?.name ?? t('communityUi.back')}
        </Link>
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <header className="flex items-center gap-3">
            <CircleAvatar name={post.authorName} src={post.authorAvatar} className="h-10 w-10" />
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{post.authorName}</p>
              <p className="text-xs text-slate-400">{post.createdAt}</p>
            </div>
          </header>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700 dark:text-slate-200">{post.content}</p>
          {post.images && post.images.length > 0 ? (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {post.images.map((image) => <img key={image} src={image} alt="" className="w-full rounded-xl object-cover" loading="lazy" />)}
            </div>
          ) : null}
          <div className="mt-5 flex items-center gap-5 border-t border-slate-100 pt-4 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <button type="button" onClick={() => { void CommunityService.toggleLikePost(circleId, post.id); }} className={`inline-flex items-center gap-1.5 ${post.isLiked ? 'text-lobster-500' : ''}`}>
              <Heart className={`h-4 w-4 ${post.isLiked ? 'fill-current' : ''}`} aria-hidden="true" />{post.likes}
            </button>
            <span className="inline-flex items-center gap-1.5"><MessageCircle className="h-4 w-4" aria-hidden="true" />{post.comments}</span>
          </div>
          {(post.commentsList ?? []).length > 0 ? (
            <ul className="mt-4 space-y-2 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-950/60">
              {(post.commentsList ?? []).map((item) => (
                <li key={item.id}><span className="font-medium text-slate-700 dark:text-slate-200">{item.authorName}: </span><span className="text-slate-600 dark:text-slate-300">{item.content}</span></li>
              ))}
            </ul>
          ) : null}
          <div className="mt-4 flex gap-2">
            <input value={comment} onChange={(event) => setComment(event.target.value)} placeholder={t('communityUi.commentPlaceholder')} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
            <button type="button" onClick={() => void submitComment()} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white dark:bg-white dark:text-slate-900">
              <Send className="h-4 w-4" aria-hidden="true" />{t('communityUi.comment')}
            </button>
          </div>
        </article>
      </div>
    </CommunityPage>
  );
}
