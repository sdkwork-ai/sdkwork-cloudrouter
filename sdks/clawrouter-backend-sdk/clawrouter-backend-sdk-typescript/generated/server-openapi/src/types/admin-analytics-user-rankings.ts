import type { AdminAnalyticsUserRankItem } from './admin-analytics-user-rank-item';

/** Admin analytics user rankings schema exposed by Claw Router. */
export interface AdminAnalyticsUserRankings {
  /** Points field on admin analytics user rankings. */
  points: AdminAnalyticsUserRankItem[];
  /** Requests field on admin analytics user rankings. */
  requests: AdminAnalyticsUserRankItem[];
  /** Tokens field on admin analytics user rankings. */
  tokens: AdminAnalyticsUserRankItem[];
}
