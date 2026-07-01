> Migrated from `docs/superpowers/plans/2026-05-18-chat-conversation-agent-memory.md` on 2026-06-24.
> Owner: SDKWork maintainers

# Chat Conversation Agent Memory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the first backend slice of the standard ChatConversation, AgentSession, Memory, and Runtime model.

**Architecture:** Add formal schema and typed backend ports for Chat and Agent sessions, with Memory and Runtime as shared domains. Deliver product APIs under `/app/v3/api/chat/...` and `/app/v3/api/agents/...`; keep Playground only as a `sourceSurface`.

**Tech Stack:** Rust, Axum, SQLx, SQLite/Postgres DDL, project schema registry YAML, `SdkWorkApiResponse` / `ProblemDetail` envelope (`API_SPEC.md` §15).

---

### Task 1: Schema Contract Tests

**Files:**
- Create: `services/sdkwork-clawrouter-router-service/tests/chat_agent_schema_contract.rs`
- Modify later: `generated/schema/postgres/schema.sql`
- Modify later: `docs/schema-registry/sdkwork-clawrouter.tables.yaml`
- Modify later: `crates/sdkwork-claw-test-support/src/lib.rs`

- [ ] Write failing tests that assert Postgres schema contains `ai_chat_conversation`, `ai_chat_turn`, `ai_chat_item`, `ai_chat_message`, `ai_chat_message_part`, `ai_chat_context_snapshot`, `ai_agent_session`, `ai_memory_space`, `ai_memory_space_binding`, `ai_memory_entry`, `ai_memory_embedding`, `ai_memory_event`, `ai_memory_link`, `ai_runtime_invocation`, `ai_runtime_invocation_event`, `ai_runtime_usage_link`, and `ai_runtime_artifact`.
- [ ] Assert schema registry contains the same table names.
- [ ] Assert no app API path containing `/app/v3/api/playground` is introduced.
- [ ] Run `cargo test -p sdkwork-clawrouter-router-service chat_agent_schema_contract -- --nocapture` and confirm failure from missing schema entries.

### Task 2: Chat API Tests

**Files:**
- Create: `services/sdkwork-clawrouter-router-service/tests/app_chat_api.rs`
- Modify later: `services/sdkwork-clawrouter-router-service/src/api/app_chat.rs`
- Modify later: `services/sdkwork-clawrouter-router-service/src/ports/app_chat_store.rs`

- [ ] Write a failing test for `POST /app/v3/api/chat/conversations` creating a conversation through a fake store.
- [ ] Write a failing test for `GET /app/v3/api/chat/conversations` returning only the trusted subject's conversations.
- [ ] Write a failing test for `POST /app/v3/api/chat/conversations/{conversationId}/turns` passing a user message, optional `mode=agent`, optional `agentId`, optional `agentSessionId`, and selected model into the store.
- [ ] Write a failing test proving `/app/v3/api/playground/chat/conversations` returns 404.
- [ ] Run `cargo test -p sdkwork-clawrouter-router-service app_chat_api -- --nocapture` and confirm the tests fail because the API does not exist.

### Task 3: Agent Session API Tests

**Files:**
- Create: `services/sdkwork-clawrouter-router-service/tests/app_agent_session_api.rs`
- Modify later: `services/sdkwork-clawrouter-router-service/src/api/app_agent_sessions.rs`
- Modify later: `services/sdkwork-clawrouter-router-service/src/ports/app_agent_session_store.rs`

- [ ] Write a failing test for `POST /app/v3/api/agents/{agentId}/sessions` creating an agent session.
- [ ] Write a failing test for `GET /app/v3/api/agents/{agentId}/sessions` listing sessions.
- [ ] Write a failing test for `GET /app/v3/api/agents/sessions/{sessionId}` retrieving a session.
- [ ] Assert the create command carries optional `chatConversationId`, optional `memorySpaceId`, `sessionKind`, `sourceSurface`, runtime, cwd, sandbox policy, approval policy, and model.
- [ ] Run `cargo test -p sdkwork-clawrouter-router-service app_agent_session_api -- --nocapture` and confirm failure because the API does not exist.

### Task 4: Ports And API Implementation

**Files:**
- Create: `services/sdkwork-clawrouter-router-service/src/ports/app_chat_store.rs`
- Create: `services/sdkwork-clawrouter-router-service/src/ports/app_agent_session_store.rs`
- Create: `services/sdkwork-clawrouter-router-service/src/api/app_chat.rs`
- Create: `services/sdkwork-clawrouter-router-service/src/api/app_agent_sessions.rs`
- Modify: `services/sdkwork-clawrouter-router-service/src/ports/mod.rs`
- Modify: `services/sdkwork-clawrouter-router-service/src/api/mod.rs`

- [ ] Define `AppChatSubject`, `AppChatConversationItem`, `CreateAppChatConversationCommand`, `CreateAppChatTurnCommand`, `AppChatTurnOutcome`, and `AppChatStore`.
- [ ] Define `AppAgentSessionSubject`, `AppAgentSessionItem`, `CreateAppAgentSessionCommand`, `AppAgentSessionStore`, and query types.
- [ ] Implement validation for required trusted subjects, bounded text fields, visible request ids, and safe path ids.
- [ ] Implement Chat API router and Agent Session API router with empty stores.
- [ ] Export ports and API constructors.
- [ ] Run the two API test files and confirm they pass with fake stores.

### Task 5: SQLite Store Implementation

**Files:**
- Create: `services/sdkwork-clawrouter-router-service/src/infrastructure/sql/sqlite/app_chat_store.rs`
- Create: `services/sdkwork-clawrouter-router-service/src/infrastructure/sql/sqlite/app_agent_session_store.rs`
- Modify: `services/sdkwork-clawrouter-router-service/src/infrastructure/sql/sqlite/mod.rs`
- Create: `services/sdkwork-clawrouter-router-service/tests/sqlite_app_chat_store.rs`
- Create: `services/sdkwork-clawrouter-router-service/tests/sqlite_app_agent_session_store.rs`

- [ ] Write failing SQLite tests against in-memory tables.
- [ ] Implement insert/list/get for chat conversations.
- [ ] Implement create turn with input/output message rows and timeline item rows.
- [ ] Implement insert/list/get for agent sessions.
- [ ] Run SQLite store tests and confirm pass.

### Task 6: Schema Registry And Generated Schema

**Files:**
- Modify: `docs/schema-registry/sdkwork-clawrouter.tables.yaml`
- Modify: `docs/schema-registry/frontend-field-contracts.yaml`
- Modify: `generated/schema/postgres/schema.sql`
- Modify: `crates/sdkwork-claw-test-support/src/lib.rs`

- [ ] Add table registry entries for Chat, AgentSession, Memory, and Runtime tables.
- [ ] Add product API contracts for Chat conversations and Agent sessions.
- [ ] Add Postgres DDL and indexes.
- [ ] Add SQLite/test-support DDL and indexes.
- [ ] Re-run schema contract tests and confirm pass.

### Task 7: Verification

**Files:**
- All files touched above.

- [ ] Run `cargo test -p sdkwork-clawrouter-router-service app_chat_api -- --nocapture`.
- [ ] Run `cargo test -p sdkwork-clawrouter-router-service app_agent_session_api -- --nocapture`.
- [ ] Run `cargo test -p sdkwork-clawrouter-router-service chat_agent_schema_contract -- --nocapture`.
- [ ] Run SQLite store tests.
- [ ] Run `cargo fmt`.
- [ ] Run focused `cargo test -p sdkwork-clawrouter-router-service app_chat app_agent_session chat_agent_schema sqlite_app_chat sqlite_app_agent_session -- --nocapture` if filter supports it; otherwise run each focused test explicitly.

