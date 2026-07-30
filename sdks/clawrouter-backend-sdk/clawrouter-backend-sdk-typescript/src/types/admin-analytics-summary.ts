/** Admin analytics summary schema exposed by Claw Router. */
export interface AdminAnalyticsSummary {
  /** Active models field on admin analytics summary. */
  activeModels: string;
  /** Active users field on admin analytics summary. */
  activeUsers: string;
  /** Average points per request field on admin analytics summary. */
  averagePointsPerRequest: string;
  /** Average tokens per request field on admin analytics summary. */
  averageTokensPerRequest: string;
  /** Error rate field on admin analytics summary. */
  errorRate: string;
  /** Failed requests field on admin analytics summary. */
  failedRequests: string;
  /** Successful requests field on admin analytics summary. */
  successfulRequests: string;
  /** Total points field on admin analytics summary. */
  totalPoints: string;
  /** Total requests field on admin analytics summary. */
  totalRequests: string;
  /** Total tokens field on admin analytics summary. */
  totalTokens: string;
  /** Total users field on admin analytics summary. */
  totalUsers: string;
  /** Upstream cost field on admin analytics summary. */
  upstreamCost: string;
}
