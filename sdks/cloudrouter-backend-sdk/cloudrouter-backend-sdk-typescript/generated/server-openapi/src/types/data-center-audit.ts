/** Data center audit schema exposed by Cloud Router. */
export interface DataCenterAudit {
  /** Action field on data center audit. */
  action: 'connect' | 'query' | 'download' | 'ddl' | 'dml' | 'publish' | 'approve' | 'rollback';
  /** Actor field on data center audit. */
  actor: string;
  /** At field on data center audit. */
  at: string;
  /** Id field on data center audit. */
  id: string;
  /** Object field on data center audit. */
  object: string;
  /** Result field on data center audit. */
  result: 'success' | 'failure';
  /** Row count field on data center audit. */
  rowCount: string;
}
