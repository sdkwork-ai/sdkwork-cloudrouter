/** Data center export schema exposed by Cloud Router. */
export interface DataCenterExport {
  /** Dataset name field on data center export. */
  datasetName: string;
  /** Expires at field on data center export. */
  expiresAt: string | null;
  /** Id field on data center export. */
  id: string;
  /** Requested by field on data center export. */
  requestedBy: string;
  /** Row count field on data center export. */
  rowCount: string;
  /** Status field on data center export. */
  status: 'pending_approval' | 'running' | 'succeeded' | 'failed' | 'expired';
}
