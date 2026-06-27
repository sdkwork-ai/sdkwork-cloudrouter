import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BookText, Code2, Edit2, FileText, FolderPlus, Loader2, Play, Plus, Rocket, Tags, Trash2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  AdminCategoryManagementSidebar,
  AdminResourceCenter,
  ConfirmDialog,
  readAdminResourceRecordList,
  type AdminResourceRecord,
  type AdminResourceSection,
} from '@sdkwork/clawroutes-pc-commons';
import {
  attachAdminCategoryNamesToResult,
  createAdminAiCategory,
  deleteAdminAiCategory,
  formatAdminCategoryOptionLabel,
  listAdminAiCategoryOptions,
  updateAdminAiCategory,
  type AdminCategoryOption,
  type AdminAiCategoryCreateInput,
  type AdminAiCategoryUpdateInput,
} from '@sdkwork/clawrouter-pc-admin-core';
import {
  formatAdminResourceOptionLabel,
  readAdminResourceOptions,
  type AdminResourceOption,
} from '@sdkwork/clawroutes-pc-commons/runtime';
import {
  DEFAULT_PROMPT_PAGE_PARAMS,
  createPrompt,
  createPromptBinding,
  createPromptVersion,
  listPromptBindings,
  listPromptVersions,
  listPrompts,
  publishPromptVersion,
  renderPromptVersion,
  updatePromptBinding,
  type AdminPromptBindingCreateInput,
  type AdminPromptBindingUpdateInput,
  type AdminPromptCreateInput,
  type AdminPromptRenderInput,
  type AdminPromptVersionCreateInput,
} from './promptService';

type PromptAdminSectionId = 'prompts';
type PromptAdminGroup = string;
type PromptDetailTabId = 'overview' | 'versions' | 'usage';
type PromptDialogKind = 'createPrompt' | 'createVersion' | 'publishVersion' | 'renderVersion' | 'createBinding' | 'updateBinding' | 'createCategory' | 'editCategory';
type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
type JsonObject = Record<string, JsonValue>;
type TranslationFn = ReturnType<typeof useTranslation>['t'];
type CategoryModalState = {
  category: AdminCategoryOption | null;
  parentId: string | null;
} | null;

const PROMPT_BINDING_NULL_VERSION_VALUE = '__sdkwork_prompt_binding_null_version__';

export function PromptsAdmin() {
  const { t } = useTranslation();
  const [promptId, setPromptId] = useState('');
  const [selectedPromptRecord, setSelectedPromptRecord] = useState<AdminResourceRecord | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [categoryOptions, setCategoryOptions] = useState<AdminCategoryOption[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoryLoadError, setCategoryLoadError] = useState<string | null>(null);
  const [promptOptions, setPromptOptions] = useState<AdminResourceOption[]>([]);
  const [promptLoadError, setPromptLoadError] = useState<string | null>(null);
  const [versionOptions, setVersionOptions] = useState<AdminResourceOption[]>([]);
  const [versionRecords, setVersionRecords] = useState<AdminResourceRecord[]>([]);
  const [versionLoadError, setVersionLoadError] = useState<string | null>(null);
  const [bindingOptions, setBindingOptions] = useState<AdminResourceOption[]>([]);
  const [bindingRecords, setBindingRecords] = useState<AdminResourceRecord[]>([]);
  const [bindingLoadError, setBindingLoadError] = useState<string | null>(null);
  const [dialogKind, setDialogKind] = useState<PromptDialogKind | null>(null);
  const [categoryModalState, setCategoryModalState] = useState<CategoryModalState>(null);
  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState<AdminCategoryOption | null>(null);
  const [categorySubmitting, setCategorySubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const scopedPromptId = promptId.trim();
  const scopedCategoryId = selectedCategoryId.trim();
  const refresh = useCallback(() => setRefreshKey((current) => current + 1), []);
  const closeDialog = useCallback(() => {
    setDialogKind(null);
    setCategoryModalState(null);
  }, []);
  const loadPromptOptions = useCallback(async (isActive: () => boolean = () => true) => {
    try {
      const result = await listPrompts({ ...DEFAULT_PROMPT_PAGE_PARAMS, categoryId: scopedCategoryId || undefined });
      const options = readAdminResourceOptions(result, {
        idKey: 'id',
        labelKeys: ['name', 'promptKey'],
        detailKeys: ['promptKey', 'status'],
      });
      if (isActive()) {
        setPromptOptions(options);
        setPromptLoadError(null);
      }
    } catch (caught) {
      if (isActive()) {
        setPromptOptions([]);
        setPromptLoadError(errorMessage(caught, t('admin.prompts.scopeLoadError', 'Prompt options could not be loaded.')));
      }
    }
  }, [scopedCategoryId, t]);
  const loadCategoryOptions = useCallback(async (isActive: () => boolean = () => true) => {
    if (isActive()) {
      setCategoriesLoading(true);
    }
    try {
      const options = await listAdminAiCategoryOptions();
      if (isActive()) {
        setCategoryOptions(options);
        setCategoryLoadError(null);
      }
    } catch (caught) {
      if (isActive()) {
        setCategoryOptions([]);
        setCategoryLoadError(errorMessage(caught, t('admin.prompts.categoryLoadError', 'Prompt categories could not be loaded.')));
      }
    } finally {
      if (isActive()) {
        setCategoriesLoading(false);
      }
    }
  }, [t]);
  const loadPromptVersionOptions = useCallback(async (targetPromptId: string, isActive: () => boolean = () => true) => {
    const normalizedPromptId = targetPromptId.trim();
    if (!normalizedPromptId) {
      if (isActive()) {
        setVersionOptions([]);
        setVersionRecords([]);
        setVersionLoadError(null);
      }
      return;
    }
    try {
      const result = await listPromptVersions(normalizedPromptId);
      const options = readAdminResourceOptions(result, {
        idKey: 'id',
        labelKeys: ['title', 'versionNo'],
        detailKeys: ['versionNo', 'lifecycleStatus', 'reviewStatus'],
      });
      if (isActive()) {
        setVersionOptions(options);
        setVersionRecords(readAdminResourceRecordList(result));
        setVersionLoadError(null);
      }
    } catch (caught) {
      if (isActive()) {
        setVersionOptions([]);
        setVersionRecords([]);
        setVersionLoadError(errorMessage(caught, t('admin.prompts.versionScopeLoadError')));
      }
    }
  }, [t]);
  const loadPromptBindingOptions = useCallback(async (targetPromptId: string, isActive: () => boolean = () => true) => {
    const normalizedPromptId = targetPromptId.trim();
    if (!normalizedPromptId) {
      if (isActive()) {
        setBindingOptions([]);
        setBindingRecords([]);
        setBindingLoadError(null);
      }
      return;
    }
    try {
      const result = await listPromptBindings(normalizedPromptId);
      const options = readAdminResourceOptions(result, {
        idKey: 'id',
        labelKeys: ['ownerType', 'ownerId'],
        detailKeys: ['bindingRole', 'priority', 'enabled'],
      });
      if (isActive()) {
        setBindingOptions(options);
        setBindingRecords(readAdminResourceRecordList(result));
        setBindingLoadError(null);
      }
    } catch (caught) {
      if (isActive()) {
        setBindingOptions([]);
        setBindingRecords([]);
        setBindingLoadError(errorMessage(caught, t('admin.prompts.bindingScopeLoadError', 'Prompt bindings could not be loaded.')));
      }
    }
  }, [t]);
  const refreshPromptResources = useCallback(() => {
    refresh();
    void loadPromptOptions();
  }, [loadPromptOptions, refresh]);
  const refreshCategories = useCallback(() => {
    void loadCategoryOptions();
  }, [loadCategoryOptions]);
  const openCreateCategory = useCallback((parentId: string | null = selectedCategoryId || null) => {
    setCategoryModalState({ category: null, parentId });
    setDialogKind('createCategory');
  }, [selectedCategoryId]);
  const openEditCategory = useCallback((category: AdminCategoryOption) => {
    setCategoryModalState({ category, parentId: category.parentId });
    setDialogKind('editCategory');
  }, []);
  const sections = useMemo(() => buildPromptSections(t, scopedCategoryId, categoryOptions, {
    onCreatePrompt: () => setDialogKind('createPrompt'),
  }), [categoryOptions, scopedCategoryId, t]);
  const categoryUsage = useMemo(() => buildCategoryUsage(categoryOptions, promptOptions), [categoryOptions, promptOptions]);
  const handleOpenPromptDetail = useCallback((record: AdminResourceRecord) => {
    const recordPromptId = normalizeRecordId(record.id);
    if (!recordPromptId) {
      return;
    }
    setPromptId(recordPromptId);
    setSelectedPromptRecord(record);
  }, []);

  useEffect(() => {
    let active = true;
    void loadPromptOptions(() => active);
    return () => {
      active = false;
    };
  }, [loadPromptOptions]);

  useEffect(() => {
    setPromptId('');
    setSelectedPromptRecord(null);
  }, [scopedCategoryId]);

  useEffect(() => {
    let active = true;
    void loadCategoryOptions(() => active);
    return () => {
      active = false;
    };
  }, [loadCategoryOptions]);

  useEffect(() => {
    let active = true;
    void loadPromptVersionOptions(scopedPromptId, () => active);
    void loadPromptBindingOptions(scopedPromptId, () => active);
    return () => {
      active = false;
    };
  }, [loadPromptBindingOptions, loadPromptVersionOptions, refreshKey, scopedPromptId]);

  const handleDeleteCategory = useCallback(async () => {
    if (!deleteCategoryTarget) {
      return;
    }
    setCategorySubmitting(true);
    try {
      await deleteAdminAiCategory(deleteCategoryTarget.id);
      if (selectedCategoryId === deleteCategoryTarget.id) {
        setSelectedCategoryId('');
      }
      setDeleteCategoryTarget(null);
      refreshCategories();
      refreshPromptResources();
    } finally {
      setCategorySubmitting(false);
    }
  }, [deleteCategoryTarget, refreshCategories, refreshPromptResources, selectedCategoryId]);

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col gap-2 overflow-hidden" data-admin-prompts="prompt-management">
      <StatusMessages messages={[promptLoadError, categoryLoadError, versionLoadError, bindingLoadError]} />
      <div className="grid min-h-0 min-w-0 flex-1 gap-3 overflow-hidden lg:grid-cols-[280px_minmax(0,1fr)]">
        <AdminCategoryManagementSidebar
          categories={categoryOptions}
          dataAttribute="admin-prompts-category-management"
          labels={categorySidebarLabels(t, 'admin.prompts')}
          loading={categoriesLoading}
          onCreateChild={(category) => openCreateCategory(category.id)}
          onCreateRoot={() => openCreateCategory(null)}
          onDeleteCategory={setDeleteCategoryTarget}
          onEditCategory={openEditCategory}
          onSelect={setSelectedCategoryId}
          selectedCategoryId={selectedCategoryId}
          usageCountByCategoryId={categoryUsage}
        />
        <div
          className={`grid min-h-0 min-w-0 gap-2 overflow-hidden ${scopedPromptId ? 'xl:grid-cols-[minmax(0,1fr)_420px]' : ''}`}
          data-admin-prompts-content
        >
          <AdminResourceCenter<PromptAdminSectionId, PromptAdminGroup>
            emptyDescription={t('admin.prompts.empty.desc', 'No prompt records match the current filters.')}
            emptyTitle={t('admin.prompts.empty.title', 'No prompt records')}
            errorTitle={t('admin.prompts.error.title', 'Prompt data could not be loaded')}
            loadingTitle={t('admin.prompts.loading', 'Loading prompt records...')}
            onRecordOpen={handleOpenPromptDetail}
            recordActionColumnLabel={t('common.columns.actions', 'Actions')}
            recordOpenLabel={t('admin.prompts.actions.openDetail', 'Details')}
            refreshKey={`${refreshKey}:${scopedCategoryId}`}
            reloadLabel={t('common.actions.reload')}
            searchPlaceholder={t('admin.prompts.search.placeholder')}
            sections={sections}
            showSectionNavigation={false}
            tableViewportDataAttribute="admin-prompts-table"
          />
          {scopedPromptId ? (
            <PromptDetailPanel
              bindingError={bindingLoadError}
              bindingRecords={bindingRecords}
              onClose={() => {
                setPromptId('');
                setSelectedPromptRecord(null);
              }}
              onCreateBinding={() => setDialogKind('createBinding')}
              onCreateVersion={() => setDialogKind('createVersion')}
              onPublishVersion={() => setDialogKind('publishVersion')}
              onRenderVersion={() => setDialogKind('renderVersion')}
              onUpdateBinding={() => setDialogKind('updateBinding')}
              promptId={scopedPromptId}
              promptOptions={promptOptions}
              promptRecord={selectedPromptRecord}
              t={t}
              versionError={versionLoadError}
              versionRecords={versionRecords}
            />
          ) : null}
        </div>
      </div>

      {dialogKind === 'createPrompt' ? (
        <CreatePromptDialog categoryOptions={categoryOptions} onClose={closeDialog} onSuccess={refreshPromptResources} t={t} />
      ) : null}
      {dialogKind === 'createVersion' ? (
        <CreatePromptVersionDialog defaultPromptId={scopedPromptId} onClose={closeDialog} onSuccess={refresh} promptOptions={promptOptions} t={t} />
      ) : null}
      {dialogKind === 'publishVersion' ? (
        <PublishPromptVersionDialog onClose={closeDialog} onSuccess={refresh} t={t} versionOptions={versionOptions} />
      ) : null}
      {dialogKind === 'renderVersion' ? (
        <RenderPromptVersionDialog onClose={closeDialog} t={t} versionOptions={versionOptions} />
      ) : null}
      {dialogKind === 'createBinding' ? (
        <CreatePromptBindingDialog
          defaultPromptId={scopedPromptId}
          onClose={closeDialog}
          onSuccess={refresh}
          promptOptions={promptOptions}
          t={t}
          versionOptions={versionOptions}
        />
      ) : null}
      {dialogKind === 'updateBinding' ? (
        <UpdatePromptBindingDialog
          bindingOptions={bindingOptions}
          onClose={closeDialog}
          onSuccess={refresh}
          t={t}
          versionOptions={versionOptions}
        />
      ) : null}
      {(dialogKind === 'createCategory' || dialogKind === 'editCategory') && categoryModalState ? (
        <PromptCategoryDialog
          category={categoryModalState.category}
          categories={categoryOptions}
          onClose={closeDialog}
          onSuccess={() => {
            refreshCategories();
            refreshPromptResources();
          }}
          parentId={categoryModalState.parentId}
          t={t}
        />
      ) : null}
      {deleteCategoryTarget ? (
        <ConfirmDialog
          cancelLabel={t('common.actions.cancel')}
          confirmLabel={t('admin.prompts.category.deleteConfirm', 'Delete')}
          description={t('admin.prompts.category.deleteDescription', { name: deleteCategoryTarget.name })}
          icon={<Trash2 className="h-4 w-4" />}
          isBusy={categorySubmitting}
          onCancel={() => setDeleteCategoryTarget(null)}
          onConfirm={handleDeleteCategory}
          title={t('admin.prompts.category.deleteTitle', 'Delete category')}
          tone="danger"
        />
      ) : null}
    </div>
  );
}

function buildPromptSections(
  t: ReturnType<typeof useTranslation>['t'],
  categoryId: string,
  categoryOptions: readonly AdminCategoryOption[],
  actions: {
    onCreatePrompt: () => void;
  },
): AdminResourceSection<PromptAdminSectionId, PromptAdminGroup>[] {
  return [
    {
      id: 'prompts',
      title: t('admin.prompts.sections.prompts.title', 'Prompt Library'),
      description: t('admin.prompts.sections.prompts.desc', 'Reusable prompt definitions classified by unified category references.'),
      icon: <BookText className="h-4 w-4" />,
      group: t('admin.prompts.group.assets', 'Assets'),
      load: async () => attachAdminCategoryNamesToResult(
        await listPrompts({ ...DEFAULT_PROMPT_PAGE_PARAMS, categoryId: categoryId || undefined }),
        categoryOptions,
      ),
      action: {
        icon: <Plus className="h-4 w-4" />,
        label: t('admin.prompts.actions.createPrompt', 'Create Prompt'),
        onClick: actions.onCreatePrompt,
      },
      columns: [
        { key: 'promptKey', label: t('admin.prompts.columns.promptKey', 'Prompt Key') },
        { key: 'name', label: t('admin.prompts.columns.name', 'Name') },
        { key: 'categoryName', label: t('admin.prompts.columns.category', 'Category') },
        { key: 'promptType', label: t('admin.prompts.columns.type', 'Type') },
        { key: 'visibility', label: t('admin.prompts.columns.visibility', 'Visibility') },
        { key: 'status', label: t('admin.prompts.columns.status', 'Status') },
        { key: 'updatedAt', label: t('admin.prompts.columns.updatedAt', 'Updated') },
      ],
      searchFields: ['promptKey', 'name', 'description', 'categoryName', 'categoryCode', 'promptType', 'visibility', 'status'],
    },
  ];
}

function formatPromptBindingVersionCell(value: unknown, t: TranslationFn): string {
  if (value === null || value === undefined || value === '') {
    return t('admin.prompts.scope.defaultVersionLabel', 'Default resolution');
  }
  return String(value);
}

function PromptDetailPanel({
  bindingError,
  bindingRecords,
  onClose,
  onCreateBinding,
  onCreateVersion,
  onPublishVersion,
  onRenderVersion,
  onUpdateBinding,
  promptId,
  promptOptions,
  promptRecord,
  t,
  versionError,
  versionRecords,
}: PromptDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<PromptDetailTabId>('overview');
  const promptOption = promptOptions.find((option) => option.value === promptId);
  const title = readRecordText(promptRecord, 'name') || promptOption?.label || `#${promptId}`;

  useEffect(() => {
    setActiveTab('overview');
  }, [promptId]);

  return (
    <aside
      className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#1a1a1a]"
      data-admin-prompts-detail="prompt-detail"
    >
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 p-4 dark:border-white/10">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            <BookText className="h-4 w-4 text-blue-600 dark:text-blue-300" />
            <span className="truncate">{title}</span>
          </div>
          <div className="mt-1 truncate text-xs text-slate-500">
            {readRecordText(promptRecord, 'promptKey') || promptOption?.detail || `#${promptId}`}
          </div>
        </div>
        <button
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
          onClick={onClose}
          title={t('common.actions.close', 'Close')}
          type="button"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <PromptDetailTabs activeTab={activeTab} onChange={setActiveTab} t={t} />

      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-4">
        {activeTab === 'overview' ? (
          <PromptOverview promptId={promptId} promptRecord={promptRecord} t={t} />
        ) : activeTab === 'versions' ? (
          <PromptVersionsDetail
            error={versionError}
            onCreateVersion={onCreateVersion}
            onPublishVersion={onPublishVersion}
            onRenderVersion={onRenderVersion}
            records={versionRecords}
            t={t}
          />
        ) : (
          <PromptUsageDetail
            error={bindingError}
            onCreateBinding={onCreateBinding}
            onUpdateBinding={onUpdateBinding}
            records={bindingRecords}
            t={t}
          />
        )}
      </div>
    </aside>
  );
}

function PromptDetailTabs({
  activeTab,
  onChange,
  t,
}: {
  activeTab: PromptDetailTabId;
  onChange: (tab: PromptDetailTabId) => void;
  t: TranslationFn;
}) {
  const tabs: Array<{ id: PromptDetailTabId; icon: React.ReactNode; label: string }> = [
    { id: 'overview', icon: <BookText className="h-4 w-4" />, label: t('admin.prompts.detail.overview', 'Overview') },
    { id: 'versions', icon: <FileText className="h-4 w-4" />, label: t('admin.prompts.detail.versions', 'Versions') },
    { id: 'usage', icon: <Tags className="h-4 w-4" />, label: t('admin.prompts.detail.usage', 'Usage') },
  ];
  return (
    <div className="flex shrink-0 gap-1 border-b border-slate-200 px-3 py-2 dark:border-white/10">
      {tabs.map((tab) => (
        <button
          className={`inline-flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-semibold transition-colors ${
            activeTab === tab.id
              ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200'
              : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/10'
          }`}
          key={tab.id}
          onClick={() => onChange(tab.id)}
          type="button"
        >
          {tab.icon}
          <span className="truncate">{tab.label}</span>
        </button>
      ))}
    </div>
  );
}

function PromptOverview({ promptId, promptRecord, t }: {
  promptId: string;
  promptRecord: AdminResourceRecord | null;
  t: TranslationFn;
}) {
  const fields = [
    { label: t('admin.prompts.fields.promptKey', 'Prompt Key'), value: readRecordText(promptRecord, 'promptKey') || `#${promptId}` },
    { label: t('admin.prompts.fields.name', 'Name'), value: readRecordText(promptRecord, 'name') },
    { label: t('admin.prompts.fields.category', 'Category'), value: readRecordText(promptRecord, 'categoryName') || readRecordText(promptRecord, 'categoryCode') },
    { label: t('admin.prompts.fields.promptType', 'Type'), value: readRecordText(promptRecord, 'promptType') },
    { label: t('admin.prompts.fields.visibility', 'Visibility'), value: readRecordText(promptRecord, 'visibility') },
    { label: t('admin.prompts.fields.status', 'Status'), value: readRecordText(promptRecord, 'status') },
    { label: t('admin.prompts.fields.latestVersion', 'Latest version'), value: readRecordText(promptRecord, 'latestVersionId') },
    { label: t('admin.prompts.fields.publishedVersion', 'Published version'), value: readRecordText(promptRecord, 'publishedVersionId') },
  ];
  return (
    <div className="grid gap-3">
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
        {fields.map((field) => (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]" key={field.label}>
            <div className="text-[11px] font-semibold uppercase text-slate-400">{field.label}</div>
            <div className="mt-1 truncate text-sm font-semibold text-slate-800 dark:text-slate-100" title={field.value || '-'}>
              {field.value || '-'}
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-white/[0.03]">
        <div className="text-[11px] font-semibold uppercase text-slate-400">
          {t('admin.prompts.fields.description', 'Description')}
        </div>
        <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300">
          {readRecordText(promptRecord, 'description') || '-'}
        </div>
      </div>
    </div>
  );
}

function PromptVersionsDetail({
  error,
  onCreateVersion,
  onPublishVersion,
  onRenderVersion,
  records,
  t,
}: {
  error: string | null;
  onCreateVersion: () => void;
  onPublishVersion: () => void;
  onRenderVersion: () => void;
  records: readonly AdminResourceRecord[];
  t: TranslationFn;
}) {
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        <DetailActionButton icon={<Plus className="h-4 w-4" />} label={t('admin.prompts.actions.createVersion', 'Create Version')} onClick={onCreateVersion} />
        <DetailActionButton icon={<Rocket className="h-4 w-4" />} label={t('admin.prompts.actions.publishVersion', 'Publish')} onClick={onPublishVersion} />
        <DetailActionButton icon={<Play className="h-4 w-4" />} label={t('admin.prompts.actions.renderVersion', 'Render')} onClick={onRenderVersion} />
      </div>
      {error ? <ErrorMessage message={error} /> : null}
      <DetailRecordTable
        columns={[
          { key: 'versionNo', label: t('admin.prompts.columns.version', 'Version') },
          { key: 'title', label: t('admin.prompts.columns.title', 'Title') },
          { key: 'lifecycleStatus', label: t('admin.prompts.columns.lifecycle', 'Lifecycle') },
          { key: 'reviewStatus', label: t('admin.prompts.columns.review', 'Review') },
          { key: 'updatedAt', label: t('admin.prompts.columns.updatedAt', 'Updated') },
        ]}
        emptyLabel={t('admin.prompts.detail.emptyVersions', 'No versions for this prompt.')}
        records={records}
      />
    </div>
  );
}

function PromptUsageDetail({
  error,
  onCreateBinding,
  onUpdateBinding,
  records,
  t,
}: {
  error: string | null;
  onCreateBinding: () => void;
  onUpdateBinding: () => void;
  records: readonly AdminResourceRecord[];
  t: TranslationFn;
}) {
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        <DetailActionButton icon={<Plus className="h-4 w-4" />} label={t('admin.prompts.actions.createBinding', 'Create Binding')} onClick={onCreateBinding} />
        <DetailActionButton icon={<Edit2 className="h-4 w-4" />} label={t('admin.prompts.actions.updateBinding', 'Update Binding')} onClick={onUpdateBinding} />
      </div>
      {error ? <ErrorMessage message={error} /> : null}
      <DetailRecordTable
        columns={[
          { key: 'ownerType', label: t('admin.prompts.columns.ownerType', 'Owner Type') },
          { key: 'ownerId', label: t('admin.prompts.columns.ownerId', 'Owner ID') },
          {
            key: 'promptVersionId',
            label: t('admin.prompts.columns.promptVersion', 'Prompt Version'),
            format: (value) => formatPromptBindingVersionCell(value, t),
          },
          { key: 'bindingRole', label: t('admin.prompts.columns.bindingRole', 'Role') },
          { key: 'priority', label: t('admin.prompts.columns.priority', 'Priority'), align: 'right' },
          { key: 'enabled', label: t('admin.prompts.columns.enabled', 'Enabled') },
        ]}
        emptyLabel={t('admin.prompts.detail.emptyUsage', 'No usage bindings for this prompt.')}
        records={records}
      />
    </div>
  );
}

function DetailActionButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
      onClick={onClick}
      type="button"
    >
      {icon}
      {label}
    </button>
  );
}

function DetailRecordTable({
  columns,
  emptyLabel,
  records,
}: {
  columns: readonly DetailRecordColumn[];
  emptyLabel: string;
  records: readonly AdminResourceRecord[];
}) {
  if (records.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 px-3 py-8 text-center text-sm text-slate-500 dark:border-white/10">
        {emptyLabel}
      </div>
    );
  }
  return (
    <div className="custom-scrollbar overflow-x-auto rounded-lg border border-slate-200 dark:border-white/10">
      <table className="w-full min-w-[520px] text-left text-xs">
        <thead className="bg-slate-50 text-[11px] uppercase text-slate-500 dark:bg-[#121212] dark:text-slate-400">
          <tr>
            {columns.map((column) => (
              <th className={`px-3 py-2 font-semibold ${column.align === 'right' ? 'text-right' : ''}`} key={column.key}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-white/5">
          {records.map((record, index) => (
            <tr className="text-slate-600 dark:text-slate-300" key={detailRecordKey(record, index)}>
              {columns.map((column) => {
                const cellValue = column.format
                  ? column.format(record[column.key], record)
                  : formatDetailCell(record[column.key]);
                return (
                  <td
                    className={`max-w-[180px] truncate px-3 py-2 ${column.align === 'right' ? 'text-right tabular-nums' : ''}`}
                    key={column.key}
                    title={cellValue}
                  >
                    {cellValue}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusMessages({ messages }: { messages: Array<string | null> }) {
  const visibleMessages = messages.filter((message): message is string => Boolean(message));
  if (visibleMessages.length === 0) {
    return null;
  }
  return (
    <div className="flex shrink-0 flex-wrap gap-2">
      {visibleMessages.map((message) => (
        <div
          className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
          key={message}
        >
          {message}
        </div>
      ))}
    </div>
  );
}

function categorySidebarLabels(t: TranslationFn, namespace: string) {
  return {
    addChild: t(`${namespace}.category.addChild`, 'Add child category'),
    all: t(`${namespace}.category.all`, 'All categories'),
    create: t(`${namespace}.category.create`, 'Create category'),
    delete: t(`${namespace}.category.delete`, 'Delete category'),
    edit: t(`${namespace}.category.edit`, 'Edit category'),
    empty: t(`${namespace}.category.empty`, 'No categories'),
    loading: t(`${namespace}.category.loading`, 'Loading categories...'),
    selected: t(`${namespace}.category.selected`, { name: '{{name}}' }),
    title: t(`${namespace}.category.title`, 'Category Management'),
    total: t(`${namespace}.category.total`, { count: '{{count}}' }),
  };
}

function buildCategoryUsage(
  categories: readonly AdminCategoryOption[],
  _options: readonly AdminResourceOption[],
): Map<string, number> {
  return new Map(categories.map((category) => [category.id, 0]));
}

function PromptCategoryDialog({ category, categories, onClose, onSuccess, parentId, t }: PromptCategoryDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const isEdit = Boolean(category);

  const submit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const form = new FormData(event.currentTarget);
      if (category) {
        await updateAdminAiCategory(category.id, updateCategoryInputFromForm(form, t));
      } else {
        await createAdminAiCategory(createCategoryInputFromForm(form, t));
      }
      onSuccess();
      onClose();
    } catch (caught) {
      setError(errorMessage(caught, t('admin.prompts.category.saveFailed', 'Category could not be saved.')));
    } finally {
      setSubmitting(false);
    }
  }, [category, onClose, onSuccess, t]);

  return (
    <PromptDialogShell
      cancelLabel={t('common.actions.cancel')}
      icon={isEdit ? <Edit2 className="h-4 w-4" /> : <FolderPlus className="h-4 w-4" />}
      onClose={onClose}
      onSubmit={submit}
      submitting={submitting}
      submitLabel={isEdit ? t('common.actions.save', 'Save') : t('admin.prompts.category.create', 'Create category')}
      title={isEdit ? t('admin.prompts.category.editTitle', 'Edit category') : t('admin.prompts.category.createTitle', 'Create category')}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Field defaultValue={category?.name ?? ''} label={t('admin.prompts.category.name', 'Name')} name="name" required={!isEdit} />
        <Field defaultValue={category?.code ?? ''} label={t('admin.prompts.category.code', 'Code')} name="code" />
        <SelectField defaultValue={category?.parentId ?? parentId ?? ''} label={t('admin.prompts.category.parent', 'Parent category')} name="parentId">
          <option value="">{t('admin.prompts.category.root', 'Root category')}</option>
          {categories
            .filter((item) => item.id !== category?.id)
            .map((item) => (
              <option key={item.id} value={item.id}>
                {formatAdminCategoryOptionLabel(item)}
              </option>
            ))}
        </SelectField>
        <Field defaultValue={String(category?.sortWeight ?? 0)} label={t('admin.prompts.category.sortWeight', 'Sort weight')} name="sortWeight" type="number" />
        <SelectField defaultValue={String(category?.visible ?? true)} label={t('admin.prompts.category.visible', 'Visible')} name="visible">
          <option value="true">true</option>
          <option value="false">false</option>
        </SelectField>
        <Field defaultValue={String(category?.status ?? 1)} label={t('admin.prompts.category.status', 'Status')} name="status" type="number" />
        <TextArea defaultValue={category?.description ?? ''} label={t('admin.prompts.category.description', 'Description')} name="description" rows={3} />
      </div>
      {error ? <ErrorMessage message={error} /> : null}
    </PromptDialogShell>
  );
}

function CreatePromptDialog({ categoryOptions, onClose, onSuccess, t }: CreatePromptDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await createPrompt(createPromptInputFromForm(new FormData(event.currentTarget), t));
      onSuccess();
      onClose();
    } catch (caught) {
      setError(errorMessage(caught, t('admin.prompts.errors.createPromptFailed')));
    } finally {
      setSubmitting(false);
    }
  }, [onClose, onSuccess, t]);

  return (
    <PromptDialogShell
      cancelLabel={t('common.actions.cancel')}
      icon={<BookText className="h-4 w-4" />}
      onClose={onClose}
      onSubmit={submit}
      submitting={submitting}
      submitLabel={t('admin.prompts.actions.createPrompt', 'Create Prompt')}
      title={t('admin.prompts.create.title', 'Create Prompt')}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={t('admin.prompts.fields.promptKey', 'Prompt Key')} name="promptKey" required />
        <Field label={t('admin.prompts.fields.name', 'Name')} name="name" required />
        <CategorySelectField
          categoryOptions={categoryOptions}
          label={t('admin.prompts.fields.category', 'Category')}
          name="categoryId"
          t={t}
        />
        <SelectField defaultValue="system" label={t('admin.prompts.fields.promptType', 'Type')} name="promptType">
          <option value="system">system</option>
          <option value="developer">developer</option>
          <option value="user">user</option>
          <option value="tool">tool</option>
        </SelectField>
        <SelectField defaultValue="organization" label={t('admin.prompts.fields.visibility', 'Visibility')} name="visibility">
          <option value="organization">organization</option>
          <option value="private">private</option>
          <option value="public">public</option>
        </SelectField>
        <Field label={t('admin.prompts.fields.tags', 'Tags')} name="tags" placeholder="agent, routing" />
        <TextArea label={t('admin.prompts.fields.description', 'Description')} name="description" rows={3} />
      </div>
      {error ? <ErrorMessage message={error} /> : null}
    </PromptDialogShell>
  );
}

function CreatePromptVersionDialog({ defaultPromptId, onClose, onSuccess, promptOptions, t }: PromptVersionDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const form = new FormData(event.currentTarget);
      await createPromptVersion(requiredPromptFormText(form, 'promptId', t), createPromptVersionInputFromForm(form, t));
      onSuccess();
      onClose();
    } catch (caught) {
      setError(errorMessage(caught, t('admin.prompts.errors.createVersionFailed')));
    } finally {
      setSubmitting(false);
    }
  }, [onClose, onSuccess, t]);

  return (
    <PromptDialogShell
      cancelLabel={t('common.actions.cancel')}
      icon={<FileText className="h-4 w-4" />}
      onClose={onClose}
      onSubmit={submit}
      submitting={submitting}
      submitLabel={t('admin.prompts.actions.createVersion', 'Create Version')}
      title={t('admin.prompts.version.createTitle', 'Create Prompt Version')}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <ResourceSelectField
          defaultValue={defaultPromptId}
          emptyLabel={t('admin.prompts.fields.selectPrompt', 'Select prompt')}
          label={t('admin.prompts.fields.prompt', 'Prompt')}
          name="promptId"
          options={promptOptions}
          required
        />
        <Field defaultValue="1.0.0" label={t('admin.prompts.fields.versionNo', 'Version')} name="versionNo" required />
        <Field label={t('admin.prompts.fields.title', 'Title')} name="title" required />
        <TextArea label={t('admin.prompts.fields.content', 'Content')} name="content" required rows={8} />
        <TextArea defaultValue="{}" label={t('admin.prompts.fields.variableSchema', 'Variable Schema JSON')} name="variableSchema" rows={5} />
        <TextArea defaultValue="{}" label={t('admin.prompts.fields.outputSchema', 'Output Schema JSON')} name="outputSchema" rows={5} />
        <TextArea defaultValue="{}" label={t('admin.prompts.fields.modelConstraints', 'Model Constraints JSON')} name="modelConstraints" rows={5} />
        <TextArea defaultValue="{}" label={t('admin.prompts.fields.safetyPolicy', 'Safety Policy JSON')} name="safetyPolicy" rows={5} />
        <TextArea defaultValue="[]" label={t('admin.prompts.fields.examplesJson', 'Examples JSON')} name="examplesJson" rows={5} />
      </div>
      {error ? <ErrorMessage message={error} /> : null}
    </PromptDialogShell>
  );
}

function PublishPromptVersionDialog({ onClose, onSuccess, t, versionOptions }: PromptVersionActionDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await publishPromptVersion(requiredPromptFormText(new FormData(event.currentTarget), 'versionId', t));
      onSuccess();
      onClose();
    } catch (caught) {
      setError(errorMessage(caught, t('admin.prompts.errors.publishVersionFailed')));
    } finally {
      setSubmitting(false);
    }
  }, [onClose, onSuccess, t]);

  return (
    <PromptDialogShell
      cancelLabel={t('common.actions.cancel')}
      icon={<Rocket className="h-4 w-4" />}
      onClose={onClose}
      onSubmit={submit}
      submitting={submitting}
      submitLabel={t('admin.prompts.actions.publishVersion', 'Publish')}
      title={t('admin.prompts.version.publishTitle', 'Publish Prompt Version')}
    >
      <ResourceSelectField
        emptyLabel={t('admin.prompts.fields.selectVersion')}
        label={t('admin.prompts.fields.version')}
        name="versionId"
        options={versionOptions}
        required
      />
      {error ? <ErrorMessage message={error} /> : null}
    </PromptDialogShell>
  );
}

function RenderPromptVersionDialog({ onClose, t, versionOptions }: Pick<PromptVersionActionDialogProps, 'onClose' | 't' | 'versionOptions'>) {
  const [error, setError] = useState<string | null>(null);
  const [rendered, setRendered] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setRendered('');
    try {
      const form = new FormData(event.currentTarget);
      const result = await renderPromptVersion(requiredPromptFormText(form, 'versionId', t), renderPromptInputFromForm(form, t));
      const payload = result.data as { rendered?: string } | undefined;
      setRendered(payload?.rendered ?? result.msg ?? '');
    } catch (caught) {
      setError(errorMessage(caught, t('admin.prompts.errors.renderVersionFailed')));
    } finally {
      setSubmitting(false);
    }
  }, [t]);

  return (
    <PromptDialogShell
      cancelLabel={t('common.actions.cancel')}
      icon={<Code2 className="h-4 w-4" />}
      onClose={onClose}
      onSubmit={submit}
      submitting={submitting}
      submitLabel={t('admin.prompts.actions.renderVersion', 'Render')}
      title={t('admin.prompts.version.renderTitle', 'Render Prompt Version')}
    >
      <div className="grid gap-4">
        <ResourceSelectField
          emptyLabel={t('admin.prompts.fields.selectVersion')}
          label={t('admin.prompts.fields.version')}
          name="versionId"
          options={versionOptions}
          required
        />
        <TextArea defaultValue="{}" label={t('admin.prompts.fields.variables', 'Variables JSON')} name="variables" rows={6} />
        {rendered ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100">
            <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-words font-mono text-xs">{rendered}</pre>
          </div>
        ) : null}
      </div>
      {error ? <ErrorMessage message={error} /> : null}
    </PromptDialogShell>
  );
}

function CreatePromptBindingDialog({ defaultPromptId, onClose, onSuccess, promptOptions, t, versionOptions }: PromptBindingCreateDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const form = new FormData(event.currentTarget);
      await createPromptBinding(requiredPromptFormText(form, 'promptId', t), createPromptBindingInputFromForm(form, t));
      onSuccess();
      onClose();
    } catch (caught) {
      setError(errorMessage(caught, t('admin.prompts.errors.createBindingFailed')));
    } finally {
      setSubmitting(false);
    }
  }, [onClose, onSuccess, t]);

  return (
    <PromptDialogShell
      cancelLabel={t('common.actions.cancel')}
      icon={<Tags className="h-4 w-4" />}
      onClose={onClose}
      onSubmit={submit}
      submitting={submitting}
      submitLabel={t('admin.prompts.actions.createBinding', 'Create Binding')}
      title={t('admin.prompts.binding.createTitle', 'Create Prompt Binding')}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <ResourceSelectField
          defaultValue={defaultPromptId}
          emptyLabel={t('admin.prompts.fields.selectPrompt', 'Select prompt')}
          label={t('admin.prompts.fields.prompt', 'Prompt')}
          name="promptId"
          options={promptOptions}
          required
        />
        <ResourceSelectField
          emptyLabel={t('admin.prompts.fields.defaultVersion', 'Use default prompt resolution')}
          label={t('admin.prompts.fields.version', 'Version')}
          name="promptVersionId"
          options={versionOptions}
        />
        <Field defaultValue="agent" label={t('admin.prompts.fields.ownerType', 'Owner Type')} name="ownerType" required />
        <Field label={t('admin.prompts.fields.ownerId', 'Owner ID')} name="ownerId" required type="number" />
        <Field defaultValue="primary" label={t('admin.prompts.fields.bindingRole', 'Role')} name="bindingRole" required />
        <Field defaultValue="0" label={t('admin.prompts.fields.priority', 'Priority')} name="priority" type="number" />
        <SelectField defaultValue="true" label={t('admin.prompts.fields.enabled', 'Enabled')} name="enabled">
          <option value="true">true</option>
          <option value="false">false</option>
        </SelectField>
        <TextArea defaultValue="{}" label={t('admin.prompts.fields.policyJson', 'Policy JSON')} name="policyJson" rows={5} />
      </div>
      {error ? <ErrorMessage message={error} /> : null}
    </PromptDialogShell>
  );
}

function UpdatePromptBindingDialog({ bindingOptions, onClose, onSuccess, t, versionOptions }: PromptBindingUpdateDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const form = new FormData(event.currentTarget);
      await updatePromptBinding(requiredPromptFormText(form, 'bindingId', t), updatePromptBindingInputFromForm(form, t));
      onSuccess();
      onClose();
    } catch (caught) {
      setError(errorMessage(caught, t('admin.prompts.errors.updateBindingFailed')));
    } finally {
      setSubmitting(false);
    }
  }, [onClose, onSuccess, t]);

  return (
    <PromptDialogShell
      cancelLabel={t('common.actions.cancel')}
      icon={<Tags className="h-4 w-4" />}
      onClose={onClose}
      onSubmit={submit}
      submitting={submitting}
      submitLabel={t('common.actions.save', 'Save')}
      title={t('admin.prompts.binding.updateTitle', 'Update Prompt Binding')}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <ResourceSelectField
          emptyLabel={t('admin.prompts.fields.selectBinding', 'Select binding')}
          label={t('admin.prompts.fields.binding', 'Binding')}
          name="bindingId"
          options={bindingOptions}
          required
        />
        <ResourceSelectField
          emptyLabel={t('admin.prompts.fields.keepVersion', 'Keep current version')}
          extraOptions={[
            {
              detail: '',
              label: t('admin.prompts.fields.defaultVersion', 'Use default prompt resolution'),
              value: PROMPT_BINDING_NULL_VERSION_VALUE,
            },
          ]}
          label={t('admin.prompts.fields.version', 'Version')}
          name="promptVersionId"
          options={versionOptions}
        />
        <Field label={t('admin.prompts.fields.ownerType', 'Owner Type')} name="ownerType" />
        <Field label={t('admin.prompts.fields.ownerId', 'Owner ID')} name="ownerId" type="number" />
        <Field label={t('admin.prompts.fields.bindingRole', 'Role')} name="bindingRole" />
        <Field label={t('admin.prompts.fields.priority', 'Priority')} name="priority" type="number" />
        <SelectField defaultValue="" label={t('admin.prompts.fields.enabled', 'Enabled')} name="enabled">
          <option value="">-</option>
          <option value="true">true</option>
          <option value="false">false</option>
        </SelectField>
        <TextArea label={t('admin.prompts.fields.policyJson', 'Policy JSON')} name="policyJson" rows={5} />
      </div>
      {error ? <ErrorMessage message={error} /> : null}
    </PromptDialogShell>
  );
}

type PromptDialogProps = {
  onClose: () => void;
  onSuccess: () => void;
  t: ReturnType<typeof useTranslation>['t'];
};

type PromptDetailPanelProps = {
  bindingError: string | null;
  bindingRecords: readonly AdminResourceRecord[];
  onClose: () => void;
  onCreateBinding: () => void;
  onCreateVersion: () => void;
  onPublishVersion: () => void;
  onRenderVersion: () => void;
  onUpdateBinding: () => void;
  promptId: string;
  promptOptions: readonly AdminResourceOption[];
  promptRecord: AdminResourceRecord | null;
  t: TranslationFn;
  versionError: string | null;
  versionRecords: readonly AdminResourceRecord[];
};

type DetailRecordColumn = {
  key: string;
  label: string;
  align?: 'right';
  format?: (value: unknown, record: AdminResourceRecord) => string;
};

type CreatePromptDialogProps = PromptDialogProps & {
  categoryOptions: readonly AdminCategoryOption[];
};

type PromptVersionDialogProps = PromptDialogProps & {
  defaultPromptId: string;
  promptOptions: readonly AdminResourceOption[];
};

type PromptVersionActionDialogProps = PromptDialogProps & {
  versionOptions: readonly AdminResourceOption[];
};

type PromptBindingCreateDialogProps = PromptDialogProps & {
  defaultPromptId: string;
  promptOptions: readonly AdminResourceOption[];
  versionOptions: readonly AdminResourceOption[];
};

type PromptBindingUpdateDialogProps = PromptDialogProps & {
  bindingOptions: readonly AdminResourceOption[];
  versionOptions: readonly AdminResourceOption[];
};

type PromptCategoryDialogProps = PromptDialogProps & {
  category: AdminCategoryOption | null;
  categories: readonly AdminCategoryOption[];
  parentId: string | null;
};

type PromptDialogShellProps = {
  cancelLabel: string;
  children: React.ReactNode;
  icon: React.ReactNode;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  submitting: boolean;
  submitLabel: string;
  title: string;
};

function PromptDialogShell({
  cancelLabel,
  children,
  icon,
  onClose,
  onSubmit,
  submitting,
  submitLabel,
  title,
}: PromptDialogShellProps) {
  return (
    <div aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4" role="dialog">
      <form className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-white shadow-xl dark:bg-[#1a1a1a]" onSubmit={onSubmit}>
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <div className="flex min-w-0 items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            {icon}
            <span className="truncate">{title}</span>
          </div>
          <button className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10" onClick={onClose} type="button">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        <div className="flex shrink-0 justify-end gap-2 border-t border-slate-200 px-5 py-4 dark:border-white/10">
          <button className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10" disabled={submitting} onClick={onClose} type="button">
            {cancelLabel}
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60" disabled={submitting} type="submit">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  defaultValue = '',
  label,
  name,
  placeholder,
  required = false,
  type = 'text',
}: {
  defaultValue?: string;
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <input
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-white/10 dark:bg-[#202020] dark:text-white"
        defaultValue={defaultValue}
        name={name}
        placeholder={placeholder}
        required={required}
        type={type}
      />
    </label>
  );
}

function SelectField({
  children,
  defaultValue,
  label,
  name,
}: {
  children: React.ReactNode;
  defaultValue: string;
  label: string;
  name: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <select
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-white/10 dark:bg-[#202020] dark:text-white"
        defaultValue={defaultValue}
        name={name}
      >
        {children}
      </select>
    </label>
  );
}

function ResourceSelectField({
  defaultValue = '',
  emptyLabel,
  label,
  name,
  onChange,
  options,
  extraOptions = [],
  required = false,
  value,
}: {
  defaultValue?: string;
  emptyLabel: string;
  extraOptions?: readonly AdminResourceOption[];
  label: string;
  name?: string;
  onChange?: (value: string) => void;
  options: readonly AdminResourceOption[];
  required?: boolean;
  value?: string;
}) {
  const selectedValue = value ?? defaultValue;
  const hasSelectedOption = !selectedValue
    || extraOptions.some((option) => option.value === selectedValue)
    || options.some((option) => option.value === selectedValue);

  return (
    <label className="block min-w-0 flex-1">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <select
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-white/10 dark:bg-[#202020] dark:text-white"
        defaultValue={value === undefined ? defaultValue : undefined}
        name={name}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        required={required}
        value={value}
      >
        <option value="">{emptyLabel}</option>
        {!hasSelectedOption ? (
          <option value={selectedValue}>{`#${selectedValue}`}</option>
        ) : null}
        {extraOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {formatAdminResourceOptionLabel(option)}
          </option>
        ))}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {formatAdminResourceOptionLabel(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

function CategorySelectField({
  categoryOptions,
  defaultValue = '',
  label,
  name,
  t,
}: {
  categoryOptions: readonly AdminCategoryOption[];
  defaultValue?: string;
  label: string;
  name: string;
  t: ReturnType<typeof useTranslation>['t'];
}) {
  return (
    <SelectField defaultValue={defaultValue} label={label} name={name}>
      <option value="">{t('admin.prompts.fields.noCategory', 'No category')}</option>
      {categoryOptions.map((category) => (
        <option key={category.id} value={category.id}>
          {formatAdminCategoryOptionLabel(category)}
        </option>
      ))}
    </SelectField>
  );
}

function TextArea({
  defaultValue = '',
  label,
  name,
  required = false,
  rows = 4,
}: {
  defaultValue?: string;
  label: string;
  name: string;
  required?: boolean;
  rows?: number;
}) {
  return (
    <label className="block md:col-span-2">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <textarea
        className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-900 outline-none focus:border-blue-500 dark:border-white/10 dark:bg-[#202020] dark:text-white"
        defaultValue={defaultValue}
        name={name}
        required={required}
        rows={rows}
      />
    </label>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
      {message}
    </div>
  );
}

function createPromptInputFromForm(form: FormData, t: TranslationFn): AdminPromptCreateInput {
  return {
    promptKey: requiredPromptFormText(form, 'promptKey', t),
    name: requiredPromptFormText(form, 'name', t),
    description: optionalFormText(form, 'description'),
    categoryId: optionalFormText(form, 'categoryId'),
    promptType: optionalFormText(form, 'promptType') ?? 'system',
    visibility: optionalFormText(form, 'visibility') ?? 'organization',
    tags: splitCsv(optionalFormText(form, 'tags') ?? ''),
  };
}

function createPromptVersionInputFromForm(form: FormData, t: TranslationFn): AdminPromptVersionCreateInput {
  return {
    versionNo: requiredPromptFormText(form, 'versionNo', t),
    title: requiredPromptFormText(form, 'title', t),
    content: requiredPromptFormText(form, 'content', t),
    variableSchema: parseOptionalJsonObject(form, 'variableSchema', t),
    outputSchema: parseOptionalJsonObject(form, 'outputSchema', t),
    modelConstraints: parseOptionalJsonObject(form, 'modelConstraints', t),
    safetyPolicy: parseOptionalJsonObject(form, 'safetyPolicy', t),
    examplesJson: parseOptionalJsonObjectOrArray(form, 'examplesJson', t),
  };
}

function renderPromptInputFromForm(form: FormData, t: TranslationFn): AdminPromptRenderInput {
  return {
    variables: parseOptionalJsonObject(form, 'variables', t),
  };
}

function createPromptBindingInputFromForm(form: FormData, t: TranslationFn): AdminPromptBindingCreateInput {
  return {
    promptVersionId: optionalIntegerString(form, 'promptVersionId', t),
    ownerType: requiredPromptFormText(form, 'ownerType', t),
    ownerId: requiredIntegerString(form, 'ownerId', t),
    bindingRole: requiredPromptFormText(form, 'bindingRole', t),
    priority: optionalInteger(form, 'priority', t),
    enabled: optionalBoolean(form, 'enabled', t),
    policyJson: parseOptionalJsonObject(form, 'policyJson', t),
  };
}

function updatePromptBindingInputFromForm(form: FormData, t: TranslationFn): AdminPromptBindingUpdateInput {
  return pruneUndefined({
    promptVersionId: optionalNullableIntegerString(form, 'promptVersionId', PROMPT_BINDING_NULL_VERSION_VALUE, t),
    ownerType: optionalFormText(form, 'ownerType'),
    ownerId: optionalIntegerString(form, 'ownerId', t),
    bindingRole: optionalFormText(form, 'bindingRole'),
    priority: optionalInteger(form, 'priority', t),
    enabled: optionalBoolean(form, 'enabled', t),
    policyJson: parseOptionalJsonObject(form, 'policyJson', t),
  });
}

function createCategoryInputFromForm(form: FormData, t: TranslationFn): AdminAiCategoryCreateInput {
  return pruneUndefined({
    name: requiredPromptFormText(form, 'name', t),
    code: optionalFormText(form, 'code'),
    description: optionalFormText(form, 'description'),
    parentId: optionalFormText(form, 'parentId') ?? null,
    sortWeight: optionalInteger(form, 'sortWeight', t),
    status: optionalInteger(form, 'status', t),
    visible: optionalBoolean(form, 'visible', t),
  });
}

function updateCategoryInputFromForm(form: FormData, t: TranslationFn): AdminAiCategoryUpdateInput {
  return pruneUndefined({
    name: optionalFormText(form, 'name'),
    code: optionalFormText(form, 'code') ?? null,
    description: optionalFormText(form, 'description') ?? null,
    parentId: optionalFormText(form, 'parentId') ?? null,
    sortWeight: optionalInteger(form, 'sortWeight', t),
    status: optionalInteger(form, 'status', t),
    visible: optionalBoolean(form, 'visible', t),
  });
}

function parseOptionalJsonObject(form: FormData, key: string, t: TranslationFn): JsonObject | undefined {
  const value = optionalFormText(form, key);
  if (!value) {
    return undefined;
  }
  const parsed = parseJson(value, key, t);
  if (!isJsonObject(parsed)) {
    throw new Error(promptValidationMessage(t, key, 'jsonObject'));
  }
  return parsed;
}

function parseOptionalJsonObjectOrArray(form: FormData, key: string, t: TranslationFn): JsonObject | JsonObject[] | undefined {
  const value = optionalFormText(form, key);
  if (!value) {
    return undefined;
  }
  const parsed = parseJson(value, key, t);
  if (isJsonObject(parsed)) {
    return parsed;
  }
  if (Array.isArray(parsed) && parsed.every(isJsonObject)) {
    return parsed;
  }
  throw new Error(promptValidationMessage(t, key, 'jsonObjectOrArray'));
}

function parseJson(value: string, key: string, t: TranslationFn): JsonValue {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error(promptValidationMessage(t, key, 'validJson'));
  }
  return normalizeJsonValue(parsed, key, t);
}

function normalizeJsonValue(value: unknown, key: string, t: TranslationFn): JsonValue {
  if (value === null) {
    return null;
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error(promptValidationMessage(t, key, 'jsonNumber'));
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item, index) => normalizeJsonValue(item, `${key}[${index}]`, t));
  }
  if (typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(
      Object.entries(value).map(([itemKey, itemValue]) => [itemKey, normalizeJsonValue(itemValue, `${key}.${itemKey}`, t)]),
    ) as JsonObject;
  }
  throw new Error(promptValidationMessage(t, key, 'jsonValue'));
}

function isJsonObject(value: JsonValue): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredPromptFormText(form: FormData, key: string, t: TranslationFn): string {
  const value = optionalFormText(form, key);
  if (!value) {
    throw new Error(promptValidationMessage(t, key, 'required'));
  }
  return value;
}

function requiredInteger(form: FormData, key: string, t: TranslationFn): number {
  const value = optionalInteger(form, key, t);
  if (value === undefined) {
    throw new Error(promptValidationMessage(t, key, 'required'));
  }
  return value;
}

function requiredIntegerString(form: FormData, key: string, t: TranslationFn): string {
  return String(requiredInteger(form, key, t));
}

function optionalInteger(form: FormData, key: string, t: TranslationFn): number | undefined {
  const value = optionalFormText(form, key);
  if (value === undefined) {
    return undefined;
  }
  const numberValue = Number(value);
  if (!Number.isSafeInteger(numberValue)) {
    throw new Error(promptValidationMessage(t, key, 'integer'));
  }
  return numberValue;
}

function optionalIntegerString(form: FormData, key: string, t: TranslationFn): string | undefined {
  const value = optionalInteger(form, key, t);
  return value === undefined ? undefined : String(value);
}

function optionalNullableInteger(form: FormData, key: string, nullValue: string, t: TranslationFn): number | null | undefined {
  const value = optionalFormText(form, key);
  if (value === undefined) {
    return undefined;
  }
  if (value === nullValue) {
    return null;
  }
  const numberValue = Number(value);
  if (!Number.isSafeInteger(numberValue)) {
    throw new Error(promptValidationMessage(t, key, 'integer'));
  }
  return numberValue;
}

function optionalNullableIntegerString(form: FormData, key: string, nullValue: string, t: TranslationFn): string | null | undefined {
  const value = optionalFormText(form, key);
  if (value === undefined) {
    return undefined;
  }
  if (value === nullValue) {
    return null;
  }
  if (!/^-?\d+$/u.test(value)) {
    throw new Error(promptValidationMessage(t, key, 'integer'));
  }
  return value;
}

function optionalBoolean(form: FormData, key: string, t: TranslationFn): boolean | undefined {
  const value = optionalFormText(form, key);
  if (value === undefined) {
    return undefined;
  }
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  throw new Error(promptValidationMessage(t, key, 'boolean'));
}

function promptValidationMessage(
  t: TranslationFn,
  key: string,
  kind: 'boolean' | 'integer' | 'jsonNumber' | 'jsonObject' | 'jsonObjectOrArray' | 'jsonValue' | 'required' | 'validJson',
): string {
  const field = promptFieldLabel(t, key);
  if (kind === 'required') {
    return t('admin.prompts.validation.required', { field });
  }
  if (kind === 'validJson') {
    return t('admin.prompts.validation.validJson', { field });
  }
  if (kind === 'jsonObject') {
    return t('admin.prompts.validation.jsonObject', { field });
  }
  if (kind === 'jsonObjectOrArray') {
    return t('admin.prompts.validation.jsonObjectOrArray', { field });
  }
  if (kind === 'jsonNumber') {
    return t('admin.prompts.validation.jsonNumber', { field });
  }
  if (kind === 'integer') {
    return t('admin.prompts.validation.integer', { field });
  }
  if (kind === 'boolean') {
    return t('admin.prompts.validation.boolean', { field });
  }
  return t('admin.prompts.validation.jsonValue', { field });
}

function promptFieldLabel(t: TranslationFn, key: string): string {
  const normalizedKey = key.replace(/\[[^\]]+\]/gu, '').split('.')[0];
  switch (normalizedKey) {
    case 'bindingId':
      return t('admin.prompts.fields.binding');
    case 'bindingRole':
      return t('admin.prompts.fields.bindingRole');
    case 'content':
      return t('admin.prompts.fields.content');
    case 'enabled':
      return t('admin.prompts.fields.enabled');
    case 'examplesJson':
      return t('admin.prompts.fields.examplesJson');
    case 'modelConstraints':
      return t('admin.prompts.fields.modelConstraints');
    case 'name':
      return t('admin.prompts.fields.name');
    case 'ownerId':
      return t('admin.prompts.fields.ownerId');
    case 'ownerType':
      return t('admin.prompts.fields.ownerType');
    case 'outputSchema':
      return t('admin.prompts.fields.outputSchema');
    case 'policyJson':
      return t('admin.prompts.fields.policyJson');
    case 'priority':
      return t('admin.prompts.fields.priority');
    case 'promptId':
      return t('admin.prompts.fields.prompt');
    case 'promptKey':
      return t('admin.prompts.fields.promptKey');
    case 'safetyPolicy':
      return t('admin.prompts.fields.safetyPolicy');
    case 'title':
      return t('admin.prompts.fields.title');
    case 'variables':
      return t('admin.prompts.fields.variables');
    case 'variableSchema':
      return t('admin.prompts.fields.variableSchema');
    case 'promptVersionId':
    case 'versionId':
      return t('admin.prompts.fields.version');
    case 'versionNo':
      return t('admin.prompts.fields.versionNo');
    default:
      return normalizedKey || key;
  }
}

function optionalFormText(form: FormData, key: string): string | undefined {
  const value = form.get(key);
  if (typeof value !== 'string') {
    return undefined;
  }
  const normalized = value.trim();
  return normalized ? normalized : undefined;
}

function normalizeRecordId(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(Math.trunc(value));
  }
  return '';
}

function readRecordText(record: AdminResourceRecord | null, key: string): string {
  if (!record) {
    return '';
  }
  return formatDetailCell(record[key]);
}

function formatDetailCell(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return JSON.stringify(value);
}

function detailRecordKey(record: AdminResourceRecord, index: number): string {
  const id = normalizeRecordId(record.id ?? record.uuid);
  return id || String(index);
}

function splitCsv(value: string): string[] {
  return Array.from(new Set(value.split(',').map((item) => item.trim()).filter(Boolean)));
}

function pruneUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as T;
}

function errorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error) || !error.message) {
    return fallback;
  }
  const message = error.message.trim();
  return message && !message.startsWith('Failed to ') ? message : fallback;
}
