import { useCallback, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { CourseAdminPageShell } from '../components/CourseAdminPageShell';
import { CourseDrawer } from '../components/CourseDrawer';
import { CourseEmptyState } from '../components/CourseEmptyState';
import { CourseFilterBar } from '../components/CourseFilterBar';
import { CourseFormActions, CourseFormFrame, CourseTextField } from '../components/CourseFormControls';
import {
  CourseIconActionButton,
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
  closeCourseAdminOffering,
  createCourseAdminOffering,
  deleteCourseAdminOffering,
  fetchCourseAdminOfferings,
  publishCourseAdminOffering,
  updateCourseAdminOffering,
  type CourseAdminListParams,
  type CourseAdminOfferingItem,
  type CourseAdminOfferingMutationInput,
} from '../courseService';
import { formatCourseCount, formatCourseDateTime } from '../courseFormat';
import { useCourseAdminList } from '../useCourseAdminList';

const COURSE_OFFERING_STATUS_OPTIONS = ['draft', 'published', 'closed'];

export function CourseOfferingsPage() {
  const { t } = useTranslation();
  const [courseId, setCourseId] = useState('');
  const [pickerToken, setPickerToken] = useState(0);

  if (!courseId) {
    return (
      <CourseAdminPageShell
        isLoading={false}
        error={null}
        onRefresh={() => setPickerToken((token) => token + 1)}
        actions={<CoursePicker key={pickerToken} value={courseId} onChange={setCourseId} />}
      >
        <CourseEmptyState title={t('admin.course.offerings.pickCourse', 'Select a course to manage its offerings')} />
      </CourseAdminPageShell>
    );
  }

  return (
    <CourseOfferingsTable
      key={courseId}
      courseId={courseId}
      toolbar={<CoursePicker value={courseId} onChange={setCourseId} />}
    />
  );
}

interface CourseOfferingsTableProps {
  courseId: string;
  /** Toolbar controls owned by the page (the course picker); rendered in the shell action row. */
  toolbar: ReactNode;
}

function CourseOfferingsTable({ courseId, toolbar }: CourseOfferingsTableProps) {
  const { t, i18n } = useTranslation();
  const list = useCourseAdminList(
    useCallback((params: CourseAdminListParams) => fetchCourseAdminOfferings(courseId, params), [courseId]),
    t('admin.course.offerings.error', 'Course offerings could not be loaded'),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [editingOffering, setEditingOffering] = useState<CourseAdminOfferingItem | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const closeDrawers = () => {
    setIsCreateOpen(false);
    setIsEditOpen(false);
    setEditingOffering(null);
    setSaveError(null);
  };

  const handleSave = async (input: CourseAdminOfferingMutationInput) => {
    setIsSaving(true);
    setSaveError(null);
    try {
      if (editingOffering) {
        await updateCourseAdminOffering(editingOffering.id, input);
      } else {
        await createCourseAdminOffering(courseId, input);
      }
      closeDrawers();
      await list.reload();
    } catch (saveFailure) {
      setSaveError(saveFailure instanceof Error ? saveFailure.message : String(saveFailure));
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async (offering: CourseAdminOfferingItem) => {
    await publishCourseAdminOffering(offering.id);
    await list.reload();
  };

  const handleClose = async (offering: CourseAdminOfferingItem) => {
    await closeCourseAdminOffering(offering.id);
    await list.reload();
  };

  const handleDelete = async (offering: CourseAdminOfferingItem) => {
    if (!confirmCourseAction(
      t('admin.course.offerings.deleteConfirm', 'Delete offering "{{title}}"?', { title: offering.title }),
    )) {
      return;
    }
    await deleteCourseAdminOffering(offering.id);
    await list.reload();
  };

  return (
    <CourseAdminPageShell
      isLoading={list.isLoading}
      error={list.error}
      onRefresh={() => void list.reload()}
      actions={(
        <>
          {toolbar}
          <CoursePrimaryButton
            label={t('admin.course.offerings.add', 'Create offering')}
            icon={<Plus className="h-3.5 w-3.5" />}
            onClick={() => {
              setEditingOffering(null);
              setSaveError(null);
              setIsCreateOpen(true);
            }}
          />
        </>
      )}
    >
      <CourseFilterBar
        query={list.query}
        onQueryChange={list.setQuery}
        status={list.status}
        onStatusChange={list.setStatus}
        statusOptions={COURSE_OFFERING_STATUS_OPTIONS.map((value) => ({
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
          <CourseEmptyState title={t('admin.course.offerings.empty', 'No offerings yet')} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left dark:border-white/10">
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.course.offerings.column.title', 'Title')}</th>
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.course.offerings.column.capacity', 'Capacity')}</th>
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.course.offerings.column.start', 'Start')}</th>
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.course.offerings.column.end', 'End')}</th>
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.course.offerings.column.status', 'Status')}</th>
                <th className="px-4 py-2.5 text-right font-medium text-slate-500">{t('admin.course.offerings.column.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {list.items.map((offering) => {
                const offeringStatus = offering.status.trim().toLowerCase();
                return (
                  <tr key={offering.id} className="border-b border-slate-50 hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/5">
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-slate-900 dark:text-white">{offering.title}</p>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                      {formatCourseCount(offering.enrolledCount)} / {formatCourseCount(offering.capacity)}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">{formatCourseDateTime(offering.startAt, i18n.language)}</td>
                    <td className="px-4 py-2.5 text-slate-500">{formatCourseDateTime(offering.endAt, i18n.language)}</td>
                    <td className="px-4 py-2.5"><CourseStatusBadge status={offering.status} /></td>
                    <td className="px-4 py-2.5">
                      <CourseTableActions>
                        {offeringStatus === 'draft' ? (
                          <CourseTextActionButton
                            label={t('admin.course.offerings.publish', 'Publish')}
                            onClick={() => void handlePublish(offering)}
                          />
                        ) : null}
                        {offeringStatus === 'published' ? (
                          <CourseTextActionButton
                            label={t('admin.course.offerings.close', 'Close')}
                            onClick={() => void handleClose(offering)}
                          />
                        ) : null}
                        <CourseIconActionButton
                          label={t('common.actions.edit', 'Edit')}
                          icon={<Pencil className="h-4 w-4" />}
                          onClick={() => {
                            setEditingOffering(offering);
                            setSaveError(null);
                            setIsEditOpen(true);
                          }}
                        />
                        <CourseIconActionButton
                          label={t('common.actions.delete', 'Delete')}
                          icon={<Trash2 className="h-4 w-4" />}
                          tone="danger"
                          onClick={() => void handleDelete(offering)}
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
        title={t('admin.course.offerings.addTitle', 'Create offering')}
        isOpen={isCreateOpen}
        onClose={closeDrawers}
        footer={(
          <CourseFormActions
            submitLabel={t('admin.course.offerings.form.submit', 'Create offering')}
            isSaving={isSaving}
            submitFormId="course-offering-form"
            onCancel={closeDrawers}
          />
        )}
      >
        <CourseOfferingForm
          error={saveError}
          onSubmit={(input) => void handleSave(input)}
        />
      </CourseDrawer>

      <CourseDrawer
        title={t('admin.course.offerings.editTitle', 'Edit offering')}
        description={editingOffering?.title}
        isOpen={isEditOpen}
        onClose={closeDrawers}
        footer={(
          <CourseFormActions
            submitLabel={t('admin.course.offerings.form.updateSubmit', 'Update offering')}
            isSaving={isSaving}
            submitFormId="course-offering-form"
            onCancel={closeDrawers}
          />
        )}
      >
        <CourseOfferingForm
          error={saveError}
          initialValue={editingOffering}
          onSubmit={(input) => void handleSave(input)}
        />
      </CourseDrawer>
    </CourseAdminPageShell>
  );
}

interface CourseOfferingFormProps {
  error: string | null;
  initialValue?: CourseAdminOfferingItem | null;
  onSubmit: (input: CourseAdminOfferingMutationInput) => void;
}

function CourseOfferingForm({ error, initialValue, onSubmit }: CourseOfferingFormProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState(initialValue?.title ?? '');
  const [capacity, setCapacity] = useState(initialValue ? String(initialValue.capacity) : '');
  const [startAt, setStartAt] = useState(initialValue?.startAt ?? '');
  const [endAt, setEndAt] = useState(initialValue?.endAt ?? '');

  return (
    <CourseFormFrame
      error={error}
      formId="course-offering-form"
      onSubmit={(event) => {
        event.preventDefault();
        const parsedCapacity = Number.parseInt(capacity, 10);
        onSubmit({
          title,
          capacity: Number.isNaN(parsedCapacity) ? undefined : parsedCapacity,
          startAt,
          endAt,
        });
      }}
    >
      <CourseTextField
        label={t('admin.course.offerings.form.title', 'Title')}
        value={title}
        required
        onChange={setTitle}
      />
      <CourseTextField
        label={t('admin.course.offerings.form.capacity', 'Capacity')}
        value={capacity}
        type="number"
        onChange={setCapacity}
      />
      <CourseTextField
        label={t('admin.course.offerings.form.startAt', 'Start at')}
        value={startAt}
        type="datetime-local"
        onChange={setStartAt}
      />
      <CourseTextField
        label={t('admin.course.offerings.form.endAt', 'End at')}
        value={endAt}
        type="datetime-local"
        onChange={setEndAt}
      />
    </CourseFormFrame>
  );
}
