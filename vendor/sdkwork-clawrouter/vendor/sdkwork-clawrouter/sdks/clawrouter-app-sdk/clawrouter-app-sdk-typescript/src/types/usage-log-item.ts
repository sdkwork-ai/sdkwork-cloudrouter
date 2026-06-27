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
  /** Customer-facing spend amount for the request, normalized to 9 decimal places for console display. Uses customer_charge_amount from the usage ledger and never exposes upstream cost fields. */
  cost: string;
  /** Error code field on usage log item. */
  errorCode: string;
  /** Error message field on usage log item. */
  errorMessage: string;
  /** Error type field on usage log item. */
  errorType: string;
  /** Maintained channel group display name. Falls back to the recorded group snapshot when the group has been removed or renamed outside the read model. */
  group: string;
  /** Http status field on usage log item. */
  httpStatus: string;
  /** Id field on usage log item. */
  id: string;
  /** Input tokens field on usage log item. */
  inputTokens: string;
  /** Ip field on usage log item. */
  ip: string;
  /** Is stream field on usage log item. */
  isStream: boolean;
  /** Provider native model id used in the upstream provider request, kept as the visible model value for usage tables. */
  model: string;
  /** Multiplier field on usage log item. */
  multiplier: string;
  /** Output tokens field on usage log item. */
  outputTokens: string;
  /** Path field on usage log item. */
  path: string;
  /** Provider native model id, for example gpt-5.5. */
  providerNativeModel: string;
  /** Reasoning effort field on usage log item. */
  reasoningEffort: string;
  /** Deployment region used by the selected endpoint and pricing resolver. This is not part of the model catalog identity. */
  regionCode: string;
  /** Request id field on usage log item. */
  requestId: string;
  /** Routed base catalog model identity in vendor/model form, for example openai/gpt-5.5. Region-specific pricing or ranking keys are stored separately from the routed model identity. */
  requestedModelCatalogKey: string;
  /** Status field on usage log item. */
  status: string;
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
  /** Full HTTP User-Agent header captured from the gateway request. Empty when the client omitted the header. */
  userAgent: string;
}
