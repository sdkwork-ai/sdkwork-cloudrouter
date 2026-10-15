import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { CourseAdminPageShell } from '../components/CourseAdminPageShell';
import { CourseDrawer } from '../components/CourseDrawer';
import { CourseEmptyState } from '../components/CourseEmptyState';
import { CourseFilterBar } from '../components/CourseFilterBar';
import { CourseFormActions, CourseFormFrame, CourseTextAreaField, CourseTextField } from '../components/CourseFormControls';
import {
  CoursePrimaryButton,
  CourseTableActions,
  CourseTablePanel,
  CourseTextActionButton,
  confirmCourseAction,
} from '../components/CoursePageControls';
import { CoursePagination } from '../components/CoursePagination';
import { CoursePicker } from '../components/CoursePicker';
import { CourseStatusBadge } from '../components/CourseStatusBadge';
import {
  fetchCourseAdminEnrollments,
  grantCourseAdminEnrollment,
  revokeCourseAdminEnrollment,
  type CourseAdminEnrollmentGrantInput,
  type CourseAdminEnrollmentItem,
} from '../courseService';
import { formatCourseDateTime } from '../courseFormat';
import { useCourseAdminList } from '../useCourseAdminList';

const COURSE_ENROLLMENT_STATUS_OPTIONS = ['active', 'revoked', 'expired'];

export function CourseEnrollmentsPage() {
  const { t, i18n } = useTranslation();
  const list = useCourseAdminList(
    fetchCourseAdminEnrollments,
    t('admin.course.enrollments.error', 'Course enrollments could not be loaded'),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isGrantOpen, setIsGrantOpen] = useState(false);

  const closeDrawer = () => {
    setIsGrantOpen(false);
    setSaveError(null);
  };

  const handleGrant = async (input: CourseAdminEnrollmentGrantInput) => {
    setIsSaving(true);
    setSaveError(null);
    try {
      await grantCourseAdminEnrollment(input);
      closeDrawer();
      await list.reload();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleRevoke = async (enrollment: CourseAdminEnrollmentItem) => {
    if (!confirmCourseAction(
      t('admin.course.enrollments.revokeConfirm', 'Revoke the enrollment of "{{name}}"?', {
        name: enrollment.userName ?? enrollment.userId,
      }),
    )) {
      return;
    }
    await revokeCourseAdminEnrollment(enrollment.id);
    await list.reload();
  };

  return (
    <CourseAdminPageShell
      isLoading={list.isLoading}
      error={list.error}
      onRefresh={() => void list.reload()}
      actions={(
        <CoursePrimaryButton
          label={t('admin.course.enrollments.grant', 'Grant enrollment')}
          icon={<Plus className="h-3.5 w-3.5" />}
          onClick={() => {
            setSaveError(null);
            setIsGrantOpen(true);
          }}
        />
      )}
    >
      <CourseFilterBar
        query={list.query}
        onQueryChange={list.setQuery}
        status={list.status}
        onStatusChange={list.setStatus}
        statusOptions={COURSE_ENROLLMENT_STATUS_OPTIONS.map((value) => ({
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
          <CourseEmptyState title={t('admin.course.enrollments.empty', 'No enrollments yet')} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left dark:border-white/10">
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.course.enrollments.column.course', 'Course')}</th>
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.course.enrollments.column.learner', 'Learner')}</th>
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.course.enrollments.column.source', 'Source')}</th>
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.course.enrollments.column.enrolledAt', 'Enrolled at')}</th>
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.course.enrollments.column.status', 'Status')}</th>
                <th className="px-4 py-2.5 text-right font-medium text-slate-500">{t('admin.course.enrollments.column.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {list.items.map((enrollment) => (
                <tr key={enrollment.id} className="border-b border-slate-50 hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/5">
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-slate-900 dark:text-white">{enrollment.courseTitle ?? enrollment.courseId}</p>
                  </td>
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{enrollment.userName ?? enrollment.userId}</td>
                  <td className="px-4 py-2.5 text-slate-500">{enrollment.source}</td>
                  <td className="px-4 py-2.5 text-slate-500">{formatCourseDateTime(enrollment.enrolledAt, i18n.language)}</td>
                  <td className="px-4 py-2.5"><CourseStatusBadge status={enrollment.status} /></td>
                  <td className="px-4 py-2.5">
                    <CourseTableActions>
                      <CourseTextActionButton
                        label={t('admin.course.enrollments.revoke', 'Revoke')}
                        onClick={() => void handleRevoke(enrollment)}
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
        title={t('admin.course.enrollments.grantTitle', 'Grant enrollment')}
        isOpen={isGrantOpen}
        onClose={closeDrawer}
        footer={(
          <CourseFormActions
            submitLabel={t('admin.course.enrollments.form.submit', 'Grant enrollment')}
            isSaving={isSaving}
            submitFormId="course-enrollments-form"
            onCancel={closeDrawer}
          />
        )}
      >
        <CourseEnrollmentGrantForm
          error={saveError}
          onSubmit={(input) => void handleGrant(input)}
        />
      </CourseDrawer>
    </CourseAdminPageShell>
  );
}

interface CourseEnrollmentGrantFormProps {
  error: string | null;
  onSubmit: (input: CourseAdminEnrollmentGrantInput) => void;
}

function CourseEnrollmentGrantForm({ error, onSubmit }: CourseEnrollmentGrantFormProps) {
  const { t } = useTranslation();
  const [courseId, setCourseId] = useState('');
  const [userId, setUserId] = useState('');
  const [source, setSource] = useState('');
  const [remark, setRemark] = useState('');

  return (
    <CourseFormFrame
      error={error}
      formId="course-enrollments-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({ courseId, userId, source, remark });
      }}
    >
      <CoursePicker
        value={courseId}
        onChange={setCourseId}
        label={t('admin.course.enrollments.form.course', 'Course')}
      />
      <CourseTextField
        label={t('admin.course.enrollments.form.userId', 'User id')}
        value={userId}
        required
        onChange={setUserId}
      />
      <CourseTextField
        label={t('admin.course.enrollments.form.source', 'Source')}
        value={source}
        onChange={setSource}
      />
      <CourseTextAreaField
        label={t('admin.course.enrollments.form.remark', 'Remark')}
        value={remark}
        onChange={setRemark}
      />
    </CourseFormFrame>
  );
}
