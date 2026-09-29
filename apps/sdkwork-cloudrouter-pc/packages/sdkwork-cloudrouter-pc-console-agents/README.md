# sdkwork-cloudrouter-pc-console-agents

Domain: intelligence
Capability: agents
Package type: node-package
Status: ready

This README is the SDKWork module entrypoint for `sdkwork-cloudrouter-pc-console-agents`. The machine-readable component contract is `specs/component.spec.json`; canonical standards are under `../../../../../sdkwork-specs/`.

This package is the Cloud Router **integration seam** for the Agents capability in the user console. It renders no Agents UI of its own: the agent catalog, the manager page, the creation/edit flow, the module switcher and their styles are owned by `sdkwork-agents` and consumed here as the `@sdkwork/agents-pc-agents/console` embed block.

## Public API

- `.` — `AgentsView` (the console-shell route) and `AgentsEditorPage` (the full-bleed create/edit flow route), plus the host-side routing helpers (`AGENTS_CONSOLE_BASE_PATH`, `readAgentsConsoleModuleRoute`, `readAgentsConsoleAgentId`, `buildAgentsConsolePath`).

## Required SDK Surface

- Consumes the `@sdkwork/agents-app-sdk` client through the `@sdkwork/cloudroutes-pc-commons/runtime` factory (`getSdkworkAgentAppSdkClient`), together with the assets, drive and skills app clients the block's catalog and editor bind. This package never constructs a client, never imports a generated SDK directly, and never touches credentials or `Authorization` headers.
- The console is scoped to the signed-in user: the manager module renders the owner block's `mine` scope, and the agents app-api remains the authority on what each caller may see and change. Frontend scope is a request parameter, not an access-control decision.

## Configuration

Configuration keys, runtime entrypoints, and integration contracts are declared in `specs/component.spec.json`. Shared modules must receive configuration through typed bootstrap or service boundaries rather than reading host-local environment state directly.

`src/agentsConsoleRoute.ts` holds the one host-owned value:

- `AGENTS_CONSOLE_BASE_PATH` (`/console/agents`) is the console route prefix. The host registers `agents/*`, so `/console/agents/editor/<agentId>` deep-links straight into the editor while the block stays router-agnostic (selection is passed in as `moduleId`/`agentId`, moves come back through `onNavigate`).

The module *catalog* — ids, route segments, titles — stays owned by `sdkwork-agents`. Adding an Agents console module therefore requires no change in this repository: its route segment is just another segment below the prefix, and its copy ships with the owner's `common` namespace catalog the portal already registers.

Create and edit do not render inside the console shell. `AgentsEditorPage` is mounted at `<base>/editor[/<agentId>]`, declared in `src/App.tsx` as a **sibling** of the `/console` branch rather than a child of it, so the page is the form and nothing else: no site navbar, no console sidebar, no content gutters, and the form's own header (back / save draft / publish) is the only chrome.

That shape rests on route *ranking*, not declaration order: the console branch reaches the list through `agents/*`, which also matches the editor path, and the more specific static path wins. `src/agentsConsoleIntegration.test.ts` pins both halves — the declaration and the resolution — so the shell cannot quietly swallow the flow.

## Integration Contract

The host side of the seam is intentionally tiny: `AgentsView` calls `configureAgentsConsoleRuntime` once with the host's SDK client factories, maps the console URL onto `moduleId`/`agentId`, and renders `AgentsConsoleEmbed`. Everything the user sees comes from `@sdkwork/agents-pc-agents/console`:

- `AgentsConsoleEmbed` takes a `hiddenCapabilities` list so a host can declare which editor panels its deployment cannot serve. This portal assembles agents/assets/skills/memory app-api surfaces but not knowledgebase or voice, so those two panels are hidden rather than rendered as catalogs that can only fail.
- The creation flow is the owner's `CreateAgentView`: basic info, model and policy, memory and context, voice, knowledge base, plugins, skills, and advanced settings. The same module renders an existing agent when the URL carries an id, so create and edit can never drift into two forms.
- Create/edit is a *flow* route, not a section. It is mounted outside the console shell (`AgentsEditorPage`), and the owner's embed renders no module switcher while an `editsAgent` module is active — so "create" is an action taken from the agent list, never a peer tab of it.

## SaaS/Private/Local Behavior

This component follows the deployment and runtime rules referenced by its `canonicalSpecs` entries. SaaS, private, and local behavior must stay compatible with the relevant SDKWork specs before implementation changes are made.

Standalone deployments resolve `SDKWORK_DEPLOYMENT_PROFILE` through the shared runtime; this package reads no ports, hosts, or bind addresses and infers no runtime mode of its own.

## Security

Do not add secrets, live tokens, manual auth headers, or app-local credential handling to this module. Protected API and SDK access must use the generated SDK or approved service boundary declared in the component contract.

## Extension Points

Extension points are limited to public exports, runtime entrypoints, SDK clients, events, and config keys declared in `specs/component.spec.json`. Extending the Agents console UI happens in `sdkwork-agents`; extending the page layout or navigation happens in the console shell, not here.

## Verification

- `pnpm --filter @sdkwork/cloudrouter-pc-console-agents typecheck`
- `pnpm --filter @sdkwork/cloudrouter-pc-console-agents test`
- `pnpm check:dependencies` from `apps/sdkwork-cloudrouter-pc` (portal dependency boundary)

## Owner And Status

Owner and lifecycle status are tracked in `specs/component.spec.json`. Update that contract before changing public integration behavior.
