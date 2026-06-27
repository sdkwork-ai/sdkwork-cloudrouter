#![allow(dead_code)]

use axum::routing::MethodRouter;
use axum::Router;

pub(crate) fn apply_openai_passthrough_routes<S>(
    mut router: Router<S>,
    handler: MethodRouter<S>,
) -> Router<S>
where
    S: Clone + Send + Sync + 'static,
{
    for path in OPENAI_COMPATIBLE_PASSTHROUGH_PATHS {
        router = router.route(path, handler.clone());
    }
    router
}

pub(crate) fn apply_openai_method_passthrough_routes<S>(
    mut router: Router<S>,
    handler: MethodRouter<S>,
) -> Router<S>
where
    S: Clone + Send + Sync + 'static,
{
    for path in OPENAI_METHOD_PASSTHROUGH_PATHS {
        router = router.route(path, handler.clone());
    }
    router
}

pub(crate) fn apply_stored_chat_completion_passthrough_routes<S>(
    mut router: Router<S>,
    handler: MethodRouter<S>,
) -> Router<S>
where
    S: Clone + Send + Sync + 'static,
{
    for path in STORED_CHAT_COMPLETION_PASSTHROUGH_PATHS {
        router = router.route(path, handler.clone());
    }
    router
}

const OPENAI_COMPATIBLE_PASSTHROUGH_PATHS: &[&str] = &[
    "/v1/completions",
    "/v1/moderations",
    "/v1/responses/input_tokens",
    "/v1/responses/compact",
    "/v1/responses/{response_id}",
    "/v1/responses/{response_id}/cancel",
    "/v1/responses/{response_id}/input_items",
    "/v1/images/generations",
    "/v1/images/edits",
    "/v1/images/variations",
    "/v1/videos",
    "/v1/videos/characters",
    "/v1/videos/characters/{character_id}",
    "/v1/videos/edits",
    "/v1/videos/extensions",
    "/v1/videos/{video_id}",
    "/v1/videos/{video_id}/content",
    "/v1/videos/{video_id}/remix",
    "/v1/audio/speech",
    "/v1/audio/voices",
    "/v1/audio/voices/{voice_id}",
    "/v1/audio/voice_consents",
    "/v1/audio/voice_consents/{consent_id}",
    "/v1/audio/transcriptions",
    "/v1/audio/translations",
    "/v1/files",
    "/v1/files/{file_id}",
    "/v1/files/{file_id}/content",
    "/v1/vector_stores",
    "/v1/vector_stores/{vector_store_id}",
    "/v1/vector_stores/{vector_store_id}/search",
    "/v1/vector_stores/{vector_store_id}/files",
    "/v1/vector_stores/{vector_store_id}/files/{file_id}",
    "/v1/vector_stores/{vector_store_id}/file_batches",
    "/v1/vector_stores/{vector_store_id}/file_batches/{batch_id}",
    "/v1/vector_stores/{vector_store_id}/file_batches/{batch_id}/cancel",
    "/v1/vector_stores/{vector_store_id}/file_batches/{batch_id}/files",
    "/v1/assistants",
    "/v1/assistants/{assistant_id}",
    "/v1/threads",
    "/v1/threads/runs",
    "/v1/threads/{thread_id}",
    "/v1/threads/{thread_id}/messages",
    "/v1/threads/{thread_id}/messages/{message_id}",
    "/v1/threads/{thread_id}/runs",
    "/v1/threads/{thread_id}/runs/{run_id}",
    "/v1/threads/{thread_id}/runs/{run_id}/cancel",
    "/v1/threads/{thread_id}/runs/{run_id}/submit_tool_outputs",
    "/v1/threads/{thread_id}/runs/{run_id}/steps",
    "/v1/threads/{thread_id}/runs/{run_id}/steps/{step_id}",
    "/v1/batches",
    "/v1/batches/{batch_id}",
    "/v1/batches/{batch_id}/cancel",
    "/v1/fine_tuning/jobs",
    "/v1/fine_tuning/jobs/{fine_tuning_job_id}",
    "/v1/fine_tuning/jobs/{fine_tuning_job_id}/cancel",
    "/v1/fine_tuning/jobs/{fine_tuning_job_id}/pause",
    "/v1/fine_tuning/jobs/{fine_tuning_job_id}/resume",
    "/v1/fine_tuning/jobs/{fine_tuning_job_id}/events",
    "/v1/fine_tuning/jobs/{fine_tuning_job_id}/checkpoints",
    "/v1/fine_tuning/checkpoints/{fine_tuned_model_checkpoint}/permissions",
    "/v1/fine_tuning/checkpoints/{fine_tuned_model_checkpoint}/permissions/{permission_id}",
    "/v1/fine_tuning/alpha/graders/run",
    "/v1/fine_tuning/alpha/graders/validate",
    "/v1/conversations",
    "/v1/conversations/{conversation_id}",
    "/v1/conversations/{conversation_id}/items",
    "/v1/conversations/{conversation_id}/items/{item_id}",
    "/v1/containers",
    "/v1/containers/{container_id}",
    "/v1/containers/{container_id}/files",
    "/v1/containers/{container_id}/files/{file_id}",
    "/v1/containers/{container_id}/files/{file_id}/content",
    "/v1/evals",
    "/v1/evals/{eval_id}",
    "/v1/evals/{eval_id}/runs",
    "/v1/evals/{eval_id}/runs/{run_id}",
    "/v1/evals/{eval_id}/runs/{run_id}/output_items",
    "/v1/evals/{eval_id}/runs/{run_id}/output_items/{output_item_id}",
    "/v1/skills",
    "/v1/skills/{skill_id}",
    "/v1/skills/{skill_id}/content",
    "/v1/skills/{skill_id}/versions",
    "/v1/skills/{skill_id}/versions/{version}",
    "/v1/skills/{skill_id}/versions/{version}/content",
    "/v1/organization/costs",
    "/v1/organization/usage/completions",
    "/v1/organization/usage/embeddings",
    "/v1/organization/usage/moderations",
    "/v1/organization/usage/images",
    "/v1/organization/usage/audio_speeches",
    "/v1/organization/usage/audio_transcriptions",
    "/v1/organization/usage/vector_stores",
    "/v1/organization/usage/code_interpreter_sessions",
    "/v1/organization/audit_logs",
    "/v1/organization/admin_api_keys",
    "/v1/organization/admin_api_keys/{key_id}",
    "/v1/organization/invites",
    "/v1/organization/invites/{invite_id}",
    "/v1/organization/users",
    "/v1/organization/users/{user_id}",
    "/v1/organization/users/{user_id}/roles",
    "/v1/organization/users/{user_id}/roles/{role_id}",
    "/v1/organization/groups",
    "/v1/organization/groups/{group_id}",
    "/v1/organization/groups/{group_id}/users",
    "/v1/organization/groups/{group_id}/users/{user_id}",
    "/v1/organization/groups/{group_id}/roles",
    "/v1/organization/groups/{group_id}/roles/{role_id}",
    "/v1/organization/roles",
    "/v1/organization/roles/{role_id}",
    "/v1/organization/certificates",
    "/v1/organization/certificates/{certificate_id}",
    "/v1/organization/certificates/activate",
    "/v1/organization/certificates/deactivate",
    "/v1/organization/projects",
    "/v1/organization/projects/{project_id}",
    "/v1/organization/projects/{project_id}/archive",
    "/v1/organization/projects/{project_id}/users",
    "/v1/organization/projects/{project_id}/users/{user_id}",
    "/v1/organization/projects/{project_id}/service_accounts",
    "/v1/organization/projects/{project_id}/service_accounts/{service_account_id}",
    "/v1/organization/projects/{project_id}/api_keys",
    "/v1/organization/projects/{project_id}/api_keys/{key_id}",
    "/v1/organization/projects/{project_id}/rate_limits",
    "/v1/organization/projects/{project_id}/rate_limits/{rate_limit_id}",
    "/v1/organization/projects/{project_id}/groups",
    "/v1/organization/projects/{project_id}/groups/{group_id}",
    "/v1/organization/projects/{project_id}/certificates",
    "/v1/organization/projects/{project_id}/certificates/activate",
    "/v1/organization/projects/{project_id}/certificates/deactivate",
    "/v1/projects/{project_id}/roles",
    "/v1/projects/{project_id}/roles/{role_id}",
    "/v1/projects/{project_id}/users/{user_id}/roles",
    "/v1/projects/{project_id}/users/{user_id}/roles/{role_id}",
    "/v1/projects/{project_id}/groups/{group_id}/roles",
    "/v1/projects/{project_id}/groups/{group_id}/roles/{role_id}",
    "/v1/uploads",
    "/v1/uploads/{upload_id}/parts",
    "/v1/uploads/{upload_id}/complete",
    "/v1/uploads/{upload_id}/cancel",
    "/v1/realtime/client_secrets",
    "/v1/realtime/calls",
    "/v1/realtime/calls/{call_id}/accept",
    "/v1/realtime/calls/{call_id}/hangup",
    "/v1/realtime/calls/{call_id}/refer",
    "/v1/realtime/calls/{call_id}/reject",
    "/v1/realtime/sessions",
    "/v1/realtime/transcription_sessions",
    "/v1/realtime/translations",
];

pub fn openai_compatible_passthrough_paths() -> &'static [&'static str] {
    OPENAI_COMPATIBLE_PASSTHROUGH_PATHS
}

pub fn openai_method_passthrough_paths() -> &'static [&'static str] {
    OPENAI_METHOD_PASSTHROUGH_PATHS
}

pub fn stored_chat_completion_passthrough_paths() -> &'static [&'static str] {
    STORED_CHAT_COMPLETION_PASSTHROUGH_PATHS
}

const OPENAI_METHOD_PASSTHROUGH_PATHS: &[&str] = &["/v1/models/{model}"];

const STORED_CHAT_COMPLETION_PASSTHROUGH_PATHS: &[&str] = &[
    "/v1/chat/completions",
    "/v1/chat/completions/{completion_id}",
    "/v1/chat/completions/{completion_id}/messages",
];
