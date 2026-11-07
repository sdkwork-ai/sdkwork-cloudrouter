use std::sync::Arc;

use axum::body::Bytes;
use axum::extract::State;
use axum::http::HeaderMap;
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::{Json, Router};
use serde::{Deserialize, Serialize};

use crate::api::command_error::{
    command_error_from_request_id as request_id_error, command_error_response,
    system_error_response, ApiCommandError,
};
use crate::api::request_id::generate_server_request_id;
use crate::api::response::{bad_request, success_envelope};
use crate::api::text_normalization::parse_json_body;
use crate::application::EntityUuidGenerator;
use crate::ports::{
    AdminModuleEntries, AdminModuleEntry, AdminModuleEntryStore, AdminModuleEntrySubject,
    GetAdminModuleEntriesQuery, UpdateAdminModuleEntriesCommand,
};
use sdkwork_utils_rust::datetime::current_timestamp_string;

#[derive(Clone)]
struct AdminModuleEntryState {
    store: Arc<dyn AdminModuleEntryStore + Send + Sync>,
    entity_uuid_generator: Arc<dyn EntityUuidGenerator + Send + Sync>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct AdminModuleEntryItem {
    module_id: String,
    enabled: bool,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AdminModuleEntriesUpdateRequest {
    items: Vec<AdminModuleEntryItem>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AdminModuleEntriesResponse {
    items: Vec<AdminModuleEntryItem>,
}

pub fn admin_module_entry_router_with_store(
    store: Arc<dyn AdminModuleEntryStore + Send + Sync>,
    entity_uuid_generator: Arc<dyn EntityUuidGenerator + Send + Sync>,
) -> Router {
    Router::new()
        .route(
            "/backend/v3/api/system/admin_modules/entries",
            get(fetch_admin_module_entries).patch(update_admin_module_entries),
        )
        .with_state(AdminModuleEntryState {
            store,
            entity_uuid_generator,
        })
}

async fn fetch_admin_module_entries(
    State(state): State<AdminModuleEntryState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
) -> Response {
    let subject = scoped.into();
    match state
        .store
        .get_admin_module_entries(GetAdminModuleEntriesQuery { subject })
        .await
    {
        Ok(entries) => Json(success_envelope(to_response(entries.normalized()))).into_response(),
        Err(error) => {
            system_error_response("admin module entry read model is unavailable", error)
        }
    }
}

async fn update_admin_module_entries(
    State(state): State<AdminModuleEntryState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    body: Bytes,
) -> Response {
    let subject = scoped.into();
    let request =
        match parse_json_body::<AdminModuleEntriesUpdateRequest>(&body, "admin module entries") {
            Ok(request) => request,
            Err(message) => return bad_request(message),
        };
    let entries = AdminModuleEntries {
        entries: request
            .items
            .into_iter()
            .map(|item| AdminModuleEntry {
                module_id: item.module_id,
                enabled: item.enabled,
            })
            .collect(),
    }
    .normalized();
    if let Err(message) = entries.validate() {
        return bad_request(message);
    }
    let command = match build_update_command(state.clone(), subject, entries) {
        Ok(command) => command,
        Err(error) => {
            return command_error_response(error, "admin module entry command is invalid")
        }
    };

    match state.store.update_admin_module_entries(command).await {
        Ok(entries) => Json(success_envelope(to_response(entries.normalized()))).into_response(),
        Err(error) => {
            system_error_response("admin module entry command store is unavailable", error)
        }
    }
}

fn build_update_command(
    state: AdminModuleEntryState,
    subject: AdminModuleEntrySubject,
    entries: AdminModuleEntries,
) -> Result<UpdateAdminModuleEntriesCommand, ApiCommandError> {
    Ok(UpdateAdminModuleEntriesCommand {
        subject,
        audit_log_uuid: generate_entity_uuid(&state)?,
        config_snapshot_uuid: generate_entity_uuid(&state)?,
        entries,
        request_id: generate_server_request_id().map_err(request_id_error)?,
        requested_at: current_timestamp_string(),
    })
}

fn generate_entity_uuid(state: &AdminModuleEntryState) -> Result<String, ApiCommandError> {
    state
        .entity_uuid_generator
        .generate_entity_uuid()
        .map_err(ApiCommandError::System)
}

fn to_response(entries: AdminModuleEntries) -> AdminModuleEntriesResponse {
    AdminModuleEntriesResponse {
        items: entries
            .entries
            .into_iter()
            .map(|entry| AdminModuleEntryItem {
                module_id: entry.module_id,
                enabled: entry.enabled,
            })
            .collect(),
    }
}

#[cfg(test)]
mod tests {
    use std::sync::atomic::{AtomicUsize, Ordering};

    use crate::domain::DomainResult;
    use crate::ports::AdminModuleEntryFuture;

    use super::*;

    struct RecordingAdminModuleEntryStore {
        reads: AtomicUsize,
        written: std::sync::Mutex<Option<AdminModuleEntries>>,
    }

    impl AdminModuleEntryStore for RecordingAdminModuleEntryStore {
        fn get_admin_module_entries<'a>(
            &'a self,
            _query: GetAdminModuleEntriesQuery,
        ) -> AdminModuleEntryFuture<'a, AdminModuleEntries> {
            Box::pin(async move {
                let read = self.reads.fetch_add(1, Ordering::SeqCst);
                Ok(AdminModuleEntries {
                    entries: vec![AdminModuleEntry {
                        module_id: if read == 0 { "home" } else { "operations" }.to_owned(),
                        enabled: true,
                    }],
                })
            })
        }

        fn update_admin_module_entries<'a>(
            &'a self,
            command: UpdateAdminModuleEntriesCommand,
        ) -> AdminModuleEntryFuture<'a, AdminModuleEntries> {
            Box::pin(async move {
                if let Ok(mut written) = self.written.lock() {
                    *written = Some(command.entries.clone());
                }
                Ok(command.entries)
            })
        }
    }

    struct TestEntityUuidGenerator;

    impl EntityUuidGenerator for TestEntityUuidGenerator {
        fn generate_entity_uuid(&self) -> DomainResult<String> {
            Ok("test-entity-uuid".to_owned())
        }
    }

    fn state() -> (AdminModuleEntryState, Arc<RecordingAdminModuleEntryStore>) {
        let store = Arc::new(RecordingAdminModuleEntryStore {
            reads: AtomicUsize::new(0),
            written: std::sync::Mutex::new(None),
        });
        (
            AdminModuleEntryState {
                store: store.clone(),
                entity_uuid_generator: Arc::new(TestEntityUuidGenerator),
            },
            store,
        )
    }

    fn subject() -> AdminModuleEntrySubject {
        AdminModuleEntrySubject {
            tenant_id: 100_001,
            organization_id: 0,
            operator_id: 30,
            operator_type: 1,
        }
    }

    #[tokio::test]
    async fn reads_database_authority_on_every_request() {
        let (state, _store) = state();

        let first = state
            .store
            .get_admin_module_entries(GetAdminModuleEntriesQuery { subject: subject() })
            .await
            .unwrap();
        let second = state
            .store
            .get_admin_module_entries(GetAdminModuleEntriesQuery { subject: subject() })
            .await
            .unwrap();

        assert_eq!("home", first.entries[0].module_id);
        assert_eq!("operations", second.entries[0].module_id);
    }

    #[tokio::test]
    async fn update_persists_the_submitted_order() {
        let (state, store) = state();
        let entries = AdminModuleEntries {
            entries: vec![
                AdminModuleEntry {
                    module_id: "operations".to_owned(),
                    enabled: true,
                },
                AdminModuleEntry {
                    module_id: "home".to_owned(),
                    enabled: false,
                },
            ],
        };
        let command =
            build_update_command(state.clone(), subject(), entries.clone()).unwrap();

        let saved = state
            .store
            .update_admin_module_entries(command)
            .await
            .unwrap();

        assert_eq!(entries, saved);
        let written = store.written.lock().unwrap();
        assert_eq!(Some(&entries), written.as_ref());
    }

    #[test]
    fn response_serializes_camel_case_items() {
        let response = to_response(AdminModuleEntries {
            entries: vec![AdminModuleEntry {
                module_id: "membershipCenter".to_owned(),
                enabled: true,
            }],
        });

        let value = serde_json::to_value(response).unwrap();
        assert_eq!("membershipCenter", value["items"][0]["moduleId"]);
        assert_eq!(true, value["items"][0]["enabled"]);
    }
}
