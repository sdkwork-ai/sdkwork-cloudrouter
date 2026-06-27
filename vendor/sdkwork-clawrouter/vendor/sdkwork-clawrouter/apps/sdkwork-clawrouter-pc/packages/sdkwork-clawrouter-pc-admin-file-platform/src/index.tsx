import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AdminResourceCenter } from '@sdkwork/clawroutes-pc-commons';
import { StorageOperationsSettings } from '@sdkwork/file-platform-pc-react';
import { createAdminStoragePort } from './adminStoragePort';
import {
  buildDriveTableSections,
  resolveDriveSectionId,
  type DriveSectionId,
} from './driveSectionDefinitions.tsx';
import {
  buildStorageTableSections,
  isStorageOperationsSection,
  resolveStorageSectionId,
  type StorageSectionId,
} from './storageSectionDefinitions.tsx';

type FilePlatformAdminProps = {
  sectionId?: string;
};

type DriveAdminProps = {
  sectionId?: string;
};

export function DriveAdmin({ sectionId }: DriveAdminProps = {}) {
  const { t } = useTranslation();
  const activeSectionId = resolveDriveSectionId(sectionId);
  const tableSections = useMemo(() => buildDriveTableSections(t), [t]);

  return (
    <AdminResourceCenter
      activeSectionId={activeSectionId}
      emptyTitle={t('admin.drive.empty', 'No drive records found for this section.')}
      errorTitle={t('admin.drive.errors.loadFallback', 'Drive data could not be loaded.')}
      loadingTitle={t('admin.drive.loading', 'Loading drive records...')}
      sections={tableSections}
      showSectionNavigation={false}
      tableViewportDataAttribute="admin-drive-table-viewport"
    />
  );
}

export function FilePlatformAdmin({ sectionId }: FilePlatformAdminProps = {}) {
  const { t } = useTranslation();
  const activeSectionId = resolveStorageSectionId(sectionId);
  const storagePort = useMemo(() => createAdminStoragePort(), []);
  const tableSections = useMemo(() => buildStorageTableSections(t), [t]);

  if (isStorageOperationsSection(activeSectionId)) {
    return (
      <StorageOperationsSettings
        port={storagePort}
        title={resolveStorageOperationsTitle(t, activeSectionId)}
      />
    );
  }

  return (
    <AdminResourceCenter
      activeSectionId={activeSectionId as Exclude<StorageSectionId, 'providers' | 'buckets' | 'default-buckets'>}
      emptyTitle={t('admin.storage.empty', 'No storage records found for this section.')}
      errorTitle={t('admin.storage.errors.loadFallback', 'Storage data could not be loaded.')}
      loadingTitle={t('admin.storage.loading', 'Loading storage records...')}
      sections={tableSections}
      showSectionNavigation={false}
      tableViewportDataAttribute="admin-storage-table-viewport"
    />
  );
}

function resolveStorageOperationsTitle(
  t: ReturnType<typeof useTranslation>['t'],
  sectionId: Extract<StorageSectionId, 'providers' | 'buckets' | 'default-buckets'>,
): string {
  switch (sectionId) {
    case 'providers':
      return t('admin.storage.sections.providers', 'Storage Providers');
    case 'buckets':
      return t('admin.storage.sections.buckets', 'Storage Buckets');
    case 'default-buckets':
      return t('admin.storage.sections.defaultBuckets', 'Default Buckets');
    default:
      return t('admin.storage.sections.operations', 'Storage Operations');
  }
}

export {
  createStorageBucket,
  createStorageGarbageCollectionJob,
  createStorageProvider,
  createStorageQuota,
  createStorageReconciliationRun,
  healthCheckStorageProvider,
  listStorageBuckets,
  listStorageDefaultBuckets,
  listStorageGarbageCollectionJobs,
  listStorageProviders,
  listStorageQuotas,
  listStorageReconciliationRuns,
  listStorageUsage,
  updateStorageBucket,
  updateStorageDefaultBucket,
  updateStorageProvider,
} from './storageService';
