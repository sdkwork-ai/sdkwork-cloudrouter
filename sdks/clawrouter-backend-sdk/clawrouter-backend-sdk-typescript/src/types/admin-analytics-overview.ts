/** Admin analytics overview schema exposed by Claw Router. */
export interface AdminAnalyticsOverview {
  /** End time field on admin analytics overview. */
  endTime?: string | null;
  /** Insights field on admin analytics overview. */
  insights: Record<string, unknown>[];
  /** Modality distribution field on admin analytics overview. */
  modalityDistribution: Record<string, unknown>[];
  /** Model distribution field on admin analytics overview. */
  modelDistribution: Record<string, unknown>[];
  /** Model rankings field on admin analytics overview. */
  modelRankings: Record<string, unknown>;
  /** Ranking size field on admin analytics overview. */
  rankingSize: number;
  /** Start time field on admin analytics overview. */
  startTime?: string | null;
  /** Summary field on admin analytics overview. */
  summary: Record<string, unknown>;
  /** Time range field on admin analytics overview. */
  timeRange: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  /** Trend field on admin analytics overview. */
  trend: Record<string, unknown>[];
  /** User rankings field on admin analytics overview. */
  userRankings: Record<string, unknown>;
}
