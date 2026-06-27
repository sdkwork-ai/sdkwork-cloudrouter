/** Admin service node item schema exposed by Claw Router. */
export interface AdminServiceNodeItem {
  /** Domain field on admin service node item. */
  domain: string;
  /** Health status field on admin service node item. */
  healthStatus: 'online' | 'warning' | 'offline' | 'unknown';
  /** Id field on admin service node item. */
  id: string;
  /** Ip field on admin service node item. */
  ip: string;
  /** Name field on admin service node item. */
  name: string;
  /** Remark field on admin service node item. */
  remark: string;
  /** Status field on admin service node item. */
  status: 'enabled' | 'disabled';
  /** Updated at field on admin service node item. */
  updatedAt: string;
}
