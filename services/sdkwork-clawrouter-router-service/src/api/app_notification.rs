use std::sync::Arc;

use axum::extract::{Path, Query, State};
use axum::http::{HeaderMap, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::{Json, Router};
use serde::Deserialize;
use serde::Serialize;

use crate::api::app_sql_subject::{
    map_optional_app_sql_subject, map_required_app_sql_subject, RequiredAppSqlScopedSubject,
    ResolvedAppSqlScopedSubject,
};
use crate::api::response::{
    json_success_list_response, offset_page_info, parse_offset_list_query, problem_from_wire_code,
    success_envelope,
};
use crate::domain::DomainError;
use crate::ports::{
    AcknowledgeAppNotificationCommand, AppNotificationFuture, AppNotificationItem,
    AppNotificationItems, AppNotificationQuery, AppNotificationStore, AppNotificationSubject,
    MarkAppNotificationPopupSeenCommand,
};

const DEFAULT_APP_ID: &str = "default";
const MAX_APP_ID_LEN: usize = 128;
const MAX_NOTIFICATION_ID_LEN: usize = 128;

#[derive(Clone)]
struct AppNotificationState {
    store: Arc<dyn AppNotificationStore + Send + Sync>,
    require_subject: bool,
}

#[derive(Debug, Deserialize)]
struct NotificationListQuery {
    app_id: Option<String>,
    include_archived: Option<bool>,
    page: Option<i64>,
    page_size: Option<i64>,
}

#[derive(Debug, Deserialize)]
struct NotificationCommandQuery {
    app_id: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct NotificationMutationResponse {
    updated: bool,
    state: &'static str,
}

struct EmptyAppNotificationStore;

impl AppNotificationStore for EmptyAppNotificationStore {
    fn list_notifications<'a>(
        &'a self,
        _query: AppNotificationQuery,
    ) -> AppNotificationFuture<'a, AppNotificationItems> {
        Box::pin(async move {
            Ok(AppNotificationItems::new(
                Vec::new(),
                0,
                _query.page,
                _query.page_size,
            ))
        })
    }

    fn mark_popup_seen<'a>(
        &'a self,
        _command: MarkAppNotificationPopupSeenCommand,
    ) -> AppNotificationFuture<'a, ()> {
        Box::pin(async {
            Err(DomainError::new(
                "app notification store is unavailable without database configuration",
            ))
        })
    }

    fn acknowledge<'a>(
        &'a self,
        _command: AcknowledgeAppNotificationCommand,
    ) -> AppNotificationFuture<'a, ()> {
        Box::pin(async {
            Err(DomainError::new(
                "app notification store is unavailable without database configuration",
            ))
        })
    }
}

pub fn app_notification_router() -> Router {
    app_notification_router_with_state(Arc::new(EmptyAppNotificationStore), false)
}

pub fn app_notification_router_with_store(
    store: Arc<dyn AppNotificationStore + Send + Sync>,
) -> Router {
    app_notification_router_with_state(store, true)
}

fn app_notification_router_with_state(
    store: Arc<dyn AppNotificationStore + Send + Sync>,
    require_subject: bool,
) -> Router {
    Router::new()
        .route(
            "/app/v3/api/notification/notifications",
            get(list_notifications),
        )
        .route(
            "/app/v3/api/notification/notifications/{notification_id}/popup_seen",
            axum::routing::post(mark_popup_seen),
        )
        .route(
            "/app/v3/api/notification/notifications/{notification_id}/acknowledge",
            axum::routing::post(acknowledge),
        )
        .with_state(AppNotificationState {
            store,
            require_subject,
        })
}

async fn list_notifications(
    State(state): State<AppNotificationState>,
    ResolvedAppSqlScopedSubject(subject): ResolvedAppSqlScopedSubject,
    _headers: HeaderMap,
    Query(query): Query<NotificationListQuery>,
) -> Response {
    let subject = match map_optional_app_sql_subject(subject, state.require_subject, |scoped| {
        scoped.into()
    }) {
        Ok(subject) => subject,
        Err(response) => return response,
    };
    let pagination = match parse_offset_list_query(query.page, query.page_size) {
        Ok(value) => value,
        Err(message) => return bad_request(&message),
    };
    let Some(subject) = subject else {
        return json_success_list_response(
            None,
            Vec::<AppNotificationItem>::new(),
            offset_page_info(pagination.page_no, pagination.page_size, 0),
        );
    };
    let app_id = match normalized_app_id(query.app_id.as_deref()) {
        Ok(app_id) => app_id,
        Err(response) => return response,
    };
    let include_archived = query.include_archived.unwrap_or(false);

    match state
        .store
        .list_notifications(AppNotificationQuery {
            subject,
            app_id,
            include_archived,
            page: pagination.page_no,
            page_size: pagination.page_size,
        })
        .await
    {
        Ok(items) => json_success_list_response(
            None,
            items.items,
            offset_page_info(items.page_no, items.page_size, items.total),
        ),
        Err(error) => app_notification_error("app notifications are unavailable", error),
    }
}

async fn mark_popup_seen(
    State(state): State<AppNotificationState>,
    RequiredAppSqlScopedSubject(subject): RequiredAppSqlScopedSubject,
    _headers: HeaderMap,
    Path(notification_id): Path<String>,
    Query(query): Query<NotificationCommandQuery>,
) -> Response {
    let subject = map_required_app_sql_subject(subject, |scoped| AppNotificationSubject::from(scoped));
    let app_id = match normalized_app_id(query.app_id.as_deref()) {
        Ok(app_id) => app_id,
        Err(response) => return response,
    };
    let notification_id = match validate_notification_id(notification_id) {
        Ok(notification_id) => notification_id,
        Err(response) => return response,
    };

    match state
        .store
        .mark_popup_seen(MarkAppNotificationPopupSeenCommand {
            subject,
            app_id,
            notification_id,
        })
        .await
    {
        Ok(()) => mutation_success("popup_seen"),
        Err(error) if error.is_not_found() => not_found(error.to_string()),
        Err(error) => app_notification_error("app notification popup state is unavailable", error),
    }
}

async fn acknowledge(
    State(state): State<AppNotificationState>,
    RequiredAppSqlScopedSubject(subject): RequiredAppSqlScopedSubject,
    _headers: HeaderMap,
    Path(notification_id): Path<String>,
    Query(query): Query<NotificationCommandQuery>,
) -> Response {
    let subject = map_required_app_sql_subject(subject, |scoped| AppNotificationSubject::from(scoped));
    let app_id = match normalized_app_id(query.app_id.as_deref()) {
        Ok(app_id) => app_id,
        Err(response) => return response,
    };
    let notification_id = match validate_notification_id(notification_id) {
        Ok(notification_id) => notification_id,
        Err(response) => return response,
    };

    match state
        .store
        .acknowledge(AcknowledgeAppNotificationCommand {
            subject,
            app_id,
            notification_id,
        })
        .await
    {
        Ok(()) => mutation_success("acknowledged"),
        Err(error) if error.is_not_found() => not_found(error.to_string()),
        Err(error) => {
            app_notification_error("app notification acknowledgement is unavailable", error)
        }
    }
}

fn normalized_app_id(value: Option<&str>) -> Result<String, Response> {
    let app_id = value
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| DEFAULT_APP_ID.to_owned());
    if app_id.len() > MAX_APP_ID_LEN || !is_safe_identifier(&app_id) {
        return Err(bad_request("appId is invalid"));
    }
    Ok(app_id)
}

fn validate_notification_id(value: String) -> Result<String, Response> {
    let value = value.trim().to_owned();
    if value.is_empty() || value.len() > MAX_NOTIFICATION_ID_LEN || !is_safe_identifier(&value) {
        return Err(bad_request("notificationId is invalid"));
    }
    Ok(value)
}

fn is_safe_identifier(value: &str) -> bool {
    value
        .bytes()
        .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_' | b'.'))
}

fn mutation_success(state: &'static str) -> Response {
    Json(success_envelope(NotificationMutationResponse {
        updated: true,
        state,
    }))
    .into_response()
}

fn bad_request(message: &str) -> Response {
    problem_from_wire_code("4001", message).into_response()
}

fn not_found(message: String) -> Response {
    problem_from_wire_code("4040", message).into_response()
}

fn app_notification_error(context: &str, error: DomainError) -> Response {
    tracing::error!(error = %error, context, "app notification API failed");
    problem_from_wire_code("5000", context.to_owned()).into_response()
}
