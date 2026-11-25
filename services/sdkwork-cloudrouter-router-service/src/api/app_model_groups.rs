//! App-api console surface for user-level model → account-group defaults.
//!
//! * `GET  /app/v3/api/ai/routing/model_group_catalog`
//! * `GET  /app/v3/api/ai/routing/model_groups?model=…`
//! * `GET  /app/v3/api/ai/routing/model_group_defaults`
//! * `PUT  /app/v3/api/ai/routing/model_group_defaults`
//!
//! The reads back the task-oriented page: the left rail selects a modality, the
//! vendor list renders below it, and each model row shows the groups that can
//! serve it plus the caller's effective default. The `PUT` upserts (or clears
//! for a blank `accountGroup`) one model/vendor/modality rule.

use std::sync::Arc;

use axum::extract::rejection::JsonRejection;
use axum::extract::{Query, State};
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::{Json, Router};
use serde::{Deserialize, Serialize};

use crate::api::app_sql_subject::{map_required_app_sql_subject, RequiredAppSqlScopedSubject};
use crate::api::response::{bad_request, success_envelope};
use crate::domain::{
    session_modality_from_wire, AccountGroupRouteScope, ModelGroupCatalogModality,
    ModelGroupOption, SessionAccountGroupModality,
};
use crate::ports::{
    AppModelGroupCatalogQuery, AppModelGroupDefaultItem, AppModelGroupStore, AppModelGroupSubject,
    SetAppModelGroupDefaultCommand,
};

#[derive(Clone)]
struct AppModelGroupState {
    store: Arc<dyn AppModelGroupStore + Send + Sync>,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct ModelGroupCatalogQueryRequest {
    modality: Option<String>,
    vendor_code: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct ModelGroupsQueryRequest {
    model: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct SetModelGroupDefaultRequest {
    scope: String,
    modality: Option<String>,
    vendor_code: Option<String>,
    model: Option<String>,
    /// Ordered failover list of group ids or codes. Replaces the scope's list;
    /// an empty list clears it.
    #[serde(default)]
    account_groups: Vec<String>,
    /// Backward-compatible single-group form; merged into `account_groups`.
    #[serde(default)]
    account_group: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ModelGroupCatalogItemResponse {
    modalities: Vec<ModelGroupCatalogModality>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ModelGroupsItemResponse {
    model: String,
    groups: Vec<ModelGroupOption>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ModelGroupDefaultItemResponse {
    scope: String,
    modality: String,
    vendor_code: String,
    model: String,
    account_group_id: String,
    account_group_code: String,
    account_group_name: String,
    priority: i32,
}

impl From<AppModelGroupDefaultItem> for ModelGroupDefaultItemResponse {
    fn from(item: AppModelGroupDefaultItem) -> Self {
        Self {
            scope: item.scope.as_str().to_owned(),
            modality: item.modality,
            vendor_code: item.vendor_code,
            model: item.model,
            account_group_id: item.account_group_id.to_string(),
            account_group_code: item.account_group_code,
            account_group_name: item.account_group_name,
            priority: item.priority,
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ModelGroupDefaultsItemResponse {
    defaults: Vec<ModelGroupDefaultItemResponse>,
}

pub fn app_model_group_router(store: Arc<dyn AppModelGroupStore + Send + Sync>) -> Router {
    Router::new()
        .route(
            "/app/v3/api/ai/routing/model_group_catalog",
            get(fetch_model_group_catalog),
        )
        .route(
            "/app/v3/api/ai/routing/model_groups",
            get(fetch_model_groups),
        )
        .route(
            "/app/v3/api/ai/routing/model_group_defaults",
            get(fetch_model_group_defaults).put(set_model_group_default),
        )
        .with_state(AppModelGroupState { store })
}

pub fn empty_app_model_group_router() -> Router {
    Router::new()
}

async fn fetch_model_group_catalog(
    State(state): State<AppModelGroupState>,
    RequiredAppSqlScopedSubject(subject): RequiredAppSqlScopedSubject,
    Query(request): Query<ModelGroupCatalogQueryRequest>,
) -> Response {
    let modality = match parse_optional_modality(request.modality.as_deref()) {
        Ok(modality) => modality,
        Err(message) => return bad_request(message),
    };
    let vendor_code = request
        .vendor_code
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty());
    match state
        .store
        .load_model_group_catalog(
            to_store_subject(subject),
            AppModelGroupCatalogQuery {
                modality,
                vendor_code,
            },
        )
        .await
    {
        Ok(modalities) => Json(success_envelope(serde_json::json!({
            "item": ModelGroupCatalogItemResponse { modalities }
        })))
        .into_response(),
        Err(error) => store_error(error),
    }
}

async fn fetch_model_groups(
    State(state): State<AppModelGroupState>,
    RequiredAppSqlScopedSubject(subject): RequiredAppSqlScopedSubject,
    Query(request): Query<ModelGroupsQueryRequest>,
) -> Response {
    let Some(model) = request
        .model
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty())
    else {
        return bad_request("model is required");
    };
    match state
        .store
        .load_model_groups(to_store_subject(subject), model.clone())
        .await
    {
        Ok(Some(groups)) => Json(success_envelope(serde_json::json!({
            "item": ModelGroupsItemResponse { model, groups }
        })))
        .into_response(),
        Ok(None) => crate::api::response::not_found_problem("model not found").into_response(),
        Err(error) => store_error(error),
    }
}

async fn fetch_model_group_defaults(
    State(state): State<AppModelGroupState>,
    RequiredAppSqlScopedSubject(subject): RequiredAppSqlScopedSubject,
) -> Response {
    match state
        .store
        .list_model_group_defaults(to_store_subject(subject))
        .await
    {
        Ok(defaults) => {
            let defaults = defaults
                .into_iter()
                .map(ModelGroupDefaultItemResponse::from)
                .collect();
            Json(success_envelope(serde_json::json!({
                "item": ModelGroupDefaultsItemResponse { defaults }
            })))
            .into_response()
        }
        Err(error) => store_error(error),
    }
}

async fn set_model_group_default(
    State(state): State<AppModelGroupState>,
    RequiredAppSqlScopedSubject(subject): RequiredAppSqlScopedSubject,
    body: Result<Json<SetModelGroupDefaultRequest>, JsonRejection>,
) -> Response {
    let Json(request) = match body {
        Ok(body) => body,
        Err(rejection) => return bad_request(format!("invalid request body: {rejection}")),
    };
    let command = match build_command(request) {
        Ok(command) => command,
        Err(message) => return bad_request(message),
    };
    match state
        .store
        .set_model_group_default(to_store_subject(subject), command)
        .await
    {
        Ok(()) => Json(success_envelope(serde_json::json!({ "accepted": true }))).into_response(),
        Err(error) => store_error(error),
    }
}

fn to_store_subject(
    subject: crate::api::app_sql_subject::SqlScopedSubject,
) -> AppModelGroupSubject {
    map_required_app_sql_subject(subject, |subject| AppModelGroupSubject {
        tenant_id: subject.tenant_id,
        organization_id: subject.organization_id,
        user_id: subject.user_id,
    })
}

fn parse_optional_modality(
    value: Option<&str>,
) -> Result<Option<SessionAccountGroupModality>, String> {
    let Some(value) = value.map(str::trim).filter(|value| !value.is_empty()) else {
        return Ok(None);
    };
    session_modality_from_wire(value)
        .map(Some)
        .ok_or_else(|| format!("modality '{value}' is not supported"))
}

fn build_command(
    request: SetModelGroupDefaultRequest,
) -> Result<SetAppModelGroupDefaultCommand, String> {
    let scope = AccountGroupRouteScope::parse(&request.scope)
        .ok_or_else(|| format!("scope '{}' is not supported", request.scope))?;
    let modality = parse_optional_modality(request.modality.as_deref())?;
    let vendor_code = request.vendor_code.unwrap_or_default().trim().to_owned();
    let model = request.model.unwrap_or_default().trim().to_owned();
    let mut account_groups = request
        .account_groups
        .into_iter()
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty())
        .collect::<Vec<_>>();
    if let Some(single) = request
        .account_group
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty())
    {
        if !account_groups.iter().any(|value| value == &single) {
            account_groups.push(single);
        }
    }
    Ok(SetAppModelGroupDefaultCommand {
        scope,
        modality,
        vendor_code,
        model,
        account_groups,
    })
}

fn store_error(error: impl std::fmt::Display) -> Response {
    crate::api::response::problem_from_wire_code(
        "5000",
        format!("model group store is unavailable: {error}"),
    )
    .into_response()
}

/// Kept for route-manifest parity checks that assert the surface is documented.
pub const APP_MODEL_GROUP_ROUTES: [(&str, &str); 4] = [
    ("GET", "/app/v3/api/ai/routing/model_group_catalog"),
    ("GET", "/app/v3/api/ai/routing/model_groups"),
    ("GET", "/app/v3/api/ai/routing/model_group_defaults"),
    ("PUT", "/app/v3/api/ai/routing/model_group_defaults"),
];

#[cfg(test)]
mod tests {
    use super::{build_command, SetModelGroupDefaultRequest};
    use crate::domain::AccountGroupRouteScope;

    #[test]
    fn model_command_keeps_the_ordered_account_group_list() {
        let command = build_command(SetModelGroupDefaultRequest {
            scope: "model".to_owned(),
            modality: Some("text".to_owned()),
            vendor_code: Some("openai".to_owned()),
            model: Some("gpt-4o".to_owned()),
            account_groups: vec![" primary ".to_owned(), "backup".to_owned()],
            account_group: Some("legacy".to_owned()),
        })
        .expect("valid command");
        assert_eq!(AccountGroupRouteScope::Model, command.scope);
        assert_eq!(vec!["primary", "backup", "legacy"], command.account_groups);
    }

    #[test]
    fn empty_account_group_list_clears_the_scope() {
        let command = build_command(SetModelGroupDefaultRequest {
            scope: "vendor".to_owned(),
            modality: Some("image".to_owned()),
            vendor_code: Some("openai".to_owned()),
            model: None,
            account_groups: Vec::new(),
            account_group: None,
        })
        .expect("valid command");
        assert!(command.account_groups.is_empty());
    }

    #[test]
    fn unknown_scope_and_modality_are_rejected() {
        let scope_error = build_command(SetModelGroupDefaultRequest {
            scope: "tenant".to_owned(),
            modality: None,
            vendor_code: None,
            model: None,
            account_groups: Vec::new(),
            account_group: None,
        })
        .expect_err("unknown scope");
        assert!(scope_error.contains("scope"));

        let modality_error = build_command(SetModelGroupDefaultRequest {
            scope: "model".to_owned(),
            modality: Some("hologram".to_owned()),
            vendor_code: None,
            model: Some("m".to_owned()),
            account_groups: Vec::new(),
            account_group: None,
        })
        .expect_err("unknown modality");
        assert!(modality_error.contains("modality"));
    }
}
