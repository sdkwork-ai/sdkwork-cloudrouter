/** Admin storage bucket create request schema exposed by Claw Router. */
export interface AdminStorageBucketCreateRequest {
  /** Bucket name field on admin storage bucket create request. */
  bucketName: string;
  /** Bucket region field on admin storage bucket create request. */
  bucketRegion?: string | null;
  /** Data residency region field on admin storage bucket create request. */
  dataResidencyRegion?: string | null;
  /** Default encryption mode field on admin storage bucket create request. */
  defaultEncryptionMode?: 'none' | 'sse_kms' | 'sse_s3' | null;
  /** Default storage class field on admin storage bucket create request. */
  defaultStorageClass?: 'STANDARD' | 'INTELLIGENT_TIERING' | 'STANDARD_IA' | 'ONEZONE_IA' | 'GLACIER_IR' | 'GLACIER' | 'DEEP_ARCHIVE' | null;
  /** Kms key ref field on admin storage bucket create request. */
  kmsKeyRef?: string | null;
  /** Lifecycle enabled field on admin storage bucket create request. */
  lifecycleEnabled?: boolean | null;
  /** Logical scope field on admin storage bucket create request. */
  logicalScope: 'migration_import' | 'system_archive' | 'system_quarantine' | 'system_temp' | 'system_variant' | 'tenant_private' | 'tenant_public_asset';
  /** Object key prefix field on admin storage bucket create request. */
  objectKeyPrefix?: string | null;
  /** Object lock enabled field on admin storage bucket create request. */
  objectLockEnabled?: boolean | null;
  /** Provider id field on admin storage bucket create request. */
  providerId: string;
  /** Public access blocked field on admin storage bucket create request. */
  publicAccessBlocked?: boolean | null;
  /** Versioning enabled field on admin storage bucket create request. */
  versioningEnabled?: boolean | null;
}
