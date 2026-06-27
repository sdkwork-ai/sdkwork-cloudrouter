/** Admin runtime route explain request schema exposed by Claw Router. */
export interface AdminRuntimeRouteExplainRequest {
  /** API endpoint code used for route and channel scope matching. */
  apiCode?: string;
  /** API key id whose owner scope and route group are used by the runtime selector. */
  apiKeyId: string;
  /** Billing meter used by pricing readiness checks. */
  billingMeter?: string;
  /** Runtime routing capability to evaluate. Defaults to chat. */
  capability?: 'chat' | 'image' | 'audio' | 'music' | 'video' | 'embedding' | 'rerank' | 'network';
  /** Optional model catalog key. When present the runtime selector explains model route planning. */
  catalogKey?: string;
  /** Optional channel group id. Defaults to the API key's bound group. */
  channelGroupId?: string;
  /** Requested model or provider-native model identifier. */
  model?: string;
  /** Requested resource code, such as api.openai.chat_completions. */
  resourceCode?: string;
  /** Non-model route key used when catalogKey is absent. */
  routeKey?: string;
}
