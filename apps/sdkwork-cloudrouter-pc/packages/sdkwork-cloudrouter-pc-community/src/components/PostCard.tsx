import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Heart, MessageCircle, Trash2 } from 'lucide-react';

import type { Post } from '../runtime.ts';
import { CircleAvatar } from './CommunityShell.tsx';

/** One post card with reactions, inline comments, and a comments composer. */
export function PostCard({
  post,
  commentDraft,
  onCommentDraftChange,
  onLike,
  onComment,
  onDelete,
  detailHref,
}: {
  readonly commentDraft: string;
  readonly detailHref: string;
  readonly onComment: () => void;
  readonly onCommentDraftChange: (value: string) => void;
  readonly onDelete?: () => void;
  readonly onLike: () => void;
  readonly post: Post;
}) {
  const { t } = useTranslation();
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <header className="flex items-center gap-3">
        <CircleAvatar name={post.authorName} src={post.authorAvatar} className="h-10 w-10" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
            {post.authorName || t('communityUi.member')}
          </p>
          {post.reviewState && post.reviewState !== 'approved' ? (
            <span className="mt-0.5 inline-block rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
              {t('communityUi.pendingReview', 'Pending review')}
            </span>
          ) : null}
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
        <button
          type="button"
          onClick={onLike}
          className={`inline-flex items-center gap-1.5 hover:text-lobster-500 ${post.isLiked ? 'text-lobster-500' : ''}`}
          aria-pressed={post.isLiked}
        >
          <Heart className={`h-4 w-4 ${post.isLiked ? 'fill-current' : ''}`} aria-hidden="true" />
          {post.likes}
        </button>
        <span className="inline-flex items-center gap-1.5">
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          {post.comments}
        </span>
        <Link to={detailHref} className="ml-auto text-xs font-medium text-slate-400 hover:text-lobster-500">
          {t('communityUi.readMore')}
        </Link>
        {onDelete ? (
          <button type="button" onClick={onDelete} aria-label={t('communityUi.deletePost', 'Delete post')} className="text-red-500 hover:text-red-600">
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}
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
          value={commentDraft}
          onChange={(event) => onCommentDraftChange(event.target.value)}
          placeholder={t('communityUi.commentPlaceholder')}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
        />
        <button type="button" onClick={onComment} className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white dark:bg-white dark:text-slate-900">
          {t('communityUi.comment')}
        </button>
      </div>
    </article>
  );
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}
