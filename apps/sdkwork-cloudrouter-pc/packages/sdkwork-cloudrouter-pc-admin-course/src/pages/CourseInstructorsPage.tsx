import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Plus } from 'lucide-react';
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
} from '../components/CoursePageControls';
import { CoursePagination } from '../components/CoursePagination';
import { CourseStatusBadge } from '../components/CourseStatusBadge';
import {
  createCourseAdminInstructor,
  fetchCourseAdminInstructors,
  updateCourseAdminInstructor,
  updateCourseAdminInstructorStatus,
  type CourseAdminInstructorItem,
  type CourseAdminInstructorMutationInput,
} from '../courseService';
import { formatCourseCount } from '../courseFormat';
import { useCourseAdminList } from '../useCourseAdminList';

const COURSE_INSTRUCTOR_STATUS_OPTIONS = ['active', 'disabled'];

const courseInstructorStatusLabels: Record<string, string> = {
  active: 'Active',
  disabled: 'Disabled',
};

export function CourseInstructorsPage() {
  const { t } = useTranslation();
  const list = useCourseAdminList(
    fetchCourseAdminInstructors,
    t('admin.course.instructors.error', 'Course instructors could not be loaded'),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [editingInstructor, setEditingInstructor] = useState<CourseAdminInstructorItem | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const closeDrawers = () => {
    setIsCreateOpen(false);
    setIsEditOpen(false);
    setEditingInstructor(null);
    setSaveError(null);
  };

  const handleSave = async (input: CourseAdminInstructorMutationInput) => {
    setIsSaving(true);
    setSaveError(null);
    try {
      if (editingInstructor) {
        await updateCourseAdminInstructor(editingInstructor.id, input);
      } else {
        await createCourseAdminInstructor(input);
      }
      closeDrawers();
      await list.reload();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (instructor: CourseAdminInstructorItem) => {
    const nextStatus = instructor.status.trim().toLowerCase() === 'active' ? 'disabled' : 'active';
    await updateCourseAdminInstructorStatus(instructor.id, nextStatus);
    await list.reload();
  };

  return (
    <CourseAdminPageShell
      isLoading={list.isLoading}
      error={list.error}
      onRefresh={() => void list.reload()}
      actions={(
        <CoursePrimaryButton
          label={t('admin.course.instructors.add', 'Create instructor')}
          icon={<Plus className="h-3.5 w-3.5" />}
          onClick={() => {
            setEditingInstructor(null);
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
        statusOptions={COURSE_INSTRUCTOR_STATUS_OPTIONS.map((value) => ({
          value,
          label: t(`admin.course.status.${value}`, courseInstructorStatusLabels[value] ?? value),
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
          <CourseEmptyState title={t('admin.course.instructors.empty', 'No instructors yet')} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left dark:border-white/10">
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.course.instructors.column.name', 'Name')}</th>
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.course.instructors.column.title', 'Title')}</th>
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.course.instructors.column.courses', 'Courses')}</th>
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.course.instructors.column.students', 'Students')}</th>
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.course.instructors.column.status', 'Status')}</th>
                <th className="px-4 py-2.5 text-right font-medium text-slate-500">{t('admin.course.instructors.column.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {list.items.map((instructor) => {
                const isActive = instructor.status.trim().toLowerCase() === 'active';
                return (
                  <tr key={instructor.id} className="border-b border-slate-50 hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/5">
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-slate-900 dark:text-white">{instructor.name}</p>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{instructor.title ?? '-'}</td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{formatCourseCount(instructor.courseCount)}</td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{formatCourseCount(instructor.studentCount)}</td>
                    <td className="px-4 py-2.5"><CourseStatusBadge status={instructor.status} /></td>
                    <td className="px-4 py-2.5">
                      <CourseTableActions>
                        <button
                          type="button"
                          onClick={() => void handleToggleStatus(instructor)}
                          className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                        >
                          {isActive
                            ? t('admin.course.instructors.disable', 'Disable')
                            : t('admin.course.instructors.enable', 'Enable')}
                        </button>
                        <CourseIconActionButton
                          label={t('common.actions.edit', 'Edit')}
                          icon={<Pencil className="h-4 w-4" />}
                          onClick={() => {
                            setEditingInstructor(instructor);
                            setSaveError(null);
                            setIsEditOpen(true);
                          }}
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
        title={t('admin.course.instructors.addTitle', 'Create instructor')}
        isOpen={isCreateOpen}
        onClose={closeDrawers}
        footer={(
          <CourseFormActions
            submitLabel={t('admin.course.instructors.form.submit', 'Create instructor')}
            isSaving={isSaving}
            submitFormId="course-instructor-form"
            onCancel={closeDrawers}
          />
        )}
      >
        <CourseInstructorForm
          error={saveError}
          onSubmit={(input) => void handleSave(input)}
        />
      </CourseDrawer>

      <CourseDrawer
        title={t('admin.course.instructors.editTitle', 'Edit instructor')}
        description={editingInstructor?.name}
        isOpen={isEditOpen}
        onClose={closeDrawers}
        footer={(
          <CourseFormActions
            submitLabel={t('admin.course.instructors.form.updateSubmit', 'Update instructor')}
            isSaving={isSaving}
            submitFormId="course-instructor-form"
            onCancel={closeDrawers}
          />
        )}
      >
        <CourseInstructorForm
          error={saveError}
          initialValue={editingInstructor}
          onSubmit={(input) => void handleSave(input)}
        />
      </CourseDrawer>
    </CourseAdminPageShell>
  );
}

interface CourseInstructorFormProps {
  error: string | null;
  initialValue?: CourseAdminInstructorItem | null;
  onSubmit: (input: CourseAdminInstructorMutationInput) => void;
}

function CourseInstructorForm({ error, initialValue, onSubmit }: CourseInstructorFormProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(initialValue?.name ?? '');
  const [title, setTitle] = useState(initialValue?.title ?? '');
  const [bio, setBio] = useState(initialValue?.bio ?? '');
  const [avatarUrl, setAvatarUrl] = useState(initialValue?.avatarUrl ?? '');

  return (
    <CourseFormFrame
      error={error}
      formId="course-instructor-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({ name, title, bio, avatarUrl });
      }}
    >
      <CourseTextField
        label={t('admin.course.instructors.form.name', 'Name')}
        value={name}
        required
        onChange={setName}
      />
      <CourseTextField
        label={t('admin.course.instructors.form.title', 'Title')}
        value={title}
        onChange={setTitle}
      />
      <CourseTextAreaField
        label={t('admin.course.instructors.form.bio', 'Bio')}
        value={bio}
        onChange={setBio}
      />
      <CourseTextField
        label={t('admin.course.instructors.form.avatarUrl', 'Avatar URL')}
        value={avatarUrl}
        onChange={setAvatarUrl}
      />
    </CourseFormFrame>
  );
}
