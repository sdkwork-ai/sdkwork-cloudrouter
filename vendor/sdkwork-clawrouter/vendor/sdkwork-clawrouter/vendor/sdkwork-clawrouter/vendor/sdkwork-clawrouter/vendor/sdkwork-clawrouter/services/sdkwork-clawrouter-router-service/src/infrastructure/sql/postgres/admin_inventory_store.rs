use serde_json::{Map, Value};
use sqlx::{PgPool, Row};

use crate::domain::{DomainError, DomainResult};
use crate::infrastructure::sql::sql_admin_product_center::{
    sql_error_message, stable_product_center_id,
};
use crate::ports::{
    AdminInventoryCollection, AdminInventoryFuture, AdminInventoryJsonRecord, AdminInventoryStore,
    ListAdminInventoryRecordsQuery, UpdateAdminInventoryStockCommand,
};

#[derive(Debug, Clone)]
pub struct PostgresAdminInventoryStore {
    pool: PgPool,
}

impl PostgresAdminInventoryStore {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

impl AdminInventoryStore for PostgresAdminInventoryStore {
    fn list_stocks<'a>(
        &'a self,
        query: ListAdminInventoryRecordsQuery,
    ) -> AdminInventoryFuture<'a, AdminInventoryCollection> {
        Box::pin(async move { list_stocks(&self.pool, query).await })
    }

    fn update_stock<'a>(
        &'a self,
        command: UpdateAdminInventoryStockCommand,
    ) -> AdminInventoryFuture<'a, AdminInventoryJsonRecord> {
        Box::pin(async move { update_stock(&self.pool, command).await })
    }

    fn list_reservations<'a>(
        &'a self,
        query: ListAdminInventoryRecordsQuery,
    ) -> AdminInventoryFuture<'a, AdminInventoryCollection> {
        Box::pin(async move { list_reservations(&self.pool, query).await })
    }

    fn list_ledger_entries<'a>(
        &'a self,
        query: ListAdminInventoryRecordsQuery,
    ) -> AdminInventoryFuture<'a, AdminInventoryCollection> {
        Box::pin(async move { list_ledger_entries(&self.pool, query).await })
    }
}

async fn list_stocks(
    pool: &PgPool,
    query: ListAdminInventoryRecordsQuery,
) -> DomainResult<AdminInventoryCollection> {
    let rows = sqlx::query(
        r#"
        SELECT
            id,
            sku_id,
            warehouse_id,
            available_quantity,
            reserved_quantity,
            sold_quantity,
            version,
            status,
            created_at,
            updated_at,
            COUNT(*) OVER() AS total
        FROM commerce_inventory_stock
        WHERE tenant_id = $1::text
          AND (organization_id = $2::text OR organization_id IS NULL)
          AND ($3 IS NULL OR sku_id = $3)
          AND ($4 IS NULL OR warehouse_id = $4)
          AND ($5 IS NULL OR status = $5)
        ORDER BY updated_at DESC, id DESC
        LIMIT $6 OFFSET $7
        "#,
    )
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.sku_id.as_deref())
    .bind(query.warehouse_id.as_deref())
    .bind(query.status.as_deref())
    .bind(query.page_size)
    .bind(query.offset)
    .fetch_all(pool)
    .await
    .map_err(store_error)?;
    let total = rows
        .first()
        .map(|row| integer_cell(row, "total"))
        .transpose()?
        .unwrap_or(0);
    let mut items = Vec::with_capacity(rows.len());
    for row in rows {
        items.push(stock_record_from_row(&row)?);
    }
    Ok(collection(items, total, &query))
}

async fn update_stock(
    pool: &PgPool,
    command: UpdateAdminInventoryStockCommand,
) -> DomainResult<AdminInventoryJsonRecord> {
    let mut tx = pool.begin().await.map_err(store_error)?;
    let current = sqlx::query(
        r#"
        SELECT
            id,
            tenant_id,
            organization_id,
            sku_id,
            warehouse_id,
            available_quantity,
            reserved_quantity,
            sold_quantity,
            version,
            status,
            created_at,
            updated_at
        FROM commerce_inventory_stock
        WHERE id = $1
          AND tenant_id = $2::text
          AND (organization_id = $3::text OR organization_id IS NULL)
        "#,
    )
    .bind(&command.stock_id)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .fetch_optional(&mut *tx)
    .await
    .map_err(store_error)?;
    let Some(current) = current else {
        return Err(DomainError::not_found("inventory stock was not found"));
    };
    let current_version = integer_cell(&current, "version")?;
    if current_version != command.version {
        return Err(DomainError::conflict(format!(
            "inventory stock version conflict: expected {}, got {}",
            current_version, command.version
        )));
    }
    let current_available = integer_cell(&current, "available_quantity")?;
    let current_reserved = integer_cell(&current, "reserved_quantity")?;
    let next_available = command.available_quantity.unwrap_or(current_available);
    let next_reserved = command.reserved_quantity.unwrap_or(current_reserved);
    let next_status = command
        .status
        .clone()
        .unwrap_or_else(|| string_cell(&current, "status").unwrap_or_else(|_| "active".to_owned()));
    let next_version = current_version + 1;
    sqlx::query(
        r#"
        UPDATE commerce_inventory_stock
        SET available_quantity = $1,
            reserved_quantity = $2,
            status = $3,
            version = $4,
            updated_at = $5
        WHERE id = $6
          AND version = $7
          AND tenant_id = $8::text
        "#,
    )
    .bind(next_available)
    .bind(next_reserved)
    .bind(&next_status)
    .bind(next_version)
    .bind(&command.requested_at)
    .bind(&command.stock_id)
    .bind(command.version)
    .bind(command.subject.tenant_id)
    .execute(&mut *tx)
    .await
    .map_err(store_error)?;

    let delta = next_available - current_available;
    if delta != 0 {
        let direction = if delta > 0 { "in" } else { "out" };
        let quantity = delta.abs();
        let movement_no = stable_product_center_id(
            "inventory-movement",
            &[
                &command.subject.tenant_id.to_string(),
                &command.subject.organization_id.to_string(),
                &command.idempotency_key,
            ],
        );
        sqlx::query(
            r#"
            INSERT INTO commerce_inventory_movement
                (id, tenant_id, organization_id, movement_no, sku_id, warehouse_id, movement_type, quantity, business_type, source_id, request_no, idempotency_key, created_at)
            VALUES
                ($1, $2::text, $3::text, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            ON CONFLICT (tenant_id, movement_no) DO NOTHING
            "#,
        )
        .bind(&movement_no)
        .bind(command.subject.tenant_id)
        .bind(command.subject.organization_id)
        .bind(&movement_no)
        .bind(string_cell(&current, "sku_id")?)
        .bind(optional_string_cell(&current, "warehouse_id")?)
        .bind(direction)
        .bind(quantity)
        .bind(command.reason_code.as_deref().unwrap_or("manual_adjustment"))
        .bind(&command.stock_id)
        .bind(&command.request_id)
        .bind(&command.idempotency_key)
        .bind(&command.requested_at)
        .execute(&mut *tx)
        .await
        .map_err(store_error)?;
    }
    tx.commit().await.map_err(store_error)?;
    load_stock(
        pool,
        &command.stock_id,
        command.subject.tenant_id,
        command.subject.organization_id,
    )
    .await
}

async fn list_reservations(
    pool: &PgPool,
    query: ListAdminInventoryRecordsQuery,
) -> DomainResult<AdminInventoryCollection> {
    let rows = sqlx::query(
        r#"
        SELECT
            id,
            reservation_no,
            order_id,
            sku_id,
            quantity,
            status,
            expires_at,
            created_at,
            COUNT(*) OVER() AS total
        FROM commerce_inventory_reservation
        WHERE tenant_id = $1::text
          AND (organization_id = $2::text OR organization_id IS NULL)
          AND ($3 IS NULL OR sku_id = $3)
          AND ($4 IS NULL OR order_id = $4)
          AND ($5 IS NULL OR status = $5)
        ORDER BY created_at DESC, id DESC
        LIMIT $6 OFFSET $7
        "#,
    )
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.sku_id.as_deref())
    .bind(query.order_id.as_deref())
    .bind(query.status.as_deref())
    .bind(query.page_size)
    .bind(query.offset)
    .fetch_all(pool)
    .await
    .map_err(store_error)?;
    let total = rows
        .first()
        .map(|row| integer_cell(row, "total"))
        .transpose()?
        .unwrap_or(0);
    let mut items = Vec::with_capacity(rows.len());
    for row in rows {
        let mut item = Map::new();
        insert_string(&mut item, "id", string_cell(&row, "id")?);
        insert_string(
            &mut item,
            "reservationNo",
            string_cell(&row, "reservation_no")?,
        );
        insert_optional_string(&mut item, "checkoutSessionId", None);
        insert_optional_string(
            &mut item,
            "orderId",
            optional_string_cell(&row, "order_id")?,
        );
        insert_string(&mut item, "skuId", string_cell(&row, "sku_id")?);
        insert_integer(&mut item, "quantity", integer_cell(&row, "quantity")?);
        insert_string(
            &mut item,
            "status",
            reservation_status(&string_cell(&row, "status")?),
        );
        insert_string(&mut item, "expiresAt", string_cell(&row, "expires_at")?);
        insert_string(&mut item, "createdAt", string_cell(&row, "created_at")?);
        items.push(item);
    }
    Ok(collection(items, total, &query))
}

async fn list_ledger_entries(
    pool: &PgPool,
    query: ListAdminInventoryRecordsQuery,
) -> DomainResult<AdminInventoryCollection> {
    let rows = sqlx::query(
        r#"
        SELECT
            id,
            movement_no,
            sku_id,
            warehouse_id,
            movement_type,
            quantity,
            business_type,
            source_id,
            created_at,
            COUNT(*) OVER() AS total
        FROM commerce_inventory_movement
        WHERE tenant_id = $1::text
          AND (organization_id = $2::text OR organization_id IS NULL)
          AND ($3 IS NULL OR sku_id = $3)
          AND ($4 IS NULL OR warehouse_id = $4)
          AND ($5 IS NULL OR source_id = $5)
          AND ($6 IS NULL OR ($6 = 'stock_adjustment' AND source_id LIKE 'stock-%'))
        ORDER BY created_at DESC, id DESC
        LIMIT $7 OFFSET $8
        "#,
    )
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.sku_id.as_deref())
    .bind(query.warehouse_id.as_deref())
    .bind(query.source_id.as_deref())
    .bind(query.source_type.as_deref())
    .bind(query.page_size)
    .bind(query.offset)
    .fetch_all(pool)
    .await
    .map_err(store_error)?;
    let total = rows
        .first()
        .map(|row| integer_cell(row, "total"))
        .transpose()?
        .unwrap_or(0);
    let mut items = Vec::with_capacity(rows.len());
    for row in rows {
        let mut item = Map::new();
        insert_string(&mut item, "id", string_cell(&row, "id")?);
        insert_string(&mut item, "movementNo", string_cell(&row, "movement_no")?);
        insert_string(&mut item, "skuId", string_cell(&row, "sku_id")?);
        insert_optional_string(
            &mut item,
            "warehouseId",
            optional_string_cell(&row, "warehouse_id")?,
        );
        let movement_type = string_cell(&row, "movement_type")?;
        insert_string(
            &mut item,
            "direction",
            direction_from_movement_type(&movement_type),
        );
        insert_integer(&mut item, "quantity", integer_cell(&row, "quantity")?);
        insert_integer(
            &mut item,
            "balanceAfter",
            ledger_balance_after(pool, &row).await?,
        );
        insert_string(
            &mut item,
            "businessType",
            string_cell(&row, "business_type")?,
        );
        let source_id = string_cell(&row, "source_id")?;
        insert_string(
            &mut item,
            "sourceType",
            source_type_from_source_id(&source_id),
        );
        insert_string(&mut item, "sourceId", source_id);
        insert_string(&mut item, "createdAt", string_cell(&row, "created_at")?);
        items.push(item);
    }
    Ok(collection(items, total, &query))
}

async fn ledger_balance_after(pool: &PgPool, row: &sqlx::postgres::PgRow) -> DomainResult<i64> {
    let stock_id = string_cell(row, "source_id")?;
    let stock_balance = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT available_quantity
        FROM commerce_inventory_stock
        WHERE id = $1
        LIMIT 1
        "#,
    )
    .bind(&stock_id)
    .fetch_optional(pool)
    .await
    .map_err(store_error)?;
    Ok(stock_balance.unwrap_or_else(|| integer_cell(row, "quantity").unwrap_or(0)))
}

async fn load_stock(
    pool: &PgPool,
    stock_id: &str,
    tenant_id: i64,
    organization_id: i64,
) -> DomainResult<AdminInventoryJsonRecord> {
    let row = sqlx::query(
        r#"
        SELECT
            id,
            sku_id,
            warehouse_id,
            available_quantity,
            reserved_quantity,
            sold_quantity,
            version,
            status,
            created_at,
            updated_at
        FROM commerce_inventory_stock
        WHERE id = $1
          AND tenant_id = $2::text
          AND (organization_id = $3::text OR organization_id IS NULL)
        "#,
    )
    .bind(stock_id)
    .bind(tenant_id)
    .bind(organization_id)
    .fetch_optional(pool)
    .await
    .map_err(store_error)?;
    row.map(|row| stock_record_from_row(&row))
        .transpose()?
        .ok_or_else(|| DomainError::not_found("inventory stock was not found"))
}

fn stock_record_from_row(row: &sqlx::postgres::PgRow) -> DomainResult<AdminInventoryJsonRecord> {
    let mut item = Map::new();
    insert_string(&mut item, "id", string_cell(row, "id")?);
    insert_string(&mut item, "skuId", string_cell(row, "sku_id")?);
    insert_optional_string(
        &mut item,
        "warehouseId",
        optional_string_cell(row, "warehouse_id")?,
    );
    insert_integer(
        &mut item,
        "availableQuantity",
        integer_cell(row, "available_quantity")?,
    );
    insert_integer(
        &mut item,
        "reservedQuantity",
        integer_cell(row, "reserved_quantity")?,
    );
    insert_integer(
        &mut item,
        "soldQuantity",
        integer_cell(row, "sold_quantity")?,
    );
    insert_integer(&mut item, "version", integer_cell(row, "version")?);
    insert_string(&mut item, "status", string_cell(row, "status")?);
    insert_string(&mut item, "createdAt", string_cell(row, "created_at")?);
    insert_string(&mut item, "updatedAt", string_cell(row, "updated_at")?);
    Ok(item)
}

fn collection(
    items: Vec<AdminInventoryJsonRecord>,
    total: i64,
    query: &ListAdminInventoryRecordsQuery,
) -> AdminInventoryCollection {
    AdminInventoryCollection {
        items,
        total,
        page_no: query.page_no,
        page_size: query.page_size,
    }
}

fn reservation_status(status: &str) -> &str {
    match status {
        "consumed" => "deducted",
        value => value,
    }
}

fn direction_from_movement_type(value: &str) -> &str {
    match value {
        "out" | "deduct" => "out",
        "reserve" => "reserve",
        "release" => "release",
        _ => "in",
    }
}

fn source_type_from_source_id(source_id: &str) -> &str {
    if source_id.starts_with("stock-") {
        "stock_adjustment"
    } else {
        "inventory_movement"
    }
}

fn insert_string(record: &mut AdminInventoryJsonRecord, key: &str, value: impl Into<String>) {
    record.insert(key.to_owned(), Value::String(value.into()));
}

fn insert_optional_string(record: &mut AdminInventoryJsonRecord, key: &str, value: Option<String>) {
    record.insert(
        key.to_owned(),
        value.map(Value::String).unwrap_or(Value::Null),
    );
}

fn insert_integer(record: &mut AdminInventoryJsonRecord, key: &str, value: i64) {
    record.insert(key.to_owned(), Value::from(value));
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
        "inventory row column {column} is not readable as text"
    )))
}

fn optional_string_cell(row: &sqlx::postgres::PgRow, column: &str) -> DomainResult<Option<String>> {
    let value = string_cell(row, column)?;
    Ok((!value.trim().is_empty()).then_some(value))
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
    let value = string_cell(row, column)?;
    if value.trim().is_empty() {
        return Ok(0);
    }
    value
        .parse::<i64>()
        .map_err(|error| DomainError::new(format!("invalid inventory integer {column}: {error}")))
}

fn store_error(error: sqlx::Error) -> DomainError {
    DomainError::new(sql_error_message(&error))
}
