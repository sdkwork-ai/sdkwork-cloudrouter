import type { MembershipsPackageGroupsUpdateResult } from './memberships-package-groups-update-result';

export interface MembershipsPackageGroupsUpdateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
