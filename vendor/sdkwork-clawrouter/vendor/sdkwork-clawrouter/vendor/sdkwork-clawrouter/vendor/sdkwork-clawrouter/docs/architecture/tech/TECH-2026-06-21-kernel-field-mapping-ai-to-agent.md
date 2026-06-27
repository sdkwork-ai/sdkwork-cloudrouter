> Migrated from `docs/superpowers/specs/2026-06-21-kernel-field-mapping-ai-to-agent.md` on 2026-06-24.
> Owner: SDKWork maintainers

Owner after cutover: **sdkwork-kernel**  
Claw Router role during migration: relay control plane + SDK composition only  
SDK families: `@sdkwork/agent-app-sdk`, `@sdkwork/agent-backend-sdk`, `@sdkwork/agent-sdk` (open, `/agent/v3/api`)

## Principle

Claw Router **must not** remain canonical for conversational/runtime state. All new fields for these domains land in kernel contracts first; router `ai_*` tables are compat mirrors until Phase E.

## Domain bundles

| Domain | Claw Router tables | Kernel ownership |
|--------|-------------------|------------------|
| Agent | `ai_agent`, `ai_agent_version`, `ai_agent_run`, `ai_agent_run_step`, `ai_agent_session`, `ai_agent_tool_binding`, `ai_agent_mcp_server`, `ai_agent_memory` | Agent definition + runtime execution |
| Chat | `ai_chat_conversation`, `ai_chat_turn`, `ai_chat_item`, `ai_chat_message`, `ai_chat_message_part`, `ai_chat_context_snapshot` | Conversation transcript + context |
| MCP | `ai_mcp_server`, `ai_mcp_server_revision`, `ai_mcp_tool`, `ai_mcp_binding` | MCP registry + bindings |
| Skills | contract entities only today (`admin_skill_category_item`); prompt tables overlap | Skill registry + user skill bindings |
| Prompts (admin) | `ai_prompt`, `ai_prompt_version`, `ai_prompt_binding` | Merge into kernel skills/prompts model |

## Gap analysis: kernel vs router

| Area | sdkwork-kernel today | Claw Router today | Action |
|------|---------------------|-------------------|--------|
| Agent SDK/OpenAPI | `sdkwork-agent-*` SDK, route crates, `/agent/v3/api` | Full `ai_agent*` DDL + app/backend APIs | **Merge fields** into kernel OpenAPI; router APIs become proxies |
| Chat persistence | Partial via agent runtime (no published `database/contract` in kernel root) | Full `ai_chat_*` DDL | **New** kernel canonical chat schema; map from ai_chat_* |
| MCP registry | Agent SDK surfaces | `ai_mcp_*` + admin-mcp UI | **Merge** into kernel; admin UI calls kernel backend SDK |
| Skills | Agent open SDK types | Frontend contract entities; prompts overlap | **New** canonical skill tables in kernel if missing; merge prompt fields |
| Memory in agent | Agent memory_policy JSON on version | `ai_agent_memory` junction | Delegate to sdkwork-memory bindings, not router tables |

## Commercial guardrails

| Guardrail | Implementation |
|-----------|----------------|
| Tenant/org isolation | All kernel entities carry tenant_id + organization_id |
| Governance / publish | `governance_status`, `published_at`, `published_by` on agent/version |
| Billing traceability | `ai_agent_run` → usage_fact linkage; preserve in kernel run records |
| Audit | ops_audit_log + kernel audit events on MCP/skill mutations |
| Secret handling | MCP bindings: secret_reference_only (no plaintext in router) |
| Idempotency | Run/request idempotency keys on agent runs and chat turns |

## Field mapping: agent core

| ai_agent | kernel agent (canonical) | Notes |
|----------|-------------------------|-------|
| uuid | public_id / uuid | direct |
| tenant_id, organization_id | tenant_id, organization_id | direct |
| owner_user_id | owner_user_id | direct |
| agent_code | agent_code | unique per tenant+org |
| name, description | name, description | direct |
| visibility | visibility | enum |
| default_version_id | default_version_id | FK |
| avatar_* | avatar_resource refs | media via file/drive SDK |
| template_source | template_source | direct |
| governance_status, published_* | governance + publish audit | direct |
| status | lifecycle_status | enum normalize |

| ai_agent_version | kernel agent_version | Notes |
|------------------|---------------------|-------|
| version_no | version_no | direct |
| system_prompt | system_prompt | direct |
| model_policy, tool_policy, memory_policy, mcp_policy, skill_policy, runtime_policy | policy JSON blobs | merge; memory_policy references mem_space ids |
| config_hash | config_hash | immutability |
| release_status | release_status | draft/published/deprecated |

| ai_agent_run / ai_agent_run_step | kernel run / run_step | Notes |
|----------------------------------|----------------------|-------|
| invocation_id, request_id | trace + billing keys | preserve for metering |
| usage_fact_id | billing linkage | required for commercial |
| status, error_* | run lifecycle | direct |
| step_type, tool_call_json | run_step payload | direct |

## Field mapping: chat

| ai_chat_conversation | kernel conversation | Notes |
|----------------------|---------------------|-------|
| conversation_id (public) | conversation_id | stable external id |
| agent_id, agent_version_id | agent refs | direct |
| title, status | title, lifecycle_status | direct |
| last_turn_at | updated_at | direct |

| ai_chat_turn | kernel turn | Notes |
|--------------|-------------|-------|
| turn_index | ordinal | direct |
| role, status | role, status | direct |

| ai_chat_message / ai_chat_message_part | kernel message / part | Notes |
|----------------------------------------|----------------------|-------|
| content_text, content_json | part payloads | multimodal parts |
| model, provider snapshot | metadata | billing snapshot |

| ai_chat_context_snapshot | kernel context_snapshot | Notes |
|----------------------------|------------------------|-------|
| snapshot_json | compressed context | optional optimization |

**Action:** Publish kernel `database/contract` for chat if not present; until then treat agent SDK OpenAPI schemas as interim authority.

## Field mapping: MCP

| ai_mcp_server | kernel mcp_server | Notes |
|---------------|-------------------|-------|
| server_code, display_name | code, name | direct |
| transport_type, endpoint_url | transport config | secret refs for auth |
| governance_status | governance | admin approval workflow |

| ai_mcp_server_revision | kernel mcp_server_revision | versioned config |
| ai_mcp_tool | kernel mcp_tool | tool catalog |
| ai_mcp_binding | kernel mcp_binding | tenant/agent bindings |

Admin UI `sdkwork-clawrouter-pc-admin-mcp` → switch to `@sdkwork/agent-backend-sdk` MCP admin operations.

## Field mapping: skills + prompts

| ai_prompt / ai_prompt_version / ai_prompt_binding | kernel skill / skill_version / skill_binding | Notes |
|-----------------------------------------------------|-----------------------------------------------|-------|
| prompt_code | skill_code | unify naming |
| content / template | skill_content | direct |
| category refs | skill_category_id | merge admin_skill_category_item |
| binding to agent/user | skill_binding | scope: agent, user, org |

If kernel lacks skill tables: **create** in kernel schema registry mirroring commercial fields above before router cutover.

## Frontend cutover (Kernel = Batch D)

| Claw Router surface | Target SDK |
|--------------------|------------|
| `/c/:conversationId` (playground chat) | agent app SDK chat/run APIs |
| `/admin/prompts` | agent backend SDK prompts/skills |
| `/admin/mcp` | agent backend SDK MCP admin |
| Playground agent picker | agent app SDK agents list |
| Removed `/console/agents`, `/admin/agents`, skills hub | kernel-owned apps later |

## Execution (greenfield — no compat layer)

Delete `ai_agent*`, `ai_chat*`, `ai_mcp*`, router-owned prompt/skill schema in one batch with kernel SDK wiring. Extend **sdkwork-kernel** canonical schema where chat/skills tables are missing — do not keep router copies.

## Verification checklist

- [ ] Agent CRUD + publish governance
- [ ] Chat turn streaming with run billing linkage
- [ ] MCP server revision + secret ref only
- [ ] Skill/prompt binding scoped to agent/user/org
- [ ] `/agent/v3/api` parity tests green in kernel + router proxy tests

