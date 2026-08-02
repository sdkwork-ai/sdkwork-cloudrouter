use axum::extract::rejection::{JsonRejection, QueryRejection};
use axum::extract::{Path, Query, State};
use axum::http::{HeaderMap, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::{Json, Router};
use sdkwork_clawrouter_router_service::api::admin_sql_subject::RequiredAdminSqlScopedSubject;
use sdkwork_clawrouter_router_service::ports::{
    AdminUpstreamAccountCredentialItem, AdminUpstreamAccountItem,
    AdminUpstreamAccountVerificationItem, CreateAdminUpstreamAccountCredentialCommand,
    SaveAdminUpstreamAccountCommand, VerifyAdminUpstreamAccountCommand,
};
use sdkwork_utils_rust::{parse_datetime, SdkWorkResultCode};
use serde::{Deserialize, Serialize};

use super::shared::{
    decode_json, decode_query, domain_error, idempotency_uuid, item_response, list_query,
    list_response, no_content_response, not_found, optional_text, parse_id, parse_if_match,
    positive_decimal, problem, requested_at, required_text, subject, verification_error, ListQuery,
    RequestResult, UpstreamState,
};

const MAX_CODE_LENGTH: usize = 128;
const MAX_NAME_LENGTH: usize = 200;
const MAX_SECRET_LENGTH: usize = 65_536;
const ACCOUNT_CREATE_IDEMPOTENCY_SCOPE: i64 = 1_000_002;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct AccountCreateRequest {
    supplier_id: String,
    preferred_endpoint_id: Option<String>,
    account_code: String,
    account_name: String,
    account_type: Option<String>,
    auth_method_code: String,
    external_account_id: Option<String>,
    environment: Option<i32>,
    region_code: Option<String>,
    quota_limit: Option<String>,
    upstream_balance_currency: Option<String>,
    contract_cost_multiplier: Option<String>,
    rpm_limit: Option<i64>,
    timeout_ms: Option<i32>,
    status: Option<i32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct AccountUpdateRequest {
    supplier_id: Option<String>,
    preferred_endpoint_id: Option<String>,
    account_name: Option<String>,
    account_type: Option<String>,
    auth_method_code: Option<String>,
    external_account_id: Option<String>,
    environment: Option<i32>,
    region_code: Option<String>,
    quota_limit: Option<String>,
    upstream_balance_currency: Option<String>,
    contract_cost_multiplier: Option<String>,
    rpm_limit: Option<i64>,
    timeout_ms: Option<i32>,
    status: Option<i32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct CredentialCreateRequest {
    credential_name: String,
    secret: String,
    priority: Option<i32>,
    expires_at: Option<String>,
}

#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct AccountVerifyRequest {
    endpoint_id: Option<String>,
    credential_id: Option<String>,
    timeout_ms: Option<u64>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AccountResponse {
    id: String,
    uuid: String,
    supplier_id: String,
    supplier_code: String,
    preferred_endpoint_id: Option<String>,
    account_code: String,
    account_name: String,
    account_type: String,
    auth_method_code: String,
    external_account_id: Option<String>,
    environment: Option<i32>,
    region_code: Option<String>,
    quota_limit: Option<String>,
    quota_used: Option<String>,
    upstream_balance_amount: Option<String>,
    upstream_balance_currency: Option<String>,
    contract_cost_multiplier: String,
    rpm_limit: Option<String>,
    timeout_ms: Option<i32>,
    health_status: i32,
    status: i32,
    version: String,
    updated_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct CredentialResponse {
    id: String,
    auth_method_code: String,
    credential_name: String,
    masked_label: Option<String>,
    credential_version: String,
    priority: i32,
    is_active: bool,
    expires_at: Option<String>,
    last_rotated_at: Option<String>,
    last_verified_at: Option<String>,
    last_used_at: Option<String>,
    status: i32,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AccountVerificationResponse {
    id: String,
    account_id: String,
    supplier_code: String,
    endpoint_id: String,
    credential_id: String,
    success: bool,
    status_code: Option<u16>,
    latency_ms: String,
    verified_at: String,
    message: String,
}

pub(super) fn routes() -> Router<UpstreamState> {
    Router::new()
        .route(
            "/backend/v3/api/ai/upstream_accounts",
            get(list_accounts).post(create_account),
        )
        .route(
            "/backend/v3/api/ai/upstream_accounts/{accountId}",
            get(get_account)
                .patch(update_account)
                .delete(delete_account),
        )
        .route(
            "/backend/v3/api/ai/upstream_accounts/{accountId}/credentials",
            get(list_credentials).post(create_credential),
        )
        .route(
            "/backend/v3/api/ai/upstream_accounts/{accountId}/credentials/{credentialId}",
            axum::routing::delete(deactivate_credential),
        )
        .route(
            "/backend/v3/api/ai/upstream_accounts/{accountId}/verify",
            axum::routing::post(verify_account),
        )
}

async fn list_accounts(
    State(state): State<UpstreamState>,
    RequiredAdminSqlScopedSubject(scoped): RequiredAdminSqlScopedSubject,
    query: Result<Query<ListQuery>, QueryRejection>,
) -> Response {
    let query = match decode_query(query).and_then(|query| list_query(subject(scoped), query)) {
        Ok(query) => query,
        Err(response) => return response.into_response(),
    };
    match state.store.list_accounts(query).await {
        Ok(page) => list_response(
            sdkwork_clawrouter_router_service::ports::AdminUpstreamPage {
                items: page.items.into_iter().map(AccountResponse::from).collect(),
                page: page.page,
                page_size: page.page_size,
                total: page.total,
            },
        ),
        Err(error) => domain_error(error),
    }
}

async fn get_account(
    State(state): State<UpstreamState>,
    RequiredAdminSqlScopedSubject(scoped): RequiredAdminSqlScopedSubject,
    Path(account_id): Path<String>,
) -> Response {
    let account_id = match parse_id(account_id, "accountId") {
        Ok(value) => value,
        Err(response) => return response.into_response(),
    };
    match state.store.get_account(subject(scoped), account_id).await {
        Ok(Some(item)) => item_response(StatusCode::OK, AccountResponse::from(item)),
        Ok(None) => not_found("upstream account"),
        Err(error) => domain_error(error),
    }
}

async fn create_account(
    State(state): State<UpstreamState>,
    RequiredAdminSqlScopedSubject(scoped): RequiredAdminSqlScopedSubject,
    headers: HeaderMap,
    payload: Result<Json<AccountCreateRequest>, JsonRejection>,
) -> Response {
    let scoped = subject(scoped);
    let uuid = match idempotency_uuid(&headers, &scoped, ACCOUNT_CREATE_IDEMPOTENCY_SCOPE) {
        Ok(value) => value,
        Err(response) => return response.into_response(),
    };
    let payload = match decode_json(payload) {
        Ok(value) => value,
        Err(response) => return response.into_response(),
    };
    let command = match create_command(scoped, uuid, payload) {
        Ok(value) => value,
        Err(response) => return response.into_response(),
    };
    match state.store.save_account(command).await {
        Ok(item) => item_response(StatusCode::CREATED, AccountResponse::from(item)),
        Err(error) => domain_error(error),
    }
}

async fn update_account(
    State(state): State<UpstreamState>,
    RequiredAdminSqlScopedSubject(scoped): RequiredAdminSqlScopedSubject,
    Path(account_id): Path<String>,
    headers: HeaderMap,
    payload: Result<Json<AccountUpdateRequest>, JsonRejection>,
) -> Response {
    let account_id = match parse_id(account_id, "accountId") {
        Ok(value) => value,
        Err(response) => return response.into_response(),
    };
    let expected_version = match parse_if_match(&headers) {
        Ok(value) => value,
        Err(response) => return response.into_response(),
    };
    let payload = match decode_json(payload) {
        Ok(value) => value,
        Err(response) => return response.into_response(),
    };
    let scoped = subject(scoped);
    let existing = match state.store.get_account(scoped.clone(), account_id).await {
        Ok(Some(item)) => item,
        Ok(None) => return not_found("upstream account"),
        Err(error) => return domain_error(error),
    };
    let command = match update_command(scoped, existing, expected_version, payload) {
        Ok(value) => value,
        Err(response) => return response.into_response(),
    };
    match state.store.save_account(command).await {
        Ok(item) => item_response(StatusCode::OK, AccountResponse::from(item)),
        Err(error) => domain_error(error),
    }
}

async fn delete_account(
    State(state): State<UpstreamState>,
    RequiredAdminSqlScopedSubject(scoped): RequiredAdminSqlScopedSubject,
    Path(account_id): Path<String>,
    headers: HeaderMap,
) -> Response {
    let account_id = match parse_id(account_id, "accountId") {
        Ok(value) => value,
        Err(response) => return response.into_response(),
    };
    let expected_version = match parse_if_match(&headers) {
        Ok(value) => value,
        Err(response) => return response.into_response(),
    };
    match state
        .store
        .delete_account(
            subject(scoped),
            account_id,
            expected_version,
            requested_at(),
        )
        .await
    {
        Ok(true) => no_content_response(),
        Ok(false) => not_found("upstream account"),
        Err(error) => domain_error(error),
    }
}

async fn list_credentials(
    State(state): State<UpstreamState>,
    RequiredAdminSqlScopedSubject(scoped): RequiredAdminSqlScopedSubject,
    Path(account_id): Path<String>,
    query: Result<Query<ListQuery>, QueryRejection>,
) -> Response {
    let account_id = match parse_id(account_id, "accountId") {
        Ok(value) => value,
        Err(response) => return response.into_response(),
    };
    let query = match decode_query(query).and_then(|query| list_query(subject(scoped), query)) {
        Ok(query) => query,
        Err(response) => return response.into_response(),
    };
    match state
        .store
        .list_account_credentials(query, account_id)
        .await
    {
        Ok(page) => list_response(
            sdkwork_clawrouter_router_service::ports::AdminUpstreamPage {
                items: page
                    .items
                    .into_iter()
                    .map(CredentialResponse::from)
                    .collect(),
                page: page.page,
                page_size: page.page_size,
                total: page.total,
            },
        ),
        Err(error) => domain_error(error),
    }
}

async fn create_credential(
    State(state): State<UpstreamState>,
    RequiredAdminSqlScopedSubject(scoped): RequiredAdminSqlScopedSubject,
    Path(account_id): Path<String>,
    headers: HeaderMap,
    payload: Result<Json<CredentialCreateRequest>, JsonRejection>,
) -> Response {
    let account_id = match parse_id(account_id, "accountId") {
        Ok(value) => value,
        Err(response) => return response.into_response(),
    };
    let scoped = subject(scoped);
    let uuid = match idempotency_uuid(&headers, &scoped, account_id) {
        Ok(value) => value,
        Err(response) => return response.into_response(),
    };
    let payload = match decode_json(payload) {
        Ok(value) => value,
        Err(response) => return response.into_response(),
    };
    let command = match credential_command(scoped, account_id, uuid, payload) {
        Ok(value) => value,
        Err(response) => return response.into_response(),
    };
    match state.store.create_account_credential(command).await {
        Ok(item) => item_response(StatusCode::CREATED, CredentialResponse::from(item)),
        Err(error) => domain_error(error),
    }
}

async fn deactivate_credential(
    State(state): State<UpstreamState>,
    RequiredAdminSqlScopedSubject(scoped): RequiredAdminSqlScopedSubject,
    Path((account_id, credential_id)): Path<(String, String)>,
) -> Response {
    let account_id = match parse_id(account_id, "accountId") {
        Ok(value) => value,
        Err(response) => return response.into_response(),
    };
    let credential_id = match parse_id(credential_id, "credentialId") {
        Ok(value) => value,
        Err(response) => return response.into_response(),
    };
    match state
        .store
        .deactivate_account_credential(subject(scoped), account_id, credential_id, requested_at())
        .await
    {
        Ok(true) => no_content_response(),
        Ok(false) => not_found("upstream account credential"),
        Err(error) => domain_error(error),
    }
}

async fn verify_account(
    State(state): State<UpstreamState>,
    RequiredAdminSqlScopedSubject(scoped): RequiredAdminSqlScopedSubject,
    Path(account_id): Path<String>,
    payload: Result<Json<AccountVerifyRequest>, JsonRejection>,
) -> Response {
    let account_id = match parse_id(account_id, "accountId") {
        Ok(value) => value,
        Err(response) => return response.into_response(),
    };
    let payload = match decode_json(payload) {
        Ok(value) => value,
        Err(response) => return response.into_response(),
    };
    let timeout_ms = match verification_timeout_ms(payload.timeout_ms) {
        Ok(value) => value,
        Err(response) => return response.into_response(),
    };
    let command = VerifyAdminUpstreamAccountCommand {
        subject: subject(scoped),
        account_id,
        endpoint_id: match payload.endpoint_id {
            Some(value) => match parse_id(value, "endpointId") {
                Ok(value) => Some(value),
                Err(response) => return response.into_response(),
            },
            None => None,
        },
        credential_id: match payload.credential_id {
            Some(value) => match parse_id(value, "credentialId") {
                Ok(value) => Some(value),
                Err(response) => return response.into_response(),
            },
            None => None,
        },
        timeout_ms,
        requested_at: requested_at(),
    };
    match state.verifier.verify_account(command).await {
        Ok(item) => item_response(StatusCode::OK, AccountVerificationResponse::from(item)),
        Err(error) => verification_error(error),
    }
}

fn verification_timeout_ms(value: Option<u64>) -> RequestResult<u64> {
    let value = value.unwrap_or(10_000);
    if !(100..=30_000).contains(&value) {
        return Err(problem(
            SdkWorkResultCode::InvalidParameter,
            "timeoutMs must be between 100 and 30000",
        ));
    }
    Ok(value)
}

fn create_command(
    subject: sdkwork_clawrouter_router_service::ports::AdminUpstreamSubject,
    uuid: String,
    request: AccountCreateRequest,
) -> RequestResult<SaveAdminUpstreamAccountCommand> {
    Ok(SaveAdminUpstreamAccountCommand {
        subject,
        account_id: None,
        expected_version: None,
        uuid,
        supplier_id: parse_id(request.supplier_id, "supplierId")?,
        preferred_endpoint_id: request
            .preferred_endpoint_id
            .map(|value| parse_id(value, "preferredEndpointId"))
            .transpose()?,
        account_code: required_text(request.account_code, "accountCode", MAX_CODE_LENGTH)?,
        account_name: required_text(request.account_name, "accountName", MAX_NAME_LENGTH)?,
        account_type: required_text(
            request
                .account_type
                .unwrap_or_else(|| "standard".to_owned()),
            "accountType",
            32,
        )?,
        auth_method_code: required_text(
            request.auth_method_code,
            "authMethodCode",
            MAX_CODE_LENGTH,
        )?,
        external_account_id: optional_text(
            request.external_account_id,
            "externalAccountId",
            MAX_CODE_LENGTH,
        )?,
        environment: request.environment,
        region_code: optional_text(request.region_code, "regionCode", MAX_CODE_LENGTH)?,
        quota_limit: request
            .quota_limit
            .map(|value| non_negative_decimal(value, "quotaLimit"))
            .transpose()?,
        upstream_balance_currency: optional_text(
            request.upstream_balance_currency,
            "upstreamBalanceCurrency",
            10,
        )?,
        contract_cost_multiplier: positive_decimal(
            request
                .contract_cost_multiplier
                .unwrap_or_else(|| "1".to_owned()),
            "contractCostMultiplier",
        )?,
        rpm_limit: non_negative_i64(request.rpm_limit, "rpmLimit")?,
        timeout_ms: positive_i32(request.timeout_ms, "timeoutMs")?,
        status: status(request.status.unwrap_or(1))?,
        requested_at: requested_at(),
    })
}

fn update_command(
    subject: sdkwork_clawrouter_router_service::ports::AdminUpstreamSubject,
    existing: AdminUpstreamAccountItem,
    expected_version: i64,
    request: AccountUpdateRequest,
) -> RequestResult<SaveAdminUpstreamAccountCommand> {
    Ok(SaveAdminUpstreamAccountCommand {
        subject,
        account_id: Some(existing.id),
        expected_version: Some(expected_version),
        uuid: existing.uuid,
        supplier_id: request
            .supplier_id
            .map(|value| parse_id(value, "supplierId"))
            .transpose()?
            .unwrap_or(existing.supplier_id),
        preferred_endpoint_id: request
            .preferred_endpoint_id
            .map(|value| parse_id(value, "preferredEndpointId"))
            .transpose()?
            .or(existing.preferred_endpoint_id),
        account_code: existing.account_code,
        account_name: request
            .account_name
            .map(|value| required_text(value, "accountName", MAX_NAME_LENGTH))
            .transpose()?
            .unwrap_or(existing.account_name),
        account_type: request
            .account_type
            .map(|value| required_text(value, "accountType", 32))
            .transpose()?
            .unwrap_or(existing.account_type),
        auth_method_code: request
            .auth_method_code
            .map(|value| required_text(value, "authMethodCode", MAX_CODE_LENGTH))
            .transpose()?
            .unwrap_or(existing.auth_method_code),
        external_account_id: match request.external_account_id {
            Some(value) => optional_text(Some(value), "externalAccountId", MAX_CODE_LENGTH)?,
            None => existing.external_account_id,
        },
        environment: request.environment.or(existing.environment),
        region_code: match request.region_code {
            Some(value) => optional_text(Some(value), "regionCode", MAX_CODE_LENGTH)?,
            None => existing.region_code,
        },
        quota_limit: match request.quota_limit {
            Some(value) => Some(non_negative_decimal(value, "quotaLimit")?),
            None => existing.quota_limit,
        },
        upstream_balance_currency: match request.upstream_balance_currency {
            Some(value) => optional_text(Some(value), "upstreamBalanceCurrency", 10)?,
            None => existing.upstream_balance_currency,
        },
        contract_cost_multiplier: request
            .contract_cost_multiplier
            .map(|value| positive_decimal(value, "contractCostMultiplier"))
            .transpose()?
            .unwrap_or(existing.contract_cost_multiplier),
        rpm_limit: match request.rpm_limit {
            Some(value) => non_negative_i64(Some(value), "rpmLimit")?,
            None => existing.rpm_limit,
        },
        timeout_ms: match request.timeout_ms {
            Some(value) => positive_i32(Some(value), "timeoutMs")?,
            None => existing.timeout_ms,
        },
        status: status(request.status.unwrap_or(existing.status))?,
        requested_at: requested_at(),
    })
}

fn credential_command(
    subject: sdkwork_clawrouter_router_service::ports::AdminUpstreamSubject,
    account_id: i64,
    uuid: String,
    request: CredentialCreateRequest,
) -> RequestResult<CreateAdminUpstreamAccountCredentialCommand> {
    let secret = required_text(request.secret, "secret", MAX_SECRET_LENGTH)?;
    let expires_at = optional_text(request.expires_at, "expiresAt", 64)?;
    if expires_at
        .as_deref()
        .is_some_and(|value| parse_datetime(value, None).is_none())
    {
        return Err(problem(
            SdkWorkResultCode::InvalidParameter,
            "expiresAt must be an RFC 3339 timestamp",
        ));
    }
    Ok(CreateAdminUpstreamAccountCredentialCommand {
        subject,
        account_id,
        uuid,
        credential_name: required_text(request.credential_name, "credentialName", MAX_NAME_LENGTH)?,
        secret,
        priority: non_negative_i32(request.priority.unwrap_or(100), "priority")?,
        expires_at,
        requested_at: requested_at(),
    })
}

fn non_negative_decimal(value: String, field: &str) -> RequestResult<String> {
    let value = required_text(value, field, 64)?;
    let parsed =
        sdkwork_clawrouter_router_service::domain::DecimalValue::parse(&value).map_err(|_| {
            problem(
                SdkWorkResultCode::InvalidParameter,
                format!("{field} must be a non-negative decimal"),
            )
        })?;
    if parsed < sdkwork_clawrouter_router_service::domain::DecimalValue::ZERO {
        return Err(problem(
            SdkWorkResultCode::InvalidParameter,
            format!("{field} must be non-negative"),
        ));
    }
    Ok(value)
}

fn status(value: i32) -> RequestResult<i32> {
    if !matches!(value, 0 | 1) {
        return Err(problem(
            SdkWorkResultCode::InvalidParameter,
            "status must be 0 or 1",
        ));
    }
    Ok(value)
}

fn non_negative_i64(value: Option<i64>, field: &str) -> RequestResult<Option<i64>> {
    if value.is_some_and(|value| value < 0) {
        return Err(problem(
            SdkWorkResultCode::InvalidParameter,
            format!("{field} must be non-negative"),
        ));
    }
    Ok(value)
}

fn non_negative_i32(value: i32, field: &str) -> RequestResult<i32> {
    if value < 0 {
        return Err(problem(
            SdkWorkResultCode::InvalidParameter,
            format!("{field} must be non-negative"),
        ));
    }
    Ok(value)
}

fn positive_i32(value: Option<i32>, field: &str) -> RequestResult<Option<i32>> {
    if value.is_some_and(|value| value <= 0) {
        return Err(problem(
            SdkWorkResultCode::InvalidParameter,
            format!("{field} must be positive"),
        ));
    }
    Ok(value)
}

impl From<AdminUpstreamAccountItem> for AccountResponse {
    fn from(item: AdminUpstreamAccountItem) -> Self {
        Self {
            id: item.id.to_string(),
            uuid: item.uuid,
            supplier_id: item.supplier_id.to_string(),
            supplier_code: item.supplier_code,
            preferred_endpoint_id: item.preferred_endpoint_id.map(|value| value.to_string()),
            account_code: item.account_code,
            account_name: item.account_name,
            account_type: item.account_type,
            auth_method_code: item.auth_method_code,
            external_account_id: item.external_account_id,
            environment: item.environment,
            region_code: item.region_code,
            quota_limit: item.quota_limit,
            quota_used: item.quota_used,
            upstream_balance_amount: item.upstream_balance_amount,
            upstream_balance_currency: item.upstream_balance_currency,
            contract_cost_multiplier: item.contract_cost_multiplier,
            rpm_limit: item.rpm_limit.map(|value| value.to_string()),
            timeout_ms: item.timeout_ms,
            health_status: item.health_status,
            status: item.status,
            version: item.version.to_string(),
            updated_at: item.updated_at,
        }
    }
}

impl From<AdminUpstreamAccountCredentialItem> for CredentialResponse {
    fn from(item: AdminUpstreamAccountCredentialItem) -> Self {
        Self {
            id: item.id.to_string(),
            auth_method_code: item.auth_method_code,
            credential_name: item.credential_name,
            masked_label: item.masked_label,
            credential_version: item.credential_version.to_string(),
            priority: item.priority,
            is_active: item.is_active,
            expires_at: item.expires_at,
            last_rotated_at: item.last_rotated_at,
            last_verified_at: item.last_verified_at,
            last_used_at: item.last_used_at,
            status: item.status,
        }
    }
}

impl From<AdminUpstreamAccountVerificationItem> for AccountVerificationResponse {
    fn from(item: AdminUpstreamAccountVerificationItem) -> Self {
        let account_id = item.account_id.to_string();
        Self {
            id: account_id.clone(),
            account_id,
            supplier_code: item.supplier_code,
            endpoint_id: item.endpoint_id.to_string(),
            credential_id: item.credential_id.to_string(),
            success: item.success,
            status_code: item.status_code,
            latency_ms: item.latency_ms.to_string(),
            verified_at: item.verified_at,
            message: item.message,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn verification_timeout_enforces_public_contract_bounds() {
        assert_eq!(10_000, verification_timeout_ms(None).unwrap());
        assert_eq!(100, verification_timeout_ms(Some(100)).unwrap());
        assert_eq!(30_000, verification_timeout_ms(Some(30_000)).unwrap());
        assert_eq!(
            StatusCode::BAD_REQUEST,
            verification_timeout_ms(Some(99))
                .unwrap_err()
                .into_response()
                .status()
        );
        assert_eq!(
            StatusCode::BAD_REQUEST,
            verification_timeout_ms(Some(30_001))
                .unwrap_err()
                .into_response()
                .status()
        );
    }

    #[test]
    fn verification_response_exposes_metadata_without_secret_material() {
        let response = AccountVerificationResponse::from(AdminUpstreamAccountVerificationItem {
            account_id: 11,
            supplier_code: "openai".to_owned(),
            endpoint_id: 12,
            credential_id: 13,
            success: false,
            status_code: Some(401),
            latency_ms: 25,
            verified_at: "2026-07-28T12:00:00Z".to_owned(),
            message: "upstream provider rejected the configured credential".to_owned(),
        });
        let payload = serde_json::to_value(response).unwrap();
        let serialized = payload.to_string();

        assert_eq!("11", payload["id"]);
        assert_eq!(payload["accountId"], payload["id"]);
        assert_eq!("13", payload["credentialId"]);
        assert!(!serialized.contains("credentialRef"));
        assert!(!serialized.contains("rawSecret"));
        assert!(!serialized.contains("\"secret\""));
    }

    #[test]
    fn credential_response_exposes_only_masked_secret_metadata() {
        let response = CredentialResponse::from(AdminUpstreamAccountCredentialItem {
            id: 13,
            auth_method_code: "api-key".to_owned(),
            credential_name: "primary".to_owned(),
            masked_label: Some("sk-****1234".to_owned()),
            credential_version: 1,
            priority: 100,
            is_active: true,
            expires_at: None,
            last_rotated_at: None,
            last_verified_at: None,
            last_used_at: None,
            status: 1,
        });
        let payload = serde_json::to_value(response).unwrap();
        let serialized = payload.to_string();

        assert_eq!("sk-****1234", payload["maskedLabel"]);
        assert!(!serialized.contains("rawSecret"));
        assert!(!serialized.contains("secretCiphertext"));
        assert!(!serialized.contains("\"secret\""));
    }
}
