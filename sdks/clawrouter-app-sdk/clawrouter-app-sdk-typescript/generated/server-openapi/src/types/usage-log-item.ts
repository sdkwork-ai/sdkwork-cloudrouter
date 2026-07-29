/** Usage log item schema exposed by Claw Router. */
export interface UsageLogItem {
  /** Base input price field on usage log item. */
  baseInputPrice: string;
  /** Base output price field on usage log item. */
  baseOutputPrice: string;
  /** Cache read price field on usage log item. */
  cacheReadPrice: string;
  /** Cache read tokens field on usage log item. */
  cacheReadTokens: string;
  /** Cost field on usage log item. */
  cost: string;
  /** Error code field on usage log item. */
  errorCode: string;
  /** Error message field on usage log item. */
  errorMessage: string;
  /** Error type field on usage log item. */
  errorType: string;
  /** Gateway request id field on usage log item. */
  gatewayRequestId: string;
  /** Group field on usage log item. */
  group: string;
  /** Http status field on usage log item. */
  httpStatus: number;
  /** Id field on usage log item. */
  id: string;
  /** Input tokens field on usage log item. */
  inputTokens: string;
  /** Ip field on usage log item. */
  ip: string;
  /** Is stream field on usage log item. */
  isStream: boolean;
  /** Model field on usage log item. */
  model: string;
  /** Multiplier field on usage log item. */
  multiplier: string;
  /** Output tokens field on usage log item. */
  outputTokens: string;
  /** Path field on usage log item. */
  path: string;
  /** Provider native model field on usage log item. */
  providerNativeModel: string;
  /** Reasoning effort field on usage log item. */
  reasoningEffort: string;
  /** Region code field on usage log item. */
  regionCode: string;
  /** Requested model catalog key field on usage log item. */
  requestedModelCatalogKey: string;
  /** Status field on usage log item. */
  status: 'success' | 'error';
  /** Time field on usage log item. */
  time: string;
  /** Token name field on usage log item. */
  tokenName: string;
  /** Total time field on usage log item. */
  totalTime: string;
  /** Ttft field on usage log item. */
  ttft: string;
  /** Type field on usage log item. */
  type: string;
  /** User agent field on usage log item. */
  userAgent: string;
}
