# Memory Field Mapping: `ai_memory_*` → `mem_*`

Owner after cutover: **sdkwork-memory**  
Claw Router role during migration: compat read/write adapter only  
Canonical source of truth: `sdkwork-memory/docs/schema-registry/tables/001-memory-core.yaml`

## Commercial guardrails (must preserve)

| Guardrail | Router today | Target in mem_* |
|-----------|--------------|-----------------|
| Tenant isolation | `tenant_id`, `organization_id` on all rows | Same on `mem_space`, `mem_record`, `mem_event` |
| User scoping | `user_id` on entry/event | `mem_record.user_id`, `mem_event.user_id` |
| Sensitivity / redaction | `sensitivity_level`, `trust_level`, L3 compliance | `mem_record.sensitivity_level`, `mem_event.sensitivity_level` |
| Audit trail | `ai_memory_event` before/after | `mem_event` + `mem_audit_log` |
| Billing traceability | Linked via `source_invocation_id`, conversation refs | `mem_event.trace_id`, `request_id`, `source_ref` |
| Idempotency | Implicit via `memory_code` unique | `mem_event.idempotency_key` (explicit) |

## Table mapping

| Claw Router (legacy) | sdkwork-memory (canonical) | Notes |
|----------------------|----------------------------|-------|
| `ai_memory_space` | `mem_space` | Namespace; bindings fold into owner + policy |
| `ai_memory_space_binding` | `mem_space.policy_json` + `mem_record_source` | No long-term 1:1 table |
| `ai_memory_entry` | `mem_record` | **Do not** keep entry shape as canonical |
| `ai_memory_embedding` | `mem_index` | Derived index; rebuildable |
| `ai_memory_event` | `mem_event` + optional `mem_record_source` | Event-first evidence model |
| `ai_memory_link` | `mem_record_source` + chat refs in `mem_event.payload_json` | Chat linkage via kernel refs |

## Field mapping: `ai_memory_space` → `mem_space`

| ai_memory_space | mem_space | Transform |
|-----------------|-----------|-----------|
| uuid | uuid | direct |
| tenant_id | tenant_id | direct |
| organization_id | organization_id | direct |
| user_id | — | map to `owner_subject_type=user`, `owner_subject_id=str(user_id)` when space is user-owned |
| owner_type | owner_subject_type | enum normalize: user/org/app/agent/session/external |
| owner_id | owner_subject_id | direct |
| space_type | space_type | map: personal/agent/team/app/project/session/imported |
| title | display_name | direct |
| status | lifecycle_status | active/archived/deleted |
| memory_enabled, auto_extract_enabled, auto_recall_enabled, review_required, max_injected_tokens | policy_json | merge into JSON policy blob |
| retention_policy, sensitivity_policy | policy_json | merge |
| entry_count | — | projection only; drop from SoR |
| created_at, updated_at | created_at, updated_at | direct |

## Field mapping: `ai_memory_entry` → `mem_record`

| ai_memory_entry | mem_record | Transform |
|-----------------|------------|-----------|
| uuid | uuid | direct |
| tenant_id, organization_id | tenant_id | direct |
| user_id | user_id | direct |
| space_id | space_id | FK remap after space migration |
| memory_code | metadata_json.legacy_memory_code | keep for compat lookup during transition |
| memory_type | memory_type | map to mem enum: working/session/semantic/episodic/procedural/… |
| subject_type + subject_key | subject + predicate | split or join as `subject`; predicate optional |
| content_text | object_text + canonical_text | both set from content_text initially |
| content_json | metadata_json | preserve structured payload |
| source_kind | — | emit `mem_event` with source_type |
| source_conversation_id, source_turn_id, source_item_id, source_invocation_id | mem_event.source_ref / payload_json | link via event, not inline on record |
| importance_score | importance_score | direct |
| confidence_score | confidence | direct |
| sensitivity_level | sensitivity_level | enum map: public/internal/private/sensitive/restricted |
| trust_level | metadata_json.trust_level | preserve in metadata during transition |
| valid_from, valid_until, expires_at | valid_from, valid_to, expires_at | direct |
| recall_count, last_recalled_at | metadata_json | projection stats |
| version_no, supersedes_memory_id | supersedes_memory_id | direct chain |
| status | status | map active→active, superseded→superseded, etc. |

## Field mapping: `ai_memory_embedding` → `mem_index`

| ai_memory_embedding | mem_index | Transform |
|-----------------------|-----------|-----------|
| memory_id | memory_id | FK to mem_record.id |
| embedding_provider, embedding_model, embedding_dimensions | provider/model in index metadata | direct |
| content_hash | content_hash or payload_hash | direct |
| vector_json, vector_storage_key | external vector store pointer | index is derived |
| indexed_at | created_at | direct |

## Field mapping: `ai_memory_event` → `mem_event`

| ai_memory_event | mem_event | Transform |
|-----------------|-----------|-----------|
| uuid | uuid | direct |
| tenant_id, organization_id | tenant_id | direct |
| user_id | user_id | direct |
| space_id | space_id | direct |
| memory_id | — | link via mem_record_source after record upsert |
| event_type | event_type | direct where compatible |
| actor_type, actor_id | actor_type, actor_id | direct |
| conversation_id, turn_id, invocation_id | session_id / trace_id / payload_json | kernel cross-refs in payload |
| before_json, after_json | payload_json | wrap as `{ before, after, decision_reason }` |
| decision_reason | payload_json.decision_reason | direct |
| created_at | event_time, created_at | direct |

## Execution (greenfield — no compat layer)

Claw Router **deletes** all `ai_memory_*` artifacts in the same batch it wires `@sdkwork/memory-*`. No proxy, no backfill, no readonly legacy phase.

1. Remove tables from schema registry + generated DDL
2. Remove OpenAPI paths from clawrouter app/backend APIs
3. Regenerate clawrouter SDKs
4. Frontend/services call memory SDK only
5. Delete memory-specific router tests and field contracts

Field mapping below is **semantic reference** for sdkwork-memory contract alignment only.

## SDK / API cutover

| Surface | Today | Target |
|---------|-------|--------|
| App API | Claw Router `/app/v3/api/.../memory` | sdkwork-memory app SDK |
| Backend API | Claw Router backend memory ops | sdkwork-memory backend SDK |
| Open API | `sdkwork-memory-open-api` (already referenced in commons sdk-clients) | primary |
| Frontend | playground memory panels | call memory SDK via composed client |

## Verification checklist

- [ ] Space list/create parity for tenant+user
- [ ] Record CRUD parity with sensitivity redaction
- [ ] Recall/inject path preserves token budget (`max_injected_tokens` in policy_json)
- [ ] Audit events visible in mem_audit_log
- [ ] Billing: invocation_id traceable through mem_event.trace_id
