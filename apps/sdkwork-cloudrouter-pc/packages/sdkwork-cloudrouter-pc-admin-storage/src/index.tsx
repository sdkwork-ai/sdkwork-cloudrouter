import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type InputHTMLAttributes } from 'react';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { getLoadErrorMessage } from '@sdkwork/cloudroutes-pc-commons';
import {
  Activity,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  CloudCog,
  DatabaseZap,
  Eye,
  FolderOpen,
  Gauge,
  KeyRound,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Recycle,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { StorageObjectBrowser } from 'sdkwork-drive-pc-admin-storage-providers';
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
  backendStorageProviderCreate,
  backendStorageProviderDelete,
  backendStorageProviderHealthCheck,
  backendStorageProvidersList,
  backendStorageProviderUpdate,
  backendStorageQuotaCreate,
  backendStorageQuotasList,
  backendStorageReconciliationRunCreate,
  backendStorageReconciliationRunsList,
  backendStorageUsageList,
  getStorageProviderAdminService,
  type StorageDefaultBucketUpdateInput,
  type StorageGarbageCollectionCreateInput,
  type StorageProviderCreateInput,
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

type StorageDialogKind = Exclude<StorageAdminSectionId, 'usage'>;

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

/** 快速设置凭证对话框的表单状态：凭证方式 + 密钥/引用字段（明文密钥不回显）。 */
type ProviderCredentialForm = {
  credentialMode: 'plain' | 'reference';
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
  credentialRef: string;
};

type StorageFormState = {
  providerName: string;  providerType: StorageProviderCreateInput['providerKind'];
  endpointUrl: string;
  region: string;
  bucketName: string;
  credentialRef: string;
  credentialMode: 'plain' | 'reference';
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
  pathStyleEnabled: boolean;
  strictTlsEnabled: boolean;
  providerStatus: string;
  providerId: string;
  logicalScope: StorageQuotaCreateInput['scopeType'] | 'tenant_private';
  bucketId: string;
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
  providerName: '',
  providerType: 's3_compatible',
  endpointUrl: '',
  region: '',
  bucketName: '',
  credentialRef: '',
  credentialMode: 'plain',
  accessKeyId: '',
  secretAccessKey: '',
  sessionToken: '',
  pathStyleEnabled: false,
  strictTlsEnabled: true,
  providerStatus: 'active',
  providerId: '',
  logicalScope: 'tenant_private',
  bucketId: '',
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
  const [credentialEditor, setCredentialEditor] = useState<AdminResourceRecord | null>(null);
  const [credentialForm, setCredentialForm] = useState<ProviderCredentialForm>({
    credentialMode: 'reference',
    accessKeyId: '',
    secretAccessKey: '',
    sessionToken: '',
    credentialRef: '',
  });
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
      load: () => backendStorageProvidersList(),
      action: createAction(t('admin.storage.providers.add', 'Add provider'), () => openDialog('providers')),
      rowActions: [
        {
          label: t('admin.storage.providers.detail', 'Details'),
          icon: <Eye className="h-3.5 w-3.5" />,
          onClick: (record) => openProviderDetail(record),
        },
        {
          label: t('admin.storage.providers.credential', 'Credentials'),
          icon: <KeyRound className="h-3.5 w-3.5" />,
          onClick: (record) => openProviderCredentialEditor(record),
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
        { key: 'providerType', label: t('admin.storage.col.type', 'Type'), format: (value) => translateStorageValue(t, 'providerType', value) },
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

  function openProviderEditor(record: AdminResourceRecord) {
    const providerType = typeof record.providerType === 'string' && record.providerType in PROVIDER_PRESETS
      ? record.providerType as StorageFormState['providerType']
      : 's3_compatible';
    // 凭证回显策略：托管引用（vault:/kms:/secret: 等）原样回显可编辑；
    // 明文凭证（plain:...）只回显「访问密钥」模式，密钥内容永不回显（安全），
    // 编辑时留空表示保持现有凭证。
    const currentCredentialRef = typeof record.credentialRef === 'string' ? record.credentialRef : '';
    const isPlainCredential = currentCredentialRef.startsWith('plain:');
    setForm({
      ...DEFAULT_FORM_STATE,
      // 非敏感配置回填；明文凭证永不回显，编辑时留空表示保持不变。
      providerName: typeof record.displayName === 'string' ? record.displayName
        : typeof record.name === 'string' ? record.name : '',
      providerType,
      endpointUrl: typeof record.endpointUrl === 'string' ? record.endpointUrl : '',
      region: typeof record.region === 'string' ? record.region : '',
      bucketName: typeof record.bucket === 'string' ? record.bucket : '',
      pathStyleEnabled: record.pathStyle === true,
      credentialMode: isPlainCredential ? 'plain' : 'reference',
      credentialRef: isPlainCredential ? '' : currentCredentialRef,
      providerStatus: typeof record.status === 'string' ? record.status : 'active',
        });
    setEditingProvider(record);
    setDialogKind('providers');
  }

  function openProviderCredentialEditor(record: AdminResourceRecord) {
    if (!readRecordId(record)) {
      pushToast('error', t('admin.storage.error.missingProviderId', 'Provider ID is missing.'));
      return;
    }
    // drive 管理面不回显凭证内容（仅 credentialConfigured 布尔）；
    // 快速设置对话框始终从空白开始，填写后整体轮换凭证。
    setCredentialForm({
      credentialMode: 'plain',
      accessKeyId: '',
      secretAccessKey: '',
      sessionToken: '',
        credentialRef: '',
    });
    setCredentialEditor(record);
  }

  async function submitProviderCredential() {
    if (!credentialEditor) return;
    const providerId = readRecordId(credentialEditor);
    if (!providerId) {
      pushToast('error', t('admin.storage.error.missingProviderId', 'Provider ID is missing.'));
      return;
    }
    setSaving(true);
    try {
      const body: StorageProviderUpdateInput = {};
      if (credentialForm.credentialMode === 'plain') {
        // 访问密钥：双密钥都填写才提交（防止空值覆盖现有凭证）。
        if (credentialForm.accessKeyId.trim() && credentialForm.secretAccessKey.trim()) {
          body.credentialRef = buildPlainCredentialRef(
            credentialForm.accessKeyId,
            credentialForm.secretAccessKey,
            credentialForm.sessionToken,
          );
        }
      } else if (credentialForm.credentialRef.trim()) {
        body.credentialRef = credentialForm.credentialRef.trim();
      }
      await backendStorageProviderUpdate(providerId, body);
      setCredentialEditor(null);
      setRefreshKey((value) => value + 1);
      pushToast('success', t('admin.storage.providers.credentialSuccess', 'Provider credentials updated successfully.'));
    } catch (error) {
      pushToast('error', readError(error, t('admin.storage.providers.credentialError', 'Provider credentials could not be updated.'), t));
    } finally {
      setSaving(false);
    }
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
    const wasEditingProvider = editingProvider !== null;
    try {
      await submitStorageForm(dialogKind, form, editingProvider);
      setDialogKind(null);
      setEditingProvider(null);
      setRefreshKey((value) => value + 1);
      pushToast('success', wasEditingProvider
        ? t('admin.storage.providers.editSuccess', 'Provider configuration saved successfully.')
        : t('admin.storage.saveSuccess', 'Storage configuration saved successfully.'));
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
          onClose={() => !saving && (setDialogKind(null), setEditingProvider(null))}
          onSubmit={submitDialog}
          saving={saving}
          titleOverride={editingProvider
            ? t('admin.storage.providers.editTitle', 'Edit provider')
            : undefined}
          editingProvider={editingProvider !== null}
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
      {credentialEditor ? (
        <ProviderCredentialDialog
          form={credentialForm}
          onChange={setCredentialForm}
          onClose={() => !saving && setCredentialEditor(null)}
          onSubmit={() => void submitProviderCredential()}
          provider={credentialEditor}
          saving={saving}
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
            <button className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700" onClick={onEdit} type="button"><Pencil className="h-4 w-4" />{t('admin.storage.providers.edit', 'Edit')}</button>
          ) : null}
          <button className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5" onClick={onClose} type="button">{t('admin.storage.dialog.close', 'Close')}</button>
        </div>
      </div>
    </div>
  );
}

/** 快速设置凭证对话框：凭证方式选择 + 密钥/引用输入，明文密钥不回显。 */
function ProviderCredentialDialog({
  form,
  onChange,
  onClose,
  onSubmit,
  provider,
  saving,
}: {
  form: ProviderCredentialForm;
  onChange: (value: ProviderCredentialForm) => void;
  onClose: () => void;
  onSubmit: () => void;
  provider: AdminResourceRecord;
  saving: boolean;
}) {
  useDialogEscape(onClose);
  const { t } = useTranslation();
  const providerType = typeof provider.providerType === 'string' ? provider.providerType : 's3_compatible';
  const credentialFields = PROVIDER_CREDENTIAL_FIELD_KEYS[providerType] ?? PROVIDER_CREDENTIAL_FIELD_KEYS.s3_compatible;
  const credentialLabel = (fieldKey: string) => (
    t(`admin.storage.form.credential.${providerType}.${fieldKey}`,
      t(`admin.storage.form.credential.${fieldKey}`, fieldKey))
  );
  const set = <K extends keyof ProviderCredentialForm,>(key: K, value: ProviderCredentialForm[K]) => onChange({ ...form, [key]: value });
  const displayName = typeof provider.displayName === 'string' && provider.displayName
    ? provider.displayName
    : typeof provider.name === 'string' && provider.name
      ? provider.name
      : typeof provider.providerCode === 'string' ? provider.providerCode : readRecordId(provider);

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
        aria-labelledby="provider-credential-dialog-title"
        aria-modal="true"
        className="flex w-full max-w-lg flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#181818]"
        role="dialog"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white" id="provider-credential-dialog-title">
              <KeyRound className="h-4 w-4 text-slate-400" />
              {t('admin.storage.providers.credentialTitle', 'Set provider credentials')}
            </h2>
            <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">{displayName}</p>
          </div>
          <button aria-label={t('admin.storage.dialog.close', 'Close')} className="grid h-9 w-9 place-items-center rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10" onClick={onClose} type="button"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex flex-col gap-4 p-5">
          {credentialFields === null ? (
            <div className="rounded-md border border-slate-200 px-3 py-2.5 text-sm text-slate-600 dark:border-white/10 dark:text-slate-300">
              {t('admin.storage.form.localDevHint', 'Local development providers do not require access credentials.')}
            </div>
          ) : (
            <>
              <SelectField label={t('admin.storage.form.credentialMode', 'Credential mode')} value={form.credentialMode} onChange={(value) => set('credentialMode', value as ProviderCredentialForm['credentialMode'])} options={[
                { value: 'plain', label: t('admin.storage.form.credentialModePlain', 'Access keys') },
                { value: 'reference', label: t('admin.storage.form.credentialModeReference', 'Managed reference') },
              ]} />
              {form.credentialMode === 'plain' ? (
                <>
                  <TextField autoComplete="new-password" label={credentialLabel(credentialFields.accessKey)} required type="password" value={form.accessKeyId} onChange={(value) => set('accessKeyId', value)} />
                  <TextField autoComplete="new-password" label={credentialLabel(credentialFields.secretKey)} required type="password" value={form.secretAccessKey} onChange={(value) => set('secretAccessKey', value)} />
                  {credentialFields.sessionToken ? (
                    <TextField autoComplete="new-password" label={credentialLabel(credentialFields.sessionToken)} type="password" value={form.sessionToken} onChange={(value) => set('sessionToken', value)} />
                  ) : null}
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {t('admin.storage.form.plainCredentialEditDesc', 'Field names follow the provider console. Leave all key fields empty to keep the current credentials; filling them replaces the stored credentials. Credentials are never rendered back.')}
                  </div>
                </>
              ) : (
                <TextField description={t('admin.storage.form.credentialRefDesc', 'Use a vault/KMS/secret reference such as vault:<ref>, kms:<ref>, secret:<ref>, or env:<ref>.')} label={t('admin.storage.form.credentialRef', 'Credential reference')} value={form.credentialRef} onChange={(value) => set('credentialRef', value)} />
              )}
            </>
          )}
          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-white/10">
            <button className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5" disabled={saving} onClick={onClose} type="button">{t('admin.storage.dialog.cancel', 'Cancel')}</button>
            <button className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60" disabled={saving || (credentialFields !== null && form.credentialMode === 'plain' && (!form.accessKeyId.trim() || !form.secretAccessKey.trim()))} onClick={onSubmit} type="button"><KeyRound className="h-4 w-4" />{saving ? t('admin.storage.dialog.saving', 'Saving...') : t('admin.storage.dialog.save', 'Save')}</button>
          </div>
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
  titleOverride,
  editingProvider,
}: {
  form: StorageFormState;
  kind: StorageDialogKind;
  onChange: (value: StorageFormState) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  saving: boolean;
  /** 点击遮罩（弹窗外）时是否关闭；默认 true */
  closeOnClickOutside?: boolean;
  /** 标题覆盖（编辑场景复用同一对话框时使用） */
  titleOverride?: string;
  /** 服务商编辑模式：凭证可选更新、附带状态与变更说明 */
  editingProvider?: boolean;
}) {
  useDialogEscape(onClose);
  const { t } = useTranslation();
  const title = titleOverride ?? dialogTitle(kind, t);
  const set = <K extends keyof StorageFormState,>(key: K, value: StorageFormState[K]) => onChange({ ...form, [key]: value });
  const patch = (values: Partial<StorageFormState>) => onChange({ ...form, ...values });

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
            {kind === 'providers' ? <ProviderFields editing={editingProvider} form={form} patch={patch} set={set} /> : null}
            {kind === 'defaultBuckets' ? <DefaultBucketFields form={form} set={set} /> : null}
            {kind === 'quotas' ? <QuotaFields form={form} set={set} /> : null}
            {kind === 'reconciliation' ? <ReconciliationFields form={form} set={set} /> : null}
            {kind === 'garbageCollection' ? <GarbageCollectionFields form={form} set={set} /> : null}
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4 dark:border-white/10">
            <button className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5" disabled={saving} onClick={onClose} type="button">{t('admin.storage.dialog.cancel', 'Cancel')}</button>
            <button className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60" disabled={saving} type="submit"><CheckCircle2 className="h-4 w-4" />{saving ? t('admin.storage.dialog.saving', 'Saving...') : t('admin.storage.dialog.save', 'Save')}</button>
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

type ProviderCredentialFieldKeys = {
  readonly accessKey: string;
  readonly secretKey: string;
  /** 会话令牌字段（部分服务商无 STS/临时凭证概念，如 Cloudflare R2）。 */
  readonly sessionToken?: string;
};

/**
 * 各服务商访问凭证字段的官方命名（对齐服务商控制台/文档），
 * 映射到统一的 accessKeyId/secretAccessKey/sessionToken/accountId 状态位。
 * 枚举与 drive 存储管理面（DriveStorageProviderKind）一致。
 */
const PROVIDER_CREDENTIAL_FIELD_KEYS: Readonly<Record<string, ProviderCredentialFieldKeys | null>> = {
  s3_compatible: { accessKey: 'accessKeyId', secretKey: 'secretAccessKey', sessionToken: 'sessionToken' },
  aliyun_oss: { accessKey: 'accessKeyId', secretKey: 'accessKeySecret', sessionToken: 'securityToken' },
  tencent_cos: { accessKey: 'secretId', secretKey: 'secretKey', sessionToken: 'token' },
  huawei_obs: { accessKey: 'accessKeyId', secretKey: 'secretAccessKey' },
  volcengine_tos: { accessKey: 'accessKeyId', secretKey: 'secretAccessKey', sessionToken: 'sessionToken' },
  google_cloud_storage: { accessKey: 'accessKeyId', secretKey: 'secretAccessKey' },
};

/** 明文访问凭证组装为 drive 兼容的 plain:<accessKeyId>:<secretAccessKey>[:<sessionToken>] 格式。 */
function buildPlainCredentialRef(accessKeyId: string, secretAccessKey: string, sessionToken: string): string {
  const accessKey = accessKeyId.trim();
  const secretKey = secretAccessKey.trim();
  const token = sessionToken.trim();
  return token
    ? `plain:${accessKey}:${secretKey}:${token}`
    : `plain:${accessKey}:${secretKey}`;
}

type ProviderPresetOption = {
  readonly value: string;
  /** 显示文案 i18n key；缺省时直接显示 value。 */
  readonly labelKey?: string;
  /** 该预设端点对应的区域（选择端点时同步区域）。 */
  readonly region?: string;
};

type ProviderPreset = {
  readonly endpointOptions: readonly ProviderPresetOption[];
  readonly regionOptions: readonly ProviderPresetOption[];
  readonly defaultEndpoint?: string;
  readonly defaultRegion: string;
  /** region → 官方端点模板；存在时区域变化自动联动端点（端点处于自动态时）。 */
  readonly endpointTemplate?: (region: string) => string;
  readonly pathStyleEnabled: boolean;
  /** 端点输入提示 i18n key（可选）。 */
  readonly endpointHintKey?: string;
};

const region = (value: string, labelKey?: string): ProviderPresetOption => ({ value, labelKey });
const endpoint = (value: string, labelKey?: string, endpointRegion?: string): ProviderPresetOption => ({ value, labelKey, region: endpointRegion });

/** 各服务商官方 region → 端点模板（腾讯 COS / 阿里 OSS / 华为 OBS 等）。 */
const OSS_ENDPOINT = (regionCode: string) => `https://oss-${regionCode}.aliyuncs.com`;
const COS_ENDPOINT = (regionCode: string) => `https://cos.${regionCode}.myqcloud.com`;
const OBS_ENDPOINT = (regionCode: string) => `https://obs.${regionCode}.myhuaweicloud.com`;
const TOS_ENDPOINT = (regionCode: string) => `https://tos-${regionCode}.volces.com`;

/** 各服务商预设配置：切换服务商类型时自动填充端点/区域与能力默认值，降低录入错误。 */
const PROVIDER_PRESETS: Readonly<Record<string, ProviderPreset>> = {
  s3_compatible: {
    endpointOptions: [
      endpoint('http://localhost:9000', 'admin.storage.preset.endpoint.localhost'),
      endpoint('https://s3.us-east-1.amazonaws.com', 'admin.storage.preset.endpoint.aws'),
    ],
    endpointHintKey: 'admin.storage.form.endpointHintS3',
    regionOptions: [
      region('us-east-1'), region('us-east-2'), region('us-west-1'), region('us-west-2'),
      region('ap-northeast-1'), region('ap-southeast-1'), region('ap-southeast-2'), region('ap-south-1'),
      region('eu-central-1'), region('eu-west-1'),
    ],
    defaultRegion: 'us-east-1',
    pathStyleEnabled: false,
  },
  aliyun_oss: {
    endpointOptions: [
      endpoint(OSS_ENDPOINT('cn-hangzhou'), undefined, 'cn-hangzhou'),
      endpoint(OSS_ENDPOINT('cn-shanghai'), undefined, 'cn-shanghai'),
      endpoint(OSS_ENDPOINT('cn-beijing'), undefined, 'cn-beijing'),
      endpoint(OSS_ENDPOINT('cn-shenzhen'), undefined, 'cn-shenzhen'),
      endpoint(OSS_ENDPOINT('cn-hongkong'), undefined, 'cn-hongkong'),
      endpoint(OSS_ENDPOINT('ap-southeast-1'), undefined, 'ap-southeast-1'),
      endpoint(OSS_ENDPOINT('us-west-1'), undefined, 'us-west-1'),
    ],
    regionOptions: [
      region('cn-hangzhou'), region('cn-shanghai'), region('cn-beijing'), region('cn-shenzhen'),
      region('cn-hongkong'), region('ap-southeast-1'), region('us-west-1'),
    ],
    endpointTemplate: OSS_ENDPOINT,
    defaultEndpoint: OSS_ENDPOINT('cn-hangzhou'),
    defaultRegion: 'cn-hangzhou',
    pathStyleEnabled: false,
  },
  tencent_cos: {
    endpointOptions: [
      endpoint(COS_ENDPOINT('ap-shanghai'), undefined, 'ap-shanghai'),
      endpoint(COS_ENDPOINT('ap-guangzhou'), undefined, 'ap-guangzhou'),
      endpoint(COS_ENDPOINT('ap-beijing'), undefined, 'ap-beijing'),
      endpoint(COS_ENDPOINT('ap-hongkong'), undefined, 'ap-hongkong'),
    ],
    regionOptions: [
      region('ap-shanghai'), region('ap-guangzhou'), region('ap-beijing'), region('ap-hongkong'),
    ],
    endpointTemplate: COS_ENDPOINT,
    defaultEndpoint: COS_ENDPOINT('ap-shanghai'),
    defaultRegion: 'ap-shanghai',
    pathStyleEnabled: false,
  },
  huawei_obs: {
    endpointOptions: [
      endpoint(OBS_ENDPOINT('cn-north-4'), undefined, 'cn-north-4'),
      endpoint(OBS_ENDPOINT('cn-east-3'), undefined, 'cn-east-3'),
      endpoint(OBS_ENDPOINT('cn-south-1'), undefined, 'cn-south-1'),
    ],
    regionOptions: [
      region('cn-north-4'), region('cn-east-3'), region('cn-south-1'),
    ],
    endpointTemplate: OBS_ENDPOINT,
    defaultEndpoint: OBS_ENDPOINT('cn-north-4'),
    defaultRegion: 'cn-north-4',
    pathStyleEnabled: false,
  },
  volcengine_tos: {
    endpointOptions: [
      endpoint(TOS_ENDPOINT('cn-beijing'), undefined, 'cn-beijing'),
      endpoint(TOS_ENDPOINT('cn-shanghai'), undefined, 'cn-shanghai'),
    ],
    regionOptions: [
      region('cn-beijing'), region('cn-shanghai'),
    ],
    endpointTemplate: TOS_ENDPOINT,
    defaultEndpoint: TOS_ENDPOINT('cn-beijing'),
    defaultRegion: 'cn-beijing',
    pathStyleEnabled: false,
  },
};

/**
 * 预设选项文案：labelKey 优先走 i18n，缺省回退 value。
 */
function presetOptionLabel(t: TFunction, option: ProviderPresetOption): string {
  return option.labelKey ? t(option.labelKey, option.value) : option.value;
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

function ProviderFields({ editing = false, form, patch, set }: { editing?: boolean; form: StorageFormState; patch: (values: Partial<StorageFormState>) => void; set: FieldSetter }) {
  const { t } = useTranslation();
  const preset = PROVIDER_PRESETS[form.providerType] ?? PROVIDER_PRESETS.s3_compatible;
  const credentialFields = PROVIDER_CREDENTIAL_FIELD_KEYS[form.providerType] ?? PROVIDER_CREDENTIAL_FIELD_KEYS.s3_compatible;
  const credentialLabel = (fieldKey: string) => (
    t(`admin.storage.form.credential.${form.providerType}.${fieldKey}`,
      t(`admin.storage.form.credential.${fieldKey}`, fieldKey))
  );
  const endpointOptions = preset.endpointOptions.map((option) => ({
    value: option.value,
    label: presetOptionLabel(t, option),
    ...(option.region ? { region: option.region } : {}),
  }));
  const regionOptions = preset.regionOptions.map((option) => ({
    value: option.value,
    label: presetOptionLabel(t, option),
  }));
  const applyProviderPreset = (providerType: StorageFormState['providerType']) => {
    const next = PROVIDER_PRESETS[providerType] ?? PROVIDER_PRESETS.s3_compatible;
    patch({
      providerType,
      endpointUrl: next.defaultEndpoint ?? '',
      region: next.defaultRegion,
      pathStyleEnabled: next.pathStyleEnabled,
    });
  };
  /** 区域变化 → 端点联动：端点为空或仍为自动生成值时，按官方模板更新。 */
  const handleRegionChange = (regionCode: string) => {
    const template = preset.endpointTemplate;
    const currentEndpoint = form.endpointUrl.trim();
    const autoEndpoint = template ? template(form.region.trim()) : '';
    const shouldSyncEndpoint = template !== undefined && (!currentEndpoint || currentEndpoint === autoEndpoint);
    patch({
      region: regionCode,
      ...(shouldSyncEndpoint ? { endpointUrl: template(regionCode.trim()) } : {}),
    });
  };
  /** 端点变化 → 区域联动：选择带区域标注的预设端点时同步区域。 */
  const handleEndpointChange = (endpointUrl: string) => {
    const syncedRegion = endpointOptions.find((option) => option.value === endpointUrl)?.region;
    patch({
      endpointUrl,
      ...(syncedRegion ? { region: syncedRegion } : {}),
    });
  };
  return <>
    <TextField label={t('admin.storage.form.providerName', 'Provider name')} required value={form.providerName} onChange={(value) => set('providerName', value)} />
    <SelectField label={t('admin.storage.form.providerType', 'Provider type')} value={form.providerType} onChange={(value) => applyProviderPreset(value as StorageFormState['providerType'])} options={storageSelectOptions(t, 'providerType', ['s3_compatible', 'aliyun_oss', 'tencent_cos', 'huawei_obs', 'volcengine_tos', 'google_cloud_storage'])} />
    <PrefillSelectField
      label={t('admin.storage.form.region', 'Region')}
      options={regionOptions}
      placeholder={t('admin.storage.form.regionPlaceholder', 'Select a preset region or type a custom region')}
      value={form.region}
      onChange={handleRegionChange}
    />
    <PrefillSelectField
      description={preset.endpointHintKey
        ? t(preset.endpointHintKey, '')
        : preset.endpointTemplate
          ? t('admin.storage.form.endpointHintLinked', 'The endpoint follows the region automatically. Override it manually if needed.')
          : t('admin.storage.form.presetHint', 'Switching the provider type pre-fills the recommended endpoint, region, and capability defaults.')}
      label={t('admin.storage.form.endpointUrl', 'Endpoint URL')}
      options={endpointOptions}
      placeholder={t('admin.storage.form.endpointPlaceholder', 'Select a preset or type a custom endpoint')}
      type="url"
      value={form.endpointUrl}
      onChange={handleEndpointChange}
    />
    <TextField label={t('admin.storage.form.bucketName', 'Bucket name')} required value={form.bucketName} onChange={(value) => set('bucketName', value)} />
    <SelectField label={t('admin.storage.form.credentialMode', 'Credential mode')} value={form.credentialMode} onChange={(value) => set('credentialMode', value as StorageFormState['credentialMode'])} options={[
      { value: 'plain', label: t('admin.storage.form.credentialModePlain', 'Access keys') },
      { value: 'reference', label: t('admin.storage.form.credentialModeReference', 'Managed reference') },
    ]} />
    {credentialFields === null ? (
      <div className="md:col-span-2 rounded-md border border-slate-200 px-3 py-2.5 text-sm text-slate-600 dark:border-white/10 dark:text-slate-300">
        {t('admin.storage.form.localDevHint', 'Local development providers do not require access credentials.')}
      </div>
    ) : form.credentialMode === 'plain' ? (
      <>
        <TextField autoComplete="new-password" label={credentialLabel(credentialFields.accessKey)} required={!editing} type="password" value={form.accessKeyId} onChange={(value) => set('accessKeyId', value)} />
        <TextField autoComplete="new-password" label={credentialLabel(credentialFields.secretKey)} required={!editing} type="password" value={form.secretAccessKey} onChange={(value) => set('secretAccessKey', value)} />
        {credentialFields.sessionToken ? (
          <TextField autoComplete="new-password" label={credentialLabel(credentialFields.sessionToken)} type="password" value={form.sessionToken} onChange={(value) => set('sessionToken', value)} />
        ) : null}
        <div className="md:col-span-2 text-xs text-slate-500 dark:text-slate-400">
          {editing
            ? t('admin.storage.form.plainCredentialEditDesc', 'Field names follow the provider console. Leave all key fields empty to keep the current credentials; filling them replaces the stored credentials. Credentials are never rendered back.')
            : t('admin.storage.form.plainCredentialDesc', 'Field names follow the provider console. Credentials are submitted as a plain:<accessKeyId>:<secretAccessKey>[:<sessionToken>] string and are never rendered back.')}
        </div>
      </>
    ) : (
      <div className="md:col-span-2"><TextField description={t('admin.storage.form.credentialRefDesc', 'Use a vault/KMS/secret reference such as vault:<ref>, kms:<ref>, secret:<ref>, or env:<ref>.')} label={t('admin.storage.form.credentialRef', 'Credential reference')} required={!editing} value={form.credentialRef} onChange={(value) => set('credentialRef', value)} /></div>
    )}
    {editing ? (
      <>
        <SelectField label={t('admin.storage.form.providerStatus', 'Status')} value={form.providerStatus} onChange={(value) => set('providerStatus', value)} options={storageSelectOptions(t, 'status', ['active', 'disabled'])} />
      </>
    ) : null}
    <ToggleField checked={form.pathStyleEnabled} label={t('admin.storage.form.pathStyle', 'Path-style access')} onChange={(value) => set('pathStyleEnabled', value)} />
    <ToggleField checked={form.strictTlsEnabled} label={t('admin.storage.form.strictTls', 'Strict TLS')} onChange={(value) => set('strictTlsEnabled', value)} />
  </>;
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
  return <label className="block text-sm font-medium text-slate-700 dark:text-slate-200"><FieldLabel required={props.required}>{label}</FieldLabel><input {...props} className="mt-1.5 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-white" onChange={(event) => onChange(event.target.value)} />{description ? <span className="mt-1 block text-xs font-normal text-slate-500">{description}</span> : null}</label>;
}

/**
 * 可选可输入字段：文本框自由输入 + 显式下拉按钮展开预设选项
 * （可过滤、当前值高亮、暗色适配），选择预设或直接输入自定义值。
 */
function PrefillSelectField({ description, label, onChange, options, placeholder, required = false, type = 'text', value }: {
  description?: string;
  label: string;
  onChange: (value: string) => void;
  options: readonly SelectOption[];
  placeholder?: string;
  required?: boolean;
  type?: 'text' | 'url';
  value: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const dismiss = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const dismissFromKeyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', dismissFromKeyboard);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('keydown', dismissFromKeyboard);
    };
  }, [open]);

  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredOptions = normalizedQuery
    ? options.filter((option) =>
      option.value.toLocaleLowerCase().includes(normalizedQuery)
      || option.label.toLocaleLowerCase().includes(normalizedQuery))
    : options;

  return (
    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
      <FieldLabel required={required}>{label}</FieldLabel>
      <div ref={wrapperRef} className="relative mt-1.5">
        <input
          ref={inputRef}
          required={required}
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(event) => {
            onChange(event.target.value);
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 pr-9 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
        />
        <button
          type="button"
          aria-label={t('admin.storage.form.prefillToggle', 'Toggle preset options')}
          className="absolute right-1 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-white/10"
          onClick={() => setOpen((current) => !current)}
        >
          <ChevronDown size={15} className={`transition-transform${open ? ' rotate-180' : ''}`} />
        </button>
        {open ? (
          <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-md border border-slate-200 bg-white py-1 shadow-xl dark:border-white/10 dark:bg-[#252525]">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
                {t('admin.storage.form.prefillNoMatch', 'No matching presets.')}
              </div>
            ) : filteredOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`block w-full px-3 py-1.5 text-left text-sm transition-colors hover:bg-slate-100 dark:hover:bg-white/10 ${option.value === value
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300'
                  : 'text-slate-700 dark:text-slate-200'}`}
                onClick={() => {
                  onChange(option.value);
                  setQuery('');
                  setOpen(false);
                }}
              >
                {option.label}
              </button>
            ))}
            <div className="border-t border-slate-100 dark:border-white/5">
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10"
                onClick={() => {
                  setOpen(false);
                  inputRef.current?.focus();
                }}
              >
                <Pencil size={13} />
                {t('admin.storage.form.prefillCustom', 'Type a custom value')}
              </button>
            </div>
          </div>
        ) : null}
      </div>
      {description ? <span className="mt-1 block text-xs font-normal text-slate-500">{description}</span> : null}
    </label>
  );
}

function TextAreaField({ label, onChange, required = false, value }: { label: string; onChange: (value: string) => void; required?: boolean; value: string }) {
  return <label className="block text-sm font-medium text-slate-700 dark:text-slate-200"><FieldLabel required={required}>{label}</FieldLabel><textarea className="mt-1.5 min-h-24 w-full rounded-md border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-white" onChange={(event) => onChange(event.target.value)} value={value} /></label>;
}

function SelectField({ disabled = false, label, onChange, options, required = false, value }: { disabled?: boolean; label: string; onChange: (value: string) => void; options: readonly (string | SelectOption)[]; required?: boolean; value: string }) {
  return <label className="block text-sm font-medium text-slate-700 dark:text-slate-200"><FieldLabel required={required}>{label}</FieldLabel><select className="mt-1.5 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-[#202020] dark:text-white" disabled={disabled} onChange={(event) => onChange(event.target.value)} required={required} value={value}>{options.map((option) => { const normalized = typeof option === 'string' ? { value: option, label: option } : option; return <option disabled={normalized.disabled ?? false} key={normalized.value} value={normalized.value}>{normalized.label}</option>; })}</select></label>;
}

function ToggleField({ checked, disabled = false, label, onChange }: { checked: boolean; disabled?: boolean; label: string; onChange: (value: boolean) => void }) {
  return <label className="flex min-h-10 items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 dark:border-white/10 dark:text-slate-200"><span>{label}</span><input checked={checked} className="h-4 w-4 accent-blue-600 disabled:cursor-not-allowed disabled:opacity-50" disabled={disabled} onChange={(event) => onChange(event.target.checked)} type="checkbox" /></label>;
}

async function submitStorageForm(
  kind: StorageDialogKind,
  form: StorageFormState,
  editingProvider: AdminResourceRecord | null,
): Promise<unknown> {
  if (kind === 'providers') {
    const credentialRef = form.credentialMode === 'plain'
      ? buildPlainCredentialRef(form.accessKeyId, form.secretAccessKey, form.sessionToken)
      : form.credentialRef.trim();
    if (editingProvider) {
      const providerId = readRecordId(editingProvider);
      const body: StorageProviderUpdateInput = {
        status: form.providerStatus,
        name: form.providerName.trim(),
        endpointUrl: optionalText(form.endpointUrl),
        region: optionalText(form.region),
        bucket: optionalText(form.bucketName),
        pathStyle: form.pathStyleEnabled,
        strictTls: form.strictTlsEnabled,
      };
      // 凭证更新策略：访问密钥模式仅当 Access Key / Secret Key 都填写时才更换凭证
      // （防止只填一项或全空时把现有凭证覆盖成坏值）；托管引用模式填写新引用则覆盖。
      if (form.credentialMode === 'plain') {
        if (form.accessKeyId.trim() && form.secretAccessKey.trim()) {
          body.credentialRef = buildPlainCredentialRef(form.accessKeyId, form.secretAccessKey, form.sessionToken);
        }
      } else if (form.credentialRef.trim()) {
        body.credentialRef = form.credentialRef.trim();
      }
      return backendStorageProviderUpdate(providerId, body);
    }
    return backendStorageProviderCreate({
      id: generateProviderId(form.providerType),
      providerKind: form.providerType,
      name: form.providerName.trim(),
      endpointUrl: form.endpointUrl.trim(),
      region: optionalText(form.region),
      bucket: form.bucketName.trim(),
      pathStyle: form.pathStyleEnabled,
      strictTls: form.strictTlsEnabled,
      credentialRef,
    });
  }
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

/** drive provider id 生成：kind 前缀 + 随机后缀（与 drive 管理端 providerId 工具同构）。 */
function generateProviderId(providerKind: string): string {
  const prefix = providerKind.startsWith('custom:')
    ? providerKind.replace(/[^a-z0-9_-]/g, '').slice(0, 24)
    : providerKind.replace(/[^a-z0-9_-]/g, '').slice(0, 24);
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix || 'provider'}-${random}-${Date.now().toString(36)}`;
}

function resolveStorageSectionId(value: string | undefined): StorageAdminSectionId {
  return SECTION_IDS.includes(value as StorageAdminSectionId) ? value as StorageAdminSectionId : 'providers';
}

function createAction(label: string, onClick: () => void) {
  return { label, icon: <Plus className="h-4 w-4" />, onClick };
}

function dialogTitle(kind: StorageDialogKind, t: ReturnType<typeof useTranslation>['t']): string {
  const titles: Record<StorageDialogKind, string> = {
    providers: t('admin.storage.providers.add', 'Add provider'),
    defaultBuckets: t('admin.storage.defaultBuckets.set', 'Set default bucket'), quotas: t('admin.storage.quotas.add', 'Add quota'),
    reconciliation: t('admin.storage.reconciliation.run', 'Start reconciliation'), garbageCollection: t('admin.storage.gc.add', 'Create garbage collection job'),
  };
  return titles[kind];
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
