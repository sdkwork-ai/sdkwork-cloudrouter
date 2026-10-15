import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CourseAdminPageShell } from '../components/CourseAdminPageShell';
import { CourseDrawer } from '../components/CourseDrawer';
import { CourseEmptyState } from '../components/CourseEmptyState';
import { CourseFilterBar } from '../components/CourseFilterBar';
import {
  CourseCheckboxField,
  CourseFormActions,
  CourseFormFrame,
  CourseTextField,
} from '../components/CourseFormControls';
import { CourseTableActions, CourseTablePanel, CourseTextActionButton } from '../components/CoursePageControls';
import { CoursePagination } from '../components/CoursePagination';
import { CourseStatusBadge } from '../components/CourseStatusBadge';
import {
  fetchCourseAdminProgress,
  repairCourseAdminLessonProgress,
  type CourseAdminProgressItem,
} from '../courseService';
import { formatCourseCount, formatCourseDateTime, formatCoursePercent } from '../courseFormat';
import { useCourseAdminList } from '../useCourseAdminList';

const COURSE_PROGRESS_STATUS_OPTIONS = ['in_progress', 'completed', 'expired'];

export function CourseProgressPage() {
  const { t, i18n } = useTranslation();
  const list = useCourseAdminList(
    fetchCourseAdminProgress,
    t('admin.course.progress.error', 'Course progress could not be loaded'),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [repairingItem, setRepairingItem] = useState<CourseAdminProgressItem | null>(null);
  const [isRepairOpen, setIsRepairOpen] = useState(false);

  const closeRepairDrawer = () => {
    setIsRepairOpen(false);
    setRepairingItem(null);
    setSaveError(null);
  };

  const handleRepair = async (input: CourseProgressRepairInput) => {
    setIsSaving(true);
    setSaveError(null);
    try {
      await repairCourseAdminLessonProgress(input.lessonProgressId, {
        completed: input.completed,
        progressPercent: input.progressPercent,
      });
      closeRepairDrawer();
      await list.reload();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSaving(false);
    }
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
        statusOptions={COURSE_PROGRESS_STATUS_OPTIONS.map((value) => ({
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
          <CourseEmptyState title={t('admin.course.progress.empty', 'No learning progress yet')} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left dark:border-white/10">
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.course.progress.column.course', 'Course')}</th>
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.course.progress.column.learner', 'Learner')}</th>
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.course.progress.column.percent', 'Progress')}</th>
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.course.progress.column.lessons', 'Lessons')}</th>
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.course.progress.column.lastStudied', 'Last studied')}</th>
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.course.progress.column.status', 'Status')}</th>
                <th className="px-4 py-2.5 text-right font-medium text-slate-500">{t('admin.course.progress.column.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {list.items.map((progress) => (
                <tr key={progress.id} className="border-b border-slate-50 hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/5">
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-slate-900 dark:text-white">{progress.courseId}</p>
                  </td>
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{progress.userId}</td>
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{formatCoursePercent(progress.progressPercent)}</td>
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                    {`${formatCourseCount(progress.completedLessons)} / ${formatCourseCount(progress.totalLessons)}`}
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">{formatCourseDateTime(progress.lastStudiedAt, i18n.language)}</td>
                  <td className="px-4 py-2.5"><CourseStatusBadge status={progress.status} /></td>
                  <td className="px-4 py-2.5">
                    <CourseTableActions>
                      <CourseTextActionButton
                        label={t('admin.course.progress.repair', 'Repair')}
                        onClick={() => {
                          setRepairingItem(progress);
                          setSaveError(null);
                          setIsRepairOpen(true);
                        }}
                      />
                    </CourseTableActions>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CourseTablePanel>

      <CourseDrawer
        title={t('admin.course.progress.repairTitle', 'Repair lesson progress')}
        description={repairingItem?.courseId}
        isOpen={isRepairOpen}
        onClose={closeRepairDrawer}
        footer={(
          <CourseFormActions
            submitLabel={t('admin.course.progress.repairSubmit', 'Apply repair')}
            isSaving={isSaving}
            submitFormId="course-progress-repair-form"
            onCancel={closeRepairDrawer}
          />
        )}
      >
        {repairingItem ? (
          <CourseProgressRepairForm
            key={repairingItem.id}
            error={saveError}
            initialValue={repairingItem}
            onSubmit={(input) => void handleRepair(input)}
          />
        ) : null}
      </CourseDrawer>
    </CourseAdminPageShell>
  );
}

interface CourseProgressRepairInput {
  lessonProgressId: string;
  completed: boolean;
  progressPercent?: number;
}

interface CourseProgressRepairFormProps {
  error: string | null;
  initialValue: CourseAdminProgressItem;
  onSubmit: (input: CourseProgressRepairInput) => void;
}

function CourseProgressRepairForm({ error, initialValue, onSubmit }: CourseProgressRepairFormProps) {
  const { t } = useTranslation();
  const [lessonProgressId, setLessonProgressId] = useState(initialValue.id);
  const [completed, setCompleted] = useState(initialValue.status.trim().toLowerCase() === 'completed');
  const [progressPercent, setProgressPercent] = useState(String(initialValue.progressPercent ?? ''));

  return (
    <CourseFormFrame
      error={error}
      formId="course-progress-repair-form"
      onSubmit={(event) => {
        event.preventDefault();
        const parsedPercent = progressPercent.trim() === '' ? undefined : Number(progressPercent);
        onSubmit({
          lessonProgressId,
          completed,
          progressPercent: parsedPercent !== undefined && Number.isFinite(parsedPercent)
            ? parsedPercent
            : undefined,
        });
      }}
    >
      <CourseTextField
        label={t('admin.course.progress.form.lessonProgressId', 'Lesson progress id')}
        value={lessonProgressId}
        required
        onChange={setLessonProgressId}
      />
      <CourseCheckboxField
        label={t('admin.course.progress.form.completed', 'Mark completed')}
        checked={completed}
        onChange={setCompleted}
      />
      <CourseTextField
        label={t('admin.course.progress.form.percent', 'Progress percent')}
        value={progressPercent}
        type="number"
        step="1"
        onChange={setProgressPercent}
      />
    </CourseFormFrame>
  );
}
