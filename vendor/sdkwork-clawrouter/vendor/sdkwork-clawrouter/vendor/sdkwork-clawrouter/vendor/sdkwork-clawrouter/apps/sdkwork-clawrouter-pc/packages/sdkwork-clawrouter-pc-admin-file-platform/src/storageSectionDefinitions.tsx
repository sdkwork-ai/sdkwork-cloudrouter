import {
  BarChart3,
  ClipboardList,
  CreditCard,
  Database,
  HardDrive,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import type { AdminResourceSection } from '@sdkwork/clawroutes-pc-commons';
import {
  listStorageGarbageCollectionJobs,
  listStorageQuotas,
  listStorageReconciliationRuns,
  listStorageUsage,
} from './storageService';

export type StorageSectionId =
  | 'providers'
  | 'buckets'
  | 'default-buckets'
  | 'quotas'
  | 'usage'
  | 'reconciliation'
  | 'garbage-collection';

type Translate = (key: string, defaultValue: string) => string;

export function resolveStorageSectionId(sectionId: string | undefined): StorageSectionId {
  switch (sectionId) {
    case 'providers':
    case 'buckets':
    case 'default-buckets':
    case 'quotas':
    case 'usage':
    case 'reconciliation':
    case 'garbage-collection':
      return sectionId;
    default:
      return 'providers';
  }
}

export function isStorageOperationsSection(
  sectionId: StorageSectionId,
): sectionId is 'providers' | 'buckets' | 'default-buckets' {
  return sectionId === 'providers' || sectionId === 'buckets' || sectionId === 'default-buckets';
}

export function buildStorageTableSections(
  t: Translate,
): AdminResourceSection<StorageSectionId, string>[] {
  return [
    {
      id: 'quotas',
      title: t('admin.storage.sections.quotas', 'Quota Policies'),
      description: t('admin.storage.sections.quotasDesc', 'Manage storage quota policies and limits.'),
      icon: <CreditCard className="h-4 w-4" />,
      group: t('admin.storage.groups.governance', 'Governance'),
      load: () => listStorageQuotas(),
      columns: [
        { key: 'id', label: t('admin.storage.columns.id', 'ID') },
        { key: 'scopeType', label: t('admin.storage.columns.scopeType', 'Scope Type') },
        { key: 'scopeId', label: t('admin.storage.columns.scopeId', 'Scope ID') },
        { key: 'quotaLimitBytes', label: t('admin.storage.columns.quotaLimitBytes', 'Quota Limit'), align: 'right' },
        { key: 'status', label: t('admin.storage.columns.status', 'Status') },
      ],
      searchFields: ['id', 'scopeType', 'scopeId', 'quotaLimitBytes', 'status'],
    },
    {
      id: 'usage',
      title: t('admin.storage.sections.usage', 'Usage'),
      description: t('admin.storage.sections.usageDesc', 'Inspect storage usage counters by scope.'),
      icon: <BarChart3 className="h-4 w-4" />,
      group: t('admin.storage.groups.governance', 'Governance'),
      load: () => listStorageUsage(),
      columns: [
        { key: 'id', label: t('admin.storage.columns.id', 'ID') },
        { key: 'scopeType', label: t('admin.storage.columns.scopeType', 'Scope Type') },
        { key: 'scopeId', label: t('admin.storage.columns.scopeId', 'Scope ID') },
        { key: 'usedLogicalBytes', label: t('admin.storage.columns.usedLogicalBytes', 'Used Bytes'), align: 'right' },
        { key: 'fileCount', label: t('admin.storage.columns.fileCount', 'Files'), align: 'right' },
      ],
      searchFields: ['id', 'scopeType', 'scopeId', 'usedLogicalBytes', 'fileCount'],
    },
    {
      id: 'reconciliation',
      title: t('admin.storage.sections.reconciliation', 'Reconciliation'),
      description: t('admin.storage.sections.reconciliationDesc', 'Review storage reconciliation runs and outcomes.'),
      icon: <ClipboardList className="h-4 w-4" />,
      group: t('admin.storage.groups.governance', 'Governance'),
      load: () => listStorageReconciliationRuns(),
      columns: [
        { key: 'id', label: t('admin.storage.columns.id', 'ID') },
        { key: 'runType', label: t('admin.storage.columns.runType', 'Run Type') },
        { key: 'status', label: t('admin.storage.columns.status', 'Status') },
        { key: 'issueCount', label: t('admin.storage.columns.issueCount', 'Issues'), align: 'right' },
        { key: 'createdAt', label: t('admin.storage.columns.createdAt', 'Created At') },
      ],
      searchFields: ['id', 'runType', 'status', 'issueCount', 'createdAt'],
    },
    {
      id: 'garbage-collection',
      title: t('admin.storage.sections.garbageCollection', 'Garbage Collection'),
      description: t('admin.storage.sections.garbageCollectionDesc', 'Inspect garbage collection jobs and cleanup progress.'),
      icon: <ShieldAlert className="h-4 w-4" />,
      group: t('admin.storage.groups.governance', 'Governance'),
      load: () => listStorageGarbageCollectionJobs(),
      columns: [
        { key: 'id', label: t('admin.storage.columns.id', 'ID') },
        { key: 'jobType', label: t('admin.storage.columns.jobType', 'Job Type') },
        { key: 'status', label: t('admin.storage.columns.status', 'Status') },
        { key: 'dryRun', label: t('admin.storage.columns.dryRun', 'Dry Run') },
        { key: 'releasedBytes', label: t('admin.storage.columns.releasedBytes', 'Released Bytes'), align: 'right' },
      ],
      searchFields: ['id', 'jobType', 'status', 'dryRun', 'releasedBytes'],
    },
  ];
}

export const STORAGE_CONFIGURATION_SECTIONS: Array<{
  id: Extract<StorageSectionId, 'providers' | 'buckets' | 'default-buckets'>;
  titleKey: string;
  defaultTitle: string;
  icon: React.ReactNode;
}> = [
  {
    id: 'providers',
    titleKey: 'admin.storage.sections.providers',
    defaultTitle: 'Providers',
    icon: <HardDrive className="h-4 w-4" />,
  },
  {
    id: 'buckets',
    titleKey: 'admin.storage.sections.buckets',
    defaultTitle: 'Buckets',
    icon: <Database className="h-4 w-4" />,
  },
  {
    id: 'default-buckets',
    titleKey: 'admin.storage.sections.defaultBuckets',
    defaultTitle: 'Default Buckets',
    icon: <ShieldCheck className="h-4 w-4" />,
  },
];
