//! Admin data-center surface (`/backend/v3/api/datacenter/*`).
//!
//! The admin "数据中心" (Data Center) module owns a governance plane: data
//! sources with write-only credentials, the landed-table and dataset catalogs,
//! governed export jobs, and the access audit trail. This module is the HTTP
//! boundary; every read is scoped by [`RequiredAdminSqlScopedSubject`] and the
//! store injects the workspace predicate server-side.
//!
//! Wire contract (`API_SPEC.md` §14/§15):
//! - lists answer `data.items` + `data.pageInfo`;
//! - every `int64` field crosses the wire as a decimal string;
//! - failures use `application/problem+json` through the shared response mapper.

use std::sync::Arc;

use axum::extract::rejection::QueryRejection;
use axum::extract::{Extension, Query, State};
use axum::response::Response;
use axum::routing::get;
use axum::Router;
use serde::{Deserialize, Serialize};
use sdkwork_web_core::WebRequestContext;

use crate::api::admin_sql_subject::{RequiredAdminSqlScopedSubject, SqlScopedAdminSubject};
use crate::api::command_error::system_error_response;
use crate::api::response::{
    bad_request, json_success_list_response, json_success_response, normalize_list_search_query,
    offset_page_info, parse_offset_list_query,
};
use crate::ports::{
    DataCenterAuditAction, DataCenterAuditEntry, DataCenterAuditItem, DataCenterExportItem,
    DataCenterOverview, DataCenterSourceItem, DataCenterStore, DataCenterSubject,
    DataCenterTableItem,
};

/// Upper bound for one page of the governance lists.
const MAX_LIST_PAGE_SIZE: i64 = 200;

#[derive(Clone)]
struct DataCenterState {
    store: Arc<dyn DataCenterStore + Send + Sync>,
}

#[derive(Debug, Default, Deserialize)]
#[serde(deny_unknown_fields)]
struct DataCenterListQuery {
    page: Option<i64>,
    page_size: Option<i64>,
    q: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct DataCenterOverviewResponse {
    /// Exact decimal strings (`API_SPEC.md` §13.6): int64 counters must never be
    /// rendered as JSON numbers the browser would round.
    sources: String,
    tables: String,
    today_instances: String,
    pending_exports: String,
    success_rate: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct DataCenterSourceResponse {
    id: String,
    name: String,
    kind: String,
    health: String,
    table_count: i64,
    last_tested_at: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct DataCenterTableResponse {
    id: String,
    name: String,
    kind: String,
    row_count: String,
    column_count: i32,
    owner: String,
    updated_at: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct DataCenterExportResponse {
    id: String,
    dataset_name: String,
    status: String,
    row_count: String,
    requested_by: String,
    expires_at: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct DataCenterAuditResponse {
    id: String,
    actor: String,
    action: String,
    object: String,
    row_count: String,
    result: String,
    at: String,
}

/// Mounts the data-center surface.
pub fn admin_data_center_router_with_store(
    store: Arc<dyn DataCenterStore + Send + Sync>,
) -> Router {
    Router::new()
        .route("/backend/v3/api/datacenter/overview", get(fetch_overview))
        .route(
            "/backend/v3/api/datacenter/data_sources",
            get(fetch_sources),
        )
        .route("/backend/v3/api/datacenter/tables", get(fetch_tables))
        .route("/backend/v3/api/datacenter/exports", get(fetch_exports))
        .route("/backend/v3/api/datacenter/audits", get(fetch_audits))
        .with_state(DataCenterState { store })
}

async fn fetch_overview(
    State(state): State<DataCenterState>,
    RequiredAdminSqlScopedSubject(scoped): RequiredAdminSqlScopedSubject,
    request_context: Option<Extension<WebRequestContext>>,
) -> Response {
    let subject = data_center_subject(scoped, request_context.as_ref());
    match state.store.load_overview(subject).await {
        Ok(overview) => json_success_response(None, DataCenterOverviewResponse::from(overview)),
        Err(error) => system_error_response("data center overview is unavailable", error),
    }
}

async fn fetch_sources(
    State(state): State<DataCenterState>,
    RequiredAdminSqlScopedSubject(scoped): RequiredAdminSqlScopedSubject,
    request_context: Option<Extension<WebRequestContext>>,
    query: Result<Query<DataCenterListQuery>, QueryRejection>,
) -> Response {
    let Ok(Query(request)) = query else {
        return bad_request("query parameters are invalid");
    };
    let window = match list_window(request) {
        Ok(window) => window,
        Err(message) => return bad_request(message),
    };
    let subject = data_center_subject(scoped, request_context.as_ref());
    match state.store.list_sources(subject).await {
        Ok(items) => data_center_list_response(
            items
                .into_iter()
                .filter(|item| matches_source(item, window.search.as_deref()))
                .map(DataCenterSourceResponse::from)
                .collect(),
            window.page_no,
            window.page_size,
        ),
        Err(error) => system_error_response("data center sources are unavailable", error),
    }
}

async fn fetch_tables(
    State(state): State<DataCenterState>,
    RequiredAdminSqlScopedSubject(scoped): RequiredAdminSqlScopedSubject,
    request_context: Option<Extension<WebRequestContext>>,
    query: Result<Query<DataCenterListQuery>, QueryRejection>,
) -> Response {
    let Ok(Query(request)) = query else {
        return bad_request("query parameters are invalid");
    };
    let window = match list_window(request) {
        Ok(window) => window,
        Err(message) => return bad_request(message),
    };
    let subject = data_center_subject(scoped, request_context.as_ref());
    match state.store.list_tables(subject).await {
        Ok(items) => data_center_list_response(
            items
                .into_iter()
                .filter(|item| matches_table(item, window.search.as_deref()))
                .map(DataCenterTableResponse::from)
                .collect(),
            window.page_no,
            window.page_size,
        ),
        Err(error) => system_error_response("data center tables are unavailable", error),
    }
}

async fn fetch_exports(
    State(state): State<DataCenterState>,
    RequiredAdminSqlScopedSubject(scoped): RequiredAdminSqlScopedSubject,
    request_context: Option<Extension<WebRequestContext>>,
    query: Result<Query<DataCenterListQuery>, QueryRejection>,
) -> Response {
    let Ok(Query(request)) = query else {
        return bad_request("query parameters are invalid");
    };
    let window = match list_window(request) {
        Ok(window) => window,
        Err(message) => return bad_request(message),
    };
    let subject = data_center_subject(scoped, request_context.as_ref());
    match state.store.list_exports(subject).await {
        Ok(items) => data_center_list_response(
            items
                .into_iter()
                .filter(|item| matches_export(item, window.search.as_deref()))
                .map(DataCenterExportResponse::from)
                .collect(),
            window.page_no,
            window.page_size,
        ),
        Err(error) => system_error_response("data center exports are unavailable", error),
    }
}

async fn fetch_audits(
    State(state): State<DataCenterState>,
    RequiredAdminSqlScopedSubject(scoped): RequiredAdminSqlScopedSubject,
    request_context: Option<Extension<WebRequestContext>>,
    query: Result<Query<DataCenterListQuery>, QueryRejection>,
) -> Response {
    let Ok(Query(request)) = query else {
        return bad_request("query parameters are invalid");
    };
    let window = match list_window(request) {
        Ok(window) => window,
        Err(message) => return bad_request(message),
    };
    let subject = data_center_subject(scoped, request_context.as_ref());
    let items = match state.store.list_audits(subject.clone()).await {
        Ok(items) => items,
        Err(error) => return system_error_response("data center audit trail is unavailable", error),
    };
    // Reading the audit trail is itself a data action (design §5.14). A failure
    // to record it must not hide the rows the operator is entitled to read.
    let mut audit_entry = DataCenterAuditEntry::new(
        subject,
        DataCenterAuditAction::Query,
        "audit_log",
        "audits",
    )
    .with_detail("list data access audit trail");
    audit_entry.row_count = i64::try_from(items.len()).unwrap_or(i64::MAX);
    if let Err(error) = state.store.record_audit(audit_entry).await {
        tracing::warn!(error = %error, "failed to record the data center audit-trail read");
    }
    data_center_list_response(
        items
            .into_iter()
            .filter(|item| matches_audit(item, window.search.as_deref()))
            .map(DataCenterAuditResponse::from)
            .collect(),
        window.page_no,
        window.page_size,
    )
}

struct ListWindow {
    page_no: i64,
    page_size: i64,
    search: Option<String>,
}

fn list_window(request: DataCenterListQuery) -> Result<ListWindow, String> {
    if let Some(page_size) = request.page_size {
        if !(1..=MAX_LIST_PAGE_SIZE).contains(&page_size) {
            return Err(format!(
                "page_size must be between 1 and {MAX_LIST_PAGE_SIZE}"
            ));
        }
    }
    let pagination = parse_offset_list_query(request.page, request.page_size)?;
    Ok(ListWindow {
        page_no: pagination.page_no,
        page_size: pagination.page_size.min(MAX_LIST_PAGE_SIZE).max(1),
        search: normalize_list_search_query(request.q, "q")?,
    })
}

/// Renders one page of an already-scoped list as `data.items` + `data.pageInfo`.
fn data_center_list_response<T: Serialize>(
    items: Vec<T>,
    page_no: i64,
    page_size: i64,
) -> Response {
    let total = i64::try_from(items.len()).unwrap_or(i64::MAX);
    let page = slice_page(items, page_no, page_size);
    json_success_list_response(None, page, offset_page_info(page_no, page_size, total))
}

fn slice_page<T>(items: Vec<T>, page_no: i64, page_size: i64) -> Vec<T> {
    let offset = page_no
        .saturating_sub(1)
        .checked_mul(page_size)
        .unwrap_or(i64::MAX);
    let start = usize::try_from(offset).unwrap_or(usize::MAX);
    let size = usize::try_from(page_size).unwrap_or(usize::MAX);
    items.into_iter().skip(start).take(size).collect()
}

fn data_center_subject(
    scoped: SqlScopedAdminSubject,
    request_context: Option<&Extension<WebRequestContext>>,
) -> DataCenterSubject {
    let operator_name = request_context.and_then(|extension| {
        extension
            .0
            .principal()
            .and_then(|principal| principal.display_name())
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(str::to_owned)
    });
    DataCenterSubject {
        tenant_id: scoped.tenant_id,
        organization_id: scoped.organization_id,
        operator_id: scoped.operator_id,
        operator_type: scoped.operator_type,
        operator_name,
    }
}

fn contains_search(haystacks: &[&str], search: Option<&str>) -> bool {
    let Some(search) = search else {
        return true;
    };
    let needle = search.to_lowercase();
    haystacks
        .iter()
        .any(|value| value.to_lowercase().contains(&needle))
}

fn matches_source(item: &DataCenterSourceItem, search: Option<&str>) -> bool {
    contains_search(
        &[item.name.as_str(), item.kind.as_str(), item.health.as_str()],
        search,
    )
}

fn matches_table(item: &DataCenterTableItem, search: Option<&str>) -> bool {
    contains_search(
        &[item.name.as_str(), item.kind.as_str(), item.owner.as_str()],
        search,
    )
}

fn matches_export(item: &DataCenterExportItem, search: Option<&str>) -> bool {
    contains_search(
        &[
            item.dataset_name.as_str(),
            item.status.as_str(),
            item.requested_by.as_str(),
        ],
        search,
    )
}

fn matches_audit(item: &DataCenterAuditItem, search: Option<&str>) -> bool {
    contains_search(
        &[
            item.actor.as_str(),
            item.action.as_str(),
            item.object.as_str(),
            item.result.as_str(),
        ],
        search,
    )
}

impl From<DataCenterOverview> for DataCenterOverviewResponse {
    fn from(overview: DataCenterOverview) -> Self {
        Self {
            sources: overview.sources,
            tables: overview.tables,
            today_instances: overview.today_instances,
            pending_exports: overview.pending_exports,
            success_rate: overview.success_rate,
        }
    }
}

impl From<DataCenterSourceItem> for DataCenterSourceResponse {
    fn from(item: DataCenterSourceItem) -> Self {
        Self {
            id: item.id,
            name: item.name,
            kind: item.kind,
            health: item.health.as_str().to_owned(),
            table_count: item.table_count,
            last_tested_at: item.last_tested_at,
        }
    }
}

impl From<DataCenterTableItem> for DataCenterTableResponse {
    fn from(item: DataCenterTableItem) -> Self {
        Self {
            id: item.id,
            name: item.name,
            kind: item.kind.as_str().to_owned(),
            row_count: item.row_count,
            column_count: item.column_count,
            owner: item.owner,
            updated_at: item.updated_at,
        }
    }
}

impl From<DataCenterExportItem> for DataCenterExportResponse {
    fn from(item: DataCenterExportItem) -> Self {
        Self {
            id: item.id,
            dataset_name: item.dataset_name,
            status: item.status.as_str().to_owned(),
            row_count: item.row_count,
            requested_by: item.requested_by,
            expires_at: item.expires_at,
        }
    }
}

impl From<DataCenterAuditItem> for DataCenterAuditResponse {
    fn from(item: DataCenterAuditItem) -> Self {
        Self {
            id: item.id,
            actor: item.actor,
            action: item.action.as_str().to_owned(),
            object: item.object,
            row_count: item.row_count,
            result: item.result.as_str().to_owned(),
            at: item.at,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn list_window_rejects_oversized_page_and_control_characters() {
        assert!(list_window(DataCenterListQuery {
            page: Some(1),
            page_size: Some(MAX_LIST_PAGE_SIZE + 1),
            q: None,
        })
        .is_err());
        assert!(list_window(DataCenterListQuery {
            page: Some(0),
            page_size: None,
            q: None,
        })
        .is_err());
        assert!(list_window(DataCenterListQuery {
            page: None,
            page_size: None,
            q: Some("bad\u{1}text".to_owned()),
        })
        .is_err());
        let window = list_window(DataCenterListQuery::default()).expect("default window");
        assert_eq!(1, window.page_no);
        assert_eq!(20, window.page_size);
    }

    #[test]
    fn search_matching_is_case_insensitive_across_columns() {
        let item = DataCenterSourceItem {
            id: "1".to_owned(),
            name: "Warehouse-PG".to_owned(),
            kind: "postgresql".to_owned(),
            health: crate::ports::DataCenterSourceHealth::Healthy,
            table_count: 4,
            last_tested_at: None,
        };
        assert!(matches_source(&item, Some("warehouse")));
        assert!(matches_source(&item, Some("POSTGRES")));
        assert!(!matches_source(&item, Some("mysql")));
        assert!(matches_source(&item, None));
    }

    #[test]
    fn page_slicing_is_bounded_and_never_panics() {
        let items = (0..5).collect::<Vec<i64>>();
        assert_eq!(vec![2, 3], slice_page(items.clone(), 2, 2));
        assert!(slice_page(items.clone(), i64::MAX, 2).is_empty());
        assert_eq!(5, slice_page(items, 1, MAX_LIST_PAGE_SIZE).len());
    }
}
