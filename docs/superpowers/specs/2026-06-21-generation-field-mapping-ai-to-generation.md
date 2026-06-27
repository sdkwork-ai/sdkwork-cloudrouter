# Generation Field Mapping: `ai_generation_*` → `generation_*`

Owner after cutover: **sdkwork-generations**  
Claw Router role during migration: compat adapter + playground shell  
Canonical source of truth: `sdkwork-generations/storage/sqlite/generation_core.sql` + app OpenAPI

## Commercial guardrails (must preserve)

| Guardrail | Router today | Target in generation_* |
|-----------|--------------|------------------------|
| Tenant isolation | tenant_id, organization_id, user_id | Same on all generation tables |
| Usage metering | `ai_generation_job.usage_fact_id` | link via `generation_record_source_ref` → usage fact |
| Idempotency | `uk_ai_generation_job_request` on request_id | `generation_dispatch_job.idempotency_key` + record idempotency_key |
| Asset ownership | user_id on asset; visibility enum | generation_result + drive linkage |
| Share/download audit | asset_action with ip hash | generation_timeline_event |
| Retry / async | job status lifecycle | dispatch_job + inbox_event |

## Table mapping

| Claw Router (legacy) | sdkwork-generations (canonical) | Notes |
|----------------------|----------------------------------|-------|
| `ai_generation_session` | `generation_record` + `generation_record_projection` | Session UX folds into record aggregate |
| `ai_generation_job` | `generation_dispatch_job` + `generation_record` | Job orchestration separated |
| `ai_generation_asset` | `generation_result` | Output assets |
| `ai_generation_asset_action` | `generation_timeline_event` | favorite/share/download as timeline events |

## Field mapping: session + job → `generation_record`

| ai_generation_session / ai_generation_job | generation_record | Transform |
|-------------------------------------------|-------------------|-----------|
| session uuid / job uuid | id | use stable public id |
| tenant_id, organization_id, user_id | tenant_id, organization_id, user_id | direct |
| session_code | metadata in projection.title or source_ref | UX label |
| active_modality, job modality | modality | enum: image/video/music/voice |
| job_type | operation_type | map job types to operation_type |
| model, provider_id, channel_id | source_provider + parameter_snapshot | provider routing preserved in snapshot |
| prompt, negative_prompt | prompt_preview + prompt_hash | hash full prompt; preview truncated |
| input_asset_ids | input_refs_json | JSON array |
| parameter_snapshot | parameter_snapshot | direct |
| status (job) | status | queued/running/succeeded/failed/canceled |
| progress_percent, started_at, completed_at | timeline events + record.completed_at | progress via timeline |
| failure_code, failure_message_masked | error_code, error_message | direct |
| usage_fact_id | generation_record_source_ref | source_resource_type=usage_fact |
| request_id (job unique) | idempotency_key | direct |
| favorite (asset level) | favorite on projection | rollup to projection |
| selected_models, filter_config, last_prompt | generation_record_projection | UX projection fields |

## Field mapping: `ai_generation_asset` → `generation_result`

| ai_generation_asset | generation_result | Transform |
|---------------------|-------------------|-----------|
| uuid | id | direct |
| job_id | generation_id | FK |
| tenant_id | tenant_id | direct |
| asset_type | result_type | enum map |
| active_index | ordinal | direct |
| asset_media_resource_id, asset_object_blob_id | media_resource_id, asset_id | direct |
| asset_resource_snapshot | resource_snapshot | JSON |
| thumbnail_* | resource_snapshot.thumbnail | nested |
| storage_provider, object_key | drive_uri / resource_snapshot | prefer drive linkage |
| mime_type, file_size, width, height, duration_seconds | resource_snapshot | metadata |
| prompt_snapshot, model_snapshot, parameter_snapshot | resource_snapshot | preserve for billing disputes |
| visibility, favorite, shared, share_token_hash | projection + timeline events | favorite→projection; share→timeline |
| download_count, last_accessed_at | generation_timeline_event | audit events |

## Field mapping: `ai_generation_asset_action` → `generation_timeline_event`

| ai_generation_asset_action | generation_timeline_event | Transform |
|----------------------------|---------------------------|-----------|
| action_type | event_type | favorite/download/share/regenerate/… |
| action_params | payload | JSON |
| client_ip_hash, user_agent_hash | payload.audit | preserve for compliance |
| completed_at, failure_code | created_at, payload.error | direct |
| result_asset_id | payload.result_asset_id | direct |

## New tables used (no router equivalent)

| Table | Purpose |
|-------|---------|
| `generation_record_source_ref` | Link to provider jobs, usage facts, external resources |
| `generation_source_inbox_event` | Webhook/callback idempotency |
| `generation_outbox_event` | Downstream notifications |
| `generation_record_projection` | Fast playground/history list queries |

## Execution (greenfield — no compat layer)

Delete `ai_generation_*` from Claw Router and wire `@sdkwork/generations-*` in one batch. Field mapping is semantic reference only.

## Claw Router code touchpoints

| Location | Action |
|----------|--------|
| `services/sdkwork-clawrouter-router-service/.../sqlite_app_generation_history_read_store.rs` | Replace ai_* queries with generations adapter |
| `apps/.../sdkwork-clawrouter-pc-playground` | Switch to generations app SDK |
| `crates/sdkwork-routes-*-open-api` | Remove generation paths from router OpenAPI after cutover |

## Verification checklist

- [ ] Playground submit → dispatch → result parity
- [ ] History list ordering and modality filter
- [ ] usage_fact_id traceable via source_ref
- [ ] Favorite/share/download audit in timeline
- [ ] Idempotent retry on same request_id
