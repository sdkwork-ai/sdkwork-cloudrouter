import { defineConfig } from 'vitest/config';

/**
 * Package-local test configuration.
 *
 * Scope is deliberately narrow: this package's suite is a set of *contract*
 * oracles — pure route-helper behaviour, the portal wiring this adapter owns, and
 * cross-repository facts read off the linked `sdkwork-agents` checkout. Nothing
 * under test renders React, so the config needs neither `jsdom` nor the React
 * resolution scaffolding the sibling `sdkwork-cloudrouter-pc-console-memory`
 * package documents (dual-instance `resolve.dedupe`, `mainFields`, and
 * `server.deps.inline` exist there because that suite mounts a cross-repository
 * component tree).
 *
 * A render test is not merely omitted for convenience, it is the wrong shape
 * here: `AgentsConsoleEmbed` takes no client or registry seam, so mounting it
 * would immediately drive the real `@sdkwork/agents-pc-agents` services and force
 * this host package to encode a stub of an SDK surface sdkwork-agents owns. The
 * mount is verified in a real browser instead (see README "Verification"), and
 * the import/prop contract is pinned at type-check time by the owner's `./console`
 * subpath export.
 *
 * If a render test is ever added, copy the sibling package's resolution block
 * verbatim rather than inventing a new one — the failure mode it prevents
 * (`Cannot read properties of null (reading 'useMemo')`) is not obvious from the
 * stack trace.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
