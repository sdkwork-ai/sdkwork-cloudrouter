/** Data center table schema exposed by Cloud Router. */
export interface DataCenterTable {
  /** Column count field on data center table. */
  columnCount: number;
  /** Id field on data center table. */
  id: string;
  /** Kind field on data center table. */
  kind: 'landed' | 'external' | 'view';
  /** Name field on data center table. */
  name: string;
  /** Owner field on data center table. */
  owner: string;
  /** Row count field on data center table. */
  rowCount: string;
  /** Updated at field on data center table. */
  updatedAt: string;
}
