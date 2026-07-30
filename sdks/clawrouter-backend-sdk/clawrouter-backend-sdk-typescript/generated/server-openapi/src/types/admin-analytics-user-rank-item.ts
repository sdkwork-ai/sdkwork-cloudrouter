import type { AdminAnalyticsPieItem } from './admin-analytics-pie-item';

/** Admin analytics user rank item schema exposed by Claw Router. */
export interface AdminAnalyticsUserRankItem {
  /** Email field on admin analytics user rank item. */
  email?: string | null;
  /** Model distribution field on admin analytics user rank item. */
  modelDistribution: AdminAnalyticsPieItem[];
  /** Points field on admin analytics user rank item. */
  points: string;
  /** Rank field on admin analytics user rank item. */
  rank: number;
  /** Request count field on admin analytics user rank item. */
  requestCount: string;
  /** Total tokens field on admin analytics user rank item. */
  totalTokens: string;
  /** User id field on admin analytics user rank item. */
  userId: string;
  /** User name field on admin analytics user rank item. */
  userName: string;
}
