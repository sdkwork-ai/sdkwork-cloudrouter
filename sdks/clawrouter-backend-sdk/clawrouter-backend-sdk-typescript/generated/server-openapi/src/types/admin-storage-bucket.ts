/** Admin storage bucket schema exposed by Claw Router. */
export interface AdminStorageBucket {
  /** Bucket name field on admin storage bucket. */
  bucketName: string;
  /** Bucket region field on admin storage bucket. */
  bucketRegion: string;
  /** Created at field on admin storage bucket. */
  createdAt: string;
  /** Data residency region field on admin storage bucket. */
  dataResidencyRegion: string;
  /** Default encryption mode field on admin storage bucket. */
  defaultEncryptionMode: string;
  /** Default storage class field on admin storage bucket. */
  defaultStorageClass: string;
  /** Encryption field on admin storage bucket. */
  encryption: string;
  /** Id field on admin storage bucket. */
  id: string;
  /** Kms key ref field on admin storage bucket. */
  kmsKeyRef: string;
  /** Lifecycle enabled field on admin storage bucket. */
  lifecycleEnabled: boolean;
  /** Logical scope field on admin storage bucket. */
  logicalScope: string;
  /** Object key prefix field on admin storage bucket. */
  objectKeyPrefix: string;
  /** Object lock enabled field on admin storage bucket. */
  objectLockEnabled: boolean;
  /** Provider code field on admin storage bucket. */
  providerCode: string;
  /** Provider id field on admin storage bucket. */
  providerId: string;
  /** Provider type field on admin storage bucket. */
  providerType: string;
  /** Public access blocked field on admin storage bucket. */
  publicAccessBlocked: boolean;
  /** Region field on admin storage bucket. */
  region: string;
  /** Status field on admin storage bucket. */
  status: string;
  /** Storage class field on admin storage bucket. */
  storageClass: string;
  /** Updated at field on admin storage bucket. */
  updatedAt: string;
  /** Versioning enabled field on admin storage bucket. */
  versioningEnabled: boolean;
}
