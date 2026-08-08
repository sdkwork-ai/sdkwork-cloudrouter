import { useEffect, useMemo, useRef, useState, type FormEvent, type InputHTMLAttributes } from 'react';
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
  FolderCog,
  FolderOpen,
  Gauge,
  Pencil,
  Plus,
  Recycle,
  ShieldCheck,
  X,
} from 'lucide-react';
import { SandboxExplorerView } from '@sdkwork/drive-pc-sandbox-explorer';
import {
  AdminResourceCenter,
  type AdminResourceRecord,
  type AdminResourceSection,
} from '@sdkwork/cloudroutes-pc-commons';
import {
  backendStorageBucketCreate,
  backendStorageBucketUpdate,
  backendStorageBucketsList,
  backendStorageDefaultBucketUpdate,
  backendStorageDefaultBucketsList,
  backendStorageGarbageCollectionJobCreate,
  backendStorageGarbageCollectionJobsList,
  backendStorageProviderCreate,
  backendStorageProviderHealthCheck,
  backendStorageProvidersList,
  backendStorageQuotaCreate,
  backendStorageQuotasList,
  backendStorageReconciliationRunCreate,
  backendStorageReconciliationRunsList,
  backendStorageUsageList,
  type StorageBucketCreateInput,
  type StorageBucketRecord,
  type StorageDefaultBucketUpdateInput,
  type StorageGarbageCollectionCreateInput,
  type StorageProviderCreateInput,
  type StorageProviderRecord,
  type StorageQuotaCreateInput,
  type StorageReconciliationCreateInput,
  type StorageStatusUpdateInput,
} from './storageService';
import {
  bucketExplorerLabels,
  createBucketExplorerPort,
  type BucketExplorerTarget,
} from './bucketExplorerService';

type StorageAdminSectionId =
  | 'providers'
  | 'buckets'
  | 'defaultBuckets'
  | 'quotas'
  | 'usage'
  | 'reconciliation'
  | 'garbageCollection';

type StorageDialogKind = Exclude<StorageAdminSectionId, 'usage'>;

type StorageAdminProps = {
  sectionId?: string;
};

type StorageFormState = {
  providerName: string;
  providerType: StorageProviderCreateInput['providerType'];
  endpointUrl: string;
  region: string;
  credentialRef: string;
  credentialMode: 'plain' | 'reference';
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
  accountId: string;
  pathStyleEnabled: boolean;
  supportsMultipart: boolean;
  supportsLifecycle: boolean;
  supportsObjectLock: boolean;
  bucketName: string;
  providerId: string;
  logicalScope: StorageBucketCreateInput['logicalScope'];
  bucketRegion: string;
  dataResidencyRegion: string;
  objectKeyPrefix: string;
  defaultStorageClass: NonNullable<StorageBucketCreateInput['defaultStorageClass']>;
  defaultEncryptionMode: NonNullable<StorageBucketCreateInput['defaultEncryptionMode']>;
  kmsKeyRef: string;
  versioningEnabled: boolean;
  objectLockEnabled: boolean;
  lifecycleEnabled: boolean;
  publicAccessBlocked: boolean;
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
  credentialRef: '',
  credentialMode: 'plain',
  accessKeyId: '',
  secretAccessKey: '',
  sessionToken: '',
  accountId: '',
  pathStyleEnabled: false,
  supportsMultipart: true,
  supportsLifecycle: true,
  supportsObjectLock: false,
  bucketName: '',
  providerId: '',
  logicalScope: 'tenant_private',
  bucketRegion: '',
  dataResidencyRegion: '',
  objectKeyPrefix: '',
  defaultStorageClass: 'STANDARD',
  defaultEncryptionMode: 'sse_s3',
  kmsKeyRef: '',
  versioningEnabled: true,
  objectLockEnabled: false,
  lifecycleEnabled: true,
  publicAccessBlocked: true,
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
  'buckets',
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
  const [message, setMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [explorerBucket, setExplorerBucket] = useState<BucketExplorerTarget | null>(null);
  const [editingBucket, setEditingBucket] = useState<{ id: string; bucketName: string; status: string } | null>(null);
  const [providerNameById, setProviderNameById] = useState<ReadonlyMap<string, string>>(() => new Map());

  useEffect(() => {
    let cancelled = false;
    void backendStorageProvidersList()
      .then((response) => {
        if (cancelled) return;
        setProviderNameById(new Map(
          response.items.map((provider) => [provider.id, provider.name || provider.providerCode]),
        ));
      })
      .catch(() => {
        // 名称映射加载失败时列表回退显示 providerCode。
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const sections = useMemo<AdminResourceSection<StorageAdminSectionId, string>[]>(() => [
    {
      id: 'providers',
      title: t('admin.storage.providers.title', 'Storage Providers'),
      description: t('admin.storage.providers.desc', 'S3-compatible provider endpoints and capability profiles. Credentials are represented only by managed secret references.'),
      icon: <CloudCog className="h-4 w-4" />,
      group: t('admin.menu.storage.configuration', 'Storage Configuration'),
      load: () => backendStorageProvidersList(),
      action: createAction(t('admin.storage.providers.add', 'Add provider'), () => openDialog('providers')),
      rowActions: [{
        label: t('admin.storage.providers.healthCheck', 'Health check'),
        icon: <Activity className="h-3.5 w-3.5" />,
        onClick: (record) => void runProviderHealthCheck(record),
      }],
      columns: [
        { key: 'name', label: t('admin.storage.col.name', 'Name'), format: (value, record) => {
          const name = typeof value === 'string' && value ? value : '';
          return name || (typeof record.providerCode === 'string' ? record.providerCode : '-');
        } },
        { key: 'providerCode', label: t('admin.storage.col.providerCode', 'Provider') },
        { key: 'providerType', label: t('admin.storage.col.type', 'Type'), format: (value) => translateStorageValue(t, 'providerType', value) },
        { key: 'endpointUrl', label: t('admin.storage.col.endpoint', 'Endpoint') },
        { key: 'region', label: t('admin.storage.col.region', 'Region') },
        { key: 'credentialRef', label: t('admin.storage.col.credentialRef', 'Credential Ref') },
        { key: 'healthStatus', label: t('admin.storage.col.health', 'Health'), format: (value) => translateStorageValue(t, 'health', value) },
        { key: 'status', label: t('admin.storage.col.status', 'Status'), format: (value) => translateStorageValue(t, 'status', value) },
      ],
      searchFields: ['providerCode', 'name', 'providerType', 'endpointUrl', 'region', 'healthStatus', 'status'],
    },
    {
      id: 'buckets',
      title: t('admin.storage.buckets.title', 'Storage Buckets'),
      description: t('admin.storage.buckets.desc', 'Bucket placement, encryption, lifecycle, residency, versioning, and public-access policy.'),
      icon: <FolderCog className="h-4 w-4" />,
      group: t('admin.menu.storage.configuration', 'Storage Configuration'),
      load: () => backendStorageBucketsList(),
      action: createAction(t('admin.storage.buckets.add', 'Add bucket'), () => openDialog('buckets')),
      rowActions: [
        {
          label: t('admin.storage.buckets.edit', 'Edit'),
          icon: <Pencil className="h-3.5 w-3.5" />,
          onClick: (record) => openBucketStatusEditor(record),
        },
        {
          label: t('admin.storage.buckets.files', 'Browse files'),
          icon: <FolderOpen className="h-3.5 w-3.5" />,
          onClick: (record) => openBucketExplorer(record),
        },
      ],
      columns: [
        { key: 'bucketName', label: t('admin.storage.col.bucket', 'Bucket') },
        { key: 'providerCode', label: t('admin.storage.col.providerCode', 'Provider'), format: (value, record) => {
          const providerId = typeof record.providerId === 'string' ? record.providerId : '';
          return (providerId && providerNameById.get(providerId)) || (typeof value === 'string' ? value : '-');
        } },
        { key: 'logicalScope', label: t('admin.storage.col.logicalScope', 'Logical Scope'), format: (value) => translateStorageValue(t, 'logicalScope', value) },
        { key: 'bucketRegion', label: t('admin.storage.col.region', 'Region') },
        { key: 'defaultStorageClass', label: t('admin.storage.col.storageClass', 'Storage Class'), format: (value) => translateStorageValue(t, 'storageClass', value) },
        { key: 'defaultEncryptionMode', label: t('admin.storage.col.encryption', 'Encryption'), format: (value) => translateStorageValue(t, 'encryption', value) },
        { key: 'status', label: t('admin.storage.col.status', 'Status'), format: (value) => translateStorageValue(t, 'status', value) },
      ],
      searchFields: ['bucketName', 'providerCode', 'logicalScope', 'bucketRegion', 'defaultStorageClass', 'status'],
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
  ], [t, providerNameById]);

  function openDialog(kind: StorageDialogKind) {
    setForm(DEFAULT_FORM_STATE);
    setMessage(null);
    setDialogKind(kind);
  }

  function openBucketExplorer(record: AdminResourceRecord) {
    const id = typeof record.id === 'string' ? record.id : '';
    const bucketName = typeof record.bucketName === 'string' ? record.bucketName : id;
    if (!id) {
      setMessage({ kind: 'error', text: t('admin.storage.error.missingBucketId', 'Bucket ID is missing.') });
      return;
    }
    setMessage(null);
    setExplorerBucket({ id, bucketName });
  }

  function openBucketStatusEditor(record: AdminResourceRecord) {
    const id = typeof record.id === 'string' ? record.id : '';
    const bucketName = typeof record.bucketName === 'string' ? record.bucketName : id;
    const status = typeof record.status === 'string' ? record.status : 'active';
    if (!id) {
      setMessage({ kind: 'error', text: t('admin.storage.error.missingBucketId', 'Bucket ID is missing.') });
      return;
    }
    setMessage(null);
    setEditingBucket({ id, bucketName, status });
  }

  async function submitBucketStatusUpdate(status: string, reason: string) {
    if (!editingBucket) return;
    setSaving(true);
    setMessage(null);
    try {
      await backendStorageBucketUpdate(editingBucket.id, { status: status as StorageStatusUpdateInput['status'], reason });
      setEditingBucket(null);
      setRefreshKey((value) => value + 1);
      setMessage({ kind: 'success', text: t('admin.storage.buckets.statusSaved', 'Bucket status updated successfully.') });
    } catch (error) {
      setMessage({ kind: 'error', text: readError(error, t('admin.storage.buckets.statusError', 'Bucket status could not be updated.'), t) });
    } finally {
      setSaving(false);
    }
  }

  async function runProviderHealthCheck(record: AdminResourceRecord) {
    const providerId = readRecordId(record);
    if (!providerId) {
      setMessage({ kind: 'error', text: t('admin.storage.error.missingProviderId', 'Provider ID is missing.') });
      return;
    }
    try {
      await backendStorageProviderHealthCheck(providerId);
      setMessage({ kind: 'success', text: t('admin.storage.providers.healthSuccess', 'Provider health check completed.') });
      setRefreshKey((value) => value + 1);
    } catch (error) {
      setMessage({ kind: 'error', text: readError(error, t('admin.storage.providers.healthError', 'Provider health check failed.'), t) });
    }
  }

  async function submitDialog(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dialogKind) return;
    setSaving(true);
    setMessage(null);
    try {
      await submitStorageForm(dialogKind, form);
      setDialogKind(null);
      setRefreshKey((value) => value + 1);
      setMessage({ kind: 'success', text: t('admin.storage.saveSuccess', 'Storage configuration saved successfully.') });
    } catch (error) {
      setMessage({ kind: 'error', text: readError(error, t('admin.storage.saveError', 'Storage configuration could not be saved.'), t) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {message ? (
        <div className={message.kind === 'success'
          ? 'flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200'
          : 'flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200'}
          role="status"
        >
          {message.kind === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <Activity className="h-4 w-4" />}
          <span>{message.text}</span>
        </div>
      ) : null}
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
      {explorerBucket ? (
        <BucketExplorerDialog
          bucket={explorerBucket}
          onClose={() => setExplorerBucket(null)}
        />
      ) : null}
      {editingBucket ? (
        <BucketStatusDialog
          bucket={editingBucket}
          onClose={() => !saving && setEditingBucket(null)}
          onSubmit={(status, reason) => void submitBucketStatusUpdate(status, reason)}
          saving={saving}
        />
      ) : null}
    </div>
  );
}

function BucketStatusDialog({
  bucket,
  onClose,
  onSubmit,
  saving,
}: {
  bucket: { id: string; bucketName: string; status: string };
  onClose: () => void;
  onSubmit: (status: string, reason: string) => void;
  saving: boolean;
}) {
  const { t } = useTranslation();
  const [status, setStatus] = useState(bucket.status);
  const [reason, setReason] = useState('');

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
        aria-labelledby="bucket-status-dialog-title"
        aria-modal="true"
        className="flex w-full max-w-md flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#181818]"
        role="dialog"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white" id="bucket-status-dialog-title">
              {t('admin.storage.buckets.editTitle', 'Edit bucket')}
            </h2>
            <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">{bucket.bucketName}</p>
          </div>
          <button aria-label={t('admin.storage.dialog.close', 'Close')} className="grid h-9 w-9 place-items-center rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10" onClick={onClose} type="button"><X className="h-4 w-4" /></button>
        </div>
        <form
          className="flex flex-col gap-4 p-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (!reason.trim()) return;
            onSubmit(status, reason.trim());
          }}
        >
          <SelectField
            label={t('admin.storage.form.bucketStatus', 'Status')}
            options={storageSelectOptions(t, 'status', ['active', 'archived', 'disabled'])}
            value={status}
            onChange={setStatus}
          />
          <TextField
            autoComplete="off"
            label={t('admin.storage.form.changeReason', 'Change reason')}
            required
            value={reason}
            onChange={setReason}
          />
          <div className="flex justify-end gap-3">
            <button className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5" disabled={saving} onClick={onClose} type="button">{t('admin.storage.dialog.cancel', 'Cancel')}</button>
            <button className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60" disabled={saving || !reason.trim()} type="submit">{saving ? t('admin.storage.dialog.saving', 'Saving...') : t('admin.storage.dialog.save', 'Save')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BucketExplorerDialog({
  bucket,
  onClose,
}: {
  bucket: BucketExplorerTarget;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const port = useMemo(() => createBucketExplorerPort(bucket), [bucket]);
  const labels = useMemo(() => bucketExplorerLabels(t), [t]);

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
        aria-labelledby="bucket-explorer-dialog-title"
        aria-modal="true"
        className="flex h-full w-full flex-col overflow-hidden rounded-lg border border-slate-200 bg-[#181818] shadow-2xl dark:border-white/10"
        role="dialog"
      >
        <div className="flex items-center justify-between border-b border-slate-700 bg-[#1e1e1e] px-5 py-3.5">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 truncate text-base font-semibold text-white" id="bucket-explorer-dialog-title">
              <FolderOpen className="h-4 w-4 shrink-0 text-slate-300" />
              <span className="truncate">{bucket.bucketName}</span>
            </h2>
            <p className="mt-0.5 truncate text-sm text-slate-400">
              {t('admin.storage.bucketExplorer.desc', 'Browse bucket files with full create, read, update, rename, move, and delete operations.')}
            </p>
          </div>
          <button
            aria-label={t('admin.storage.dialog.close', 'Close')}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-slate-300 hover:bg-white/10"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1">
          <SandboxExplorerView
            className="h-full min-h-[520px] rounded-b-lg"
            labels={labels}
            mode="manage"
            port={port}
          />
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
  const { t } = useTranslation();
  const title = dialogTitle(kind, t);
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
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto p-5 md:grid-cols-2">
            {kind === 'providers' ? <ProviderFields form={form} patch={patch} set={set} /> : null}
            {kind === 'buckets' ? <BucketFields form={form} set={set} /> : null}
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
  /** 账号级标识字段（如 Cloudflare R2 的 Account ID，构成端点）。 */
  readonly accountId?: string;
};

/**
 * 各服务商访问凭证字段的官方命名（对齐服务商控制台/文档），
 * 映射到统一的 accessKeyId/secretAccessKey/sessionToken/accountId 状态位。
 * local_dev_s3 无访问凭证。
 */
const PROVIDER_CREDENTIAL_FIELD_KEYS: Readonly<Record<string, ProviderCredentialFieldKeys | null>> = {
  aws_s3: { accessKey: 'accessKeyId', secretKey: 'secretAccessKey', sessionToken: 'sessionToken' },
  cloudflare_r2: { accessKey: 'accessKeyId', secretKey: 'secretAccessKey', accountId: 'accountId' },
  s3_compatible: { accessKey: 'accessKeyId', secretKey: 'secretAccessKey', sessionToken: 'sessionToken' },
  minio: { accessKey: 'accessKey', secretKey: 'secretKey', sessionToken: 'sessionToken' },
  oss_s3: { accessKey: 'accessKeyId', secretKey: 'accessKeySecret', sessionToken: 'securityToken' },
  cos_s3: { accessKey: 'secretId', secretKey: 'secretKey', sessionToken: 'token' },
  huawei_obs: { accessKey: 'accessKeyId', secretKey: 'secretAccessKey' },
  volcengine_tos: { accessKey: 'accessKeyId', secretKey: 'secretAccessKey', sessionToken: 'sessionToken' },
  baidu_bos: { accessKey: 'accessKeyId', secretKey: 'secretAccessKey' },
  qiniu_kodo: { accessKey: 'accessKey', secretKey: 'secretKey' },
  jdcloud_oss: { accessKey: 'accessKeyId', secretKey: 'secretAccessKey' },
  local_dev_s3: null,
};

/** Cloudflare R2 官方端点模板：由 Account ID 构成。 */
const R2_ENDPOINT_TEMPLATE = (accountId: string) => `https://${accountId}.r2.cloudflarestorage.com`;

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
  readonly supportsMultipart: boolean;
  readonly supportsLifecycle: boolean;
  readonly supportsObjectLock: boolean;
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
const BOS_ENDPOINT = (regionCode: string) => `https://${regionCode}.bcebos.com`;
const KODO_ENDPOINT = (regionCode: string) => `https://s3-${regionCode}.qiniucs.com`;
const JDOSS_ENDPOINT = (regionCode: string) => `https://s3.${regionCode}.jdcloud-oss.com`;

/** 各服务商预设配置：切换服务商类型时自动填充端点/区域与能力默认值，降低录入错误。 */
const PROVIDER_PRESETS: Readonly<Record<string, ProviderPreset>> = {
  aws_s3: {
    endpointOptions: [],
    endpointHintKey: 'admin.storage.form.endpointHintAws',
    regionOptions: [
      region('us-east-1'), region('us-east-2'), region('us-west-1'), region('us-west-2'),
      region('ap-northeast-1'), region('ap-southeast-1'), region('ap-southeast-2'), region('ap-south-1'),
      region('eu-central-1'), region('eu-west-1'),
    ],
    defaultRegion: 'us-east-1',
    pathStyleEnabled: false,
    supportsMultipart: true,
    supportsLifecycle: true,
    supportsObjectLock: true,
  },
  cloudflare_r2: {
    endpointOptions: [endpoint('https://{accountId}.r2.cloudflarestorage.com', 'admin.storage.preset.endpoint.r2')],
    endpointHintKey: 'admin.storage.form.endpointHintR2',
    regionOptions: [region('auto')],
    defaultEndpoint: 'https://{accountId}.r2.cloudflarestorage.com',
    defaultRegion: 'auto',
    pathStyleEnabled: false,
    supportsMultipart: true,
    supportsLifecycle: true,
    supportsObjectLock: true,
  },
  minio: {
    endpointOptions: [endpoint('http://localhost:9000', 'admin.storage.preset.endpoint.localhost')],
    endpointHintKey: 'admin.storage.form.endpointHintMinio',
    regionOptions: [region('us-east-1')],
    defaultEndpoint: 'http://localhost:9000',
    defaultRegion: 'us-east-1',
    pathStyleEnabled: true,
    supportsMultipart: true,
    supportsLifecycle: true,
    supportsObjectLock: true,
  },
  oss_s3: {
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
    supportsMultipart: true,
    supportsLifecycle: true,
    supportsObjectLock: true,
  },
  cos_s3: {
    endpointOptions: [
      endpoint(COS_ENDPOINT('ap-guangzhou'), undefined, 'ap-guangzhou'),
      endpoint(COS_ENDPOINT('ap-shanghai'), undefined, 'ap-shanghai'),
      endpoint(COS_ENDPOINT('ap-beijing'), undefined, 'ap-beijing'),
      endpoint(COS_ENDPOINT('ap-hongkong'), undefined, 'ap-hongkong'),
      endpoint(COS_ENDPOINT('ap-singapore'), undefined, 'ap-singapore'),
      endpoint(COS_ENDPOINT('na-siliconvalley'), undefined, 'na-siliconvalley'),
    ],
    regionOptions: [
      region('ap-guangzhou'), region('ap-shanghai'), region('ap-beijing'), region('ap-hongkong'),
      region('ap-singapore'), region('na-siliconvalley'),
    ],
    endpointTemplate: COS_ENDPOINT,
    defaultEndpoint: COS_ENDPOINT('ap-guangzhou'),
    defaultRegion: 'ap-guangzhou',
    pathStyleEnabled: false,
    supportsMultipart: true,
    supportsLifecycle: true,
    supportsObjectLock: false,
  },
  huawei_obs: {
    endpointOptions: [
      endpoint(OBS_ENDPOINT('cn-north-4'), undefined, 'cn-north-4'),
      endpoint(OBS_ENDPOINT('cn-north-1'), undefined, 'cn-north-1'),
      endpoint(OBS_ENDPOINT('cn-east-3'), undefined, 'cn-east-3'),
      endpoint(OBS_ENDPOINT('cn-south-1'), undefined, 'cn-south-1'),
      endpoint(OBS_ENDPOINT('cn-hongkong'), undefined, 'cn-hongkong'),
      endpoint(OBS_ENDPOINT('ap-southeast-1'), undefined, 'ap-southeast-1'),
    ],
    regionOptions: [
      region('cn-north-4'), region('cn-north-1'), region('cn-east-3'), region('cn-south-1'),
      region('cn-hongkong'), region('ap-southeast-1'),
    ],
    endpointTemplate: OBS_ENDPOINT,
    defaultEndpoint: OBS_ENDPOINT('cn-north-4'),
    defaultRegion: 'cn-north-4',
    pathStyleEnabled: false,
    supportsMultipart: true,
    supportsLifecycle: true,
    supportsObjectLock: true,
  },
  volcengine_tos: {
    endpointOptions: [
      endpoint(TOS_ENDPOINT('cn-beijing'), undefined, 'cn-beijing'),
      endpoint(TOS_ENDPOINT('cn-shanghai'), undefined, 'cn-shanghai'),
      endpoint(TOS_ENDPOINT('cn-guangzhou'), undefined, 'cn-guangzhou'),
      endpoint(TOS_ENDPOINT('ap-southeast-1'), undefined, 'ap-southeast-1'),
    ],
    regionOptions: [
      region('cn-beijing'), region('cn-shanghai'), region('cn-guangzhou'), region('ap-southeast-1'),
    ],
    endpointTemplate: TOS_ENDPOINT,
    defaultEndpoint: TOS_ENDPOINT('cn-beijing'),
    defaultRegion: 'cn-beijing',
    pathStyleEnabled: false,
    supportsMultipart: true,
    supportsLifecycle: true,
    supportsObjectLock: false,
  },
  baidu_bos: {
    endpointOptions: [
      endpoint(BOS_ENDPOINT('bj'), undefined, 'bj'),
      endpoint(BOS_ENDPOINT('gz'), undefined, 'gz'),
      endpoint(BOS_ENDPOINT('su'), undefined, 'su'),
      endpoint(BOS_ENDPOINT('hkg'), undefined, 'hkg'),
    ],
    regionOptions: [
      region('bj'), region('gz'), region('su'), region('hkg'),
    ],
    endpointTemplate: BOS_ENDPOINT,
    defaultEndpoint: BOS_ENDPOINT('bj'),
    defaultRegion: 'bj',
    pathStyleEnabled: false,
    supportsMultipart: true,
    supportsLifecycle: true,
    supportsObjectLock: false,
  },
  qiniu_kodo: {
    endpointOptions: [
      endpoint(KODO_ENDPOINT('cn-east-1'), undefined, 'cn-east-1'),
      endpoint(KODO_ENDPOINT('cn-north-1'), undefined, 'cn-north-1'),
      endpoint(KODO_ENDPOINT('cn-south-1'), undefined, 'cn-south-1'),
    ],
    regionOptions: [
      region('cn-east-1'), region('cn-north-1'), region('cn-south-1'),
    ],
    endpointTemplate: KODO_ENDPOINT,
    defaultEndpoint: KODO_ENDPOINT('cn-east-1'),
    defaultRegion: 'cn-east-1',
    pathStyleEnabled: true,
    supportsMultipart: true,
    supportsLifecycle: true,
    supportsObjectLock: false,
  },
  jdcloud_oss: {
    endpointOptions: [
      endpoint(JDOSS_ENDPOINT('cn-north-1'), undefined, 'cn-north-1'),
      endpoint(JDOSS_ENDPOINT('cn-east-1'), undefined, 'cn-east-1'),
      endpoint(JDOSS_ENDPOINT('cn-south-1'), undefined, 'cn-south-1'),
    ],
    regionOptions: [
      region('cn-north-1'), region('cn-east-1'), region('cn-south-1'),
    ],
    endpointTemplate: JDOSS_ENDPOINT,
    defaultEndpoint: JDOSS_ENDPOINT('cn-north-1'),
    defaultRegion: 'cn-north-1',
    pathStyleEnabled: false,
    supportsMultipart: true,
    supportsLifecycle: true,
    supportsObjectLock: false,
  },
  s3_compatible: {
    endpointOptions: [],
    endpointHintKey: 'admin.storage.form.endpointHintGeneric',
    regionOptions: [
      region('us-east-1'), region('us-west-2'), region('ap-northeast-1'), region('ap-southeast-1'),
      region('eu-central-1'),
    ],
    defaultRegion: 'us-east-1',
    pathStyleEnabled: false,
    supportsMultipart: true,
    supportsLifecycle: true,
    supportsObjectLock: false,
  },
  local_dev_s3: {
    endpointOptions: [
      endpoint('http://localhost:9000', 'admin.storage.preset.endpoint.localhost'),
      endpoint('http://127.0.0.1:9000'),
    ],
    regionOptions: [region('us-east-1')],
    defaultEndpoint: 'http://localhost:9000',
    defaultRegion: 'us-east-1',
    pathStyleEnabled: true,
    supportsMultipart: true,
    supportsLifecycle: true,
    supportsObjectLock: false,
  },
};

/** 预设选项显示文案：labelKey 查 i18n，缺省回退 value。 */
function presetOptionLabel(t: TFunction, option: ProviderPresetOption): string {
  return option.labelKey ? t(option.labelKey, option.value) : option.value;
}

/** 桶创建/默认桶使用的区域预设（各服务商预设区域并集，auto 除外）。 */
const BUCKET_REGION_OPTIONS: readonly ProviderPresetOption[] = [
  region('us-east-1'), region('us-east-2'), region('us-west-1'), region('us-west-2'),
  region('ap-northeast-1'), region('ap-southeast-1'), region('ap-southeast-2'), region('ap-south-1'),
  region('eu-central-1'), region('eu-west-1'),
  region('cn-hangzhou'), region('cn-shanghai'), region('cn-beijing'), region('cn-shenzhen'),
  region('cn-hongkong'), region('ap-guangzhou'), region('ap-singapore'), region('na-siliconvalley'),
];

/**
 * 通用异步选项加载：列表接口 → 选项映射，带 loading/empty/error 三态。
 * 供「选择存储桶」「选择服务商」等下拉复用，避免各表单重复实现。
 */
function useStorageSelectOptions<T>(
  load: () => Promise<{ items: readonly T[] }>,
  mapItem: (item: T) => SelectOption,
  labels: { readonly loading: string; readonly empty: string; readonly error: string },
): { readonly options: readonly SelectOption[]; readonly status: 'loading' | 'ready' | 'error' } {
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
  return { options, status };
}

function ProviderFields({ form, patch, set }: { form: StorageFormState; patch: (values: Partial<StorageFormState>) => void; set: FieldSetter }) {
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
      supportsMultipart: next.supportsMultipart,
      supportsLifecycle: next.supportsLifecycle,
      supportsObjectLock: next.supportsObjectLock,
    });
  };
  const handleAccountIdChange = (accountId: string) => {
    const cleaned = accountId.trim();
    const nextEndpoint = cleaned ? R2_ENDPOINT_TEMPLATE(cleaned) : '';
    const currentEndpoint = form.endpointUrl.trim();
    const isAutoEndpoint = !currentEndpoint
      || currentEndpoint === 'https://{accountId}.r2.cloudflarestorage.com'
      || currentEndpoint === R2_ENDPOINT_TEMPLATE(form.accountId.trim());
    patch({
      accountId: cleaned,
      ...(isAutoEndpoint ? { endpointUrl: nextEndpoint } : {}),
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
    <SelectField label={t('admin.storage.form.providerType', 'Provider type')} value={form.providerType} onChange={(value) => applyProviderPreset(value as StorageFormState['providerType'])} options={storageSelectOptions(t, 'providerType', ['s3_compatible', 'aws_s3', 'cloudflare_r2', 'minio', 'oss_s3', 'cos_s3', 'huawei_obs', 'volcengine_tos', 'baidu_bos', 'qiniu_kodo', 'jdcloud_oss', 'local_dev_s3'])} />
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
        <TextField autoComplete="new-password" label={credentialLabel(credentialFields.accessKey)} required type="password" value={form.accessKeyId} onChange={(value) => set('accessKeyId', value)} />
        <TextField autoComplete="new-password" label={credentialLabel(credentialFields.secretKey)} required type="password" value={form.secretAccessKey} onChange={(value) => set('secretAccessKey', value)} />
        {credentialFields.accountId ? (
          <TextField
            autoComplete="off"
            description={credentialFields.accountId === 'accountId' ? t('admin.storage.form.accountIdDesc', 'Your Cloudflare account ID. The R2 endpoint is generated from it automatically.') : undefined}
            label={credentialLabel(credentialFields.accountId)}
            required
            value={form.accountId}
            onChange={handleAccountIdChange}
          />
        ) : null}
        {credentialFields.sessionToken ? (
          <TextField autoComplete="new-password" label={credentialLabel(credentialFields.sessionToken)} type="password" value={form.sessionToken} onChange={(value) => set('sessionToken', value)} />
        ) : null}
        <div className="md:col-span-2 text-xs text-slate-500 dark:text-slate-400">
          {t('admin.storage.form.plainCredentialDesc', 'Field names follow the provider console. Credentials are submitted as a plain:<accessKeyId>:<secretAccessKey>[:<sessionToken>] string and are never rendered back.')}
        </div>
      </>
    ) : (
      <div className="md:col-span-2"><TextField description={t('admin.storage.form.credentialRefDesc', 'Use a vault/KMS/secret reference such as vault:<ref>, kms:<ref>, secret:<ref>, or env:<ref>.')} label={t('admin.storage.form.credentialRef', 'Credential reference')} required value={form.credentialRef} onChange={(value) => set('credentialRef', value)} /></div>
    )}
    <ToggleField checked={form.pathStyleEnabled} label={t('admin.storage.form.pathStyle', 'Path-style access')} onChange={(value) => set('pathStyleEnabled', value)} />
    <ToggleField checked={form.supportsMultipart} label={t('admin.storage.form.multipart', 'Multipart uploads')} onChange={(value) => set('supportsMultipart', value)} />
    <ToggleField checked={form.supportsLifecycle} label={t('admin.storage.form.lifecycle', 'Lifecycle policies')} onChange={(value) => set('supportsLifecycle', value)} />
    <ToggleField checked={form.supportsObjectLock} label={t('admin.storage.form.objectLock', 'Object Lock')} onChange={(value) => set('supportsObjectLock', value)} />
  </>;
}

function BucketFields({ form, set }: { form: StorageFormState; set: FieldSetter }) {
  const { t } = useTranslation();
  const providerSelect = useStorageSelectOptions(
    backendStorageProvidersList,
    (provider) => ({ value: provider.id, label: provider.name || provider.providerCode }),
    {
      loading: t('admin.storage.form.providerLoading', 'Loading providers...'),
      empty: t('admin.storage.form.providerEmpty', 'No providers available yet. Create one in Storage Providers first.'),
      error: t('admin.storage.form.providerError', 'Providers could not be loaded.'),
    },
  );
  const bucketRegionOptions = BUCKET_REGION_OPTIONS.map((option) => ({
    value: option.value,
    label: presetOptionLabel(t, option),
  }));

  return <>
    <TextField label={t('admin.storage.form.bucketName', 'Bucket name')} required value={form.bucketName} onChange={(value) => set('bucketName', value)} />
    <SelectField
      disabled={providerSelect.status !== 'ready' || providerSelect.options.length === 0}
      label={t('admin.storage.form.providerId', 'Provider ID')}
      options={providerSelect.options}
      required
      value={form.providerId}
      onChange={(value) => set('providerId', value)}
    />
    <SelectField label={t('admin.storage.form.logicalScope', 'Logical scope')} value={form.logicalScope} onChange={(value) => set('logicalScope', value as StorageFormState['logicalScope'])} options={storageSelectOptions(t, 'logicalScope', ['tenant_private', 'tenant_public_asset', 'system_temp', 'system_variant', 'system_archive', 'system_quarantine', 'migration_import'])} />
    <PrefillSelectField
      label={t('admin.storage.form.bucketRegion', 'Bucket region')}
      options={bucketRegionOptions}
      placeholder={t('admin.storage.form.regionPlaceholder', 'Select a preset region or type a custom region')}
      value={form.bucketRegion}
      onChange={(value) => set('bucketRegion', value)}
    />
    <TextField label={t('admin.storage.form.dataResidencyRegion', 'Data residency region')} value={form.dataResidencyRegion} onChange={(value) => set('dataResidencyRegion', value)} />
    <TextField label={t('admin.storage.form.objectKeyPrefix', 'Object key prefix')} value={form.objectKeyPrefix} onChange={(value) => set('objectKeyPrefix', value)} />
    <SelectField label={t('admin.storage.form.storageClass', 'Storage class')} value={form.defaultStorageClass} onChange={(value) => set('defaultStorageClass', value as StorageFormState['defaultStorageClass'])} options={storageSelectOptions(t, 'storageClass', ['STANDARD', 'INTELLIGENT_TIERING', 'STANDARD_IA', 'ONEZONE_IA', 'GLACIER_IR', 'GLACIER', 'DEEP_ARCHIVE'])} />
    <SelectField label={t('admin.storage.form.encryption', 'Encryption')} value={form.defaultEncryptionMode} onChange={(value) => set('defaultEncryptionMode', value as StorageFormState['defaultEncryptionMode'])} options={storageSelectOptions(t, 'encryption', ['sse_s3', 'sse_kms', 'none'])} />
    {form.defaultEncryptionMode === 'sse_kms' ? <div className="md:col-span-2"><TextField label={t('admin.storage.form.kmsKeyRef', 'KMS key reference')} required value={form.kmsKeyRef} onChange={(value) => set('kmsKeyRef', value)} /></div> : null}
    <ToggleField checked={form.versioningEnabled} label={t('admin.storage.form.versioning', 'Versioning')} onChange={(value) => set('versioningEnabled', value)} />
    <ToggleField checked={form.objectLockEnabled} label={t('admin.storage.form.objectLock', 'Object Lock')} onChange={(value) => set('objectLockEnabled', value)} />
    <ToggleField checked={form.lifecycleEnabled} label={t('admin.storage.form.lifecycle', 'Lifecycle policies')} onChange={(value) => set('lifecycleEnabled', value)} />
    <ToggleField checked={form.publicAccessBlocked} label={t('admin.storage.form.publicAccess', 'Block public access')} onChange={(value) => set('publicAccessBlocked', value)} />
  </>;
}

function DefaultBucketFields({ form, set }: { form: StorageFormState; set: FieldSetter }) {
  const { t } = useTranslation();
  const bucketSelect = useStorageSelectOptions(
    backendStorageBucketsList,
    (bucket) => ({ value: bucket.id, label: `${bucket.bucketName} · ${bucket.providerCode}` }),
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
    backendStorageProvidersList,
    (provider) => ({ value: provider.id, label: provider.name || provider.providerCode }),
    {
      loading: t('admin.storage.form.providerLoading', 'Loading providers...'),
      empty: t('admin.storage.form.providerEmpty', 'No providers available yet. Create one in Storage Providers first.'),
      error: t('admin.storage.form.providerError', 'Providers could not be loaded.'),
    },
  );
  const bucketSelect = useStorageSelectOptions(
    backendStorageBucketsList,
    (bucket) => ({ value: bucket.id, label: `${bucket.bucketName} · ${bucket.providerCode}` }),
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

function TextField({ description, label, onChange, ...props }: { description?: string; label: string; onChange: (value: string) => void } & Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'onChange'>) {
  return <label className="block text-sm font-medium text-slate-700 dark:text-slate-200"><span>{label}</span><input {...props} className="mt-1.5 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-white" onChange={(event) => onChange(event.target.value)} />{description ? <span className="mt-1 block text-xs font-normal text-slate-500">{description}</span> : null}</label>;
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
      <span>{label}</span>
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

function TextAreaField({ label, onChange, value }: { label: string; onChange: (value: string) => void; value: string }) {
  return <label className="block text-sm font-medium text-slate-700 dark:text-slate-200"><span>{label}</span><textarea className="mt-1.5 min-h-24 w-full rounded-md border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-white" onChange={(event) => onChange(event.target.value)} value={value} /></label>;
}

function SelectField({ disabled = false, label, onChange, options, required = false, value }: { disabled?: boolean; label: string; onChange: (value: string) => void; options: readonly (string | SelectOption)[]; required?: boolean; value: string }) {
  return <label className="block text-sm font-medium text-slate-700 dark:text-slate-200"><span>{label}</span><select className="mt-1.5 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-[#202020] dark:text-white" disabled={disabled} onChange={(event) => onChange(event.target.value)} required={required} value={value}>{options.map((option) => { const normalized = typeof option === 'string' ? { value: option, label: option } : option; return <option disabled={normalized.disabled ?? false} key={normalized.value} value={normalized.value}>{normalized.label}</option>; })}</select></label>;
}

function ToggleField({ checked, label, onChange }: { checked: boolean; label: string; onChange: (value: boolean) => void }) {
  return <label className="flex min-h-10 items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 dark:border-white/10 dark:text-slate-200"><span>{label}</span><input checked={checked} className="h-4 w-4 accent-blue-600" onChange={(event) => onChange(event.target.checked)} type="checkbox" /></label>;
}

async function submitStorageForm(kind: StorageDialogKind, form: StorageFormState): Promise<unknown> {
  if (kind === 'providers') {
    const credentialRef = form.providerType === 'local_dev_s3'
      ? 'local:'
      : form.credentialMode === 'plain'
        ? buildPlainCredentialRef(form.accessKeyId, form.secretAccessKey, form.sessionToken)
        : form.credentialRef.trim();
    return backendStorageProviderCreate({
      name: form.providerName.trim(), providerType: form.providerType,
      endpointUrl: optionalText(form.endpointUrl), region: optionalText(form.region),
      credentialRef, pathStyleEnabled: form.pathStyleEnabled,
      supportsMultipart: form.supportsMultipart, supportsLifecycle: form.supportsLifecycle,
      supportsObjectLock: form.supportsObjectLock,
    });
  }
  if (kind === 'buckets') {
    return backendStorageBucketCreate({
      bucketName: form.bucketName.trim(), providerId: form.providerId.trim(), logicalScope: form.logicalScope,
      bucketRegion: optionalText(form.bucketRegion), dataResidencyRegion: optionalText(form.dataResidencyRegion),
      objectKeyPrefix: optionalText(form.objectKeyPrefix), defaultStorageClass: form.defaultStorageClass,
      defaultEncryptionMode: form.defaultEncryptionMode, kmsKeyRef: optionalText(form.kmsKeyRef),
      versioningEnabled: form.versioningEnabled, objectLockEnabled: form.objectLockEnabled,
      lifecycleEnabled: form.lifecycleEnabled, publicAccessBlocked: form.publicAccessBlocked,
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

function resolveStorageSectionId(value: string | undefined): StorageAdminSectionId {
  return SECTION_IDS.includes(value as StorageAdminSectionId) ? value as StorageAdminSectionId : 'providers';
}

function createAction(label: string, onClick: () => void) {
  return { label, icon: <Plus className="h-4 w-4" />, onClick };
}

function dialogTitle(kind: StorageDialogKind, t: ReturnType<typeof useTranslation>['t']): string {
  const titles: Record<StorageDialogKind, string> = {
    providers: t('admin.storage.providers.add', 'Add provider'), buckets: t('admin.storage.buckets.add', 'Add bucket'),
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
