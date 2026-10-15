import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Paperclip, Pencil, Plus, Trash2 } from 'lucide-react';
import { resolveProblemMessage } from '@sdkwork/cloudroutes-pc-commons';
import { BusinessStatePanel } from '@sdkwork/cloudroutes-pc-commons/components/BusinessState';
import { CourseAdminPageShell } from '../components/CourseAdminPageShell';
import { CourseDrawer } from '../components/CourseDrawer';
import { CourseEmptyState } from '../components/CourseEmptyState';
import {
  CourseCheckboxField,
  CourseFormActions,
  CourseFormFrame,
  CourseSelectField,
  CourseTextAreaField,
  CourseTextField,
} from '../components/CourseFormControls';
import {
  CourseIconActionButton,
  CoursePrimaryButton,
  CourseTableActions,
  CourseTablePanel,
  confirmCourseAction,
} from '../components/CoursePageControls';
import { CoursePicker } from '../components/CoursePicker';
import { CourseStatusBadge, courseKindLabel } from '../components/CourseStatusBadge';
import {
  createCourseAdminLesson,
  createCourseAdminResource,
  createCourseAdminSection,
  deleteCourseAdminLesson,
  deleteCourseAdminResource,
  deleteCourseAdminSection,
  fetchCourseAdminLessons,
  fetchCourseAdminResources,
  fetchCourseAdminSections,
  updateCourseAdminLesson,
  updateCourseAdminResource,
  updateCourseAdminSection,
  type CourseAdminLessonItem,
  type CourseAdminLessonMutationInput,
  type CourseAdminResourceItem,
  type CourseAdminResourceMutationInput,
  type CourseAdminSectionItem,
  type CourseAdminSectionMutationInput,
} from '../courseService';
import { formatCourseCount, formatCourseDuration } from '../courseFormat';

const COURSE_LESSON_KIND_OPTIONS = [
  'vod_video',
  'live_session',
  'article',
  'download',
  'quiz',
  'assignment',
];

export function CourseContentPage() {
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
        <CourseEmptyState
          title={t(
            'admin.course.content.pickCourse',
            'Select a course to manage its sections, lessons and attachments',
          )}
        />
      </CourseAdminPageShell>
    );
  }

  return (
    <CourseContentWorkspace
      key={courseId}
      courseId={courseId}
      toolbar={<CoursePicker value={courseId} onChange={setCourseId} />}
    />
  );
}

interface CourseContentWorkspaceProps {
  courseId: string;
  /** Toolbar controls owned by the page (the course picker); rendered in the shell action row. */
  toolbar: ReactNode;
}

function CourseContentWorkspace({ courseId, toolbar }: CourseContentWorkspaceProps) {
  const { t } = useTranslation();
  const [sections, setSections] = useState<CourseAdminSectionItem[]>([]);
  const [lessons, setLessons] = useState<CourseAdminLessonItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [editingSection, setEditingSection] = useState<CourseAdminSectionItem | null>(null);
  const [isSectionCreateOpen, setIsSectionCreateOpen] = useState(false);
  const [isSectionEditOpen, setIsSectionEditOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<CourseAdminLessonItem | null>(null);
  const [isLessonCreateOpen, setIsLessonCreateOpen] = useState(false);
  const [isLessonEditOpen, setIsLessonEditOpen] = useState(false);
  const [attachmentLesson, setAttachmentLesson] = useState<CourseAdminLessonItem | null>(null);
  const requestIdRef = useRef(0);

  const reload = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);
    try {
      const [sectionItems, lessonPage] = await Promise.all([
        fetchCourseAdminSections(courseId),
        fetchCourseAdminLessons(courseId, { pageSize: 200 }),
      ]);
      if (requestId !== requestIdRef.current) {
        return;
      }
      setSections(sectionItems);
      setLessons(lessonPage.items);
    } catch (loadError) {
      if (requestId === requestIdRef.current) {
        setError(
          resolveProblemMessage(
            loadError,
            t,
            t('admin.course.content.error', 'Course content could not be loaded'),
          ),
        );
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [courseId, t]);

  useEffect(() => {
    void reload();
    return () => {
      requestIdRef.current += 1;
    };
  }, [reload]);

  const sectionTitleById = new Map<string, string>(
    sections.map((section) => [section.id, section.title] as const),
  );

  const closeSectionDrawers = () => {
    setIsSectionCreateOpen(false);
    setIsSectionEditOpen(false);
    setEditingSection(null);
    setSaveError(null);
  };

  const closeLessonDrawers = () => {
    setIsLessonCreateOpen(false);
    setIsLessonEditOpen(false);
    setEditingLesson(null);
    setSaveError(null);
  };

  const closeAttachmentDrawer = () => {
    setAttachmentLesson(null);
    setSaveError(null);
  };

  const handleSaveSection = async (input: CourseAdminSectionMutationInput) => {
    setIsSaving(true);
    setSaveError(null);
    try {
      if (editingSection) {
        await updateCourseAdminSection(editingSection.id, input);
      } else {
        await createCourseAdminSection(courseId, input);
      }
      closeSectionDrawers();
      await reload();
    } catch (saveFailure) {
      setSaveError(saveFailure instanceof Error ? saveFailure.message : String(saveFailure));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSection = async (section: CourseAdminSectionItem) => {
    if (!confirmCourseAction(
      t('admin.course.content.sections.deleteConfirm', 'Delete section "{{title}}"?', { title: section.title }),
    )) {
      return;
    }
    await deleteCourseAdminSection(section.id);
    await reload();
  };

  const handleSaveLesson = async (input: CourseAdminLessonMutationInput) => {
    setIsSaving(true);
    setSaveError(null);
    try {
      if (editingLesson) {
        await updateCourseAdminLesson(editingLesson.id, input);
      } else {
        await createCourseAdminLesson(courseId, input);
      }
      closeLessonDrawers();
      await reload();
    } catch (saveFailure) {
      setSaveError(saveFailure instanceof Error ? saveFailure.message : String(saveFailure));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteLesson = async (lesson: CourseAdminLessonItem) => {
    if (!confirmCourseAction(
      t('admin.course.content.lessons.deleteConfirm', 'Delete lesson "{{title}}"?', { title: lesson.title }),
    )) {
      return;
    }
    await deleteCourseAdminLesson(lesson.id);
    await reload();
  };

  return (
    <CourseAdminPageShell
      isLoading={isLoading}
      error={error}
      onRefresh={() => void reload()}
      actions={toolbar}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
        <CourseTablePanel>
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-white/10">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                {t('admin.course.content.sections.title', 'Sections')}
              </h3>
              <p className="text-xs text-slate-400">
                {t('admin.course.content.sections.count', 'Sections: {{total}}', {
                  total: formatCourseCount(sections.length),
                })}
              </p>
            </div>
            <CoursePrimaryButton
              label={t('admin.course.content.sections.add', 'Create section')}
              icon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => {
                setEditingSection(null);
                setSaveError(null);
                setIsSectionCreateOpen(true);
              }}
            />
          </div>
          {sections.length === 0 ? (
            <CourseEmptyState title={t('admin.course.content.sections.empty', 'No sections in this course')} />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left dark:border-white/10">
                  <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.course.content.sections.column.title', 'Title')}</th>
                  <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.course.content.sections.column.lessons', 'Lessons')}</th>
                  <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.course.content.sections.column.sortWeight', 'Sort weight')}</th>
                  <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.course.content.sections.column.status', 'Status')}</th>
                  <th className="px-4 py-2.5 text-right font-medium text-slate-500">{t('admin.course.content.sections.column.actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {sections.map((section) => (
                  <tr key={section.id} className="border-b border-slate-50 hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/5">
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-slate-900 dark:text-white">{section.title}</p>
                      {section.description ? (
                        <p className="truncate text-xs text-slate-400">{section.description}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{formatCourseCount(section.lessonCount)}</td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{formatCourseCount(section.sortWeight)}</td>
                    <td className="px-4 py-2.5"><CourseStatusBadge status={section.status} /></td>
                    <td className="px-4 py-2.5">
                      <CourseTableActions>
                        <CourseIconActionButton
                          label={t('common.actions.edit', 'Edit')}
                          icon={<Pencil className="h-4 w-4" />}
                          onClick={() => {
                            setEditingSection(section);
                            setSaveError(null);
                            setIsSectionEditOpen(true);
                          }}
                        />
                        <CourseIconActionButton
                          label={t('common.actions.delete', 'Delete')}
                          icon={<Trash2 className="h-4 w-4" />}
                          tone="danger"
                          onClick={() => void handleDeleteSection(section)}
                        />
                      </CourseTableActions>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CourseTablePanel>

        <CourseTablePanel>
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-white/10">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                {t('admin.course.content.lessons.title', 'Lessons')}
              </h3>
              <p className="text-xs text-slate-400">
                {t('admin.course.content.lessons.count', 'Lessons: {{total}}', {
                  total: formatCourseCount(lessons.length),
                })}
              </p>
            </div>
            <CoursePrimaryButton
              label={t('admin.course.content.lessons.add', 'Create lesson')}
              icon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => {
                setEditingLesson(null);
                setSaveError(null);
                setIsLessonCreateOpen(true);
              }}
            />
          </div>
          {lessons.length === 0 ? (
            <CourseEmptyState title={t('admin.course.content.lessons.empty', 'No lessons in this course')} />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left dark:border-white/10">
                  <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.course.content.lessons.column.title', 'Title')}</th>
                  <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.course.content.lessons.column.section', 'Section')}</th>
                  <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.course.content.lessons.column.kind', 'Kind')}</th>
                  <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.course.content.lessons.column.duration', 'Duration')}</th>
                  <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.course.content.lessons.column.freePreview', 'Free preview')}</th>
                  <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.course.content.lessons.column.status', 'Status')}</th>
                  <th className="px-4 py-2.5 text-right font-medium text-slate-500">{t('admin.course.content.lessons.column.actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {lessons.map((lesson) => (
                  <tr key={lesson.id} className="border-b border-slate-50 hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/5">
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-slate-900 dark:text-white">{lesson.title}</p>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                      {sectionTitleById.get(lesson.sectionId ?? '') ?? '-'}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{courseKindLabel(lesson.kind, t)}</td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{formatCourseDuration(lesson.durationSeconds)}</td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                      {lesson.freePreview
                        ? t('admin.course.content.lessons.freePreviewYes', 'Yes')
                        : t('admin.course.content.lessons.freePreviewNo', 'No')}
                    </td>
                    <td className="px-4 py-2.5"><CourseStatusBadge status={lesson.status} /></td>
                    <td className="px-4 py-2.5">
                      <CourseTableActions>
                        <CourseIconActionButton
                          label={t('common.actions.edit', 'Edit')}
                          icon={<Pencil className="h-4 w-4" />}
                          onClick={() => {
                            setEditingLesson(lesson);
                            setSaveError(null);
                            setIsLessonEditOpen(true);
                          }}
                        />
                        <CourseIconActionButton
                          label={t('admin.course.content.lessons.attachments', 'Attachments')}
                          icon={<Paperclip className="h-4 w-4" />}
                          onClick={() => {
                            setSaveError(null);
                            setAttachmentLesson(lesson);
                          }}
                        />
                        <CourseIconActionButton
                          label={t('common.actions.delete', 'Delete')}
                          icon={<Trash2 className="h-4 w-4" />}
                          tone="danger"
                          onClick={() => void handleDeleteLesson(lesson)}
                        />
                      </CourseTableActions>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CourseTablePanel>
      </div>

      <CourseDrawer
        title={t('admin.course.content.sections.addTitle', 'Create section')}
        isOpen={isSectionCreateOpen}
        onClose={closeSectionDrawers}
        footer={(
          <CourseFormActions
            submitLabel={t('admin.course.content.sections.form.submit', 'Create section')}
            isSaving={isSaving}
            submitFormId="course-section-form"
            onCancel={closeSectionDrawers}
          />
        )}
      >
        <CourseSectionForm
          error={saveError}
          onSubmit={(input) => void handleSaveSection(input)}
        />
      </CourseDrawer>

      <CourseDrawer
        title={t('admin.course.content.sections.editTitle', 'Edit section')}
        description={editingSection?.title}
        isOpen={isSectionEditOpen}
        onClose={closeSectionDrawers}
        footer={(
          <CourseFormActions
            submitLabel={t('admin.course.content.sections.form.updateSubmit', 'Update section')}
            isSaving={isSaving}
            submitFormId="course-section-form"
            onCancel={closeSectionDrawers}
          />
        )}
      >
        <CourseSectionForm
          error={saveError}
          initialValue={editingSection}
          onSubmit={(input) => void handleSaveSection(input)}
        />
      </CourseDrawer>

      <CourseDrawer
        title={t('admin.course.content.lessons.addTitle', 'Create lesson')}
        isOpen={isLessonCreateOpen}
        onClose={closeLessonDrawers}
        footer={(
          <CourseFormActions
            submitLabel={t('admin.course.content.lessons.form.submit', 'Create lesson')}
            isSaving={isSaving}
            submitFormId="course-lesson-form"
            onCancel={closeLessonDrawers}
          />
        )}
      >
        <CourseLessonForm
          error={saveError}
          sections={sections}
          onSubmit={(input) => void handleSaveLesson(input)}
        />
      </CourseDrawer>

      <CourseDrawer
        title={t('admin.course.content.lessons.editTitle', 'Edit lesson')}
        description={editingLesson?.title}
        isOpen={isLessonEditOpen}
        onClose={closeLessonDrawers}
        footer={(
          <CourseFormActions
            submitLabel={t('admin.course.content.lessons.form.updateSubmit', 'Update lesson')}
            isSaving={isSaving}
            submitFormId="course-lesson-form"
            onCancel={closeLessonDrawers}
          />
        )}
      >
        <CourseLessonForm
          error={saveError}
          sections={sections}
          initialValue={editingLesson}
          onSubmit={(input) => void handleSaveLesson(input)}
        />
      </CourseDrawer>

      {attachmentLesson ? (
        <CourseAttachmentsDrawer
          key={attachmentLesson.id}
          lesson={attachmentLesson}
          onClose={closeAttachmentDrawer}
        />
      ) : null}
    </CourseAdminPageShell>
  );
}

interface CourseSectionFormProps {
  error: string | null;
  initialValue?: CourseAdminSectionItem | null;
  onSubmit: (input: CourseAdminSectionMutationInput) => void;
}

function CourseSectionForm({ error, initialValue, onSubmit }: CourseSectionFormProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState(initialValue?.title ?? '');
  const [description, setDescription] = useState(initialValue?.description ?? '');

  return (
    <CourseFormFrame
      error={error}
      formId="course-section-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({ title, description });
      }}
    >
      <CourseTextField
        label={t('admin.course.content.sections.form.title', 'Title')}
        value={title}
        required
        onChange={setTitle}
      />
      <CourseTextAreaField
        label={t('admin.course.content.sections.form.description', 'Description')}
        value={description}
        onChange={setDescription}
      />
    </CourseFormFrame>
  );
}

interface CourseLessonFormProps {
  error: string | null;
  sections: CourseAdminSectionItem[];
  initialValue?: CourseAdminLessonItem | null;
  onSubmit: (input: CourseAdminLessonMutationInput) => void;
}

function CourseLessonForm({ error, sections, initialValue, onSubmit }: CourseLessonFormProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState(initialValue?.title ?? '');
  const [sectionId, setSectionId] = useState(initialValue?.sectionId ?? '');
  const [kind, setKind] = useState(initialValue?.kind ?? 'vod_video');
  const [freePreview, setFreePreview] = useState(initialValue?.freePreview ?? false);
  const [externalSourceId, setExternalSourceId] = useState(initialValue?.externalSourceId ?? '');
  const [sourceProvider, setSourceProvider] = useState(initialValue?.sourceProvider ?? '');
  const [description, setDescription] = useState('');

  return (
    <CourseFormFrame
      error={error}
      formId="course-lesson-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({
          title,
          sectionId,
          description,
          kind,
          freePreview,
          externalSourceId,
          sourceProvider,
        });
      }}
    >
      <CourseTextField
        label={t('admin.course.content.lessons.form.title', 'Title')}
        value={title}
        required
        onChange={setTitle}
      />
      <CourseSelectField
        label={t('admin.course.content.lessons.form.section', 'Section')}
        value={sectionId}
        options={sections.map((section) => ({ value: section.id, label: section.title }))}
        placeholder={t('admin.course.content.lessons.form.sectionNone', 'No section')}
        onChange={setSectionId}
      />
      <CourseSelectField
        label={t('admin.course.content.lessons.form.kind', 'Kind')}
        value={kind}
        options={COURSE_LESSON_KIND_OPTIONS.map((value) => ({ value, label: courseKindLabel(value, t) }))}
        onChange={setKind}
      />
      <CourseCheckboxField
        label={t('admin.course.content.lessons.form.freePreview', 'Free preview')}
        checked={freePreview}
        onChange={setFreePreview}
      />
      <CourseTextField
        label={t('admin.course.content.lessons.form.externalSourceId', 'External source id')}
        value={externalSourceId}
        onChange={setExternalSourceId}
      />
      <CourseTextField
        label={t('admin.course.content.lessons.form.sourceProvider', 'Source provider')}
        value={sourceProvider}
        onChange={setSourceProvider}
      />
      <CourseTextAreaField
        label={t('admin.course.content.lessons.form.description', 'Description')}
        value={description}
        onChange={setDescription}
      />
    </CourseFormFrame>
  );
}

interface CourseAttachmentsDrawerProps {
  lesson: CourseAdminLessonItem;
  onClose: () => void;
}

function CourseAttachmentsDrawer({ lesson, onClose }: CourseAttachmentsDrawerProps) {
  const { t } = useTranslation();
  const [resources, setResources] = useState<CourseAdminResourceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isResourceFormOpen, setIsResourceFormOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<CourseAdminResourceItem | null>(null);
  const requestIdRef = useRef(0);

  const loadResources = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);
    try {
      const items = await fetchCourseAdminResources(lesson.id);
      if (requestId !== requestIdRef.current) {
        return;
      }
      setResources(items);
    } catch (loadError) {
      if (requestId === requestIdRef.current) {
        setError(
          resolveProblemMessage(
            loadError,
            t,
            t('admin.course.content.attachments.error', 'Lesson attachments could not be loaded'),
          ),
        );
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [lesson.id, t]);

  useEffect(() => {
    void loadResources();
    return () => {
      requestIdRef.current += 1;
    };
  }, [loadResources]);

  const closeResourceForm = () => {
    setIsResourceFormOpen(false);
    setEditingResource(null);
    setSaveError(null);
  };

  const handleSaveResource = async (input: CourseAdminResourceMutationInput) => {
    setIsSaving(true);
    setSaveError(null);
    try {
      if (editingResource) {
        await updateCourseAdminResource(editingResource.id, input);
      } else {
        await createCourseAdminResource(lesson.id, input);
      }
      closeResourceForm();
      await loadResources();
    } catch (saveFailure) {
      setSaveError(saveFailure instanceof Error ? saveFailure.message : String(saveFailure));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteResource = async (resource: CourseAdminResourceItem) => {
    if (!confirmCourseAction(
      t('admin.course.content.attachments.deleteConfirm', 'Delete attachment "{{name}}"?', {
        name: resource.fileName ?? resource.driveResourceId ?? resource.id,
      }),
    )) {
      return;
    }
    await deleteCourseAdminResource(resource.id);
    await loadResources();
  };

  return (
    <CourseDrawer
      title={t('admin.course.content.attachments.title', 'Attachments')}
      description={lesson.title}
      isOpen
      onClose={onClose}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-slate-400">
            {t('admin.course.content.attachments.count', 'Attachments: {{total}}', {
              total: formatCourseCount(resources.length),
            })}
          </span>
          <CoursePrimaryButton
            label={t('admin.course.content.attachments.add', 'Create attachment')}
            icon={<Plus className="h-3.5 w-3.5" />}
            onClick={() => {
              setEditingResource(null);
              setSaveError(null);
              setIsResourceFormOpen(true);
            }}
          />
        </div>

        {isResourceFormOpen ? (
          <CourseResourceForm
            error={saveError}
            isSaving={isSaving}
            initialValue={editingResource}
            onCancel={closeResourceForm}
            onSubmit={(input) => void handleSaveResource(input)}
          />
        ) : null}

        {isLoading ? (
          <BusinessStatePanel
            kind="loading"
            title={t('admin.course.loading', 'Loading course records...')}
            className="min-h-48"
          />
        ) : error ? (
          <BusinessStatePanel
            kind="error"
            title={t('admin.course.error', 'Course data could not be loaded')}
            description={error}
            onRetry={() => void loadResources()}
            retryLabel={t('common.actions.retry', 'Retry')}
            className="min-h-48"
          />
        ) : resources.length === 0 ? (
          <CourseEmptyState title={t('admin.course.content.attachments.empty', 'No attachments for this lesson')} />
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left dark:border-white/10">
                  <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.course.content.attachments.column.fileName', 'File name')}</th>
                  <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.course.content.attachments.column.resourceRole', 'Role')}</th>
                  <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.course.content.attachments.column.resourceKind', 'Kind')}</th>
                  <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.course.content.attachments.column.mimeType', 'MIME type')}</th>
                  <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.course.content.attachments.column.status', 'Status')}</th>
                  <th className="px-4 py-2.5 text-right font-medium text-slate-500">{t('admin.course.content.attachments.column.actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {resources.map((resource) => (
                  <tr key={resource.id} className="border-b border-slate-50 hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/5">
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-slate-900 dark:text-white">{resource.fileName ?? '-'}</p>
                      {resource.driveResourceId ? (
                        <p className="truncate text-xs text-slate-400">{resource.driveResourceId}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{resource.resourceRole}</td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{resource.resourceKind}</td>
                    <td className="px-4 py-2.5 text-slate-500">{resource.mimeType ?? '-'}</td>
                    <td className="px-4 py-2.5"><CourseStatusBadge status={resource.status} /></td>
                    <td className="px-4 py-2.5">
                      <CourseTableActions>
                        <CourseIconActionButton
                          label={t('common.actions.edit', 'Edit')}
                          icon={<Pencil className="h-4 w-4" />}
                          onClick={() => {
                            setEditingResource(resource);
                            setSaveError(null);
                            setIsResourceFormOpen(true);
                          }}
                        />
                        <CourseIconActionButton
                          label={t('common.actions.delete', 'Delete')}
                          icon={<Trash2 className="h-4 w-4" />}
                          tone="danger"
                          onClick={() => void handleDeleteResource(resource)}
                        />
                      </CourseTableActions>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </CourseDrawer>
  );
}

interface CourseResourceFormProps {
  error: string | null;
  isSaving: boolean;
  initialValue?: CourseAdminResourceItem | null;
  onCancel: () => void;
  onSubmit: (input: CourseAdminResourceMutationInput) => void;
}

function CourseResourceForm({
  error,
  isSaving,
  initialValue,
  onCancel,
  onSubmit,
}: CourseResourceFormProps) {
  const { t } = useTranslation();
  const [driveResourceId, setDriveResourceId] = useState(initialValue?.driveResourceId ?? '');
  const [resourceRole, setResourceRole] = useState(initialValue?.resourceRole ?? 'attachment');
  const [resourceKind, setResourceKind] = useState(initialValue?.resourceKind ?? 'drive');
  const [fileName, setFileName] = useState(initialValue?.fileName ?? '');
  const [mimeType, setMimeType] = useState(initialValue?.mimeType ?? '');

  return (
    <CourseFormFrame
      error={error}
      formId="course-resource-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({ driveResourceId, resourceRole, resourceKind, fileName, mimeType });
      }}
    >
      <CourseTextField
        label={t('admin.course.content.attachments.form.driveResourceId', 'Drive resource id')}
        value={driveResourceId}
        required
        onChange={setDriveResourceId}
      />
      <CourseTextField
        label={t('admin.course.content.attachments.form.resourceRole', 'Resource role')}
        value={resourceRole}
        required
        onChange={setResourceRole}
      />
      <CourseTextField
        label={t('admin.course.content.attachments.form.resourceKind', 'Resource kind')}
        value={resourceKind}
        required
        onChange={setResourceKind}
      />
      <CourseTextField
        label={t('admin.course.content.attachments.form.fileName', 'File name')}
        value={fileName}
        onChange={setFileName}
      />
      <CourseTextField
        label={t('admin.course.content.attachments.form.mimeType', 'MIME type')}
        value={mimeType}
        onChange={setMimeType}
      />
      <CourseFormActions
        submitLabel={initialValue
          ? t('admin.course.content.attachments.form.updateSubmit', 'Update attachment')
          : t('admin.course.content.attachments.form.submit', 'Create attachment')}
        isSaving={isSaving}
        submitFormId="course-resource-form"
        onCancel={onCancel}
      />
    </CourseFormFrame>
  );
}
