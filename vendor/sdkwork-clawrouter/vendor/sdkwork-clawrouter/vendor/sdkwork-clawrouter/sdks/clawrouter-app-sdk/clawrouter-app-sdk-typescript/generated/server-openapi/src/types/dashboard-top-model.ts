/** Dashboard top model schema exposed by Claw Router. */
export interface DashboardTopModel {
  /** Cost field on dashboard top model. */
  cost: number;
  /** Is up field on dashboard top model. */
  isUp: boolean;
  /** Modality field on dashboard top model. */
  modality: 'text' | 'image' | 'video' | 'audio' | 'music' | 'unknown';
  /** Name field on dashboard top model. */
  name: string;
  /** Rank field on dashboard top model. */
  rank: string;
  /** Requests field on dashboard top model. */
  requests: string;
  /** Supplier field on dashboard top model. */
  supplier: string;
  /** Trend field on dashboard top model. */
  trend: string;
}
