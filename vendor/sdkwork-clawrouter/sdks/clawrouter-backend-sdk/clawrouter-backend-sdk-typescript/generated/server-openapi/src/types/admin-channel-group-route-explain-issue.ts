/** Admin channel group route explain issue schema exposed by Claw Router. */
export interface AdminChannelGroupRouteExplainIssue {
  /** Code field on admin channel group route explain issue. */
  code: 'group.disabled' | 'group.account_count.empty' | 'group.resource_access.empty' | 'group.bindings.empty' | 'group.bindings.no_active_healthy_member' | 'group.bindings.no_resource_overlap' | 'group.bindings.missing_scope_metadata';
  /** Details field on admin channel group route explain issue. */
  details: string[];
  /** Severity field on admin channel group route explain issue. */
  severity: 'blocking' | 'warning' | 'info';
}
