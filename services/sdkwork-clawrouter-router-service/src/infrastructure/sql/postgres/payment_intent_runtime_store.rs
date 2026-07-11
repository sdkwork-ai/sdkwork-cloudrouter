use sqlx::{PgPool, Row};

use crate::application::{
    PaymentIntentRuntimeRecord, PaymentIntentRuntimeStore, PaymentIntentRuntimeStoreFuture,
    PaymentIntentStatus, PaymentOperationAttemptRecord, PaymentRefundAttemptRecord,
    PaymentRefundEventRecord, PaymentRefundItemRecord, PaymentRefundRuntimeRecord,
    PaymentRefundRuntimeStore, PaymentRefundRuntimeStoreFuture, PaymentRefundStatus,
    PaymentRouteDecisionRecord,
};
use crate::domain::{DomainError, DomainResult};

#[derive(Debug, Clone)]
pub struct PostgresPaymentIntentRuntimeStore {
    pool: PgPool,
}

impl PostgresPaymentIntentRuntimeStore {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

impl PaymentIntentRuntimeStore for PostgresPaymentIntentRuntimeStore {
    fn load_by_idempotency(
        &self,
        tenant_id: String,
        idempotency_key: String,
    ) -> PaymentIntentRuntimeStoreFuture<'_, Option<PaymentIntentRuntimeRecord>> {
        let pool = self.pool.clone();
        Box::pin(
            async move { load_intent_by_idempotency(&pool, &tenant_id, &idempotency_key).await },
        )
    }

    fn load_by_id(
        &self,
        tenant_id: String,
        id: String,
    ) -> PaymentIntentRuntimeStoreFuture<'_, Option<PaymentIntentRuntimeRecord>> {
        let pool = self.pool.clone();
        Box::pin(async move { load_intent_by_id(&pool, &tenant_id, &id).await })
    }

    fn insert_payment_intent(
        &self,
        intent: PaymentIntentRuntimeRecord,
        route_decision: PaymentRouteDecisionRecord,
    ) -> PaymentIntentRuntimeStoreFuture<'_, PaymentIntentRuntimeRecord> {
        let pool = self.pool.clone();
        Box::pin(async move { insert_payment_intent(&pool, intent, route_decision).await })
    }

    fn insert_operation_attempt(
        &self,
        attempt: PaymentOperationAttemptRecord,
    ) -> PaymentIntentRuntimeStoreFuture<'_, PaymentOperationAttemptRecord> {
        let pool = self.pool.clone();
        Box::pin(async move { insert_operation_attempt(&pool, attempt).await })
    }

    fn finish_operation_attempt(
        &self,
        id: String,
        status: String,
        response_digest: Option<String>,
        provider_error_code: Option<String>,
        provider_error_message: Option<String>,
        completed_at: String,
    ) -> PaymentIntentRuntimeStoreFuture<'_, PaymentOperationAttemptRecord> {
        let pool = self.pool.clone();
        Box::pin(async move {
            finish_operation_attempt(
                &pool,
                &id,
                &status,
                response_digest,
                provider_error_code,
                provider_error_message,
                &completed_at,
            )
            .await
        })
    }
}

impl PaymentRefundRuntimeStore for PostgresPaymentIntentRuntimeStore {
    fn load_refund_by_idempotency(
        &self,
        tenant_id: String,
        idempotency_key: String,
    ) -> PaymentRefundRuntimeStoreFuture<'_, Option<PaymentRefundRuntimeRecord>> {
        let pool = self.pool.clone();
        Box::pin(
            async move { load_refund_by_idempotency(&pool, &tenant_id, &idempotency_key).await },
        )
    }

    fn load_refund_by_id(
        &self,
        tenant_id: String,
        id: String,
    ) -> PaymentRefundRuntimeStoreFuture<'_, Option<PaymentRefundRuntimeRecord>> {
        let pool = self.pool.clone();
        Box::pin(async move { load_refund_by_id(&pool, &tenant_id, &id).await })
    }

    fn insert_refund(
        &self,
        refund: PaymentRefundRuntimeRecord,
        attempt: PaymentRefundAttemptRecord,
        items: Vec<PaymentRefundItemRecord>,
    ) -> PaymentRefundRuntimeStoreFuture<'_, PaymentRefundRuntimeRecord> {
        let pool = self.pool.clone();
        Box::pin(async move { insert_refund(&pool, refund, attempt, items).await })
    }

    fn finish_refund_attempt(
        &self,
        id: String,
        status: String,
        provider_refund_id: Option<String>,
        failure_code: Option<String>,
        failure_message: Option<String>,
        finished_at: String,
    ) -> PaymentRefundRuntimeStoreFuture<'_, PaymentRefundAttemptRecord> {
        let pool = self.pool.clone();
        Box::pin(async move {
            finish_refund_attempt(
                &pool,
                &id,
                &status,
                provider_refund_id,
                failure_code,
                failure_message,
                &finished_at,
            )
            .await
        })
    }

    fn finish_refund(
        &self,
        id: String,
        status: PaymentRefundStatus,
        updated_at: String,
        event: PaymentRefundEventRecord,
    ) -> PaymentRefundRuntimeStoreFuture<'_, PaymentRefundRuntimeRecord> {
        let pool = self.pool.clone();
        Box::pin(async move { finish_refund(&pool, &id, status, &updated_at, event).await })
    }
}

async fn load_intent_by_idempotency(
    pool: &PgPool,
    tenant_id: &str,
    idempotency_key: &str,
) -> DomainResult<Option<PaymentIntentRuntimeRecord>> {
    let row = sqlx::query(
        r#"
        SELECT id, tenant_id, organization_id, owner_user_id, merchant_order_no, subject,
               provider_code, payment_method, scene_code, amount, currency_code, status,
               idempotency_key, created_at::text AS created_at,
               updated_at::text AS updated_at
        FROM commerce_payment_intent
        WHERE tenant_id = $1
          AND idempotency_key = $2
        LIMIT 1
        "#,
    )
    .bind(tenant_id)
    .bind(idempotency_key)
    .fetch_optional(pool)
    .await
    .map_err(|error| store_error("failed to load payment intent by idempotency", error))?;
    row.map(|row| intent_from_row(&row)).transpose()
}

async fn load_intent_by_id(
    pool: &PgPool,
    tenant_id: &str,
    id: &str,
) -> DomainResult<Option<PaymentIntentRuntimeRecord>> {
    let row = sqlx::query(
        r#"
        SELECT id, tenant_id, organization_id, owner_user_id, merchant_order_no, subject,
               provider_code, payment_method, scene_code, amount, currency_code, status,
               idempotency_key, created_at::text AS created_at,
               updated_at::text AS updated_at
        FROM commerce_payment_intent
        WHERE tenant_id = $1
          AND id = $2
        LIMIT 1
        "#,
    )
    .bind(tenant_id)
    .bind(id)
    .fetch_optional(pool)
    .await
    .map_err(|error| store_error("failed to load payment intent by id", error))?;
    row.map(|row| intent_from_row(&row)).transpose()
}

async fn insert_payment_intent(
    pool: &PgPool,
    intent: PaymentIntentRuntimeRecord,
    route_decision: PaymentRouteDecisionRecord,
) -> DomainResult<PaymentIntentRuntimeRecord> {
    let mut tx = pool
        .begin()
        .await
        .map_err(|error| store_error("failed to begin payment intent transaction", error))?;
    sqlx::query(
        r#"
        INSERT INTO commerce_payment_intent
            (id, tenant_id, organization_id, owner_user_id, order_id, merchant_order_no, subject, provider, provider_code, payment_method, scene_code, amount, currency_code, status, request_no, idempotency_key, metadata_json, provider_native_json, next_action_json, captured_amount, refunded_amount, created_at, updated_at)
        VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NULL, NULL, $18, $19, $20, $21)
        "#,
    )
    .bind(&intent.id)
    .bind(&intent.tenant_id)
    .bind(intent.organization_id.as_deref())
    .bind(&intent.owner_user_id)
    .bind(&intent.merchant_order_no)
    .bind(&intent.merchant_order_no)
    .bind(&intent.subject)
    .bind(&intent.provider_code)
    .bind(&intent.provider_code)
    .bind(&intent.payment_method)
    .bind(&intent.scene)
    .bind(&intent.amount)
    .bind(&intent.currency_code)
    .bind(intent.status.as_str())
    .bind(&intent.merchant_order_no)
    .bind(&intent.idempotency_key)
    .bind("{}")
    .bind("0.00")
    .bind("0.00")
    .bind(&intent.created_at)
    .bind(&intent.updated_at)
    .execute(&mut *tx)
    .await
    .map_err(|error| store_error("failed to insert payment intent", error))?;
    sqlx::query(
        r#"
        INSERT INTO commerce_payment_attempt
            (id, tenant_id, organization_id, owner_user_id, payment_intent_id, order_id, provider, out_trade_no, amount, currency_code, status, callback_payload, created_at, paid_at, updated_at)
        VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NULL, $12, NULL, $13)
        "#,
    )
    .bind(&route_decision.payment_attempt_id)
    .bind(&intent.tenant_id)
    .bind(intent.organization_id.as_deref())
    .bind(&intent.owner_user_id)
    .bind(&intent.id)
    .bind(&intent.merchant_order_no)
    .bind(&intent.provider_code)
    .bind(&intent.merchant_order_no)
    .bind(&intent.amount)
    .bind(&intent.currency_code)
    .bind(intent.status.as_str())
    .bind(&intent.created_at)
    .bind(&intent.updated_at)
    .execute(&mut *tx)
    .await
    .map_err(|error| store_error("failed to insert payment attempt", error))?;
    sqlx::query(
        r#"
        INSERT INTO commerce_payment_route_decision
            (id, tenant_id, organization_id, payment_intent_id, payment_attempt_id, route_rule_id, channel_id, provider_code, provider_account_id, method_code, scene_code, country_code, currency_code, amount, risk_level, decision_reason, fallback_from_channel_id, created_at)
        VALUES
            ($1, $2, $3, $4, $5, NULL, $6, $7, $8, $9, $10, NULL, $11, $12, NULL, $13, NULL, $14)
        "#,
    )
    .bind(&route_decision.id)
    .bind(&route_decision.tenant_id)
    .bind(route_decision.organization_id.as_deref())
    .bind(&route_decision.payment_intent_id)
    .bind(&route_decision.payment_attempt_id)
    .bind(&route_decision.channel_id)
    .bind(&route_decision.provider_code)
    .bind(route_decision.provider_account_id.as_deref())
    .bind(&route_decision.method_code)
    .bind(&route_decision.scene_code)
    .bind(&route_decision.currency_code)
    .bind(&route_decision.amount)
    .bind(&route_decision.decision_reason)
    .bind(&route_decision.created_at)
    .execute(&mut *tx)
    .await
    .map_err(|error| store_error("failed to insert payment route decision", error))?;
    tx.commit()
        .await
        .map_err(|error| store_error("failed to commit payment intent transaction", error))?;
    Ok(intent)
}

async fn insert_operation_attempt(
    pool: &PgPool,
    attempt: PaymentOperationAttemptRecord,
) -> DomainResult<PaymentOperationAttemptRecord> {
    sqlx::query(
        r#"
        INSERT INTO commerce_payment_operation_attempt
            (id, tenant_id, organization_id, operation_no, provider_code, provider_account_id, channel_id, operation_code, sdkwork_resource_type, sdkwork_resource_id, idempotency_key, request_digest, response_digest, native_request_id, native_trade_id, native_refund_id, http_status, provider_error_code, provider_error_message, retryable, status, started_at, completed_at, created_at)
        VALUES
            ($1, $2, $3, $4, $5, NULL, NULL, $6, $7, $8, $9, $10, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, $11, $12, NULL, $13)
        "#,
    )
    .bind(&attempt.id)
    .bind(&attempt.tenant_id)
    .bind(attempt.organization_id.as_deref())
    .bind(&attempt.operation_no)
    .bind(&attempt.provider_code)
    .bind(attempt.operation.as_code())
    .bind(&attempt.sdkwork_resource_type)
    .bind(&attempt.sdkwork_resource_id)
    .bind(&attempt.idempotency_key)
    .bind(&attempt.request_digest)
    .bind(&attempt.status)
    .bind(&attempt.started_at)
    .bind(&attempt.started_at)
    .execute(pool)
    .await
    .map_err(|error| store_error("failed to insert payment operation attempt", error))?;
    Ok(attempt)
}

async fn finish_operation_attempt(
    pool: &PgPool,
    id: &str,
    status: &str,
    response_digest: Option<String>,
    provider_error_code: Option<String>,
    provider_error_message: Option<String>,
    completed_at: &str,
) -> DomainResult<PaymentOperationAttemptRecord> {
    sqlx::query(
        r#"
        UPDATE commerce_payment_operation_attempt
        SET status = $1,
            response_digest = $2,
            provider_error_code = $3,
            provider_error_message = $4,
            completed_at = $5
        WHERE id = $6
        "#,
    )
    .bind(status)
    .bind(response_digest.as_deref())
    .bind(provider_error_code.as_deref())
    .bind(provider_error_message.as_deref())
    .bind(completed_at)
    .bind(id)
    .execute(pool)
    .await
    .map_err(|error| store_error("failed to finish payment operation attempt", error))?;
    let row = sqlx::query(
        r#"
        SELECT id, tenant_id, organization_id, operation_no, provider_code, operation_code,
               sdkwork_resource_type, sdkwork_resource_id, idempotency_key, request_digest,
               response_digest, provider_error_code, provider_error_message, status,
               started_at::text AS started_at, completed_at::text AS completed_at
        FROM commerce_payment_operation_attempt
        WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_one(pool)
    .await
    .map_err(|error| store_error("failed to reload payment operation attempt", error))?;
    operation_attempt_from_row(&row)
}

async fn load_refund_by_idempotency(
    pool: &PgPool,
    tenant_id: &str,
    idempotency_key: &str,
) -> DomainResult<Option<PaymentRefundRuntimeRecord>> {
    let row = sqlx::query(
        r#"
        SELECT id, tenant_id, organization_id, payment_intent_id, payment_attempt_id, refund_no,
               amount, currency_code, provider_code, reason, status, idempotency_key,
               created_at::text AS created_at, updated_at::text AS updated_at
        FROM commerce_refund
        WHERE tenant_id = $1
          AND idempotency_key = $2
        LIMIT 1
        "#,
    )
    .bind(tenant_id)
    .bind(idempotency_key)
    .fetch_optional(pool)
    .await
    .map_err(|error| store_error("failed to load payment refund by idempotency", error))?;
    if let Some(row) = row {
        let mut refund = refund_from_row(&row)?;
        refund.items = load_refund_items(pool, tenant_id, &refund.id).await?;
        Ok(Some(refund))
    } else {
        Ok(None)
    }
}

async fn load_refund_by_id(
    pool: &PgPool,
    tenant_id: &str,
    id: &str,
) -> DomainResult<Option<PaymentRefundRuntimeRecord>> {
    let row = sqlx::query(
        r#"
        SELECT id, tenant_id, organization_id, payment_intent_id, payment_attempt_id, refund_no,
               amount, currency_code, provider_code, reason, status, idempotency_key,
               created_at::text AS created_at, updated_at::text AS updated_at
        FROM commerce_refund
        WHERE tenant_id = $1
          AND id = $2
        LIMIT 1
        "#,
    )
    .bind(tenant_id)
    .bind(id)
    .fetch_optional(pool)
    .await
    .map_err(|error| store_error("failed to load payment refund by id", error))?;
    if let Some(row) = row {
        let mut refund = refund_from_row(&row)?;
        refund.items = load_refund_items(pool, tenant_id, &refund.id).await?;
        Ok(Some(refund))
    } else {
        Ok(None)
    }
}

async fn insert_refund(
    pool: &PgPool,
    refund: PaymentRefundRuntimeRecord,
    attempt: PaymentRefundAttemptRecord,
    items: Vec<PaymentRefundItemRecord>,
) -> DomainResult<PaymentRefundRuntimeRecord> {
    let mut tx = pool
        .begin()
        .await
        .map_err(|error| store_error("failed to begin payment refund transaction", error))?;
    sqlx::query(
        r#"
        INSERT INTO commerce_refund
            (id, tenant_id, organization_id, payment_intent_id, payment_attempt_id, refund_no, amount, currency_code, provider_code, reason, status, request_no, idempotency_key, created_at, updated_at)
        VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        "#,
    )
    .bind(&refund.id)
    .bind(&refund.tenant_id)
    .bind(refund.organization_id.as_deref())
    .bind(&refund.payment_intent_id)
    .bind(&refund.payment_attempt_id)
    .bind(&refund.merchant_refund_no)
    .bind(&refund.amount)
    .bind(&refund.currency_code)
    .bind(&refund.provider_code)
    .bind(&refund.reason)
    .bind(refund.status.as_str())
    .bind(&refund.merchant_refund_no)
    .bind(&refund.idempotency_key)
    .bind(&refund.created_at)
    .bind(&refund.updated_at)
    .execute(&mut *tx)
    .await
    .map_err(|error| store_error("failed to insert payment refund", error))?;
    sqlx::query(
        r#"
        INSERT INTO commerce_refund_attempt
            (id, tenant_id, organization_id, refund_attempt_no, refund_id, provider_code, provider_account_id, out_refund_no, provider_refund_id, amount, currency_code, status, failure_code, failure_message, submitted_at, succeeded_at, failed_at, created_at, updated_at)
        VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        "#,
    )
    .bind(&attempt.id)
    .bind(&attempt.tenant_id)
    .bind(attempt.organization_id.as_deref())
    .bind(&attempt.refund_attempt_no)
    .bind(&attempt.refund_id)
    .bind(&attempt.provider_code)
    .bind(attempt.provider_account_id.as_deref())
    .bind(&attempt.out_refund_no)
    .bind(attempt.provider_refund_id.as_deref())
    .bind(&attempt.amount)
    .bind(&attempt.currency_code)
    .bind(&attempt.status)
    .bind(attempt.failure_code.as_deref())
    .bind(attempt.failure_message.as_deref())
    .bind(attempt.submitted_at.as_deref())
    .bind(attempt.succeeded_at.as_deref())
    .bind(attempt.failed_at.as_deref())
    .bind(&attempt.created_at)
    .bind(&attempt.updated_at)
    .execute(&mut *tx)
    .await
    .map_err(|error| store_error("failed to insert payment refund attempt", error))?;
    for item in &items {
        sqlx::query(
            r#"
            INSERT INTO commerce_refund_item
                (id, tenant_id, organization_id, refund_id, order_item_id, quantity, refund_amount, tax_refund_amount, shipping_refund_amount, created_at)
            VALUES
                ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            "#,
        )
        .bind(&item.id)
        .bind(&item.tenant_id)
        .bind(item.organization_id.as_deref())
        .bind(&item.refund_id)
        .bind(&item.order_item_id)
        .bind(item.quantity)
        .bind(&item.refund_amount)
        .bind(&item.tax_refund_amount)
        .bind(&item.shipping_refund_amount)
        .bind(&item.created_at)
        .execute(&mut *tx)
        .await
        .map_err(|error| store_error("failed to insert payment refund item", error))?;
    }
    tx.commit()
        .await
        .map_err(|error| store_error("failed to commit payment refund transaction", error))?;
    Ok(refund)
}

async fn load_refund_items(
    pool: &PgPool,
    tenant_id: &str,
    refund_id: &str,
) -> DomainResult<Vec<PaymentRefundItemRecord>> {
    let rows = sqlx::query(
        r#"
        SELECT id, tenant_id, organization_id, refund_id, order_item_id, quantity,
               refund_amount, tax_refund_amount, shipping_refund_amount,
               created_at::text AS created_at
        FROM commerce_refund_item
        WHERE tenant_id = $1
          AND refund_id = $2
        ORDER BY created_at, id
        "#,
    )
    .bind(tenant_id)
    .bind(refund_id)
    .fetch_all(pool)
    .await
    .map_err(|error| store_error("failed to load payment refund items", error))?;
    rows.iter().map(refund_item_from_row).collect()
}

async fn finish_refund_attempt(
    pool: &PgPool,
    id: &str,
    status: &str,
    provider_refund_id: Option<String>,
    failure_code: Option<String>,
    failure_message: Option<String>,
    finished_at: &str,
) -> DomainResult<PaymentRefundAttemptRecord> {
    sqlx::query(
        r#"
        UPDATE commerce_refund_attempt
        SET status = $1,
            provider_refund_id = $2,
            failure_code = $3,
            failure_message = $4,
            succeeded_at = CASE WHEN $1 = 'SUCCEEDED' THEN $5 ELSE succeeded_at END,
            failed_at = CASE WHEN $1 = 'FAILED' THEN $5 ELSE failed_at END,
            updated_at = $5
        WHERE id = $6
           OR refund_id = $6
        "#,
    )
    .bind(status)
    .bind(provider_refund_id.as_deref())
    .bind(failure_code.as_deref())
    .bind(failure_message.as_deref())
    .bind(finished_at)
    .bind(id)
    .execute(pool)
    .await
    .map_err(|error| store_error("failed to finish payment refund attempt", error))?;
    let row = sqlx::query(
        r#"
        SELECT id, tenant_id, organization_id, refund_attempt_no, refund_id, provider_code,
               provider_account_id, out_refund_no, provider_refund_id, amount, currency_code,
               status, failure_code, failure_message, submitted_at::text AS submitted_at,
               succeeded_at::text AS succeeded_at, failed_at::text AS failed_at,
               created_at::text AS created_at, updated_at::text AS updated_at
        FROM commerce_refund_attempt
        WHERE id = $1
           OR refund_id = $1
        LIMIT 1
        "#,
    )
    .bind(id)
    .fetch_one(pool)
    .await
    .map_err(|error| store_error("failed to reload payment refund attempt", error))?;
    refund_attempt_from_row(&row)
}

async fn finish_refund(
    pool: &PgPool,
    id: &str,
    status: PaymentRefundStatus,
    updated_at: &str,
    event: PaymentRefundEventRecord,
) -> DomainResult<PaymentRefundRuntimeRecord> {
    let mut tx = pool
        .begin()
        .await
        .map_err(|error| store_error("failed to begin finish payment refund transaction", error))?;
    sqlx::query(
        r#"
        UPDATE commerce_refund
        SET status = $1,
            updated_at = $2
        WHERE id = $3
        "#,
    )
    .bind(status.as_str())
    .bind(updated_at)
    .bind(id)
    .execute(&mut *tx)
    .await
    .map_err(|error| store_error("failed to finish payment refund", error))?;
    sqlx::query(
        r#"
        INSERT INTO commerce_refund_event
            (id, tenant_id, organization_id, refund_id, event_type, from_status, to_status, reason, created_at)
        VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        "#,
    )
    .bind(&event.id)
    .bind(&event.tenant_id)
    .bind(event.organization_id.as_deref())
    .bind(&event.refund_id)
    .bind(&event.event_type)
    .bind(event.from_status.as_deref())
    .bind(&event.to_status)
    .bind(event.reason.as_deref())
    .bind(&event.created_at)
    .execute(&mut *tx)
    .await
    .map_err(|error| store_error("failed to insert payment refund event", error))?;
    let row = sqlx::query(
        r#"
        SELECT id, tenant_id, organization_id, payment_intent_id, payment_attempt_id, refund_no,
               amount, currency_code, provider_code, reason, status, idempotency_key,
               created_at::text AS created_at, updated_at::text AS updated_at
        FROM commerce_refund
        WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_one(&mut *tx)
    .await
    .map_err(|error| store_error("failed to reload payment refund", error))?;
    let refund = refund_from_row(&row)?;
    tx.commit().await.map_err(|error| {
        store_error("failed to commit finish payment refund transaction", error)
    })?;
    Ok(refund)
}

fn intent_from_row(row: &sqlx::postgres::PgRow) -> DomainResult<PaymentIntentRuntimeRecord> {
    let status = match string_cell(row, "status").as_str() {
        "requires_confirmation" => PaymentIntentStatus::RequiresConfirmation,
        "requires_action" => PaymentIntentStatus::RequiresAction,
        "processing" => PaymentIntentStatus::Processing,
        "succeeded" => PaymentIntentStatus::Succeeded,
        "failed" => PaymentIntentStatus::Failed,
        "canceled" => PaymentIntentStatus::Canceled,
        value => {
            return Err(DomainError::new(format!(
                "unsupported payment intent status: {value}"
            )));
        }
    };
    Ok(PaymentIntentRuntimeRecord {
        id: string_cell(row, "id"),
        tenant_id: string_cell(row, "tenant_id"),
        organization_id: optional_string_cell(row, "organization_id"),
        owner_user_id: string_cell(row, "owner_user_id"),
        merchant_order_no: string_cell(row, "merchant_order_no"),
        amount: string_cell(row, "amount"),
        currency_code: string_cell(row, "currency_code"),
        subject: string_cell(row, "subject"),
        provider_code: string_cell(row, "provider_code"),
        payment_method: string_cell(row, "payment_method"),
        scene: string_cell(row, "scene_code"),
        status,
        idempotency_key: string_cell(row, "idempotency_key"),
        created_at: string_cell(row, "created_at"),
        updated_at: string_cell(row, "updated_at"),
    })
}

fn refund_from_row(row: &sqlx::postgres::PgRow) -> DomainResult<PaymentRefundRuntimeRecord> {
    let status = match string_cell(row, "status").as_str() {
        "pending" => PaymentRefundStatus::Pending,
        "processing" => PaymentRefundStatus::Processing,
        "succeeded" => PaymentRefundStatus::Succeeded,
        "failed" => PaymentRefundStatus::Failed,
        "canceled" => PaymentRefundStatus::Canceled,
        value => {
            return Err(DomainError::new(format!(
                "unsupported payment refund status: {value}"
            )));
        }
    };
    Ok(PaymentRefundRuntimeRecord {
        id: string_cell(row, "id"),
        tenant_id: string_cell(row, "tenant_id"),
        organization_id: optional_string_cell(row, "organization_id"),
        payment_intent_id: string_cell(row, "payment_intent_id"),
        payment_attempt_id: string_cell(row, "payment_attempt_id"),
        merchant_refund_no: string_cell(row, "refund_no"),
        amount: string_cell(row, "amount"),
        currency_code: string_cell(row, "currency_code"),
        provider_code: string_cell(row, "provider_code"),
        reason: string_cell(row, "reason"),
        status,
        idempotency_key: string_cell(row, "idempotency_key"),
        items: Vec::new(),
        created_at: string_cell(row, "created_at"),
        updated_at: string_cell(row, "updated_at"),
    })
}

fn refund_item_from_row(row: &sqlx::postgres::PgRow) -> DomainResult<PaymentRefundItemRecord> {
    Ok(PaymentRefundItemRecord {
        id: string_cell(row, "id"),
        tenant_id: string_cell(row, "tenant_id"),
        organization_id: optional_string_cell(row, "organization_id"),
        refund_id: string_cell(row, "refund_id"),
        order_item_id: string_cell(row, "order_item_id"),
        quantity: row
            .try_get::<i64, _>("quantity")
            .map_err(|error| store_error("failed to read refund item quantity", error))?,
        refund_amount: string_cell(row, "refund_amount"),
        tax_refund_amount: string_cell(row, "tax_refund_amount"),
        shipping_refund_amount: string_cell(row, "shipping_refund_amount"),
        created_at: string_cell(row, "created_at"),
    })
}

fn refund_attempt_from_row(
    row: &sqlx::postgres::PgRow,
) -> DomainResult<PaymentRefundAttemptRecord> {
    Ok(PaymentRefundAttemptRecord {
        id: string_cell(row, "id"),
        tenant_id: string_cell(row, "tenant_id"),
        organization_id: optional_string_cell(row, "organization_id"),
        refund_attempt_no: string_cell(row, "refund_attempt_no"),
        refund_id: string_cell(row, "refund_id"),
        provider_code: string_cell(row, "provider_code"),
        provider_account_id: optional_string_cell(row, "provider_account_id"),
        out_refund_no: string_cell(row, "out_refund_no"),
        provider_refund_id: optional_string_cell(row, "provider_refund_id"),
        amount: string_cell(row, "amount"),
        currency_code: string_cell(row, "currency_code"),
        status: string_cell(row, "status"),
        failure_code: optional_string_cell(row, "failure_code"),
        failure_message: optional_string_cell(row, "failure_message"),
        submitted_at: optional_string_cell(row, "submitted_at"),
        succeeded_at: optional_string_cell(row, "succeeded_at"),
        failed_at: optional_string_cell(row, "failed_at"),
        created_at: string_cell(row, "created_at"),
        updated_at: string_cell(row, "updated_at"),
    })
}

fn operation_attempt_from_row(
    row: &sqlx::postgres::PgRow,
) -> DomainResult<PaymentOperationAttemptRecord> {
    Ok(PaymentOperationAttemptRecord {
        id: string_cell(row, "id"),
        tenant_id: string_cell(row, "tenant_id"),
        organization_id: optional_string_cell(row, "organization_id"),
        operation_no: string_cell(row, "operation_no"),
        provider_code: string_cell(row, "provider_code"),
        operation: operation_from_code(&string_cell(row, "operation_code"))?,
        sdkwork_resource_type: string_cell(row, "sdkwork_resource_type"),
        sdkwork_resource_id: string_cell(row, "sdkwork_resource_id"),
        idempotency_key: string_cell(row, "idempotency_key"),
        request_digest: string_cell(row, "request_digest"),
        response_digest: optional_string_cell(row, "response_digest"),
        provider_error_code: optional_string_cell(row, "provider_error_code"),
        provider_error_message: optional_string_cell(row, "provider_error_message"),
        status: string_cell(row, "status"),
        started_at: string_cell(row, "started_at"),
        completed_at: optional_string_cell(row, "completed_at"),
    })
}

fn operation_from_code(code: &str) -> DomainResult<crate::application::PaymentAdapterOperation> {
    match code {
        "confirm_payment_intent" => {
            Ok(crate::application::PaymentAdapterOperation::ConfirmPaymentIntent)
        }
        "capture_payment_intent" => {
            Ok(crate::application::PaymentAdapterOperation::CapturePaymentIntent)
        }
        "cancel_payment_intent" => {
            Ok(crate::application::PaymentAdapterOperation::CancelPaymentIntent)
        }
        "create_refund" => Ok(crate::application::PaymentAdapterOperation::CreateRefund),
        "cancel_refund" => Ok(crate::application::PaymentAdapterOperation::CancelRefund),
        value => Err(DomainError::new(format!(
            "unsupported payment operation code: {value}"
        ))),
    }
}

fn string_cell(row: &sqlx::postgres::PgRow, name: &str) -> String {
    row.try_get::<String, _>(name).unwrap_or_default()
}

fn optional_string_cell(row: &sqlx::postgres::PgRow, name: &str) -> Option<String> {
    row.try_get::<Option<String>, _>(name).ok().flatten()
}

fn store_error(message: &str, error: sqlx::Error) -> DomainError {
    DomainError::new(format!("{message}: {error}"))
}
