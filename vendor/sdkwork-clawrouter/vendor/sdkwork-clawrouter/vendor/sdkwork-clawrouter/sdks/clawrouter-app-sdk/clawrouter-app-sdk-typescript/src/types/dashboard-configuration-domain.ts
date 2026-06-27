/** Dashboard configuration domain schema exposed by Claw Router. */
export interface DashboardConfigurationDomain {
  /** Domain field on dashboard configuration domain. */
  domain: string;
  /** Id field on dashboard configuration domain. */
  id: string;
  /** Ip field on dashboard configuration domain. */
  ip: string;
  /** Name field on dashboard configuration domain. */
  name: string;
  /** Remark field on dashboard configuration domain. */
  remark: string;
  /** Status field on dashboard configuration domain. */
  status: 'online' | 'warning' | 'offline' | 'unknown';
}
