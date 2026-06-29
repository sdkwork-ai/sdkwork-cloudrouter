import type { MembershipsPackageGroupsCreateResult } from './memberships-package-groups-create-result';

export interface MembershipsPackageGroupsCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
