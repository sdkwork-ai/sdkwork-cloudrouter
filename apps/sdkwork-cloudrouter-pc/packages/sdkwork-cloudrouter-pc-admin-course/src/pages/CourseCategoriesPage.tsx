import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Plus, Trash2 } from 'lucide-react';
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
  createCourseAdminCategory,
  deleteCourseAdminCategory,
  fetchCourseAdminCategories,
  updateCourseAdminCategory,
  type CourseAdminCategoryItem,
  type CourseAdminCategoryMutationInput,
} from '../courseService';
import { useCourseAdminList } from '../useCourseAdminList';

const COURSE_CATEGORY_STATUS_OPTIONS = ['active', 'disabled'];

const courseCategoryStatusLabels: Record<string, string> = {
  active: 'Active',
  disabled: 'Disabled',
};

export function CourseCategoriesPage() {
  const { t } = useTranslation();
  const list = useCourseAdminList(
    fetchCourseAdminCategories,
    t('admin.course.categories.error', 'Course categories could not be loaded'),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<CourseAdminCategoryItem | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const closeDrawers = () => {
    setIsCreateOpen(false);
    setIsEditOpen(false);
    setEditingCategory(null);
    setSaveError(null);
  };

  const handleSave = async (input: CourseAdminCategoryMutationInput) => {
    setIsSaving(true);
    setSaveError(null);
    try {
      if (editingCategory) {
        await updateCourseAdminCategory(editingCategory.id, input);
      } else {
        await createCourseAdminCategory(input);
      }
      closeDrawers();
      await list.reload();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (category: CourseAdminCategoryItem) => {
    if (!confirmCourseAction(
      t('admin.course.categories.deleteConfirm', 'Delete category "{{name}}"?', { name: category.name }),
    )) {
      return;
    }
    await deleteCourseAdminCategory(category.id);
    await list.reload();
  };

  return (
    <CourseAdminPageShell
      isLoading={list.isLoading}
      error={list.error}
      onRefresh={() => void list.reload()}
      actions={(
        <CoursePrimaryButton
          label={t('admin.course.categories.add', 'Create category')}
          icon={<Plus className="h-3.5 w-3.5" />}
          onClick={() => {
            setEditingCategory(null);
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
        statusOptions={COURSE_CATEGORY_STATUS_OPTIONS.map((value) => ({
          value,
          label: t(`admin.course.status.${value}`, courseCategoryStatusLabels[value] ?? value),
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
          <CourseEmptyState title={t('admin.course.categories.empty', 'No categories yet')} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left dark:border-white/10">
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.course.categories.column.name', 'Name')}</th>
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.course.categories.column.slug', 'Slug')}</th>
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.course.categories.column.sortOrder', 'Sort order')}</th>
                <th className="px-4 py-2.5 font-medium text-slate-500">{t('admin.course.categories.column.status', 'Status')}</th>
                <th className="px-4 py-2.5 text-right font-medium text-slate-500">{t('admin.course.categories.column.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {list.items.map((category) => (
                <tr key={category.id} className="border-b border-slate-50 hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/5">
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-slate-900 dark:text-white">{category.name}</p>
                    {category.description ? (
                      <p className="truncate text-xs text-slate-400">{category.description}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">{category.slug || '-'}</td>
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{category.sortOrder}</td>
                  <td className="px-4 py-2.5"><CourseStatusBadge status={category.status} /></td>
                  <td className="px-4 py-2.5">
                    <CourseTableActions>
                      <CourseIconActionButton
                        label={t('common.actions.edit', 'Edit')}
                        icon={<Pencil className="h-4 w-4" />}
                        onClick={() => {
                          setEditingCategory(category);
                          setSaveError(null);
                          setIsEditOpen(true);
                        }}
                      />
                      <CourseIconActionButton
                        label={t('common.actions.delete', 'Delete')}
                        icon={<Trash2 className="h-4 w-4" />}
                        tone="danger"
                        onClick={() => void handleDelete(category)}
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
        title={t('admin.course.categories.addTitle', 'Create category')}
        isOpen={isCreateOpen}
        onClose={closeDrawers}
        footer={(
          <CourseFormActions
            submitLabel={t('admin.course.categories.form.submit', 'Create category')}
            isSaving={isSaving}
            submitFormId="course-category-form"
            onCancel={closeDrawers}
          />
        )}
      >
        <CourseCategoryForm
          error={saveError}
          onSubmit={(input) => void handleSave(input)}
        />
      </CourseDrawer>

      <CourseDrawer
        title={t('admin.course.categories.editTitle', 'Edit category')}
        description={editingCategory?.name}
        isOpen={isEditOpen}
        onClose={closeDrawers}
        footer={(
          <CourseFormActions
            submitLabel={t('admin.course.categories.form.updateSubmit', 'Update category')}
            isSaving={isSaving}
            submitFormId="course-category-form"
            onCancel={closeDrawers}
          />
        )}
      >
        <CourseCategoryForm
          error={saveError}
          initialValue={editingCategory}
          onSubmit={(input) => void handleSave(input)}
        />
      </CourseDrawer>
    </CourseAdminPageShell>
  );
}

interface CourseCategoryFormProps {
  error: string | null;
  initialValue?: CourseAdminCategoryItem | null;
  onSubmit: (input: CourseAdminCategoryMutationInput) => void;
}

function CourseCategoryForm({ error, initialValue, onSubmit }: CourseCategoryFormProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(initialValue?.name ?? '');
  const [slug, setSlug] = useState(initialValue?.slug ?? '');
  const [description, setDescription] = useState(initialValue?.description ?? '');

  return (
    <CourseFormFrame
      error={error}
      formId="course-category-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({ name, slug, description });
      }}
    >
      <CourseTextField
        label={t('admin.course.categories.form.name', 'Name')}
        value={name}
        required
        onChange={setName}
      />
      <CourseTextField
        label={t('admin.course.categories.form.slug', 'Slug')}
        value={slug}
        onChange={setSlug}
      />
      <CourseTextAreaField
        label={t('admin.course.categories.form.description', 'Description')}
        value={description}
        onChange={setDescription}
      />
    </CourseFormFrame>
  );
}
