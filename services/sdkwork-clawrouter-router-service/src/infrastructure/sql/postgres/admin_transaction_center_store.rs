use sha2::{Digest, Sha256};
use sqlx::{PgPool, Postgres, Row, Transaction};

use crate::domain::{DomainError, DomainResult};
use crate::infrastructure::sql::runtime_id::next_claw_runtime_id;
use crate::ports::{
    AdminTransactionCenterFuture, AdminTransactionCenterStore, AdminTransactionCenterSubject,
    AdminTransactionCollection, AdminTransactionJsonRecord,
    CreateAdminPaymentProviderAccountCommand, DeleteAdminPaymentProviderAccountCommand,
    ListAdminTransactionChildRecordsQuery, ListAdminTransactionRecordsQuery,
    LoadAdminTransactionRecordQuery, UpdateAdminPaymentProviderAccountCommand,
    UpdateAdminPaymentProviderAccountStatusCommand,
};

const PAYMENT_PROVIDER_ACCOUNT_AUDIT_ACTION: &str = "payments.provider_account.create";
const PAYMENT_PROVIDER_ACCOUNT_UPDATE_AUDIT_ACTION: &str = "payments.provider_account.update";
const PAYMENT_PROVIDER_ACCOUNT_STATUS_AUDIT_ACTION: &str =
    "payments.provider_account.status.update";
const PAYMENT_PROVIDER_ACCOUNT_DELETE_AUDIT_ACTION: &str = "payments.provider_account.delete";
const PAYMENT_PROVIDER_ACCOUNT_AUDIT_TARGET_TYPE: i32 = 1701;

#[derive(Debug, Clone)]
pub struct PostgresAdminTransactionCenterStore {
    pool: PgPool,
}

impl PostgresAdminTransactionCenterStore {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

impl AdminTransactionCenterStore for PostgresAdminTransactionCenterStore {
    fn list_orders<'a>(
        &'a self,
        query: ListAdminTransactionRecordsQuery,
    ) -> AdminTransactionCenterFuture<'a, AdminTransactionCollection> {
        Box::pin(async move { list_orders(&self.pool, query).await })
    }

    fn load_order<'a>(
        &'a self,
        query: LoadAdminTransactionRecordQuery,
    ) -> AdminTransactionCenterFuture<'a, Option<AdminTransactionJsonRecord>> {
        Box::pin(async move { load_order(&self.pool, query).await })
    }

    fn list_order_events<'a>(
        &'a self,
        query: ListAdminTransactionChildRecordsQuery,
    ) -> AdminTransactionCenterFuture<'a, AdminTransactionCollection> {
        Box::pin(async move { list_order_events(&self.pool, query).await })
    }

    fn list_refunds<'a>(
        &'a self,
        query: ListAdminTransactionRecordsQuery,
    ) -> AdminTransactionCenterFuture<'a, AdminTransactionCollection> {
        Box::pin(async move { list_refunds(&self.pool, query).await })
    }

    fn load_refund<'a>(
        &'a self,
        query: LoadAdminTransactionRecordQuery,
    ) -> AdminTransactionCenterFuture<'a, Option<AdminTransactionJsonRecord>> {
        Box::pin(async move { load_refund(&self.pool, query).await })
    }

    fn list_fulfillments<'a>(
        &'a self,
        query: ListAdminTransactionRecordsQuery,
    ) -> AdminTransactionCenterFuture<'a, AdminTransactionCollection> {
        Box::pin(async move { list_fulfillments(&self.pool, query).await })
    }

    fn list_shipments<'a>(
        &'a self,
        query: ListAdminTransactionRecordsQuery,
    ) -> AdminTransactionCenterFuture<'a, AdminTransactionCollection> {
        Box::pin(async move { list_shipments(&self.pool, query).await })
    }

    fn list_shipment_tracking_events<'a>(
        &'a self,
        query: ListAdminTransactionChildRecordsQuery,
    ) -> AdminTransactionCenterFuture<'a, AdminTransactionCollection> {
        Box::pin(async move { list_shipment_tracking_events(&self.pool, query).await })
    }

    fn list_payment_providers<'a>(
        &'a self,
        query: ListAdminTransactionRecordsQuery,
    ) -> AdminTransactionCenterFuture<'a, AdminTransactionCollection> {
        Box::pin(async move { list_payment_providers(&self.pool, query).await })
    }

    fn list_payment_provider_accounts<'a>(
        &'a self,
        query: ListAdminTransactionRecordsQuery,
    ) -> AdminTransactionCenterFuture<'a, AdminTransactionCollection> {
        Box::pin(async move { list_payment_provider_accounts(&self.pool, query).await })
    }

    fn create_payment_provider_account<'a>(
        &'a self,
        command: CreateAdminPaymentProviderAccountCommand,
    ) -> AdminTransactionCenterFuture<'a, AdminTransactionJsonRecord> {
        Box::pin(async move { create_payment_provider_account(&self.pool, command).await })
    }

    fn update_payment_provider_account<'a>(
        &'a self,
        command: UpdateAdminPaymentProviderAccountCommand,
    ) -> AdminTransactionCenterFuture<'a, AdminTransactionJsonRecord> {
        Box::pin(async move { update_payment_provider_account(&self.pool, command).await })
    }

    fn update_payment_provider_account_status<'a>(
        &'a self,
        command: UpdateAdminPaymentProviderAccountStatusCommand,
    ) -> AdminTransactionCenterFuture<'a, AdminTransactionJsonRecord> {
        Box::pin(async move { update_payment_provider_account_status(&self.pool, command).await })
    }

    fn delete_payment_provider_account<'a>(
        &'a self,
        command: DeleteAdminPaymentProviderAccountCommand,
    ) -> AdminTransactionCenterFuture<'a, bool> {
        Box::pin(async move { delete_payment_provider_account(&self.pool, command).await })
    }

    fn list_payment_methods<'a>(
        &'a self,
        query: ListAdminTransactionRecordsQuery,
    ) -> AdminTransactionCenterFuture<'a, AdminTransactionCollection> {
        Box::pin(async move { list_payment_methods(&self.pool, query).await })
    }

    fn list_payment_channels<'a>(
        &'a self,
        query: ListAdminTransactionRecordsQuery,
    ) -> AdminTransactionCenterFuture<'a, AdminTransactionCollection> {
        Box::pin(async move { list_payment_channels(&self.pool, query).await })
    }

    fn list_payment_route_rules<'a>(
        &'a self,
        query: ListAdminTransactionRecordsQuery,
    ) -> AdminTransactionCenterFuture<'a, AdminTransactionCollection> {
        Box::pin(async move { list_payment_route_rules(&self.pool, query).await })
    }

    fn list_payment_intents<'a>(
        &'a self,
        query: ListAdminTransactionRecordsQuery,
    ) -> AdminTransactionCenterFuture<'a, AdminTransactionCollection> {
        Box::pin(async move { list_payment_intents(&self.pool, query).await })
    }

    fn list_payment_attempts<'a>(
        &'a self,
        query: ListAdminTransactionRecordsQuery,
    ) -> AdminTransactionCenterFuture<'a, AdminTransactionCollection> {
        Box::pin(async move { list_payment_attempts(&self.pool, query).await })
    }

    fn list_payment_webhook_events<'a>(
        &'a self,
        query: ListAdminTransactionRecordsQuery,
    ) -> AdminTransactionCenterFuture<'a, AdminTransactionCollection> {
        Box::pin(async move { list_payment_webhook_events(&self.pool, query).await })
    }

    fn list_payment_reconciliation_runs<'a>(
        &'a self,
        query: ListAdminTransactionRecordsQuery,
    ) -> AdminTransactionCenterFuture<'a, AdminTransactionCollection> {
        Box::pin(async move { list_payment_reconciliation_runs(&self.pool, query).await })
    }
}

async fn list_orders(
    pool: &PgPool,
    query: ListAdminTransactionRecordsQuery,
) -> DomainResult<AdminTransactionCollection> {
    let rows = sqlx::query(
        r#"
        SELECT json_build_object(
            'id', o.id,
            'tenant_id', o.tenant_id,
            'organization_id', o.organization_id,
            'owner_user_id', o.owner_user_id,
            'order_no', o.order_no,
            'order_type', o.subject,
            'subject', o.subject,
            'status', o.status,
            'pay_status', COALESCE(pi.status, o.status),
            'total_amount', COALESCE(ab.payable_amount, pi.amount, '0'),
            'currency_code', o.currency_code,
            'request_no', o.request_no,
            'idempotency_key', o.idempotency_key,
            'created_at', o.created_at,
            'paid_at', o.paid_at,
            'cancelled_at', o.cancelled_at,
            'expired_at', o.expired_at,
            'updated_at', o.updated_at
        ) AS item,
        COUNT(*) OVER() AS total
        FROM commerce_order o
        LEFT JOIN commerce_order_amount_breakdown ab
          ON ab.tenant_id = o.tenant_id
         AND ab.order_id = o.id
        LEFT JOIN commerce_payment_intent pi
          ON pi.tenant_id = o.tenant_id
         AND (pi.organization_id IS NULL OR o.organization_id IS NULL OR pi.organization_id = o.organization_id)
         AND pi.order_id = o.id
        WHERE o.tenant_id = CAST($1 AS TEXT)
          AND o.organization_id = CAST($2 AS TEXT)
          AND (CAST($3 AS TEXT) IS NULL OR o.status = CAST($3 AS TEXT) OR pi.status = CAST($3 AS TEXT))
          AND (CAST($4 AS TEXT) IS NULL OR o.id = CAST($4 AS TEXT) OR o.order_no = CAST($4 AS TEXT))
        ORDER BY o.created_at DESC NULLS LAST, o.id DESC
        LIMIT $5 OFFSET $6
        "#,
    )
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.status.as_deref())
    .bind(query.order_id.as_deref())
    .bind(query.page_size)
    .bind(query.offset)
    .fetch_all(pool)
    .await
    .map_err(store_error)?;

    collection_from_rows(rows, &query)
}

async fn load_order(
    pool: &PgPool,
    query: LoadAdminTransactionRecordQuery,
) -> DomainResult<Option<AdminTransactionJsonRecord>> {
    let row = sqlx::query(
        r#"
        SELECT json_build_object(
            'id', o.id,
            'tenant_id', o.tenant_id,
            'organization_id', o.organization_id,
            'owner_user_id', o.owner_user_id,
            'order_no', o.order_no,
            'order_type', o.subject,
            'subject', o.subject,
            'status', o.status,
            'pay_status', COALESCE(pi.status, o.status),
            'total_amount', COALESCE(ab.payable_amount, pi.amount, '0'),
            'currency_code', o.currency_code,
            'request_no', o.request_no,
            'idempotency_key', o.idempotency_key,
            'created_at', o.created_at,
            'paid_at', o.paid_at,
            'cancelled_at', o.cancelled_at,
            'expired_at', o.expired_at,
            'updated_at', o.updated_at
        ) AS item
        FROM commerce_order o
        LEFT JOIN commerce_order_amount_breakdown ab
          ON ab.tenant_id = o.tenant_id
         AND ab.order_id = o.id
        LEFT JOIN commerce_payment_intent pi
          ON pi.tenant_id = o.tenant_id
         AND (pi.organization_id IS NULL OR o.organization_id IS NULL OR pi.organization_id = o.organization_id)
         AND pi.order_id = o.id
        WHERE o.tenant_id = CAST($1 AS TEXT)
          AND o.organization_id = CAST($2 AS TEXT)
          AND (o.id = CAST($3 AS TEXT) OR o.order_no = CAST($3 AS TEXT))
        ORDER BY o.created_at DESC NULLS LAST, o.id DESC
        LIMIT 1
        "#,
    )
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.record_id)
    .fetch_optional(pool)
    .await
    .map_err(store_error)?;

    row.map(|row| json_record_cell(&row)).transpose()
}

async fn list_order_events(
    pool: &PgPool,
    query: ListAdminTransactionChildRecordsQuery,
) -> DomainResult<AdminTransactionCollection> {
    let rows = sqlx::query(
        r#"
        SELECT json_build_object(
            'id', id,
            'tenant_id', tenant_id,
            'organization_id', organization_id,
            'event_no', event_no,
            'order_id', order_id,
            'event_type', event_type,
            'from_status', from_status,
            'to_status', to_status,
            'actor_type', actor_type,
            'actor_id', actor_id,
            'reason_code', reason_code,
            'message', message,
            'payload_json', payload_json,
            'request_id', request_id,
            'idempotency_key', idempotency_key,
            'created_at', created_at
        ) AS item,
        COUNT(*) OVER() AS total
        FROM commerce_order_event
        WHERE tenant_id = CAST($1 AS TEXT)
          AND organization_id = CAST($2 AS TEXT)
          AND order_id = CAST($3 AS TEXT)
          AND (CAST($4 AS TEXT) IS NULL OR to_status = CAST($4 AS TEXT) OR event_type = CAST($4 AS TEXT))
        ORDER BY created_at DESC NULLS LAST, id DESC
        LIMIT $5 OFFSET $6
        "#,
    )
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(&query.parent_id)
    .bind(query.status.as_deref())
    .bind(query.page_size)
    .bind(query.offset)
    .fetch_all(pool)
    .await
    .map_err(store_error)?;

    collection_from_child_rows(rows, &query)
}

async fn list_refunds(
    pool: &PgPool,
    query: ListAdminTransactionRecordsQuery,
) -> DomainResult<AdminTransactionCollection> {
    let rows = sqlx::query(
        r#"
        SELECT json_build_object(
            'id', r.id,
            'tenant_id', r.tenant_id,
            'payment_attempt_id', r.payment_attempt_id,
            'payment_intent_id', pa.payment_intent_id,
            'order_id', pa.order_id,
            'refund_no', r.refund_no,
            'amount', r.amount,
            'currency_code', COALESCE(pa.currency_code, ''),
            'status', r.status,
            'request_no', r.request_no,
            'idempotency_key', r.idempotency_key,
            'created_at', r.created_at,
            'updated_at', r.updated_at
        ) AS item,
        COUNT(*) OVER() AS total
        FROM commerce_refund r
        LEFT JOIN commerce_payment_attempt pa
          ON pa.tenant_id = r.tenant_id
         AND pa.id = r.payment_attempt_id
        WHERE r.tenant_id = CAST($1 AS TEXT)
          AND (CAST($2 AS TEXT) IS NULL OR pa.organization_id = CAST($2 AS TEXT))
          AND (CAST($3 AS TEXT) IS NULL OR r.status = CAST($3 AS TEXT))
          AND (CAST($4 AS TEXT) IS NULL OR pa.order_id = CAST($4 AS TEXT))
        ORDER BY r.created_at DESC NULLS LAST, r.id DESC
        LIMIT $5 OFFSET $6
        "#,
    )
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.status.as_deref())
    .bind(query.order_id.as_deref())
    .bind(query.page_size)
    .bind(query.offset)
    .fetch_all(pool)
    .await
    .map_err(store_error)?;

    collection_from_rows(rows, &query)
}

async fn load_refund(
    pool: &PgPool,
    query: LoadAdminTransactionRecordQuery,
) -> DomainResult<Option<AdminTransactionJsonRecord>> {
    let row = sqlx::query(
        r#"
        SELECT json_build_object(
            'id', r.id,
            'tenant_id', r.tenant_id,
            'payment_attempt_id', r.payment_attempt_id,
            'payment_intent_id', pa.payment_intent_id,
            'order_id', pa.order_id,
            'refund_no', r.refund_no,
            'amount', r.amount,
            'currency_code', COALESCE(pa.currency_code, ''),
            'status', r.status,
            'request_no', r.request_no,
            'idempotency_key', r.idempotency_key,
            'created_at', r.created_at,
            'updated_at', r.updated_at
        ) AS item
        FROM commerce_refund r
        LEFT JOIN commerce_payment_attempt pa
          ON pa.tenant_id = r.tenant_id
         AND pa.id = r.payment_attempt_id
        WHERE r.tenant_id = CAST($1 AS TEXT)
          AND (CAST($2 AS TEXT) IS NULL OR pa.organization_id = CAST($2 AS TEXT))
          AND (r.id = CAST($3 AS TEXT) OR r.refund_no = CAST($3 AS TEXT))
        ORDER BY r.created_at DESC NULLS LAST, r.id DESC
        LIMIT 1
        "#,
    )
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.record_id)
    .fetch_optional(pool)
    .await
    .map_err(store_error)?;

    row.map(|row| json_record_cell(&row)).transpose()
}

async fn list_fulfillments(
    pool: &PgPool,
    query: ListAdminTransactionRecordsQuery,
) -> DomainResult<AdminTransactionCollection> {
    let rows = sqlx::query(
        r#"
        SELECT json_build_object(
            'id', id,
            'tenant_id', tenant_id,
            'organization_id', organization_id,
            'fulfillment_no', fulfillment_no,
            'order_id', order_id,
            'fulfillment_type', fulfillment_type,
            'status', status,
            'warehouse_id', warehouse_id,
            'address_snapshot_id', address_snapshot_id,
            'supplier_code', supplier_code,
            'created_at', created_at,
            'completed_at', completed_at,
            'updated_at', updated_at
        ) AS item,
        COUNT(*) OVER() AS total
        FROM commerce_fulfillment_order
        WHERE tenant_id = CAST($1 AS TEXT)
          AND organization_id = CAST($2 AS TEXT)
          AND (CAST($3 AS TEXT) IS NULL OR status = CAST($3 AS TEXT))
          AND (CAST($4 AS TEXT) IS NULL OR order_id = CAST($4 AS TEXT))
        ORDER BY created_at DESC NULLS LAST, id DESC
        LIMIT $5 OFFSET $6
        "#,
    )
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.status.as_deref())
    .bind(query.order_id.as_deref())
    .bind(query.page_size)
    .bind(query.offset)
    .fetch_all(pool)
    .await
    .map_err(store_error)?;

    collection_from_rows(rows, &query)
}

async fn list_shipments(
    pool: &PgPool,
    query: ListAdminTransactionRecordsQuery,
) -> DomainResult<AdminTransactionCollection> {
    let rows = sqlx::query(
        r#"
        SELECT json_build_object(
            'id', id,
            'tenant_id', tenant_id,
            'organization_id', organization_id,
            'shipment_no', shipment_no,
            'fulfillment_id', fulfillment_id,
            'carrier_code', carrier_code,
            'tracking_no', tracking_no,
            'status', status,
            'shipped_at', shipped_at,
            'delivered_at', delivered_at,
            'created_at', created_at,
            'updated_at', updated_at
        ) AS item,
        COUNT(*) OVER() AS total
        FROM commerce_shipment
        WHERE tenant_id = CAST($1 AS TEXT)
          AND organization_id = CAST($2 AS TEXT)
          AND (CAST($3 AS TEXT) IS NULL OR status = CAST($3 AS TEXT))
        ORDER BY created_at DESC NULLS LAST, id DESC
        LIMIT $4 OFFSET $5
        "#,
    )
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.status.as_deref())
    .bind(query.page_size)
    .bind(query.offset)
    .fetch_all(pool)
    .await
    .map_err(store_error)?;

    collection_from_rows(rows, &query)
}

async fn list_shipment_tracking_events(
    pool: &PgPool,
    query: ListAdminTransactionChildRecordsQuery,
) -> DomainResult<AdminTransactionCollection> {
    let rows = sqlx::query(
        r#"
        SELECT json_build_object(
            'id', id,
            'tenant_id', tenant_id,
            'organization_id', organization_id,
            'shipment_id', shipment_id,
            'event_time', event_time,
            'event_code', event_code,
            'location', location,
            'description', description,
            'raw_payload_json', raw_payload_json,
            'created_at', created_at
        ) AS item,
        COUNT(*) OVER() AS total
        FROM commerce_shipment_tracking_event
        WHERE tenant_id = CAST($1 AS TEXT)
          AND organization_id = CAST($2 AS TEXT)
          AND shipment_id = CAST($3 AS TEXT)
          AND (CAST($4 AS TEXT) IS NULL OR event_code = CAST($4 AS TEXT))
        ORDER BY event_time DESC NULLS LAST, id DESC
        LIMIT $5 OFFSET $6
        "#,
    )
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(&query.parent_id)
    .bind(query.status.as_deref())
    .bind(query.page_size)
    .bind(query.offset)
    .fetch_all(pool)
    .await
    .map_err(store_error)?;

    collection_from_child_rows(rows, &query)
}

async fn list_payment_providers(
    pool: &PgPool,
    query: ListAdminTransactionRecordsQuery,
) -> DomainResult<AdminTransactionCollection> {
    let rows = sqlx::query(
        r#"
        SELECT json_build_object(
            'id', id,
            'providerCode', supplier_code,
            'displayName', display_name,
            'providerType', provider_type,
            'supportedCountries', COALESCE(NULLIF(supported_countries::text, '')::json, '[]'::json),
            'supportedCurrencies', COALESCE(NULLIF(supported_currencies::text, '')::json, '[]'::json),
            'capabilities', '["payment_intent","payment_query","payment_close","refund","webhook","reconciliation"]'::json,
            'status', status,
            'sortOrder', sort_order,
            'createdAt', created_at,
            'updatedAt', updated_at
        ) AS item,
        COUNT(*) OVER() AS total
        FROM commerce_payment_provider
        WHERE tenant_id IN (CAST($1 AS TEXT), '0')
          AND (organization_id = CAST($2 AS TEXT) OR organization_id = '0')
          AND (CAST($3 AS TEXT) IS NULL OR status = CAST($3 AS TEXT))
          AND (CAST($4 AS TEXT) IS NULL OR supplier_code = CAST($4 AS TEXT))
        ORDER BY
            CASE
                WHEN tenant_id = CAST($1 AS TEXT) AND organization_id = CAST($2 AS TEXT) THEN 0
                ELSE 1
            END ASC,
            sort_order ASC,
            updated_at DESC NULLS LAST,
            id DESC
        LIMIT $5 OFFSET $6
        "#,
    )
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.status.as_deref())
    .bind(query.supplier_code.as_deref())
    .bind(query.page_size)
    .bind(query.offset)
    .fetch_all(pool)
    .await
    .map_err(store_error)?;

    collection_from_rows(rows, &query)
}

async fn list_payment_provider_accounts(
    pool: &PgPool,
    query: ListAdminTransactionRecordsQuery,
) -> DomainResult<AdminTransactionCollection> {
    let payment_provider_accounts_sql = payment_provider_account_json_sql(
        "COUNT(*) OVER() AS total",
        r#"
        WHERE tenant_id IN (CAST($1 AS TEXT), '0')
          AND (organization_id = CAST($2 AS TEXT) OR organization_id = '0')
          AND (CAST($3 AS TEXT) IS NULL OR status = CAST($3 AS TEXT))
          AND (CAST($4 AS TEXT) IS NULL OR supplier_code = CAST($4 AS TEXT))
          AND (CAST($5 AS TEXT) IS NULL OR id = CAST($5 AS TEXT) OR account_no = CAST($5 AS TEXT))
        ORDER BY
            CASE
                WHEN tenant_id = CAST($1 AS TEXT) AND organization_id = CAST($2 AS TEXT) THEN 0
                ELSE 1
            END ASC,
            updated_at DESC NULLS LAST,
            id DESC
        LIMIT $6 OFFSET $7
        "#,
    );
    let rows = sqlx::query(sqlx::AssertSqlSafe(payment_provider_accounts_sql))
        .bind(query.subject.tenant_id)
        .bind(query.subject.organization_id)
        .bind(query.status.as_deref())
        .bind(query.supplier_code.as_deref())
        .bind(query.provider_account_id.as_deref())
        .bind(query.page_size)
        .bind(query.offset)
        .fetch_all(pool)
        .await
        .map_err(store_error)?;

    collection_from_rows(rows, &query)
}

async fn create_payment_provider_account(
    pool: &PgPool,
    command: CreateAdminPaymentProviderAccountCommand,
) -> DomainResult<AdminTransactionJsonRecord> {
    let id = payment_provider_account_idempotency_id(&command);
    if let Some(item) = load_payment_provider_account_by_id(
        pool,
        command.subject.tenant_id,
        command.subject.organization_id,
        &id,
    )
    .await?
    {
        ensure_payment_provider_account_replay_matches(&item, &command)?;
        ensure_payment_provider_account_replay_audit_matches(pool, &command, &id).await?;
        return Ok(item);
    }

    let mut tx = pool.begin().await.map_err(store_error)?;
    let channel_scope = PaymentProviderAccountChannelScope {
        tenant_id: command.subject.tenant_id,
        organization_id: command.subject.organization_id,
        provider_account_id: id.clone(),
        supplier_code: command.supplier_code.clone(),
        environment: command.environment.clone(),
        country_code: command.country_code.clone(),
        settlement_currency: command.settlement_currency.clone(),
        status: command.status.clone(),
        requested_at: command.requested_at.clone(),
    };
    lock_payment_provider_account_channel_scope(&mut tx, &channel_scope).await?;

    let insert_result = sqlx::query(
        r#"
        INSERT INTO commerce_payment_provider_account
            (id, tenant_id, organization_id, account_no, supplier_code, merchant_id, environment,
             country_code, settlement_currency, secret_ref, webhook_secret_ref, certificate_ref,
             status, rotated_at, created_at, updated_at)
        VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        "#,
    )
    .bind(&id)
    .bind(command.subject.tenant_id.to_string())
    .bind(command.subject.organization_id.to_string())
    .bind(&command.account_no)
    .bind(&command.supplier_code)
    .bind(&command.merchant_id)
    .bind(&command.environment)
    .bind(&command.country_code)
    .bind(&command.settlement_currency)
    .bind(&command.secret_ref)
    .bind(command.webhook_secret_ref.as_deref())
    .bind(command.certificate_ref.as_deref())
    .bind(&command.status)
    .bind(command.rotated_at.as_deref())
    .bind(&command.requested_at)
    .bind(&command.requested_at)
    .execute(&mut *tx)
    .await;

    if let Err(error) = insert_result {
        drop(tx);
        if is_unique_constraint_error(&error) {
            if let Some(item) = load_payment_provider_account_by_id(
                pool,
                command.subject.tenant_id,
                command.subject.organization_id,
                &id,
            )
            .await?
            {
                ensure_payment_provider_account_replay_matches(&item, &command)?;
                ensure_payment_provider_account_replay_audit_matches(pool, &command, &id).await?;
                return Ok(item);
            }
        }
        return Err(write_error(
            "failed to create payment provider account",
            error,
        ));
    }

    deactivate_peer_payment_provider_accounts_for_channel_scope(&mut tx, channel_scope).await?;
    insert_payment_provider_account_audit_if_absent(&mut tx, &command, &id).await?;
    tx.commit().await.map_err(store_error)?;

    load_payment_provider_account_by_id(
        pool,
        command.subject.tenant_id,
        command.subject.organization_id,
        &id,
    )
    .await?
    .ok_or_else(|| DomainError::new("created payment provider account could not be reloaded"))
}

async fn update_payment_provider_account(
    pool: &PgPool,
    command: UpdateAdminPaymentProviderAccountCommand,
) -> DomainResult<AdminTransactionJsonRecord> {
    let Some(provider_account_id) = resolve_payment_provider_account_id(
        pool,
        command.subject.tenant_id,
        command.subject.organization_id,
        &command.provider_account_id,
    )
    .await?
    else {
        return Err(DomainError::not_found(
            "payment provider account was not found",
        ));
    };

    let mut tx = pool.begin().await.map_err(store_error)?;
    let channel_scope = PaymentProviderAccountChannelScope {
        tenant_id: command.subject.tenant_id,
        organization_id: command.subject.organization_id,
        provider_account_id: provider_account_id.clone(),
        supplier_code: command.supplier_code.clone(),
        environment: command.environment.clone(),
        country_code: command.country_code.clone(),
        settlement_currency: command.settlement_currency.clone(),
        status: command.status.clone(),
        requested_at: command.requested_at.clone(),
    };
    lock_payment_provider_account_channel_scope(&mut tx, &channel_scope).await?;
    let update_result = sqlx::query(
        r#"
        UPDATE commerce_payment_provider_account
        SET supplier_code = $1,
            merchant_id = $2,
            environment = $3,
            country_code = $4,
            settlement_currency = $5,
            secret_ref = $6,
            webhook_secret_ref = $7,
            certificate_ref = $8,
            status = $9,
            rotated_at = $10,
            updated_at = $11
        WHERE tenant_id = CAST($12 AS TEXT)
          AND organization_id = CAST($13 AS TEXT)
          AND id = $14
        "#,
    )
    .bind(&command.supplier_code)
    .bind(&command.merchant_id)
    .bind(&command.environment)
    .bind(&command.country_code)
    .bind(&command.settlement_currency)
    .bind(&command.secret_ref)
    .bind(command.webhook_secret_ref.as_deref())
    .bind(command.certificate_ref.as_deref())
    .bind(&command.status)
    .bind(command.rotated_at.as_deref())
    .bind(&command.requested_at)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(&provider_account_id)
    .execute(&mut *tx)
    .await
    .map_err(|error| write_error("failed to update payment provider account", error))?;
    if update_result.rows_affected() != 1 {
        return Err(DomainError::not_found(
            "payment provider account was not found",
        ));
    }

    deactivate_peer_payment_provider_accounts_for_channel_scope(&mut tx, channel_scope).await?;
    insert_payment_provider_account_mutation_audit(
        &mut tx,
        PaymentProviderAccountAuditInput {
            subject: command.subject,
            action: PAYMENT_PROVIDER_ACCOUNT_UPDATE_AUDIT_ACTION,
            target_uuid: &provider_account_id,
            request_id: command.request_id.as_deref(),
            idempotency_key: Some(command.idempotency_key.as_str()),
            requested_at: &command.requested_at,
            change_summary: serde_json::json!({
                "providerCode": command.supplier_code,
                "accountRole": command.account_role,
                "merchantId": command.merchant_id,
                "environment": command.environment,
                "countryCode": command.country_code,
                "settlementCurrency": command.settlement_currency,
                "status": command.status,
                "rotatedAt": command.rotated_at,
                "clientRequestNo": command.client_request_no,
                "note": command.note
            }),
        },
    )
    .await?;
    tx.commit().await.map_err(store_error)?;

    load_payment_provider_account_by_id(
        pool,
        command.subject.tenant_id,
        command.subject.organization_id,
        &provider_account_id,
    )
    .await?
    .ok_or_else(|| DomainError::new("updated payment provider account could not be reloaded"))
}

async fn update_payment_provider_account_status(
    pool: &PgPool,
    command: UpdateAdminPaymentProviderAccountStatusCommand,
) -> DomainResult<AdminTransactionJsonRecord> {
    let Some(provider_account_id) = resolve_payment_provider_account_id(
        pool,
        command.subject.tenant_id,
        command.subject.organization_id,
        &command.provider_account_id,
    )
    .await?
    else {
        return Err(DomainError::not_found(
            "payment provider account was not found",
        ));
    };

    let mut tx = pool.begin().await.map_err(store_error)?;
    let current_channel_scope = if command.status == "active" {
        load_payment_provider_account_channel_scope(
            &mut tx,
            command.subject,
            &provider_account_id,
            &command.status,
            &command.requested_at,
        )
        .await?
    } else {
        None
    };
    if let Some(scope) = current_channel_scope.as_ref() {
        lock_payment_provider_account_channel_scope(&mut tx, scope).await?;
    }
    let update_result = sqlx::query(
        r#"
        UPDATE commerce_payment_provider_account
        SET status = $1,
            updated_at = $2
        WHERE tenant_id = CAST($3 AS TEXT)
          AND organization_id = CAST($4 AS TEXT)
          AND id = $5
        "#,
    )
    .bind(&command.status)
    .bind(&command.requested_at)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(&provider_account_id)
    .execute(&mut *tx)
    .await
    .map_err(|error| write_error("failed to update payment provider account status", error))?;
    if update_result.rows_affected() != 1 {
        return Err(DomainError::not_found(
            "payment provider account was not found",
        ));
    }

    if let Some(scope) = current_channel_scope {
        deactivate_peer_payment_provider_accounts_for_channel_scope(&mut tx, scope).await?;
    }
    insert_payment_provider_account_mutation_audit(
        &mut tx,
        PaymentProviderAccountAuditInput {
            subject: command.subject,
            action: PAYMENT_PROVIDER_ACCOUNT_STATUS_AUDIT_ACTION,
            target_uuid: &provider_account_id,
            request_id: command.request_id.as_deref(),
            idempotency_key: Some(command.idempotency_key.as_str()),
            requested_at: &command.requested_at,
            change_summary: serde_json::json!({
                "status": command.status,
                "clientRequestNo": command.client_request_no,
                "note": command.note
            }),
        },
    )
    .await?;
    tx.commit().await.map_err(store_error)?;

    load_payment_provider_account_by_id(
        pool,
        command.subject.tenant_id,
        command.subject.organization_id,
        &provider_account_id,
    )
    .await?
    .ok_or_else(|| DomainError::new("updated payment provider account could not be reloaded"))
}

struct PaymentProviderAccountChannelScope {
    tenant_id: i64,
    organization_id: i64,
    provider_account_id: String,
    supplier_code: String,
    environment: String,
    country_code: String,
    settlement_currency: String,
    status: String,
    requested_at: String,
}

async fn load_payment_provider_account_channel_scope(
    tx: &mut Transaction<'_, Postgres>,
    subject: AdminTransactionCenterSubject,
    provider_account_id: &str,
    status: &str,
    requested_at: &str,
) -> DomainResult<Option<PaymentProviderAccountChannelScope>> {
    let row = sqlx::query(
        r#"
        SELECT supplier_code, environment, country_code, settlement_currency
        FROM commerce_payment_provider_account
        WHERE tenant_id = CAST($1 AS TEXT)
          AND organization_id = CAST($2 AS TEXT)
          AND id = $3
        LIMIT 1
        "#,
    )
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(provider_account_id)
    .fetch_optional(&mut **tx)
    .await
    .map_err(store_error)?;
    let Some(row) = row else {
        return Ok(None);
    };
    Ok(Some(PaymentProviderAccountChannelScope {
        tenant_id: subject.tenant_id,
        organization_id: subject.organization_id,
        provider_account_id: provider_account_id.to_owned(),
        supplier_code: string_cell(&row, "supplier_code")?,
        environment: string_cell(&row, "environment")?,
        country_code: string_cell(&row, "country_code")?,
        settlement_currency: string_cell(&row, "settlement_currency")?,
        status: status.to_owned(),
        requested_at: requested_at.to_owned(),
    }))
}

async fn deactivate_peer_payment_provider_accounts_for_channel_scope(
    tx: &mut Transaction<'_, Postgres>,
    scope: PaymentProviderAccountChannelScope,
) -> DomainResult<()> {
    if scope.status != "active" {
        return Ok(());
    }
    sqlx::query(
        r#"
        UPDATE commerce_payment_provider_account
        SET status = 'inactive',
            updated_at = $1
        WHERE tenant_id = CAST($2 AS TEXT)
          AND organization_id = CAST($3 AS TEXT)
          AND id <> $4
          AND supplier_code = $5
          AND environment = $6
          AND country_code = $7
          AND settlement_currency = $8
          AND status = 'active'
        "#,
    )
    .bind(&scope.requested_at)
    .bind(scope.tenant_id)
    .bind(scope.organization_id)
    .bind(&scope.provider_account_id)
    .bind(&scope.supplier_code)
    .bind(&scope.environment)
    .bind(&scope.country_code)
    .bind(&scope.settlement_currency)
    .execute(&mut **tx)
    .await
    .map_err(|error| write_error("failed to deactivate peer payment provider accounts", error))?;
    Ok(())
}

async fn lock_payment_provider_account_channel_scope(
    tx: &mut Transaction<'_, Postgres>,
    scope: &PaymentProviderAccountChannelScope,
) -> DomainResult<()> {
    if scope.status != "active" {
        return Ok(());
    }
    sqlx::query(
        r#"
        SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))
        "#,
    )
    .bind("commerce_payment_provider_account_active")
    .bind(payment_provider_account_channel_scope_lock_key(scope))
    .execute(&mut **tx)
    .await
    .map_err(|error| {
        write_error(
            "failed to lock payment provider account channel scope",
            error,
        )
    })?;
    Ok(())
}

fn payment_provider_account_channel_scope_lock_key(
    scope: &PaymentProviderAccountChannelScope,
) -> String {
    format!(
        "{}:{}:{}:{}:{}:{}",
        scope.tenant_id,
        scope.organization_id,
        scope.supplier_code,
        scope.environment,
        scope.country_code,
        scope.settlement_currency
    )
}

async fn delete_payment_provider_account(
    pool: &PgPool,
    command: DeleteAdminPaymentProviderAccountCommand,
) -> DomainResult<bool> {
    let Some(provider_account_id) = resolve_payment_provider_account_id(
        pool,
        command.subject.tenant_id,
        command.subject.organization_id,
        &command.provider_account_id,
    )
    .await?
    else {
        return Err(DomainError::not_found(
            "payment provider account was not found",
        ));
    };
    let channel_count = count_payment_channels_for_provider_account(
        pool,
        command.subject.tenant_id,
        command.subject.organization_id,
        &provider_account_id,
    )
    .await?;
    if channel_count > 0 {
        return Err(DomainError::conflict(
            "payment provider account is used by payment channels; disable it before removing routing references",
        ));
    }

    let mut tx = pool.begin().await.map_err(store_error)?;
    insert_payment_provider_account_mutation_audit(
        &mut tx,
        PaymentProviderAccountAuditInput {
            subject: command.subject,
            action: PAYMENT_PROVIDER_ACCOUNT_DELETE_AUDIT_ACTION,
            target_uuid: &provider_account_id,
            request_id: command.request_id.as_deref(),
            idempotency_key: None,
            requested_at: &command.requested_at,
            change_summary: serde_json::json!({
                "providerAccountId": provider_account_id,
                "deleted": true
            }),
        },
    )
    .await?;
    let delete_result = sqlx::query(
        r#"
        DELETE FROM commerce_payment_provider_account
        WHERE tenant_id = CAST($1 AS TEXT)
          AND organization_id = CAST($2 AS TEXT)
          AND id = $3
        "#,
    )
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(&provider_account_id)
    .execute(&mut *tx)
    .await
    .map_err(|error| write_error("failed to delete payment provider account", error))?;
    if delete_result.rows_affected() != 1 {
        return Err(DomainError::not_found(
            "payment provider account was not found",
        ));
    }
    tx.commit().await.map_err(store_error)?;
    Ok(true)
}

async fn insert_payment_provider_account_audit_if_absent(
    tx: &mut Transaction<'_, Postgres>,
    command: &CreateAdminPaymentProviderAccountCommand,
    provider_account_id: &str,
) -> DomainResult<()> {
    let audit_request_id = command
        .request_id
        .as_deref()
        .unwrap_or(command.idempotency_key.as_str());
    let change_summary = serde_json::json!({
        "accountNo": command.account_no,
        "providerCode": command.supplier_code,
        "accountRole": command.account_role,
        "merchantId": command.merchant_id,
        "environment": command.environment,
        "countryCode": command.country_code,
        "settlementCurrency": command.settlement_currency,
        "status": command.status,
        "rotatedAt": command.rotated_at,
        "clientRequestNo": command.client_request_no,
        "note": command.note
    })
    .to_string();
    sqlx::query(
        r#"
        INSERT INTO ops_audit_log
            (uuid, tenant_id, organization_id, request_id, operator_id, operator_type,
             action, target_type, target_uuid, created_at, change_summary, id)
        SELECT
            $1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, $10::jsonb, $11
        WHERE NOT EXISTS (
            SELECT 1
            FROM ops_audit_log
            WHERE tenant_id = $12
              AND organization_id = $13
              AND request_id = $14
              AND action = $15
        )
        "#,
    )
    .bind(stable_id(
        "transaction-center-audit",
        &[
            &command.subject.tenant_id.to_string(),
            &command.subject.organization_id.to_string(),
            audit_request_id,
            PAYMENT_PROVIDER_ACCOUNT_AUDIT_ACTION,
            provider_account_id,
        ],
    ))
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(audit_request_id)
    .bind(command.subject.operator_id)
    .bind(command.subject.operator_type)
    .bind(PAYMENT_PROVIDER_ACCOUNT_AUDIT_ACTION)
    .bind(PAYMENT_PROVIDER_ACCOUNT_AUDIT_TARGET_TYPE)
    .bind(provider_account_id)
    .bind(change_summary)
    .bind(next_claw_runtime_id("ops_audit_log")?)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(audit_request_id)
    .bind(PAYMENT_PROVIDER_ACCOUNT_AUDIT_ACTION)
    .execute(&mut **tx)
    .await
    .map_err(|error| write_error("failed to write payment provider account audit log", error))?;
    Ok(())
}

struct PaymentProviderAccountAuditInput<'a> {
    subject: AdminTransactionCenterSubject,
    action: &'static str,
    target_uuid: &'a str,
    request_id: Option<&'a str>,
    idempotency_key: Option<&'a str>,
    requested_at: &'a str,
    change_summary: serde_json::Value,
}

async fn insert_payment_provider_account_mutation_audit(
    tx: &mut Transaction<'_, Postgres>,
    input: PaymentProviderAccountAuditInput<'_>,
) -> DomainResult<()> {
    let audit_request_id = input
        .request_id
        .or(input.idempotency_key)
        .unwrap_or(input.target_uuid);
    sqlx::query(
        r#"
        INSERT INTO ops_audit_log
            (uuid, tenant_id, organization_id, request_id, operator_id, operator_type,
             action, target_type, target_uuid, created_at, change_summary, id)
        SELECT
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12
        WHERE NOT EXISTS (
            SELECT 1
            FROM ops_audit_log
            WHERE tenant_id = $13
              AND organization_id = $14
              AND request_id = $15
              AND action = $16
        )
        "#,
    )
    .bind(stable_id(
        "transaction-center-audit",
        &[
            &input.subject.tenant_id.to_string(),
            &input.subject.organization_id.to_string(),
            audit_request_id,
            input.action,
            input.target_uuid,
        ],
    ))
    .bind(input.subject.tenant_id)
    .bind(input.subject.organization_id)
    .bind(audit_request_id)
    .bind(input.subject.operator_id)
    .bind(input.subject.operator_type)
    .bind(input.action)
    .bind(PAYMENT_PROVIDER_ACCOUNT_AUDIT_TARGET_TYPE)
    .bind(input.target_uuid)
    .bind(input.requested_at)
    .bind(input.change_summary.to_string())
    .bind(next_claw_runtime_id("ops_audit_log")?)
    .bind(input.subject.tenant_id)
    .bind(input.subject.organization_id)
    .bind(audit_request_id)
    .bind(input.action)
    .execute(&mut **tx)
    .await
    .map_err(|error| write_error("failed to write payment provider account audit log", error))?;
    Ok(())
}

async fn resolve_payment_provider_account_id(
    pool: &PgPool,
    tenant_id: i64,
    organization_id: i64,
    provider_account_id: &str,
) -> DomainResult<Option<String>> {
    let row = sqlx::query(
        r#"
        SELECT id
        FROM commerce_payment_provider_account
        WHERE tenant_id = CAST($1 AS TEXT)
          AND organization_id = CAST($2 AS TEXT)
          AND (id = CAST($3 AS TEXT) OR account_no = CAST($3 AS TEXT))
        LIMIT 1
        "#,
    )
    .bind(tenant_id)
    .bind(organization_id)
    .bind(provider_account_id)
    .fetch_optional(pool)
    .await
    .map_err(store_error)?;

    row.map(|row| {
        row.try_get::<String, _>("id")
            .map_err(|error| DomainError::new(error.to_string()))
    })
    .transpose()
}

async fn count_payment_channels_for_provider_account(
    pool: &PgPool,
    tenant_id: i64,
    organization_id: i64,
    provider_account_id: &str,
) -> DomainResult<i64> {
    let row = sqlx::query(
        r#"
        SELECT COUNT(*) AS total
        FROM commerce_payment_channel
        WHERE tenant_id = CAST($1 AS TEXT)
          AND organization_id = CAST($2 AS TEXT)
          AND provider_account_id = CAST($3 AS TEXT)
        "#,
    )
    .bind(tenant_id)
    .bind(organization_id)
    .bind(provider_account_id)
    .fetch_one(pool)
    .await
    .map_err(store_error)?;

    integer_cell(&row, "total")
}

async fn load_payment_provider_account_by_id(
    pool: &PgPool,
    tenant_id: i64,
    organization_id: i64,
    id: &str,
) -> DomainResult<Option<AdminTransactionJsonRecord>> {
    let payment_provider_account_sql = payment_provider_account_json_sql(
        "",
        r#"
        WHERE tenant_id = CAST($1 AS TEXT)
          AND organization_id = CAST($2 AS TEXT)
        AND id = CAST($3 AS TEXT)
        LIMIT 1
        "#,
    );
    let row = sqlx::query(sqlx::AssertSqlSafe(payment_provider_account_sql))
        .bind(tenant_id)
        .bind(organization_id)
        .bind(id)
        .fetch_optional(pool)
        .await
        .map_err(store_error)?;

    row.map(|row| json_record_cell(&row)).transpose()
}

async fn list_payment_methods(
    pool: &PgPool,
    query: ListAdminTransactionRecordsQuery,
) -> DomainResult<AdminTransactionCollection> {
    let rows = sqlx::query(
        r#"
        SELECT json_build_object(
            'id', id,
            'tenant_id', tenant_id,
            'organization_id', organization_id,
            'method_key', method_key,
            'methodCode', method_key,
            'display_name', display_name,
            'displayName', display_name,
            'provider', provider,
            'providerCode', NULLIF(provider, 'wallet_balance'),
            'methodType', CASE method_key
                WHEN 'wechat_pay' THEN 'domestic_wallet'
                WHEN 'alipay' THEN 'domestic_wallet'
                WHEN 'paypal' THEN 'international_wallet'
                WHEN 'card' THEN 'card'
                WHEN 'apple_pay' THEN 'platform_wallet'
                WHEN 'google_pay' THEN 'platform_wallet'
                WHEN 'wallet_balance' THEN 'account_balance'
                ELSE 'card'
            END,
            'checkoutScenes', CASE method_key
                WHEN 'wallet_balance' THEN '["checkout","membership_purchase","points_recharge","subscription","invoice"]'::json
                ELSE '["checkout","membership_purchase","points_recharge","wallet_recharge","subscription","invoice"]'::json
            END,
            'status', status,
            'sort_weight', sort_weight,
            'sortOrder', sort_weight,
            'request_no', request_no,
            'idempotency_key', idempotency_key,
            'created_at', created_at,
            'createdAt', created_at,
            'updated_at', updated_at,
            'updatedAt', updated_at
        ) AS item,
        COUNT(*) OVER() AS total
        FROM commerce_payment_method
        WHERE tenant_id IN (CAST($1 AS TEXT), '0')
          AND (organization_id = CAST($2 AS TEXT) OR organization_id = '0')
          AND (CAST($3 AS TEXT) IS NULL OR status = CAST($3 AS TEXT))
          AND (CAST($4 AS TEXT) IS NULL OR provider = CAST($4 AS TEXT))
          AND (CAST($5 AS TEXT) IS NULL OR method_key = CAST($5 AS TEXT))
        ORDER BY
            CASE
                WHEN tenant_id = CAST($1 AS TEXT) AND organization_id = CAST($2 AS TEXT) THEN 0
                ELSE 1
            END ASC,
            sort_weight ASC,
            updated_at DESC NULLS LAST,
            id DESC
        LIMIT $6 OFFSET $7
        "#,
    )
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.status.as_deref())
    .bind(query.supplier_code.as_deref())
    .bind(query.method_code.as_deref())
    .bind(query.page_size)
    .bind(query.offset)
    .fetch_all(pool)
    .await
    .map_err(store_error)?;

    collection_from_rows(rows, &query)
}

async fn list_payment_channels(
    pool: &PgPool,
    query: ListAdminTransactionRecordsQuery,
) -> DomainResult<AdminTransactionCollection> {
    let rows = sqlx::query(
        r#"
        SELECT json_build_object(
            'id', c.id,
            'tenant_id', c.tenant_id,
            'organization_id', c.organization_id,
            'channel_no', c.channel_no,
            'channelNo', c.channel_no,
            'provider_account_id', c.provider_account_id,
            'providerAccountId', c.provider_account_id,
            'method_id', c.method_id,
            'methodCode', m.method_key,
            'providerCode', a.supplier_code,
            'scene_code', c.scene_code,
            'sceneCode', c.scene_code,
            'currency_code', c.currency_code,
            'currencyCode', c.currency_code,
            'country_code', c.country_code,
            'countryCode', c.country_code,
            'status', c.status,
            'priority', c.priority,
            'created_at', c.created_at,
            'createdAt', c.created_at,
            'updated_at', c.updated_at,
            'updatedAt', c.updated_at
        ) AS item,
        COUNT(*) OVER() AS total
        FROM commerce_payment_channel c
        LEFT JOIN commerce_payment_method m ON m.tenant_id = c.tenant_id AND m.id = c.method_id
        LEFT JOIN commerce_payment_provider_account a ON a.tenant_id = c.tenant_id AND a.id = c.provider_account_id
        WHERE c.tenant_id IN (CAST($1 AS TEXT), '0')
          AND (c.organization_id = CAST($2 AS TEXT) OR c.organization_id = '0')
          AND (CAST($3 AS TEXT) IS NULL OR c.status = CAST($3 AS TEXT))
          AND (CAST($4 AS TEXT) IS NULL OR a.supplier_code = CAST($4 AS TEXT))
          AND (CAST($5 AS TEXT) IS NULL OR c.provider_account_id = CAST($5 AS TEXT))
          AND (CAST($6 AS TEXT) IS NULL OR m.method_key = CAST($6 AS TEXT))
          AND (CAST($7 AS TEXT) IS NULL OR c.country_code = CAST($7 AS TEXT))
          AND (CAST($8 AS TEXT) IS NULL OR c.currency_code = CAST($8 AS TEXT))
        ORDER BY
            CASE
                WHEN c.tenant_id = CAST($1 AS TEXT) AND c.organization_id = CAST($2 AS TEXT) THEN 0
                ELSE 1
            END ASC,
            c.priority ASC,
            c.updated_at DESC NULLS LAST,
            c.id DESC
        LIMIT $9 OFFSET $10
        "#,
    )
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.status.as_deref())
    .bind(query.supplier_code.as_deref())
    .bind(query.provider_account_id.as_deref())
    .bind(query.method_code.as_deref())
    .bind(query.country_code.as_deref())
    .bind(query.currency_code.as_deref())
    .bind(query.page_size)
    .bind(query.offset)
    .fetch_all(pool)
    .await
    .map_err(store_error)?;

    collection_from_rows(rows, &query)
}

async fn list_payment_route_rules(
    pool: &PgPool,
    query: ListAdminTransactionRecordsQuery,
) -> DomainResult<AdminTransactionCollection> {
    let rows = sqlx::query(
        r#"
        SELECT json_build_object(
            'id', r.id,
            'tenant_id', r.tenant_id,
            'organization_id', r.organization_id,
            'rule_no', r.rule_no,
            'ruleNo', r.rule_no,
            'priority', r.priority,
            'purchase_type', r.purchase_type,
            'sceneCode', COALESCE(r.purchase_type, c.scene_code),
            'country_code', r.country_code,
            'countryCode', COALESCE(r.country_code, c.country_code),
            'currency_code', r.currency_code,
            'currencyCode', COALESCE(r.currency_code, c.currency_code),
            'client_platform', r.client_platform,
            'amount_min', r.amount_min,
            'amount_max', r.amount_max,
            'user_segment', r.user_segment,
            'risk_level', r.risk_level,
            'account_id', r.account_id,
            'channelId', r.account_id,
            'fallbackChannelId', NULL,
            'fallbackEnabled', false,
            'methodCode', m.method_key,
            'status', r.status,
            'starts_at', r.starts_at,
            'ends_at', r.ends_at,
            'created_at', r.created_at,
            'createdAt', r.created_at,
            'updated_at', r.updated_at,
            'updatedAt', r.updated_at
        ) AS item,
        COUNT(*) OVER() AS total
        FROM commerce_payment_route_rule r
        LEFT JOIN commerce_payment_channel c ON c.tenant_id = r.tenant_id AND c.id = r.account_id
        LEFT JOIN commerce_payment_method m ON m.tenant_id = c.tenant_id AND m.id = c.method_id
        WHERE r.tenant_id IN (CAST($1 AS TEXT), '0')
          AND (r.organization_id = CAST($2 AS TEXT) OR r.organization_id = '0')
          AND (CAST($3 AS TEXT) IS NULL OR r.status = CAST($3 AS TEXT))
          AND (CAST($4 AS TEXT) IS NULL OR m.provider = CAST($4 AS TEXT))
          AND (CAST($5 AS TEXT) IS NULL OR m.method_key = CAST($5 AS TEXT))
          AND (CAST($6 AS TEXT) IS NULL OR r.country_code = CAST($6 AS TEXT))
          AND (CAST($7 AS TEXT) IS NULL OR r.currency_code = CAST($7 AS TEXT))
        ORDER BY
            CASE
                WHEN r.tenant_id = CAST($1 AS TEXT) AND r.organization_id = CAST($2 AS TEXT) THEN 0
                ELSE 1
            END ASC,
            r.priority ASC,
            r.updated_at DESC NULLS LAST,
            r.id DESC
        LIMIT $8 OFFSET $9
        "#,
    )
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.status.as_deref())
    .bind(query.supplier_code.as_deref())
    .bind(query.method_code.as_deref())
    .bind(query.country_code.as_deref())
    .bind(query.currency_code.as_deref())
    .bind(query.page_size)
    .bind(query.offset)
    .fetch_all(pool)
    .await
    .map_err(store_error)?;

    collection_from_rows(rows, &query)
}

async fn list_payment_intents(
    pool: &PgPool,
    query: ListAdminTransactionRecordsQuery,
) -> DomainResult<AdminTransactionCollection> {
    let rows = sqlx::query(
        r#"
        SELECT json_build_object(
            'id', pi.id,
            'tenant_id', pi.tenant_id,
            'organization_id', pi.organization_id,
            'owner_user_id', pi.owner_user_id,
            'order_id', pi.order_id,
            'orderId', pi.order_id,
            'provider', pi.provider,
            'methodCode', CASE
                WHEN pi.provider = 'stripe' THEN 'card'
                WHEN pi.provider IN ('wechat', 'wechatpay') THEN 'wechat_pay'
                ELSE pi.provider
            END,
            'providerCode', CASE
                WHEN pi.provider = 'card' THEN 'stripe'
                WHEN pi.provider IN ('wechat', 'wechatpay') THEN 'wechat_pay'
                ELSE pi.provider
            END,
            'amount', pi.amount,
            'currency_code', pi.currency_code,
            'currencyCode', pi.currency_code,
            'status', pi.status,
            'request_no', pi.request_no,
            'intentNo', pi.request_no,
            'subjectType', CASE o.subject
                WHEN 'membership' THEN 'membership_purchase'
                WHEN 'membership_purchase' THEN 'membership_purchase'
                WHEN 'points_recharge' THEN 'points_recharge'
                WHEN 'wallet_recharge' THEN 'wallet_recharge'
                WHEN 'subscription' THEN 'subscription'
                WHEN 'invoice' THEN 'invoice'
                ELSE 'order'
            END,
            'intent_id', pi.id,
            'intentId', pi.id,
            'checkoutSessionId', pi.id,
            'payment_intent_id', pi.id,
            'created_at', pi.created_at,
            'createdAt', pi.created_at,
            'updated_at', pi.updated_at,
            'updatedAt', pi.updated_at
        ) AS item,
        COUNT(*) OVER() AS total
        FROM commerce_payment_intent pi
        LEFT JOIN commerce_order o ON o.tenant_id = pi.tenant_id AND o.id = pi.order_id
        WHERE pi.tenant_id = CAST($1 AS TEXT)
          AND pi.organization_id = CAST($2 AS TEXT)
          AND (CAST($3 AS TEXT) IS NULL OR pi.status = CAST($3 AS TEXT))
          AND (CAST($4 AS TEXT) IS NULL OR CASE
                WHEN pi.provider = 'card' THEN 'stripe'
                WHEN pi.provider IN ('wechat', 'wechatpay') THEN 'wechat_pay'
                ELSE pi.provider
              END = CAST($4 AS TEXT))
          AND (CAST($5 AS TEXT) IS NULL OR pi.order_id = CAST($5 AS TEXT))
          AND (CAST($6 AS TEXT) IS NULL OR pi.id = CAST($6 AS TEXT) OR pi.request_no = CAST($6 AS TEXT))
        ORDER BY pi.created_at DESC NULLS LAST, pi.id DESC
        LIMIT $7 OFFSET $8
        "#,
    )
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.status.as_deref())
    .bind(query.supplier_code.as_deref())
    .bind(query.order_id.as_deref())
    .bind(query.intent_id.as_deref())
    .bind(query.page_size)
    .bind(query.offset)
    .fetch_all(pool)
    .await
    .map_err(store_error)?;

    collection_from_rows(rows, &query)
}

async fn list_payment_attempts(
    pool: &PgPool,
    query: ListAdminTransactionRecordsQuery,
) -> DomainResult<AdminTransactionCollection> {
    let rows = sqlx::query(
        r#"
        SELECT json_build_object(
            'id', pa.id,
            'tenant_id', pa.tenant_id,
            'organization_id', pa.organization_id,
            'owner_user_id', pa.owner_user_id,
            'payment_intent_id', pa.payment_intent_id,
            'intentId', pa.payment_intent_id,
            'order_id', pa.order_id,
            'orderId', pa.order_id,
            'provider', pa.provider,
            'methodCode', CASE
                WHEN pa.provider = 'stripe' THEN 'card'
                WHEN pa.provider IN ('wechat', 'wechatpay') THEN 'wechat_pay'
                ELSE pa.provider
            END,
            'providerCode', CASE
                WHEN pa.provider = 'card' THEN 'stripe'
                WHEN pa.provider IN ('wechat', 'wechatpay') THEN 'wechat_pay'
                ELSE pa.provider
            END,
            'out_trade_no', pa.out_trade_no,
            'attemptNo', pa.out_trade_no,
            'externalTradeNo', pa.out_trade_no,
            'amount', pa.amount,
            'currency_code', pa.currency_code,
            'currencyCode', pa.currency_code,
            'status', pa.status,
            'callback_payload', pa.callback_payload,
            'created_at', pa.created_at,
            'createdAt', pa.created_at,
            'paid_at', pa.paid_at,
            'paidAt', pa.paid_at,
            'updated_at', pa.updated_at,
            'updatedAt', pa.updated_at
        ) AS item,
        COUNT(*) OVER() AS total
        FROM commerce_payment_attempt pa
        WHERE pa.tenant_id = CAST($1 AS TEXT)
          AND pa.organization_id = CAST($2 AS TEXT)
          AND (CAST($3 AS TEXT) IS NULL OR pa.status = CAST($3 AS TEXT))
          AND (CAST($4 AS TEXT) IS NULL OR CASE
                WHEN pa.provider = 'card' THEN 'stripe'
                WHEN pa.provider IN ('wechat', 'wechatpay') THEN 'wechat_pay'
                ELSE pa.provider
              END = CAST($4 AS TEXT))
          AND (CAST($5 AS TEXT) IS NULL OR pa.order_id = CAST($5 AS TEXT))
          AND (CAST($6 AS TEXT) IS NULL OR pa.payment_intent_id = CAST($6 AS TEXT))
        ORDER BY pa.created_at DESC NULLS LAST, pa.id DESC
        LIMIT $7 OFFSET $8
        "#,
    )
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.status.as_deref())
    .bind(query.supplier_code.as_deref())
    .bind(query.order_id.as_deref())
    .bind(query.intent_id.as_deref())
    .bind(query.page_size)
    .bind(query.offset)
    .fetch_all(pool)
    .await
    .map_err(store_error)?;

    collection_from_rows(rows, &query)
}

async fn list_payment_webhook_events(
    pool: &PgPool,
    query: ListAdminTransactionRecordsQuery,
) -> DomainResult<AdminTransactionCollection> {
    let rows = sqlx::query(
        r#"
        SELECT json_build_object(
            'id', id,
            'tenant_id', tenant_id,
            'organization_id', organization_id,
            'provider', provider,
            'providerCode', provider,
            'event_id', event_id,
            'eventNo', event_id,
            'externalEventId', event_id,
            'nonce', nonce,
            'signature', signature,
            'request_timestamp', request_timestamp,
            'out_trade_no', out_trade_no,
            'eventType', out_trade_no,
            'transaction_id', transaction_id,
            'payload_digest', payload_digest,
            'status', status,
            'processStatus', status,
            'message', message,
            'request_no', request_no,
            'idempotency_key', idempotency_key,
            'created_at', created_at,
            'receivedAt', created_at,
            'processed_at', processed_at,
            'processedAt', processed_at,
            'updated_at', updated_at
        ) AS item,
        COUNT(*) OVER() AS total
        FROM commerce_payment_webhook_event
        WHERE tenant_id = CAST($1 AS TEXT)
          AND organization_id = CAST($2 AS TEXT)
          AND (CAST($3 AS TEXT) IS NULL OR status = CAST($3 AS TEXT))
          AND (CAST($4 AS TEXT) IS NULL OR provider = CAST($4 AS TEXT))
        ORDER BY created_at DESC NULLS LAST, id DESC
        LIMIT $5 OFFSET $6
        "#,
    )
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.status.as_deref())
    .bind(query.supplier_code.as_deref())
    .bind(query.page_size)
    .bind(query.offset)
    .fetch_all(pool)
    .await
    .map_err(store_error)?;

    collection_from_rows(rows, &query)
}

async fn list_payment_reconciliation_runs(
    pool: &PgPool,
    query: ListAdminTransactionRecordsQuery,
) -> DomainResult<AdminTransactionCollection> {
    let rows = sqlx::query(
        r#"
        SELECT json_build_object(
            'id', id,
            'tenant_id', tenant_id,
            'organization_id', organization_id,
            'run_no', run_no,
            'runNo', run_no,
            'supplier_code', supplier_code,
            'providerCode', supplier_code,
            'provider_account_id', provider_account_id,
            'providerAccountId', provider_account_id,
            'settlement_currency', settlement_currency,
            'settlementCurrency', settlement_currency,
            'period_start', period_start,
            'businessDate', period_start,
            'period_end', period_end,
            'status', status,
            'total_provider_amount', total_provider_amount,
            'total_internal_amount', total_internal_amount,
            'difference_amount', difference_amount,
            'matched_count', matched_count,
            'mismatched_count', mismatched_count,
            'missing_provider_count', missing_provider_count,
            'missing_internal_count', missing_internal_count,
            'report_file_ref', report_file_ref,
            'started_at', started_at,
            'completed_at', completed_at,
            'finishedAt', completed_at,
            'request_no', request_no,
            'idempotency_key', idempotency_key,
            'created_at', created_at,
            'createdAt', created_at,
            'updated_at', updated_at
        ) AS item,
        COUNT(*) OVER() AS total
        FROM commerce_payment_reconciliation_run
        WHERE tenant_id = CAST($1 AS TEXT)
          AND organization_id = CAST($2 AS TEXT)
          AND (CAST($3 AS TEXT) IS NULL OR status = CAST($3 AS TEXT))
          AND (CAST($4 AS TEXT) IS NULL OR supplier_code = CAST($4 AS TEXT))
          AND (CAST($5 AS TEXT) IS NULL OR period_start = CAST($5 AS TEXT))
        ORDER BY created_at DESC NULLS LAST, id DESC
        LIMIT $6 OFFSET $7
        "#,
    )
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.status.as_deref())
    .bind(query.supplier_code.as_deref())
    .bind(query.business_date.as_deref())
    .bind(query.page_size)
    .bind(query.offset)
    .fetch_all(pool)
    .await
    .map_err(store_error)?;

    collection_from_rows(rows, &query)
}

fn payment_provider_account_json_sql(
    total_projection: &'static str,
    suffix: &'static str,
) -> String {
    let total_projection = if total_projection.trim().is_empty() {
        String::new()
    } else {
        format!(", {total_projection}")
    };
    format!(
        r#"
        SELECT json_build_object(
            'id', id,
            'tenant_id', tenant_id,
            'organization_id', organization_id,
            'account_no', account_no,
            'accountNo', account_no,
            'supplier_code', supplier_code,
            'providerCode', supplier_code,
            'accountRole', (
                SELECT audit.change_summary->>'accountRole'
                FROM ops_audit_log audit
                WHERE audit.tenant_id = CAST(commerce_payment_provider_account.tenant_id AS BIGINT)
                  AND audit.organization_id = CAST(commerce_payment_provider_account.organization_id AS BIGINT)
                  AND audit.action IN ('payments.provider_account.create', 'payments.provider_account.update')
                  AND audit.target_uuid = commerce_payment_provider_account.id
                ORDER BY audit.id DESC
                LIMIT 1
            ),
            'merchant_id', merchant_id,
            'merchantId', merchant_id,
            'environment', environment,
            'country_code', country_code,
            'countryCode', country_code,
            'settlement_currency', settlement_currency,
            'settlementCurrency', settlement_currency,
            'secret_ref', secret_ref,
            'secretRef', secret_ref,
            'webhook_secret_ref', webhook_secret_ref,
            'webhookSecretRef', webhook_secret_ref,
            'certificate_ref', certificate_ref,
            'certificateRef', certificate_ref,
            'status', status,
            'rotated_at', rotated_at,
            'rotatedAt', rotated_at,
            'note', (
                SELECT audit.change_summary->>'note'
                FROM ops_audit_log audit
                WHERE audit.tenant_id = CAST(commerce_payment_provider_account.tenant_id AS BIGINT)
                  AND audit.organization_id = CAST(commerce_payment_provider_account.organization_id AS BIGINT)
                  AND audit.action IN ('payments.provider_account.create', 'payments.provider_account.update', 'payments.provider_account.status.update')
                  AND audit.target_uuid = commerce_payment_provider_account.id
                ORDER BY audit.id DESC
                LIMIT 1
            ),
            'created_at', created_at,
            'createdAt', created_at,
            'updated_at', updated_at,
            'updatedAt', updated_at
        ) AS item
        {total_projection}
        FROM commerce_payment_provider_account
        {suffix}
        "#
    )
}

fn collection_from_rows(
    rows: Vec<sqlx::postgres::PgRow>,
    query: &ListAdminTransactionRecordsQuery,
) -> DomainResult<AdminTransactionCollection> {
    let total = rows
        .first()
        .map(|row| integer_cell(row, "total"))
        .transpose()?
        .unwrap_or(0);
    let mut items = Vec::with_capacity(rows.len());
    for row in rows {
        items.push(json_record_cell(&row)?);
    }
    Ok(AdminTransactionCollection {
        items,
        total,
        page_no: query.page_no,
        page_size: query.page_size,
    })
}

fn collection_from_child_rows(
    rows: Vec<sqlx::postgres::PgRow>,
    query: &ListAdminTransactionChildRecordsQuery,
) -> DomainResult<AdminTransactionCollection> {
    let total = rows
        .first()
        .map(|row| integer_cell(row, "total"))
        .transpose()?
        .unwrap_or(0);
    let mut items = Vec::with_capacity(rows.len());
    for row in rows {
        items.push(json_record_cell(&row)?);
    }
    Ok(AdminTransactionCollection {
        items,
        total,
        page_no: query.page_no,
        page_size: query.page_size,
    })
}

fn json_record_cell(row: &sqlx::postgres::PgRow) -> DomainResult<AdminTransactionJsonRecord> {
    let value = row
        .try_get::<serde_json::Value, _>("item")
        .map_err(|error| DomainError::new(error.to_string()))?;
    match value {
        serde_json::Value::Object(record) => Ok(record),
        _ => Err(DomainError::new(
            "transaction center JSON projection was not an object",
        )),
    }
}

fn string_cell(row: &sqlx::postgres::PgRow, column: &str) -> DomainResult<String> {
    if let Ok(value) = row.try_get::<Option<String>, _>(column) {
        return Ok(value.unwrap_or_default());
    }
    if let Ok(value) = row.try_get::<String, _>(column) {
        return Ok(value);
    }
    if let Ok(value) = row.try_get::<Option<i64>, _>(column) {
        return Ok(value.map(|value| value.to_string()).unwrap_or_default());
    }
    if let Ok(value) = row.try_get::<i64, _>(column) {
        return Ok(value.to_string());
    }
    if let Ok(value) = row.try_get::<Option<i32>, _>(column) {
        return Ok(value.map(|value| value.to_string()).unwrap_or_default());
    }
    if let Ok(value) = row.try_get::<i32, _>(column) {
        return Ok(value.to_string());
    }
    Err(DomainError::new(format!(
        "transaction center row column {column} is not readable as text"
    )))
}

fn integer_cell(row: &sqlx::postgres::PgRow, column: &str) -> DomainResult<i64> {
    if let Ok(value) = row.try_get::<i64, _>(column) {
        return Ok(value);
    }
    if let Ok(value) = row.try_get::<Option<i64>, _>(column) {
        return Ok(value.unwrap_or_default());
    }
    if let Ok(value) = row.try_get::<i32, _>(column) {
        return Ok(i64::from(value));
    }
    Err(DomainError::new(format!(
        "transaction center row column {column} is not readable as integer"
    )))
}

fn stable_id(prefix: &str, parts: &[&str]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(prefix.as_bytes());
    for part in parts {
        hasher.update([0]);
        hasher.update(part.as_bytes());
    }
    let digest = hasher.finalize();
    let mut suffix = String::with_capacity(32);
    for byte in &digest[..16] {
        suffix.push_str(&format!("{byte:02x}"));
    }
    format!("{prefix}-{suffix}")
}

fn payment_provider_account_idempotency_id(
    command: &CreateAdminPaymentProviderAccountCommand,
) -> String {
    stable_id(
        "payment-provider-account-command",
        &[
            &command.subject.tenant_id.to_string(),
            &command.subject.organization_id.to_string(),
            &command.idempotency_key,
        ],
    )
}

fn ensure_payment_provider_account_replay_matches(
    item: &AdminTransactionJsonRecord,
    command: &CreateAdminPaymentProviderAccountCommand,
) -> DomainResult<()> {
    for (field, expected) in [
        ("accountNo", command.account_no.as_str()),
        ("providerCode", command.supplier_code.as_str()),
        ("merchantId", command.merchant_id.as_str()),
        ("environment", command.environment.as_str()),
        ("countryCode", command.country_code.as_str()),
        ("settlementCurrency", command.settlement_currency.as_str()),
        ("secretRef", command.secret_ref.as_str()),
        ("status", command.status.as_str()),
    ] {
        if item_text(item, field) != Some(expected) {
            return Err(DomainError::conflict(format!(
                "payment provider account idempotency replay conflicts with field {field}"
            )));
        }
    }
    for (field, expected) in [
        ("webhookSecretRef", command.webhook_secret_ref.as_deref()),
        ("certificateRef", command.certificate_ref.as_deref()),
        ("rotatedAt", command.rotated_at.as_deref()),
        ("accountRole", command.account_role.as_deref()),
    ] {
        if item_optional_text(item, field) != expected {
            return Err(DomainError::conflict(format!(
                "payment provider account idempotency replay conflicts with field {field}"
            )));
        }
    }
    Ok(())
}

async fn ensure_payment_provider_account_replay_audit_matches(
    pool: &PgPool,
    command: &CreateAdminPaymentProviderAccountCommand,
    provider_account_id: &str,
) -> DomainResult<()> {
    let Some(change_summary) =
        load_payment_provider_account_audit_change_summary(pool, command, provider_account_id)
            .await?
    else {
        return Err(DomainError::conflict(
            "payment provider account idempotency replay cannot verify audit metadata",
        ));
    };
    for (field, expected) in [
        ("clientRequestNo", command.client_request_no.as_deref()),
        ("note", command.note.as_deref()),
    ] {
        if json_optional_text(&change_summary, field) != expected {
            return Err(DomainError::conflict(format!(
                "payment provider account idempotency replay conflicts with field {field}"
            )));
        }
    }
    Ok(())
}

async fn load_payment_provider_account_audit_change_summary(
    pool: &PgPool,
    command: &CreateAdminPaymentProviderAccountCommand,
    provider_account_id: &str,
) -> DomainResult<Option<serde_json::Value>> {
    let row = sqlx::query(
        r#"
        SELECT change_summary
        FROM ops_audit_log
        WHERE tenant_id = $1
          AND organization_id = $2
          AND action = $3
          AND target_uuid = $4
        ORDER BY id ASC
        LIMIT 1
        "#,
    )
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(PAYMENT_PROVIDER_ACCOUNT_AUDIT_ACTION)
    .bind(provider_account_id)
    .fetch_optional(pool)
    .await
    .map_err(store_error)?;

    row.map(|row| {
        row.try_get::<serde_json::Value, _>("change_summary")
            .map_err(|error| DomainError::new(error.to_string()))
    })
    .transpose()
}

fn item_text<'a>(item: &'a AdminTransactionJsonRecord, field: &str) -> Option<&'a str> {
    item.get(field)
        .and_then(serde_json::Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
}

fn item_optional_text<'a>(item: &'a AdminTransactionJsonRecord, field: &str) -> Option<&'a str> {
    item.get(field)
        .and_then(serde_json::Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
}

fn json_optional_text<'a>(value: &'a serde_json::Value, field: &str) -> Option<&'a str> {
    value
        .get(field)
        .and_then(serde_json::Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
}

fn is_unique_constraint_error(error: &sqlx::Error) -> bool {
    let message = error.to_string();
    message.contains("duplicate key value") || message.contains("unique constraint")
}

fn write_error(context: &str, error: sqlx::Error) -> DomainError {
    let message = error.to_string();
    if is_unique_constraint_error(&error) {
        return DomainError::conflict(format!("{context}: record already exists"));
    }
    DomainError::new(format!("{context}: {message}"))
}

fn store_error(error: sqlx::Error) -> DomainError {
    DomainError::new(error.to_string())
}
