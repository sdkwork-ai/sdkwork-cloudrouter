/**
 * Route grammar of the Agent visibility admin surface.
 *
 * The host registers the route and the Agent catalog's governance action
 * navigates to it, so both sides must agree on the path. They read it from here
 * instead of each hardcoding a string: this module is side-effect free (no
 * React, no runtime configuration), which is what lets the host mount import it
 * statically while still lazy-loading the page component.
 *
 * Shape mirrors the console Agents seam (`agentsConsoleRoute.ts`): a route
 * segment below the surface prefix, plus an optional deep-link id.
 */

/** Route segment registered below `/admin`. */
export const AGENT_VISIBILITY_ROUTE_SEGMENT = 'agent/visibility';

/** Absolute admin path of the visibility surface. */
export const AGENT_VISIBILITY_ADMIN_PATH = `/admin/${AGENT_VISIBILITY_ROUTE_SEGMENT}`;

/** Query parameter carrying the agent a deep link wants to govern. */
export const AGENT_VISIBILITY_AGENT_PARAM = 'agent';

/**
 * Builds the deep link that opens one agent's governance drawer.
 *
 * The id is percent-encoded so an agent id survives the round trip through the
 * query string.
 */
export function buildAgentVisibilityAdminPath(agentId?: string): string {
  if (!agentId) return AGENT_VISIBILITY_ADMIN_PATH;
  return `${AGENT_VISIBILITY_ADMIN_PATH}?${AGENT_VISIBILITY_AGENT_PARAM}=${encodeURIComponent(agentId)}`;
}

/**
 * Reads the agent id from a search string (`?agent=…`).
 *
 * Accepts the raw `location.search` (with or without the leading `?`), so the
 * adapter can pass it straight from the router.
 */
export function readAgentVisibilityAgentId(search: string): string | undefined {
  const query = search.startsWith('?') ? search.slice(1) : search;
  const params = new URLSearchParams(query.split('#')[0]);
  const agentId = params.get(AGENT_VISIBILITY_AGENT_PARAM) ?? '';
  return agentId.length > 0 ? agentId : undefined;
}
