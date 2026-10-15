import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Plus } from 'lucide-react';
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
  cancelCourseAdminLiveSession,
  createCourseAdminLiveSession,
  endCourseAdminLiveSession,
  fetchCourseAdminLiveSessions,
  publishCourseAdminLiveReplay,
  startCourseAdminLiveSession,
  updateCourseAdminLiveSession,
  type CourseAdminLiveSessionItem,
  type CourseAdminLiveSessionMutationInput,
} from '../courseService';
import { formatCourseDateTime } from '../courseFormat';
import { useCourseAdminList } from '../useCourseAdminList';

const COURSE_LIVE_SESSION_STATUS_OPTIONS = ['scheduled', 'live', 'ended', 'cancelled'];

export function CourseLiveSessionsPage() {
  const { t, i18n } = useTranslation();
  const list = useCourseAdminList(
    fetchCourseAdminLiveSessions,
    t('admin.course.live.error', 'Live sessions could not be loaded'),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [editingSession, setEditingSession] = useState<CourseAdminLiveSessionItem | null>(null);
  const [replaySession, setReplaySession] = useState<CourseAdminLiveSessionItem | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const closeDrawers = () => {
    setIsCreateOpen(false);
    setIsEditOpen(false);
    setEditingSession(null);
    setSaveError(null);
  };

  const closeReplayDrawer = () => {
    setReplaySession(null);
    setSaveError(null);
  };

  const handleSave = async (input: CourseAdminLiveSessionMutationInput) => {
    setIsSaving(true);
    setSaveError(null);
    try {
      if (editingSession) {
        await updateCourseAdminLiveSession(editingSession.id, input);
      } else {
        await createCourseAdminLiveSession(input);
      }
      closeDrawers();
      await list.reload();
    } catch (saveFailure) {
      setSaveError(saveFailure instanceof Error ? saveFailure.message : String(saveFailure));
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublishReplay = async (playbackUrl: string) => {
    if (!replaySession) {
      return;
    }
    setIsSaving(true);
    setSaveError(null);
    try {
      await publishCourseAdminLiveReplay(replaySession.id, playbackUrl);
      closeReplayDrawer();
      await list.reload();
    } catch (saveFailure) {
      setSaveError(saveFailure instanceof Error ? saveFailure.message : String(saveFailure));
    } finally {
      setIsSaving(false);
    }
  };

  const handleStart = async (liveSession: CourseAdminLiveSessionItem) => {
    await startCourseAdminLiveSession(liveSession.id);
    await list.reload();
  };

  const handleEnd = async (liveSession: CourseAdminLiveSessionItem) => {
    await endCourseAdminLiveSession(liveSession.id);
    await list.reload();
  };

  const handleCancel = async (liveSession: CourseAdminLiveSessionItem) => {
    if (!confirmCourseAction(
      t('admin.course.live.cancelConfirm', 'Cancel live session "{{title}}"?', { title: liveSession.title }),
    )) {
      return;
    }
    await cancelCourseAdminLiveSession(liveSession.id);
    await list.reload();
  };

  return (
    <CourseAdminPageShell
      isLoading={list.isLoading}
      error={list.error}
      onRefresh={() => void list.reload()}
      actions={(
        <CoursePrimaryButton
          label={t('admin.course.live.add', 'Schedule session')}
          icon={<Plus className="h-3.5 w-3.5" />}
          onClick={() => {
            setEditingSession(null);
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
        statusOptions={COURSE_LIVE_SESSION_STATUS_OPTIONS.map((value) => ({
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
          <CourseEmptyState title={t('admin.course.live.empty', 'No live sessions yet')} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left dark:border-white/10">
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.course.live.column.title', 'Title')}</th>
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.course.live.column.course', 'Course')}</th>
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.course.live.column.instructor', 'Instructor')}</th>
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.course.live.column.scheduledStart', 'Scheduled start')}</th>
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.course.live.column.scheduledEnd', 'Scheduled end')}</th>
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.course.live.column.status', 'Status')}</th>
                <th className="px-4 py-2.5 text-right font-medium text-slate-500">{t('admin.course.live.column.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {list.items.map((liveSession) => {
                const sessionStatus = liveSession.status.trim().toLowerCase();
                return (
                  <tr key={liveSession.id} className="border-b border-slate-50 hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/5">
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-slate-900 dark:text-white">{liveSession.title}</p>
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">{liveSession.courseId || '-'}</td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{liveSession.instructorName ?? '-'}</td>
                    <td className="px-4 py-2.5 text-slate-500">{formatCourseDateTime(liveSession.scheduledStartAt, i18n.language)}</td>
                    <td className="px-4 py-2.5 text-slate-500">{formatCourseDateTime(liveSession.scheduledEndAt, i18n.language)}</td>
                    <td className="px-4 py-2.5"><CourseStatusBadge status={liveSession.status} /></td>
                    <td className="px-4 py-2.5">
                      <CourseTableActions>
                        {sessionStatus === 'scheduled' ? (
                          <CourseTextActionButton
                            label={t('admin.course.live.start', 'Start')}
                            onClick={() => void handleStart(liveSession)}
                          />
                        ) : null}
                        {sessionStatus === 'live' ? (
                          <>
                            <CourseTextActionButton
                              label={t('admin.course.live.end', 'End')}
                              onClick={() => void handleEnd(liveSession)}
                            />
                            <CourseTextActionButton
                              label={t('admin.course.live.cancel', 'Cancel')}
                              onClick={() => void handleCancel(liveSession)}
                            />
                          </>
                        ) : null}
                        <CourseTextActionButton
                          label={t('admin.course.live.publishReplay', 'Publish replay')}
                          onClick={() => {
                            setSaveError(null);
                            setReplaySession(liveSession);
                          }}
                        />
                        <CourseIconActionButton
                          label={t('common.actions.edit', 'Edit')}
                          icon={<Pencil className="h-4 w-4" />}
                          onClick={() => {
                            setEditingSession(liveSession);
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
        title={t('admin.course.live.addTitle', 'Schedule session')}
        isOpen={isCreateOpen}
        onClose={closeDrawers}
        footer={(
          <CourseFormActions
            submitLabel={t('admin.course.live.form.submit', 'Schedule session')}
            isSaving={isSaving}
            submitFormId="course-live-session-form"
            onCancel={closeDrawers}
          />
        )}
      >
        <CourseLiveSessionForm
          error={saveError}
          onSubmit={(input) => void handleSave(input)}
        />
      </CourseDrawer>

      <CourseDrawer
        title={t('admin.course.live.editTitle', 'Edit live session')}
        description={editingSession?.title}
        isOpen={isEditOpen}
        onClose={closeDrawers}
        footer={(
          <CourseFormActions
            submitLabel={t('admin.course.live.form.updateSubmit', 'Update live session')}
            isSaving={isSaving}
            submitFormId="course-live-session-form"
            onCancel={closeDrawers}
          />
        )}
      >
        <CourseLiveSessionForm
          error={saveError}
          initialValue={editingSession}
          onSubmit={(input) => void handleSave(input)}
        />
      </CourseDrawer>

      <CourseDrawer
        title={t('admin.course.live.replayTitle', 'Publish replay')}
        description={replaySession?.title}
        isOpen={replaySession !== null}
        onClose={closeReplayDrawer}
        footer={(
          <CourseFormActions
            submitLabel={t('admin.course.live.replay.submit', 'Publish replay')}
            isSaving={isSaving}
            submitFormId="course-live-replay-form"
            onCancel={closeReplayDrawer}
          />
        )}
      >
        <CourseLiveReplayForm
          error={saveError}
          onSubmit={(playbackUrl) => void handlePublishReplay(playbackUrl)}
        />
      </CourseDrawer>
    </CourseAdminPageShell>
  );
}

interface CourseLiveSessionFormProps {
  error: string | null;
  initialValue?: CourseAdminLiveSessionItem | null;
  onSubmit: (input: CourseAdminLiveSessionMutationInput) => void;
}

function CourseLiveSessionForm({ error, initialValue, onSubmit }: CourseLiveSessionFormProps) {
  const { t } = useTranslation();
  const [courseId, setCourseId] = useState(initialValue?.courseId ?? '');
  const [title, setTitle] = useState(initialValue?.title ?? '');
  const [scheduledStartAt, setScheduledStartAt] = useState(initialValue?.scheduledStartAt ?? '');
  const [scheduledEndAt, setScheduledEndAt] = useState(initialValue?.scheduledEndAt ?? '');
  const [instructorId, setInstructorId] = useState('');

  return (
    <CourseFormFrame
      error={error}
      formId="course-live-session-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({ courseId, title, scheduledStartAt, scheduledEndAt, instructorId });
      }}
    >
      <CoursePicker
        value={courseId}
        onChange={setCourseId}
        label={t('admin.course.live.form.course', 'Course')}
      />
      <CourseTextField
        label={t('admin.course.live.form.title', 'Title')}
        value={title}
        required
        onChange={setTitle}
      />
      <CourseTextField
        label={t('admin.course.live.form.scheduledStartAt', 'Scheduled start')}
        value={scheduledStartAt}
        type="datetime-local"
        onChange={setScheduledStartAt}
      />
      <CourseTextField
        label={t('admin.course.live.form.scheduledEndAt', 'Scheduled end')}
        value={scheduledEndAt}
        type="datetime-local"
        onChange={setScheduledEndAt}
      />
      <CourseTextField
        label={t('admin.course.live.form.instructorId', 'Instructor id')}
        value={instructorId}
        onChange={setInstructorId}
      />
    </CourseFormFrame>
  );
}

interface CourseLiveReplayFormProps {
  error: string | null;
  onSubmit: (playbackUrl: string) => void;
}

function CourseLiveReplayForm({ error, onSubmit }: CourseLiveReplayFormProps) {
  const { t } = useTranslation();
  const [playbackUrl, setPlaybackUrl] = useState('');

  return (
    <CourseFormFrame
      error={error}
      formId="course-live-replay-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(playbackUrl);
      }}
    >
      <CourseTextField
        label={t('admin.course.live.replay.playbackUrl', 'Playback URL')}
        value={playbackUrl}
        required
        onChange={setPlaybackUrl}
      />
    </CourseFormFrame>
  );
}
