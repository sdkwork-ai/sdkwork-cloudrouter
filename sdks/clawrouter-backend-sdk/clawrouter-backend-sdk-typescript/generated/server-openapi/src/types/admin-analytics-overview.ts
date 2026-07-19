/** AdminAnalyticsOverview contract. */
export interface AdminAnalyticsOverview {
  /** endTime field on AdminAnalyticsOverview. */
  endTime?: string | unknown;
  /** insights field on AdminAnalyticsOverview. */
  insights: Record<string, unknown>[];
  /** modalityDistribution field on AdminAnalyticsOverview. */
  modalityDistribution: Record<string, unknown>[];
  /** modelDistribution field on AdminAnalyticsOverview. */
  modelDistribution: Record<string, unknown>[];
  /** modelRankings field on AdminAnalyticsOverview. */
  modelRankings: Record<string, unknown>;
  /** rankingSize field on AdminAnalyticsOverview. */
  rankingSize: number;
  /** startTime field on AdminAnalyticsOverview. */
  startTime?: string | unknown;
  /** summary field on AdminAnalyticsOverview. */
  summary: Record<string, unknown>;
  /** timeRange field on AdminAnalyticsOverview. */
  timeRange: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  /** trend field on AdminAnalyticsOverview. */
  trend: Record<string, unknown>[];
  /** userRankings field on AdminAnalyticsOverview. */
  userRankings: Record<string, unknown>;
}
