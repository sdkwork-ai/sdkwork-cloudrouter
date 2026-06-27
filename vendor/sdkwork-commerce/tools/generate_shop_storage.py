#!/usr/bin/env python3
"""Generate shop storage and router scaffolding."""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

SQLITE_SHOP = ROOT / "crates/sdkwork-commerce-storage-repository-sqlx/src/sqlite_shop.rs"
SHOP_ROUTER = ROOT / "crates/sdkwork-commerce-api-server/src/shop_router.rs"

LIST_TABLES = [
    ("category_bindings", "commerce_shop_category_binding", "shops.current.categoryBindings"),
    ("brand_authorizations", "commerce_shop_brand_authorization", "shops.current.brandAuthorizations"),
    ("qualifications", "commerce_shop_qualification", "shops.current.qualifications"),
    ("customer_services", "commerce_shop_customer_service", "shops.current.customerServices"),
    ("return_addresses", "commerce_shop_return_address", "shops.current.returnAddresses"),
    ("shipping_templates", "commerce_shop_shipping_template", "shops.current.shippingTemplates"),
    ("applications", "commerce_shop_application", "shops.current.applications"),
    ("verifications", "commerce_shop_verification", "shops.current.verifications"),
    ("status_events", "commerce_shop_status_event", "shops.current.statusEvents"),
    ("channels", "commerce_shop_channel", "shops.current.channels"),
    ("service_areas", "commerce_shop_service_area", "shops.current.serviceAreas"),
    ("policies", "commerce_shop_policy", "shops.current.policies"),
    ("risk_signals", "commerce_shop_risk_signal", "shops.current.riskSignals"),
]

SINGLE_TABLES = [
    ("fulfillment_profile", "commerce_shop_fulfillment_profile"),
    ("settlement_profile", "commerce_shop_settlement_profile"),
    ("business_hours", "commerce_shop_business_hour"),
    ("readiness", "commerce_shop_readiness"),
    ("deposit_account", "commerce_shop_deposit_account"),
]


def snake_to_camel(name: str) -> str:
    parts = name.split("_")
    return parts[0] + "".join(part[:1].upper() + part[1:] for part in parts[1:])


def gen_sqlite_shop() -> str:
    list_methods = "\n".join(
        f"""    pub async fn list_{key}(
        &self,
        scope: ShopScopeQuery,
    ) -> Result<Vec<serde_json::Value>, CommerceServiceError> {{
        let shop_id = self.resolve_current_shop_id(&scope).await?;
        self.list_shop_table_rows("{table}", &scope.tenant_id, &shop_id).await
    }}"""
        for key, table, _ in LIST_TABLES
    )

    single_methods = "\n".join(
        f"""    pub async fn find_{key}(
        &self,
        scope: ShopScopeQuery,
    ) -> Result<Option<serde_json::Value>, CommerceServiceError> {{
        let shop_id = self.resolve_current_shop_id(&scope).await?;
        self.find_shop_table_row("{table}", &scope.tenant_id, &shop_id).await
    }}"""
        for key, table in SINGLE_TABLES
    )

    upsert_methods = "\n".join(
        f"""    pub async fn upsert_{key}(
        &self,
        scope: ShopScopeQuery,
        payload: serde_json::Value,
    ) -> Result<serde_json::Value, CommerceServiceError> {{
        let shop_id = self.resolve_current_shop_id(&scope).await?;
        self.upsert_shop_payload("{table}", &scope, &shop_id, payload).await
    }}"""
        for key, table, _ in LIST_TABLES
        if key
        not in {
            "applications",
            "verifications",
            "status_events",
            "channels",
            "service_areas",
            "policies",
            "risk_signals",
        }
    )

    return f'''use sdkwork_commerce_contract_service::CommerceServiceError;
use sdkwork_commerce_shop_service::{{ShopDetailQuery, ShopListQuery, ShopPage, ShopScopeQuery, ShopSummaryView}};
use sqlx::{{Row, SqlitePool}};

#[derive(Debug, Clone)]
pub struct SqliteCommerceShopStore {{
    pool: SqlitePool,
}}

impl SqliteCommerceShopStore {{
    pub fn new(pool: SqlitePool) -> Self {{
        Self {{ pool }}
    }}

    pub fn pool(&self) -> &SqlitePool {{
        &self.pool
    }}

    pub async fn list_shops(
        &self,
        query: ShopListQuery,
    ) -> Result<ShopPage<ShopSummaryView>, CommerceServiceError> {{
        let offset = ((query.page - 1) * query.page_size) as i64;
        let limit = query.page_size as i64;
        let total: i64 = sqlx::query_scalar(
            r#"
            SELECT COUNT(*)
            FROM commerce_shop
            WHERE tenant_id = CAST(? AS TEXT)
              AND (? IS NULL OR organization_id = CAST(? AS TEXT))
              AND deleted_at IS NULL
            "#,
        )
        .bind(&query.tenant_id)
        .bind(query.organization_id.as_deref())
        .bind(query.organization_id.as_deref())
        .fetch_one(self.pool())
        .await
        .map_err(|error| store_error("failed to count shops", error))?;

        let rows = sqlx::query(
            r#"
            SELECT id, tenant_id, organization_id, shop_no, shop_name, shop_type, business_model,
                   storefront_status, operation_status, review_status, data_scope,
                   logo_media_resource_id, cover_media_resource_id, default_currency_code,
                   default_locale, timezone, version, created_at, updated_at
            FROM commerce_shop
            WHERE tenant_id = CAST(? AS TEXT)
              AND (? IS NULL OR organization_id = CAST(? AS TEXT))
              AND deleted_at IS NULL
            ORDER BY created_at DESC, id DESC
            LIMIT ? OFFSET ?
            "#,
        )
        .bind(&query.tenant_id)
        .bind(query.organization_id.as_deref())
        .bind(query.organization_id.as_deref())
        .bind(limit)
        .bind(offset)
        .fetch_all(self.pool())
        .await
        .map_err(|error| store_error("failed to list shops", error))?;

        Ok(ShopPage {{
            items: rows.iter().map(map_shop_summary).collect(),
            page: query.page,
            page_size: query.page_size,
            total: total as u64,
        }})
    }}

    pub async fn retrieve_shop(
        &self,
        query: ShopDetailQuery,
    ) -> Result<Option<ShopSummaryView>, CommerceServiceError> {{
        let row = sqlx::query(
            r#"
            SELECT id, tenant_id, organization_id, shop_no, shop_name, shop_type, business_model,
                   storefront_status, operation_status, review_status, data_scope,
                   logo_media_resource_id, cover_media_resource_id, default_currency_code,
                   default_locale, timezone, version, created_at, updated_at
            FROM commerce_shop
            WHERE tenant_id = CAST(? AS TEXT)
              AND id = CAST(? AS TEXT)
              AND (? IS NULL OR organization_id = CAST(? AS TEXT))
              AND deleted_at IS NULL
            LIMIT 1
            "#,
        )
        .bind(&query.tenant_id)
        .bind(&query.shop_id)
        .bind(query.organization_id.as_deref())
        .bind(query.organization_id.as_deref())
        .fetch_optional(self.pool())
        .await
        .map_err(|error| store_error("failed to retrieve shop", error))?;

        Ok(row.map(|row| map_shop_summary(&row)))
    }}

    pub async fn retrieve_current_shop(
        &self,
        scope: ShopScopeQuery,
    ) -> Result<Option<ShopSummaryView>, CommerceServiceError> {{
        let row = sqlx::query(
            r#"
            SELECT id, tenant_id, organization_id, shop_no, shop_name, shop_type, business_model,
                   storefront_status, operation_status, review_status, data_scope,
                   logo_media_resource_id, cover_media_resource_id, default_currency_code,
                   default_locale, timezone, version, created_at, updated_at
            FROM commerce_shop
            WHERE tenant_id = CAST(? AS TEXT)
              AND organization_id = CAST(? AS TEXT)
              AND deleted_at IS NULL
            ORDER BY created_at ASC, id ASC
            LIMIT 1
            "#,
        )
        .bind(&scope.tenant_id)
        .bind(scope.organization_id.as_deref().unwrap_or(""))
        .fetch_optional(self.pool())
        .await
        .map_err(|error| store_error("failed to retrieve current shop", error))?;

        Ok(row.map(|row| map_shop_summary(&row)))
    }}

    pub async fn resolve_current_shop_id(
        &self,
        scope: &ShopScopeQuery,
    ) -> Result<String, CommerceServiceError> {{
        let organization_id = scope.organization_id.as_deref().ok_or_else(|| {{
            CommerceServiceError::validation("organization_id is required for current shop scope")
        }})?;
        let shop_id: Option<String> = sqlx::query_scalar(
            r#"
            SELECT id
            FROM commerce_shop
            WHERE tenant_id = CAST(? AS TEXT)
              AND organization_id = CAST(? AS TEXT)
              AND deleted_at IS NULL
            ORDER BY created_at ASC, id ASC
            LIMIT 1
            "#,
        )
        .bind(&scope.tenant_id)
        .bind(organization_id)
        .fetch_optional(self.pool())
        .await
        .map_err(|error| store_error("failed to resolve current shop", error))?;

        shop_id.ok_or_else(|| CommerceServiceError::not_found("current shop was not found"))
    }}

    pub async fn list_dashboard_snapshots(
        &self,
        scope: ShopScopeQuery,
    ) -> Result<Vec<serde_json::Value>, CommerceServiceError> {{
        let shop_id = self.resolve_current_shop_id(&scope).await?;
        self.list_shop_table_rows("commerce_shop_metric_snapshot", &scope.tenant_id, &shop_id)
            .await
    }}

    pub async fn list_settlements(
        &self,
        _scope: ShopScopeQuery,
    ) -> Result<ShopPage<serde_json::Value>, CommerceServiceError> {{
        Ok(ShopPage {{
            items: Vec::new(),
            page: 1,
            page_size: 20,
            total: 0,
        }})
    }}

    pub async fn list_shop_orders(
        &self,
        scope: ShopScopeQuery,
        page: u32,
        page_size: u32,
    ) -> Result<ShopPage<serde_json::Value>, CommerceServiceError> {{
        let shop_id = self.resolve_current_shop_id(&scope).await?;
        let offset = ((page.max(1) - 1) * page_size.clamp(1, 200)) as i64;
        let limit = page_size.clamp(1, 200) as i64;
        let total: i64 = sqlx::query_scalar(
            r#"
            SELECT COUNT(DISTINCT o.id)
            FROM commerce_order o
            INNER JOIN commerce_order_item i
                ON i.tenant_id = o.tenant_id
               AND i.order_id = o.id
            WHERE o.tenant_id = CAST(? AS TEXT)
              AND i.shop_id = CAST(? AS TEXT)
            "#,
        )
        .bind(&scope.tenant_id)
        .bind(&shop_id)
        .fetch_one(self.pool())
        .await
        .map_err(|error| store_error("failed to count shop orders", error))?;

        let rows = sqlx::query(
            r#"
            SELECT DISTINCT o.id, o.tenant_id, o.organization_id, o.owner_user_id, o.order_no,
                   o.status, o.payment_status, o.fulfillment_status, o.refund_status, o.subject,
                   o.currency_code, o.request_no, o.idempotency_key, o.created_at, o.paid_at,
                   o.cancelled_at, o.expired_at, o.updated_at
            FROM commerce_order o
            INNER JOIN commerce_order_item i
                ON i.tenant_id = o.tenant_id
               AND i.order_id = o.id
            WHERE o.tenant_id = CAST(? AS TEXT)
              AND i.shop_id = CAST(? AS TEXT)
            ORDER BY o.created_at DESC, o.id DESC
            LIMIT ? OFFSET ?
            "#,
        )
        .bind(&scope.tenant_id)
        .bind(&shop_id)
        .bind(limit)
        .bind(offset)
        .fetch_all(self.pool())
        .await
        .map_err(|error| store_error("failed to list shop orders", error))?;

        Ok(ShopPage {{
            items: rows.iter().map(map_row_json).collect(),
            page: page.max(1),
            page_size: page_size.clamp(1, 200),
            total: total as u64,
        }})
    }}

    pub async fn retrieve_shop_order(
        &self,
        scope: ShopScopeQuery,
        order_id: &str,
    ) -> Result<Option<serde_json::Value>, CommerceServiceError> {{
        let shop_id = self.resolve_current_shop_id(&scope).await?;
        let row = sqlx::query(
            r#"
            SELECT o.id, o.tenant_id, o.organization_id, o.owner_user_id, o.order_no,
                   o.status, o.payment_status, o.fulfillment_status, o.refund_status, o.subject,
                   o.currency_code, o.request_no, o.idempotency_key, o.created_at, o.paid_at,
                   o.cancelled_at, o.expired_at, o.updated_at
            FROM commerce_order o
            INNER JOIN commerce_order_item i
                ON i.tenant_id = o.tenant_id
               AND i.order_id = o.id
            WHERE o.tenant_id = CAST(? AS TEXT)
              AND i.shop_id = CAST(? AS TEXT)
              AND o.id = CAST(? AS TEXT)
            LIMIT 1
            "#,
        )
        .bind(&scope.tenant_id)
        .bind(&shop_id)
        .bind(order_id)
        .fetch_optional(self.pool())
        .await
        .map_err(|error| store_error("failed to retrieve shop order", error))?;

        Ok(row.map(|row| map_row_json(&row)))
    }}

    pub async fn create_shop_fulfillment(
        &self,
        scope: ShopScopeQuery,
        order_id: &str,
        payload: serde_json::Value,
    ) -> Result<serde_json::Value, CommerceServiceError> {{
        let shop_id = self.resolve_current_shop_id(&scope).await?;
        let organization_id = scope.organization_id.as_deref().unwrap_or("");
        let now = chrono_like_now();
        let fulfillment_id = payload
            .get("fulfillmentId")
            .or_else(|| payload.get("fulfillment_id"))
            .and_then(|value| value.as_str())
            .unwrap_or("fulfillment-generated");
        let fulfillment_no = payload
            .get("fulfillmentNo")
            .or_else(|| payload.get("fulfillment_no"))
            .and_then(|value| value.as_str())
            .unwrap_or("FF-GEN");
        let fulfillment_type = payload
            .get("fulfillmentType")
            .or_else(|| payload.get("fulfillment_type"))
            .and_then(|value| value.as_str())
            .unwrap_or("physical");
        sqlx::query(
            r#"
            INSERT INTO commerce_fulfillment_order
                (id, tenant_id, organization_id, fulfillment_no, order_id, shop_id,
                 fulfillment_type, status, request_no, idempotency_key, created_at, updated_at)
            VALUES
                (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)
            "#,
        )
        .bind(fulfillment_id)
        .bind(&scope.tenant_id)
        .bind(organization_id)
        .bind(fulfillment_no)
        .bind(order_id)
        .bind(&shop_id)
        .bind(fulfillment_type)
        .bind(fulfillment_no)
        .bind(format!("idem-{{fulfillment_id}}"))
        .bind(&now)
        .bind(&now)
        .execute(self.pool())
        .await
        .map_err(|error| store_error("failed to create shop fulfillment", error))?;

        self.find_shop_table_row(
            "commerce_fulfillment_order",
            &scope.tenant_id,
            fulfillment_id,
            "id",
        )
        .await
        .and_then(|value| value.ok_or_else(|| CommerceServiceError::storage("fulfillment row missing after insert")))
    }}

    pub async fn list_inventory_stocks(
        &self,
        scope: ShopScopeQuery,
    ) -> Result<Vec<serde_json::Value>, CommerceServiceError> {{
        let organization_id = scope.organization_id.as_deref().unwrap_or("");
        let rows = sqlx::query(
            r#"
            SELECT id, tenant_id, organization_id, sku_id, warehouse_id, fulfillment_node_id,
                   available_quantity, reserved_quantity, inbound_quantity, damaged_quantity,
                   status, version, created_at, updated_at
            FROM commerce_inventory_stock
            WHERE tenant_id = CAST(? AS TEXT)
              AND ((organization_id = CAST(? AS TEXT)) OR (organization_id IS NULL AND ? = ''))
            ORDER BY updated_at DESC, id DESC
            "#,
        )
        .bind(&scope.tenant_id)
        .bind(organization_id)
        .bind(organization_id)
        .fetch_all(self.pool())
        .await
        .map_err(|error| store_error("failed to list inventory stocks", error))?;

        Ok(rows.iter().map(map_row_json).collect())
    }}

    pub async fn create_inventory_adjustment(
        &self,
        scope: ShopScopeQuery,
        stock_id: &str,
        payload: serde_json::Value,
    ) -> Result<serde_json::Value, CommerceServiceError> {{
        let quantity_delta = payload
            .get("quantityDelta")
            .or_else(|| payload.get("quantity_delta"))
            .and_then(|value| value.as_i64())
            .unwrap_or(0);
        sqlx::query(
            r#"
            UPDATE commerce_inventory_stock
            SET available_quantity = CAST(available_quantity AS INTEGER) + CAST(? AS INTEGER),
                updated_at = ?
            WHERE tenant_id = CAST(? AS TEXT)
              AND id = CAST(? AS TEXT)
            "#,
        )
        .bind(quantity_delta)
        .bind(chrono_like_now())
        .bind(&scope.tenant_id)
        .bind(stock_id)
        .execute(self.pool())
        .await
        .map_err(|error| store_error("failed to adjust inventory stock", error))?;

        let row = sqlx::query(
            r#"
            SELECT id, tenant_id, organization_id, sku_id, warehouse_id, fulfillment_node_id,
                   available_quantity, reserved_quantity, inbound_quantity, damaged_quantity,
                   status, version, created_at, updated_at
            FROM commerce_inventory_stock
            WHERE tenant_id = CAST(? AS TEXT)
              AND id = CAST(? AS TEXT)
            LIMIT 1
            "#,
        )
        .bind(&scope.tenant_id)
        .bind(stock_id)
        .fetch_optional(self.pool())
        .await
        .map_err(|error| store_error("failed to retrieve adjusted stock", error))?;

        row.map(|row| map_row_json(&row))
            .ok_or_else(|| CommerceServiceError::not_found("inventory stock was not found"))
    }}

{list_methods}

{single_methods}

{upsert_methods}

    async fn list_shop_table_rows(
        &self,
        table: &str,
        tenant_id: &str,
        shop_id: &str,
    ) -> Result<Vec<serde_json::Value>, CommerceServiceError> {{
        let sql = format!(
            "SELECT * FROM {{table}} WHERE tenant_id = CAST(? AS TEXT) AND shop_id = CAST(? AS TEXT) ORDER BY created_at DESC, id DESC"
        );
        let rows = sqlx::query(&sql)
            .bind(tenant_id)
            .bind(shop_id)
            .fetch_all(self.pool())
            .await
            .map_err(|error| store_error(&format!("failed to list {{table}} rows", table = table), error))?;
        Ok(rows.iter().map(map_row_json).collect())
    }}

    async fn find_shop_table_row(
        &self,
        table: &str,
        tenant_id: &str,
        shop_id: &str,
    ) -> Result<Option<serde_json::Value>, CommerceServiceError> {{
        let sql = format!(
            "SELECT * FROM {{table}} WHERE tenant_id = CAST(? AS TEXT) AND shop_id = CAST(? AS TEXT) LIMIT 1"
        );
        let row = sqlx::query(&sql)
            .bind(tenant_id)
            .bind(shop_id)
            .fetch_optional(self.pool())
            .await
            .map_err(|error| store_error(&format!("failed to find {{table}} row", table = table), error))?;
        Ok(row.map(|row| map_row_json(&row)))
    }}

    async fn find_shop_table_row(
        &self,
        table: &str,
        tenant_id: &str,
        key_value: &str,
        key_column: &str,
    ) -> Result<Option<serde_json::Value>, CommerceServiceError> {{
        let sql = format!(
            "SELECT * FROM {{table}} WHERE tenant_id = CAST(? AS TEXT) AND {{key_column}} = CAST(? AS TEXT) LIMIT 1",
            table = table,
            key_column = key_column,
        );
        let row = sqlx::query(&sql)
            .bind(tenant_id)
            .bind(key_value)
            .fetch_optional(self.pool())
            .await
            .map_err(|error| store_error(&format!("failed to find {{table}} row", table = table), error))?;
        Ok(row.map(|row| map_row_json(&row)))
    }}

    async fn upsert_shop_payload(
        &self,
        table: &str,
        scope: &ShopScopeQuery,
        shop_id: &str,
        payload: serde_json::Value,
    ) -> Result<serde_json::Value, CommerceServiceError> {{
        let organization_id = scope.organization_id.as_deref().unwrap_or("");
        let now = chrono_like_now();
        let id = payload
            .get("id")
            .and_then(|value| value.as_str())
            .map(str::to_owned)
            .unwrap_or_else(|| format!("{{table}}-{{shop_id}}-{{now}}", table = table, shop_id = shop_id, now = now));
        let payload_json = payload.to_string();
        let sql = format!(
            "INSERT INTO {{table}} (id, tenant_id, organization_id, shop_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at"
        );
        sqlx::query(&sql)
            .bind(&id)
            .bind(&scope.tenant_id)
            .bind(organization_id)
            .bind(shop_id)
            .bind(&now)
            .bind(&now)
            .execute(self.pool())
            .await
            .map_err(|error| store_error(&format!("failed to upsert {{table}}", table = table), error))?;
        let _ = payload_json;
        self.find_shop_table_row(table, &scope.tenant_id, shop_id)
            .await
            .and_then(|value| value.ok_or_else(|| CommerceServiceError::storage("upsert row missing after write")))
    }}
}}

fn map_shop_summary(row: &sqlx::sqlite::SqliteRow) -> ShopSummaryView {{
    ShopSummaryView {{
        shop_id: string_cell(row, "id"),
        tenant_id: string_cell(row, "tenant_id"),
        organization_id: string_cell(row, "organization_id"),
        shop_no: string_cell(row, "shop_no"),
        shop_name: string_cell(row, "shop_name"),
        shop_type: string_cell(row, "shop_type"),
        business_model: string_cell(row, "business_model"),
        storefront_status: string_cell(row, "storefront_status"),
        operation_status: string_cell(row, "operation_status"),
        review_status: string_cell(row, "review_status"),
        data_scope: string_cell(row, "data_scope"),
        logo_media_resource_id: optional_string_cell(row, "logo_media_resource_id"),
        cover_media_resource_id: optional_string_cell(row, "cover_media_resource_id"),
        default_currency_code: string_cell(row, "default_currency_code"),
        default_locale: optional_string_cell(row, "default_locale"),
        timezone: optional_string_cell(row, "timezone"),
        version: row.try_get::<i64, _>("version").unwrap_or(0),
        created_at: string_cell(row, "created_at"),
        updated_at: string_cell(row, "updated_at"),
    }}
}}

fn map_row_json(row: &sqlx::sqlite::SqliteRow) -> serde_json::Value {{
    let mut map = serde_json::Map::new();
    for column in row.columns() {{
        let name = column.name();
        let key = snake_to_camel(name);
        let value = if name == "id" {{
            serde_json::Value::String(string_cell(row, name))
        }} else if name.ends_with("_id") && name != "id" {{
            optional_string_cell(row, name)
                .map(serde_json::Value::String)
                .unwrap_or(serde_json::Value::Null)
        }} else if name.ends_with("_json") {{
            optional_string_cell(row, name)
                .and_then(|text| serde_json::from_str(&text).ok())
                .unwrap_or(serde_json::Value::Object(serde_json::Map::new()))
        }} else {{
            optional_string_cell(row, name)
                .map(serde_json::Value::String)
                .unwrap_or(serde_json::Value::Null)
        }};
        map.insert(key, value);
    }}
    serde_json::Value::Object(map)
}}

fn snake_to_camel(name: &str) -> String {{
    let parts: Vec<&str> = name.split('_').collect();
    if parts.is_empty() {{
        return String::new();
    }}
    parts[0].to_owned()
        + &parts[1..]
            .iter()
            .map(|part| {{
                let mut chars = part.chars();
                match chars.next() {{
                    None => String::new(),
                    Some(first) => first.to_uppercase().collect::<String>() + chars.as_str(),
                }}
            }})
            .collect::<String>()
}}

fn chrono_like_now() -> String {{
    "2026-06-17 00:00:00".to_owned()
}}

fn store_error(message: &str, error: impl std::fmt::Display) -> CommerceServiceError {{
    CommerceServiceError::storage(format!("{{message}}: {{error}}"))
}}

fn optional_string_cell(row: &sqlx::sqlite::SqliteRow, column: &str) -> Option<String> {{
    row.try_get::<Option<String>, _>(column).ok().flatten()
}}

fn string_cell(row: &sqlx::sqlite::SqliteRow, column: &str) -> String {{
    optional_string_cell(row, column).unwrap_or_default()
}}
'''


def gen_shop_router() -> str:
    routes = [
        ('get', '/app/v3/api/shops', 'list_shops'),
        ('get', '/app/v3/api/shops/{shopId}', 'retrieve_shop'),
        ('get', '/app/v3/api/shops/current', 'retrieve_current_shop'),
        ('get', '/app/v3/api/shops/current/dashboard', 'retrieve_current_dashboard'),
        ('get', '/app/v3/api/shops/current/readiness', 'retrieve_current_readiness'),
    ]
    for key, _, _ in LIST_TABLES:
        routes.append(('get', f'/app/v3/api/shops/current/{key}', f'list_current_{key}'))
    for key, table in SINGLE_TABLES:
        camel = snake_to_camel(key)
        path_key = key.replace('_', '_')
        routes.append(('get', f'/app/v3/api/shops/current/{path_key}', f'find_current_{key}'))
    routes.extend([
        ('get', '/app/v3/api/shops/current/orders', 'list_current_orders'),
        ('get', '/app/v3/api/shops/current/orders/{orderId}', 'retrieve_current_order'),
        ('post', '/app/v3/api/shops/current/orders/{orderId}/fulfillments', 'create_current_order_fulfillment'),
        ('get', '/app/v3/api/shops/current/settlements', 'list_current_settlements'),
        ('get', '/app/v3/api/shops/current/inventory/stocks', 'list_current_inventory_stocks'),
        ('post', '/app/v3/api/shops/current/inventory/stocks/{stockId}/adjustments', 'create_current_inventory_adjustment'),
        ('get', '/app/v3/api/shops/current/products', 'list_current_products'),
        ('post', '/app/v3/api/shops/current/products', 'create_current_product'),
        ('patch', '/app/v3/api/shops/current/products/{productId}', 'update_current_product'),
        ('post', '/app/v3/api/shops/current/products/{productId}/publish', 'publish_current_product'),
        ('post', '/app/v3/api/shops/current/products/{productId}/unpublish', 'unpublish_current_product'),
    ])

    return "// generated scaffold - see tools/generate_shop_router.py\n"


def main() -> None:
    SQLITE_SHOP.write_text(gen_sqlite_shop(), encoding="utf-8")
    print(f"wrote {SQLITE_SHOP}")


if __name__ == "__main__":
    main()
