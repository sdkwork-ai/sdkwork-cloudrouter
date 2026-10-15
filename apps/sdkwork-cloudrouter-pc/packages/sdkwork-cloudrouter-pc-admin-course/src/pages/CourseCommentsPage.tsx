import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { CourseAdminPageShell } from '../components/CourseAdminPageShell';
import { CourseEmptyState } from '../components/CourseEmptyState';
import { CourseFilterBar } from '../components/CourseFilterBar';
import {
  CourseIconActionButton,
  CourseTableActions,
  CourseTablePanel,
  CourseTextActionButton,
  confirmCourseAction,
} from '../components/CoursePageControls';
import { CoursePagination } from '../components/CoursePagination';
import { CourseStatusBadge, courseModerationLabel } from '../components/CourseStatusBadge';
import {
  deleteCourseAdminComment,
  fetchCourseAdminComments,
  moderateCourseAdminComment,
  type CourseAdminCommentItem,
  type CourseAdminCommentModerationState,
} from '../courseService';
import { formatCourseDateTime, truncateCourseText } from '../courseFormat';
import { useCourseAdminList } from '../useCourseAdminList';

const COURSE_COMMENT_STATUS_OPTIONS = ['visible', 'hidden', 'rejected'];

export function CourseCommentsPage() {
  const { t, i18n } = useTranslation();
  const list = useCourseAdminList(
    fetchCourseAdminComments,
    t('admin.course.comments.error', 'Course comments could not be loaded'),
  );

  const handleModerate = async (
    comment: CourseAdminCommentItem,
    state: CourseAdminCommentModerationState,
  ) => {
    await moderateCourseAdminComment(comment.id, state);
    await list.reload();
  };

  const handleDelete = async (comment: CourseAdminCommentItem) => {
    if (!confirmCourseAction(
      t('admin.course.comments.deleteConfirm', 'Delete this comment?'),
    )) {
      return;
    }
    await deleteCourseAdminComment(comment.id);
    await list.reload();
  };

  return (
    <CourseAdminPageShell
      isLoading={list.isLoading}
      error={list.error}
      onRefresh={() => void list.reload()}
    >
      <CourseFilterBar
        query={list.query}
        onQueryChange={list.setQuery}
        status={list.status}
        onStatusChange={list.setStatus}
        statusOptions={COURSE_COMMENT_STATUS_OPTIONS.map((value) => ({
          value,
          label: t(`admin.course.status.${value}`, value),
        }))}
      />

      <CourseTablePanel footer={(
        <CoursePagination
          page={list.page}
          pageSize={list.pageSize}
          itemCount={list.items.length}
          pageInfo={list.pageInfo}
          onPageChange={list.setPage}
        />
      )}
      >
        {list.items.length === 0 ? (
          <CourseEmptyState title={t('admin.course.comments.empty', 'No comments yet')} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left dark:border-white/10">
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.course.comments.column.course', 'Course')}</th>
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.course.comments.column.lesson', 'Lesson')}</th>
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.course.comments.column.author', 'Author')}</th>
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.course.comments.column.body', 'Comment')}</th>
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.course.comments.column.created', 'Created')}</th>
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.course.comments.column.state', 'Moderation')}</th>
                <th className="px-4 py-2.5 text-right font-medium text-slate-500">{t('admin.course.comments.column.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {list.items.map((comment) => {
                const moderationState = comment.moderationState.trim().toLowerCase();
                return (
                  <tr key={comment.id} className="border-b border-slate-50 hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/5">
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-slate-900 dark:text-white">{comment.courseId}</p>
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">{comment.lessonId ?? '-'}</td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{comment.authorName}</td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{truncateCourseText(comment.body, 80)}</td>
                    <td className="px-4 py-2.5 text-slate-500">{formatCourseDateTime(comment.createdAt, i18n.language)}</td>
                    <td className="px-4 py-2.5">
                      <CourseStatusBadge
                        status={comment.moderationState}
                        label={courseModerationLabel(comment.moderationState, t)}
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <CourseTableActions>
                        <CourseTextActionButton
                          label={t('admin.course.comments.hide', 'Hide')}
                          disabled={moderationState === 'hidden'}
                          onClick={() => void handleModerate(comment, 'hidden')}
                        />
                        <CourseTextActionButton
                          label={t('admin.course.comments.reject', 'Reject')}
                          disabled={moderationState === 'rejected'}
                          onClick={() => void handleModerate(comment, 'rejected')}
                        />
                        {moderationState !== 'visible' ? (
                          <CourseTextActionButton
                            label={t('admin.course.comments.restore', 'Restore')}
                            onClick={() => void handleModerate(comment, 'visible')}
                          />
                        ) : null}
                        <CourseIconActionButton
                          label={t('common.actions.delete', 'Delete')}
                          icon={<Trash2 className="h-4 w-4" />}
                          tone="danger"
                          onClick={() => void handleDelete(comment)}
                        />
                      </CourseTableActions>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </CourseTablePanel>
    </CourseAdminPageShell>
  );
}
