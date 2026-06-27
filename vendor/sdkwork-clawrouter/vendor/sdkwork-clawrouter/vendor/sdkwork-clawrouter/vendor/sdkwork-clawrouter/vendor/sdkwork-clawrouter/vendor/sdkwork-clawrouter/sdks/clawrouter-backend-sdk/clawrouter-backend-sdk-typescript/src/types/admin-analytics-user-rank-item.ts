import type { AdminPieChartItem } from './admin-pie-chart-item';

/** Admin analytics user rank item schema exposed by Claw Router. */
export interface AdminAnalyticsUserRankItem {
  /** Email field on admin analytics user rank item. */
  email?: string | null;
  /** Model distribution field on admin analytics user rank item. */
  modelDistribution: AdminPieChartItem[];
  /** Points field on admin analytics user rank item. */
  points: number;
  /** Rank field on admin analytics user rank item. */
  rank: string;
  /** Request count field on admin analytics user rank item. */
  requestCount: string;
  /** Total tokens field on admin analytics user rank item. */
  totalTokens: number;
  /** User id field on admin analytics user rank item. */
  userId: string;
  /** User name field on admin analytics user rank item. */
  userName: string;
}
