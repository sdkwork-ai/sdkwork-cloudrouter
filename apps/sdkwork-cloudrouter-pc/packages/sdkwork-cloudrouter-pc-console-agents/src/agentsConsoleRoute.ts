/**
 * Console route helpers for the Agents integration block.
 *
 * The route grammar is {@link AGENTS_CONSOLE_BASE_PATH} plus the module route
 * segment, plus an optional agent id that only the editor module consumes:
 *
 * - `/console/agents` — the default module
 * - `/console/agents/mine` — manage what the signed-in user owns
 * - `/console/agents/editor` — create an agent
 * - `/console/agents/editor/<agentId>` — edit an existing agent
 *
 * The module *catalog* (ids, route segments, titles) is owned by sdkwork-agents
 * and consumed through `@sdkwork/agents-pc-agents/console`; this file only reads
 * and writes pathnames. A module added to the owner catalog therefore becomes
 * deep-linkable here with no change, because its route segment is just another
 * segment below the prefix.
 *
 * Nothing is imported at runtime — not even the owner package — so the route
 * contract stays unit-testable without pulling the cross-repository React graph
 * into the test module.
 */

/**
 * Console route prefix owned by this integration package.
 *
 * The host registers `agents/*`, so `/console/agents/editor/<id>` deep-links
 * straight into the editor while every pixel of the Agents console is still
 * rendered by sdkwork-agents.
 */
export const AGENTS_CONSOLE_BASE_PATH = '/console/agents';

/** Strips the query and hash so a deep link carrying `?tab=` still resolves. */
function pathnameOnly(pathname: string): string {
  const [pathOnly] = pathname.split(/[?#]/u);
  return pathOnly;
}

/** Splits the path below the console prefix into its non-empty segments. */
function consoleUrlSegments(pathname: string): readonly string[] {
  const pathOnly = pathnameOnly(pathname);
  if (
    pathOnly !== AGENTS_CONSOLE_BASE_PATH
    && !pathOnly.startsWith(`${AGENTS_CONSOLE_BASE_PATH}/`)
  ) {
    return [];
  }
  return pathOnly.slice(AGENTS_CONSOLE_BASE_PATH.length).split('/').filter(Boolean);
}

/**
 * Reads the module route segment out of a console pathname
 * (`/console/agents/editor/42` -> `editor`).
 *
 * Returns `undefined` for the bare console root and for any pathname outside the
 * Agents console prefix, which makes the block fall back to its first module.
 */
export function readAgentsConsoleModuleRoute(pathname: string): string | undefined {
  const [segment] = consoleUrlSegments(pathname);
  return segment;
}

/**
 * Reads the agent id an editor deep link carries
 * (`/console/agents/editor/42` -> `42`).
 *
 * Segments are percent-decoded so an id survives the round trip through
 * {@link buildAgentsConsolePath}. `undefined` means the path carries no id,
 * which is the creation flow — create and edit share one form on purpose.
 */
export function readAgentsConsoleAgentId(pathname: string): string | undefined {
  const [, encodedAgentId] = consoleUrlSegments(pathname);
  if (!encodedAgentId) return undefined;
  try {
    return decodeURIComponent(encodedAgentId);
  } catch {
    // A malformed escape sequence is a hand-edited URL rather than an id: keep
    // the raw segment instead of throwing from inside a render.
    return encodedAgentId;
  }
}

/**
 * Builds a console path for a module route and an optional agent id.
 *
 * The inverse of {@link readAgentsConsoleModuleRoute} and
 * {@link readAgentsConsoleAgentId}, so the round trip a control flow performs —
 * read the URL, navigate, re-read the URL — stays symmetric.
 */
export function buildAgentsConsolePath(moduleRoute: string, agentId?: string): string {
  if (!moduleRoute) return AGENTS_CONSOLE_BASE_PATH;
  const encodedAgentId = agentId ? `/${encodeURIComponent(agentId)}` : '';
  return `${AGENTS_CONSOLE_BASE_PATH}/${moduleRoute}${encodedAgentId}`;
}
