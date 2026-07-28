use sdkwork_contract_service::{
    CommerceAccountAssetType, CommerceLedgerDirection, CommercePaymentStatus,
};
use serde_json::Value;
use sqlx::{PgPool, Postgres, Row, Transaction};

use crate::domain::{DecimalValue, DomainError};
use crate::infrastructure::sql::store_error::redacted_store_error;
use crate::ports::{
    PaymentCallbackCommand, PaymentCallbackFuture, PaymentCallbackOutcome, PaymentCallbackStatus,
    PaymentCallbackStore,
};

const POINTS_CURRENCY_CODE: &str = "POINT";
const ORDER_STATUS_PAID: &str = "paid";
const ORDER_STATUS_CANCELLED: &str = "cancelled";
const ORDER_STATUS_PENDING_PAYMENT: &str = "pending_payment";

#[derive(Debug, Clone)]
pub struct PostgresPaymentCallbackStore {
    pool: PgPool,
}

impl PostgresPaymentCallbackStore {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

impl PaymentCallbackStore for PostgresPaymentCallbackStore {
    fn process_payment_callback<'a>(
        &'a self,
        command: PaymentCallbackCommand,
    ) -> PaymentCallbackFuture<'a> {
        Box::pin(async move { process_payment_callback(&self.pool, command).await })
    }
}

async fn process_payment_callback(
    pool: &PgPool,
    command: PaymentCallbackCommand,
) -> Result<PaymentCallbackOutcome, DomainError> {
    let mut tx = pool
        .begin()
        .await
        .map_err(|error| store_error("failed to begin payment callback transaction", error))?;
    let delivery = begin_webhook_delivery(&mut tx, &command).await?;
    let webhook = begin_webhook_event(&mut tx, &command).await?;
    if webhook.duplicate {
        tx.commit().await.map_err(|error| {
            store_error(
                "failed to commit duplicate payment callback transaction",
                error,
            )
        })?;
        return Ok(PaymentCallbackOutcome {
            success: true,
            duplicate: true,
            out_trade_no: command.out_trade_no,
            transaction_id: command.transaction_id,
            status: command.status.as_str().to_owned(),
            message: "duplicate webhook event ignored".to_owned(),
            credited_points: 0,
            balance: 0,
        });
    }

    let result = process_payment_status(&mut tx, &command).await;
    match result {
        Ok(outcome) => {
            finish_webhook_delivery(
                &mut tx,
                &delivery.id,
                "SUCCESS",
                "VERIFIED",
                Some(&webhook.id),
                &outcome.message,
            )
            .await?;
            finish_webhook_event(&mut tx, &webhook.id, "SUCCESS", &command, &outcome.message)
                .await?;
            tx.commit().await.map_err(|error| {
                store_error("failed to commit payment callback transaction", error)
            })?;
            Ok(outcome)
        }
        Err(error) => {
            let message = error.to_string();
            finish_webhook_delivery(
                &mut tx,
                &delivery.id,
                "FAILED",
                "VERIFIED",
                Some(&webhook.id),
                &message,
            )
            .await?;
            finish_webhook_event(&mut tx, &webhook.id, "FAILED", &command, &message).await?;
            tx.commit().await.map_err(|commit_error| {
                store_error(
                    "failed to commit failed payment callback event",
                    commit_error,
                )
            })?;
            Err(error)
        }
    }
}

#[derive(Debug, Clone)]
struct WebhookEvent {
    id: String,
    duplicate: bool,
}

#[derive(Debug, Clone)]
struct WebhookDelivery {
    id: String,
}

async fn begin_webhook_delivery(
    tx: &mut Transaction<'_, Postgres>,
    command: &PaymentCallbackCommand,
) -> Result<WebhookDelivery, DomainError> {
    let nonce_replay = sqlx::query(
        r#"
        SELECT event_id
        FROM commerce_payment_webhook_delivery
        WHERE tenant_id = $1
          AND supplier_code = $2
          AND nonce = $3
        LIMIT 1
        "#,
    )
    .bind("0")
    .bind(&command.supplier_code)
    .bind(&command.nonce)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|error| {
        store_error(
            "failed to check payment webhook delivery nonce replay",
            error,
        )
    })?;
    if let Some(row) = nonce_replay {
        let existing_event_id = string_cell(&row, "event_id");
        if existing_event_id != command.event_id {
            return Err(DomainError::conflict(
                "payment callback nonce replay detected",
            ));
        }
    }

    let existing = sqlx::query(
        r#"
        SELECT id
        FROM commerce_payment_webhook_delivery
        WHERE tenant_id = $1
          AND supplier_code = $2
          AND event_id = $3
        LIMIT 1
        FOR UPDATE
        "#,
    )
    .bind("0")
    .bind(&command.supplier_code)
    .bind(&command.event_id)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|error| store_error("failed to load payment webhook delivery", error))?;
    if let Some(row) = existing {
        return Ok(WebhookDelivery {
            id: string_cell(&row, "id"),
        });
    }

    let id: String = sqlx::query_scalar(
        r#"
        INSERT INTO commerce_payment_webhook_delivery
            (id, tenant_id, organization_id, delivery_no, supplier_code, provider_account_id, event_id, nonce, request_timestamp, signature, signature_algorithm, headers_json, payload_digest, payload_ref, source_ip, user_agent, verification_status, delivery_status, failure_code, failure_message, received_at, verified_at, normalized_event_id, processed_at, created_at, updated_at)
        VALUES
            ($1, '0', NULL, $2, $3, NULL, $4, $5, $6, $7, 'HMAC_SHA256', NULL, $8, NULL, NULL, NULL, 'VERIFIED', 'RECEIVED', NULL, 'received webhook delivery', $9::timestamp AT TIME ZONE 'UTC', CURRENT_TIMESTAMP, NULL, NULL, $9::timestamp AT TIME ZONE 'UTC', $9::timestamp AT TIME ZONE 'UTC')
        RETURNING id
        "#,
    )
    .bind(&command.delivery_uuid)
    .bind(&command.event_id)
    .bind(&command.supplier_code)
    .bind(&command.event_id)
    .bind(&command.nonce)
    .bind(command.request_timestamp)
    .bind(command.signature.as_deref())
    .bind(&command.payload_digest)
    .bind(&command.received_at)
    .fetch_one(&mut **tx)
    .await
    .map_err(|error| store_error("failed to insert payment webhook delivery", error))?;
    Ok(WebhookDelivery { id })
}

async fn finish_webhook_delivery(
    tx: &mut Transaction<'_, Postgres>,
    delivery_id: &str,
    delivery_status: &str,
    verification_status: &str,
    normalized_event_id: Option<&str>,
    message: &str,
) -> Result<(), DomainError> {
    sqlx::query(
        r#"
        UPDATE commerce_payment_webhook_delivery
        SET delivery_status = $1,
            verification_status = $2,
            failure_message = $3,
            normalized_event_id = $4,
            processed_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
        "#,
    )
    .bind(delivery_status)
    .bind(verification_status)
    .bind(truncate_message(message))
    .bind(normalized_event_id)
    .bind(delivery_id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to finish payment webhook delivery", error))?;
    Ok(())
}

async fn begin_webhook_event(
    tx: &mut Transaction<'_, Postgres>,
    command: &PaymentCallbackCommand,
) -> Result<WebhookEvent, DomainError> {
    let nonce_replay = sqlx::query(
        r#"
        SELECT event_id
        FROM commerce_payment_webhook_event
        WHERE tenant_id = $1
          AND provider = $2
          AND nonce = $3
        LIMIT 1
        "#,
    )
    .bind("0")
    .bind(&command.supplier_code)
    .bind(&command.nonce)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|error| store_error("failed to check payment callback nonce replay", error))?;
    if let Some(row) = nonce_replay {
        let existing_event_id = string_cell(&row, "event_id");
        if existing_event_id != command.event_id {
            return Err(DomainError::conflict(
                "payment callback nonce replay detected",
            ));
        }
    }

    let existing = sqlx::query(
        r#"
        SELECT id, status
        FROM commerce_payment_webhook_event
        WHERE tenant_id = $1
          AND provider = $2
          AND event_id = $3
        LIMIT 1
        FOR UPDATE
        "#,
    )
    .bind("0")
    .bind(&command.supplier_code)
    .bind(&command.event_id)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|error| store_error("failed to load payment callback webhook event", error))?;
    if let Some(row) = existing {
        let id = string_cell(&row, "id");
        let status = string_cell(&row, "status");
        if status == "SUCCESS" {
            return Ok(WebhookEvent {
                id: id.clone(),
                duplicate: true,
            });
        }
        sqlx::query(
            r#"
            UPDATE commerce_payment_webhook_event
            SET status = 'RECEIVED',
                out_trade_no = $1,
                transaction_id = $2,
                payload_digest = $3,
                message = 'retrying webhook event',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $4
            "#,
        )
        .bind(&command.out_trade_no)
        .bind(&command.transaction_id)
        .bind(&command.payload_digest)
        .bind(&id)
        .execute(&mut **tx)
        .await
        .map_err(|error| store_error("failed to reset payment callback webhook event", error))?;
        return Ok(WebhookEvent {
            id,
            duplicate: false,
        });
    }

    let id: String = sqlx::query_scalar(
        r#"
        INSERT INTO commerce_payment_webhook_event
            (id, tenant_id, organization_id, provider, event_id, nonce, signature, request_timestamp, out_trade_no, transaction_id, payload_digest, status, message, request_no, idempotency_key, created_at, processed_at, updated_at)
        VALUES
            ($1, '0', NULL, $2, $3, $4, $5, $6, $7, $8, $9, 'RECEIVED', 'received webhook event', $3, $4, $10::timestamp AT TIME ZONE 'UTC', NULL, $10::timestamp AT TIME ZONE 'UTC')
        RETURNING id
        "#,
    )
    .bind(&command.event_uuid)
    .bind(&command.supplier_code)
    .bind(&command.event_id)
    .bind(&command.nonce)
    .bind(command.signature.as_deref())
    .bind(command.request_timestamp)
    .bind(&command.out_trade_no)
    .bind(&command.transaction_id)
    .bind(&command.payload_digest)
    .bind(&command.received_at)
    .fetch_one(&mut **tx)
    .await
    .map_err(|error| store_error("failed to insert payment callback webhook event", error))?;
    Ok(WebhookEvent {
        id,
        duplicate: false,
    })
}

async fn finish_webhook_event(
    tx: &mut Transaction<'_, Postgres>,
    webhook_id: &str,
    status: &str,
    command: &PaymentCallbackCommand,
    message: &str,
) -> Result<(), DomainError> {
    sqlx::query(
        r#"
        UPDATE commerce_payment_webhook_event
        SET status = $1,
            processed_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP,
            out_trade_no = $2,
            transaction_id = $3,
            message = $4
        WHERE id = $5
        "#,
    )
    .bind(status)
    .bind(&command.out_trade_no)
    .bind(&command.transaction_id)
    .bind(truncate_message(message))
    .bind(webhook_id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to finish payment callback webhook event", error))?;
    Ok(())
}

async fn process_payment_status(
    tx: &mut Transaction<'_, Postgres>,
    command: &PaymentCallbackCommand,
) -> Result<PaymentCallbackOutcome, DomainError> {
    let payment = load_payment_for_callback(tx, command).await?;
    match command.status {
        PaymentCallbackStatus::Success => {
            let amount = command.amount.as_ref().ok_or_else(|| {
                DomainError::conflict("payment callback amount is required for success")
            })?;
            if !money_matches(&payment.amount, amount) {
                return Err(DomainError::conflict(
                    "payment callback amount does not match payment amount",
                ));
            }
            if payment_status_is_succeeded(&payment.status) {
                return fulfill_recharge_once(tx, &payment, command).await;
            }
            if !payment_status_is_pending(&payment.status) {
                return Err(DomainError::conflict(
                    "payment callback cannot transition terminal payment to success",
                ));
            }
            mark_payment_success(tx, &payment, command).await?;
            fulfill_recharge_once(tx, &payment, command).await
        }
        PaymentCallbackStatus::Failed => {
            mark_payment_failed(
                tx,
                &payment,
                command,
                CommercePaymentStatus::Failed.as_str(),
            )
            .await?;
            Ok(PaymentCallbackOutcome {
                success: true,
                duplicate: false,
                out_trade_no: command.out_trade_no.clone(),
                transaction_id: command.transaction_id.clone(),
                status: "failed".to_owned(),
                message: "payment callback marked payment failed".to_owned(),
                credited_points: 0,
                balance: 0,
            })
        }
        PaymentCallbackStatus::Closed => {
            mark_payment_failed(
                tx,
                &payment,
                command,
                CommercePaymentStatus::Canceled.as_str(),
            )
            .await?;
            Ok(PaymentCallbackOutcome {
                success: true,
                duplicate: false,
                out_trade_no: command.out_trade_no.clone(),
                transaction_id: command.transaction_id.clone(),
                status: "closed".to_owned(),
                message: "payment callback marked payment closed".to_owned(),
                credited_points: 0,
                balance: 0,
            })
        }
    }
}

#[derive(Debug, Clone)]
struct PaymentFact {
    id: String,
    payment_intent_id: String,
    order_id: String,
    tenant_id: String,
    organization_id: Option<String>,
    user_id: String,
    amount: String,
    status: String,
    purpose: String,
    callback_payload: Option<String>,
}

async fn load_payment_for_callback(
    tx: &mut Transaction<'_, Postgres>,
    command: &PaymentCallbackCommand,
) -> Result<PaymentFact, DomainError> {
    let row = sqlx::query(
        r#"
        SELECT
            pa.id,
            pa.payment_intent_id,
            pa.order_id,
            pa.tenant_id,
            pa.organization_id,
            pa.owner_user_id AS user_id,
            CAST(COALESCE(pa.amount, '0') AS TEXT) AS amount,
            pa.status AS status,
            pa.provider AS provider,
            COALESCE(NULLIF(o.subject, ''), 'order') AS purpose,
            pa.callback_payload
        FROM commerce_payment_attempt pa
        JOIN commerce_order o
          ON o.id = pa.order_id
         AND o.tenant_id = pa.tenant_id
         AND (o.organization_id IS NULL OR pa.organization_id IS NULL OR o.organization_id = pa.organization_id)
        JOIN commerce_payment_intent pi
          ON pi.id = pa.payment_intent_id
         AND pi.tenant_id = pa.tenant_id
         AND (pi.organization_id IS NULL OR pa.organization_id IS NULL OR pi.organization_id = pa.organization_id)
        WHERE pa.provider = $1
          AND pa.out_trade_no = $2
        LIMIT 1
        FOR UPDATE OF pa, o, pi
        "#,
    )
    .bind(&command.supplier_code)
    .bind(&command.out_trade_no)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|error| store_error("failed to load payment callback payment", error))?
    .ok_or_else(|| DomainError::conflict("payment callback payment was not found"))?;

    let provider = string_cell(&row, "provider");
    if provider != command.supplier_code {
        return Err(DomainError::conflict(
            "payment callback provider does not match payment provider",
        ));
    }
    Ok(PaymentFact {
        id: string_cell(&row, "id"),
        payment_intent_id: string_cell(&row, "payment_intent_id"),
        order_id: string_cell(&row, "order_id"),
        tenant_id: string_cell(&row, "tenant_id"),
        organization_id: optional_string_cell(&row, "organization_id"),
        user_id: string_cell(&row, "user_id"),
        amount: string_cell(&row, "amount"),
        status: required_string_cell(&row, "status", "payment")?,
        purpose: string_cell(&row, "purpose"),
        callback_payload: optional_string_cell(&row, "callback_payload"),
    })
}

async fn mark_payment_success(
    tx: &mut Transaction<'_, Postgres>,
    payment: &PaymentFact,
    _command: &PaymentCallbackCommand,
) -> Result<(), DomainError> {
    let payment_update = sqlx::query(
        r#"
        UPDATE commerce_payment_attempt
        SET status = $1,
            paid_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
          AND status = $3
        "#,
    )
    .bind(CommercePaymentStatus::Succeeded.as_str())
    .bind(&payment.id)
    .bind(CommercePaymentStatus::Pending.as_str())
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to mark callback payment success", error))?;
    if payment_update.rows_affected() != 1 {
        return Err(DomainError::conflict(
            "payment callback payment is no longer pending",
        ));
    }
    let intent_update = sqlx::query(
        r#"
        UPDATE commerce_payment_intent
        SET status = $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
          AND status = $3
        "#,
    )
    .bind(CommercePaymentStatus::Succeeded.as_str())
    .bind(&payment.payment_intent_id)
    .bind(CommercePaymentStatus::Pending.as_str())
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to mark callback payment intent success", error))?;
    if intent_update.rows_affected() != 1 {
        return Err(DomainError::conflict(
            "payment callback payment intent is no longer pending",
        ));
    }
    sqlx::query(
        r#"
        UPDATE commerce_order
        SET status = $1,
            paid_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
          AND status IN ($3, 'pending')
        "#,
    )
    .bind(ORDER_STATUS_PAID)
    .bind(&payment.order_id)
    .bind(ORDER_STATUS_PENDING_PAYMENT)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to mark callback order paid", error))?;
    Ok(())
}

async fn mark_payment_failed(
    tx: &mut Transaction<'_, Postgres>,
    payment: &PaymentFact,
    _command: &PaymentCallbackCommand,
    payment_status: &str,
) -> Result<(), DomainError> {
    sqlx::query(
        r#"
        UPDATE commerce_payment_attempt
        SET status = $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
          AND status <> $3
        "#,
    )
    .bind(payment_status)
    .bind(&payment.id)
    .bind(CommercePaymentStatus::Succeeded.as_str())
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to mark callback payment failed", error))?;
    sqlx::query(
        r#"
        UPDATE commerce_payment_intent
        SET status = $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
          AND status <> $3
        "#,
    )
    .bind(payment_status)
    .bind(&payment.payment_intent_id)
    .bind(CommercePaymentStatus::Succeeded.as_str())
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to mark callback payment intent failed", error))?;
    sqlx::query(
        r#"
        UPDATE commerce_order
        SET status = $1,
            cancelled_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
          AND status IN ($3, 'pending')
        "#,
    )
    .bind(ORDER_STATUS_CANCELLED)
    .bind(&payment.order_id)
    .bind(ORDER_STATUS_PENDING_PAYMENT)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to mark callback order cancelled", error))?;
    Ok(())
}

async fn fulfill_recharge_once(
    tx: &mut Transaction<'_, Postgres>,
    payment: &PaymentFact,
    command: &PaymentCallbackCommand,
) -> Result<PaymentCallbackOutcome, DomainError> {
    if !is_points_recharge(&payment.purpose) {
        return Ok(PaymentCallbackOutcome {
            success: true,
            duplicate: payment_status_is_succeeded(&payment.status),
            out_trade_no: command.out_trade_no.clone(),
            transaction_id: command.transaction_id.clone(),
            status: "success".to_owned(),
            message: "payment callback processed non-recharge payment".to_owned(),
            credited_points: 0,
            balance: 0,
        });
    }
    let credited_points = callback_points(payment)?;
    let account = ensure_points_account(tx, payment, command).await?;
    let history_count = existing_account_history_count(tx, &account.id, payment, command).await?;
    if history_count > 0 {
        return Ok(PaymentCallbackOutcome {
            success: true,
            duplicate: true,
            out_trade_no: command.out_trade_no.clone(),
            transaction_id: command.transaction_id.clone(),
            status: "success".to_owned(),
            message: "payment callback recharge was already fulfilled".to_owned(),
            credited_points,
            balance: account.available_points,
        });
    }

    checked_add_points(account.available_points, credited_points)?;
    let balance_after = update_account_points(tx, &account.id, credited_points).await?;
    insert_account_history(
        tx,
        command,
        payment,
        &account.id,
        balance_after,
        credited_points,
    )
    .await?;

    Ok(PaymentCallbackOutcome {
        success: true,
        duplicate: payment_status_is_succeeded(&payment.status),
        out_trade_no: command.out_trade_no.clone(),
        transaction_id: command.transaction_id.clone(),
        status: "success".to_owned(),
        message: "payment callback fulfilled recharge successfully".to_owned(),
        credited_points,
        balance: balance_after,
    })
}

#[derive(Debug, Clone)]
struct PointsAccount {
    id: String,
    available_points: i64,
}

async fn ensure_points_account(
    tx: &mut Transaction<'_, Postgres>,
    payment: &PaymentFact,
    command: &PaymentCallbackCommand,
) -> Result<PointsAccount, DomainError> {
    let existing = sqlx::query(
        r#"
        SELECT id,
               CAST(COALESCE(available_amount::numeric, 0) AS TEXT) AS available_points
        FROM commerce_account
        WHERE tenant_id = $1
          AND (organization_id IS NULL OR organization_id = $2)
          AND owner_user_id = $3
          AND asset_type = $4
          AND currency_code = $5
          AND status = 'active'
        ORDER BY id ASC
        LIMIT 1
        FOR UPDATE
        "#,
    )
    .bind(&payment.tenant_id)
    .bind(payment.organization_id.as_deref())
    .bind(&payment.user_id)
    .bind(CommerceAccountAssetType::Points.as_str())
    .bind(POINTS_CURRENCY_CODE)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|error| store_error("failed to load callback points account", error))?;
    if let Some(row) = existing {
        return Ok(PointsAccount {
            id: string_cell(&row, "id"),
            available_points: integer_cell(&row, "available_points"),
        });
    }

    let inserted = sqlx::query(
        r#"
        INSERT INTO commerce_account
            (id, tenant_id, organization_id, owner_user_id, asset_type, currency_code, available_amount, frozen_amount, version, status, created_at, updated_at)
        VALUES
            ($1, $2, $3, $4, $5, $6, '0', '0', 0, 'active', $7, $7)
        ON CONFLICT (tenant_id, organization_id, owner_user_id, asset_type, currency_code) DO NOTHING
        RETURNING id
        "#,
    )
    .bind(&command.account_uuid)
    .bind(&payment.tenant_id)
    .bind(payment.organization_id.as_deref())
    .bind(&payment.user_id)
    .bind(CommerceAccountAssetType::Points.as_str())
    .bind(POINTS_CURRENCY_CODE)
    .bind(&command.received_at)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|error| store_error("failed to create callback points account", error))?;
    if let Some(row) = inserted {
        return Ok(PointsAccount {
            id: string_cell(&row, "id"),
            available_points: 0,
        });
    }

    let row = sqlx::query(
        r#"
        SELECT id,
               CAST(COALESCE(available_amount::numeric, 0) AS TEXT) AS available_points
        FROM commerce_account
        WHERE tenant_id = $1
          AND (organization_id IS NULL OR organization_id = $2)
          AND owner_user_id = $3
          AND asset_type = $4
          AND currency_code = $5
          AND status = 'active'
        ORDER BY id ASC
        LIMIT 1
        FOR UPDATE
        "#,
    )
    .bind(&payment.tenant_id)
    .bind(payment.organization_id.as_deref())
    .bind(&payment.user_id)
    .bind(CommerceAccountAssetType::Points.as_str())
    .bind(POINTS_CURRENCY_CODE)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|error| {
        store_error(
            "failed to load concurrently created callback points account",
            error,
        )
    })?
    .ok_or_else(|| {
        DomainError::conflict(
            "payment callback points account was not available after concurrent creation",
        )
    })?;

    Ok(PointsAccount {
        id: string_cell(&row, "id"),
        available_points: integer_cell(&row, "available_points"),
    })
}

async fn existing_account_history_count(
    tx: &mut Transaction<'_, Postgres>,
    account_id: &str,
    payment: &PaymentFact,
    command: &PaymentCallbackCommand,
) -> Result<i64, DomainError> {
    sqlx::query_scalar(
        r#"
        SELECT COUNT(1)
        FROM commerce_account_ledger_entry
        WHERE tenant_id = $1
          AND account_id = $2
          AND transaction_no = $3
          AND business_type = 'recharge'
        "#,
    )
    .bind(&payment.tenant_id)
    .bind(account_id)
    .bind(&command.out_trade_no)
    .fetch_one(&mut **tx)
    .await
    .map_err(|error| {
        store_error(
            "failed to check callback account history idempotency",
            error,
        )
    })
}

async fn update_account_points(
    tx: &mut Transaction<'_, Postgres>,
    account_id: &str,
    credited_points: i64,
) -> Result<i64, DomainError> {
    let max_balance_before = i64::MAX
        .checked_sub(credited_points)
        .ok_or_else(|| DomainError::conflict("payment callback account points overflow"))?;
    let result = sqlx::query(
        r#"
        UPDATE commerce_account
        SET available_amount = (COALESCE(available_amount::numeric, 0) + $1::numeric)::text,
            version = version + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
          AND COALESCE(available_amount::numeric, 0) <= $3::numeric
        "#,
    )
    .bind(credited_points.to_string())
    .bind(account_id)
    .bind(max_balance_before.to_string())
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to update callback account points", error))?;
    if result.rows_affected() != 1 {
        return Err(DomainError::conflict(
            "payment callback account points update was not applied atomically",
        ));
    }

    let balance_after = sqlx::query_scalar::<_, String>(
        r#"
        SELECT CAST(COALESCE(available_amount, '0') AS TEXT)
        FROM commerce_account
        WHERE id = $1
        LIMIT 1
        "#,
    )
    .bind(account_id)
    .fetch_one(&mut **tx)
    .await
    .map_err(|error| store_error("failed to read callback account points after update", error))?;
    parse_integer_text(&balance_after)
        .ok_or_else(|| DomainError::new("invalid callback account points after update"))
}

async fn insert_account_history(
    tx: &mut Transaction<'_, Postgres>,
    command: &PaymentCallbackCommand,
    payment: &PaymentFact,
    account_id: &str,
    balance_after: i64,
    credited_points: i64,
) -> Result<(), DomainError> {
    sqlx::query(
        r#"
        INSERT INTO commerce_account_ledger_entry
            (id, tenant_id, organization_id, account_id, owner_user_id, asset_type, direction, amount, balance_after, business_type, transaction_no, request_no, idempotency_key, source_type, source_id, remark, created_at)
        VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'recharge', $10, $10, $10, 'commerce_payment_attempt', $11, $12, $13)
        "#,
    )
    .bind(&command.account_history_uuid)
    .bind(&payment.tenant_id)
    .bind(payment.organization_id.as_deref())
    .bind(account_id)
    .bind(&payment.user_id)
    .bind(CommerceAccountAssetType::Points.as_str())
    .bind(CommerceLedgerDirection::Credit.as_str())
    .bind(credited_points.to_string())
    .bind(balance_after.to_string())
    .bind(&command.out_trade_no)
    .bind(&payment.id)
    .bind(format!("payment_callback_transaction={}", command.transaction_id))
    .bind(&command.received_at)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to insert callback account ledger entry", error))?;
    Ok(())
}

fn is_points_recharge(value: &str) -> bool {
    matches!(
        value.trim().to_ascii_lowercase().as_str(),
        "points" | "points_recharge"
    )
}

fn payment_status_is_succeeded(value: &str) -> bool {
    value
        .trim()
        .eq_ignore_ascii_case(CommercePaymentStatus::Succeeded.as_str())
}

fn payment_status_is_pending(value: &str) -> bool {
    value
        .trim()
        .eq_ignore_ascii_case(CommercePaymentStatus::Pending.as_str())
}

fn callback_points(payment: &PaymentFact) -> Result<i64, DomainError> {
    let payload = payment
        .callback_payload
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .ok_or_else(|| {
            DomainError::conflict("payment callback points payload is required for recharge")
        })?;
    let value: Value = serde_json::from_str(payload)
        .map_err(|_| DomainError::conflict("payment callback points payload is not valid json"))?;
    let points = value
        .get("points")
        .and_then(|points| {
            points
                .as_i64()
                .or_else(|| points.as_str().and_then(|value| value.parse::<i64>().ok()))
        })
        .ok_or_else(|| {
            DomainError::conflict("payment callback points payload must include points")
        })?;
    if points <= 0 {
        return Err(DomainError::conflict(
            "payment callback points payload must be positive",
        ));
    }
    Ok(points)
}

fn checked_add_points(current_points: i64, credited_points: i64) -> Result<i64, DomainError> {
    current_points
        .checked_add(credited_points)
        .ok_or_else(|| DomainError::conflict("payment callback account points overflow"))
}

fn money_matches(expected: &str, actual: &str) -> bool {
    match (DecimalValue::parse(expected), DecimalValue::parse(actual)) {
        (Ok(expected), Ok(actual)) => expected == actual,
        _ => false,
    }
}

fn truncate_message(message: &str) -> String {
    message.chars().take(500).collect()
}

fn optional_string_cell(row: &sqlx::postgres::PgRow, column: &str) -> Option<String> {
    row.try_get::<Option<String>, _>(column).ok().flatten()
}

fn string_cell(row: &sqlx::postgres::PgRow, column: &str) -> String {
    optional_string_cell(row, column).unwrap_or_default()
}

fn required_string_cell(
    row: &sqlx::postgres::PgRow,
    column: &str,
    source: &str,
) -> Result<String, DomainError> {
    optional_string_cell(row, column)
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty())
        .ok_or_else(|| missing_status_error(source))
}

fn integer_cell(row: &sqlx::postgres::PgRow, column: &str) -> i64 {
    optional_integer_cell(row, column).unwrap_or(0)
}

fn optional_integer_cell(row: &sqlx::postgres::PgRow, column: &str) -> Option<i64> {
    row.try_get::<Option<i64>, _>(column)
        .ok()
        .flatten()
        .or_else(|| parse_integer_text(&string_cell(row, column)))
}

fn parse_integer_text(value: &str) -> Option<i64> {
    let value = value.trim();
    if value.is_empty() {
        return None;
    }
    let digits = value.strip_prefix('-').unwrap_or(value);
    if digits.is_empty() || !digits.chars().all(|character| character.is_ascii_digit()) {
        return None;
    }
    value.parse::<i64>().ok()
}

fn missing_status_error(source: &str) -> DomainError {
    match source {
        "payment" => DomainError::new("missing payment callback payment status from database row"),
        value => DomainError::new(format!(
            "missing payment callback {value} status from database row"
        )),
    }
}

fn store_error(context: &str, error: sqlx::Error) -> DomainError {
    redacted_store_error(context, error)
}
