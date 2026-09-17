import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type InputHTMLAttributes, type ReactNode } from 'react';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { getLoadErrorMessage } from '@sdkwork/cloudroutes-pc-commons/runtime';
import {
  Activity,
  BarChart3,
  CheckCircle2,
  CloudCog,
  DatabaseZap,
  Eye,
  FolderOpen,
  Gauge,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Recycle,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import {
  StorageObjectBrowser,
  StorageProviderEditor,
  type StorageProviderView,
} from 'sdkwork-drive-pc-admin-storage-providers';
import { LanguageProvider } from 'sdkwork-drive-pc-commons';
import {
  AdminResourceCenter,
  type AdminResourceRecord,
  type AdminResourceSection,
} from '@sdkwork/cloudroutes-pc-commons';
import {
  backendStorageDefaultBucketUpdate,
  backendStorageDefaultBucketsList,
  backendStorageGarbageCollectionJobCreate,
  backendStorageGarbageCollectionJobsList,
  backendStorageProviderAccountCreate,
  backendStorageProviderAccountsList,
  backendStorageProviderCreate,
  backendStorageProviderDelete,
  backendStorageProviderHealthCheck,
  backendStorageProvidersList,
  backendStorageProviderRotateCredential,
  backendStorageProviderUpdate,
  backendStorageQuotaCreate,
  backendStorageQuotasList,
  backendStorageReconciliationRunCreate,
  backendStorageReconciliationRunsList,
  backendStorageUsageList,
  getStorageProviderAdminService,
  type StorageDefaultBucketUpdateInput,
  type StorageGarbageCollectionCreateInput,
  type StorageProviderRecord,
  type StorageProviderUpdateInput,
  type StorageQuotaCreateInput,
  type StorageReconciliationCreateInput,
} from './storageService';

type StorageAdminSectionId =
  | 'providers'
  | 'defaultBuckets'
  | 'quotas'
  | 'usage'
  | 'reconciliation'
  | 'garbageCollection';

/**
 * 通用配置对话框覆盖的区段。
 *
 * `providers` 被排除在外：存储服务商不再走这个手写的通用表单，而是复用
 * drive 属主的 `StorageProviderEditor`（见 `providerEditorOpen`）。把它排除在
 * 联合类型之外，任何「再用通用表单渲染服务商」的尝试都会变成编译错误，
 * 而不是悄悄分叉出第二套凭据 UI。
 */
type StorageDialogKind = Exclude<StorageAdminSectionId, 'usage' | 'providers'>;

type StorageAdminProps = {
  sectionId?: string;
};

/** 提示消息类型：成功与错误统一走 Toast 弹出，不再占用表格顶部空间。 */
type ToastKind = 'error' | 'success';

type ToastItem = {
  id: number;
  kind: ToastKind;
  text: string;
};

/** 成功提示展示时长（毫秒）。 */
const TOAST_SUCCESS_DURATION_MS = 4000;
/** 错误提示展示时长（毫秒），略长于成功，便于阅读后端详情。 */
const TOAST_ERROR_DURATION_MS = 6500;

/**
 * 通用配置对话框的表单状态。
 *
 * 这里只保留 cloudrouter 自己属主的那几类治理记录（默认桶 / 配额 / 对账 / GC）
 * 的字段。存储服务商不在其中：它的连接信息与凭据由 drive 的
 * `StorageProviderEditor` 用自己的状态维护，cloudrouter 只负责把入参透传给
 * 共享服务，因此这里没有服务商连接信息与凭据的影子字段。
 */
type StorageFormState = {
  logicalScope: StorageQuotaCreateInput['scopeType'] | 'tenant_private';
  bucketId: string;
  /** 对账运行的目标服务商（`reconciliation` 区段的下拉选择，非服务商表单字段）。 */
  providerId: string;
  reason: string;
  scopeType: StorageQuotaCreateInput['scopeType'];
  scopeId: string;
  quotaLimitBytes: string;
  singleFileLimitBytes: string;
  enforcement: string;
  runType: string;
  dryRun: boolean;
  jobType: string;
  target: string;
  retentionWindow: string;
  dryRunSample: string;
  criteria: string;
};

const DEFAULT_FORM_STATE: StorageFormState = {
  logicalScope: 'tenant_private',
  bucketId: '',
  providerId: '',
  reason: '',
  scopeType: 'tenant',
  scopeId: '',
  quotaLimitBytes: '',
  singleFileLimitBytes: '',
  enforcement: 'hard',
  runType: 'full',
  dryRun: true,
  jobType: 'expired_objects',
  target: '',
  retentionWindow: '30d',
  dryRunSample: '100',
  criteria: '{}',
};

const SECTION_IDS: readonly StorageAdminSectionId[] = [
  'providers',
  'defaultBuckets',
  'quotas',
  'usage',
  'reconciliation',
  'garbageCollection',
];

export function StorageAdmin({ sectionId }: StorageAdminProps = {}) {
  return (
    <DriveLanguageBridge>
      <StorageAdminSections sectionId={sectionId} />
    </DriveLanguageBridge>
  );
}

/**
 * Drive's storage components resolve their labels through drive's own language
 * context (`sdkwork-drive-pc-commons`), which cloudrouter never provided: the
 * object browser was already rendered from that package, so every one of its
 * labels fell back to its raw i18n key instead of showing text.
 *
 * The bridge lives here — in the package that consumes drive's components —
 * rather than in the admin host, so the requirement stays next to the dependency
 * that creates it and travels with the package if it is ever mounted elsewhere.
 * `resolveHostLanguage` is read once on mount and `subscribeHostLanguage` keeps
 * it current, so switching the console language re-renders these components too.
 */
function DriveLanguageBridge({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();
  const resolveHostLanguage = useCallback(
    () => i18n.resolvedLanguage ?? i18n.language ?? 'en-US',
    [i18n],
  );
  const subscribeHostLanguage = useCallback(
    (listener: (language: string) => void) => {
      const handler = (language: string) => listener(language);
      i18n.on('languageChanged', handler);
      return () => {
        i18n.off('languageChanged', handler);
      };
    },
    [i18n],
  );
  return (
    <LanguageProvider resolveHostLanguage={resolveHostLanguage} subscribeHostLanguage={subscribeHostLanguage}>
      {children}
    </LanguageProvider>
  );
}

function StorageAdminSections({ sectionId }: StorageAdminProps = {}) {
  const { t } = useTranslation();
  const activeSectionId = resolveStorageSectionId(sectionId);
  const [dialogKind, setDialogKind] = useState<StorageDialogKind | null>(null);
  const [form, setForm] = useState<StorageFormState>(DEFAULT_FORM_STATE);
  const [saving, setSaving] = useState(false);
  const [toasts, setToasts] = useState<readonly ToastItem[]>([]);
  const toastIdRef = useRef(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [explorerProvider, setExplorerProvider] = useState<StorageProviderRecord | null>(null);
  const [viewingProvider, setViewingProvider] = useState<AdminResourceRecord | null>(null);
  const [editingProvider, setEditingProvider] = useState<AdminResourceRecord | null>(null);
  const [providerEditorOpen, setProviderEditorOpen] = useState(false);
  /**
   * 最近一次列出的服务商 ID。共享编辑器用它避免生成重复 ID；
   * 数据由 providers 区段的 `load` 顺手记下，省掉一次额外请求。
   */
  const knownProviderIdsRef = useRef<readonly string[]>([]);
  const [deletingProvider, setDeletingProvider] = useState<{ id: string; name: string; providerCode: string } | null>(null);

  /** 推送一条 Toast 提示，超时后自动移除（错误比成功展示更久）；最多同时保留 5 条防堆积。 */
  const pushToast = useCallback((kind: ToastKind, text: string) => {
    const id = ++toastIdRef.current;
    setToasts((current) => [...current.slice(-4), { id, kind, text }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, kind === 'error' ? TOAST_ERROR_DURATION_MS : TOAST_SUCCESS_DURATION_MS);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const sections = useMemo<AdminResourceSection<StorageAdminSectionId, string>[]>(() => [
    {
      id: 'providers',
      title: t('admin.storage.providers.title', 'Storage Providers'),
      description: t('admin.storage.providers.desc', 'S3-compatible provider endpoints and capability profiles. Credentials are represented only by managed secret references.'),
      icon: <CloudCog className="h-4 w-4" />,
      group: t('admin.menu.storage.configuration', 'Storage Configuration'),
      load: () => loadProviderResourceRecords(knownProviderIdsRef),
      action: createAction(t('admin.storage.providers.add', 'Add provider'), () => openProviderCreate()),
      rowActions: [
        {
          label: t('admin.storage.providers.detail', 'Details'),
          icon: <Eye className="h-3.5 w-3.5" />,
          onClick: (record) => openProviderDetail(record),
        },
        {
          label: t('admin.storage.providers.disable', 'Disable'),
          icon: <PowerOff className="h-3.5 w-3.5" />,
          isVisible: (record) => record.status !== 'disabled',
          onClick: (record) => void toggleProviderStatus(record),
        },
        {
          label: t('admin.storage.providers.enable', 'Enable'),
          icon: <Power className="h-3.5 w-3.5" />,
          isVisible: (record) => record.status === 'disabled',
          onClick: (record) => void toggleProviderStatus(record),
        },
        {
          /**
           * 编辑即包含凭据：链接信息与凭据来源（复用账号 / 手工引用）在共享编辑器
           * 的同一个表单里，所以这里不再单列一个「凭据」动作——那正是分叉的来源。
           */
          label: t('admin.storage.providers.edit', 'Edit'),
          icon: <Pencil className="h-3.5 w-3.5" />,
          onClick: (record) => openProviderEditor(record),
        },
        {
          label: t('admin.storage.providers.healthCheck', 'Health check'),
          icon: <Activity className="h-3.5 w-3.5" />,
          onClick: (record) => void runProviderHealthCheck(record),
        },
        {
          label: t('admin.storage.buckets.files', 'Browse files'),
          icon: <FolderOpen className="h-3.5 w-3.5" />,
          onClick: (record) => openProviderExplorer(record),
        },
        {
          label: t('admin.storage.providers.delete', 'Delete'),
          icon: <Trash2 className="h-3.5 w-3.5" />,
          tone: 'danger',
          onClick: (record) => openProviderDelete(record),
        },
      ],
      columns: [
        { key: 'name', label: t('admin.storage.col.name', 'Name'), format: (value) => {
          const name = typeof value === 'string' && value ? value : '';
          return name || '-';
        } },
        { key: 'providerType', label: t('admin.storage.col.type', 'Type'), format: (value) => formatProviderType(t, value) },
        { key: 'bucket', label: t('admin.storage.col.bucket', 'Bucket') },
        { key: 'endpointUrl', label: t('admin.storage.col.endpoint', 'Endpoint') },
        { key: 'region', label: t('admin.storage.col.region', 'Region') },
        { key: 'credentialConfigured', label: t('admin.storage.col.credentialRef', 'Credential Ref'), format: (value) => formatCredentialConfigured(t, value) },
        { key: 'status', label: t('admin.storage.col.status', 'Status'), format: (value) => translateStorageValue(t, 'status', value) },
      ],
      searchFields: ['name', 'providerType', 'bucket', 'endpointUrl', 'region', 'status'],
    },
    {
      id: 'defaultBuckets',
      title: t('admin.storage.defaultBuckets.title', 'Default Buckets'),
      description: t('admin.storage.defaultBuckets.desc', 'Default bucket assignments for every application and system logical scope.'),
      icon: <ShieldCheck className="h-4 w-4" />,
      group: t('admin.menu.storage.configuration', 'Storage Configuration'),
      load: () => backendStorageDefaultBucketsList(),
      action: createAction(t('admin.storage.defaultBuckets.set', 'Set default'), () => openDialog('defaultBuckets')),
      columns: [
        { key: 'logicalScope', label: t('admin.storage.col.logicalScope', 'Logical Scope'), format: (value) => translateStorageValue(t, 'logicalScope', value) },
        { key: 'bucketName', label: t('admin.storage.col.bucket', 'Bucket') },
        { key: 'providerCode', label: t('admin.storage.col.providerCode', 'Provider') },
        { key: 'reason', label: t('admin.storage.col.reason', 'Reason') },
        { key: 'updatedAt', label: t('admin.storage.col.updatedAt', 'Updated'), format: formatDateTime },
      ],
      searchFields: ['logicalScope', 'bucketName', 'providerCode', 'reason'],
    },
    {
      id: 'quotas',
      title: t('admin.storage.quotas.title', 'Quota Policies'),
      description: t('admin.storage.quotas.desc', 'Tenant, organization, app, space, and user storage limits with per-file enforcement.'),
      icon: <Gauge className="h-4 w-4" />,
      group: t('admin.menu.storage.governance', 'Storage Governance'),
      load: () => backendStorageQuotasList(),
      action: createAction(t('admin.storage.quotas.add', 'Add quota'), () => openDialog('quotas')),
      columns: [
        { key: 'scopeType', label: t('admin.storage.col.scopeType', 'Scope Type'), format: (value) => translateStorageValue(t, 'scopeType', value) },
        { key: 'scopeId', label: t('admin.storage.col.scopeId', 'Scope ID') },
        { key: 'quotaLimitBytes', label: t('admin.storage.col.quota', 'Quota Bytes'), align: 'right', format: (value) => formatBytes(t, value) },
        { key: 'usedBytes', label: t('admin.storage.col.used', 'Used Bytes'), align: 'right', format: (value) => formatBytes(t, value) },
        { key: 'singleFileLimitBytes', label: t('admin.storage.col.fileLimit', 'File Limit'), align: 'right', format: (value) => formatBytes(t, value) },
        { key: 'enforcement', label: t('admin.storage.col.enforcement', 'Enforcement'), format: (value) => translateStorageValue(t, 'enforcement', value) },
      ],
      searchFields: ['scopeType', 'scopeId', 'enforcement'],
    },
    {
      id: 'usage',
      title: t('admin.storage.usage.title', 'Storage Usage'),
      description: t('admin.storage.usage.desc', 'Current logical and reserved storage usage by ownership scope.'),
      icon: <BarChart3 className="h-4 w-4" />,
      group: t('admin.menu.storage.governance', 'Storage Governance'),
      load: () => backendStorageUsageList(),
      columns: [
        { key: 'scopeType', label: t('admin.storage.col.scopeType', 'Scope Type'), format: (value) => translateStorageValue(t, 'scopeType', value) },
        { key: 'scopeId', label: t('admin.storage.col.scopeId', 'Scope ID') },
        { key: 'fileCount', label: t('admin.storage.col.objects', 'Files'), align: 'right' },
        { key: 'usedBytes', label: t('admin.storage.col.used', 'Used Bytes'), align: 'right', format: (value) => formatBytes(t, value) },
        { key: 'reservedBytes', label: t('admin.storage.col.reserved', 'Reserved Bytes'), align: 'right', format: (value) => formatBytes(t, value) },
        { key: 'snapshotAt', label: t('admin.storage.col.updatedAt', 'Updated'), format: formatDateTime },
      ],
      searchFields: ['scopeType', 'scopeId', 'snapshotAt'],
    },
    {
      id: 'reconciliation',
      title: t('admin.storage.reconciliation.title', 'Storage Reconciliation'),
      description: t('admin.storage.reconciliation.desc', 'Compare metadata and provider objects, report drift, and execute controlled repair runs.'),
      icon: <DatabaseZap className="h-4 w-4" />,
      group: t('admin.menu.storage.governance', 'Storage Governance'),
      load: () => backendStorageReconciliationRunsList(),
      action: createAction(t('admin.storage.reconciliation.run', 'Start run'), () => openDialog('reconciliation')),
      columns: [
        { key: 'runId', label: t('admin.storage.col.run', 'Run') },
        { key: 'runType', label: t('admin.storage.col.type', 'Type'), format: (value) => translateStorageValue(t, 'runType', value) },
        { key: 'providerCode', label: t('admin.storage.col.providerCode', 'Provider') },
        { key: 'bucketName', label: t('admin.storage.col.bucket', 'Bucket') },
        { key: 'dryRun', label: t('admin.storage.col.dryRun', 'Dry Run'), format: (value) => formatBoolean(t, value) },
        { key: 'issueCount', label: t('admin.storage.col.drift', 'Issues'), align: 'right' },
        { key: 'status', label: t('admin.storage.col.status', 'Status'), format: (value) => translateStorageValue(t, 'jobStatus', value) },
      ],
      searchFields: ['runId', 'runType', 'providerCode', 'bucketName', 'status'],
    },
    {
      id: 'garbageCollection',
      title: t('admin.storage.gc.title', 'Garbage Collection'),
      description: t('admin.storage.gc.desc', 'Auditable cleanup jobs with retention windows, dry-run sampling, and explicit target criteria.'),
      icon: <Recycle className="h-4 w-4" />,
      group: t('admin.menu.storage.governance', 'Storage Governance'),
      load: () => backendStorageGarbageCollectionJobsList(),
      action: createAction(t('admin.storage.gc.add', 'Create job'), () => openDialog('garbageCollection')),
      columns: [
        { key: 'jobId', label: t('admin.storage.col.job', 'Job') },
        { key: 'jobType', label: t('admin.storage.col.type', 'Type'), format: (value) => translateStorageValue(t, 'jobType', value) },
        { key: 'target', label: t('admin.storage.col.target', 'Target') },
        { key: 'retention', label: t('admin.storage.col.retention', 'Retention') },
        { key: 'dryRun', label: t('admin.storage.col.dryRun', 'Dry Run'), format: (value) => formatBoolean(t, value) },
        { key: 'candidateCount', label: t('admin.storage.col.deleted', 'Candidates'), align: 'right' },
        { key: 'status', label: t('admin.storage.col.status', 'Status'), format: (value) => translateStorageValue(t, 'jobStatus', value) },
      ],
      searchFields: ['jobId', 'jobType', 'target', 'status'],
    },
  ], [t]);

  function openDialog(kind: StorageDialogKind) {
    setForm(DEFAULT_FORM_STATE);
    setDialogKind(kind);
  }

  function openProviderExplorer(record: AdminResourceRecord) {
    const id = typeof record.id === 'string' ? record.id : '';
    if (!id) {
      pushToast('error', t('admin.storage.error.missingProviderId', 'Provider ID is missing.'));
      return;
    }
    // drive 存储提供者即桶浏览入口（单桶 per provider）。
    setExplorerProvider(record as unknown as StorageProviderRecord);
  }

  function openProviderDetail(record: AdminResourceRecord) {
    if (!readRecordId(record)) {
      pushToast('error', t('admin.storage.error.missingProviderId', 'Provider ID is missing.'));
      return;
    }
    setViewingProvider(record);
  }

  /** 新建服务商：交给共享编辑器，cloudrouter 不再预填一套自己的表单状态。 */
  function openProviderCreate() {
    setEditingProvider(null);
    setProviderEditorOpen(true);
  }

  function openProviderEditor(record: AdminResourceRecord) {
    if (!readRecordId(record)) {
      pushToast('error', t('admin.storage.error.missingProviderId', 'Provider ID is missing.'));
      return;
    }
    setEditingProvider(record);
    setProviderEditorOpen(true);
  }

  /**
   * 关闭共享编辑器。保存中的拦截由编辑器自己做（它在提交期间忽略关闭请求），
   * 这里只负责把 cloudrouter 自己的两个状态复位——包括清掉 `editingProvider`，
   * 否则下一次「新建」会带着上一个被编辑的服务商打开。
   */
  function closeProviderEditor() {
    setProviderEditorOpen(false);
    setEditingProvider(null);
  }

  function openProviderDelete(record: AdminResourceRecord) {
    const id = readRecordId(record);
    if (!id) {
      pushToast('error', t('admin.storage.error.missingProviderId', 'Provider ID is missing.'));
      return;
    }
    const name = typeof record.displayName === 'string' && record.displayName
      ? record.displayName
      : typeof record.name === 'string' && record.name ? record.name : id;
    setDeletingProvider({
      id,
      name,
      providerCode: typeof record.providerCode === 'string' ? record.providerCode : '',
    });
  }

  /** 一键切换服务商启用状态：active → disabled，disabled → active。 */
  async function toggleProviderStatus(record: AdminResourceRecord) {
    const providerId = readRecordId(record);
    if (!providerId) {
      pushToast('error', t('admin.storage.error.missingProviderId', 'Provider ID is missing.'));
      return;
    }
    const current = typeof record.status === 'string' ? record.status : 'active';
    const disabling = current !== 'disabled';
    const nextStatus = disabling ? 'disabled' : 'active';
    try {
      await backendStorageProviderUpdate(providerId, {
        status: nextStatus as StorageProviderUpdateInput['status'],
      });
      setRefreshKey((value) => value + 1);
      pushToast('success', disabling
        ? t('admin.storage.providers.disableSuccess', 'Provider disabled successfully.')
        : t('admin.storage.providers.enableSuccess', 'Provider enabled successfully.'));
    } catch (error) {
      pushToast('error', readError(error, disabling
        ? t('admin.storage.providers.disableError', 'Provider could not be disabled.')
        : t('admin.storage.providers.enableError', 'Provider could not be enabled.'), t));
    }
  }

  async function submitProviderDelete() {
    if (!deletingProvider) return;
    setSaving(true);
    try {
      await backendStorageProviderDelete(deletingProvider.id);
      setDeletingProvider(null);
      setRefreshKey((value) => value + 1);
      pushToast('success', t('admin.storage.providers.deleteSuccess', 'Provider deleted successfully.'));
    } catch (error) {
      pushToast('error', readError(error, t('admin.storage.providers.deleteError', 'Provider could not be deleted.'), t));
    } finally {
      setSaving(false);
    }
  }

  async function runProviderHealthCheck(record: AdminResourceRecord) {
    const providerId = readRecordId(record);
    if (!providerId) {
      pushToast('error', t('admin.storage.error.missingProviderId', 'Provider ID is missing.'));
      return;
    }
    try {
      await backendStorageProviderHealthCheck(providerId);
      pushToast('success', t('admin.storage.providers.healthSuccess', 'Provider health check completed.'));
      setRefreshKey((value) => value + 1);
    } catch (error) {
      pushToast('error', readError(error, t('admin.storage.providers.healthError', 'Provider health check failed.'), t));
    }
  }

  async function submitDialog(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dialogKind) return;
    setSaving(true);
    // GC 任务的 criteria 为 JSON 文本：提交前预校验，给出明确错误而不是吞进通用失败。
    if (dialogKind === 'garbageCollection') {
      try {
        JSON.parse(form.criteria || '{}');
      } catch {
        setSaving(false);
        pushToast('error', t('admin.storage.form.criteriaInvalid', 'Criteria must be valid JSON.'));
        return;
      }
    }
    try {
      await submitStorageForm(dialogKind, form);
      setDialogKind(null);
      setRefreshKey((value) => value + 1);
      pushToast('success', t('admin.storage.saveSuccess', 'Storage configuration saved successfully.'));
    } catch (error) {
      pushToast('error', readError(error, t('admin.storage.saveError', 'Storage configuration could not be saved.'), t));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="min-h-0 flex-1">
        <AdminResourceCenter
          activeSectionId={activeSectionId}
          emptyDescription={t('admin.storage.emptyDesc', 'Adjust the search query or reload the current section.')}
          emptyTitle={t('admin.storage.empty', 'No storage records')}
          errorTitle={t('admin.storage.error', 'Storage data could not be loaded')}
          loadingTitle={t('admin.storage.loading', 'Loading storage records...')}
          recordActionColumnLabel={t('admin.storage.action', 'Action')}
          refreshKey={refreshKey}
          reloadLabel={t('admin.storage.reload', 'Reload')}
          retryLabel={t('admin.storage.retry', 'Retry')}
          searchPlaceholder={t('admin.storage.searchPlaceholder', 'Search records')}
          sections={sections}
          showSectionNavigation={false}
          tableViewportDataAttribute="admin-storage-table-viewport"
        />
      </div>
      {dialogKind ? (
        <StorageDialog
          form={form}
          kind={dialogKind}
          onChange={setForm}
          onClose={() => !saving && setDialogKind(null)}
          onSubmit={submitDialog}
          saving={saving}
        />
      ) : null}
      {viewingProvider ? (
        <ProviderDetailDialog
          record={viewingProvider}
          onClose={() => setViewingProvider(null)}
          onEdit={() => {
            openProviderEditor(viewingProvider);
            setViewingProvider(null);
          }}
          onToggle={() => {
            void toggleProviderStatus(viewingProvider);
            setViewingProvider(null);
          }}
        />
      ) : null}
      {providerEditorOpen ? (
        /**
         * 服务商表单由 drive 属主的编辑器提供：链接信息、凭据来源（复用账号中心
         * 账号 / 手工凭据）与轮换都在同一处，cloudrouter 只注入自己的服务门面。
         * 账号中心的两个回调一旦注入，编辑器就会启用可复用账号的下拉与新建入口，
         * 于是「一个账号复用到多个资源」在存储这条链路上是可点选的，而不是靠约定。
         */
        <StorageProviderEditor
          existingProviderIds={knownProviderIdsRef.current}
          onClose={closeProviderEditor}
          onCreateProvider={(input) => backendStorageProviderCreate(input)}
          onListProviderAccounts={(input) => backendStorageProviderAccountsList(input)}
          onCreateProviderAccount={(input) => backendStorageProviderAccountCreate(input)}
          onProviderSaved={() => setRefreshKey((value) => value + 1)}
          onRotateCredential={(providerId, credentialRef) => backendStorageProviderRotateCredential(providerId, credentialRef)}
          onUpdateProvider={(providerId, input) => backendStorageProviderUpdate(providerId, input)}
          provider={editingProvider ? asStorageProviderView(editingProvider) : undefined}
        />
      ) : null}
      {deletingProvider ? (
        <ProviderDeleteDialog
          provider={deletingProvider}
          onClose={() => !saving && setDeletingProvider(null)}
          onSubmit={() => void submitProviderDelete()}
          saving={saving}
        />
      ) : null}
      {explorerProvider ? (
        <ProviderObjectExplorerDialog
          provider={explorerProvider}
          onClose={() => setExplorerProvider(null)}
        />
      ) : null}
      <ToastViewport onDismiss={dismissToast} toasts={toasts} />
    </div>
  );
}

/** 对话框 Esc 关闭：避免各对话框重复实现键盘处理。 */
function useDialogEscape(onClose: () => void) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);
}

/** 右下角 Toast 容器：fixed 定位不占布局空间，多条自动堆叠；含入场动画 keyframes。 */
function ToastViewport({ onDismiss, toasts }: { onDismiss: (id: number) => void; toasts: readonly ToastItem[] }) {
  return (
    <>
      <style>{`@keyframes sdkwork-storage-toast-enter { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-6 right-6 z-[70] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2"
      >
        {toasts.map((toast) => (
          <ToastCard key={toast.id} onDismiss={onDismiss} toast={toast} />
        ))}
      </div>
    </>
  );
}

function ToastCard({ onDismiss, toast }: { onDismiss: (id: number) => void; toast: ToastItem }) {
  const { t } = useTranslation();
  const success = toast.kind === 'success';
  return (
    <div
      className={success
        ? 'pointer-events-auto flex items-start gap-3 rounded-lg border border-emerald-200 bg-white px-4 py-3 shadow-xl dark:border-emerald-500/30 dark:bg-[#1d2a22]'
        : 'pointer-events-auto flex items-start gap-3 rounded-lg border border-red-200 bg-white px-4 py-3 shadow-xl dark:border-red-500/30 dark:bg-[#2a1d1d]'}
      role="status"
      style={{ animation: 'sdkwork-storage-toast-enter 0.22s ease-out' }}
    >
      {success ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
      ) : (
        <Activity className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
      )}
      <span className="min-w-0 flex-1 break-words text-sm text-slate-800 dark:text-slate-100">{toast.text}</span>
      <button
        aria-label={t('admin.storage.toast.close', 'Dismiss')}
        className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10"
        onClick={() => onDismiss(toast.id)}
        type="button"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/** 凭证配置状态：drive 管理面只回显是否已配置（不泄露凭证内容）。 */
function formatCredentialConfigured(t: TFunction, value: unknown): string {
  return value === true
    ? t('admin.storage.value.credentialConfigured.true', 'Configured')
    : t('admin.storage.value.credentialConfigured.false', 'Missing');
}

function ProviderDetailDialog({
  record,
  onClose,
  onEdit,
  onToggle,
}: {
  record: AdminResourceRecord;
  onClose: () => void;
  onEdit?: () => void;
  onToggle?: () => void;
}) {
  useDialogEscape(onClose);
  const { t } = useTranslation();
  const stringValue = (value: unknown, fallback = '-') =>
    value === null || value === undefined || value === '' ? fallback : String(value);
  const name = stringValue(record.displayName, stringValue(record.name, readRecordId(record)));
  const rows: ReadonlyArray<{ label: string; value: string }> = [
    { label: t('admin.storage.col.name', 'Name'), value: stringValue(record.displayName, stringValue(record.name)) },
    { label: t('admin.storage.col.type', 'Type'), value: translateStorageValue(t, 'providerType', record.providerType) },
    { label: t('admin.storage.col.bucket', 'Bucket'), value: stringValue(record.bucket) },
    { label: t('admin.storage.col.endpoint', 'Endpoint'), value: stringValue(record.endpointUrl) },
    { label: t('admin.storage.col.region', 'Region'), value: stringValue(record.region) },
    { label: t('admin.storage.col.credentialRef', 'Credential Ref'), value: formatCredentialConfigured(t, record.credentialConfigured) },
    { label: t('admin.storage.col.pathStyle', 'Path Style'), value: formatBoolean(t, record.pathStyle) },
    { label: t('admin.storage.col.status', 'Status'), value: translateStorageValue(t, 'status', record.status) },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
      role="presentation"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        aria-labelledby="provider-detail-dialog-title"
        aria-modal="true"
        className="flex w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#181818]"
        role="dialog"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white" id="provider-detail-dialog-title">
              {t('admin.storage.providers.detailTitle', 'Provider details')}
            </h2>
            <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">{name}</p>
          </div>
          <button aria-label={t('admin.storage.dialog.close', 'Close')} className="grid h-9 w-9 place-items-center rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10" onClick={onClose} type="button"><X className="h-4 w-4" /></button>
        </div>
        <div className="grid max-h-[70vh] grid-cols-1 gap-x-6 gap-y-3 overflow-y-auto p-5 md:grid-cols-2">
          {rows.map((row) => (
            <div key={row.label} className="min-w-0">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">{row.label}</div>
              <div className="mt-0.5 break-words text-sm text-slate-800 dark:text-slate-100">{row.value}</div>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4 dark:border-white/10">
          {onToggle ? (
            <button className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5" onClick={onToggle} type="button">{record.status === 'disabled' ? <Power className="h-4 w-4" /> : <PowerOff className="h-4 w-4" />}{record.status === 'disabled' ? t('admin.storage.providers.enable', 'Enable') : t('admin.storage.providers.disable', 'Disable')}</button>
          ) : null}
          {onEdit ? (
            <button className="inline-flex items-center gap-2 rounded-md bg-lobster-500 px-4 py-2 text-sm font-medium text-white hover:bg-lobster-600" onClick={onEdit} type="button"><Pencil className="h-4 w-4" />{t('admin.storage.providers.edit', 'Edit')}</button>
          ) : null}
          <button className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5" onClick={onClose} type="button">{t('admin.storage.dialog.close', 'Close')}</button>
        </div>
      </div>
    </div>
  );
}

function ProviderDeleteDialog({
  provider,
  onClose,
  onSubmit,
  saving,
}: {
  provider: { id: string; name: string; providerCode: string };
  onClose: () => void;
  onSubmit: () => void;
  saving: boolean;
}) {
  useDialogEscape(onClose);
  const { t } = useTranslation();
  const [confirmation, setConfirmation] = useState('');
  const displayName = provider.name || provider.providerCode || provider.id;
  const confirmed = confirmation.trim() === displayName;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
      role="presentation"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        aria-labelledby="provider-delete-dialog-title"
        aria-modal="true"
        className="flex w-full max-w-md flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#181818]"
        role="dialog"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white" id="provider-delete-dialog-title">
              {t('admin.storage.providers.deleteTitle', 'Delete provider')}
            </h2>
            <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">{displayName}</p>
          </div>
          <button aria-label={t('admin.storage.dialog.close', 'Close')} className="grid h-9 w-9 place-items-center rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10" onClick={onClose} type="button"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex flex-col gap-4 p-5">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {t('admin.storage.providers.deleteConfirmDesc', 'This permanently removes the storage provider. Providers still referenced by buckets cannot be deleted. Type the provider name to confirm.')}
          </p>
          <TextField
            autoComplete="off"
            label={t('admin.storage.providers.deleteConfirmName', 'Type the provider name to confirm')}
            placeholder={displayName}
            required
            value={confirmation}
            onChange={setConfirmation}
          />
          <div className="flex justify-end gap-3">
            <button className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5" disabled={saving} onClick={onClose} type="button">{t('admin.storage.dialog.cancel', 'Cancel')}</button>
            <button className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60" disabled={saving || !confirmed} onClick={onSubmit} type="button"><Trash2 className="h-4 w-4" />{saving ? t('admin.storage.dialog.deleting', 'Deleting...') : t('admin.storage.providers.delete', 'Delete')}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** 桶对象浏览器对话框：复用 drive 存储提供者管理包的 StorageObjectBrowser（对象浏览属主在 sdkwork-drive）。 */
function ProviderObjectExplorerDialog({
  provider,
  onClose,
}: {
  provider: StorageProviderRecord;
  onClose: () => void;
}) {
  useDialogEscape(onClose);
  const { t } = useTranslation();
  const service = getStorageProviderAdminService();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
      role="presentation"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        aria-labelledby="provider-object-explorer-dialog-title"
        aria-modal="true"
        className="flex h-full w-full flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#181818]"
        role="dialog"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 dark:border-white/10">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 truncate text-base font-semibold text-slate-900 dark:text-white" id="provider-object-explorer-dialog-title">
              <FolderOpen className="h-4 w-4 shrink-0 text-slate-400" />
              <span className="truncate">{provider.displayName || provider.bucket}</span>
            </h2>
            <p className="mt-0.5 truncate text-sm text-slate-500 dark:text-slate-400">
              {t('admin.storage.bucketExplorer.desc', 'Browse bucket files with full create, read, update, rename, move, and delete operations.')}
            </p>
          </div>
          <button
            aria-label={t('admin.storage.dialog.close', 'Close')}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-4">
          <StorageObjectBrowser provider={provider} service={service} />
        </div>
      </div>
    </div>
  );
}

function StorageDialog({
  form,
  kind,
  onChange,
  onClose,
  onSubmit,
  saving,
  closeOnClickOutside = true,
}: {
  form: StorageFormState;
  kind: StorageDialogKind;
  onChange: (value: StorageFormState) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  saving: boolean;
  /** 点击遮罩（弹窗外）时是否关闭；默认 true */
  closeOnClickOutside?: boolean;
}) {
  useDialogEscape(onClose);
  const { t } = useTranslation();
  const title = dialogTitle(kind, t);
  const set = <K extends keyof StorageFormState,>(key: K, value: StorageFormState[K]) => onChange({ ...form, [key]: value });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
      role="presentation"
      onPointerDown={(event) => {
        if (closeOnClickOutside && event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div aria-labelledby="storage-dialog-title" aria-modal="true" className="flex max-h-[min(880px,calc(100vh-2rem))] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#181818]" role="dialog">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white" id="storage-dialog-title">{title}</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('admin.storage.dialog.desc', 'Changes are validated and submitted through the CloudRouter backend management SDK.')}</p>
          </div>
          <button aria-label={t('admin.storage.dialog.close', 'Close')} className="grid h-9 w-9 place-items-center rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10" onClick={onClose} type="button"><X className="h-4 w-4" /></button>
        </div>
        <form autoComplete="off" className="flex min-h-0 flex-1 flex-col" onSubmit={onSubmit}>
          <div className="shrink-0 px-5 pt-3 text-xs text-slate-400 dark:text-slate-500">
            <span aria-hidden="true" className="font-bold text-red-500">*</span>
            {' '}{t('admin.storage.form.requiredLegend', 'Required fields are marked with an asterisk.')}
          </div>
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto p-5 md:grid-cols-2">
            {kind === 'defaultBuckets' ? <DefaultBucketFields form={form} set={set} /> : null}
            {kind === 'quotas' ? <QuotaFields form={form} set={set} /> : null}
            {kind === 'reconciliation' ? <ReconciliationFields form={form} set={set} /> : null}
            {kind === 'garbageCollection' ? <GarbageCollectionFields form={form} set={set} /> : null}
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4 dark:border-white/10">
            <button className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5" disabled={saving} onClick={onClose} type="button">{t('admin.storage.dialog.cancel', 'Cancel')}</button>
            <button className="inline-flex items-center gap-2 rounded-md bg-lobster-500 px-4 py-2 text-sm font-medium text-white hover:bg-lobster-600 disabled:opacity-60" disabled={saving} type="submit"><CheckCircle2 className="h-4 w-4" />{saving ? t('admin.storage.dialog.saving', 'Saving...') : t('admin.storage.dialog.save', 'Save')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

type FieldSetter = <K extends keyof StorageFormState>(key: K, value: StorageFormState[K]) => void;

type SelectOption = { value: string; label: string; disabled?: boolean };

/** 表单下拉选项：值保持枚举原样提交，显示文案按 i18n 翻译（未配置回退原值）。 */
function storageSelectOptions(t: TFunction, group: string, values: readonly string[]): SelectOption[] {
  return values.map((value) => ({
    value,
    label: t(`admin.storage.value.${group}.${value}`, value),
  }));
}

/**
 * 通用异步选项加载：列表接口 → 选项映射，带 loading/empty/error 三态。
 * 供「选择存储桶」「选择服务商」等下拉复用，避免各表单重复实现。
 */
function useStorageSelectOptions<T>(
  load: () => Promise<{ items: readonly T[] }>,
  mapItem: (item: T) => SelectOption,
  labels: { readonly loading: string; readonly empty: string; readonly error: string },
): { readonly items: readonly T[]; readonly options: readonly SelectOption[]; readonly status: 'loading' | 'ready' | 'error' } {
  const [items, setItems] = useState<readonly T[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  useEffect(() => {
    let cancelled = false;
    void load().then((response) => {
      if (cancelled) return;
      setItems(response.items);
      setStatus('ready');
    }).catch(() => {
      if (!cancelled) setStatus('error');
    });
    return () => {
      cancelled = true;
    };
  }, [load]);
  const options = useMemo<readonly SelectOption[]>(() => {
    if (status !== 'ready') {
      return [{ value: '', label: status === 'loading' ? labels.loading : labels.error, disabled: true }];
    }
    if (items.length === 0) {
      return [{ value: '', label: labels.empty, disabled: true }];
    }
    return items.map(mapItem);
  }, [items, labels.empty, labels.error, labels.loading, mapItem, status]);
  return { items, options, status };
}

function DefaultBucketFields({ form, set }: { form: StorageFormState; set: FieldSetter }) {
  const { t } = useTranslation();
  const bucketSelect = useStorageSelectOptions(
    () => backendStorageProvidersList().then((items) => ({ items })),
    (provider) => ({ value: provider.id, label: `${provider.displayName} · ${provider.bucket}` }),
    {
      loading: t('admin.storage.form.bucketLoading', 'Loading buckets...'),
      empty: t('admin.storage.form.bucketEmpty', 'No buckets available yet. Create one first.'),
      error: t('admin.storage.form.bucketError', 'Buckets could not be loaded.'),
    },
  );
  return <>
    <SelectField label={t('admin.storage.form.logicalScope', 'Logical scope')} value={form.logicalScope} onChange={(value) => set('logicalScope', value as StorageFormState['logicalScope'])} options={storageSelectOptions(t, 'logicalScope', ['tenant_private', 'tenant_public_asset', 'system_temp', 'system_variant', 'system_archive', 'system_quarantine', 'migration_import'])} />
    <SelectField
      disabled={bucketSelect.status !== 'ready' || bucketSelect.options.length === 0}
      label={t('admin.storage.form.bucketId', 'Bucket ID')}
      options={bucketSelect.options}
      required
      value={form.bucketId}
      onChange={(value) => set('bucketId', value)}
    />
    <div className="md:col-span-2"><TextField label={t('admin.storage.form.changeReason', 'Change reason')} required value={form.reason} onChange={(value) => set('reason', value)} /></div>
  </>;
}

function QuotaFields({ form, set }: { form: StorageFormState; set: FieldSetter }) {
  const { t } = useTranslation();
  return <>
    <SelectField label={t('admin.storage.form.scopeType', 'Scope type')} value={form.scopeType} onChange={(value) => set('scopeType', value as StorageFormState['scopeType'])} options={storageSelectOptions(t, 'scopeType', ['tenant', 'organization', 'app', 'space', 'user'])} />
    <TextField label={t('admin.storage.form.scopeId', 'Scope ID')} required value={form.scopeId} onChange={(value) => set('scopeId', value)} />
    <TextField label={t('admin.storage.form.quotaLimit', 'Quota limit (bytes)')} pattern="[0-9]+" required value={form.quotaLimitBytes} onChange={(value) => set('quotaLimitBytes', value)} />
    <TextField label={t('admin.storage.form.singleFileLimit', 'Single-file limit (bytes)')} pattern="[0-9]*" value={form.singleFileLimitBytes} onChange={(value) => set('singleFileLimitBytes', value)} />
    <SelectField label={t('admin.storage.form.enforcement', 'Enforcement')} value={form.enforcement} onChange={(value) => set('enforcement', value)} options={storageSelectOptions(t, 'enforcement', ['hard', 'soft', 'observe'])} />
  </>;
}

function ReconciliationFields({ form, set }: { form: StorageFormState; set: FieldSetter }) {
  const { t } = useTranslation();
  const providerSelect = useStorageSelectOptions(
    () => backendStorageProvidersList().then((items) => ({ items })),
    (provider) => ({ value: provider.id, label: provider.displayName }),
    {
      loading: t('admin.storage.form.providerLoading', 'Loading providers...'),
      empty: t('admin.storage.form.providerEmpty', 'No providers available yet. Create one in Storage Providers first.'),
      error: t('admin.storage.form.providerError', 'Providers could not be loaded.'),
    },
  );
  const bucketSelect = useStorageSelectOptions(
    () => backendStorageProvidersList().then((items) => ({ items })),
    (provider) => ({ value: provider.id, label: `${provider.displayName} · ${provider.bucket}` }),
    {
      loading: t('admin.storage.form.bucketLoading', 'Loading buckets...'),
      empty: t('admin.storage.form.bucketEmpty', 'No buckets available yet. Create one first.'),
      error: t('admin.storage.form.bucketError', 'Buckets could not be loaded.'),
    },
  );
  return <>
    <SelectField label={t('admin.storage.form.runType', 'Run type')} value={form.runType} onChange={(value) => set('runType', value)} options={storageSelectOptions(t, 'runType', ['full', 'provider', 'bucket', 'metadata'])} />
    <SelectField label={t('admin.storage.form.providerId', 'Provider ID')} options={providerSelect.options} value={form.providerId} onChange={(value) => set('providerId', value)} />
    <SelectField label={t('admin.storage.form.bucketId', 'Bucket ID')} options={bucketSelect.options} value={form.bucketId} onChange={(value) => set('bucketId', value)} />
    <TextField label={t('admin.storage.form.reason', 'Reason')} required value={form.reason} onChange={(value) => set('reason', value)} />
    <ToggleField checked={form.dryRun} label={t('admin.storage.form.dryRun', 'Dry run')} onChange={(value) => set('dryRun', value)} />
  </>;
}

function GarbageCollectionFields({ form, set }: { form: StorageFormState; set: FieldSetter }) {
  const { t } = useTranslation();
  return <>
    <SelectField label={t('admin.storage.form.jobType', 'Job type')} value={form.jobType} onChange={(value) => set('jobType', value)} options={storageSelectOptions(t, 'jobType', ['expired_objects', 'orphaned_objects', 'failed_uploads', 'temporary_objects'])} />
    <TextField label={t('admin.storage.form.target', 'Target')} required value={form.target} onChange={(value) => set('target', value)} />
    <TextField label={t('admin.storage.form.retention', 'Retention window')} required value={form.retentionWindow} onChange={(value) => set('retentionWindow', value)} />
    <TextField label={t('admin.storage.form.dryRunSample', 'Dry-run sample size')} pattern="[0-9]+" value={form.dryRunSample} onChange={(value) => set('dryRunSample', value)} />
    <div className="md:col-span-2"><TextAreaField label={t('admin.storage.form.criteria', 'Criteria (JSON)')} value={form.criteria} onChange={(value) => set('criteria', value)} /></div>
    <ToggleField checked={form.dryRun} label={t('admin.storage.form.dryRun', 'Dry run')} onChange={(value) => set('dryRun', value)} />
  </>;
}

/** 字段标签：必填时追加红色星号（aria-hidden，语义由输入控件 required 属性提供）。 */
function FieldLabel({ children, required }: { children: string; required?: boolean }) {
  return (
    <span>
      {children}
      {required ? <span aria-hidden="true" className="ml-0.5 font-bold text-red-500">*</span> : null}
    </span>
  );
}

function TextField({ description, label, onChange, ...props }: { description?: string; label: string; onChange: (value: string) => void } & Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'onChange'>) {
  return <label className="block text-sm font-medium text-slate-700 dark:text-slate-200"><FieldLabel required={props.required}>{label}</FieldLabel><input {...props} className="mt-1.5 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-lobster-500 dark:border-white/10 dark:bg-white/5 dark:text-white" onChange={(event) => onChange(event.target.value)} />{description ? <span className="mt-1 block text-xs font-normal text-slate-500">{description}</span> : null}</label>;
}

function TextAreaField({ label, onChange, required = false, value }: { label: string; onChange: (value: string) => void; required?: boolean; value: string }) {
  return <label className="block text-sm font-medium text-slate-700 dark:text-slate-200"><FieldLabel required={required}>{label}</FieldLabel><textarea className="mt-1.5 min-h-24 w-full rounded-md border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-900 outline-none focus:border-lobster-500 dark:border-white/10 dark:bg-white/5 dark:text-white" onChange={(event) => onChange(event.target.value)} value={value} /></label>;
}

function SelectField({ disabled = false, label, onChange, options, required = false, value }: { disabled?: boolean; label: string; onChange: (value: string) => void; options: readonly (string | SelectOption)[]; required?: boolean; value: string }) {
  return <label className="block text-sm font-medium text-slate-700 dark:text-slate-200"><FieldLabel required={required}>{label}</FieldLabel><select className="mt-1.5 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-lobster-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-[#202020] dark:text-white" disabled={disabled} onChange={(event) => onChange(event.target.value)} required={required} value={value}>{options.map((option) => { const normalized = typeof option === 'string' ? { value: option, label: option } : option; return <option disabled={normalized.disabled ?? false} key={normalized.value} value={normalized.value}>{normalized.label}</option>; })}</select></label>;
}

function ToggleField({ checked, disabled = false, label, onChange }: { checked: boolean; disabled?: boolean; label: string; onChange: (value: boolean) => void }) {
  return <label className="flex min-h-10 items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 dark:border-white/10 dark:text-slate-200"><span>{label}</span><input checked={checked} className="h-4 w-4 accent-lobster-500 disabled:cursor-not-allowed disabled:opacity-50" disabled={disabled} onChange={(event) => onChange(event.target.checked)} type="checkbox" /></label>;
}

/**
 * 通用配置对话框的提交。服务商不在此列：它由 `StorageProviderEditor` 通过
 * 共享服务直接落库，cloudrouter 这条路径上不再有第二套 provider 写入逻辑。
 */
async function submitStorageForm(
  kind: StorageDialogKind,
  form: StorageFormState,
): Promise<unknown> {
  if (kind === 'defaultBuckets') {
    const body: StorageDefaultBucketUpdateInput = { bucketId: form.bucketId.trim(), reason: form.reason.trim() };
    return backendStorageDefaultBucketUpdate(form.logicalScope, body);
  }
  if (kind === 'quotas') {
    return backendStorageQuotaCreate({
      scopeType: form.scopeType, scopeId: form.scopeId.trim(), quotaLimitBytes: form.quotaLimitBytes.trim(),
      singleFileLimitBytes: optionalText(form.singleFileLimitBytes), enforcement: optionalText(form.enforcement),
    });
  }
  if (kind === 'reconciliation') {
    const body: StorageReconciliationCreateInput = {
      runType: optionalText(form.runType), providerId: optionalText(form.providerId), bucketId: optionalText(form.bucketId),
      reason: optionalText(form.reason), dryRun: form.dryRun,
    };
    return backendStorageReconciliationRunCreate(body);
  }
  const criteria = JSON.parse(form.criteria || '{}') as StorageGarbageCollectionCreateInput['criteria'];
  return backendStorageGarbageCollectionJobCreate({
    jobType: optionalText(form.jobType), target: optionalText(form.target), retentionWindow: optionalText(form.retentionWindow),
    dryRunSample: optionalText(form.dryRunSample), dryRun: form.dryRun, criteria,
  });
}

function resolveStorageSectionId(value: string | undefined): StorageAdminSectionId {
  return SECTION_IDS.includes(value as StorageAdminSectionId) ? value as StorageAdminSectionId : 'providers';
}

function createAction(label: string, onClick: () => void) {
  return { label, icon: <Plus className="h-4 w-4" />, onClick };
}

function dialogTitle(kind: StorageDialogKind, t: ReturnType<typeof useTranslation>['t']): string {
  const titles: Record<StorageDialogKind, string> = {
    defaultBuckets: t('admin.storage.defaultBuckets.set', 'Set default bucket'), quotas: t('admin.storage.quotas.add', 'Add quota'),
    reconciliation: t('admin.storage.reconciliation.run', 'Start reconciliation'), garbageCollection: t('admin.storage.gc.add', 'Create garbage collection job'),
  };
  return titles[kind];
}

/**
 * 服务商资源记录：drive 的共享视图用的是 `providerKind` / `displayName`，
 * 而资源中心的列与搜索按 key 直接取值。这里补上两个别名，让「名称」「类型」
 * 两列不再空白——别名只做展示，其余字段保持共享视图原样透传给编辑器。
 */
function toProviderResourceRecord(provider: StorageProviderView): AdminResourceRecord {
  return { ...provider, name: provider.displayName, providerType: provider.providerKind };
}

/** 资源记录还原为共享视图：编辑器只认 drive 的契约类型。 */
function asStorageProviderView(record: AdminResourceRecord): StorageProviderView {
  return record as unknown as StorageProviderView;
}

/**
 * providers 区段的数据源：顺手记下当前服务商 ID，供共享编辑器生成不冲突的新 ID，
 * 省掉一次额外请求，也保证「新增」时看到的是与表格同一份快照。
 */
async function loadProviderResourceRecords(
  knownProviderIds: { current: readonly string[] },
): Promise<AdminResourceRecord[]> {
  const providers = await backendStorageProvidersList();
  knownProviderIds.current = providers.map((provider) => provider.id);
  return providers.map(toProviderResourceRecord);
}

function readRecordId(record: AdminResourceRecord): string {
  const value = record.id ?? record.providerId;
  return typeof value === 'string' ? value : '';
}

function optionalText(value: string): string | undefined {
  const normalized = value.trim();
  return normalized || undefined;
}

/**
 * 服务商类型渲染：drive 的类型枚举里 `custom:<slug>` 是参数化取值
 * （DDL 约束 `^custom:[a-z0-9_-]{2,32}$`），i18n 表只能声明到 `custom` 一档。
 * 单独把后缀拼出来，否则「类型」列会出现 `custom:minio` 这种裸 token ——
 * 而这正是自建 MinIO / 私有 S3 端点的取值。
 */
function formatProviderType(t: TFunction, value: unknown): string {
  const raw = value === null || value === undefined ? '' : String(value).trim();
  if (!raw) return '-';
  const separator = raw.indexOf(':');
  if (separator <= 0) {
    return t(`admin.storage.value.providerType.${raw}`, raw);
  }
  const base = raw.slice(0, separator);
  const suffix = raw.slice(separator + 1);
  const label = t(`admin.storage.value.providerType.${base}`, base);
  return suffix ? `${label} (${suffix})` : label;
}

/**
 * 数据值国际化：按枚举值查 i18n（admin.storage.value.<group>.<value>），
 * 未配置的取值原样回退显示，避免出现缺失占位。
 */
function translateStorageValue(t: TFunction, group: string, value: unknown): string {
  const raw = value === null || value === undefined || value === '' ? '' : String(value);
  return raw ? t(`admin.storage.value.${group}.${raw}`, raw) : '-';
}

const BYTE_UNIT_KEYS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'] as const;

/** 字节数格式化为可读大小（带 i18n 单位）。 */
function formatBytes(t: TFunction, value: unknown): string {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return value === null || value === undefined || value === '' ? '-' : String(value);
  }
  if (parsed === 0) {
    return `0 ${t('admin.storage.unit.B', 'B')}`;
  }
  const index = Math.min(
    Math.floor(Math.log(parsed) / Math.log(1024)),
    BYTE_UNIT_KEYS.length - 1,
  );
  const scaled = parsed / 1024 ** index;
  const digits = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
  const unit = t(`admin.storage.unit.${BYTE_UNIT_KEYS[index]}`, BYTE_UNIT_KEYS[index]);
  return `${scaled.toFixed(digits)} ${unit}`;
}

/** 时间字符串格式化为本地日期时间；无法解析时原样回退。 */
function formatDateTime(value: unknown): string {
  if (typeof value !== 'string' || !value) {
    return value === null || value === undefined || value === '' ? '-' : String(value);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

/** 布尔值显示为是/否（i18n）。 */
function formatBoolean(t: TFunction, value: unknown): string {
  const yes = t('admin.storage.value.boolean.true', 'Yes');
  const no = t('admin.storage.value.boolean.false', 'No');
  if (value === true || value === 'true' || value === 1 || value === '1') return yes;
  if (value === false || value === 'false' || value === 0 || value === '0') return no;
  return value === null || value === undefined || value === '' ? '-' : String(value);
}

function readError(error: unknown, fallback: string, t?: (key: string, options?: { defaultValue?: string } & Record<string, unknown>) => string): string {
  return getLoadErrorMessage(error, fallback, t);
}

export default StorageAdmin;
