import { useMemo, useState, type FormEvent, type InputHTMLAttributes } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Activity,
  BarChart3,
  CheckCircle2,
  CloudCog,
  DatabaseZap,
  FolderCog,
  Gauge,
  Plus,
  Recycle,
  ShieldCheck,
  X,
} from 'lucide-react';
import {
  AdminResourceCenter,
  type AdminResourceRecord,
  type AdminResourceSection,
} from '@sdkwork/clawroutes-pc-commons';
import {
  backendStorageBucketCreate,
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
  type StorageDefaultBucketUpdateInput,
  type StorageGarbageCollectionCreateInput,
  type StorageProviderCreateInput,
  type StorageQuotaCreateInput,
  type StorageReconciliationCreateInput,
} from './storageService';

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
  providerCode: string;
  providerType: StorageProviderCreateInput['providerType'];
  endpointUrl: string;
  region: string;
  credentialRef: string;
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
  providerCode: '',
  providerType: 's3_compatible',
  endpointUrl: '',
  region: '',
  credentialRef: '',
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
        { key: 'providerCode', label: t('admin.storage.col.providerCode', 'Provider') },
        { key: 'providerType', label: t('admin.storage.col.type', 'Type') },
        { key: 'endpointUrl', label: t('admin.storage.col.endpoint', 'Endpoint') },
        { key: 'region', label: t('admin.storage.col.region', 'Region') },
        { key: 'credentialRef', label: t('admin.storage.col.credentialRef', 'Credential Ref') },
        { key: 'healthStatus', label: t('admin.storage.col.health', 'Health') },
        { key: 'status', label: t('admin.storage.col.status', 'Status') },
      ],
      searchFields: ['providerCode', 'providerType', 'endpointUrl', 'region', 'healthStatus', 'status'],
    },
    {
      id: 'buckets',
      title: t('admin.storage.buckets.title', 'Storage Buckets'),
      description: t('admin.storage.buckets.desc', 'Bucket placement, encryption, lifecycle, residency, versioning, and public-access policy.'),
      icon: <FolderCog className="h-4 w-4" />,
      group: t('admin.menu.storage.configuration', 'Storage Configuration'),
      load: () => backendStorageBucketsList(),
      action: createAction(t('admin.storage.buckets.add', 'Add bucket'), () => openDialog('buckets')),
      columns: [
        { key: 'bucketName', label: t('admin.storage.col.bucket', 'Bucket') },
        { key: 'providerCode', label: t('admin.storage.col.providerCode', 'Provider') },
        { key: 'logicalScope', label: t('admin.storage.col.logicalScope', 'Logical Scope') },
        { key: 'bucketRegion', label: t('admin.storage.col.region', 'Region') },
        { key: 'defaultStorageClass', label: t('admin.storage.col.storageClass', 'Storage Class') },
        { key: 'defaultEncryptionMode', label: t('admin.storage.col.encryption', 'Encryption') },
        { key: 'status', label: t('admin.storage.col.status', 'Status') },
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
        { key: 'logicalScope', label: t('admin.storage.col.logicalScope', 'Logical Scope') },
        { key: 'bucketName', label: t('admin.storage.col.bucket', 'Bucket') },
        { key: 'providerCode', label: t('admin.storage.col.providerCode', 'Provider') },
        { key: 'reason', label: t('admin.storage.col.reason', 'Reason') },
        { key: 'updatedAt', label: t('admin.storage.col.updatedAt', 'Updated') },
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
        { key: 'scopeType', label: t('admin.storage.col.scopeType', 'Scope Type') },
        { key: 'scopeId', label: t('admin.storage.col.scopeId', 'Scope ID') },
        { key: 'quotaLimitBytes', label: t('admin.storage.col.quota', 'Quota Bytes'), align: 'right' },
        { key: 'usedBytes', label: t('admin.storage.col.used', 'Used Bytes'), align: 'right' },
        { key: 'singleFileLimitBytes', label: t('admin.storage.col.fileLimit', 'File Limit'), align: 'right' },
        { key: 'enforcement', label: t('admin.storage.col.enforcement', 'Enforcement') },
      ],
      searchFields: ['scopeType', 'scopeId', 'enforcement'],
    },
    {
      id: 'usage',
      title: t('admin.storage.usage.title', 'Storage Usage'),
      description: t('admin.storage.usage.desc', 'Usage rollups by tenant, provider, bucket, logical scope, storage class, and residency.'),
      icon: <BarChart3 className="h-4 w-4" />,
      group: t('admin.menu.storage.governance', 'Storage Governance'),
      load: () => backendStorageUsageList(),
      columns: [
        { key: 'scopeType', label: t('admin.storage.col.scopeType', 'Scope Type') },
        { key: 'scopeId', label: t('admin.storage.col.scopeId', 'Scope ID') },
        { key: 'bucketName', label: t('admin.storage.col.bucket', 'Bucket') },
        { key: 'logicalScope', label: t('admin.storage.col.logicalScope', 'Logical Scope') },
        { key: 'objectCount', label: t('admin.storage.col.objects', 'Objects'), align: 'right' },
        { key: 'usedBytes', label: t('admin.storage.col.used', 'Used Bytes'), align: 'right' },
      ],
      searchFields: ['scopeType', 'scopeId', 'bucketName', 'logicalScope'],
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
        { key: 'runNo', label: t('admin.storage.col.run', 'Run') },
        { key: 'runType', label: t('admin.storage.col.type', 'Type') },
        { key: 'providerCode', label: t('admin.storage.col.providerCode', 'Provider') },
        { key: 'bucketName', label: t('admin.storage.col.bucket', 'Bucket') },
        { key: 'dryRun', label: t('admin.storage.col.dryRun', 'Dry Run') },
        { key: 'driftCount', label: t('admin.storage.col.drift', 'Drift'), align: 'right' },
        { key: 'status', label: t('admin.storage.col.status', 'Status') },
      ],
      searchFields: ['runNo', 'runType', 'providerCode', 'bucketName', 'status'],
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
        { key: 'jobNo', label: t('admin.storage.col.job', 'Job') },
        { key: 'jobType', label: t('admin.storage.col.type', 'Type') },
        { key: 'target', label: t('admin.storage.col.target', 'Target') },
        { key: 'retentionWindow', label: t('admin.storage.col.retention', 'Retention') },
        { key: 'dryRun', label: t('admin.storage.col.dryRun', 'Dry Run') },
        { key: 'deletedObjectCount', label: t('admin.storage.col.deleted', 'Deleted'), align: 'right' },
        { key: 'status', label: t('admin.storage.col.status', 'Status') },
      ],
      searchFields: ['jobNo', 'jobType', 'target', 'status'],
    },
  ], [t]);

  function openDialog(kind: StorageDialogKind) {
    setForm(DEFAULT_FORM_STATE);
    setMessage(null);
    setDialogKind(kind);
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
      setMessage({ kind: 'error', text: readError(error, t('admin.storage.providers.healthError', 'Provider health check failed.')) });
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
      setMessage({ kind: 'error', text: readError(error, t('admin.storage.saveError', 'Storage configuration could not be saved.')) });
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
          emptyTitle={t('admin.storage.empty', 'No storage records')}
          errorTitle={t('admin.storage.error', 'Storage data could not be loaded')}
          loadingTitle={t('admin.storage.loading', 'Loading storage records...')}
          refreshKey={refreshKey}
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
}: {
  form: StorageFormState;
  kind: StorageDialogKind;
  onChange: (value: StorageFormState) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  saving: boolean;
}) {
  const { t } = useTranslation();
  const title = dialogTitle(kind, t);
  const set = <K extends keyof StorageFormState,>(key: K, value: StorageFormState[K]) => onChange({ ...form, [key]: value });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" role="presentation">
      <div aria-labelledby="storage-dialog-title" aria-modal="true" className="flex max-h-[min(880px,calc(100vh-2rem))] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#181818]" role="dialog">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white" id="storage-dialog-title">{title}</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('admin.storage.dialog.desc', 'Changes are validated and submitted through the ClawRouter backend management SDK.')}</p>
          </div>
          <button aria-label={t('admin.storage.dialog.close', 'Close')} className="grid h-9 w-9 place-items-center rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10" onClick={onClose} type="button"><X className="h-4 w-4" /></button>
        </div>
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={onSubmit}>
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto p-5 md:grid-cols-2">
            {kind === 'providers' ? <ProviderFields form={form} set={set} /> : null}
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

function ProviderFields({ form, set }: { form: StorageFormState; set: FieldSetter }) {
  return <>
    <TextField label="Provider code" required value={form.providerCode} onChange={(value) => set('providerCode', value)} />
    <SelectField label="Provider type" value={form.providerType} onChange={(value) => set('providerType', value as StorageFormState['providerType'])} options={['s3_compatible', 'aws_s3', 'cloudflare_r2', 'minio', 'oss_s3', 'cos_s3', 'local_dev_s3']} />
    <TextField label="Endpoint URL" type="url" value={form.endpointUrl} onChange={(value) => set('endpointUrl', value)} />
    <TextField label="Region" value={form.region} onChange={(value) => set('region', value)} />
    <div className="md:col-span-2"><TextField description="Use a vault/KMS reference. Raw access keys are not accepted here." label="Credential reference" required value={form.credentialRef} onChange={(value) => set('credentialRef', value)} /></div>
    <ToggleField checked={form.pathStyleEnabled} label="Path-style access" onChange={(value) => set('pathStyleEnabled', value)} />
    <ToggleField checked={form.supportsMultipart} label="Multipart uploads" onChange={(value) => set('supportsMultipart', value)} />
    <ToggleField checked={form.supportsLifecycle} label="Lifecycle policies" onChange={(value) => set('supportsLifecycle', value)} />
    <ToggleField checked={form.supportsObjectLock} label="Object Lock" onChange={(value) => set('supportsObjectLock', value)} />
  </>;
}

function BucketFields({ form, set }: { form: StorageFormState; set: FieldSetter }) {
  return <>
    <TextField label="Bucket name" required value={form.bucketName} onChange={(value) => set('bucketName', value)} />
    <TextField label="Provider ID" required value={form.providerId} onChange={(value) => set('providerId', value)} />
    <SelectField label="Logical scope" value={form.logicalScope} onChange={(value) => set('logicalScope', value as StorageFormState['logicalScope'])} options={['tenant_private', 'tenant_public_asset', 'system_temp', 'system_variant', 'system_archive', 'system_quarantine', 'migration_import']} />
    <TextField label="Bucket region" value={form.bucketRegion} onChange={(value) => set('bucketRegion', value)} />
    <TextField label="Data residency region" value={form.dataResidencyRegion} onChange={(value) => set('dataResidencyRegion', value)} />
    <TextField label="Object key prefix" value={form.objectKeyPrefix} onChange={(value) => set('objectKeyPrefix', value)} />
    <SelectField label="Storage class" value={form.defaultStorageClass} onChange={(value) => set('defaultStorageClass', value as StorageFormState['defaultStorageClass'])} options={['STANDARD', 'INTELLIGENT_TIERING', 'STANDARD_IA', 'ONEZONE_IA', 'GLACIER_IR', 'GLACIER', 'DEEP_ARCHIVE']} />
    <SelectField label="Encryption" value={form.defaultEncryptionMode} onChange={(value) => set('defaultEncryptionMode', value as StorageFormState['defaultEncryptionMode'])} options={['sse_s3', 'sse_kms', 'none']} />
    {form.defaultEncryptionMode === 'sse_kms' ? <div className="md:col-span-2"><TextField label="KMS key reference" required value={form.kmsKeyRef} onChange={(value) => set('kmsKeyRef', value)} /></div> : null}
    <ToggleField checked={form.versioningEnabled} label="Versioning" onChange={(value) => set('versioningEnabled', value)} />
    <ToggleField checked={form.objectLockEnabled} label="Object Lock" onChange={(value) => set('objectLockEnabled', value)} />
    <ToggleField checked={form.lifecycleEnabled} label="Lifecycle policies" onChange={(value) => set('lifecycleEnabled', value)} />
    <ToggleField checked={form.publicAccessBlocked} label="Block public access" onChange={(value) => set('publicAccessBlocked', value)} />
  </>;
}

function DefaultBucketFields({ form, set }: { form: StorageFormState; set: FieldSetter }) {
  return <>
    <SelectField label="Logical scope" value={form.logicalScope} onChange={(value) => set('logicalScope', value as StorageFormState['logicalScope'])} options={['tenant_private', 'tenant_public_asset', 'system_temp', 'system_variant', 'system_archive', 'system_quarantine', 'migration_import']} />
    <TextField label="Bucket ID" required value={form.bucketId} onChange={(value) => set('bucketId', value)} />
    <div className="md:col-span-2"><TextField label="Change reason" required value={form.reason} onChange={(value) => set('reason', value)} /></div>
  </>;
}

function QuotaFields({ form, set }: { form: StorageFormState; set: FieldSetter }) {
  return <>
    <SelectField label="Scope type" value={form.scopeType} onChange={(value) => set('scopeType', value as StorageFormState['scopeType'])} options={['tenant', 'organization', 'app', 'space', 'user']} />
    <TextField label="Scope ID" required value={form.scopeId} onChange={(value) => set('scopeId', value)} />
    <TextField label="Quota limit (bytes)" pattern="[0-9]+" required value={form.quotaLimitBytes} onChange={(value) => set('quotaLimitBytes', value)} />
    <TextField label="Single-file limit (bytes)" pattern="[0-9]*" value={form.singleFileLimitBytes} onChange={(value) => set('singleFileLimitBytes', value)} />
    <SelectField label="Enforcement" value={form.enforcement} onChange={(value) => set('enforcement', value)} options={['hard', 'soft', 'observe']} />
  </>;
}

function ReconciliationFields({ form, set }: { form: StorageFormState; set: FieldSetter }) {
  return <>
    <SelectField label="Run type" value={form.runType} onChange={(value) => set('runType', value)} options={['full', 'provider', 'bucket', 'metadata']} />
    <TextField label="Provider ID" value={form.providerId} onChange={(value) => set('providerId', value)} />
    <TextField label="Bucket ID" value={form.bucketId} onChange={(value) => set('bucketId', value)} />
    <TextField label="Reason" required value={form.reason} onChange={(value) => set('reason', value)} />
    <ToggleField checked={form.dryRun} label="Dry run" onChange={(value) => set('dryRun', value)} />
  </>;
}

function GarbageCollectionFields({ form, set }: { form: StorageFormState; set: FieldSetter }) {
  return <>
    <SelectField label="Job type" value={form.jobType} onChange={(value) => set('jobType', value)} options={['expired_objects', 'orphaned_objects', 'failed_uploads', 'temporary_objects']} />
    <TextField label="Target" required value={form.target} onChange={(value) => set('target', value)} />
    <TextField label="Retention window" required value={form.retentionWindow} onChange={(value) => set('retentionWindow', value)} />
    <TextField label="Dry-run sample size" pattern="[0-9]+" value={form.dryRunSample} onChange={(value) => set('dryRunSample', value)} />
    <div className="md:col-span-2"><TextAreaField label="Criteria (JSON)" value={form.criteria} onChange={(value) => set('criteria', value)} /></div>
    <ToggleField checked={form.dryRun} label="Dry run" onChange={(value) => set('dryRun', value)} />
  </>;
}

function TextField({ description, label, onChange, ...props }: { description?: string; label: string; onChange: (value: string) => void } & Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'onChange'>) {
  return <label className="block text-sm font-medium text-slate-700 dark:text-slate-200"><span>{label}</span><input {...props} className="mt-1.5 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-white" onChange={(event) => onChange(event.target.value)} />{description ? <span className="mt-1 block text-xs font-normal text-slate-500">{description}</span> : null}</label>;
}

function TextAreaField({ label, onChange, value }: { label: string; onChange: (value: string) => void; value: string }) {
  return <label className="block text-sm font-medium text-slate-700 dark:text-slate-200"><span>{label}</span><textarea className="mt-1.5 min-h-24 w-full rounded-md border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-white" onChange={(event) => onChange(event.target.value)} value={value} /></label>;
}

function SelectField({ label, onChange, options, value }: { label: string; onChange: (value: string) => void; options: readonly string[]; value: string }) {
  return <label className="block text-sm font-medium text-slate-700 dark:text-slate-200"><span>{label}</span><select className="mt-1.5 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-white/10 dark:bg-[#202020] dark:text-white" onChange={(event) => onChange(event.target.value)} value={value}>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>;
}

function ToggleField({ checked, label, onChange }: { checked: boolean; label: string; onChange: (value: boolean) => void }) {
  return <label className="flex min-h-10 items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 dark:border-white/10 dark:text-slate-200"><span>{label}</span><input checked={checked} className="h-4 w-4 accent-blue-600" onChange={(event) => onChange(event.target.checked)} type="checkbox" /></label>;
}

async function submitStorageForm(kind: StorageDialogKind, form: StorageFormState): Promise<unknown> {
  if (kind === 'providers') {
    return backendStorageProviderCreate({
      providerCode: form.providerCode.trim(), providerType: form.providerType,
      endpointUrl: optionalText(form.endpointUrl), region: optionalText(form.region),
      credentialRef: form.credentialRef.trim(), pathStyleEnabled: form.pathStyleEnabled,
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

function readError(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export default StorageAdmin;
