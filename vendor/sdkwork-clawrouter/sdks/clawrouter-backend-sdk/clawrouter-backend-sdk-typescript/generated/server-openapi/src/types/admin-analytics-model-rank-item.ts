/** Admin analytics model rank item schema exposed by Claw Router. */
export interface AdminAnalyticsModelRankItem {
  /** Average tokens per request field on admin analytics model rank item. */
  averageTokensPerRequest: number;
  /** Catalog key field on admin analytics model rank item. */
  catalogKey: string;
  /** Error rate field on admin analytics model rank item. */
  errorRate: number;
  /** Modality field on admin analytics model rank item. */
  modality: string;
  /** Model field on admin analytics model rank item. */
  model: string;
  /** Points field on admin analytics model rank item. */
  points: number;
  /** Rank field on admin analytics model rank item. */
  rank: string;
  /** Request count field on admin analytics model rank item. */
  requestCount: string;
  /** Total tokens field on admin analytics model rank item. */
  totalTokens: number;
  /** Upstream cost field on admin analytics model rank item. */
  upstreamCost: number;
  /** User count field on admin analytics model rank item. */
  userCount: string;
  /** Vendor field on admin analytics model rank item. */
  vendor: string;
}
