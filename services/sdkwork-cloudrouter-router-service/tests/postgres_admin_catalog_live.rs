//! Live-database probe for the admin catalog read/write store.
//!
//! `admin_catalog_api.rs` drives the HTTP layer with an in-memory
//! `TestAdminCatalogStore`, so it never executes SQL. That let a real defect
//! through: `admin_catalog_store.rs` referenced columns
//! (`sort_weight`, `parent_category_id`) and tables
//! (`commerce_product_media`, `commerce_product_category_attribute`,
//! `commerce_product_sku_attribute`, `commerce_product_spu_category`,
//! `c_category`) that did not exist in the federated merchandise schema, so
//! `GET /backend/v3/api/catalog/categories` failed with
//! `column "sort_weight" does not exist` and `list_products` failed with
//! `relation "commerce_product_spu_category" does not exist`.
//!
//! Columns were renamed to the owner contract (`sort_order`, `parent_id`). The
//! four relation tables are now Cloud Router-owned (migration 0044) because
//! `sdkwork-merchandise` owns only the six master-data tables. The
//! classification seed target `c_category` is no longer a table at all: the
//! datasets converge onto `commerce_product_category` under a resolved
//! `category_type` scope.
//!
//! These probes run the exact production `PostgresAdminCatalogStore` against a
//! real database so schema/column drift surfaces as a test failure instead of a
//! runtime 500.
//!
//! Run:
//! ```text
//! SDKWORK_DATABASE_URL=postgresql://sdkwork_ai_dev:sdkworkdev123@127.0.0.1:5432/sdkwork_ai_dev \
//!   cargo test -p sdkwork-cloudrouter-router-service --test postgres_admin_catalog_live -- --nocapture
//! ```
//! Without `SDKWORK_DATABASE_URL` every probe skips itself.

use sdkwork_cloudrouter_router_service::infrastructure::sql::postgres::PostgresAdminCatalogStore;
use sdkwork_cloudrouter_router_service::ports::{
    AdminCatalogStore, AdminCatalogSubject, ListAdminCatalogRecordsQuery,
};
use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;

const POSTGRES_TEST_DATABASE_URL: &str = "SDKWORK_DATABASE_URL";

fn test_subject() -> AdminCatalogSubject {
    AdminCatalogSubject {
        tenant_id: 100001,
        organization_id: 0,
        operator_id: 30,
        operator_type: 1,
    }
}

fn list_query() -> ListAdminCatalogRecordsQuery {
    ListAdminCatalogRecordsQuery {
        subject: test_subject(),
        page_no: 1,
        page_size: 20,
        offset: 0,
        status: None,
        parent_id: None,
        query_text: None,
        category_id: None,
        attribute_id: None,
        product_type: None,
        product_id: None,
        fulfillment_type: None,
        scope: None,
        currency_code: None,
        market_code: None,
    }
}

async fn live_pool() -> Option<PgPool> {
    let database_url = match std::env::var(POSTGRES_TEST_DATABASE_URL) {
        Ok(value) if !value.trim().is_empty() => value,
        _ => {
            eprintln!(
                "skipping live admin catalog probe; set {POSTGRES_TEST_DATABASE_URL} to run it"
            );
            return None;
        }
    };
    Some(
        PgPoolOptions::new()
            .max_connections(2)
            .connect(&database_url)
            .await
            .expect("connect to the configured database"),
    )
}

/// Every table the store addresses must exist, otherwise the corresponding
/// endpoint is guaranteed to fail at runtime.
#[tokio::test]
async fn live_admin_catalog_required_tables_exist() {
    let Some(pool) = live_pool().await else {
        return;
    };
    let required = [
        "commerce_price_list",
        "commerce_product_attribute",
        "commerce_product_attribute_value",
        "commerce_product_category",
        "commerce_product_category_attribute",
        "commerce_product_media",
        "commerce_product_sku",
        "commerce_product_sku_attribute",
        "commerce_product_spu",
        "commerce_product_spu_category",
    ];
    let missing: Vec<String> = sqlx::query_scalar(
        r#"
        SELECT t
        FROM unnest($1::text[]) AS t
        WHERE NOT EXISTS (
            SELECT 1 FROM information_schema.tables i
            WHERE i.table_schema = current_schema() AND i.table_name = t
        )
        "#,
    )
    .bind(&required[..])
    .fetch_all(&pool)
    .await
    .expect("query information_schema");
    assert!(
        missing.is_empty(),
        "admin catalog store references tables that do not exist: {missing:?}"
    );
}

/// `list_categories` must execute against the real schema. This is the probe
/// that would have caught the `sort_weight` / `parent_category_id` drift.
#[tokio::test]
async fn live_admin_catalog_list_categories_executes() {
    let Some(pool) = live_pool().await else {
        return;
    };
    let store = PostgresAdminCatalogStore::new(pool);
    let result = store.list_categories(list_query()).await;
    assert!(
        result.is_ok(),
        "list_categories must execute against the live schema: {:?}",
        result.err()
    );
}

/// `list_attributes` must execute against the real schema.
#[tokio::test]
async fn live_admin_catalog_list_attributes_executes() {
    let Some(pool) = live_pool().await else {
        return;
    };
    let store = PostgresAdminCatalogStore::new(pool);
    let result = store.list_attributes(list_query()).await;
    assert!(
        result.is_ok(),
        "list_attributes must execute against the live schema: {:?}",
        result.err()
    );
}

/// `list_products` and `list_skus` join the SPU/SKU tables; both must execute.
#[tokio::test]
async fn live_admin_catalog_list_products_and_skus_execute() {
    let Some(pool) = live_pool().await else {
        return;
    };
    let store = PostgresAdminCatalogStore::new(pool);
    let products = store.list_products(list_query()).await;
    assert!(
        products.is_ok(),
        "list_products must execute against the live schema: {:?}",
        products.err()
    );
    let skus = store.list_skus(list_query()).await;
    assert!(
        skus.is_ok(),
        "list_skus must execute against the live schema: {:?}",
        skus.err()
    );
}

/// `list_category_attributes` joins `commerce_product_category_attribute`; it
/// must execute now that the relation table exists.
#[tokio::test]
async fn live_admin_catalog_list_category_attributes_executes() {
    let Some(pool) = live_pool().await else {
        return;
    };
    let store = PostgresAdminCatalogStore::new(pool);
    let result = store.list_category_attributes(list_query()).await;
    assert!(
        result.is_ok(),
        "list_category_attributes must execute against the live schema: {:?}",
        result.err()
    );
}

/// `list_price_lists` reads the federated `commerce_price_list` table.
#[tokio::test]
async fn live_admin_catalog_list_price_lists_executes() {
    let Some(pool) = live_pool().await else {
        return;
    };
    let store = PostgresAdminCatalogStore::new(pool);
    let result = store.list_price_lists(list_query()).await;
    assert!(
        result.is_ok(),
        "list_price_lists must execute against the live schema: {:?}",
        result.err()
    );
}
