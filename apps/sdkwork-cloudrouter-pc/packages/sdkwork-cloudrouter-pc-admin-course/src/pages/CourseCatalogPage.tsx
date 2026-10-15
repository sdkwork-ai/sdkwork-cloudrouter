import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Plus, Trash2, Upload, UploadCloud } from 'lucide-react';
import { CourseAdminPageShell } from '../components/CourseAdminPageShell';
import { CourseDrawer } from '../components/CourseDrawer';
import { CourseEmptyState } from '../components/CourseEmptyState';
import { CourseFilterBar } from '../components/CourseFilterBar';
import { CourseFormActions, CourseFormFrame, CourseTextAreaField, CourseTextField } from '../components/CourseFormControls';
import {
  CourseIconActionButton,
  CoursePrimaryButton,
  CourseTableActions,
  CourseTablePanel,
  confirmCourseAction,
} from '../components/CoursePageControls';
import { CoursePagination } from '../components/CoursePagination';
import { CourseStatusBadge } from '../components/CourseStatusBadge';
import {
  createCourseAdminCourse,
  deleteCourseAdminCourse,
  fetchCourseAdminCourses,
  publishCourseAdminCourse,
  unpublishCourseAdminCourse,
  updateCourseAdminCourse,
  type CourseAdminCourseItem,
  type CourseAdminCourseMutationInput,
} from '../courseService';
import { formatCourseCount, formatCourseDateTime } from '../courseFormat';
import { useCourseAdminList } from '../useCourseAdminList';

const COURSE_STATUS_OPTIONS = ['draft', 'published', 'archived'];

export function CourseCatalogPage() {
  const { t, i18n } = useTranslation();
  const list = useCourseAdminList(
    fetchCourseAdminCourses,
    t('admin.course.courses.error', 'Courses could not be loaded'),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [editingCourse, setEditingCourse] = useState<CourseAdminCourseItem | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const closeDrawers = () => {
    setIsCreateOpen(false);
    setIsEditOpen(false);
    setEditingCourse(null);
    setSaveError(null);
  };

  const handleSave = async (input: CourseAdminCourseMutationInput) => {
    setIsSaving(true);
    setSaveError(null);
    try {
      if (editingCourse) {
        await updateCourseAdminCourse(editingCourse.id, input);
      } else {
        await createCourseAdminCourse(input);
      }
      closeDrawers();
      await list.reload();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePublish = async (course: CourseAdminCourseItem) => {
    if (course.status.trim().toLowerCase() === 'published') {
      await unpublishCourseAdminCourse(course.id);
    } else {
      await publishCourseAdminCourse(course.id);
    }
    await list.reload();
  };

  const handleDelete = async (course: CourseAdminCourseItem) => {
    if (!confirmCourseAction(
      t('admin.course.courses.deleteConfirm', 'Delete course "{{title}}"?', { title: course.title }),
    )) {
      return;
    }
    await deleteCourseAdminCourse(course.id);
    await list.reload();
  };

  return (
    <CourseAdminPageShell
      isLoading={list.isLoading}
      error={list.error}
      onRefresh={() => void list.reload()}
      actions={(
        <CoursePrimaryButton
          label={t('admin.course.courses.add', 'Create course')}
          icon={<Plus className="h-3.5 w-3.5" />}
          onClick={() => {
            setEditingCourse(null);
            setSaveError(null);
            setIsCreateOpen(true);
          }}
        />
      )}
    >
      <CourseFilterBar
        query={list.query}
        onQueryChange={list.setQuery}
        status={list.status}
        onStatusChange={list.setStatus}
        statusOptions={COURSE_STATUS_OPTIONS.map((value) => ({
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
          <CourseEmptyState title={t('admin.course.courses.empty', 'No courses yet')} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left dark:border-white/10">
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.course.courses.column.course', 'Course')}</th>
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.course.courses.column.code', 'Code')}</th>
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.course.courses.column.category', 'Category')}</th>
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.course.courses.column.instructor', 'Instructor')}</th>
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.course.courses.column.students', 'Students')}</th>
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.course.courses.column.lessons', 'Lessons')}</th>
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.course.courses.column.updated', 'Updated')}</th>
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.course.courses.column.status', 'Status')}</th>
                <th className="px-4 py-2.5 text-right font-medium text-slate-500">{t('admin.course.courses.column.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {list.items.map((course) => {
                const isPublished = course.status.trim().toLowerCase() === 'published';
                return (
                  <tr key={course.id} className="border-b border-slate-50 hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/5">
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-slate-900 dark:text-white">{course.title}</p>
                      {course.subtitle ? (
                        <p className="truncate text-xs text-slate-400">{course.subtitle}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">{course.courseCode || '-'}</td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{course.categoryName ?? '-'}</td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{course.instructorName ?? '-'}</td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{formatCourseCount(course.studentsCount)}</td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{formatCourseCount(course.lessonsCount)}</td>
                    <td className="px-4 py-2.5 text-slate-500">{formatCourseDateTime(course.updatedAt, i18n.language)}</td>
                    <td className="px-4 py-2.5"><CourseStatusBadge status={course.status} /></td>
                    <td className="px-4 py-2.5">
                      <CourseTableActions>
                        <button
                          type="button"
                          onClick={() => void handleTogglePublish(course)}
                          className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                        >
                          {isPublished
                            ? t('admin.course.courses.unpublish', 'Unpublish')
                            : t('admin.course.courses.publish', 'Publish')}
                        </button>
                        <CourseIconActionButton
                          label={t('common.actions.edit', 'Edit')}
                          icon={<Pencil className="h-4 w-4" />}
                          onClick={() => {
                            setEditingCourse(course);
                            setSaveError(null);
                            setIsEditOpen(true);
                          }}
                        />
                        <CourseIconActionButton
                          label={t('common.actions.delete', 'Delete')}
                          icon={<Trash2 className="h-4 w-4" />}
                          tone="danger"
                          onClick={() => void handleDelete(course)}
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

      <CourseDrawer
        title={t('admin.course.courses.addTitle', 'Create course')}
        isOpen={isCreateOpen}
        onClose={closeDrawers}
        footer={(
          <CourseFormActions
            submitLabel={t('admin.course.courses.form.submit', 'Create course')}
            isSaving={isSaving}
            submitFormId="course-catalog-form"
            onCancel={closeDrawers}
          />
        )}
      >
        <CourseCourseForm
          error={saveError}
          onSubmit={(input) => void handleSave(input)}
        />
      </CourseDrawer>

      <CourseDrawer
        title={t('admin.course.courses.editTitle', 'Edit course')}
        description={editingCourse?.title}
        isOpen={isEditOpen}
        onClose={closeDrawers}
        footer={(
          <CourseFormActions
            submitLabel={t('admin.course.courses.form.updateSubmit', 'Update course')}
            isSaving={isSaving}
            submitFormId="course-catalog-form"
            onCancel={closeDrawers}
          />
        )}
      >
        <CourseCourseForm
          error={saveError}
          initialValue={editingCourse}
          onSubmit={(input) => void handleSave(input)}
        />
      </CourseDrawer>
    </CourseAdminPageShell>
  );
}

interface CourseCourseFormProps {
  error: string | null;
  initialValue?: CourseAdminCourseItem | null;
  onSubmit: (input: CourseAdminCourseMutationInput) => void;
}

function CourseCourseForm({ error, initialValue, onSubmit }: CourseCourseFormProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState(initialValue?.title ?? '');
  const [subtitle, setSubtitle] = useState(initialValue?.subtitle ?? '');
  const [description, setDescription] = useState('');

  return (
    <CourseFormFrame
      error={error}
      formId="course-catalog-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({ title, subtitle, description });
      }}
    >
      <CourseTextField
        label={t('admin.course.courses.form.title', 'Title')}
        value={title}
        required
        onChange={setTitle}
      />
      <CourseTextField
        label={t('admin.course.courses.form.subtitle', 'Subtitle')}
        value={subtitle}
        onChange={setSubtitle}
      />
      <CourseTextAreaField
        label={t('admin.course.courses.form.description', 'Description')}
        value={description}
        onChange={setDescription}
      />
      <p className="flex items-center gap-2 text-xs text-slate-400">
        <UploadCloud className="h-3.5 w-3.5" />
        {t('admin.course.courses.form.hint', 'Publish after adding sections and lessons so learners can enroll.')}
      </p>
      <p className="flex items-center gap-2 text-xs text-slate-400">
        <Upload className="h-3.5 w-3.5" />
        {t('admin.course.courses.form.contentHint', 'Manage sections, lessons and attachments under Course Content.')}
      </p>
    </CourseFormFrame>
  );
}
