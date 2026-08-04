/** Admin storage provider schema exposed by Claw Router. */
export interface AdminStorageProvider {
  /** Created at field on admin storage provider. */
  createdAt: string;
  /** Credential ref field on admin storage provider. */
  credentialRef: string;
  /** Endpoint url field on admin storage provider. */
  endpointUrl: string;
  /** Health status field on admin storage provider. */
  healthStatus: string;
  /** Id field on admin storage provider. */
  id: string;
  /** Last health check at field on admin storage provider. */
  lastHealthCheckAt: string;
  /** Path style enabled field on admin storage provider. */
  pathStyleEnabled: boolean;
  /** Provider code field on admin storage provider. */
  providerCode: string;
  /** Provider type field on admin storage provider. */
  providerType: string;
  /** Region field on admin storage provider. */
  region: string;
  /** Status field on admin storage provider. */
  status: string;
  /** Supports lifecycle field on admin storage provider. */
  supportsLifecycle: boolean;
  /** Supports multipart field on admin storage provider. */
  supportsMultipart: boolean;
  /** Supports object lock field on admin storage provider. */
  supportsObjectLock: boolean;
  /** Updated at field on admin storage provider. */
  updatedAt: string;
}
