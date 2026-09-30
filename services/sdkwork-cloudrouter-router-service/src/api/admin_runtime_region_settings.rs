use std::sync::Arc;

use axum::body::Bytes;
use axum::extract::State;
use axum::http::HeaderMap;
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::{Json, Router};
use serde::{Deserialize, Serialize};

use crate::api::request_id::generate_server_request_id;
use crate::api::response::{bad_request, success_envelope};
use crate::api::text_normalization::parse_json_body;
use crate::api::command_error::{
    command_error_from_request_id as request_id_error, command_error_response,
    system_error_response, ApiCommandError,
};
use crate::application::EntityUuidGenerator;
use crate::domain::DomainError;
use crate::ports::{
    GetRuntimeRegionSettingsQuery, RuntimeRegionSettings, RuntimeRegionSettingsStore,
    RuntimeRegionSettingsSubject, UpdateRuntimeRegionSettingsCommand,
};
use sdkwork_utils_rust::datetime::current_timestamp_string;

const MAX_REGION_CODE_LEN: usize = 64;
const MAX_REGION_NAME_LEN: usize = 128;
const MAX_REMARK_LEN: usize = 512;

#[derive(Clone)]
struct AdminRuntimeRegionSettingsState {
    store: Arc<dyn RuntimeRegionSettingsStore + Send + Sync>,
    entity_uuid_generator: Arc<dyn EntityUuidGenerator + Send + Sync>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RuntimeRegionSettingsUpdateRequest {
    current_region_code: Option<String>,
    current_region_name: Option<String>,
    remark: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct RuntimeRegionSettingsResponse {
    current_region_code: String,
    current_region_name: String,
    remark: String,
}

pub fn admin_runtime_region_settings_router_with_store(
    store: Arc<dyn RuntimeRegionSettingsStore + Send + Sync>,
    entity_uuid_generator: Arc<dyn EntityUuidGenerator + Send + Sync>,
) -> Router {
    Router::new()
        .route(
            "/backend/v3/api/system/runtime_region/settings",
            get(fetch_runtime_region_settings).patch(update_runtime_region_settings),
        )
        .with_state(AdminRuntimeRegionSettingsState {
            store,
            entity_uuid_generator,
        })
}

async fn fetch_runtime_region_settings(
    State(state): State<AdminRuntimeRegionSettingsState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
) -> Response {
    let subject = scoped.into();
    match load_settings(&state, subject).await {
        Ok(settings) => Json(success_envelope(to_response(settings))).into_response(),
        Err(error) => system_error_response(
            "runtime region settings read model is unavailable",
            error,
        ),
    }
}

async fn update_runtime_region_settings(
    State(state): State<AdminRuntimeRegionSettingsState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    body: Bytes,
) -> Response {
    let subject = scoped.into();
    let request = match parse_json_body::<RuntimeRegionSettingsUpdateRequest>(
        &body,
        "runtime region settings",
    ) {
        Ok(request) => request,
        Err(message) => return bad_request(message),
    };
    let current = match load_settings(&state, subject).await {
        Ok(settings) => settings,
        Err(error) => {
            return system_error_response(
                "runtime region settings read model is unavailable",
                error,
            );
        }
    };
    let settings = match merge_update_request(current, request) {
        Ok(settings) => settings,
        Err(message) => return bad_request(message),
    };
    let command = match build_update_command(state.clone(), subject, settings) {
        Ok(command) => command,
        Err(error) => return command_error_response(error, "runtime region settings command is invalid"),
    };

    match state.store.update_runtime_region_settings(command).await {
        Ok(settings) => {
            let settings = settings.normalized();
            Json(success_envelope(to_response(settings))).into_response()
        }
        Err(error) => system_error_response(
            "runtime region settings command store is unavailable",
            error,
        ),
    }
}

async fn load_settings(
    state: &AdminRuntimeRegionSettingsState,
    subject: RuntimeRegionSettingsSubject,
) -> Result<RuntimeRegionSettings, DomainError> {
    Ok(state
        .store
        .get_runtime_region_settings(GetRuntimeRegionSettingsQuery { subject })
        .await?
        .normalized())
}

fn merge_update_request(
    mut current: RuntimeRegionSettings,
    request: RuntimeRegionSettingsUpdateRequest,
) -> Result<RuntimeRegionSettings, String> {
    if let Some(value) = request.current_region_code {
        current.current_region_code = normalize_region_code_field("currentRegionCode", &value)?;
    }
    if let Some(value) = request.current_region_name {
        current.current_region_name =
            normalize_optional_field("currentRegionName", Some(&value), MAX_REGION_NAME_LEN)?;
    }
    if let Some(value) = request.remark {
        current.remark = normalize_optional_field("remark", Some(&value), MAX_REMARK_LEN)?;
    }
    Ok(current.normalized())
}

fn normalize_region_code_field(field_name: &str, value: &str) -> Result<String, String> {
    let value = normalize_optional_field(field_name, Some(value), MAX_REGION_CODE_LEN)?;
    if !is_valid_region_code(&value) {
        return Err(format!(
            "{field_name} must match ^[a-z][a-z0-9_]*$ (REGION_SPEC)"
        ));
    }
    Ok(value)
}

/// REGION_SPEC §4.1 regionCode format: lowercase ASCII, alphabetic first
/// character, then [a-z0-9_]*, at most 64 characters.
fn is_valid_region_code(code: &str) -> bool {
    let mut chars = code.chars();
    match chars.next() {
        Some(first) if first.is_ascii_alphabetic() && first.is_ascii_lowercase() => {}
        _ => return false,
    }
    chars.all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '_')
}

fn normalize_optional_field(
    field_name: &str,
    value: Option<&str>,
    max_len: usize,
) -> Result<String, String> {
    let value = value.unwrap_or_default().trim();
    if value.chars().count() > max_len {
        return Err(format!(
            "{field_name} length must not exceed {max_len} characters"
        ));
    }
    if value.chars().any(|ch| ch.is_ascii_control()) {
        return Err(format!("{field_name} must not contain control characters"));
    }
    Ok(value.to_owned())
}

fn build_update_command(
    state: AdminRuntimeRegionSettingsState,
    subject: RuntimeRegionSettingsSubject,
    settings: RuntimeRegionSettings,
) -> Result<UpdateRuntimeRegionSettingsCommand, ApiCommandError> {
    Ok(UpdateRuntimeRegionSettingsCommand {
        subject,
        audit_log_uuid: generate_entity_uuid(&state)?,
        config_snapshot_uuid: generate_entity_uuid(&state)?,
        settings,
        request_id: generate_server_request_id().map_err(request_id_error)?,
        requested_at: current_timestamp_string(),
    })
}

fn generate_entity_uuid(
    state: &AdminRuntimeRegionSettingsState,
) -> Result<String, ApiCommandError> {
    state
        .entity_uuid_generator
        .generate_entity_uuid()
        .map_err(ApiCommandError::System)
}

fn to_response(settings: RuntimeRegionSettings) -> RuntimeRegionSettingsResponse {
    RuntimeRegionSettingsResponse {
        current_region_code: settings.current_region_code,
        current_region_name: settings.current_region_name,
        remark: settings.remark,
    }
}

#[cfg(test)]
mod tests {
    use std::sync::atomic::{AtomicUsize, Ordering};

    use crate::domain::DomainResult;
    use crate::ports::{GetRuntimeRegionSettingsScopeQuery, RuntimeRegionSettingsFuture};

    use super::*;

    struct ChangingRuntimeRegionSettingsStore {
        reads: AtomicUsize,
    }

    impl RuntimeRegionSettingsStore for ChangingRuntimeRegionSettingsStore {
        fn get_runtime_region_settings<'a>(
            &'a self,
            _query: GetRuntimeRegionSettingsQuery,
        ) -> RuntimeRegionSettingsFuture<'a, RuntimeRegionSettings> {
            Box::pin(async move {
                let read = self.reads.fetch_add(1, Ordering::SeqCst);
                Ok(RuntimeRegionSettings {
                    current_region_code: if read == 0 { "cn" } else { "global" }.to_owned(),
                    current_region_name: String::new(),
                    remark: String::new(),
                })
            })
        }

        fn get_runtime_region_settings_for_scope<'a>(
            &'a self,
            _query: GetRuntimeRegionSettingsScopeQuery,
        ) -> RuntimeRegionSettingsFuture<'a, RuntimeRegionSettings> {
            Box::pin(async { Ok(RuntimeRegionSettings::default()) })
        }

        fn update_runtime_region_settings<'a>(
            &'a self,
            command: UpdateRuntimeRegionSettingsCommand,
        ) -> RuntimeRegionSettingsFuture<'a, RuntimeRegionSettings> {
            Box::pin(async move { Ok(command.settings) })
        }
    }

    struct TestEntityUuidGenerator;

    impl EntityUuidGenerator for TestEntityUuidGenerator {
        fn generate_entity_uuid(&self) -> DomainResult<String> {
            Ok("test-entity-uuid".to_owned())
        }
    }

    #[tokio::test]
    async fn runtime_region_reads_database_authority_on_every_request() {
        let store = Arc::new(ChangingRuntimeRegionSettingsStore {
            reads: AtomicUsize::new(0),
        });
        let state = AdminRuntimeRegionSettingsState {
            store: store.clone(),
            entity_uuid_generator: Arc::new(TestEntityUuidGenerator),
        };
        let subject = RuntimeRegionSettingsSubject {
            tenant_id: 100_001,
            organization_id: 0,
            operator_id: 30,
            operator_type: 1,
        };

        let first = load_settings(&state, subject).await.unwrap();
        let second = load_settings(&state, subject).await.unwrap();

        assert_eq!(first.current_region_code, "cn");
        assert_eq!(second.current_region_code, "global");
        assert_eq!(store.reads.load(Ordering::SeqCst), 2);
    }
}
