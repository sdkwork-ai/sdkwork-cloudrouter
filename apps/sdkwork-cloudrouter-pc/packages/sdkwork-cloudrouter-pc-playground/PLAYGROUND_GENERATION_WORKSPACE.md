# Playground integration

The Playground UI shell is owned by **`@sdkwork/agents-pc-playground`** (the
`sdkwork-agents` repo) — the single, canonical Playground composition built on
the `AgentsWorkbench` system (sidebar: 聊天 / 灵感 / 生成 / 资产 / 画布 /
智能体). CloudRouter integrates it through a thin host adapter. There is no
second playground shell: the AgentsWorkbench creative (生成) tab plus the
agents chat surface are the only playground surfaces.

## Architecture

```
@sdkwork/cloudrouter-pc-playground (host adapter)
  └─ Playground.tsx → AgentsPlayground (@sdkwork/agents-pc-playground)
       └─ AgentsWorkbench (@sdkwork/agents-pc/workbench)
            ├─ chat_session  → @sdkwork/agents-pc-chat (ChatView; tool-call
            │                   cards with media placeholders/results)
            ├─ inspiration   → @sdkwork/agents-pc-inspiration
            ├─ creative      → @sdkwork/agents-pc-creative (generation page:
            │                   bottom input, creative sidebar session list,
            │                   generation history)
            └─ assets / canvas / agents views
                 ↑ runtime bindings implemented by this host adapter:
                   configureAgentsPlaygroundRuntime({ 9 SDK clients,
                   balance: createPlaygroundBalancePort(), tokenPlan,
                   onLoginRequired })
```

## Ownership rules

| Layer | Package | Repo |
| --- | --- | --- |
| Playground shell + sidebar + all surfaces | `@sdkwork/agents-pc-playground` (+ workbench) | sdkwork-agents |
| CloudRouter runtime adapter | `@sdkwork/cloudrouter-pc-playground` | sdkwork-cloudrouter |
| Theme CSS (portal chrome) | `apps/sdkwork-cloudrouter-pc/src/index.css` | sdkwork-cloudrouter |

Rules:

- Playground shell, sidebar tabs, and every playground surface live in
  `sdkwork-agents`. New playground capabilities land in the workbench system
  and surface through `@sdkwork/agents-pc-playground`.
- The host (Cloud Router) owns only the runtime binding adapter in this
  package: SDK client providers, the balance port, token plan / recharge
  services, and the portal login redirect.
- Hosts must not wrap alternative playground shells (generation-only shells,
  bespoke chat pages). If a capability is missing, extend the workbench.

## Verification

From `apps/sdkwork-cloudrouter-pc`:

```bash
pnpm --filter @sdkwork/cloudrouter-pc-playground typecheck
node playground-generation-studio-alignment.test.mjs
node --import tsx --test commons-runtime.test.ts
```

From `sdkwork-agents` (playground package + workbench system):

```bash
pnpm --filter @sdkwork/agents-pc-playground typecheck
```
