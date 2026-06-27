/** Admin analytics summary schema exposed by Claw Router. */
export interface AdminAnalyticsSummary {
  /** Active models field on admin analytics summary. */
  activeModels: string;
  /** Active users field on admin analytics summary. */
  activeUsers: string;
  /** Average points per request field on admin analytics summary. */
  averagePointsPerRequest: number;
  /** Average tokens per request field on admin analytics summary. */
  averageTokensPerRequest: number;
  /** Error rate field on admin analytics summary. */
  errorRate: number;
  /** Failed requests field on admin analytics summary. */
  failedRequests: string;
  /** Successful requests field on admin analytics summary. */
  successfulRequests: string;
  /** Total points field on admin analytics summary. */
  totalPoints: number;
  /** Total requests field on admin analytics summary. */
  totalRequests: string;
  /** Total tokens field on admin analytics summary. */
  totalTokens: number;
  /** Total users field on admin analytics summary. */
  totalUsers: string;
  /** Upstream cost field on admin analytics summary. */
  upstreamCost: number;
}
