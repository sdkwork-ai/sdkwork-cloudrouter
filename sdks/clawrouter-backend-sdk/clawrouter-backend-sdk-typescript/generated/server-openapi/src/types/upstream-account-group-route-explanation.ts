import type { UpstreamRouteExplainCandidate } from './upstream-route-explain-candidate';
import type { UpstreamRouteExplainIssue } from './upstream-route-explain-issue';

/** Upstream account group route explanation schema exposed by Claw Router. */
export interface UpstreamAccountGroupRouteExplanation {
  /** Account group id field on upstream account group route explanation. */
  accountGroupId: string;
  /** Api code field on upstream account group route explanation. */
  apiCode: string;
  /** Api key id field on upstream account group route explanation. */
  apiKeyId: string;
  /** Billing meter field on upstream account group route explanation. */
  billingMeter: string;
  /** Blocked reasons field on upstream account group route explanation. */
  blockedReasons: UpstreamRouteExplainIssue[];
  /** Candidate count field on upstream account group route explanation. */
  candidateCount: number;
  /** Capability field on upstream account group route explanation. */
  capability: string;
  /** Catalog key field on upstream account group route explanation. */
  catalogKey: string | null;
  /** Group code field on upstream account group route explanation. */
  groupCode: string;
  /** Id field on upstream account group route explanation. */
  id: string;
  /** Model field on upstream account group route explanation. */
  model: string | null;
  /** Policy id field on upstream account group route explanation. */
  policyId: string | null;
  /** Policy snapshot version field on upstream account group route explanation. */
  policySnapshotVersion: string;
  /** Pricing plan code field on upstream account group route explanation. */
  pricingPlanCode: string;
  /** Ready field on upstream account group route explanation. */
  ready: boolean;
  /** Resource code field on upstream account group route explanation. */
  resourceCode: string;
  /** Rule id field on upstream account group route explanation. */
  ruleId: string | null;
  /** Selected candidates field on upstream account group route explanation. */
  selectedCandidates: UpstreamRouteExplainCandidate[];
  /** Source field on upstream account group route explanation. */
  source: string;
  /** Warnings field on upstream account group route explanation. */
  warnings: UpstreamRouteExplainIssue[];
}
