/** Admin storage provider create request schema exposed by Cloud Router. */
export interface AdminStorageProviderCreateRequest {
  /** Credential ref field on admin storage provider create request. */
  credentialRef: string;
  /** Endpoint url field on admin storage provider create request. */
  endpointUrl?: string | null;
  /** Name field on admin storage provider create request. */
  name: string;
  /** Path style enabled field on admin storage provider create request. */
  pathStyleEnabled?: boolean | null;
  /** Provider code field on admin storage provider create request. */
  providerCode?: string | null;
  /** Provider type field on admin storage provider create request. */
  providerType: 'aws_s3' | 'baidu_bos' | 'cloudflare_r2' | 'cos_s3' | 'huawei_obs' | 'jdcloud_oss' | 'local_dev_s3' | 'minio' | 'oss_s3' | 'qiniu_kodo' | 's3_compatible' | 'volcengine_tos';
  /** Region field on admin storage provider create request. */
  region?: string | null;
  /** Supports lifecycle field on admin storage provider create request. */
  supportsLifecycle?: boolean | null;
  /** Supports multipart field on admin storage provider create request. */
  supportsMultipart?: boolean | null;
  /** Supports object lock field on admin storage provider create request. */
  supportsObjectLock?: boolean | null;
}
