import { getCloudRouterTokenManager } from '@sdkwork/cloudrouter-h5-core/session';

export interface CloudRouterH5IamRuntime {
  readonly tokenManager: ReturnType<typeof getCloudRouterTokenManager>;
}

/**
 * IAM runtime wiring. The H5 root uses the appbase app API through the generated
 * app SDK; the same TokenManager instance is shared with every app SDK client.
 */
export function bootstrapIamRuntime(): CloudRouterH5IamRuntime {
  return { tokenManager: getCloudRouterTokenManager() };
}
