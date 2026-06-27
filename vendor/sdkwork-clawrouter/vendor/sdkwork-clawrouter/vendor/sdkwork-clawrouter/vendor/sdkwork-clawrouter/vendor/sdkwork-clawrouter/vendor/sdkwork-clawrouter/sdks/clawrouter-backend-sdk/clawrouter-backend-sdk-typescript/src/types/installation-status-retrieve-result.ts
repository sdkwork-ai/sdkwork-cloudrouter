import type { InstallationStatusResponse } from './installation-status-response';

/** Installation status retrieve result schema exposed by Claw Router. */
export interface InstallationStatusRetrieveResult {
  /** Business response code. */
  code: string;
  /** Data field on installation status retrieve result. */
  data?: InstallationStatusResponse;
  /** Human-readable response message. */
  msg?: string;
}
