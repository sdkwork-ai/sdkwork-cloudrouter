import type { AdminAnalyticsModelRankItem } from './admin-analytics-model-rank-item';

/** Admin analytics model rankings schema exposed by Claw Router. */
export interface AdminAnalyticsModelRankings {
  /** Points field on admin analytics model rankings. */
  points: AdminAnalyticsModelRankItem[];
  /** Requests field on admin analytics model rankings. */
  requests: AdminAnalyticsModelRankItem[];
  /** Tokens field on admin analytics model rankings. */
  tokens: AdminAnalyticsModelRankItem[];
}
