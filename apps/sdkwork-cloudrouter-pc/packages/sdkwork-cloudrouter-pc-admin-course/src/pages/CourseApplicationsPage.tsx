import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CourseAdminPageShell } from '../components/CourseAdminPageShell';
import { CourseDrawer } from '../components/CourseDrawer';
import { CourseEmptyState } from '../components/CourseEmptyState';
import { CourseFilterBar } from '../components/CourseFilterBar';
import {
  CourseFormActions,
  CourseFormFrame,
  CourseSelectField,
  CourseTextAreaField,
} from '../components/CourseFormControls';
import {
  CourseTableActions,
  CourseTablePanel,
  CourseTextActionButton,
  confirmCourseAction,
} from '../components/CoursePageControls';
import { CoursePagination } from '../components/CoursePagination';
import { CourseStatusBadge } from '../components/CourseStatusBadge';
import {
  convertCourseAdminApplication,
  fetchCourseAdminApplications,
  reviewCourseAdminApplication,
  type CourseAdminApplicationItem,
  type CourseAdminApplicationReviewDecision,
  type CourseAdminApplicationReviewInput,
} from '../courseService';
import { formatCourseDateTime } from '../courseFormat';
import { useCourseAdminList } from '../useCourseAdminList';

const COURSE_APPLICATION_STATUS_OPTIONS = ['pending', 'approved', 'rejected', 'converted'];
const COURSE_APPLICATION_DECISION_OPTIONS: CourseAdminApplicationReviewDecision[] = ['approved', 'rejected'];

export function CourseApplicationsPage() {
  const { t, i18n } = useTranslation();
  const list = useCourseAdminList(
    fetchCourseAdminApplications,
    t('admin.course.applications.error', 'Course applications could not be loaded'),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [reviewingApplication, setReviewingApplication] = useState<CourseAdminApplicationItem | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  const closeReviewDrawer = () => {
    setIsReviewOpen(false);
    setReviewingApplication(null);
    setSaveError(null);
  };

  const handleReview = async (input: CourseAdminApplicationReviewInput) => {
    if (!reviewingApplication) {
      return;
    }
    setIsSaving(true);
    setSaveError(null);
    try {
      await reviewCourseAdminApplication(reviewingApplication.id, input);
      closeReviewDrawer();
      await list.reload();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleConvert = async (application: CourseAdminApplicationItem) => {
    if (!confirmCourseAction(
      t('admin.course.applications.convertConfirm', 'Convert application of "{{name}}" into an enrollment?', {
        name: application.applicantName,
      }),
    )) {
      return;
    }
    await convertCourseAdminApplication(application.id);
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
        statusOptions={COURSE_APPLICATION_STATUS_OPTIONS.map((value) => ({
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
          <CourseEmptyState title={t('admin.course.applications.empty', 'No applications yet')} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left dark:border-white/10">
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.course.applications.column.course', 'Course')}</th>
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.course.applications.column.applicant', 'Applicant')}</th>
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.course.applications.column.contact', 'Contact')}</th>
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.course.applications.column.submitted', 'Submitted')}</th>
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.course.applications.column.status', 'Status')}</th>
                <th className="px-4 py-2.5 text-right font-medium text-slate-500">{t('admin.course.applications.column.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {list.items.map((application) => {
                const isApproved = application.status.trim().toLowerCase() === 'approved';
                return (
                  <tr key={application.id} className="border-b border-slate-50 hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/5">
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-slate-900 dark:text-white">{application.courseTitle ?? application.courseId}</p>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{application.applicantName}</td>
                    <td className="px-4 py-2.5 text-slate-500">{application.applicantContact ?? '-'}</td>
                    <td className="px-4 py-2.5 text-slate-500">{formatCourseDateTime(application.submittedAt, i18n.language)}</td>
                    <td className="px-4 py-2.5"><CourseStatusBadge status={application.status} /></td>
                    <td className="px-4 py-2.5">
                      <CourseTableActions>
                        <CourseTextActionButton
                          label={t('admin.course.applications.review', 'Review')}
                          onClick={() => {
                            setReviewingApplication(application);
                            setSaveError(null);
                            setIsReviewOpen(true);
                          }}
                        />
                        {isApproved ? (
                          <CourseTextActionButton
                            label={t('admin.course.applications.convert', 'Convert')}
                            onClick={() => void handleConvert(application)}
                          />
                        ) : null}
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
        title={t('admin.course.applications.reviewTitle', 'Review application')}
        description={reviewingApplication?.applicantName}
        isOpen={isReviewOpen}
        onClose={closeReviewDrawer}
        footer={(
          <CourseFormActions
            submitLabel={t('admin.course.applications.reviewSubmit', 'Apply decision')}
            isSaving={isSaving}
            submitFormId="course-applications-review-form"
            onCancel={closeReviewDrawer}
          />
        )}
      >
        {reviewingApplication ? (
          <CourseApplicationReviewForm
            key={reviewingApplication.id}
            error={saveError}
            initialValue={reviewingApplication}
            onSubmit={(input) => void handleReview(input)}
          />
        ) : null}
      </CourseDrawer>
    </CourseAdminPageShell>
  );
}

interface CourseApplicationReviewFormProps {
  error: string | null;
  initialValue: CourseAdminApplicationItem;
  onSubmit: (input: CourseAdminApplicationReviewInput) => void;
}

function CourseApplicationReviewForm({ error, initialValue, onSubmit }: CourseApplicationReviewFormProps) {
  const { t } = useTranslation();
  const [decision, setDecision] = useState<CourseAdminApplicationReviewDecision>('approved');
  const [remark, setRemark] = useState(initialValue.remark ?? '');

  return (
    <CourseFormFrame
      error={error}
      formId="course-applications-review-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({ decision, remark });
      }}
    >
      <CourseSelectField<CourseAdminApplicationReviewDecision>
        label={t('admin.course.applications.form.decision', 'Decision')}
        value={decision}
        options={COURSE_APPLICATION_DECISION_OPTIONS.map((value) => ({
          value,
          label: t(`admin.course.status.${value}`, value),
        }))}
        onChange={(value) => setDecision(value === '' ? 'approved' : value)}
      />
      <CourseTextAreaField
        label={t('admin.course.applications.form.remark', 'Remark')}
        value={remark}
        onChange={setRemark}
      />
    </CourseFormFrame>
  );
}
