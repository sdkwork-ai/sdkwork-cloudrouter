import type { MembershipsPackageGroupsRetrieveResult } from './memberships-package-groups-retrieve-result';

export interface MembershipsPackageGroupsRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
