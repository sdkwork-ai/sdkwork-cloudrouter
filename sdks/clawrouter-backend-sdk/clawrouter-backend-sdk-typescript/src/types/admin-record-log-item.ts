/** Admin record log item schema exposed by Claw Router. */
export interface AdminRecordLogItem {
  /** Base input price field on admin record log item. */
  baseInputPrice: string;
  /** Base output price field on admin record log item. */
  baseOutputPrice: string;
  /** Cache read price field on admin record log item. */
  cacheReadPrice: string;
  /** Cache read tokens field on admin record log item. */
  cacheReadTokens: string;
  /** Cost field on admin record log item. */
  cost: string;
  /** Error code field on admin record log item. */
  errorCode: string;
  /** Error message field on admin record log item. */
  errorMessage: string;
  /** Error type field on admin record log item. */
  errorType: string;
  /** Group field on admin record log item. */
  group: string;
  /** Http method field on admin record log item. */
  httpMethod: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD';
  /** Http status field on admin record log item. */
  httpStatus: number;
  /** Id field on admin record log item. */
  id: string;
  /** Input tokens field on admin record log item. */
  inputTokens: string;
  /** Ip field on admin record log item. */
  ip: string;
  /** Is stream field on admin record log item. */
  isStream: boolean;
  /** Model field on admin record log item. */
  model: string;
  /** Multiplier field on admin record log item. */
  multiplier: string;
  /** Output tokens field on admin record log item. */
  outputTokens: string;
  /** Path field on admin record log item. */
  path: string;
  /** Provider native model field on admin record log item. */
  providerNativeModel: string;
  /** Reasoning effort field on admin record log item. */
  reasoningEffort: string;
  /** Region code field on admin record log item. */
  regionCode: string;
  /** Requested model catalog key field on admin record log item. */
  requestedModelCatalogKey: string;
  /** Status field on admin record log item. */
  status: 'success' | 'error';
  /** Time field on admin record log item. */
  time: string;
  /** Token name field on admin record log item. */
  tokenName: string;
  /** Total time field on admin record log item. */
  totalTime: string;
  /** Ttft field on admin record log item. */
  ttft: string;
  /** Type field on admin record log item. */
  type: string;
  /** User field on admin record log item. */
  user: string;
  /** User agent field on admin record log item. */
  userAgent: string;
}
