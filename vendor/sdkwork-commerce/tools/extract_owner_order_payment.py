#!/usr/bin/env python3
"""One-time helper: extract owner order payment SQL from order repo into payment repo."""
from __future__ import annotations

import pathlib
import re

ORDER_SQLITE = pathlib.Path(
    r"E:\sdkwork-space\sdkwork-order\crates\sdkwork-commerce-order-repository-sqlx\src\sqlite_order.rs"
)
ORDER_POSTGRES = pathlib.Path(
    r"E:\sdkwork-space\sdkwork-order\crates\sdkwork-commerce-order-repository-sqlx\src\postgres_order.rs"
)
PAYMENT_ROOT = pathlib.Path(
    r"E:\sdkwork-space\sdkwork-payment\crates\sdkwork-commerce-payment-repository-sqlx\src"
)


def extract_pay_method(source: str) -> str:
    match = re.search(
        r"    pub async fn pay_owner_order\([\s\S]*?^    \}\n(?=\})",
        source,
        re.MULTILINE,
    )
    if not match:
        raise RuntimeError("pay_owner_order not found")
    return match.group(0)


def extract_helpers(source: str) -> str:
    start = source.index("struct OwnerPaymentMethod")
    end = source.index("async fn load_checkout_session_for_order")
    return source[start:end]


def sqlite_cancel_payments() -> str:
    return """
    pub async fn cancel_owner_order_payments(
        &self,
        command: CancelOwnerOrderCommand,
    ) -> Result<(), CommerceServiceError> {
        let now = current_command_timestamp();
        sqlx::query(
            r#\"\"
            UPDATE commerce_payment_intent
            SET status = ?, updated_at = ?
            WHERE tenant_id = CAST(? AS TEXT)
              AND owner_user_id = CAST(? AS TEXT)
              AND order_id = CAST(? AS TEXT)
            \"#\",
        )
        .bind(CommercePaymentStatus::Canceled.as_str())
        .bind(&now)
        .bind(&command.tenant_id)
        .bind(&command.owner_user_id)
        .bind(&command.order_id)
        .execute(&self.pool)
        .await
        .map_err(|error| store_error("failed to close order payment intents", error))?;

        sqlx::query(
            r#\"\"
            UPDATE commerce_payment_attempt
            SET status = ?, updated_at = ?
            WHERE tenant_id = CAST(? AS TEXT)
              AND owner_user_id = CAST(? AS TEXT)
              AND order_id = CAST(? AS TEXT)
            \"#\",
        )
        .bind(CommercePaymentStatus::Canceled.as_str())
        .bind(&now)
        .bind(&command.tenant_id)
        .bind(&command.owner_user_id)
        .bind(&command.order_id)
        .execute(&self.pool)
        .await
        .map_err(|error| store_error("failed to close order payment attempts", error))?;

        Ok(())
    }
"""


def postgres_cancel_payments() -> str:
    return """
    pub async fn cancel_owner_order_payments(
        &self,
        command: CancelOwnerOrderCommand,
    ) -> Result<(), CommerceServiceError> {
        let now = current_command_timestamp();
        sqlx::query(
            r#\"\"
            UPDATE commerce_payment_intent
            SET status = $1, updated_at = $2
            WHERE tenant_id = CAST($3 AS TEXT)
              AND owner_user_id = CAST($4 AS TEXT)
              AND order_id = CAST($5 AS TEXT)
            \"#\",
        )
        .bind(CommercePaymentStatus::Canceled.as_str())
        .bind(&now)
        .bind(&command.tenant_id)
        .bind(&command.owner_user_id)
        .bind(&command.order_id)
        .execute(self.pool())
        .await
        .map_err(|error| store_error("failed to close order payment intents", error))?;

        sqlx::query(
            r#\"\"
            UPDATE commerce_payment_attempt
            SET status = $1, updated_at = $2
            WHERE tenant_id = CAST($3 AS TEXT)
              AND owner_user_id = CAST($4 AS TEXT)
              AND order_id = CAST($5 AS TEXT)
            \"#\",
        )
        .bind(CommercePaymentStatus::Canceled.as_str())
        .bind(&now)
        .bind(&command.tenant_id)
        .bind(&command.owner_user_id)
        .bind(&command.order_id)
        .execute(self.pool())
        .await
        .map_err(|error| store_error("failed to close order payment attempts", error))?;

        Ok(())
    }
"""


def write_sqlite() -> None:
    source = ORDER_SQLITE.read_text(encoding="utf-8")
    body = f"""use sdkwork_commerce_contract_service::{{
    CommerceMoney, CommercePaymentStatus, CommerceServiceError,
}};
use sdkwork_commerce_order_service::{{
    CancelOwnerOrderCommand, PayOwnerOrderCommand, PayOwnerOrderOutcome,
}};
use sqlx::{{Row, Sqlite, SqlitePool, Transaction}};
use std::collections::BTreeMap;
use std::time::{{SystemTime, UNIX_EPOCH}};

#[derive(Debug, Clone)]
pub struct SqliteCommerceOwnerOrderPaymentStore {{
    pool: SqlitePool,
}}

impl SqliteCommerceOwnerOrderPaymentStore {{
    pub fn new(pool: SqlitePool) -> Self {{
        Self {{ pool }}
    }}
{sqlite_cancel_payments()}
{extract_pay_method(source)}
}}

{extract_helpers(source)}

fn store_error(message: &str, error: impl std::fmt::Display) -> CommerceServiceError {{
    CommerceServiceError::storage(format!("{{message}}: {{error}}"))
}}

fn string_cell(row: &sqlx::sqlite::SqliteRow, column: &str) -> String {{
    row.try_get::<Option<String>, _>(column)
        .ok()
        .flatten()
        .unwrap_or_default()
}}
"""
    (PAYMENT_ROOT / "sqlite_owner_order_payment.rs").write_text(body, encoding="utf-8")


def write_postgres() -> None:
    source = ORDER_POSTGRES.read_text(encoding="utf-8")
    helpers = extract_helpers(source).replace("SqliteRow", "PgRow").replace(
        "Transaction<'_, Sqlite>", "Transaction<'_, Postgres>"
    ).replace("sqlx::Transaction<'_, sqlx::Sqlite>", "sqlx::Transaction<'_, sqlx::Postgres>")
    pay = extract_pay_method(source)
    body = f"""use sdkwork_commerce_contract_service::{{
    CommerceMoney, CommercePaymentStatus, CommerceServiceError,
}};
use sdkwork_commerce_order_service::{{
    CancelOwnerOrderCommand, PayOwnerOrderCommand, PayOwnerOrderOutcome,
}};
use sqlx::{{Postgres, PgPool, Row, Transaction}};
use std::collections::BTreeMap;
use std::time::{{SystemTime, UNIX_EPOCH}};

#[derive(Debug, Clone)]
pub struct PostgresCommerceOwnerOrderPaymentStore {{
    pool: PgPool,
}}

impl PostgresCommerceOwnerOrderPaymentStore {{
    pub fn new(pool: PgPool) -> Self {{
        Self {{ pool }}
    }}

    fn pool(&self) -> &PgPool {{
        &self.pool
    }}
{postgres_cancel_payments()}
{pay}
}}

{helpers}

fn store_error(message: &str, error: impl std::fmt::Display) -> CommerceServiceError {{
    CommerceServiceError::storage(format!("{{message}}: {{error}}"))
}}

fn string_cell(row: &sqlx::postgres::PgRow, column: &str) -> String {{
    row.try_get::<Option<String>, _>(column)
        .ok()
        .flatten()
        .unwrap_or_default()
}}
"""
    (PAYMENT_ROOT / "postgres_owner_order_payment.rs").write_text(body, encoding="utf-8")


if __name__ == "__main__":
    write_sqlite()
    write_postgres()
    print("extracted owner order payment modules")
