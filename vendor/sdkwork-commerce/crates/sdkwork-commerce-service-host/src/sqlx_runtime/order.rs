use sdkwork_commerce_contract_service::CommerceServiceError;
use sdkwork_commerce_order_service::{
    CheckoutLineInput, CheckoutSessionDetailQuery, CreateCheckoutQuoteCommand,
    CreateCheckoutSessionCommand, CreateOwnerOrderCommand,
};
use sdkwork_commerce_storage_repository_sqlx::{
    PostgresCommerceOrderStore, SqliteCommerceOrderStore,
};

use crate::{CommerceOrderRuntimeStore, CommerceRuntimeServiceRequest};

use super::{
    block_on_commerce_async, fallback_request_no, json_string, parse_body_json, string_field,
    CommerceSqlxRuntimePool,
};

#[derive(Clone, Debug)]
pub struct SqlxCommerceOrderRuntimeStore {
    pool: CommerceSqlxRuntimePool,
}

impl SqlxCommerceOrderRuntimeStore {
    pub fn new(pool: CommerceSqlxRuntimePool) -> Self {
        Self { pool }
    }

    fn dispatch(
        &self,
        request: &CommerceRuntimeServiceRequest,
    ) -> Result<String, CommerceServiceError> {
        match request.execution_plan.operation_id {
            "checkout.sessions.create" => self.create_checkout_session(request),
            "checkout.sessions.retrieve" => self.retrieve_checkout_session(request),
            "checkout.sessions.quotes.create" => self.create_checkout_quote(request),
            "checkout.sessions.orders.create" => self.create_checkout_order(request),
            "commerceReports.orderRevenue.list" => {
                json_string(serde_json::json!({ "reports": [] }))
            }
            other => Err(CommerceServiceError::unsupported_capability(format!(
                "order sqlx runtime store does not support operation: {other}"
            ))),
        }
    }

    fn create_checkout_session(
        &self,
        request: &CommerceRuntimeServiceRequest,
    ) -> Result<String, CommerceServiceError> {
        let body = parse_body_json(&request.body_json)?;
        let context = request.context();
        let idempotency_key = request.idempotency_key()?;
        let request_no = fallback_request_no(&context.user_id, "checkout-session", idempotency_key);
        let lines = parse_checkout_lines(&body)?;
        let currency_code = string_field(&body, &["currencyCode", "currency_code"])
            .unwrap_or_else(|| "CNY".to_owned());
        let command = CreateCheckoutSessionCommand::new(
            &context.tenant_id,
            context.organization_id.as_deref(),
            &context.user_id,
            &currency_code,
            lines,
            &request_no,
            idempotency_key,
        )?;
        let session = match &self.pool {
            CommerceSqlxRuntimePool::Sqlite(pool) => block_on_commerce_async(async {
                SqliteCommerceOrderStore::new(pool.clone())
                    .create_checkout_session(command)
                    .await
            })?,
            CommerceSqlxRuntimePool::Postgres(pool) => block_on_commerce_async(async {
                PostgresCommerceOrderStore::new(pool.clone())
                    .create_checkout_session(command)
                    .await
            })?,
        };
        json_string(map_checkout_session(session))
    }

    fn retrieve_checkout_session(
        &self,
        request: &CommerceRuntimeServiceRequest,
    ) -> Result<String, CommerceServiceError> {
        let body = parse_body_json(&request.body_json)?;
        let context = request.context();
        let checkout_session_id =
            string_field(&body, &["checkoutSessionId", "checkout_session_id"])
                .ok_or_else(|| CommerceServiceError::validation("checkoutSessionId is required"))?;
        let query = CheckoutSessionDetailQuery::new(
            &context.tenant_id,
            context.organization_id.as_deref(),
            &context.user_id,
            &checkout_session_id,
        )?;
        let session = match &self.pool {
            CommerceSqlxRuntimePool::Sqlite(pool) => block_on_commerce_async(async {
                SqliteCommerceOrderStore::new(pool.clone())
                    .retrieve_checkout_session(query)
                    .await
            })?,
            CommerceSqlxRuntimePool::Postgres(pool) => block_on_commerce_async(async {
                PostgresCommerceOrderStore::new(pool.clone())
                    .retrieve_checkout_session(query)
                    .await
            })?,
        };
        let Some(session) = session else {
            return Err(CommerceServiceError::not_found(
                "checkout session was not found",
            ));
        };
        json_string(map_checkout_session(session))
    }

    fn create_checkout_quote(
        &self,
        request: &CommerceRuntimeServiceRequest,
    ) -> Result<String, CommerceServiceError> {
        let body = parse_body_json(&request.body_json)?;
        let context = request.context();
        let checkout_session_id =
            string_field(&body, &["checkoutSessionId", "checkout_session_id"])
                .ok_or_else(|| CommerceServiceError::validation("checkoutSessionId is required"))?;
        let idempotency_key = request.idempotency_key()?;
        let request_no =
            fallback_request_no(&context.user_id, &checkout_session_id, idempotency_key);
        let command = CreateCheckoutQuoteCommand::new(
            &context.tenant_id,
            context.organization_id.as_deref(),
            &context.user_id,
            &checkout_session_id,
            &request_no,
            idempotency_key,
        )?;
        let quote = match &self.pool {
            CommerceSqlxRuntimePool::Sqlite(pool) => block_on_commerce_async(async {
                SqliteCommerceOrderStore::new(pool.clone())
                    .create_checkout_quote(command)
                    .await
            })?,
            CommerceSqlxRuntimePool::Postgres(pool) => block_on_commerce_async(async {
                PostgresCommerceOrderStore::new(pool.clone())
                    .create_checkout_quote(command)
                    .await
            })?,
        };
        json_string(serde_json::json!({
            "checkoutSessionId": quote.checkout_session_id,
            "quoteId": quote.quote_id,
            "currencyCode": quote.currency_code,
            "originalAmount": quote.original_amount.as_str(),
            "discountAmount": quote.discount_amount.as_str(),
            "payableAmount": quote.payable_amount.as_str(),
        }))
    }

    fn create_checkout_order(
        &self,
        request: &CommerceRuntimeServiceRequest,
    ) -> Result<String, CommerceServiceError> {
        let body = parse_body_json(&request.body_json)?;
        let context = request.context();
        let checkout_session_id =
            string_field(&body, &["checkoutSessionId", "checkout_session_id"])
                .ok_or_else(|| CommerceServiceError::validation("checkoutSessionId is required"))?;
        let idempotency_key = request.idempotency_key()?;
        let request_no =
            fallback_request_no(&context.user_id, &checkout_session_id, idempotency_key);
        let command = CreateOwnerOrderCommand::new(
            &context.tenant_id,
            context.organization_id.as_deref(),
            &context.user_id,
            &checkout_session_id,
            &request_no,
            idempotency_key,
        )?;
        let outcome = match &self.pool {
            CommerceSqlxRuntimePool::Sqlite(pool) => block_on_commerce_async(async {
                SqliteCommerceOrderStore::new(pool.clone())
                    .create_owner_order(command)
                    .await
            })?,
            CommerceSqlxRuntimePool::Postgres(pool) => block_on_commerce_async(async {
                PostgresCommerceOrderStore::new(pool.clone())
                    .create_owner_order(command)
                    .await
            })?,
        };
        json_string(serde_json::json!({
            "orderId": outcome.order_id,
            "orderNo": outcome.order_sn,
            "status": outcome.status,
            "totalAmount": outcome.total_amount.as_str(),
        }))
    }
}

impl CommerceOrderRuntimeStore for SqlxCommerceOrderRuntimeStore {
    fn handle_order_operation(
        &self,
        request: &CommerceRuntimeServiceRequest,
    ) -> Result<String, CommerceServiceError> {
        self.dispatch(request)
    }
}

fn parse_checkout_lines(
    body: &serde_json::Value,
) -> Result<Vec<CheckoutLineInput>, CommerceServiceError> {
    let lines = body
        .get("lines")
        .or_else(|| body.get("items"))
        .and_then(serde_json::Value::as_array)
        .ok_or_else(|| {
            CommerceServiceError::validation("checkout session requires at least one line")
        })?;
    if lines.is_empty() {
        return Err(CommerceServiceError::validation(
            "checkout session requires at least one line",
        ));
    }
    lines
        .iter()
        .map(|line| {
            let sku_id = string_field(line, &["skuId", "sku_id"]).ok_or_else(|| {
                CommerceServiceError::validation("checkout line skuId is required")
            })?;
            let quantity = super::i64_field(line, &["quantity"]).unwrap_or(1).max(1);
            CheckoutLineInput::new(&sku_id, quantity)
        })
        .collect()
}

fn map_checkout_session(
    session: sdkwork_commerce_order_service::CheckoutSessionView,
) -> serde_json::Value {
    serde_json::json!({
        "checkoutSessionId": session.checkout_session_id,
        "status": session.status,
        "currencyCode": session.currency_code,
        "originalAmount": session.original_amount.as_str(),
        "discountAmount": session.discount_amount.as_str(),
        "payableAmount": session.payable_amount.as_str(),
        "quoteId": session.quote_id,
    })
}
