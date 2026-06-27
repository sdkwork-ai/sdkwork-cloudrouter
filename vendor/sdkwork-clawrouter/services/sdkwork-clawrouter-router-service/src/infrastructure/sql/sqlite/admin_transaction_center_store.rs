use sha2::{Digest, Sha256};
use sqlx::{Row, Sqlite, SqlitePool, Transaction};

use crate::domain::{DomainError, DomainResult};
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
pub struct SqliteAdminTransactionCenterStore {
    pool: SqlitePool,
}

impl SqliteAdminTransactionCenterStore {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }
}

impl AdminTransactionCenterStore for SqliteAdminTransactionCenterStore {
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
    pool: &SqlitePool,
    query: ListAdminTransactionRecordsQuery,
) -> DomainResult<AdminTransactionCollection> {
    let rows = sqlx::query(
        r#"
        SELECT
            o.id AS id,
            o.tenant_id AS tenant_id,
            o.organization_id AS organization_id,
            o.owner_user_id AS owner_user_id,
            o.order_no AS order_no,
            o.subject AS order_type,
            o.subject AS subject,
            o.status AS status,
            COALESCE(pi.status, o.status) AS pay_status,
            COALESCE(ab.payable_amount, pi.amount, '0') AS total_amount,
            o.currency_code AS currency_code,
            o.request_no AS request_no,
            o.idempotency_key AS idempotency_key,
            o.created_at AS created_at,
            o.paid_at AS paid_at,
            o.cancelled_at AS cancelled_at,
            o.expired_at AS expired_at,
            o.updated_at AS updated_at,
            COUNT(*) OVER() AS total
        FROM commerce_order o
        LEFT JOIN commerce_order_amount_breakdown ab
          ON ab.tenant_id = o.tenant_id
         AND ab.order_id = o.id
        LEFT JOIN commerce_payment_intent pi
          ON pi.tenant_id = o.tenant_id
         AND (pi.organization_id IS NULL OR o.organization_id IS NULL OR pi.organization_id = o.organization_id)
         AND pi.order_id = o.id
        WHERE o.tenant_id = CAST(?1 AS TEXT)
          AND o.organization_id = CAST(?2 AS TEXT)
          AND (?3 IS NULL OR o.status = ?3 OR pi.status = ?3)
          AND (?4 IS NULL OR o.id = ?4 OR o.order_no = ?4)
        ORDER BY o.created_at DESC, o.id DESC
        LIMIT ?5 OFFSET ?6
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

    collection_from_rows(rows, &query, ORDER_FIELDS)
}

async fn load_order(
    pool: &SqlitePool,
    query: LoadAdminTransactionRecordQuery,
) -> DomainResult<Option<AdminTransactionJsonRecord>> {
    let row = sqlx::query(
        r#"
        SELECT
            o.id AS id,
            o.tenant_id AS tenant_id,
            o.organization_id AS organization_id,
            o.owner_user_id AS owner_user_id,
            o.order_no AS order_no,
            o.subject AS order_type,
            o.subject AS subject,
            o.status AS status,
            COALESCE(pi.status, o.status) AS pay_status,
            COALESCE(ab.payable_amount, pi.amount, '0') AS total_amount,
            o.currency_code AS currency_code,
            o.request_no AS request_no,
            o.idempotency_key AS idempotency_key,
            o.created_at AS created_at,
            o.paid_at AS paid_at,
            o.cancelled_at AS cancelled_at,
            o.expired_at AS expired_at,
            o.updated_at AS updated_at
        FROM commerce_order o
        LEFT JOIN commerce_order_amount_breakdown ab
          ON ab.tenant_id = o.tenant_id
         AND ab.order_id = o.id
        LEFT JOIN commerce_payment_intent pi
          ON pi.tenant_id = o.tenant_id
         AND (pi.organization_id IS NULL OR o.organization_id IS NULL OR pi.organization_id = o.organization_id)
         AND pi.order_id = o.id
        WHERE o.tenant_id = CAST(?1 AS TEXT)
          AND o.organization_id = CAST(?2 AS TEXT)
          AND (o.id = ?3 OR o.order_no = ?3)
        ORDER BY o.created_at DESC, o.id DESC
        LIMIT 1
        "#,
    )
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.record_id)
    .fetch_optional(pool)
    .await
    .map_err(store_error)?;

    row.map(|row| record_from_row(&row, ORDER_FIELDS))
        .transpose()
}

async fn list_order_events(
    pool: &SqlitePool,
    query: ListAdminTransactionChildRecordsQuery,
) -> DomainResult<AdminTransactionCollection> {
    let rows = sqlx::query(
        r#"
        SELECT
            id,
            tenant_id,
            organization_id,
            event_no,
            order_id,
            event_type,
            from_status,
            to_status,
            actor_type,
            actor_id,
            reason_code,
            message,
            payload_json,
            request_id,
            idempotency_key,
            created_at,
            COUNT(*) OVER() AS total
        FROM commerce_order_event
        WHERE tenant_id = CAST(?1 AS TEXT)
          AND organization_id = CAST(?2 AS TEXT)
          AND order_id = ?3
          AND (?4 IS NULL OR to_status = ?4 OR event_type = ?4)
        ORDER BY created_at DESC, id DESC
        LIMIT ?5 OFFSET ?6
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

    collection_from_child_rows(rows, &query, ORDER_EVENT_FIELDS)
}

async fn list_refunds(
    pool: &SqlitePool,
    query: ListAdminTransactionRecordsQuery,
) -> DomainResult<AdminTransactionCollection> {
    let rows = sqlx::query(
        r#"
        SELECT
            r.id AS id,
            r.tenant_id AS tenant_id,
            r.payment_attempt_id AS payment_attempt_id,
            pa.payment_intent_id AS payment_intent_id,
            pa.order_id AS order_id,
            r.refund_no AS refund_no,
            r.amount AS amount,
            COALESCE(pa.currency_code, '') AS currency_code,
            r.status AS status,
            r.request_no AS request_no,
            r.idempotency_key AS idempotency_key,
            r.created_at AS created_at,
            r.updated_at AS updated_at,
            COUNT(*) OVER() AS total
        FROM commerce_refund r
        LEFT JOIN commerce_payment_attempt pa
          ON pa.tenant_id = r.tenant_id
         AND pa.id = r.payment_attempt_id
        WHERE r.tenant_id = CAST(?1 AS TEXT)
          AND (?2 IS NULL OR pa.organization_id = CAST(?2 AS TEXT))
          AND (?3 IS NULL OR r.status = ?3)
          AND (?4 IS NULL OR pa.order_id = ?4)
        ORDER BY r.created_at DESC, r.id DESC
        LIMIT ?5 OFFSET ?6
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

    collection_from_rows(rows, &query, REFUND_FIELDS)
}

async fn load_refund(
    pool: &SqlitePool,
    query: LoadAdminTransactionRecordQuery,
) -> DomainResult<Option<AdminTransactionJsonRecord>> {
    let row = sqlx::query(
        r#"
        SELECT
            r.id AS id,
            r.tenant_id AS tenant_id,
            r.payment_attempt_id AS payment_attempt_id,
            pa.payment_intent_id AS payment_intent_id,
            pa.order_id AS order_id,
            r.refund_no AS refund_no,
            r.amount AS amount,
            COALESCE(pa.currency_code, '') AS currency_code,
            r.status AS status,
            r.request_no AS request_no,
            r.idempotency_key AS idempotency_key,
            r.created_at AS created_at,
            r.updated_at AS updated_at
        FROM commerce_refund r
        LEFT JOIN commerce_payment_attempt pa
          ON pa.tenant_id = r.tenant_id
         AND pa.id = r.payment_attempt_id
        WHERE r.tenant_id = CAST(?1 AS TEXT)
          AND (?2 IS NULL OR pa.organization_id = CAST(?2 AS TEXT))
          AND (r.id = ?3 OR r.refund_no = ?3)
        ORDER BY r.created_at DESC, r.id DESC
        LIMIT 1
        "#,
    )
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.record_id)
    .fetch_optional(pool)
    .await
    .map_err(store_error)?;

    row.map(|row| record_from_row(&row, REFUND_FIELDS))
        .transpose()
}

async fn list_fulfillments(
    pool: &SqlitePool,
    query: ListAdminTransactionRecordsQuery,
) -> DomainResult<AdminTransactionCollection> {
    let rows = sqlx::query(
        r#"
        SELECT
            id,
            tenant_id,
            organization_id,
            fulfillment_no,
            order_id,
            fulfillment_type,
            status,
            warehouse_id,
            address_snapshot_id,
            provider_code,
            created_at,
            completed_at,
            updated_at,
            COUNT(*) OVER() AS total
        FROM commerce_fulfillment_order
        WHERE tenant_id = CAST(?1 AS TEXT)
          AND organization_id = CAST(?2 AS TEXT)
          AND (?3 IS NULL OR status = ?3)
          AND (?4 IS NULL OR order_id = ?4)
        ORDER BY created_at DESC, id DESC
        LIMIT ?5 OFFSET ?6
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

    collection_from_rows(rows, &query, FULFILLMENT_FIELDS)
}

async fn list_shipments(
    pool: &SqlitePool,
    query: ListAdminTransactionRecordsQuery,
) -> DomainResult<AdminTransactionCollection> {
    let rows = sqlx::query(
        r#"
        SELECT
            id,
            tenant_id,
            organization_id,
            shipment_no,
            fulfillment_id,
            carrier_code,
            tracking_no,
            status,
            shipped_at,
            delivered_at,
            created_at,
            updated_at,
            COUNT(*) OVER() AS total
        FROM commerce_shipment
        WHERE tenant_id = CAST(?1 AS TEXT)
          AND organization_id = CAST(?2 AS TEXT)
          AND (?3 IS NULL OR status = ?3)
        ORDER BY created_at DESC, id DESC
        LIMIT ?4 OFFSET ?5
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

    collection_from_rows(rows, &query, SHIPMENT_FIELDS)
}

async fn list_shipment_tracking_events(
    pool: &SqlitePool,
    query: ListAdminTransactionChildRecordsQuery,
) -> DomainResult<AdminTransactionCollection> {
    let rows = sqlx::query(
        r#"
        SELECT
            id,
            tenant_id,
            organization_id,
            shipment_id,
            event_time,
            event_code,
            location,
            description,
            raw_payload_json,
            created_at,
            COUNT(*) OVER() AS total
        FROM commerce_shipment_tracking_event
        WHERE tenant_id = CAST(?1 AS TEXT)
          AND organization_id = CAST(?2 AS TEXT)
          AND shipment_id = ?3
          AND (?4 IS NULL OR event_code = ?4)
        ORDER BY event_time DESC, id DESC
        LIMIT ?5 OFFSET ?6
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

    collection_from_child_rows(rows, &query, SHIPMENT_TRACKING_EVENT_FIELDS)
}

async fn list_payment_providers(
    pool: &SqlitePool,
    query: ListAdminTransactionRecordsQuery,
) -> DomainResult<AdminTransactionCollection> {
    let rows = sqlx::query(
        r#"
        SELECT
            id,
            tenant_id,
            organization_id,
            provider_code,
            provider_code AS providerCode,
            display_name,
            display_name AS displayName,
            provider_type,
            provider_type AS providerType,
            supported_countries,
            COALESCE(NULLIF(supported_countries, ''), '[]') AS supportedCountries,
            supported_currencies,
            COALESCE(NULLIF(supported_currencies, ''), '[]') AS supportedCurrencies,
            supported_methods,
            '["payment_intent","payment_query","payment_close","refund","webhook","reconciliation"]' AS capabilities,
            status,
            sort_order,
            sort_order AS sortOrder,
            created_at,
            created_at AS createdAt,
            updated_at,
            updated_at AS updatedAt,
            COUNT(*) OVER() AS total
        FROM commerce_payment_provider
        WHERE tenant_id IN (CAST(?1 AS TEXT), '0')
          AND (organization_id = CAST(?2 AS TEXT) OR organization_id = '0')
          AND (?3 IS NULL OR status = ?3)
          AND (?4 IS NULL OR provider_code = ?4)
        ORDER BY
            CASE
                WHEN tenant_id = CAST(?1 AS TEXT) AND organization_id = CAST(?2 AS TEXT) THEN 0
                ELSE 1
            END ASC,
            sort_order ASC,
            updated_at DESC,
            id DESC
        LIMIT ?5 OFFSET ?6
        "#,
    )
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.status.as_deref())
    .bind(query.provider_code.as_deref())
    .bind(query.page_size)
    .bind(query.offset)
    .fetch_all(pool)
    .await
    .map_err(store_error)?;

    collection_from_rows(rows, &query, PAYMENT_PROVIDER_FIELDS)
}

async fn list_payment_provider_accounts(
    pool: &SqlitePool,
    query: ListAdminTransactionRecordsQuery,
) -> DomainResult<AdminTransactionCollection> {
    let rows = sqlx::query(
        r#"
        SELECT
            id,
            tenant_id,
            organization_id,
            account_no,
            account_no AS accountNo,
            provider_code,
            provider_code AS providerCode,
            (
                SELECT json_extract(audit.change_summary, '$.accountRole')
                FROM ops_audit_log audit
                WHERE audit.tenant_id = CAST(commerce_payment_provider_account.tenant_id AS INTEGER)
                  AND audit.organization_id = CAST(commerce_payment_provider_account.organization_id AS INTEGER)
                  AND audit.action IN ('payments.provider_account.create', 'payments.provider_account.update')
                  AND audit.target_uuid = commerce_payment_provider_account.id
                ORDER BY audit.id DESC
                LIMIT 1
            ) AS accountRole,
            merchant_id,
            merchant_id AS merchantId,
            environment,
            country_code,
            country_code AS countryCode,
            settlement_currency,
            settlement_currency AS settlementCurrency,
            secret_ref,
            secret_ref AS secretRef,
            webhook_secret_ref,
            webhook_secret_ref AS webhookSecretRef,
            certificate_ref,
            certificate_ref AS certificateRef,
            status,
            rotated_at,
            rotated_at AS rotatedAt,
            (
                SELECT json_extract(audit.change_summary, '$.note')
                FROM ops_audit_log audit
                WHERE audit.tenant_id = CAST(commerce_payment_provider_account.tenant_id AS INTEGER)
                  AND audit.organization_id = CAST(commerce_payment_provider_account.organization_id AS INTEGER)
                  AND audit.action IN ('payments.provider_account.create', 'payments.provider_account.update', 'payments.provider_account.status.update')
                  AND audit.target_uuid = commerce_payment_provider_account.id
                ORDER BY audit.id DESC
                LIMIT 1
            ) AS note,
            created_at,
            created_at AS createdAt,
            updated_at,
            updated_at AS updatedAt,
            COUNT(*) OVER() AS total
        FROM commerce_payment_provider_account
        WHERE tenant_id IN (CAST(?1 AS TEXT), '0')
          AND (organization_id = CAST(?2 AS TEXT) OR organization_id = '0')
          AND (?3 IS NULL OR status = ?3)
          AND (?4 IS NULL OR provider_code = ?4)
          AND (?5 IS NULL OR id = ?5 OR account_no = ?5)
        ORDER BY
            CASE
                WHEN tenant_id = CAST(?1 AS TEXT) AND organization_id = CAST(?2 AS TEXT) THEN 0
                ELSE 1
            END ASC,
            updated_at DESC,
            id DESC
        LIMIT ?6 OFFSET ?7
        "#,
    )
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.status.as_deref())
    .bind(query.provider_code.as_deref())
    .bind(query.provider_account_id.as_deref())
    .bind(query.page_size)
    .bind(query.offset)
    .fetch_all(pool)
    .await
    .map_err(store_error)?;

    collection_from_rows(rows, &query, PAYMENT_PROVIDER_ACCOUNT_FIELDS)
}

async fn create_payment_provider_account(
    pool: &SqlitePool,
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

    let mut tx = pool.begin().await.map_err(|error| store_error(error))?;

    let insert_result = sqlx::query(
        r#"
        INSERT INTO commerce_payment_provider_account
            (id, tenant_id, organization_id, account_no, provider_code, merchant_id, environment,
             country_code, settlement_currency, secret_ref, webhook_secret_ref, certificate_ref,
             status, rotated_at, created_at, updated_at)
        VALUES
            (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)
        "#,
    )
    .bind(&id)
    .bind(command.subject.tenant_id.to_string())
    .bind(command.subject.organization_id.to_string())
    .bind(&command.account_no)
    .bind(&command.provider_code)
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

    deactivate_peer_payment_provider_accounts_for_channel_scope(
        &mut tx,
        PaymentProviderAccountChannelScope {
            tenant_id: command.subject.tenant_id,
            organization_id: command.subject.organization_id,
            provider_account_id: id.clone(),
            provider_code: command.provider_code.clone(),
            environment: command.environment.clone(),
            country_code: command.country_code.clone(),
            settlement_currency: command.settlement_currency.clone(),
            status: command.status.clone(),
            requested_at: command.requested_at.clone(),
        },
    )
    .await?;
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
    pool: &SqlitePool,
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

    let mut tx = pool.begin().await.map_err(|error| store_error(error))?;
    let update_result = sqlx::query(
        r#"
        UPDATE commerce_payment_provider_account
        SET provider_code = ?1,
            merchant_id = ?2,
            environment = ?3,
            country_code = ?4,
            settlement_currency = ?5,
            secret_ref = ?6,
            webhook_secret_ref = ?7,
            certificate_ref = ?8,
            status = ?9,
            rotated_at = ?10,
            updated_at = ?11
        WHERE tenant_id = CAST(?12 AS TEXT)
          AND organization_id = CAST(?13 AS TEXT)
          AND id = ?14
        "#,
    )
    .bind(&command.provider_code)
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
    .await;

    let update_result = update_result
        .map_err(|error| write_error("failed to update payment provider account", error))?;
    if update_result.rows_affected() != 1 {
        return Err(DomainError::not_found(
            "payment provider account was not found",
        ));
    }

    deactivate_peer_payment_provider_accounts_for_channel_scope(
        &mut tx,
        PaymentProviderAccountChannelScope {
            tenant_id: command.subject.tenant_id,
            organization_id: command.subject.organization_id,
            provider_account_id: provider_account_id.clone(),
            provider_code: command.provider_code.clone(),
            environment: command.environment.clone(),
            country_code: command.country_code.clone(),
            settlement_currency: command.settlement_currency.clone(),
            status: command.status.clone(),
            requested_at: command.requested_at.clone(),
        },
    )
    .await?;
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
                "providerCode": command.provider_code,
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
    pool: &SqlitePool,
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

    let mut tx = pool.begin().await.map_err(|error| store_error(error))?;
    let update_result = sqlx::query(
        r#"
        UPDATE commerce_payment_provider_account
        SET status = ?1,
            updated_at = ?2
        WHERE tenant_id = CAST(?3 AS TEXT)
          AND organization_id = CAST(?4 AS TEXT)
          AND id = ?5
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

    if command.status == "active" {
        deactivate_peer_payment_provider_accounts_for_current_channel_scope(
            &mut tx,
            command.subject,
            &provider_account_id,
            &command.status,
            &command.requested_at,
        )
        .await?;
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
    provider_code: String,
    environment: String,
    country_code: String,
    settlement_currency: String,
    status: String,
    requested_at: String,
}

async fn deactivate_peer_payment_provider_accounts_for_current_channel_scope(
    tx: &mut Transaction<'_, Sqlite>,
    subject: AdminTransactionCenterSubject,
    provider_account_id: &str,
    status: &str,
    requested_at: &str,
) -> DomainResult<()> {
    if status != "active" {
        return Ok(());
    }
    let Some(scope) = load_payment_provider_account_channel_scope(
        tx,
        subject,
        provider_account_id,
        status,
        requested_at,
    )
    .await?
    else {
        return Ok(());
    };
    deactivate_peer_payment_provider_accounts_for_channel_scope(tx, scope).await
}

async fn load_payment_provider_account_channel_scope(
    tx: &mut Transaction<'_, Sqlite>,
    subject: AdminTransactionCenterSubject,
    provider_account_id: &str,
    status: &str,
    requested_at: &str,
) -> DomainResult<Option<PaymentProviderAccountChannelScope>> {
    let row = sqlx::query(
        r#"
        SELECT provider_code, environment, country_code, settlement_currency
        FROM commerce_payment_provider_account
        WHERE tenant_id = CAST(?1 AS TEXT)
          AND organization_id = CAST(?2 AS TEXT)
          AND id = ?3
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
        provider_code: string_cell(&row, "provider_code")?,
        environment: string_cell(&row, "environment")?,
        country_code: string_cell(&row, "country_code")?,
        settlement_currency: string_cell(&row, "settlement_currency")?,
        status: status.to_owned(),
        requested_at: requested_at.to_owned(),
    }))
}

async fn deactivate_peer_payment_provider_accounts_for_channel_scope(
    tx: &mut Transaction<'_, Sqlite>,
    scope: PaymentProviderAccountChannelScope,
) -> DomainResult<()> {
    if scope.status != "active" {
        return Ok(());
    }
    sqlx::query(
        r#"
        UPDATE commerce_payment_provider_account
        SET status = 'inactive',
            updated_at = ?1
        WHERE tenant_id = CAST(?2 AS TEXT)
          AND organization_id = CAST(?3 AS TEXT)
          AND id <> ?4
          AND provider_code = ?5
          AND environment = ?6
          AND country_code = ?7
          AND settlement_currency = ?8
          AND status = 'active'
        "#,
    )
    .bind(&scope.requested_at)
    .bind(scope.tenant_id)
    .bind(scope.organization_id)
    .bind(&scope.provider_account_id)
    .bind(&scope.provider_code)
    .bind(&scope.environment)
    .bind(&scope.country_code)
    .bind(&scope.settlement_currency)
    .execute(&mut **tx)
    .await
    .map_err(|error| write_error("failed to deactivate peer payment provider accounts", error))?;
    Ok(())
}

async fn delete_payment_provider_account(
    pool: &SqlitePool,
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

    let mut tx = pool.begin().await.map_err(|error| store_error(error))?;
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
        WHERE tenant_id = CAST(?1 AS TEXT)
          AND organization_id = CAST(?2 AS TEXT)
          AND id = ?3
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
    tx: &mut Transaction<'_, Sqlite>,
    command: &CreateAdminPaymentProviderAccountCommand,
    provider_account_id: &str,
) -> DomainResult<()> {
    let audit_request_id = command
        .request_id
        .as_deref()
        .unwrap_or(command.idempotency_key.as_str());
    let change_summary = serde_json::json!({
        "accountNo": command.account_no,
        "providerCode": command.provider_code,
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
             action, target_type, target_uuid, created_at, change_summary)
        SELECT
            ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11
        WHERE NOT EXISTS (
            SELECT 1
            FROM ops_audit_log
            WHERE tenant_id = ?12
              AND organization_id = ?13
              AND request_id = ?14
              AND action = ?15
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
    .bind(&command.requested_at)
    .bind(change_summary)
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
    tx: &mut Transaction<'_, Sqlite>,
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
             action, target_type, target_uuid, created_at, change_summary)
        SELECT
            ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11
        WHERE NOT EXISTS (
            SELECT 1
            FROM ops_audit_log
            WHERE tenant_id = ?12
              AND organization_id = ?13
              AND request_id = ?14
              AND action = ?15
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
    pool: &SqlitePool,
    tenant_id: i64,
    organization_id: i64,
    provider_account_id: &str,
) -> DomainResult<Option<String>> {
    let row = sqlx::query(
        r#"
        SELECT id
        FROM commerce_payment_provider_account
        WHERE tenant_id = CAST(?1 AS TEXT)
          AND organization_id = CAST(?2 AS TEXT)
          AND (id = ?3 OR account_no = ?3)
        LIMIT 1
        "#,
    )
    .bind(tenant_id)
    .bind(organization_id)
    .bind(provider_account_id)
    .fetch_optional(pool)
    .await
    .map_err(store_error)?;

    row.map(|row| string_cell(&row, "id")).transpose()
}

async fn count_payment_channels_for_provider_account(
    pool: &SqlitePool,
    tenant_id: i64,
    organization_id: i64,
    provider_account_id: &str,
) -> DomainResult<i64> {
    let row = sqlx::query(
        r#"
        SELECT COUNT(*) AS total
        FROM commerce_payment_channel
        WHERE tenant_id = CAST(?1 AS TEXT)
          AND organization_id = CAST(?2 AS TEXT)
          AND provider_account_id = ?3
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
    pool: &SqlitePool,
    tenant_id: i64,
    organization_id: i64,
    id: &str,
) -> DomainResult<Option<AdminTransactionJsonRecord>> {
    let row = sqlx::query(
        r#"
        SELECT
            id,
            tenant_id,
            organization_id,
            account_no,
            account_no AS accountNo,
            provider_code,
            provider_code AS providerCode,
            (
                SELECT json_extract(audit.change_summary, '$.accountRole')
                FROM ops_audit_log audit
                WHERE audit.tenant_id = CAST(commerce_payment_provider_account.tenant_id AS INTEGER)
                  AND audit.organization_id = CAST(commerce_payment_provider_account.organization_id AS INTEGER)
                  AND audit.action IN ('payments.provider_account.create', 'payments.provider_account.update')
                  AND audit.target_uuid = commerce_payment_provider_account.id
                ORDER BY audit.id DESC
                LIMIT 1
            ) AS accountRole,
            merchant_id,
            merchant_id AS merchantId,
            environment,
            country_code,
            country_code AS countryCode,
            settlement_currency,
            settlement_currency AS settlementCurrency,
            secret_ref,
            secret_ref AS secretRef,
            webhook_secret_ref,
            webhook_secret_ref AS webhookSecretRef,
            certificate_ref,
            certificate_ref AS certificateRef,
            status,
            rotated_at,
            rotated_at AS rotatedAt,
            (
                SELECT json_extract(audit.change_summary, '$.note')
                FROM ops_audit_log audit
                WHERE audit.tenant_id = CAST(commerce_payment_provider_account.tenant_id AS INTEGER)
                  AND audit.organization_id = CAST(commerce_payment_provider_account.organization_id AS INTEGER)
                  AND audit.action IN ('payments.provider_account.create', 'payments.provider_account.update', 'payments.provider_account.status.update')
                  AND audit.target_uuid = commerce_payment_provider_account.id
                ORDER BY audit.id DESC
                LIMIT 1
            ) AS note,
            created_at,
            created_at AS createdAt,
            updated_at,
            updated_at AS updatedAt
        FROM commerce_payment_provider_account
        WHERE tenant_id = CAST(?1 AS TEXT)
          AND organization_id = CAST(?2 AS TEXT)
          AND id = ?3
        LIMIT 1
        "#,
    )
    .bind(tenant_id)
    .bind(organization_id)
    .bind(id)
    .fetch_optional(pool)
    .await
    .map_err(store_error)?;

    row.map(|row| record_from_row(&row, PAYMENT_PROVIDER_ACCOUNT_FIELDS))
        .transpose()
}

async fn list_payment_methods(
    pool: &SqlitePool,
    query: ListAdminTransactionRecordsQuery,
) -> DomainResult<AdminTransactionCollection> {
    let rows = sqlx::query(
        r#"
        SELECT
            id,
            tenant_id,
            organization_id,
            method_key,
            method_key AS methodCode,
            display_name,
            display_name AS displayName,
            provider,
            NULLIF(provider, 'wallet_balance') AS providerCode,
            CASE method_key
                WHEN 'wechat_pay' THEN 'domestic_wallet'
                WHEN 'alipay' THEN 'domestic_wallet'
                WHEN 'paypal' THEN 'international_wallet'
                WHEN 'card' THEN 'card'
                WHEN 'apple_pay' THEN 'platform_wallet'
                WHEN 'google_pay' THEN 'platform_wallet'
                WHEN 'wallet_balance' THEN 'account_balance'
                ELSE 'card'
            END AS methodType,
            CASE method_key
                WHEN 'wallet_balance' THEN '["checkout","membership_purchase","points_recharge","subscription","invoice"]'
                ELSE '["checkout","membership_purchase","points_recharge","wallet_recharge","subscription","invoice"]'
            END AS checkoutScenes,
            status,
            sort_weight,
            sort_weight AS sortOrder,
            request_no,
            idempotency_key,
            created_at,
            created_at AS createdAt,
            updated_at,
            updated_at AS updatedAt,
            COUNT(*) OVER() AS total
        FROM commerce_payment_method
        WHERE tenant_id IN (CAST(?1 AS TEXT), '0')
          AND (organization_id = CAST(?2 AS TEXT) OR organization_id = '0')
          AND (?3 IS NULL OR status = ?3)
          AND (?4 IS NULL OR provider = ?4)
          AND (?5 IS NULL OR method_key = ?5)
        ORDER BY
            CASE
                WHEN tenant_id = CAST(?1 AS TEXT) AND organization_id = CAST(?2 AS TEXT) THEN 0
                ELSE 1
            END ASC,
            sort_weight ASC,
            updated_at DESC,
            id DESC
        LIMIT ?6 OFFSET ?7
        "#,
    )
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.status.as_deref())
    .bind(query.provider_code.as_deref())
    .bind(query.method_code.as_deref())
    .bind(query.page_size)
    .bind(query.offset)
    .fetch_all(pool)
    .await
    .map_err(store_error)?;

    collection_from_rows(rows, &query, PAYMENT_METHOD_FIELDS)
}

async fn list_payment_channels(
    pool: &SqlitePool,
    query: ListAdminTransactionRecordsQuery,
) -> DomainResult<AdminTransactionCollection> {
    let rows = sqlx::query(
        r#"
        SELECT
            c.id AS id,
            c.tenant_id AS tenant_id,
            c.organization_id AS organization_id,
            c.channel_no AS channel_no,
            c.channel_no AS channelNo,
            c.provider_account_id AS provider_account_id,
            c.provider_account_id AS providerAccountId,
            c.method_id AS method_id,
            m.method_key AS methodCode,
            a.provider_code AS providerCode,
            c.scene_code AS scene_code,
            c.scene_code AS sceneCode,
            c.currency_code AS currency_code,
            c.currency_code AS currencyCode,
            c.country_code AS country_code,
            c.country_code AS countryCode,
            c.status AS status,
            c.priority AS priority,
            c.created_at AS created_at,
            c.created_at AS createdAt,
            c.updated_at AS updated_at,
            c.updated_at AS updatedAt,
            COUNT(*) OVER() AS total
        FROM commerce_payment_channel c
        LEFT JOIN commerce_payment_method m
          ON m.tenant_id = c.tenant_id
         AND m.id = c.method_id
        LEFT JOIN commerce_payment_provider_account a
          ON a.tenant_id = c.tenant_id
         AND a.id = c.provider_account_id
        WHERE c.tenant_id IN (CAST(?1 AS TEXT), '0')
          AND (c.organization_id = CAST(?2 AS TEXT) OR c.organization_id = '0')
          AND (?3 IS NULL OR c.status = ?3)
          AND (?4 IS NULL OR a.provider_code = ?4)
          AND (?5 IS NULL OR c.provider_account_id = ?5)
          AND (?6 IS NULL OR m.method_key = ?6)
          AND (?7 IS NULL OR c.country_code = ?7)
          AND (?8 IS NULL OR c.currency_code = ?8)
        ORDER BY
            CASE
                WHEN c.tenant_id = CAST(?1 AS TEXT) AND c.organization_id = CAST(?2 AS TEXT) THEN 0
                ELSE 1
            END ASC,
            c.priority ASC,
            c.updated_at DESC,
            c.id DESC
        LIMIT ?9 OFFSET ?10
        "#,
    )
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.status.as_deref())
    .bind(query.provider_code.as_deref())
    .bind(query.provider_account_id.as_deref())
    .bind(query.method_code.as_deref())
    .bind(query.country_code.as_deref())
    .bind(query.currency_code.as_deref())
    .bind(query.page_size)
    .bind(query.offset)
    .fetch_all(pool)
    .await
    .map_err(store_error)?;

    collection_from_rows(rows, &query, PAYMENT_CHANNEL_FIELDS)
}

async fn list_payment_route_rules(
    pool: &SqlitePool,
    query: ListAdminTransactionRecordsQuery,
) -> DomainResult<AdminTransactionCollection> {
    let rows = sqlx::query(
        r#"
        SELECT
            r.id AS id,
            r.tenant_id AS tenant_id,
            r.organization_id AS organization_id,
            r.rule_no AS rule_no,
            r.rule_no AS ruleNo,
            r.priority AS priority,
            r.purchase_type AS purchase_type,
            COALESCE(r.purchase_type, c.scene_code) AS sceneCode,
            r.country_code AS country_code,
            COALESCE(r.country_code, c.country_code) AS countryCode,
            r.currency_code AS currency_code,
            COALESCE(r.currency_code, c.currency_code) AS currencyCode,
            r.client_platform AS client_platform,
            r.amount_min AS amount_min,
            r.amount_max AS amount_max,
            r.user_segment AS user_segment,
            r.risk_level AS risk_level,
            r.channel_id AS channel_id,
            r.channel_id AS channelId,
            NULL AS fallbackChannelId,
            0 AS fallbackEnabled,
            m.method_key AS methodCode,
            r.status AS status,
            r.starts_at AS starts_at,
            r.ends_at AS ends_at,
            r.created_at AS created_at,
            r.created_at AS createdAt,
            r.updated_at AS updated_at,
            r.updated_at AS updatedAt,
            COUNT(*) OVER() AS total
        FROM commerce_payment_route_rule r
        LEFT JOIN commerce_payment_channel c
          ON c.tenant_id = r.tenant_id
         AND c.id = r.channel_id
        LEFT JOIN commerce_payment_method m
          ON m.tenant_id = c.tenant_id
         AND m.id = c.method_id
        WHERE r.tenant_id IN (CAST(?1 AS TEXT), '0')
          AND (r.organization_id = CAST(?2 AS TEXT) OR r.organization_id = '0')
          AND (?3 IS NULL OR r.status = ?3)
          AND (?4 IS NULL OR m.provider = ?4)
          AND (?5 IS NULL OR m.method_key = ?5)
          AND (?6 IS NULL OR r.country_code = ?6)
          AND (?7 IS NULL OR r.currency_code = ?7)
        ORDER BY
            CASE
                WHEN r.tenant_id = CAST(?1 AS TEXT) AND r.organization_id = CAST(?2 AS TEXT) THEN 0
                ELSE 1
            END ASC,
            r.priority ASC,
            r.updated_at DESC,
            r.id DESC
        LIMIT ?8 OFFSET ?9
        "#,
    )
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.status.as_deref())
    .bind(query.provider_code.as_deref())
    .bind(query.method_code.as_deref())
    .bind(query.country_code.as_deref())
    .bind(query.currency_code.as_deref())
    .bind(query.page_size)
    .bind(query.offset)
    .fetch_all(pool)
    .await
    .map_err(store_error)?;

    collection_from_rows(rows, &query, PAYMENT_ROUTE_RULE_FIELDS)
}

async fn list_payment_intents(
    pool: &SqlitePool,
    query: ListAdminTransactionRecordsQuery,
) -> DomainResult<AdminTransactionCollection> {
    let rows = sqlx::query(
        r#"
        SELECT
            pi.id AS id,
            pi.tenant_id AS tenant_id,
            pi.organization_id AS organization_id,
            pi.owner_user_id AS owner_user_id,
            pi.order_id AS order_id,
            pi.order_id AS orderId,
            pi.provider AS provider,
            CASE
                WHEN pi.provider = 'stripe' THEN 'card'
                WHEN pi.provider IN ('wechat', 'wechatpay') THEN 'wechat_pay'
                ELSE pi.provider
            END AS methodCode,
            CASE
                WHEN pi.provider = 'card' THEN 'stripe'
                WHEN pi.provider IN ('wechat', 'wechatpay') THEN 'wechat_pay'
                ELSE pi.provider
            END AS providerCode,
            pi.amount AS amount,
            pi.currency_code AS currency_code,
            pi.currency_code AS currencyCode,
            pi.status AS status,
            pi.request_no AS request_no,
            pi.request_no AS intentNo,
            CASE o.subject
                WHEN 'membership' THEN 'membership_purchase'
                WHEN 'membership_purchase' THEN 'membership_purchase'
                WHEN 'points_recharge' THEN 'points_recharge'
                WHEN 'wallet_recharge' THEN 'wallet_recharge'
                WHEN 'subscription' THEN 'subscription'
                WHEN 'invoice' THEN 'invoice'
                ELSE 'order'
            END AS subjectType,
            pi.id AS intent_id,
            pi.id AS intentId,
            pi.id AS checkoutSessionId,
            pi.id AS payment_intent_id,
            pi.created_at AS created_at,
            pi.created_at AS createdAt,
            pi.updated_at AS updated_at,
            pi.updated_at AS updatedAt,
            COUNT(*) OVER() AS total
        FROM commerce_payment_intent pi
        LEFT JOIN commerce_order o
          ON o.tenant_id = pi.tenant_id
         AND o.id = pi.order_id
        WHERE pi.tenant_id = CAST(?1 AS TEXT)
          AND pi.organization_id = CAST(?2 AS TEXT)
          AND (?3 IS NULL OR pi.status = ?3)
          AND (?4 IS NULL OR CASE
                WHEN pi.provider = 'card' THEN 'stripe'
                WHEN pi.provider IN ('wechat', 'wechatpay') THEN 'wechat_pay'
                ELSE pi.provider
              END = ?4)
          AND (?5 IS NULL OR pi.order_id = ?5)
          AND (?6 IS NULL OR pi.id = ?6 OR pi.request_no = ?6)
        ORDER BY pi.created_at DESC, pi.id DESC
        LIMIT ?7 OFFSET ?8
        "#,
    )
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.status.as_deref())
    .bind(query.provider_code.as_deref())
    .bind(query.order_id.as_deref())
    .bind(query.intent_id.as_deref())
    .bind(query.page_size)
    .bind(query.offset)
    .fetch_all(pool)
    .await
    .map_err(store_error)?;

    collection_from_rows(rows, &query, PAYMENT_INTENT_FIELDS)
}

async fn list_payment_attempts(
    pool: &SqlitePool,
    query: ListAdminTransactionRecordsQuery,
) -> DomainResult<AdminTransactionCollection> {
    let rows = sqlx::query(
        r#"
        SELECT
            pa.id AS id,
            pa.tenant_id AS tenant_id,
            pa.organization_id AS organization_id,
            pa.owner_user_id AS owner_user_id,
            pa.payment_intent_id AS payment_intent_id,
            pa.payment_intent_id AS intentId,
            pa.order_id AS order_id,
            pa.order_id AS orderId,
            pa.provider AS provider,
            CASE
                WHEN pa.provider = 'stripe' THEN 'card'
                WHEN pa.provider IN ('wechat', 'wechatpay') THEN 'wechat_pay'
                ELSE pa.provider
            END AS methodCode,
            CASE
                WHEN pa.provider = 'card' THEN 'stripe'
                WHEN pa.provider IN ('wechat', 'wechatpay') THEN 'wechat_pay'
                ELSE pa.provider
            END AS providerCode,
            pa.out_trade_no AS out_trade_no,
            pa.out_trade_no AS attemptNo,
            pa.out_trade_no AS externalTradeNo,
            pa.amount AS amount,
            pa.currency_code AS currency_code,
            pa.currency_code AS currencyCode,
            pa.status AS status,
            pa.callback_payload AS callback_payload,
            pa.created_at AS created_at,
            pa.created_at AS createdAt,
            pa.paid_at AS paid_at,
            pa.paid_at AS paidAt,
            pa.updated_at AS updated_at,
            pa.updated_at AS updatedAt,
            COUNT(*) OVER() AS total
        FROM commerce_payment_attempt pa
        WHERE pa.tenant_id = CAST(?1 AS TEXT)
          AND pa.organization_id = CAST(?2 AS TEXT)
          AND (?3 IS NULL OR pa.status = ?3)
          AND (?4 IS NULL OR CASE
                WHEN pa.provider = 'card' THEN 'stripe'
                WHEN pa.provider IN ('wechat', 'wechatpay') THEN 'wechat_pay'
                ELSE pa.provider
              END = ?4)
          AND (?5 IS NULL OR pa.order_id = ?5)
          AND (?6 IS NULL OR pa.payment_intent_id = ?6)
        ORDER BY pa.created_at DESC, pa.id DESC
        LIMIT ?7 OFFSET ?8
        "#,
    )
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.status.as_deref())
    .bind(query.provider_code.as_deref())
    .bind(query.order_id.as_deref())
    .bind(query.intent_id.as_deref())
    .bind(query.page_size)
    .bind(query.offset)
    .fetch_all(pool)
    .await
    .map_err(store_error)?;

    collection_from_rows(rows, &query, PAYMENT_ATTEMPT_FIELDS)
}

async fn list_payment_webhook_events(
    pool: &SqlitePool,
    query: ListAdminTransactionRecordsQuery,
) -> DomainResult<AdminTransactionCollection> {
    let rows = sqlx::query(
        r#"
        SELECT
            id,
            tenant_id,
            organization_id,
            provider,
            provider AS providerCode,
            event_id,
            event_id AS eventNo,
            event_id AS externalEventId,
            nonce,
            signature,
            request_timestamp,
            out_trade_no,
            out_trade_no AS eventType,
            transaction_id,
            payload_digest,
            status,
            status AS processStatus,
            message,
            request_no,
            idempotency_key,
            created_at,
            created_at AS receivedAt,
            processed_at,
            processed_at AS processedAt,
            updated_at,
            COUNT(*) OVER() AS total
        FROM commerce_payment_webhook_event
        WHERE tenant_id = CAST(?1 AS TEXT)
          AND organization_id = CAST(?2 AS TEXT)
          AND (?3 IS NULL OR status = ?3)
          AND (?4 IS NULL OR provider = ?4)
        ORDER BY created_at DESC, id DESC
        LIMIT ?5 OFFSET ?6
        "#,
    )
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.status.as_deref())
    .bind(query.provider_code.as_deref())
    .bind(query.page_size)
    .bind(query.offset)
    .fetch_all(pool)
    .await
    .map_err(store_error)?;

    collection_from_rows(rows, &query, PAYMENT_WEBHOOK_EVENT_FIELDS)
}

async fn list_payment_reconciliation_runs(
    pool: &SqlitePool,
    query: ListAdminTransactionRecordsQuery,
) -> DomainResult<AdminTransactionCollection> {
    let rows = sqlx::query(
        r#"
        SELECT
            id,
            tenant_id,
            organization_id,
            run_no,
            run_no AS runNo,
            provider_code,
            provider_code AS providerCode,
            provider_account_id,
            provider_account_id AS providerAccountId,
            settlement_currency,
            settlement_currency AS settlementCurrency,
            period_start,
            period_start AS businessDate,
            period_end,
            status,
            total_provider_amount,
            total_internal_amount,
            difference_amount,
            matched_count,
            mismatched_count,
            missing_provider_count,
            missing_internal_count,
            report_file_ref,
            started_at,
            completed_at,
            completed_at AS finishedAt,
            request_no,
            idempotency_key,
            created_at,
            created_at AS createdAt,
            updated_at,
            COUNT(*) OVER() AS total
        FROM commerce_payment_reconciliation_run
        WHERE tenant_id = CAST(?1 AS TEXT)
          AND organization_id = CAST(?2 AS TEXT)
          AND (?3 IS NULL OR status = ?3)
          AND (?4 IS NULL OR provider_code = ?4)
          AND (?5 IS NULL OR period_start = ?5)
        ORDER BY created_at DESC, id DESC
        LIMIT ?6 OFFSET ?7
        "#,
    )
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.status.as_deref())
    .bind(query.provider_code.as_deref())
    .bind(query.business_date.as_deref())
    .bind(query.page_size)
    .bind(query.offset)
    .fetch_all(pool)
    .await
    .map_err(store_error)?;

    collection_from_rows(rows, &query, PAYMENT_RECONCILIATION_RUN_FIELDS)
}

const ORDER_FIELDS: &[Field] = &[
    Field::String("id"),
    Field::String("tenant_id"),
    Field::String("organization_id"),
    Field::String("owner_user_id"),
    Field::String("order_no"),
    Field::String("order_type"),
    Field::String("subject"),
    Field::String("status"),
    Field::String("pay_status"),
    Field::String("total_amount"),
    Field::String("currency_code"),
    Field::String("request_no"),
    Field::String("idempotency_key"),
    Field::String("created_at"),
    Field::OptionalString("paid_at"),
    Field::OptionalString("cancelled_at"),
    Field::OptionalString("expired_at"),
    Field::String("updated_at"),
];

const ORDER_EVENT_FIELDS: &[Field] = &[
    Field::String("id"),
    Field::String("tenant_id"),
    Field::String("organization_id"),
    Field::String("event_no"),
    Field::String("order_id"),
    Field::String("event_type"),
    Field::OptionalString("from_status"),
    Field::String("to_status"),
    Field::String("actor_type"),
    Field::OptionalString("actor_id"),
    Field::OptionalString("reason_code"),
    Field::OptionalString("message"),
    Field::JsonString("payload_json"),
    Field::OptionalString("request_id"),
    Field::String("idempotency_key"),
    Field::String("created_at"),
];

const REFUND_FIELDS: &[Field] = &[
    Field::String("id"),
    Field::String("tenant_id"),
    Field::String("payment_attempt_id"),
    Field::String("payment_intent_id"),
    Field::String("order_id"),
    Field::String("refund_no"),
    Field::String("amount"),
    Field::String("currency_code"),
    Field::String("status"),
    Field::String("request_no"),
    Field::String("idempotency_key"),
    Field::String("created_at"),
    Field::String("updated_at"),
];

const FULFILLMENT_FIELDS: &[Field] = &[
    Field::String("id"),
    Field::String("tenant_id"),
    Field::String("organization_id"),
    Field::String("fulfillment_no"),
    Field::String("order_id"),
    Field::String("fulfillment_type"),
    Field::String("status"),
    Field::OptionalString("warehouse_id"),
    Field::OptionalString("address_snapshot_id"),
    Field::OptionalString("provider_code"),
    Field::String("created_at"),
    Field::OptionalString("completed_at"),
    Field::String("updated_at"),
];

const SHIPMENT_FIELDS: &[Field] = &[
    Field::String("id"),
    Field::String("tenant_id"),
    Field::String("organization_id"),
    Field::String("shipment_no"),
    Field::String("fulfillment_id"),
    Field::String("carrier_code"),
    Field::String("tracking_no"),
    Field::String("status"),
    Field::OptionalString("shipped_at"),
    Field::OptionalString("delivered_at"),
    Field::String("created_at"),
    Field::String("updated_at"),
];

const SHIPMENT_TRACKING_EVENT_FIELDS: &[Field] = &[
    Field::String("id"),
    Field::String("tenant_id"),
    Field::String("organization_id"),
    Field::String("shipment_id"),
    Field::String("event_time"),
    Field::String("event_code"),
    Field::OptionalString("location"),
    Field::OptionalString("description"),
    Field::JsonString("raw_payload_json"),
    Field::String("created_at"),
];

const PAYMENT_PROVIDER_FIELDS: &[Field] = &[
    Field::String("id"),
    Field::String("tenant_id"),
    Field::String("organization_id"),
    Field::String("provider_code"),
    Field::String("providerCode"),
    Field::String("display_name"),
    Field::String("displayName"),
    Field::String("provider_type"),
    Field::String("providerType"),
    Field::JsonString("supported_countries"),
    Field::JsonString("supportedCountries"),
    Field::JsonString("supported_currencies"),
    Field::JsonString("supportedCurrencies"),
    Field::JsonString("supported_methods"),
    Field::JsonString("capabilities"),
    Field::String("status"),
    Field::Integer("sort_order"),
    Field::Integer("sortOrder"),
    Field::String("created_at"),
    Field::String("createdAt"),
    Field::String("updated_at"),
    Field::String("updatedAt"),
];

const PAYMENT_PROVIDER_ACCOUNT_FIELDS: &[Field] = &[
    Field::String("id"),
    Field::String("tenant_id"),
    Field::String("organization_id"),
    Field::String("account_no"),
    Field::String("accountNo"),
    Field::String("provider_code"),
    Field::String("providerCode"),
    Field::OptionalString("accountRole"),
    Field::String("merchant_id"),
    Field::String("merchantId"),
    Field::String("environment"),
    Field::String("country_code"),
    Field::String("countryCode"),
    Field::String("settlement_currency"),
    Field::String("settlementCurrency"),
    Field::String("secret_ref"),
    Field::String("secretRef"),
    Field::OptionalString("webhook_secret_ref"),
    Field::OptionalString("webhookSecretRef"),
    Field::OptionalString("certificate_ref"),
    Field::OptionalString("certificateRef"),
    Field::String("status"),
    Field::OptionalString("rotated_at"),
    Field::OptionalString("rotatedAt"),
    Field::OptionalString("note"),
    Field::String("created_at"),
    Field::String("createdAt"),
    Field::String("updated_at"),
    Field::String("updatedAt"),
];

const PAYMENT_METHOD_FIELDS: &[Field] = &[
    Field::String("id"),
    Field::String("tenant_id"),
    Field::String("organization_id"),
    Field::String("method_key"),
    Field::String("methodCode"),
    Field::String("display_name"),
    Field::String("displayName"),
    Field::String("provider"),
    Field::OptionalString("providerCode"),
    Field::String("methodType"),
    Field::JsonString("checkoutScenes"),
    Field::String("status"),
    Field::Integer("sort_weight"),
    Field::Integer("sortOrder"),
    Field::String("request_no"),
    Field::String("idempotency_key"),
    Field::String("created_at"),
    Field::String("createdAt"),
    Field::String("updated_at"),
    Field::String("updatedAt"),
];

const PAYMENT_CHANNEL_FIELDS: &[Field] = &[
    Field::String("id"),
    Field::String("tenant_id"),
    Field::String("organization_id"),
    Field::String("channel_no"),
    Field::String("channelNo"),
    Field::String("provider_account_id"),
    Field::String("providerAccountId"),
    Field::String("method_id"),
    Field::String("methodCode"),
    Field::String("providerCode"),
    Field::String("scene_code"),
    Field::String("sceneCode"),
    Field::String("currency_code"),
    Field::String("currencyCode"),
    Field::String("country_code"),
    Field::String("countryCode"),
    Field::String("status"),
    Field::Integer("priority"),
    Field::String("created_at"),
    Field::String("createdAt"),
    Field::String("updated_at"),
    Field::String("updatedAt"),
];

const PAYMENT_ROUTE_RULE_FIELDS: &[Field] = &[
    Field::String("id"),
    Field::String("tenant_id"),
    Field::String("organization_id"),
    Field::String("rule_no"),
    Field::String("ruleNo"),
    Field::Integer("priority"),
    Field::OptionalString("purchase_type"),
    Field::String("sceneCode"),
    Field::OptionalString("country_code"),
    Field::String("countryCode"),
    Field::OptionalString("currency_code"),
    Field::String("currencyCode"),
    Field::OptionalString("client_platform"),
    Field::OptionalString("amount_min"),
    Field::OptionalString("amount_max"),
    Field::OptionalString("user_segment"),
    Field::OptionalString("risk_level"),
    Field::String("channel_id"),
    Field::String("channelId"),
    Field::OptionalString("fallbackChannelId"),
    Field::Boolean("fallbackEnabled"),
    Field::String("methodCode"),
    Field::String("status"),
    Field::OptionalString("starts_at"),
    Field::OptionalString("ends_at"),
    Field::String("created_at"),
    Field::String("createdAt"),
    Field::String("updated_at"),
    Field::String("updatedAt"),
];

const PAYMENT_INTENT_FIELDS: &[Field] = &[
    Field::String("id"),
    Field::String("tenant_id"),
    Field::String("organization_id"),
    Field::String("owner_user_id"),
    Field::String("order_id"),
    Field::String("orderId"),
    Field::String("provider"),
    Field::String("methodCode"),
    Field::String("providerCode"),
    Field::String("amount"),
    Field::String("currency_code"),
    Field::String("currencyCode"),
    Field::String("status"),
    Field::String("request_no"),
    Field::String("intentNo"),
    Field::String("subjectType"),
    Field::String("intent_id"),
    Field::String("intentId"),
    Field::String("checkoutSessionId"),
    Field::String("payment_intent_id"),
    Field::String("created_at"),
    Field::String("createdAt"),
    Field::String("updated_at"),
    Field::String("updatedAt"),
];

const PAYMENT_ATTEMPT_FIELDS: &[Field] = &[
    Field::String("id"),
    Field::String("tenant_id"),
    Field::String("organization_id"),
    Field::String("owner_user_id"),
    Field::String("payment_intent_id"),
    Field::String("intentId"),
    Field::String("order_id"),
    Field::String("orderId"),
    Field::String("provider"),
    Field::String("methodCode"),
    Field::String("providerCode"),
    Field::String("out_trade_no"),
    Field::String("attemptNo"),
    Field::String("externalTradeNo"),
    Field::String("amount"),
    Field::String("currency_code"),
    Field::String("currencyCode"),
    Field::String("status"),
    Field::JsonString("callback_payload"),
    Field::String("created_at"),
    Field::String("createdAt"),
    Field::OptionalString("paid_at"),
    Field::OptionalString("paidAt"),
    Field::String("updated_at"),
    Field::String("updatedAt"),
];

const PAYMENT_WEBHOOK_EVENT_FIELDS: &[Field] = &[
    Field::String("id"),
    Field::String("tenant_id"),
    Field::String("organization_id"),
    Field::String("provider"),
    Field::String("providerCode"),
    Field::String("event_id"),
    Field::String("eventNo"),
    Field::String("externalEventId"),
    Field::String("nonce"),
    Field::OptionalString("signature"),
    Field::Integer("request_timestamp"),
    Field::String("out_trade_no"),
    Field::String("eventType"),
    Field::OptionalString("transaction_id"),
    Field::String("payload_digest"),
    Field::String("status"),
    Field::String("processStatus"),
    Field::OptionalString("message"),
    Field::String("request_no"),
    Field::String("idempotency_key"),
    Field::String("created_at"),
    Field::String("receivedAt"),
    Field::OptionalString("processed_at"),
    Field::OptionalString("processedAt"),
    Field::String("updated_at"),
];

const PAYMENT_RECONCILIATION_RUN_FIELDS: &[Field] = &[
    Field::String("id"),
    Field::String("tenant_id"),
    Field::String("organization_id"),
    Field::String("run_no"),
    Field::String("runNo"),
    Field::String("provider_code"),
    Field::String("providerCode"),
    Field::OptionalString("provider_account_id"),
    Field::OptionalString("providerAccountId"),
    Field::String("settlement_currency"),
    Field::String("settlementCurrency"),
    Field::String("period_start"),
    Field::String("businessDate"),
    Field::String("period_end"),
    Field::String("status"),
    Field::String("total_provider_amount"),
    Field::String("total_internal_amount"),
    Field::String("difference_amount"),
    Field::Integer("matched_count"),
    Field::Integer("mismatched_count"),
    Field::Integer("missing_provider_count"),
    Field::Integer("missing_internal_count"),
    Field::OptionalString("report_file_ref"),
    Field::OptionalString("started_at"),
    Field::OptionalString("completed_at"),
    Field::OptionalString("finishedAt"),
    Field::String("request_no"),
    Field::String("idempotency_key"),
    Field::String("created_at"),
    Field::String("createdAt"),
    Field::String("updated_at"),
];

#[derive(Clone, Copy)]
enum Field {
    String(&'static str),
    OptionalString(&'static str),
    Boolean(&'static str),
    Integer(&'static str),
    JsonString(&'static str),
}

fn collection_from_rows(
    rows: Vec<sqlx::sqlite::SqliteRow>,
    query: &ListAdminTransactionRecordsQuery,
    fields: &[Field],
) -> DomainResult<AdminTransactionCollection> {
    let total = rows
        .first()
        .map(|row| integer_cell(row, "total"))
        .transpose()?
        .unwrap_or(0);
    let mut items = Vec::with_capacity(rows.len());
    for row in rows {
        items.push(record_from_row(&row, fields)?);
    }
    Ok(AdminTransactionCollection {
        items,
        total,
        page_no: query.page_no,
        page_size: query.page_size,
    })
}

fn collection_from_child_rows(
    rows: Vec<sqlx::sqlite::SqliteRow>,
    query: &ListAdminTransactionChildRecordsQuery,
    fields: &[Field],
) -> DomainResult<AdminTransactionCollection> {
    let total = rows
        .first()
        .map(|row| integer_cell(row, "total"))
        .transpose()?
        .unwrap_or(0);
    let mut items = Vec::with_capacity(rows.len());
    for row in rows {
        items.push(record_from_row(&row, fields)?);
    }
    Ok(AdminTransactionCollection {
        items,
        total,
        page_no: query.page_no,
        page_size: query.page_size,
    })
}

fn record_from_row(
    row: &sqlx::sqlite::SqliteRow,
    fields: &[Field],
) -> DomainResult<AdminTransactionJsonRecord> {
    let mut record = AdminTransactionJsonRecord::new();
    for field in fields {
        match *field {
            Field::String(name) => {
                record.insert(
                    name.to_owned(),
                    serde_json::Value::String(string_cell(row, name)?),
                );
            }
            Field::OptionalString(name) => {
                record.insert(
                    name.to_owned(),
                    optional_string_cell(row, name)?
                        .map(serde_json::Value::String)
                        .unwrap_or(serde_json::Value::Null),
                );
            }
            Field::Integer(name) => {
                record.insert(
                    name.to_owned(),
                    serde_json::Value::from(integer_cell(row, name)?),
                );
            }
            Field::Boolean(name) => {
                record.insert(
                    name.to_owned(),
                    serde_json::Value::Bool(boolean_cell(row, name)?),
                );
            }
            Field::JsonString(name) => {
                record.insert(name.to_owned(), json_string_cell(row, name)?);
            }
        }
    }
    Ok(record)
}

fn string_cell(row: &sqlx::sqlite::SqliteRow, column: &str) -> DomainResult<String> {
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
    Err(DomainError::new(format!(
        "transaction center row column {column} is not readable as text"
    )))
}

fn optional_string_cell(
    row: &sqlx::sqlite::SqliteRow,
    column: &str,
) -> DomainResult<Option<String>> {
    let value = string_cell(row, column)?;
    Ok((!value.trim().is_empty()).then_some(value))
}

fn integer_cell(row: &sqlx::sqlite::SqliteRow, column: &str) -> DomainResult<i64> {
    if let Ok(value) = row.try_get::<i64, _>(column) {
        return Ok(value);
    }
    if let Ok(value) = row.try_get::<Option<i64>, _>(column) {
        return Ok(value.unwrap_or_default());
    }
    let value = string_cell(row, column)?;
    if value.trim().is_empty() {
        return Ok(0);
    }
    value.parse::<i64>().map_err(|error| {
        DomainError::new(format!(
            "invalid transaction center integer {column}: {error}"
        ))
    })
}

fn boolean_cell(row: &sqlx::sqlite::SqliteRow, column: &str) -> DomainResult<bool> {
    if let Ok(value) = row.try_get::<bool, _>(column) {
        return Ok(value);
    }
    Ok(integer_cell(row, column)? != 0)
}

fn json_string_cell(
    row: &sqlx::sqlite::SqliteRow,
    column: &str,
) -> DomainResult<serde_json::Value> {
    let Some(value) = optional_string_cell(row, column)? else {
        return Ok(serde_json::Value::Null);
    };
    Ok(serde_json::from_str(&value).unwrap_or(serde_json::Value::String(value)))
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
        ("providerCode", command.provider_code.as_str()),
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
        ("accountRole", command.account_role.as_deref()),
        ("webhookSecretRef", command.webhook_secret_ref.as_deref()),
        ("certificateRef", command.certificate_ref.as_deref()),
        ("rotatedAt", command.rotated_at.as_deref()),
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
    pool: &SqlitePool,
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
    pool: &SqlitePool,
    command: &CreateAdminPaymentProviderAccountCommand,
    provider_account_id: &str,
) -> DomainResult<Option<serde_json::Value>> {
    let row = sqlx::query(
        r#"
        SELECT change_summary
        FROM ops_audit_log
        WHERE tenant_id = ?1
          AND organization_id = ?2
          AND action = ?3
          AND target_uuid = ?4
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
        let value = string_cell(&row, "change_summary")?;
        serde_json::from_str(&value).map_err(|error| {
            DomainError::new(format!(
                "payment provider account audit change_summary is not valid JSON: {error}"
            ))
        })
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
    message.contains("UNIQUE constraint failed") || message.contains("unique constraint")
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
