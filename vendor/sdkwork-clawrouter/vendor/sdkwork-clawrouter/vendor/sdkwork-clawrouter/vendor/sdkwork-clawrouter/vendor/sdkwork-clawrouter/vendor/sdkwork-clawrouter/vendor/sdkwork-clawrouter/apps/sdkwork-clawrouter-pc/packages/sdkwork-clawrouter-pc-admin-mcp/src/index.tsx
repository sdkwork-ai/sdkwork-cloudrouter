import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, Bot, Edit2, FolderPlus, Gauge, Loader2, Network, Plus, Rocket, Server, ShieldCheck, Trash2, Wrench, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  AdminCategoryManagementSidebar,
  AdminResourceCenter,
  ConfirmDialog,
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
  DEFAULT_MCP_PAGE_PARAMS,
  EMPTY_MCP_ITEMS,
  checkMcpServerHealth,
  createMcpBinding,
  createMcpServer,
  createMcpServerRevision,
  discoverMcpTools,
  listMcpBindings,
  listMcpServerRevisions,
  listMcpServers,
  listMcpTools,
  publishMcpServerRevision,
  updateMcpBinding,
  updateMcpServer,
  updateMcpTool,
  type AdminMcpBindingCreateInput,
  type AdminMcpBindingUpdateInput,
  type AdminMcpServerCreateInput,
  type AdminMcpServerRevisionCreateInput,
  type AdminMcpServerUpdateInput,
  type AdminMcpToolUpdateInput,
} from './mcpService';

type McpAdminSectionId = 'servers' | 'revisions' | 'tools' | 'bindings';
type McpAdminGroup = string;
type McpDialogKind = 'createServer' | 'updateServer' | 'createRevision' | 'publishRevision' | 'discoverTools' | 'healthCheck' | 'updateTool' | 'createBinding' | 'updateBinding' | 'createCategory' | 'editCategory';
type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
type JsonObject = Record<string, JsonValue>;
type TranslationFn = ReturnType<typeof useTranslation>['t'];
type CategoryModalState = {
  category: AdminCategoryOption | null;
  parentId: string | null;
} | null;

const DEFAULT_SECTION_ID: McpAdminSectionId = 'servers';
const MCP_BINDING_NULL_REVISION_VALUE = '__sdkwork_mcp_binding_null_revision__';
const MCP_BINDING_NULL_TOOL_VALUE = '__sdkwork_mcp_binding_null_tool__';

export function McpAdmin() {
  const { t } = useTranslation();
  const [serverId, setServerId] = useState('');
  const [activeSectionId, setActiveSectionId] = useState<McpAdminSectionId>(DEFAULT_SECTION_ID);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [categoryOptions, setCategoryOptions] = useState<AdminCategoryOption[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoryLoadError, setCategoryLoadError] = useState<string | null>(null);
  const [serverOptions, setServerOptions] = useState<AdminResourceOption[]>([]);
  const [serverLoadError, setServerLoadError] = useState<string | null>(null);
  const [revisionOptions, setRevisionOptions] = useState<AdminResourceOption[]>([]);
  const [revisionLoadError, setRevisionLoadError] = useState<string | null>(null);
  const [toolOptions, setToolOptions] = useState<AdminResourceOption[]>([]);
  const [toolLoadError, setToolLoadError] = useState<string | null>(null);
  const [bindingOptions, setBindingOptions] = useState<AdminResourceOption[]>([]);
  const [bindingLoadError, setBindingLoadError] = useState<string | null>(null);
  const [dialogKind, setDialogKind] = useState<McpDialogKind | null>(null);
  const [categoryModalState, setCategoryModalState] = useState<CategoryModalState>(null);
  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState<AdminCategoryOption | null>(null);
  const [categorySubmitting, setCategorySubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const scopedServerId = serverId.trim();
  const scopedCategoryId = selectedCategoryId.trim();
  const refresh = useCallback(() => setRefreshKey((current) => current + 1), []);
  const closeDialog = useCallback(() => {
    setDialogKind(null);
    setCategoryModalState(null);
  }, []);
  const loadServerOptions = useCallback(async (isActive: () => boolean = () => true) => {
    try {
      const result = await listMcpServers({ ...DEFAULT_MCP_PAGE_PARAMS, categoryId: scopedCategoryId || undefined });
      const options = readAdminResourceOptions(result, {
        idKey: 'id',
        labelKeys: ['name', 'serverKey'],
        detailKeys: ['serverKey', 'transport', 'healthStatus', 'status'],
      });
      if (isActive()) {
        setServerOptions(options);
        setServerLoadError(null);
      }
    } catch (caught) {
      if (isActive()) {
        setServerOptions([]);
        setServerLoadError(errorMessage(caught, t('admin.mcp.scopeLoadError', 'MCP server options could not be loaded.')));
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
        setCategoryLoadError(errorMessage(caught, t('admin.mcp.categoryLoadError', 'MCP categories could not be loaded.')));
      }
    } finally {
      if (isActive()) {
        setCategoriesLoading(false);
      }
    }
  }, [t]);
  const loadMcpRevisionOptions = useCallback(async (targetServerId: string, isActive: () => boolean = () => true) => {
    const normalizedServerId = targetServerId.trim();
    if (!normalizedServerId) {
      if (isActive()) {
        setRevisionOptions([]);
        setRevisionLoadError(null);
      }
      return;
    }
    try {
      const result = await listMcpServerRevisions(normalizedServerId);
      const options = readAdminResourceOptions(result, {
        idKey: 'id',
        labelKeys: ['revisionNo', 'endpointUrl'],
        detailKeys: ['transport', 'lifecycleStatus', 'status'],
      });
      if (isActive()) {
        setRevisionOptions(options);
        setRevisionLoadError(null);
      }
    } catch (caught) {
      if (isActive()) {
        setRevisionOptions([]);
        setRevisionLoadError(errorMessage(caught, t('admin.mcp.revisionScopeLoadError')));
      }
    }
  }, [t]);
  const loadMcpToolOptions = useCallback(async (targetServerId: string, isActive: () => boolean = () => true) => {
    const normalizedServerId = targetServerId.trim();
    if (!normalizedServerId) {
      if (isActive()) {
        setToolOptions([]);
        setToolLoadError(null);
      }
      return;
    }
    try {
      const result = await listMcpTools(normalizedServerId);
      const options = readAdminResourceOptions(result, {
        idKey: 'id',
        labelKeys: ['name', 'toolKey'],
        detailKeys: ['toolKey', 'riskLevel', 'enabled', 'status'],
      });
      if (isActive()) {
        setToolOptions(options);
        setToolLoadError(null);
      }
    } catch (caught) {
      if (isActive()) {
        setToolOptions([]);
        setToolLoadError(errorMessage(caught, t('admin.mcp.toolScopeLoadError')));
      }
    }
  }, [t]);
  const loadMcpBindingOptions = useCallback(async (targetServerId: string, isActive: () => boolean = () => true) => {
    const normalizedServerId = targetServerId.trim();
    if (!normalizedServerId) {
      if (isActive()) {
        setBindingOptions([]);
        setBindingLoadError(null);
      }
      return;
    }
    try {
      const result = await listMcpBindings(normalizedServerId);
      const options = readAdminResourceOptions(result, {
        idKey: 'id',
        labelKeys: ['ownerType', 'ownerId'],
        detailKeys: ['priority', 'enabled', 'status'],
      });
      if (isActive()) {
        setBindingOptions(options);
        setBindingLoadError(null);
      }
    } catch (caught) {
      if (isActive()) {
        setBindingOptions([]);
        setBindingLoadError(errorMessage(caught, t('admin.mcp.bindingScopeLoadError', 'MCP bindings could not be loaded.')));
      }
    }
  }, [t]);
  const refreshMcpResources = useCallback(() => {
    refresh();
    void loadServerOptions();
  }, [loadServerOptions, refresh]);
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
  const sections = useMemo(() => buildMcpSections(t, scopedServerId, scopedCategoryId, categoryOptions, {
    onCreateBinding: () => setDialogKind('createBinding'),
    onCreateRevision: () => setDialogKind('createRevision'),
    onCreateServer: () => setDialogKind('createServer'),
    onDiscoverTools: () => setDialogKind('discoverTools'),
    onHealthCheck: () => setDialogKind('healthCheck'),
    onPublishRevision: () => setDialogKind('publishRevision'),
    onUpdateBinding: () => setDialogKind('updateBinding'),
    onUpdateServer: () => setDialogKind('updateServer'),
    onUpdateTool: () => setDialogKind('updateTool'),
  }), [categoryOptions, scopedCategoryId, scopedServerId, t]);
  const categoryUsage = useMemo(() => buildCategoryUsage(categoryOptions), [categoryOptions]);

  useEffect(() => {
    let active = true;
    void loadServerOptions(() => active);
    return () => {
      active = false;
    };
  }, [loadServerOptions]);

  useEffect(() => {
    setServerId('');
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
    void loadMcpRevisionOptions(scopedServerId, () => active);
    void loadMcpToolOptions(scopedServerId, () => active);
    void loadMcpBindingOptions(scopedServerId, () => active);
    return () => {
      active = false;
    };
  }, [loadMcpBindingOptions, loadMcpRevisionOptions, loadMcpToolOptions, refreshKey, scopedServerId]);

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
      refreshMcpResources();
    } finally {
      setCategorySubmitting(false);
    }
  }, [deleteCategoryTarget, refreshCategories, refreshMcpResources, selectedCategoryId]);

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col gap-2 overflow-hidden" data-admin-mcp="mcp-management">
      <StatusMessages messages={[serverLoadError, categoryLoadError, revisionLoadError, toolLoadError, bindingLoadError]} />
      <div className="grid min-h-0 min-w-0 flex-1 gap-3 overflow-hidden lg:grid-cols-[280px_minmax(0,1fr)]">
        <AdminCategoryManagementSidebar
          categories={categoryOptions}
          dataAttribute="admin-mcp-category-management"
          labels={categorySidebarLabels(t, 'admin.mcp')}
          loading={categoriesLoading}
          onCreateChild={(category) => openCreateCategory(category.id)}
          onCreateRoot={() => openCreateCategory(null)}
          onDeleteCategory={setDeleteCategoryTarget}
          onEditCategory={openEditCategory}
          onSelect={setSelectedCategoryId}
          selectedCategoryId={selectedCategoryId}
          usageCountByCategoryId={categoryUsage}
        />
        <div className="flex min-h-0 min-w-0 flex-col gap-2 overflow-hidden" data-admin-mcp-content>
          <SectionTabs activeSectionId={activeSectionId} onChange={setActiveSectionId} sections={sections} />
          {activeSectionId !== 'servers' ? (
            <div className="flex shrink-0 rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-[#1a1a1a]">
              <ResourceSelectField
                emptyLabel={t('admin.mcp.scope.serverPlaceholder', 'Select an MCP server for revisions, tools, and bindings')}
                label={t('admin.mcp.scope.server', 'MCP Server')}
                onChange={setServerId}
                options={serverOptions}
                value={serverId}
              />
            </div>
          ) : null}
          <div className="min-h-0 flex-1 overflow-hidden" data-admin-mcp-resource-center-frame>
            <AdminResourceCenter<McpAdminSectionId, McpAdminGroup>
              activeSectionId={activeSectionId}
              emptyDescription={t('admin.mcp.empty.desc', 'No MCP records match the current filters.')}
              emptyTitle={t('admin.mcp.empty.title', 'No MCP records')}
              errorTitle={t('admin.mcp.error.title', 'MCP data could not be loaded')}
              initialSectionId={DEFAULT_SECTION_ID}
              loadingTitle={t('admin.mcp.loading', 'Loading MCP records...')}
              refreshKey={`${refreshKey}:${scopedServerId}:${scopedCategoryId}`}
              reloadLabel={t('common.actions.reload')}
              searchPlaceholder={t('admin.mcp.search.placeholder')}
              sections={sections}
              showSectionNavigation={false}
              tableViewportDataAttribute="admin-mcp-table"
            />
          </div>
        </div>
      </div>

      {dialogKind === 'createServer' ? (
        <CreateMcpServerDialog categoryOptions={categoryOptions} onClose={closeDialog} onSuccess={refreshMcpResources} t={t} />
      ) : null}
      {dialogKind === 'updateServer' ? (
        <UpdateMcpServerDialog categoryOptions={categoryOptions} defaultServerId={scopedServerId} onClose={closeDialog} onSuccess={refreshMcpResources} serverOptions={serverOptions} t={t} />
      ) : null}
      {dialogKind === 'createRevision' ? (
        <CreateMcpRevisionDialog defaultServerId={scopedServerId} onClose={closeDialog} onSuccess={refresh} serverOptions={serverOptions} t={t} />
      ) : null}
      {dialogKind === 'publishRevision' ? (
        <PublishMcpRevisionDialog onClose={closeDialog} onSuccess={refresh} revisionOptions={revisionOptions} t={t} />
      ) : null}
      {dialogKind === 'discoverTools' ? (
        <DiscoverMcpToolsDialog defaultServerId={scopedServerId} onClose={closeDialog} onSuccess={refresh} serverOptions={serverOptions} t={t} />
      ) : null}
      {dialogKind === 'healthCheck' ? (
        <McpHealthCheckDialog defaultServerId={scopedServerId} onClose={closeDialog} onSuccess={refresh} serverOptions={serverOptions} t={t} />
      ) : null}
      {dialogKind === 'updateTool' ? (
        <UpdateMcpToolDialog onClose={closeDialog} onSuccess={refresh} t={t} toolOptions={toolOptions} />
      ) : null}
      {dialogKind === 'createBinding' ? (
        <CreateMcpBindingDialog
          defaultServerId={scopedServerId}
          onClose={closeDialog}
          onSuccess={refresh}
          revisionOptions={revisionOptions}
          serverOptions={serverOptions}
          t={t}
          toolOptions={toolOptions}
        />
      ) : null}
      {dialogKind === 'updateBinding' ? (
        <UpdateMcpBindingDialog
          bindingOptions={bindingOptions}
          onClose={closeDialog}
          onSuccess={refresh}
          revisionOptions={revisionOptions}
          t={t}
          toolOptions={toolOptions}
        />
      ) : null}
      {(dialogKind === 'createCategory' || dialogKind === 'editCategory') && categoryModalState ? (
        <McpCategoryManagementDialog
          category={categoryModalState.category}
          categories={categoryOptions}
          onClose={closeDialog}
          onSuccess={() => {
            refreshCategories();
            refreshMcpResources();
          }}
          parentId={categoryModalState.parentId}
          t={t}
        />
      ) : null}
      {deleteCategoryTarget ? (
        <ConfirmDialog
          cancelLabel={t('common.actions.cancel')}
          confirmLabel={t('admin.mcp.category.deleteConfirm', 'Delete')}
          description={t('admin.mcp.category.deleteDescription', { name: deleteCategoryTarget.name })}
          icon={<Trash2 className="h-4 w-4" />}
          isBusy={categorySubmitting}
          onCancel={() => setDeleteCategoryTarget(null)}
          onConfirm={handleDeleteCategory}
          title={t('admin.mcp.category.deleteTitle', 'Delete category')}
          tone="danger"
        />
      ) : null}
    </div>
  );
}

function buildMcpSections(
  t: ReturnType<typeof useTranslation>['t'],
  serverId: string,
  categoryId: string,
  categoryOptions: readonly AdminCategoryOption[],
  actions: {
    onCreateBinding: () => void;
    onCreateRevision: () => void;
    onCreateServer: () => void;
    onDiscoverTools: () => void;
    onHealthCheck: () => void;
    onPublishRevision: () => void;
    onUpdateBinding: () => void;
    onUpdateServer: () => void;
    onUpdateTool: () => void;
  },
): AdminResourceSection<McpAdminSectionId, McpAdminGroup>[] {
  return [
    {
      id: 'servers',
      title: t('admin.mcp.sections.servers.title', 'MCP Servers'),
      description: t('admin.mcp.sections.servers.desc', 'MCP server registry with category, transport, visibility, lifecycle, and health state.'),
      icon: <Server className="h-4 w-4" />,
      group: t('admin.mcp.group.configuration', 'Configuration'),
      load: async () => attachAdminCategoryNamesToResult(
        await listMcpServers({ ...DEFAULT_MCP_PAGE_PARAMS, categoryId: categoryId || undefined }),
        categoryOptions,
      ),
      actions: [
        {
          icon: <Plus className="h-4 w-4" />,
          label: t('admin.mcp.actions.createServer', 'Create Server'),
          onClick: actions.onCreateServer,
        },
        {
          icon: <Wrench className="h-4 w-4" />,
          label: t('admin.mcp.actions.updateServer', 'Update Server'),
          onClick: actions.onUpdateServer,
        },
        {
          icon: <Gauge className="h-4 w-4" />,
          label: t('admin.mcp.actions.healthCheck', 'Health Check'),
          onClick: actions.onHealthCheck,
        },
        {
          icon: <Bot className="h-4 w-4" />,
          label: t('admin.mcp.actions.discoverTools', 'Discover Tools'),
          onClick: actions.onDiscoverTools,
        },
      ],
      columns: [
        { key: 'serverKey', label: t('admin.mcp.columns.serverKey', 'Server Key') },
        { key: 'name', label: t('admin.mcp.columns.name', 'Name') },
        { key: 'categoryName', label: t('admin.mcp.columns.category', 'Category') },
        { key: 'transport', label: t('admin.mcp.columns.transport', 'Transport') },
        { key: 'healthStatus', label: t('admin.mcp.columns.health', 'Health') },
        { key: 'status', label: t('admin.mcp.columns.status', 'Status') },
        { key: 'updatedAt', label: t('admin.mcp.columns.updatedAt', 'Updated') },
      ],
      searchFields: ['serverKey', 'name', 'categoryName', 'categoryCode', 'transport', 'healthStatus', 'status', 'description'],
    },
    {
      id: 'revisions',
      title: t('admin.mcp.sections.revisions.title', 'Connection Revisions'),
      description: t('admin.mcp.sections.revisions.desc', 'Immutable connection revisions for transport endpoint, auth reference, timeout, retry, and lifecycle.'),
      icon: <Network className="h-4 w-4" />,
      group: t('admin.mcp.group.lifecycle', 'Lifecycle'),
      load: () => serverId ? listMcpServerRevisions(serverId) : Promise.resolve(EMPTY_MCP_ITEMS),
      actions: [
        {
          icon: <Plus className="h-4 w-4" />,
          label: t('admin.mcp.actions.createRevision', 'Create Revision'),
          onClick: actions.onCreateRevision,
        },
        {
          icon: <Rocket className="h-4 w-4" />,
          label: t('admin.mcp.actions.publishRevision', 'Publish'),
          onClick: actions.onPublishRevision,
        },
      ],
      columns: [
        { key: 'revisionNo', label: t('admin.mcp.columns.revision', 'Revision') },
        { key: 'transport', label: t('admin.mcp.columns.transport', 'Transport') },
        { key: 'endpointUrl', label: t('admin.mcp.columns.endpoint', 'Endpoint') },
        { key: 'authType', label: t('admin.mcp.columns.authType', 'Auth') },
        { key: 'lifecycleStatus', label: t('admin.mcp.columns.lifecycle', 'Lifecycle') },
        { key: 'status', label: t('admin.mcp.columns.status', 'Status') },
        { key: 'updatedAt', label: t('admin.mcp.columns.updatedAt', 'Updated') },
      ],
      searchFields: ['revisionNo', 'transport', 'endpointUrl', 'command', 'authType', 'lifecycleStatus', 'status'],
    },
    {
      id: 'tools',
      title: t('admin.mcp.sections.tools.title', 'Tools'),
      description: t('admin.mcp.sections.tools.desc', 'Discovered tool schemas with risk, approval, enablement, rate limits, and invocation governance.'),
      icon: <Bot className="h-4 w-4" />,
      group: t('admin.mcp.group.governance', 'Governance'),
      load: () => serverId ? listMcpTools(serverId) : Promise.resolve(EMPTY_MCP_ITEMS),
      action: {
        icon: <ShieldCheck className="h-4 w-4" />,
        label: t('admin.mcp.actions.updateTool', 'Update Tool'),
        onClick: actions.onUpdateTool,
      },
      columns: [
        { key: 'toolKey', label: t('admin.mcp.columns.toolKey', 'Tool Key') },
        { key: 'name', label: t('admin.mcp.columns.name', 'Name') },
        { key: 'riskLevel', label: t('admin.mcp.columns.risk', 'Risk') },
        { key: 'requiresApproval', label: t('admin.mcp.columns.approval', 'Approval') },
        { key: 'enabled', label: t('admin.mcp.columns.enabled', 'Enabled') },
        { key: 'status', label: t('admin.mcp.columns.status', 'Status') },
        { key: 'updatedAt', label: t('admin.mcp.columns.updatedAt', 'Updated') },
      ],
      searchFields: ['toolKey', 'name', 'description', 'riskLevel', 'requiresApproval', 'enabled', 'status'],
    },
    {
      id: 'bindings',
      title: t('admin.mcp.sections.bindings.title', 'Bindings'),
      description: t('admin.mcp.sections.bindings.desc', 'Owner bindings, allow and deny tool policies, priority, enablement, and policy snapshots.'),
      icon: <Activity className="h-4 w-4" />,
      group: t('admin.mcp.group.governance', 'Governance'),
      load: () => serverId ? listMcpBindings(serverId) : Promise.resolve(EMPTY_MCP_ITEMS),
      actions: [
        {
          icon: <Plus className="h-4 w-4" />,
          label: t('admin.mcp.actions.createBinding', 'Create Binding'),
          onClick: actions.onCreateBinding,
        },
        {
          icon: <Activity className="h-4 w-4" />,
          label: t('admin.mcp.actions.updateBinding', 'Update Binding'),
          onClick: actions.onUpdateBinding,
        },
      ],
      columns: [
        { key: 'ownerType', label: t('admin.mcp.columns.ownerType', 'Owner Type') },
        { key: 'ownerId', label: t('admin.mcp.columns.ownerId', 'Owner ID') },
        {
          key: 'serverRevisionId',
          label: t('admin.mcp.columns.serverRevision', 'Server Revision'),
          format: (value) => formatMcpBindingScopeCell(value, t('admin.mcp.scope.defaultRevisionLabel', 'Default revision')),
        },
        {
          key: 'toolId',
          label: t('admin.mcp.columns.tool', 'Tool'),
          format: (value) => formatMcpBindingScopeCell(value, t('admin.mcp.scope.allToolsLabel', 'All tools')),
        },
        {
          key: 'allowedTools',
          label: t('admin.mcp.columns.allowedTools', 'Allowed Tools'),
          format: (value) => formatMcpToolPolicyCell(value, t('admin.mcp.scope.allToolsLabel', 'All tools')),
        },
        {
          key: 'deniedTools',
          label: t('admin.mcp.columns.deniedTools', 'Denied Tools'),
          format: (value) => formatMcpToolPolicyCell(value, t('admin.mcp.scope.noDeniedToolsLabel', 'None')),
        },
        { key: 'priority', label: t('admin.mcp.columns.priority', 'Priority'), align: 'right' },
        { key: 'enabled', label: t('admin.mcp.columns.enabled', 'Enabled') },
        { key: 'status', label: t('admin.mcp.columns.status', 'Status') },
        { key: 'updatedAt', label: t('admin.mcp.columns.updatedAt', 'Updated') },
      ],
      searchFields: ['ownerType', 'ownerId', 'serverRevisionId', 'toolId', 'allowedTools', 'deniedTools', 'priority', 'enabled', 'status'],
    },
  ];
}

function formatMcpBindingScopeCell(value: unknown, defaultLabel: string): string {
  if (value === null || value === undefined || value === '') {
    return defaultLabel;
  }
  return String(value);
}

function formatMcpToolPolicyCell(value: unknown, emptyLabel: string): string {
  if (Array.isArray(value)) {
    return value.length > 0 ? value.map(String).join(', ') : emptyLabel;
  }
  if (value === null || value === undefined || value === '') {
    return emptyLabel;
  }
  return String(value);
}

function SectionTabs({
  activeSectionId,
  onChange,
  sections,
}: {
  activeSectionId: McpAdminSectionId;
  onChange: (sectionId: McpAdminSectionId) => void;
  sections: readonly AdminResourceSection<McpAdminSectionId, McpAdminGroup>[];
}) {
  return (
    <div className="flex shrink-0 flex-wrap gap-2 rounded-lg border border-slate-200 bg-white p-2 shadow-sm dark:border-white/10 dark:bg-[#1a1a1a]">
      {sections.map((section) => {
        const active = section.id === activeSectionId;
        return (
          <button
            className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
              active
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200'
                : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/10'
            }`}
            key={section.id}
            onClick={() => onChange(section.id)}
            type="button"
          >
            {section.icon}
            {section.title}
          </button>
        );
      })}
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

function buildCategoryUsage(categories: readonly AdminCategoryOption[]): Map<string, number> {
  return new Map(categories.map((category) => [category.id, 0]));
}

function McpCategoryManagementDialog({ category, categories, onClose, onSuccess, parentId, t }: McpCategoryManagementDialogProps) {
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
      setError(errorMessage(caught, t('admin.mcp.category.saveFailed', 'Category could not be saved.')));
    } finally {
      setSubmitting(false);
    }
  }, [category, onClose, onSuccess, t]);

  return (
    <McpDialogShell
      cancelLabel={t('common.actions.cancel')}
      icon={isEdit ? <Edit2 className="h-4 w-4" /> : <FolderPlus className="h-4 w-4" />}
      onClose={onClose}
      onSubmit={submit}
      submitting={submitting}
      submitLabel={isEdit ? t('common.actions.save', 'Save') : t('admin.mcp.category.create', 'Create category')}
      title={isEdit ? t('admin.mcp.category.editTitle', 'Edit category') : t('admin.mcp.category.createTitle', 'Create category')}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Field defaultValue={category?.name ?? ''} label={t('admin.mcp.category.name', 'Name')} name="name" required={!isEdit} />
        <Field defaultValue={category?.code ?? ''} label={t('admin.mcp.category.code', 'Code')} name="code" />
        <SelectField defaultValue={category?.parentId ?? parentId ?? ''} label={t('admin.mcp.category.parent', 'Parent category')} name="parentId">
          <option value="">{t('admin.mcp.category.root', 'Root category')}</option>
          {categories
            .filter((item) => item.id !== category?.id)
            .map((item) => (
              <option key={item.id} value={item.id}>
                {formatAdminCategoryOptionLabel(item)}
              </option>
            ))}
        </SelectField>
        <Field defaultValue={String(category?.sortWeight ?? 0)} label={t('admin.mcp.category.sortWeight', 'Sort weight')} name="sortWeight" type="number" />
        <SelectField defaultValue={String(category?.visible ?? true)} label={t('admin.mcp.category.visible', 'Visible')} name="visible">
          <option value="true">true</option>
          <option value="false">false</option>
        </SelectField>
        <Field defaultValue={String(category?.status ?? 1)} label={t('admin.mcp.category.status', 'Status')} name="status" type="number" />
        <TextArea defaultValue={category?.description ?? ''} label={t('admin.mcp.category.description', 'Description')} name="description" rows={3} />
      </div>
      {error ? <ErrorMessage message={error} /> : null}
    </McpDialogShell>
  );
}

function CreateMcpServerDialog({ categoryOptions, onClose, onSuccess, t }: McpCategoryDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await createMcpServer(createServerInputFromForm(new FormData(event.currentTarget), t));
      onSuccess();
      onClose();
    } catch (caught) {
      setError(errorMessage(caught, t('admin.mcp.errors.createServerFailed')));
    } finally {
      setSubmitting(false);
    }
  }, [onClose, onSuccess, t]);

  return (
    <McpDialogShell cancelLabel={t('common.actions.cancel')} icon={<Server className="h-4 w-4" />} onClose={onClose} onSubmit={submit} submitting={submitting} submitLabel={t('admin.mcp.actions.createServer', 'Create Server')} title={t('admin.mcp.server.createTitle', 'Create MCP Server')}>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={t('admin.mcp.fields.serverKey', 'Server Key')} name="serverKey" required />
        <Field label={t('admin.mcp.fields.name', 'Name')} name="name" required />
        <CategorySelectField
          categoryOptions={categoryOptions}
          label={t('admin.mcp.fields.category', 'Category')}
          name="categoryId"
          t={t}
        />
        <SelectField defaultValue="http" label={t('admin.mcp.fields.transport', 'Transport')} name="transport">
          <option value="http">http</option>
          <option value="stdio">stdio</option>
          <option value="sse">sse</option>
        </SelectField>
        <SelectField defaultValue="organization" label={t('admin.mcp.fields.visibility', 'Visibility')} name="visibility">
          <option value="organization">organization</option>
          <option value="private">private</option>
          <option value="public">public</option>
        </SelectField>
        <Field label={t('admin.mcp.fields.tags', 'Tags')} name="tags" placeholder="tools, internal" />
        <TextArea label={t('admin.mcp.fields.description', 'Description')} name="description" rows={3} />
      </div>
      {error ? <ErrorMessage message={error} /> : null}
    </McpDialogShell>
  );
}

function UpdateMcpServerDialog({ categoryOptions, defaultServerId, onClose, onSuccess, serverOptions, t }: McpScopedCategoryDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const form = new FormData(event.currentTarget);
      await updateMcpServer(requiredMcpFormText(form, 'serverId', t), updateServerInputFromForm(form));
      onSuccess();
      onClose();
    } catch (caught) {
      setError(errorMessage(caught, t('admin.mcp.errors.updateServerFailed')));
    } finally {
      setSubmitting(false);
    }
  }, [onClose, onSuccess, t]);

  return (
    <McpDialogShell cancelLabel={t('common.actions.cancel')} icon={<Wrench className="h-4 w-4" />} onClose={onClose} onSubmit={submit} submitting={submitting} submitLabel={t('common.actions.save', 'Save')} title={t('admin.mcp.server.updateTitle', 'Update MCP Server')}>
      <div className="grid gap-4 md:grid-cols-2">
        <ResourceSelectField
          defaultValue={defaultServerId}
          emptyLabel={t('admin.mcp.fields.selectServer', 'Select MCP server')}
          label={t('admin.mcp.fields.server', 'MCP Server')}
          name="serverId"
          options={serverOptions}
          required
        />
        <Field label={t('admin.mcp.fields.serverKey', 'Server Key')} name="serverKey" />
        <Field label={t('admin.mcp.fields.name', 'Name')} name="name" />
        <CategorySelectField
          categoryOptions={categoryOptions}
          label={t('admin.mcp.fields.category', 'Category')}
          name="categoryId"
          t={t}
        />
        <SelectField defaultValue="" label={t('admin.mcp.fields.transport', 'Transport')} name="transport">
          <option value="">-</option>
          <option value="http">http</option>
          <option value="stdio">stdio</option>
          <option value="sse">sse</option>
        </SelectField>
        <SelectField defaultValue="" label={t('admin.mcp.fields.visibility', 'Visibility')} name="visibility">
          <option value="">-</option>
          <option value="organization">organization</option>
          <option value="private">private</option>
          <option value="public">public</option>
        </SelectField>
        <SelectField defaultValue="" label={t('admin.mcp.fields.status', 'Status')} name="status">
          <option value="">-</option>
          <option value="active">active</option>
          <option value="disabled">disabled</option>
          <option value="deprecated">deprecated</option>
        </SelectField>
        <Field label={t('admin.mcp.fields.tags', 'Tags')} name="tags" />
        <TextArea label={t('admin.mcp.fields.description', 'Description')} name="description" rows={3} />
      </div>
      {error ? <ErrorMessage message={error} /> : null}
    </McpDialogShell>
  );
}

function CreateMcpRevisionDialog({ defaultServerId, onClose, onSuccess, serverOptions, t }: McpScopedDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const form = new FormData(event.currentTarget);
      await createMcpServerRevision(requiredMcpFormText(form, 'serverId', t), createRevisionInputFromForm(form, t));
      onSuccess();
      onClose();
    } catch (caught) {
      setError(errorMessage(caught, t('admin.mcp.errors.createRevisionFailed')));
    } finally {
      setSubmitting(false);
    }
  }, [onClose, onSuccess, t]);

  return (
    <McpDialogShell cancelLabel={t('common.actions.cancel')} icon={<Network className="h-4 w-4" />} onClose={onClose} onSubmit={submit} submitting={submitting} submitLabel={t('admin.mcp.actions.createRevision', 'Create Revision')} title={t('admin.mcp.revision.createTitle', 'Create MCP Revision')}>
      <div className="grid gap-4 md:grid-cols-2">
        <ResourceSelectField
          defaultValue={defaultServerId}
          emptyLabel={t('admin.mcp.fields.selectServer', 'Select MCP server')}
          label={t('admin.mcp.fields.server', 'MCP Server')}
          name="serverId"
          options={serverOptions}
          required
        />
        <Field defaultValue="1.0.0" label={t('admin.mcp.fields.revisionNo', 'Revision')} name="revisionNo" required />
        <SelectField defaultValue="http" label={t('admin.mcp.fields.transport', 'Transport')} name="transport">
          <option value="http">http</option>
          <option value="stdio">stdio</option>
          <option value="sse">sse</option>
        </SelectField>
        <Field label={t('admin.mcp.fields.endpointUrl', 'Endpoint URL')} name="endpointUrl" />
        <Field label={t('admin.mcp.fields.command', 'Command')} name="command" />
        <Field defaultValue="none" label={t('admin.mcp.fields.authType', 'Auth Type')} name="authType" />
        <Field label={t('admin.mcp.fields.secretRef', 'Secret Ref')} name="secretRef" />
        <Field defaultValue="30000" label={t('admin.mcp.fields.timeoutMs', 'Timeout ms')} name="timeoutMs" type="number" />
        <TextArea defaultValue="[]" label={t('admin.mcp.fields.argsJson', 'Args JSON')} name="argsJson" rows={4} />
        <TextArea defaultValue="{}" label={t('admin.mcp.fields.envSchema', 'Env Schema JSON')} name="envSchema" rows={4} />
        <TextArea defaultValue="{}" label={t('admin.mcp.fields.retryPolicy', 'Retry Policy JSON')} name="retryPolicy" rows={4} />
      </div>
      {error ? <ErrorMessage message={error} /> : null}
    </McpDialogShell>
  );
}

function PublishMcpRevisionDialog({ onClose, onSuccess, revisionOptions, t }: McpRevisionActionDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await publishMcpServerRevision(requiredMcpFormText(new FormData(event.currentTarget), 'revisionId', t));
      onSuccess();
      onClose();
    } catch (caught) {
      setError(errorMessage(caught, t('admin.mcp.errors.publishRevisionFailed')));
    } finally {
      setSubmitting(false);
    }
  }, [onClose, onSuccess, t]);

    return (
    <McpDialogShell cancelLabel={t('common.actions.cancel')} icon={<Rocket className="h-4 w-4" />} onClose={onClose} onSubmit={submit} submitting={submitting} submitLabel={t('admin.mcp.actions.publishRevision', 'Publish')} title={t('admin.mcp.revision.publishTitle', 'Publish MCP Revision')}>
      <ResourceSelectField
        emptyLabel={t('admin.mcp.fields.selectRevision')}
        label={t('admin.mcp.fields.revision')}
        name="revisionId"
        options={revisionOptions}
        required
      />
      {error ? <ErrorMessage message={error} /> : null}
    </McpDialogShell>
  );
}

function DiscoverMcpToolsDialog({ defaultServerId, onClose, onSuccess, serverOptions, t }: McpScopedDialogProps) {
  return (
    <McpCommandDialog
      defaultTargetId={defaultServerId}
      execute={discoverMcpTools}
      fieldName="serverId"
      icon={<Bot className="h-4 w-4" />}
      onClose={onClose}
      onSuccess={onSuccess}
      submitLabel={t('admin.mcp.actions.discoverTools', 'Discover Tools')}
      targetEmptyLabel={t('admin.mcp.fields.selectServer', 'Select MCP server')}
      targetLabel={t('admin.mcp.fields.server', 'MCP Server')}
      targetOptions={serverOptions}
      title={t('admin.mcp.tools.discoverTitle', 'Discover MCP Tools')}
      t={t}
    />
  );
}

function McpHealthCheckDialog({ defaultServerId, onClose, onSuccess, serverOptions, t }: McpScopedDialogProps) {
  return (
    <McpCommandDialog
      defaultTargetId={defaultServerId}
      execute={checkMcpServerHealth}
      fieldName="serverId"
      icon={<Gauge className="h-4 w-4" />}
      onClose={onClose}
      onSuccess={onSuccess}
      submitLabel={t('admin.mcp.actions.healthCheck', 'Health Check')}
      targetEmptyLabel={t('admin.mcp.fields.selectServer', 'Select MCP server')}
      targetLabel={t('admin.mcp.fields.server', 'MCP Server')}
      targetOptions={serverOptions}
      title={t('admin.mcp.health.title', 'MCP Health Check')}
      t={t}
    />
  );
}

function McpCommandDialog({
  defaultTargetId,
  execute,
  fieldName,
  icon,
  onClose,
  onSuccess,
  submitLabel,
  t,
  targetEmptyLabel,
  targetLabel,
  targetOptions,
  title,
}: McpCommandDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult('');
    try {
      const response = await execute(requiredMcpFormText(new FormData(event.currentTarget), fieldName, t));
      onSuccess();
      setResult(JSON.stringify(response.data ?? response, null, 2));
    } catch (caught) {
      setError(errorMessage(caught, t('admin.mcp.errors.commandFailed')));
    } finally {
      setSubmitting(false);
    }
  }, [execute, fieldName, onSuccess, t]);

  return (
    <McpDialogShell cancelLabel={t('common.actions.cancel')} icon={icon} onClose={onClose} onSubmit={submit} submitting={submitting} submitLabel={submitLabel} title={title}>
      <ResourceSelectField
        defaultValue={defaultTargetId}
        emptyLabel={targetEmptyLabel}
        label={targetLabel}
        name={fieldName}
        options={targetOptions}
        required
      />
      {result ? (
        <pre className="mt-4 max-h-64 overflow-auto rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100">{result}</pre>
      ) : null}
      {error ? <ErrorMessage message={error} /> : null}
    </McpDialogShell>
  );
}

function UpdateMcpToolDialog({ onClose, onSuccess, t, toolOptions }: McpToolDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const form = new FormData(event.currentTarget);
      await updateMcpTool(requiredMcpFormText(form, 'toolId', t), updateToolInputFromForm(form, t));
      onSuccess();
      onClose();
    } catch (caught) {
      setError(errorMessage(caught, t('admin.mcp.errors.updateToolFailed')));
    } finally {
      setSubmitting(false);
    }
  }, [onClose, onSuccess, t]);

  return (
    <McpDialogShell cancelLabel={t('common.actions.cancel')} icon={<ShieldCheck className="h-4 w-4" />} onClose={onClose} onSubmit={submit} submitting={submitting} submitLabel={t('common.actions.save', 'Save')} title={t('admin.mcp.tool.updateTitle', 'Update MCP Tool')}>
      <div className="grid gap-4 md:grid-cols-2">
        <ResourceSelectField
          emptyLabel={t('admin.mcp.fields.selectTool')}
          label={t('admin.mcp.fields.tool')}
          name="toolId"
          options={toolOptions}
          required
        />
        <Field label={t('admin.mcp.fields.name', 'Name')} name="name" />
        <Field label={t('admin.mcp.fields.riskLevel', 'Risk Level')} name="riskLevel" placeholder="low" />
        <SelectField defaultValue="" label={t('admin.mcp.fields.requiresApproval', 'Requires Approval')} name="requiresApproval">
          <option value="">-</option>
          <option value="true">true</option>
          <option value="false">false</option>
        </SelectField>
        <SelectField defaultValue="" label={t('admin.mcp.fields.enabled', 'Enabled')} name="enabled">
          <option value="">-</option>
          <option value="true">true</option>
          <option value="false">false</option>
        </SelectField>
        <Field label={t('admin.mcp.fields.status', 'Status')} name="status" placeholder="active" />
        <Field label={t('admin.mcp.fields.sortWeight', 'Sort Weight')} name="sortWeight" type="number" />
        <TextArea label={t('admin.mcp.fields.description', 'Description')} name="description" rows={3} />
        <TextArea defaultValue="{}" label={t('admin.mcp.fields.inputSchema', 'Input Schema JSON')} name="inputSchema" rows={5} />
        <TextArea defaultValue="{}" label={t('admin.mcp.fields.outputSchema', 'Output Schema JSON')} name="outputSchema" rows={5} />
        <TextArea defaultValue="{}" label={t('admin.mcp.fields.rateLimitPolicy', 'Rate Limit Policy JSON')} name="rateLimitPolicy" rows={5} />
      </div>
      {error ? <ErrorMessage message={error} /> : null}
    </McpDialogShell>
  );
}

function CreateMcpBindingDialog({ defaultServerId, onClose, onSuccess, revisionOptions, serverOptions, t, toolOptions }: McpBindingCreateDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const form = new FormData(event.currentTarget);
      await createMcpBinding(requiredMcpFormText(form, 'serverId', t), createMcpBindingInputFromForm(form, t));
      onSuccess();
      onClose();
    } catch (caught) {
      setError(errorMessage(caught, t('admin.mcp.errors.createBindingFailed')));
    } finally {
      setSubmitting(false);
    }
  }, [onClose, onSuccess, t]);

  return (
    <McpDialogShell cancelLabel={t('common.actions.cancel')} icon={<Activity className="h-4 w-4" />} onClose={onClose} onSubmit={submit} submitting={submitting} submitLabel={t('admin.mcp.actions.createBinding', 'Create Binding')} title={t('admin.mcp.binding.createTitle', 'Create MCP Binding')}>
      <div className="grid gap-4 md:grid-cols-2">
        <ResourceSelectField
          defaultValue={defaultServerId}
          emptyLabel={t('admin.mcp.fields.selectServer', 'Select MCP server')}
          label={t('admin.mcp.fields.server', 'MCP Server')}
          name="serverId"
          options={serverOptions}
          required
        />
        <ResourceSelectField
          emptyLabel={t('admin.mcp.fields.defaultRevision', 'Use server default revision')}
          label={t('admin.mcp.fields.serverRevision', 'Server Revision')}
          name="serverRevisionId"
          options={revisionOptions}
        />
        <ResourceSelectField
          emptyLabel={t('admin.mcp.fields.defaultTool', 'Apply to all tools')}
          label={t('admin.mcp.fields.tool', 'Tool')}
          name="toolId"
          options={toolOptions}
        />
        <Field defaultValue="agent" label={t('admin.mcp.fields.ownerType', 'Owner Type')} name="ownerType" required />
        <Field label={t('admin.mcp.fields.ownerId', 'Owner ID')} name="ownerId" required type="number" />
        <Field defaultValue="0" label={t('admin.mcp.fields.priority', 'Priority')} name="priority" type="number" />
        <SelectField defaultValue="true" label={t('admin.mcp.fields.enabled', 'Enabled')} name="enabled">
          <option value="true">true</option>
          <option value="false">false</option>
        </SelectField>
        <SelectField defaultValue="enabled" label={t('admin.mcp.fields.status', 'Status')} name="status">
          <option value="enabled">enabled</option>
          <option value="disabled">disabled</option>
        </SelectField>
        <TextArea defaultValue="[]" label={t('admin.mcp.fields.allowedTools', 'Allowed Tools JSON')} name="allowedTools" rows={4} />
        <TextArea defaultValue="[]" label={t('admin.mcp.fields.deniedTools', 'Denied Tools JSON')} name="deniedTools" rows={4} />
        <TextArea defaultValue="{}" label={t('admin.mcp.fields.policyJson', 'Policy JSON')} name="policyJson" rows={5} />
      </div>
      {error ? <ErrorMessage message={error} /> : null}
    </McpDialogShell>
  );
}

function UpdateMcpBindingDialog({ bindingOptions, onClose, onSuccess, revisionOptions, t, toolOptions }: McpBindingUpdateDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const form = new FormData(event.currentTarget);
      await updateMcpBinding(requiredMcpFormText(form, 'bindingId', t), updateMcpBindingInputFromForm(form, t));
      onSuccess();
      onClose();
    } catch (caught) {
      setError(errorMessage(caught, t('admin.mcp.errors.updateBindingFailed')));
    } finally {
      setSubmitting(false);
    }
  }, [onClose, onSuccess, t]);

  return (
    <McpDialogShell cancelLabel={t('common.actions.cancel')} icon={<Activity className="h-4 w-4" />} onClose={onClose} onSubmit={submit} submitting={submitting} submitLabel={t('common.actions.save', 'Save')} title={t('admin.mcp.binding.updateTitle', 'Update MCP Binding')}>
      <div className="grid gap-4 md:grid-cols-2">
        <ResourceSelectField
          emptyLabel={t('admin.mcp.fields.selectBinding', 'Select binding')}
          label={t('admin.mcp.fields.binding', 'Binding')}
          name="bindingId"
          options={bindingOptions}
          required
        />
        <ResourceSelectField
          emptyLabel={t('admin.mcp.fields.keepRevision', 'Keep current revision')}
          extraOptions={[
            {
              detail: '',
              label: t('admin.mcp.fields.defaultRevision', 'Use server default revision'),
              value: MCP_BINDING_NULL_REVISION_VALUE,
            },
          ]}
          label={t('admin.mcp.fields.serverRevision', 'Server Revision')}
          name="serverRevisionId"
          options={revisionOptions}
        />
        <ResourceSelectField
          emptyLabel={t('admin.mcp.fields.keepTool', 'Keep current tool scope')}
          extraOptions={[
            {
              detail: '',
              label: t('admin.mcp.fields.defaultTool', 'Apply to all tools'),
              value: MCP_BINDING_NULL_TOOL_VALUE,
            },
          ]}
          label={t('admin.mcp.fields.tool', 'Tool')}
          name="toolId"
          options={toolOptions}
        />
        <Field label={t('admin.mcp.fields.ownerType', 'Owner Type')} name="ownerType" />
        <Field label={t('admin.mcp.fields.ownerId', 'Owner ID')} name="ownerId" type="number" />
        <Field label={t('admin.mcp.fields.priority', 'Priority')} name="priority" type="number" />
        <SelectField defaultValue="" label={t('admin.mcp.fields.enabled', 'Enabled')} name="enabled">
          <option value="">-</option>
          <option value="true">true</option>
          <option value="false">false</option>
        </SelectField>
        <SelectField defaultValue="" label={t('admin.mcp.fields.status', 'Status')} name="status">
          <option value="">-</option>
          <option value="enabled">enabled</option>
          <option value="disabled">disabled</option>
        </SelectField>
        <TextArea label={t('admin.mcp.fields.allowedTools', 'Allowed Tools JSON')} name="allowedTools" rows={4} />
        <TextArea label={t('admin.mcp.fields.deniedTools', 'Denied Tools JSON')} name="deniedTools" rows={4} />
        <TextArea label={t('admin.mcp.fields.policyJson', 'Policy JSON')} name="policyJson" rows={5} />
      </div>
      {error ? <ErrorMessage message={error} /> : null}
    </McpDialogShell>
  );
}

type McpDialogProps = {
  onClose: () => void;
  onSuccess: () => void;
  t: ReturnType<typeof useTranslation>['t'];
};

type McpCategoryDialogProps = McpDialogProps & {
  categoryOptions: readonly AdminCategoryOption[];
};

type McpScopedDialogProps = McpDialogProps & {
  defaultServerId: string;
  serverOptions: readonly AdminResourceOption[];
};

type McpScopedCategoryDialogProps = McpScopedDialogProps & {
  categoryOptions: readonly AdminCategoryOption[];
};

type McpRevisionActionDialogProps = McpDialogProps & {
  revisionOptions: readonly AdminResourceOption[];
};

type McpToolDialogProps = McpDialogProps & {
  toolOptions: readonly AdminResourceOption[];
};

type McpBindingCreateDialogProps = McpDialogProps & {
  defaultServerId: string;
  revisionOptions: readonly AdminResourceOption[];
  serverOptions: readonly AdminResourceOption[];
  toolOptions: readonly AdminResourceOption[];
};

type McpBindingUpdateDialogProps = McpDialogProps & {
  bindingOptions: readonly AdminResourceOption[];
  revisionOptions: readonly AdminResourceOption[];
  toolOptions: readonly AdminResourceOption[];
};

type McpCategoryManagementDialogProps = McpDialogProps & {
  category: AdminCategoryOption | null;
  categories: readonly AdminCategoryOption[];
  parentId: string | null;
};

type McpCommandDialogProps = {
  defaultTargetId: string;
  execute: (targetId: string) => Promise<{ data?: unknown }>;
  fieldName: string;
  icon: React.ReactNode;
  onClose: () => void;
  onSuccess: () => void;
  submitLabel: string;
  targetEmptyLabel: string;
  targetLabel: string;
  targetOptions: readonly AdminResourceOption[];
  title: string;
  t: ReturnType<typeof useTranslation>['t'];
};

type McpDialogShellProps = {
  cancelLabel: string;
  children: React.ReactNode;
  icon: React.ReactNode;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  submitting: boolean;
  submitLabel: string;
  title: string;
};

function McpDialogShell({
  cancelLabel,
  children,
  icon,
  onClose,
  onSubmit,
  submitting,
  submitLabel,
  title,
}: McpDialogShellProps) {
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
      <option value="">{t('admin.mcp.fields.noCategory', 'No category')}</option>
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
  rows = 4,
}: {
  defaultValue?: string;
  label: string;
  name: string;
  rows?: number;
}) {
  return (
    <label className="block md:col-span-2">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <textarea
        className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-900 outline-none focus:border-blue-500 dark:border-white/10 dark:bg-[#202020] dark:text-white"
        defaultValue={defaultValue}
        name={name}
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

function createServerInputFromForm(form: FormData, t: TranslationFn): AdminMcpServerCreateInput {
  return {
    serverKey: requiredMcpFormText(form, 'serverKey', t),
    name: requiredMcpFormText(form, 'name', t),
    description: optionalFormText(form, 'description'),
    categoryId: optionalFormText(form, 'categoryId'),
    transport: optionalFormText(form, 'transport') ?? 'http',
    visibility: optionalFormText(form, 'visibility') ?? 'organization',
    tags: splitCsv(optionalFormText(form, 'tags') ?? ''),
  };
}

function updateServerInputFromForm(form: FormData): AdminMcpServerUpdateInput {
  return pruneUndefined({
    serverKey: optionalFormText(form, 'serverKey'),
    name: optionalFormText(form, 'name'),
    description: optionalFormText(form, 'description'),
    categoryId: optionalFormText(form, 'categoryId'),
    transport: optionalFormText(form, 'transport'),
    visibility: optionalFormText(form, 'visibility'),
    status: optionalFormText(form, 'status'),
    tags: optionalCsv(form, 'tags'),
  });
}

function createRevisionInputFromForm(form: FormData, t: TranslationFn): AdminMcpServerRevisionCreateInput {
  return {
    revisionNo: requiredMcpFormText(form, 'revisionNo', t),
    transport: optionalFormText(form, 'transport') ?? 'http',
    endpointUrl: optionalFormText(form, 'endpointUrl'),
    command: optionalFormText(form, 'command'),
    argsJson: parseOptionalStringArray(form, 'argsJson', t),
    envSchema: parseOptionalJsonObject(form, 'envSchema', t),
    authType: optionalFormText(form, 'authType') ?? 'none',
    secretRef: optionalFormText(form, 'secretRef'),
    timeoutMs: optionalInteger(form, 'timeoutMs', t),
    retryPolicy: parseOptionalJsonObject(form, 'retryPolicy', t),
  };
}

function updateToolInputFromForm(form: FormData, t: TranslationFn): AdminMcpToolUpdateInput {
  return pruneUndefined({
    name: optionalFormText(form, 'name'),
    description: optionalFormText(form, 'description'),
    inputSchema: parseOptionalJsonObject(form, 'inputSchema', t),
    outputSchema: parseOptionalJsonObject(form, 'outputSchema', t),
    riskLevel: optionalFormText(form, 'riskLevel'),
    requiresApproval: optionalBoolean(form, 'requiresApproval', t),
    enabled: optionalBoolean(form, 'enabled', t),
    status: optionalFormText(form, 'status'),
    rateLimitPolicy: parseOptionalJsonObject(form, 'rateLimitPolicy', t),
    sortWeight: optionalInteger(form, 'sortWeight', t),
  });
}

function createMcpBindingInputFromForm(form: FormData, t: TranslationFn): AdminMcpBindingCreateInput {
  return {
    serverRevisionId: optionalIntegerString(form, 'serverRevisionId', t),
    toolId: optionalIntegerString(form, 'toolId', t),
    ownerType: requiredMcpFormText(form, 'ownerType', t),
    ownerId: requiredIntegerString(form, 'ownerId', t),
    allowedTools: parseOptionalStringArray(form, 'allowedTools', t),
    deniedTools: parseOptionalStringArray(form, 'deniedTools', t),
    policyJson: parseOptionalJsonObject(form, 'policyJson', t),
    priority: optionalInteger(form, 'priority', t),
    enabled: optionalBoolean(form, 'enabled', t),
    status: optionalFormText(form, 'status'),
  };
}

function updateMcpBindingInputFromForm(form: FormData, t: TranslationFn): AdminMcpBindingUpdateInput {
  return pruneUndefined({
    serverRevisionId: optionalNullableIntegerString(form, 'serverRevisionId', MCP_BINDING_NULL_REVISION_VALUE, t),
    toolId: optionalNullableIntegerString(form, 'toolId', MCP_BINDING_NULL_TOOL_VALUE, t),
    ownerType: optionalFormText(form, 'ownerType'),
    ownerId: optionalIntegerString(form, 'ownerId', t),
    allowedTools: parseOptionalStringArray(form, 'allowedTools', t),
    deniedTools: parseOptionalStringArray(form, 'deniedTools', t),
    policyJson: parseOptionalJsonObject(form, 'policyJson', t),
    priority: optionalInteger(form, 'priority', t),
    enabled: optionalBoolean(form, 'enabled', t),
    status: optionalFormText(form, 'status'),
  });
}

function createCategoryInputFromForm(form: FormData, t: TranslationFn): AdminAiCategoryCreateInput {
  return pruneUndefined({
    name: requiredMcpFormText(form, 'name', t),
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
    throw new Error(mcpValidationMessage(t, key, 'jsonObject'));
  }
  return parsed;
}

function parseOptionalStringArray(form: FormData, key: string, t: TranslationFn): string[] | undefined {
  const value = optionalFormText(form, key);
  if (!value) {
    return undefined;
  }
  const parsed = parseJson(value, key, t);
  if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== 'string')) {
    throw new Error(mcpValidationMessage(t, key, 'jsonStringArray'));
  }
  return parsed.map((item) => item as string);
}

function parseJson(value: string, key: string, t: TranslationFn): JsonValue {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error(mcpValidationMessage(t, key, 'validJson'));
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
      throw new Error(mcpValidationMessage(t, key, 'jsonNumber'));
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
  throw new Error(mcpValidationMessage(t, key, 'jsonValue'));
}

function isJsonObject(value: JsonValue): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredMcpFormText(form: FormData, key: string, t: TranslationFn): string {
  const value = optionalFormText(form, key);
  if (!value) {
    throw new Error(mcpValidationMessage(t, key, 'required'));
  }
  return value;
}

function requiredInteger(form: FormData, key: string, t: TranslationFn): number {
  const value = optionalInteger(form, key, t);
  if (value === undefined) {
    throw new Error(mcpValidationMessage(t, key, 'required'));
  }
  return value;
}

function requiredIntegerString(form: FormData, key: string, t: TranslationFn): string {
  return String(requiredInteger(form, key, t));
}

function optionalFormText(form: FormData, key: string): string | undefined {
  const value = form.get(key);
  if (typeof value !== 'string') {
    return undefined;
  }
  const normalized = value.trim();
  return normalized ? normalized : undefined;
}

function optionalInteger(form: FormData, key: string, t: TranslationFn): number | undefined {
  const value = optionalFormText(form, key);
  if (value === undefined) {
    return undefined;
  }
  const numberValue = Number(value);
  if (!Number.isSafeInteger(numberValue)) {
    throw new Error(mcpValidationMessage(t, key, 'integer'));
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
    throw new Error(mcpValidationMessage(t, key, 'integer'));
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
    throw new Error(mcpValidationMessage(t, key, 'integer'));
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
  throw new Error(mcpValidationMessage(t, key, 'boolean'));
}

function mcpValidationMessage(
  t: TranslationFn,
  key: string,
  kind: 'boolean' | 'integer' | 'jsonNumber' | 'jsonObject' | 'jsonStringArray' | 'jsonValue' | 'required' | 'validJson',
): string {
  const field = mcpFieldLabel(t, key);
  if (kind === 'required') {
    return t('admin.mcp.validation.required', { field });
  }
  if (kind === 'validJson') {
    return t('admin.mcp.validation.validJson', { field });
  }
  if (kind === 'jsonObject') {
    return t('admin.mcp.validation.jsonObject', { field });
  }
  if (kind === 'jsonStringArray') {
    return t('admin.mcp.validation.jsonStringArray', { field });
  }
  if (kind === 'integer') {
    return t('admin.mcp.validation.integer', { field });
  }
  if (kind === 'boolean') {
    return t('admin.mcp.validation.boolean', { field });
  }
  if (kind === 'jsonNumber') {
    return t('admin.mcp.validation.jsonNumber', { field });
  }
  return t('admin.mcp.validation.jsonValue', { field });
}

function mcpFieldLabel(t: TranslationFn, key: string): string {
  const normalizedKey = key.replace(/\[[^\]]+\]/gu, '').split('.')[0];
  switch (normalizedKey) {
    case 'allowedTools':
      return t('admin.mcp.fields.allowedTools');
    case 'argsJson':
      return t('admin.mcp.fields.argsJson');
    case 'bindingId':
      return t('admin.mcp.fields.binding');
    case 'deniedTools':
      return t('admin.mcp.fields.deniedTools');
    case 'enabled':
      return t('admin.mcp.fields.enabled');
    case 'envSchema':
      return t('admin.mcp.fields.envSchema');
    case 'inputSchema':
      return t('admin.mcp.fields.inputSchema');
    case 'name':
      return t('admin.mcp.fields.name');
    case 'ownerId':
      return t('admin.mcp.fields.ownerId');
    case 'ownerType':
      return t('admin.mcp.fields.ownerType');
    case 'outputSchema':
      return t('admin.mcp.fields.outputSchema');
    case 'policyJson':
      return t('admin.mcp.fields.policyJson');
    case 'priority':
      return t('admin.mcp.fields.priority');
    case 'rateLimitPolicy':
      return t('admin.mcp.fields.rateLimitPolicy');
    case 'requiresApproval':
      return t('admin.mcp.fields.requiresApproval');
    case 'retryPolicy':
      return t('admin.mcp.fields.retryPolicy');
    case 'revisionId':
      return t('admin.mcp.fields.revision');
    case 'revisionNo':
      return t('admin.mcp.fields.revisionNo');
    case 'serverId':
      return t('admin.mcp.fields.server');
    case 'serverKey':
      return t('admin.mcp.fields.serverKey');
    case 'serverRevisionId':
      return t('admin.mcp.fields.serverRevision');
    case 'sortWeight':
      return t('admin.mcp.fields.sortWeight');
    case 'timeoutMs':
      return t('admin.mcp.fields.timeoutMs');
    case 'toolId':
      return t('admin.mcp.fields.tool');
    default:
      return normalizedKey || key;
  }
}

function optionalCsv(form: FormData, key: string): string[] | undefined {
  const value = optionalFormText(form, key);
  if (!value) {
    return undefined;
  }
  return splitCsv(value);
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
