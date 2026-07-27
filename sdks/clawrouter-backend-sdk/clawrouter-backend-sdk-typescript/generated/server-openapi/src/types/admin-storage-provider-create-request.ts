/** Admin storage provider create request schema exposed by Claw Router. */
export interface AdminStorageProviderCreateRequest {
  /** Credential ref field on admin storage provider create request. */
  credentialRef: string;
  /** Endpoint url field on admin storage provider create request. */
  endpointUrl?: string | null;
  /** Path style enabled field on admin storage provider create request. */
  pathStyleEnabled?: boolean | null;
  /** Provider code field on admin storage provider create request. */
  providerCode: string;
  /** Provider type field on admin storage provider create request. */
  providerType: 'aws_s3' | 'cloudflare_r2' | 'cos_s3' | 'local_dev_s3' | 'minio' | 'oss_s3' | 's3_compatible';
  /** Region field on admin storage provider create request. */
  region?: string | null;
  /** Supports lifecycle field on admin storage provider create request. */
  supportsLifecycle?: boolean | null;
  /** Supports multipart field on admin storage provider create request. */
  supportsMultipart?: boolean | null;
  /** Supports object lock field on admin storage provider create request. */
  supportsObjectLock?: boolean | null;
}
