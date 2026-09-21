//! Live-database probe for the admin catalog category *seed* write path.
//!
//! The seed pipeline has two targets that both persist into
//! `commerce_product_category`:
//!
//! * `product` -- the catalog's own taxonomy, unscoped.
//! * `agents` / `agent-skills` / `mcp` -- classification datasets that used to
//!   target a `c_category` table no repository owns or creates. They now
//!   persist under a resolved `category_type` scope.
//!
//! `admin_catalog_api.rs` exercises the seed endpoint with an in-memory
//! `TestAdminCatalogStore`, so the real INSERT was never executed. The old
//! `c_category` INSERT referenced a table that does not exist anywhere in the
//! workspace, which meant 3 of the 4 shipped datasets were guaranteed to fail
//! while every unit test stayed green.
//!
//! Run:
//! ```text
//! SDKWORK_DATABASE_URL=postgresql://sdkwork_ai_dev:sdkworkdev123@127.0.0.1:5432/sdkwork_ai_dev \
//!   cargo test -p sdkwork-cloudrouter-router-service --test postgres_category_seed_live -- --nocapture
//! ```
//! Without `SDKWORK_DATABASE_URL` every probe skips itself.

use sdkwork_cloudrouter_router_service::application::load_admin_category_seed_bundles;
use sdkwork_cloudrouter_router_service::infrastructure::sql::postgres::PostgresAdminCatalogStore;
use sdkwork_cloudrouter_router_service::ports::{
    AdminCatalogSubject, AdminCatalogStore, AdminCategorySeedInitializeCommand,
};
use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;

const POSTGRES_TEST_DATABASE_URL: &str = "SDKWORK_DATABASE_URL";

/// The live dev database carries real operator data, so seed probes run under a
/// dedicated tenant that no other fixture uses.
const SEED_PROBE_TENANT_ID: i64 = 990000042;

fn subject() -> AdminCatalogSubject {
    AdminCatalogSubject {
        tenant_id: SEED_PROBE_TENANT_ID,
        organization_id: 0,
        operator_id: 30,
        operator_type: 1,
    }
}

async fn live_pool() -> Option<PgPool> {
    let database_url = match std::env::var(POSTGRES_TEST_DATABASE_URL) {
        Ok(value) if !value.trim().is_empty() => value,
        _ => {
            eprintln!("skipping live category seed probe; set {POSTGRES_TEST_DATABASE_URL} to run it");
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

async fn seed_command(datasets: &[&str]) -> AdminCategorySeedInitializeCommand {
    let requested: Vec<String> = datasets.iter().map(|d| (*d).to_owned()).collect();
    let bundles =
        load_admin_category_seed_bundles(&requested).expect("category seed bundles must load");
    AdminCategorySeedInitializeCommand {
        subject: subject(),
        datasets: requested,
        bundles,
        mode: "initialize".to_owned(),
        idempotency_key: "live-probe-category-seed".to_owned(),
        request_id: "live-probe-category-seed".to_owned(),
        requested_at: "2026-09-21T00:00:00Z".to_owned(),
    }
}

/// Every shipped dataset must actually execute its INSERT. This is the probe
/// that would have caught the `c_category` phantom table on 3 of 4 datasets.
#[tokio::test]
async fn live_category_seed_initializes_every_shipped_dataset() {
    let Some(pool) = live_pool().await else {
        return;
    };
    let store = PostgresAdminCatalogStore::new(pool);
    let command = seed_command(&["product", "agents", "agent-skills", "mcp"]).await;
    let expected = command.bundles.len();
    let summaries = store.initialize_category_seeds(command).await;
    assert!(
        summaries.is_ok(),
        "every shipped category seed dataset must initialize against the live schema: {:?}",
        summaries.err()
    );
    let summaries = summaries.expect("checked");
    assert_eq!(
        summaries.len(),
        expected,
        "one summary per requested dataset is required"
    );
    for summary in &summaries {
        assert!(
            summary.upserted > 0,
            "dataset {} upserted no rows",
            summary.dataset
        );
    }
}

/// A second run must be idempotent: the product taxonomy upserts on
/// `(tenant_id, category_no)` and the classification datasets on
/// `(tenant_id, category_no)` too, so re-running must not raise.
#[tokio::test]
async fn live_category_seed_is_idempotent() {
    let Some(pool) = live_pool().await else {
        return;
    };
    let store = PostgresAdminCatalogStore::new(pool);
    let first = store
        .initialize_category_seeds(seed_command(&["agents", "mcp"]).await)
        .await;
    assert!(first.is_ok(), "first seed run failed: {:?}", first.err());
    let second = store
        .initialize_category_seeds(seed_command(&["agents", "mcp"]).await)
        .await;
    assert!(second.is_ok(), "second seed run failed: {:?}", second.err());
}

/// The classification datasets must land under their resolved scope and the
/// taxonomy under its own `category_no` values, all in the one owned table.
#[tokio::test]
async fn live_category_seed_rows_land_in_the_owned_table() {
    let Some(pool) = live_pool().await else {
        return;
    };
    let store = PostgresAdminCatalogStore::new(pool.clone());
    let summaries = store
        .initialize_category_seeds(seed_command(&["agents"]).await)
        .await
        .expect("agents seed must succeed");
    assert_eq!(summaries.len(), 1);
    assert!(
        summaries[0].upserted > 0,
        "agents dataset must upsert at least one row"
    );

    let scoped: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(1)
        FROM commerce_product_category
        WHERE tenant_id = '0'
          AND category_no LIKE 'agent:%'
          AND status = 'active'
        "#,
    )
    .fetch_one(&pool)
    .await
    .expect("count scoped classification categories");
    assert!(
        scoped > 0,
        "agents seed rows must persist as `agent:`-scoped commerce_product_category rows"
    );
}
