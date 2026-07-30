import type { AdminAnalyticsInsight } from './admin-analytics-insight';
import type { AdminAnalyticsModelRankings } from './admin-analytics-model-rankings';
import type { AdminAnalyticsPieItem } from './admin-analytics-pie-item';
import type { AdminAnalyticsSummary } from './admin-analytics-summary';
import type { AdminAnalyticsTrendPoint } from './admin-analytics-trend-point';
import type { AdminAnalyticsUserRankings } from './admin-analytics-user-rankings';

/** Admin analytics overview schema exposed by Claw Router. */
export interface AdminAnalyticsOverview {
  /** End time field on admin analytics overview. */
  endTime: string;
  /** Insights field on admin analytics overview. */
  insights: AdminAnalyticsInsight[];
  /** Modality distribution field on admin analytics overview. */
  modalityDistribution: AdminAnalyticsPieItem[];
  /** Model distribution field on admin analytics overview. */
  modelDistribution: AdminAnalyticsPieItem[];
  /** Model rankings field on admin analytics overview. */
  modelRankings: AdminAnalyticsModelRankings;
  /** Ranking size field on admin analytics overview. */
  rankingSize: number;
  /** Start time field on admin analytics overview. */
  startTime: string;
  /** Summary field on admin analytics overview. */
  summary: AdminAnalyticsSummary;
  /** Time range field on admin analytics overview. */
  timeRange: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  /** Trend field on admin analytics overview. */
  trend: AdminAnalyticsTrendPoint[];
  /** User rankings field on admin analytics overview. */
  userRankings: AdminAnalyticsUserRankings;
}
