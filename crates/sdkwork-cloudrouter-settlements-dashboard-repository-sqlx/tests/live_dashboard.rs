//! Live-database integration probe for the settlements dashboard read store.
//!
//! Connects to the local dev database (`sdkwork_ai_dev`) and exercises the
//! exact production code path (`PostgresSettlementsDashboardReadStore`)
//! including SQL execution and row mapping, so runtime-only failures
//! (UndefinedColumn, GroupingError, decimal/modality/status mapping) surface
//! here instead of as a 50001 in the gateway.
//!
//! Run: DATABASE_URL=postgresql://sdkwork_ai_dev:sdkworkdev123@127.0.0.1:5432/sdkwork_ai_dev?options=-csearch_path%3Dsdkwork_ai_dev%2Cpublic cargo test -p sdkwork-cloudrouter-settlements-dashboard-repository-sqlx --test live_dashboard -- --nocapture

use sdkwork_cloudrouter_router_service::ports::{
    SettlementsDashboardQuery, SettlementsDashboardReadStore, SettlementsDashboardSubject,
};
use sdkwork_cloudrouter_settlements_dashboard_repository_sqlx::PostgresSettlementsDashboardReadStore;
use sqlx::Row;

fn database_url() -> String {
    std::env::var("DATABASE_URL").unwrap_or_else(|_| {
        "postgresql://sdkwork_ai_dev:sdkworkdev123@127.0.0.1:5432/sdkwork_ai_dev?options=-csearch_path%3Dsdkwork_ai_dev%2Cpublic"
            .to_owned()
    })
}

#[tokio::test]
#[ignore = "requires the local dev database (sdkwork_ai_dev); run manually with DATABASE_URL set"]
async fn live_settlements_dashboard_loads_without_error() {
    let pool = sqlx::PgPool::connect(&database_url())
        .await
        .expect("connect to dev database");
    let store = PostgresSettlementsDashboardReadStore::new(pool.clone());

    // Discover a real subject that has charge data.
    let subject = sqlx::query(
        "SELECT tenant_id, organization_id, COALESCE(user_id, 0) \
         FROM cloudrouter_charge_line LIMIT 1",
    )
    .fetch_optional(&pool)
    .await
    .expect("query subject");

    let subject = match subject {
        Some(row) => {
            let tenant_id: i64 = row.get(0);
            let organization_id: i64 = row.get(1);
            let user_id: i64 = row.get(2);
            SettlementsDashboardSubject {
                tenant_id,
                organization_id,
                user_id,
            }
        }
        None => {
            eprintln!("NO CHARGE DATA FOUND - nothing to assert");
            return;
        }
    };
    eprintln!("probing subject: {subject:?}");

    for year in [None, Some(2026i64)] {
        let snapshot = store
            .load_settlements_dashboard(SettlementsDashboardQuery { year }, Some(subject))
            .await
            .unwrap_or_else(|error| panic!("dashboard load failed for year={year:?}: {error}"));
        eprintln!(
            "year={year:?} bills={} chart={}",
            snapshot.bills.len(),
            snapshot.chart_data.len()
        );
        for bill in &snapshot.bills {
            eprintln!(
                "  bill {} {} cost={} status={} breakdown.text.cost={}",
                bill.id, bill.period, bill.total_cost, bill.status, bill.breakdown.text.cost
            );
        }
        assert!(snapshot.bills.len() <= 24, "bills must respect LIMIT 24");
        for bill in &snapshot.bills {
            assert!(
                bill.total_cost.parse::<f64>().is_ok(),
                "total_cost must be numeric"
            );
        }
    }
    pool.close().await;
}
