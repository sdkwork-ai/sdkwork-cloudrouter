import type { AdminChannelGroupRouteExplainIssue } from './admin-channel-group-route-explain-issue';

/** Admin channel group route explain response schema exposed by Claw Router. */
export interface AdminChannelGroupRouteExplainResponse {
  /** Active healthy binding count field on admin channel group route explain response. */
  activeHealthyBindingCount: number;
  /** Api scope field on admin channel group route explain response. */
  apiScope: string[];
  /** Capabilities field on admin channel group route explain response. */
  capabilities: string[];
  /** Configured resource access count field on admin channel group route explain response. */
  configuredResourceAccessCount: number;
  /** Configured resource group access count field on admin channel group route explain response. */
  configuredResourceGroupAccessCount: number;
  /** Effective resource codes field on admin channel group route explain response. */
  effectiveResourceCodes: string[];
  /** Issue codes field on admin channel group route explain response. */
  issueCodes: ('group.disabled' | 'group.account_count.empty' | 'group.resource_access.empty' | 'group.bindings.empty' | 'group.bindings.no_active_healthy_member' | 'group.bindings.no_resource_overlap' | 'group.bindings.missing_scope_metadata')[];
  /** Issues field on admin channel group route explain response. */
  issues: AdminChannelGroupRouteExplainIssue[];
  /** Ready field on admin channel group route explain response. */
  ready: boolean;
  /** Resource codes field on admin channel group route explain response. */
  resourceCodes: string[];
  /** Resource group codes field on admin channel group route explain response. */
  resourceGroupCodes: string[];
  /** Routable binding count field on admin channel group route explain response. */
  routableBindingCount: number;
  /** Explains persisted backend routing configuration, not the full runtime selector. */
  source: 'backend_config';
}
