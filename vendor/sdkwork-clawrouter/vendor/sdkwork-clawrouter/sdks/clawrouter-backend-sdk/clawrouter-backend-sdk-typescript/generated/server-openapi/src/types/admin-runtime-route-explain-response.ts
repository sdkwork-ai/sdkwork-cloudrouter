import type { AdminRuntimeRouteExplainCandidate } from './admin-runtime-route-explain-candidate';
import type { AdminRuntimeRouteExplainIssue } from './admin-runtime-route-explain-issue';

/** Admin runtime route explain response schema exposed by Claw Router. */
export interface AdminRuntimeRouteExplainResponse {
  /** Api code field on admin runtime route explain response. */
  apiCode: string;
  /** Api key id field on admin runtime route explain response. */
  apiKeyId: string;
  /** Billing meter field on admin runtime route explain response. */
  billingMeter: string;
  /** Blocked reasons field on admin runtime route explain response. */
  blockedReasons: AdminRuntimeRouteExplainIssue[];
  /** Candidate count field on admin runtime route explain response. */
  candidateCount: number;
  /** Capability field on admin runtime route explain response. */
  capability: 'chat' | 'image' | 'audio' | 'music' | 'video' | 'embedding' | 'rerank' | 'network';
  /** Catalog key field on admin runtime route explain response. */
  catalogKey: string | null;
  /** Channel group id field on admin runtime route explain response. */
  channelGroupId: string;
  /** Group code field on admin runtime route explain response. */
  groupCode: string;
  /** Model field on admin runtime route explain response. */
  model: string | null;
  /** Policy id field on admin runtime route explain response. */
  policyId: string | null;
  /** Policy snapshot version field on admin runtime route explain response. */
  policySnapshotVersion: string;
  /** Pricing plan code field on admin runtime route explain response. */
  pricingPlanCode: string;
  /** Ready field on admin runtime route explain response. */
  ready: boolean;
  /** Resource code field on admin runtime route explain response. */
  resourceCode: string;
  /** Rule id field on admin runtime route explain response. */
  ruleId: string | null;
  /** Selected candidates field on admin runtime route explain response. */
  selectedCandidates: AdminRuntimeRouteExplainCandidate[];
  /** Explains the live runtime ProviderRouteSelector decision for one request shape. */
  source: 'runtime_selector';
  /** Warnings field on admin runtime route explain response. */
  warnings: AdminRuntimeRouteExplainIssue[];
}
