import type { AdminAnalyticsInsight } from './admin-analytics-insight';
import type { AdminAnalyticsModelRankings } from './admin-analytics-model-rankings';
import type { AdminAnalyticsSummary } from './admin-analytics-summary';
import type { AdminAnalyticsTrendPoint } from './admin-analytics-trend-point';
import type { AdminAnalyticsUserRankings } from './admin-analytics-user-rankings';
import type { AdminPieChartItem } from './admin-pie-chart-item';

/** Admin analytics overview response schema exposed by Claw Router. */
export interface AdminAnalyticsOverviewResponse {
  /** End time field on admin analytics overview response. */
  endTime?: string | null;
  /** Insights field on admin analytics overview response. */
  insights: AdminAnalyticsInsight[];
  /** Limit field on admin analytics overview response. */
  limit: string;
  /** Modality distribution field on admin analytics overview response. */
  modalityDistribution: AdminPieChartItem[];
  /** Model distribution field on admin analytics overview response. */
  modelDistribution: AdminPieChartItem[];
  /** Model rankings field on admin analytics overview response. */
  modelRankings: AdminAnalyticsModelRankings;
  /** Start time field on admin analytics overview response. */
  startTime?: string | null;
  /** Summary field on admin analytics overview response. */
  summary: AdminAnalyticsSummary;
  /** Time range field on admin analytics overview response. */
  timeRange: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  /** Trend field on admin analytics overview response. */
  trend: AdminAnalyticsTrendPoint[];
  /** User rankings field on admin analytics overview response. */
  userRankings: AdminAnalyticsUserRankings;
}
