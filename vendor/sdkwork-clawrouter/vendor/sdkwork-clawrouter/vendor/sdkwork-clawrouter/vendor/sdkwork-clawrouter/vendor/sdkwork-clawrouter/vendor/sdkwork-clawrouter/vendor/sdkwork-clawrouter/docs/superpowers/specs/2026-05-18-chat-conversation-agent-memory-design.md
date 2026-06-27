# Chat Conversation Agent Memory Design

## Goal

Build the standard product model for first-party Chat and Agent experiences. The model must not treat stored OpenAI-compatible completions as conversations. It must support formal chat conversations, agent sessions, long-term memory, runtime invocation traces, usage links, artifacts, retries, forks, streaming events, and future Claude Code, Gemini, Codex, OpenAI Responses, Anthropic Messages, MCP, and tool runtimes.

## Decisions

- Use `ChatConversation` for user-facing chat threads.
- Use `AgentSession` for resumable agent runtime context.
- Keep `AgentRun` as one execution inside an agent session.
- Keep `ChatTurn` as one user-intent interaction inside a chat conversation.
- Make Memory a shared AI domain, not a chat-only or agent-only table.
- Make runtime invocations a shared AI runtime domain, not chat-only records.
- Keep `ai_usage_fact` as the billing source of truth.
- Keep `ai_request_trace` as the gateway trace source of truth.
- Keep `ai_generation_*` as generation history and assets; do not overload it as chat.
- Expose product APIs under `/app/v3/api/chat/...` and `/app/v3/api/agents/...`, never under `/playground`.
- Treat Playground as `source_surface = playground`, not as an API namespace.

## Domain Model

### Chat Domain

`ai_chat_conversation` is the product-level conversation users can list, rename, archive, delete, continue, or bind to an agent session.

`ai_chat_turn` represents one user-intent interaction. A turn may contain multiple input messages, model calls, tool calls, retries, and output items.

`ai_chat_item` is the ordered conversation timeline. It can represent a message, tool call, tool result, reasoning summary, command, file edit, agent event, result, or system event.

`ai_chat_message` is the user-visible message subtype. It stores role, direction, status, preview/search text, normalized content, and raw provider shape.

`ai_chat_message_part` stores multimodal and structured parts such as text, image, file, audio, JSON, tool arguments, tool result, citation, diff, patch, command output, refusal, safety, or grounding metadata.

`ai_chat_context_snapshot` records the actual model/agent context used by one invocation: included conversation items, excluded items, recalled memories, compaction strategy, token estimates, and provider conversation/response pointers.

### Agent Domain

`ai_agent` and `ai_agent_version` remain definition-side records.

`ai_agent_session` is a resumable agent context. It supports chat/task/generation/coding/automation/workflow sessions, native provider sessions, reconstructed context, fresh-with-summary resume, fork lineage, cwd/workspace/repository state, sandbox policy, approval policy, memory space, and aggregate usage.

`ai_agent_run` remains a single execution. It must reference `agent_session_id` and may reference `chat_conversation_id` and `chat_turn_id`.

`ai_agent_run_step` remains the step-level execution log. It must reference `agent_session_id` and may reference a chat timeline item and runtime invocation.

`ai_agent_tool_binding` and `ai_agent_mcp_server` remain definition-side tool/MCP configuration.

### Memory Domain

`ai_memory_space` is the memory container for user, organization, project, conversation, agent, agent session, workspace, or other scopes.

`ai_memory_space_binding` attaches a memory space to a subject and defines read/write/extract/recall behavior.

`ai_memory_entry` is a small, explainable, governable memory fact, preference, profile, instruction, procedure, episode, summary, entity, task, or warning.

`ai_memory_embedding` stores embedding metadata and optional vector JSON or external vector storage key.

`ai_memory_event` is the audit log for memory creation, updates, recalls, injections, suppression, rejection, forgetting, expiry, import, and export.

`ai_memory_link` connects memory entries to chat turns, agent runs, runtime invocations, and explains whether a memory was source, extracted, recalled, injected, suppressed, updated, or contradicted.

### Runtime Domain

`ai_runtime_invocation` records a real LLM/tool/agent/MCP/shell/browser/file/retrieval/media invocation. Chat and Agent records reference it.

`ai_runtime_invocation_event` records SSE/JSONL/webhook/runtime events such as content deltas, tool calls, approvals, usage, results, errors, and done events.

`ai_runtime_usage_link` links usage records to chat, agent, runtime invocation, and `ai_usage_fact`. It is not the billing source of truth.

`ai_runtime_artifact` stores generated files, attachments, patches, diffs, command output, images, citations, reports, tool results, and logs.

## API Surface

### Chat

- `GET /app/v3/api/chat/conversations`
- `POST /app/v3/api/chat/conversations`
- `GET /app/v3/api/chat/conversations/{conversationId}`
- `PATCH /app/v3/api/chat/conversations/{conversationId}`
- `DELETE /app/v3/api/chat/conversations/{conversationId}`
- `GET /app/v3/api/chat/conversations/{conversationId}/items`
- `GET /app/v3/api/chat/conversations/{conversationId}/messages`
- `POST /app/v3/api/chat/conversations/{conversationId}/turns`
- `POST /app/v3/api/chat/conversations/{conversationId}/turns/{turnId}/retry`
- `POST /app/v3/api/chat/conversations/{conversationId}/turns/{turnId}/branch`
- `GET /app/v3/api/chat/conversations/{conversationId}/turns/{turnId}`
- `GET /app/v3/api/chat/conversations/{conversationId}/turns/{turnId}/invocations`
- `GET /app/v3/api/chat/conversations/{conversationId}/turns/{turnId}/events`
- `GET /app/v3/api/chat/conversations/{conversationId}/artifacts`

The first implementation slice must support:

- `GET /app/v3/api/chat/conversations`
- `POST /app/v3/api/chat/conversations`
- `GET /app/v3/api/chat/conversations/{conversationId}`
- `GET /app/v3/api/chat/conversations/{conversationId}/messages`
- `POST /app/v3/api/chat/conversations/{conversationId}/turns`

### Agents

- `GET /app/v3/api/agents/{agentId}/sessions`
- `POST /app/v3/api/agents/{agentId}/sessions`
- `GET /app/v3/api/agents/sessions/{sessionId}`
- `PATCH /app/v3/api/agents/sessions/{sessionId}`
- `DELETE /app/v3/api/agents/sessions/{sessionId}`
- `POST /app/v3/api/agents/sessions/{sessionId}/runs`
- `GET /app/v3/api/agents/sessions/{sessionId}/runs`
- `GET /app/v3/api/agents/runs/{runId}`
- `POST /app/v3/api/agents/runs/{runId}/cancel`
- `POST /app/v3/api/agents/runs/{runId}/resume`
- `POST /app/v3/api/agents/runs/{runId}/approve`
- `POST /app/v3/api/agents/runs/{runId}/reject`
- `POST /app/v3/api/agents/sessions/{sessionId}/fork`
- `GET /app/v3/api/agents/sessions/{sessionId}/steps`
- `GET /app/v3/api/agents/sessions/{sessionId}/events`
- `GET /app/v3/api/agents/sessions/{sessionId}/artifacts`
- `GET /app/v3/api/agents/sessions/{sessionId}/memories`

The first implementation slice must support:

- `GET /app/v3/api/agents/{agentId}/sessions`
- `POST /app/v3/api/agents/{agentId}/sessions`
- `GET /app/v3/api/agents/sessions/{sessionId}`

### Memory

- `GET /app/v3/api/chat/memory/settings`
- `PATCH /app/v3/api/chat/memory/settings`
- `GET /app/v3/api/chat/memory/spaces`
- `POST /app/v3/api/chat/memory/spaces`
- `GET /app/v3/api/chat/memory/spaces/{spaceId}`
- `PATCH /app/v3/api/chat/memory/spaces/{spaceId}`
- `GET /app/v3/api/chat/memory/entries`
- `POST /app/v3/api/chat/memory/entries`
- `GET /app/v3/api/chat/memory/entries/{memoryId}`
- `PATCH /app/v3/api/chat/memory/entries/{memoryId}`
- `DELETE /app/v3/api/chat/memory/entries/{memoryId}`
- `POST /app/v3/api/chat/memory/search`
- `GET /app/v3/api/chat/memory/events`
- `POST /app/v3/api/chat/memory/import`
- `GET /app/v3/api/chat/memory/export`
- `GET /app/v3/api/chat/conversations/{conversationId}/memories`
- `POST /app/v3/api/chat/conversations/{conversationId}/memories/extract`

The first implementation slice must create the schema and store boundary. Public API wiring can follow after the Chat/Agent session API.

## Runtime Flow

Chat turn:

1. Create or load `ai_chat_conversation`.
2. Create `ai_chat_turn`.
3. Write input `ai_chat_item`, `ai_chat_message`, and `ai_chat_message_part`.
4. Resolve memory spaces and write recalled/suppressed `ai_memory_link` rows.
5. Create `ai_chat_context_snapshot`.
6. Create `ai_runtime_invocation` and event rows while executing LLM/tool/agent runtime.
7. Write output items/messages/parts.
8. Link usage through `ai_runtime_usage_link` to `ai_usage_fact`.
9. Extract candidate memory entries and audit with `ai_memory_event`.

Agent session run:

1. Create or load `ai_agent_session`.
2. Create `ai_agent_run`.
3. Create `ai_agent_run_step` rows for input, memory retrieval, context build, model call, tool/MCP/skill calls, approvals, metering, and output.
4. Write runtime invocation/events/artifacts for each real execution.
5. Link recalled/extracted/injected memories with `ai_memory_link`.
6. Update session/run aggregates and status.

## Status Values

Conversation:

- `active`
- `archived`
- `deleted`

Turn:

- `queued`
- `running`
- `requires_action`
- `completed`
- `failed`
- `cancelled`

Agent session:

- `active`
- `running`
- `paused`
- `waiting_approval`
- `completed`
- `failed`
- `archived`
- `deleted`

Memory entry:

- `proposed`
- `active`
- `needs_review`
- `rejected`
- `superseded`
- `suppressed`
- `forgotten`
- `expired`

Runtime invocation:

- `queued`
- `running`
- `succeeded`
- `failed`
- `cancelled`
- `timed_out`
- `waiting_approval`

## First Implementation Slice

The first slice must deliver the durable standards without implementing every provider runtime:

1. Add schema registry entries for all standard tables.
2. Add Postgres schema DDL for all standard tables and indexes.
3. Add SQLite/test-support DDL for all standard tables and indexes.
4. Add Rust ports for ChatConversation and AgentSession command/read operations.
5. Add SQLite stores for the first API slice.
6. Add API routers for Chat conversations and Agent sessions.
7. Wire module exports.
8. Add focused tests proving:
   - Chat API is under `/app/v3/api/chat/conversations`.
   - No Chat API is introduced under `/playground`.
   - Creating a conversation writes a conversation record.
   - Posting a turn writes turn, input message, output placeholder/message contract, and runtime context linkage fields when provided.
   - Creating an agent session binds agent, optional chat conversation, and optional memory space.
   - Required subject isolation is enforced.
   - Schema contains Chat, AgentSession, Memory, and Runtime standard tables.

## Non-Goals For First Slice

- Do not implement real Claude Code, Codex, Gemini CLI runtime execution.
- Do not build the full Memory extraction model.
- Do not rewrite the frontend Chat UI in this slice.
- Do not migrate old stored completions.
- Do not make Playground a backend namespace.
