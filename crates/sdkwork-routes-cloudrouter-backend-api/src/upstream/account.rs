use axum::extract::rejection::{JsonRejection, QueryRejection};
use axum::extract::{Path, Query, State};
use axum::http::{HeaderMap, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::{Json, Router};
use sdkwork_cloudrouter_router_service::api::admin_sql_subject::RequiredAdminSqlScopedSubject;
use sdkwork_cloudrouter_router_service::ports::{
    AdminLlmProtocolConfig, AdminUpstreamAccountCredentialItem, AdminUpstreamAccountItem,
    AdminUpstreamAccountVerificationItem, AdminUpstreamResourceInput,
    CreateAdminUpstreamAccountCredentialCommand, SaveAdminUpstreamAccountCommand,
    VerifyAdminUpstreamAccountCommand,
};
use sdkwork_utils_rust::{parse_datetime, SdkWorkResultCode};
use serde::{Deserialize, Serialize};

use super::shared::{
    bounded_list_response, collection_item_response, decode_json, decode_query, domain_error,
    idempotency_uuid, item_response, list_query, list_response, no_content_response, not_found,
    optional_https_base_url, optional_text, parse_id, parse_if_match, parse_protocol_config,
    positive_decimal, problem, problem_keyed, requested_at, required_text, subject,
    verification_error, ListQuery, ProtocolConfigInput, RequestResult, UpstreamState,
    MAX_CODE_LENGTH, MAX_PROTOCOLS,
};
use super::supplier::ResourceResponse;
use super::{model_list, ModelListEntryInput, ModelListEntryResponse};

const MAX_NAME_LENGTH: usize = 200;
const MAX_SECRET_LENGTH: usize = 65_536;
const ACCOUNT_CREATE_IDEMPOTENCY_SCOPE: i64 = 1_000_002;

/// 归一化计费模式；空值/未知回退默认 prepay（预扣）。
fn normalize_billing_mode(value: Option<&str>) -> String {
    match value
        .map(str::trim)
        .unwrap_or_default()
        .to_ascii_lowercase()
        .as_str()
    {
        "postpay" | "postpaid" => "postpay".to_owned(),
        _ => "prepay".to_owned(),
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct AccountCreateRequest {
    supplier_id: String,
    preferred_endpoint_id: Option<String>,
    /// 账号级默认 Base URL；空/缺省 = 未配置（继承供应商默认）。
    default_base_url: Option<String>,
    /// 账号级各 LLM 协议独立 Base URL 覆盖；空/缺省 = 继承供应商配置。
    protocols: Option<Vec<ProtocolConfigInput>>,
    account_code: Option<String>,
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
    billing_mode: Option<String>,
    /// 账号级模型黑白名单（scope_type='account'；deny 行 → 黑名单，allow 行 → 白名单）。
    model_blacklist: Option<Vec<ModelListEntryInput>>,
    model_whitelist: Option<Vec<ModelListEntryInput>>,
    api_key: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct AccountUpdateRequest {
    supplier_id: Option<String>,
    /// 更新语义：字段缺省 = 保持当前值；显式 null = 清除（恢复自动选择）；字符串 = 设置为该端点。
    /// 外层 Option 区分「字段是否提交」（缺省经 #[serde(default)] 为 None），
    /// 内层 Option 区分「显式 null」与「具体端点 id」（见 deserialize_preferred_endpoint）。
    #[serde(default, deserialize_with = "deserialize_preferred_endpoint")]
    preferred_endpoint_id: Option<Option<String>>,
    /// 更新语义：缺省 = 保持；空串 = 清除（继承供应商默认）。
    default_base_url: Option<String>,
    /// 更新语义：缺省 = 保持；空数组 = 清除全部协议覆盖（继承供应商配置）。
    protocols: Option<Vec<ProtocolConfigInput>>,
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
    billing_mode: Option<String>,
    /// 账号级模型黑白名单；缺省 = 保持当前；空数组 = 清除全部规则。
    model_blacklist: Option<Vec<ModelListEntryInput>>,
    model_whitelist: Option<Vec<ModelListEntryInput>>,
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

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct AccountResourceReplaceRequest {
    items: Vec<AccountResourceRequestItem>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct AccountResourceRequestItem {
    resource_code: Option<String>,
    resource_group_code: Option<String>,
    grant_type: Option<String>,
    priority: Option<i32>,
    status: Option<i32>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AccountResponse {
    id: String,
    uuid: String,
    supplier_id: String,
    supplier_code: String,
    preferred_endpoint_id: Option<String>,
    default_base_url: Option<String>,
    protocols: Vec<AdminLlmProtocolConfig>,
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
    billing_mode: String,
    model_blacklist: Vec<ModelListEntryResponse>,
    model_whitelist: Vec<ModelListEntryResponse>,
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
    /// Plaintext credential secret for the authenticated admin editor.
    #[serde(skip_serializing_if = "Option::is_none")]
    secret: Option<String>,
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
            "/backend/v3/api/ai/upstream_accounts/{accountId}/resources",
            get(list_resources).put(replace_resources),
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
            sdkwork_cloudrouter_router_service::ports::AdminUpstreamPage {
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
            sdkwork_cloudrouter_router_service::ports::AdminUpstreamPage {
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

async fn list_resources(
    State(state): State<UpstreamState>,
    RequiredAdminSqlScopedSubject(scoped): RequiredAdminSqlScopedSubject,
    Path(account_id): Path<String>,
) -> Response {
    let account_id = match parse_id(account_id, "accountId") {
        Ok(value) => value,
        Err(response) => return response.into_response(),
    };
    match state
        .store
        .list_account_resources(subject(scoped), account_id)
        .await
    {
        Ok(items) => bounded_list_response(items.into_iter().map(ResourceResponse::from).collect()),
        Err(error) => domain_error(error),
    }
}

async fn replace_resources(
    State(state): State<UpstreamState>,
    RequiredAdminSqlScopedSubject(scoped): RequiredAdminSqlScopedSubject,
    Path(account_id): Path<String>,
    headers: HeaderMap,
    payload: Result<Json<AccountResourceReplaceRequest>, JsonRejection>,
) -> Response {
    let account_id = match parse_id(account_id, "accountId") {
        Ok(value) => value,
        Err(response) => return response.into_response(),
    };
    let expected_version = match parse_if_match(&headers) {
        Ok(value) => value,
        Err(response) => return response.into_response(),
    };
    let items = match decode_json(payload).and_then(resource_inputs) {
        Ok(value) => value,
        Err(response) => return response.into_response(),
    };
    match state
        .store
        .replace_account_resources(
            subject(scoped),
            account_id,
            expected_version,
            items,
            requested_at(),
        )
        .await
    {
        Ok(items) => collection_item_response(
            account_id,
            items.into_iter().map(ResourceResponse::from).collect(),
        ),
        Err(error) => domain_error(error),
    }
}

fn resource_inputs(
    request: AccountResourceReplaceRequest,
) -> RequestResult<Vec<AdminUpstreamResourceInput>> {
    if request.items.len() > 200 {
        return Err(problem_keyed(
            SdkWorkResultCode::InvalidParameter,
            "validation.admin.upstream.account.resources.maxItems",
            serde_json::json!({ "max": 200 }),
            "at most 200 resources are allowed",
        ));
    }
    request
        .items
        .into_iter()
        .map(|item| {
            let resource_code = optional_text(item.resource_code, "resourceCode", MAX_CODE_LENGTH)?
                .unwrap_or_default();
            let resource_group_code = optional_text(
                item.resource_group_code,
                "resourceGroupCode",
                MAX_CODE_LENGTH,
            )?
            .unwrap_or_default();
            if resource_code.is_empty() == resource_group_code.is_empty() {
                return Err(problem_keyed(
                    SdkWorkResultCode::InvalidParameter,
                    "validation.admin.upstream.resource.codeGroup.oneOf",
                    serde_json::Value::Null,
                    "exactly one of resourceCode or resourceGroupCode is required",
                ));
            }
            let grant_type = item.grant_type.unwrap_or_else(|| "allow".to_owned());
            if !matches!(grant_type.as_str(), "allow" | "deny") {
                return Err(problem_keyed(
                    SdkWorkResultCode::InvalidParameter,
                    "validation.admin.upstream.resource.grantType.enum",
                    serde_json::json!({ "allowed": ["allow", "deny"] }),
                    "grantType must be allow or deny",
                ));
            }
            Ok(AdminUpstreamResourceInput {
                resource_code,
                resource_group_code,
                grant_type,
                priority: non_negative_i32(item.priority.unwrap_or(0), "priority")?,
                status: status(item.status.unwrap_or(1))?,
            })
        })
        .collect()
}

fn verification_timeout_ms(value: Option<u64>) -> RequestResult<u64> {
    let value = value.unwrap_or(10_000);
    if !(100..=30_000).contains(&value) {
        return Err(problem_keyed(
            SdkWorkResultCode::InvalidParameter,
            "validation.admin.upstream.account.timeoutMs.range",
            serde_json::json!({ "min": 100, "max": 30_000 }),
            "timeoutMs must be between 100 and 30000",
        ));
    }
    Ok(value)
}

/// 自动生成唯一账号代码：account-<16位随机hex>。
/// 数据库唯一索引（tenant+org+account_code）兜底保证唯一性。
fn generate_account_code() -> RequestResult<String> {
    let mut bytes = [0u8; 8];
    getrandom::fill(&mut bytes).map_err(|error| {
        problem(
            SdkWorkResultCode::InternalError,
            format!("failed to generate account code: {error}"),
        )
    })?;
    Ok(format!("account-{:016x}", u64::from_be_bytes(bytes)))
}

fn create_command(
    subject: sdkwork_cloudrouter_router_service::ports::AdminUpstreamSubject,
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
        default_base_url: optional_https_base_url(
            request.default_base_url,
            "defaultBaseUrl",
            request.environment.unwrap_or(1),
        )?,
        protocols: account_protocol_configs(request.protocols)?,
        account_code: match request.account_code {
            Some(value) => required_text(value, "accountCode", MAX_CODE_LENGTH)?,
            None => generate_account_code()?,
        },
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
        billing_mode: normalize_billing_mode(request.billing_mode.as_deref()),
        model_blacklist: model_list("account", request.model_blacklist)?,
        model_whitelist: model_list("account", request.model_whitelist)?,
        api_key: optional_text(request.api_key, "apiKey", MAX_SECRET_LENGTH)?,
        requested_at: requested_at(),
    })
}

/// 账号级协议覆盖：与供应商 `protocols` 结构一致，但可空（0 个 = 继承供应商配置）。
/// 上限 MAX_PROTOCOLS 个，protocolCode 必须可解析且不重复。
fn account_protocol_configs(
    inputs: Option<Vec<ProtocolConfigInput>>,
) -> RequestResult<Vec<AdminLlmProtocolConfig>> {
    let Some(inputs) = inputs else {
        return Ok(Vec::new());
    };
    if inputs.len() > MAX_PROTOCOLS {
        return Err(problem_keyed(
            SdkWorkResultCode::InvalidParameter,
            "validation.admin.upstream.account.protocols.maxItems",
            serde_json::json!({ "field": "protocols", "max": MAX_PROTOCOLS }),
            format!("protocols must contain at most {MAX_PROTOCOLS} items"),
        ));
    }
    let mut seen = std::collections::HashSet::new();
    let mut configs = Vec::with_capacity(inputs.len());
    for input in inputs {
        let config = parse_protocol_config(input)?;
        if !seen.insert(config.protocol_code) {
            return Err(problem_keyed(
                SdkWorkResultCode::InvalidParameter,
                "validation.admin.upstream.account.protocols.unique",
                serde_json::json!({ "protocolCode": config.protocol_code.as_str() }),
                "protocols must not contain duplicate protocolCode entries",
            ));
        }
        configs.push(config);
    }
    Ok(configs)
}

fn deserialize_preferred_endpoint<'de, D>(
    deserializer: D,
) -> Result<Option<Option<String>>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    // 普通 serde 的 Option<Option<T>> 无法区分「字段缺省」与「显式 null」（两者都折叠为外层 None），
    // 这里自定义反序列化：null → Some(None)（显式清除）；字符串 → Some(Some(id))（设置）；
    // 字段缺省由 #[serde(default)] 提供外层 None（保持当前值）。
    Option::<String>::deserialize(deserializer).map(Some)
}

fn update_command(
    subject: sdkwork_cloudrouter_router_service::ports::AdminUpstreamSubject,
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
        preferred_endpoint_id: match request.preferred_endpoint_id {
            // 字段缺省：保持当前首选端点（不视为新绑定，避免既有失效引用阻塞无关字段的编辑）
            None => existing.preferred_endpoint_id,
            // 显式 null：清除首选端点，恢复为按可用端点自动路由
            Some(None) => None,
            Some(Some(value)) => Some(parse_id(value, "preferredEndpointId")?),
        },
        default_base_url: match request.default_base_url {
            // 缺省：保持当前账号默认 Base URL；空串 = 清除（继承供应商默认）
            Some(value) => optional_https_base_url(
                Some(value),
                "defaultBaseUrl",
                request
                    .environment
                    .unwrap_or(existing.environment.unwrap_or(1)),
            )?,
            None => existing.default_base_url,
        },
        protocols: match request.protocols {
            // 缺省：保持当前协议覆盖；空数组 = 清除全部协议覆盖（继承供应商配置）
            Some(inputs) => account_protocol_configs(Some(inputs))?,
            None => existing.protocols,
        },
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
        billing_mode: normalize_billing_mode(Some(
            request
                .billing_mode
                .as_deref()
                .unwrap_or(existing.billing_mode.as_str()),
        )),
        model_blacklist: match request.model_blacklist {
            Some(values) => model_list("account", Some(values))?,
            None => existing.model_blacklist,
        },
        model_whitelist: match request.model_whitelist {
            Some(values) => model_list("account", Some(values))?,
            None => existing.model_whitelist,
        },
        api_key: None,
        requested_at: requested_at(),
    })
}

fn credential_command(
    subject: sdkwork_cloudrouter_router_service::ports::AdminUpstreamSubject,
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
        return Err(problem_keyed(
            SdkWorkResultCode::InvalidParameter,
            "validation.admin.upstream.credential.expiresAt.timestamp",
            serde_json::Value::Null,
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
        sdkwork_cloudrouter_router_service::domain::DecimalValue::parse(&value).map_err(|_| {
            problem_keyed(
                SdkWorkResultCode::InvalidParameter,
                "validation.admin.upstream.field.nonNegativeDecimal",
                serde_json::json!({ "field": field }),
                format!("{field} must be a non-negative decimal"),
            )
        })?;
    if parsed < sdkwork_cloudrouter_router_service::domain::DecimalValue::ZERO {
        return Err(problem_keyed(
            SdkWorkResultCode::InvalidParameter,
            "validation.admin.upstream.field.nonNegative",
            serde_json::json!({ "field": field }),
            format!("{field} must be non-negative"),
        ));
    }
    Ok(value)
}

fn status(value: i32) -> RequestResult<i32> {
    if !matches!(value, 0 | 1) {
        return Err(problem_keyed(
            SdkWorkResultCode::InvalidParameter,
            "validation.admin.upstream.status.enum",
            serde_json::json!({ "allowed": [0, 1] }),
            "status must be 0 or 1",
        ));
    }
    Ok(value)
}

fn non_negative_i64(value: Option<i64>, field: &str) -> RequestResult<Option<i64>> {
    if value.is_some_and(|value| value < 0) {
        return Err(problem_keyed(
            SdkWorkResultCode::InvalidParameter,
            "validation.admin.upstream.field.nonNegative",
            serde_json::json!({ "field": field }),
            format!("{field} must be non-negative"),
        ));
    }
    Ok(value)
}

fn non_negative_i32(value: i32, field: &str) -> RequestResult<i32> {
    if value < 0 {
        return Err(problem_keyed(
            SdkWorkResultCode::InvalidParameter,
            "validation.admin.upstream.field.nonNegative",
            serde_json::json!({ "field": field }),
            format!("{field} must be non-negative"),
        ));
    }
    Ok(value)
}

fn positive_i32(value: Option<i32>, field: &str) -> RequestResult<Option<i32>> {
    if value.is_some_and(|value| value <= 0) {
        return Err(problem_keyed(
            SdkWorkResultCode::InvalidParameter,
            "validation.admin.upstream.field.positive",
            serde_json::json!({ "field": field }),
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
            default_base_url: item.default_base_url,
            protocols: item.protocols,
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
            billing_mode: item.billing_mode,
            model_blacklist: item
                .model_blacklist
                .into_iter()
                .map(|entry| ModelListEntryResponse {
                    vendor_code: entry.vendor_code,
                    models: entry.models,
                })
                .collect(),
            model_whitelist: item
                .model_whitelist
                .into_iter()
                .map(|entry| ModelListEntryResponse {
                    vendor_code: entry.vendor_code,
                    models: entry.models,
                })
                .collect(),
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
            secret: item.secret,
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
    use sdkwork_cloudrouter_router_service::ports::LlmProtocolCode;

    #[test]
    fn generated_account_code_matches_expected_format() {
        let code = generate_account_code().unwrap();
        assert!(code.starts_with("account-"));
        assert_eq!("account-".len() + 16, code.len());
        assert!(code["account-".len()..]
            .chars()
            .all(|c| c.is_ascii_hexdigit()));
    }

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
            secret: None,
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

    #[test]
    fn update_request_distinguishes_absent_null_and_value_preferred_endpoint() {
        let absent = serde_json::from_str::<AccountUpdateRequest>("{}").expect("empty update");
        assert_eq!(None, absent.preferred_endpoint_id);

        let cleared =
            serde_json::from_str::<AccountUpdateRequest>(r#"{"preferredEndpointId":null}"#)
                .expect("explicit null update");
        assert_eq!(Some(None), cleared.preferred_endpoint_id);

        let rebound =
            serde_json::from_str::<AccountUpdateRequest>(r#"{"preferredEndpointId":"42"}"#)
                .expect("rebound update");
        assert_eq!(Some(Some("42".to_owned())), rebound.preferred_endpoint_id);
    }

    #[test]
    fn update_command_resolves_preferred_endpoint_keep_clear_and_set() {
        let subject = sdkwork_cloudrouter_router_service::ports::AdminUpstreamSubject {
            tenant_id: 1,
            organization_id: 2,
            operator_id: 3,
            operator_type: 1,
        };
        let existing = AdminUpstreamAccountItem {
            id: 9,
            uuid: "account-uuid".to_owned(),
            supplier_id: 11,
            supplier_code: "openai".to_owned(),
            preferred_endpoint_id: Some(101),
            default_base_url: Some("https://api.openai.com/v1".to_owned()),
            protocols: vec![AdminLlmProtocolConfig {
                protocol_code: LlmProtocolCode::OpenaiChatCompletions,
                base_url: "https://api.openai.com/v1".to_owned(),
            }],
            account_code: "openai-main".to_owned(),
            account_name: "OpenAI main".to_owned(),
            account_type: "standard".to_owned(),
            auth_method_code: "api-key".to_owned(),
            external_account_id: None,
            environment: Some(1),
            region_code: None,
            quota_limit: None,
            quota_used: None,
            upstream_balance_amount: None,
            upstream_balance_currency: None,
            contract_cost_multiplier: "1.000000000000".to_owned(),
            rpm_limit: None,
            timeout_ms: None,
            billing_mode: "prepay".to_owned(),
            model_blacklist: Vec::new(),
            model_whitelist: Vec::new(),
            health_status: 1,
            status: 1,
            version: 3,
            updated_at: "2026-07-28T12:00:00.000Z".to_owned(),
        };

        let kept = update_command(
            subject.clone(),
            existing.clone(),
            3,
            AccountUpdateRequest {
                supplier_id: None,
                preferred_endpoint_id: None,
                default_base_url: None,
                protocols: None,
                account_name: None,
                account_type: None,
                auth_method_code: None,
                external_account_id: None,
                environment: None,
                region_code: None,
                quota_limit: None,
                upstream_balance_currency: None,
                contract_cost_multiplier: None,
                rpm_limit: None,
                timeout_ms: None,
                status: None,

                billing_mode: None,
                model_blacklist: None,
                model_whitelist: None,
            },
        )
        .expect("keep preferred endpoint");
        assert_eq!(Some(101), kept.preferred_endpoint_id);
        assert_eq!(
            Some("https://api.openai.com/v1".to_owned()),
            kept.default_base_url
        );
        assert_eq!(1, kept.protocols.len());

        let cleared = update_command(
            subject.clone(),
            existing.clone(),
            3,
            AccountUpdateRequest {
                supplier_id: None,
                preferred_endpoint_id: Some(None),
                default_base_url: Some(String::new()),
                protocols: Some(Vec::new()),
                account_name: None,
                account_type: None,
                auth_method_code: None,
                external_account_id: None,
                environment: None,
                region_code: None,
                quota_limit: None,
                upstream_balance_currency: None,
                contract_cost_multiplier: None,
                rpm_limit: None,
                timeout_ms: None,
                status: None,

                billing_mode: None,
                model_blacklist: None,
                model_whitelist: None,
            },
        )
        .expect("clear preferred endpoint");
        assert_eq!(None, cleared.preferred_endpoint_id);
        assert_eq!(None, cleared.default_base_url);
        assert!(cleared.protocols.is_empty());

        let rebound = update_command(
            subject,
            existing,
            3,
            AccountUpdateRequest {
                supplier_id: None,
                preferred_endpoint_id: Some(Some("202".to_owned())),
                default_base_url: None,
                protocols: None,
                account_name: None,
                account_type: None,
                auth_method_code: None,
                external_account_id: None,
                environment: None,
                region_code: None,
                quota_limit: None,
                upstream_balance_currency: None,
                contract_cost_multiplier: None,
                rpm_limit: None,
                timeout_ms: None,
                status: None,

                billing_mode: None,
                model_blacklist: None,
                model_whitelist: None,
            },
        )
        .expect("rebind preferred endpoint");
        assert_eq!(Some(202), rebound.preferred_endpoint_id);
    }

    #[test]
    fn account_protocol_configs_accepts_empty_and_valid_overrides() {
        assert!(account_protocol_configs(None).unwrap().is_empty());
        assert!(account_protocol_configs(Some(Vec::new()))
            .unwrap()
            .is_empty());
        let configs = account_protocol_configs(Some(vec![
            ProtocolConfigInput {
                protocol_code: "openai_chat_completions".to_owned(),
                base_url: "https://relay.example.com/v1".to_owned(),
            },
            ProtocolConfigInput {
                protocol_code: "anthropic_messages".to_owned(),
                base_url: "https://relay.example.com/anthropic".to_owned(),
            },
        ]))
        .unwrap();
        assert_eq!(2, configs.len());
        assert_eq!(
            LlmProtocolCode::OpenaiChatCompletions,
            configs[0].protocol_code
        );
        assert_eq!(LlmProtocolCode::AnthropicMessages, configs[1].protocol_code);
    }

    #[test]
    fn account_protocol_configs_rejects_unsupported_duplicate_and_oversized() {
        let unsupported = account_protocol_configs(Some(vec![ProtocolConfigInput {
            protocol_code: "azure_openai".to_owned(),
            base_url: "https://azure.example.com".to_owned(),
        }]))
        .unwrap_err();
        assert_eq!(
            StatusCode::BAD_REQUEST,
            unsupported.into_response().status()
        );

        let duplicate = account_protocol_configs(Some(vec![
            ProtocolConfigInput {
                protocol_code: "openai_responses".to_owned(),
                base_url: "https://a.example.com".to_owned(),
            },
            ProtocolConfigInput {
                protocol_code: "openai_responses".to_owned(),
                base_url: "https://b.example.com".to_owned(),
            },
        ]))
        .unwrap_err();
        assert_eq!(StatusCode::BAD_REQUEST, duplicate.into_response().status());

        let oversized = account_protocol_configs(Some(
            (0..=MAX_PROTOCOLS)
                .map(|index| ProtocolConfigInput {
                    protocol_code: match index % 3 {
                        0 => "openai_chat_completions".to_owned(),
                        1 => "openai_responses".to_owned(),
                        _ => "anthropic_messages".to_owned(),
                    },
                    base_url: format!("https://{index}.example.com"),
                })
                .collect(),
        ))
        .unwrap_err();
        assert_eq!(StatusCode::BAD_REQUEST, oversized.into_response().status());
    }

    #[test]
    fn create_command_validates_default_base_url_https() {
        let subject = sdkwork_cloudrouter_router_service::ports::AdminUpstreamSubject {
            tenant_id: 1,
            organization_id: 2,
            operator_id: 3,
            operator_type: 1,
        };
        let http_rejected = create_command(
            subject.clone(),
            "account-uuid".to_owned(),
            AccountCreateRequest {
                supplier_id: "11".to_owned(),
                preferred_endpoint_id: None,
                default_base_url: Some("http://relay.example.com/v1".to_owned()),
                protocols: None,
                account_code: None,
                account_name: "HTTP relay".to_owned(),
                account_type: None,
                auth_method_code: "api-key".to_owned(),
                external_account_id: None,
                environment: Some(1),
                region_code: None,
                quota_limit: None,
                upstream_balance_currency: None,
                contract_cost_multiplier: None,
                rpm_limit: None,
                timeout_ms: None,
                status: None,

                billing_mode: None,
                model_blacklist: None,
                model_whitelist: None,
                api_key: None,
            },
        )
        .unwrap_err();
        assert_eq!(
            StatusCode::BAD_REQUEST,
            http_rejected.into_response().status()
        );

        let accepted = create_command(
            subject,
            "account-uuid".to_owned(),
            AccountCreateRequest {
                supplier_id: "11".to_owned(),
                preferred_endpoint_id: None,
                default_base_url: Some("https://relay.example.com/v1".to_owned()),
                protocols: Some(vec![ProtocolConfigInput {
                    protocol_code: "openai_chat_completions".to_owned(),
                    base_url: "https://relay.example.com/chat".to_owned(),
                }]),
                account_code: None,
                account_name: "Relay account".to_owned(),
                account_type: None,
                auth_method_code: "api-key".to_owned(),
                external_account_id: None,
                environment: Some(1),
                region_code: None,
                quota_limit: None,
                upstream_balance_currency: None,
                contract_cost_multiplier: None,
                rpm_limit: None,
                timeout_ms: None,
                status: None,
                billing_mode: None,
                model_blacklist: None,
                model_whitelist: None,
                api_key: None,
            },
        )
        .expect("create command with account base url config");
        assert_eq!(
            Some("https://relay.example.com/v1".to_owned()),
            accepted.default_base_url
        );
        assert_eq!(1, accepted.protocols.len());
        assert_eq!(
            "https://relay.example.com/chat",
            accepted.protocols[0].base_url
        );
    }
}
