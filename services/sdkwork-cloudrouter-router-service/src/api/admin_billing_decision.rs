//! Read-only billing decision diagnostics route.

use std::sync::Arc;

use axum::extract::{Query, State};
use axum::http::HeaderMap;
use axum::response::{IntoResponse, Json, Response};
use axum::routing::get;
use axum::Router;
use serde::{Deserialize, Serialize};

use crate::api::admin_sql_subject::SqlScopedAdminSubject;
use crate::api::command_error::system_error_response;
use crate::api::response::{bad_request, success_envelope};
use crate::ports::{AdminBillingDecisionStore, AdminBillingDecisionSubject};

#[derive(Clone)]
struct AdminBillingDecisionState {
    store: Arc<dyn AdminBillingDecisionStore + Send + Sync>,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct ReadBillingDecisionQuery {
    /// Routing invocation id; the same id the gateway exposes on its access log.
    invocation_id: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AdminBillingDecisionResponse {
    invocation_id: String,
    /// Frozen points, rendered as a string because points are exact integers.
    hold_amount: Option<String>,
    hold_settled_amount: Option<String>,
    hold_status: Option<i16>,
    hold_expires_at: Option<String>,
    charge_line_count: String,
    charge_amount: String,
    debit_points: String,
    measured_quantity: String,
    verdict: String,
}

pub fn admin_billing_decision_router_with_store(
    store: Arc<dyn AdminBillingDecisionStore + Send + Sync>,
) -> Router {
    Router::new()
        .route(
            "/backend/v3/api/billing/decision",
            get(read_billing_decision),
        )
        .with_state(AdminBillingDecisionState { store })
}

/// Answers why one request was admitted, frozen, charged or left stuck.
///
/// This is the read-only half of the billing diagnostics: it never creates or
/// mutates a hold. A tenant only ever sees its own requests, and an unknown id
/// reads as `not_billed` — the same answer a request rejected before dispatch
/// gets, which is the honest one for both.
async fn read_billing_decision(
    State(state): State<AdminBillingDecisionState>,
    scoped: SqlScopedAdminSubject,
    _headers: HeaderMap,
    Query(query): Query<ReadBillingDecisionQuery>,
) -> Response {
    let invocation_id = query.invocation_id.trim().to_owned();
    if invocation_id.is_empty() {
        return bad_request("invocation_id is required");
    }
    let subject = AdminBillingDecisionSubject {
        tenant_id: scoped.tenant_id,
    };
    match state
        .store
        .read_billing_decision(subject, invocation_id)
        .await
    {
        Ok(Some(decision)) => Json(success_envelope(AdminBillingDecisionResponse {
            invocation_id: decision.invocation_id,
            hold_amount: decision.hold_amount,
            hold_settled_amount: decision.hold_settled_amount,
            hold_status: decision.hold_status,
            hold_expires_at: decision.hold_expires_at,
            charge_line_count: decision.charge_line_count.to_string(),
            charge_amount: decision.charge_amount,
            debit_points: decision.debit_points.to_string(),
            measured_quantity: decision.measured_quantity,
            verdict: decision.verdict.as_str().to_owned(),
        }))
        .into_response(),
        Ok(None) => bad_request("request id is not known to this tenant"),
        Err(error) => system_error_response("billing decision diagnostics are unavailable", error),
    }
}
