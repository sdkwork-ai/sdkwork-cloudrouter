/** Data center source schema exposed by Cloud Router. */
export interface DataCenterSource {
  /** Health field on data center source. */
  health: 'healthy' | 'warning' | 'error' | 'unknown';
  /** Id field on data center source. */
  id: string;
  /** Kind field on data center source. */
  kind: 'postgresql' | 'mysql' | 'platform' | 'file';
  /** Last tested at field on data center source. */
  lastTestedAt: string | null;
  /** Name field on data center source. */
  name: string;
  /** Table count field on data center source. */
  tableCount: string;
}
