import type { AdminProviderSecretItem } from './admin-provider-secret-item';

/** Admin provider secrets response schema exposed by Claw Router. */
export interface AdminProviderSecretsResponse {
  /** Items field on admin provider secrets response. */
  items: AdminProviderSecretItem[];
}
