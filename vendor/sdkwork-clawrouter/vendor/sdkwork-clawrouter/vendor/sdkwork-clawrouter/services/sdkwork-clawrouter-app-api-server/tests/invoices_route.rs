use std::str::FromStr;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};

use axum::body::Body;
use axum::http::{Request, StatusCode};
use sdkwork_claw_config::DatabaseConfig;
use sdkwork_claw_test_support::{
    api_key_security_config, app_session_config, app_session_dual_token_headers,
    payment_webhook_config, trusted_request_subject, trusted_subject_config,
};
use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
use sqlx::SqlitePool;
use tower::ServiceExt;

static DB_SEQUENCE: AtomicU64 = AtomicU64::new(0);

#[tokio::test]
async fn database_config_app_invoices_route_is_backed_by_appbase_store() {
    let database_url = unique_sqlite_url();
    let router =
        sdkwork_clawrouter_app_api_server::router_with_database_config_api_key_trusted_subject_and_app_session_config(
            DatabaseConfig::from_url_with_max_connections(database_url.as_str(), 1).unwrap(),
            api_key_security_config().unwrap(),
            trusted_subject_config().unwrap(),
            app_session_config().unwrap(),
            payment_webhook_config().unwrap(),
        )
        .await
        .unwrap();
    let pool = connect_sqlite_for_test(&database_url).await;
    seed_invoice(&pool).await;
    pool.close().await;

    let response = router
        .oneshot(app_session_request(
            "GET",
            "/app/v3/api/invoices?page=1&page_size=100",
            Body::empty(),
            10,
            20,
            30,
        ))
        .await
        .unwrap();
    let status = response.status();
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(
        StatusCode::OK,
        status,
        "invoice route must be implemented instead of falling through to 501: {}",
        String::from_utf8_lossy(&body)
    );
    assert_eq!("2000", payload["code"]);
    assert_eq!(1, payload["data"]["total"]);
    assert_eq!(1, payload["data"]["page"]);
    assert_eq!(100, payload["data"]["pageSize"]);
    assert_eq!("invoice-3900", payload["data"]["items"][0]["id"]);
    assert_eq!("INV-3900", payload["data"]["items"][0]["invoiceNo"]);
    assert_eq!("88.25", payload["data"]["items"][0]["totalAmount"]);
}

async fn seed_invoice(pool: &SqlitePool) {
    sqlx::query(
        r#"
        INSERT INTO commerce_invoice
            (id, tenant_id, organization_id, owner_user_id, order_id, payment_id,
             title_id, status, invoice_no, invoice_code, document_url, created_at,
             issued_at, updated_at)
        VALUES
            ('invoice-3900', '100001', '0', '30', 'order-3900', 'payment-3900',
             'title-3900', 'issued', 'INV-3900', 'IC-3900',
             'https://cdn.example.test/invoice-3900.pdf', '2026-05-25T10:00:00Z',
             '2026-05-25T10:05:00Z', '2026-05-25T10:05:00Z'),
            ('invoice-other-user', '100001', '0', '31', 'order-other', 'payment-other',
             'title-other', 'issued', 'INV-OTHER', NULL,
             NULL, '2026-05-25T11:00:00Z', NULL, '2026-05-25T11:00:00Z')
        "#,
    )
    .execute(pool)
    .await
    .expect("seed commerce invoice");

    sqlx::query(
        r#"
        INSERT INTO commerce_invoice_item
            (id, tenant_id, invoice_id, order_item_id, title, amount, tax_amount, created_at)
        VALUES
            ('invoice-3900-item-1', '10', 'invoice-3900', 'order-item-3900-1',
             'LLM usage', '80.00', '8.25', '2026-05-25T10:00:00Z'),
            ('invoice-3900-item-2', '10', 'invoice-3900', 'order-item-3900-2',
             'Image usage', '8.25', '0.00', '2026-05-25T10:00:00Z'),
            ('invoice-other-user-item', '10', 'invoice-other-user', 'order-item-other',
             'Other user usage', '1.00', '0.00', '2026-05-25T11:00:00Z')
        "#,
    )
    .execute(pool)
    .await
    .expect("seed commerce invoice items");
}

fn app_session_request(
    method: &str,
    path: &str,
    body: Body,
    tenant_id: i64,
    organization_id: i64,
    user_id: i64,
) -> Request<Body> {
    let issued_at = current_unix_seconds();
    let expires_at = issued_at + 3600;
    let (authorization, access_token) = app_session_dual_token_headers(
        trusted_request_subject(tenant_id, organization_id, user_id),
        issued_at,
        expires_at,
    )
    .unwrap();
    Request::builder()
        .method(method)
        .uri(path)
        .header("authorization", authorization)
        .header("Access-Token", access_token)
        .body(body)
        .unwrap()
}

fn current_unix_seconds() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs() as i64)
        .unwrap_or(0)
}

fn unique_sqlite_url() -> String {
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_nanos();
    let sequence = DB_SEQUENCE.fetch_add(1, Ordering::Relaxed);
    let process_id = std::process::id();
    let mut path = sqlite_test_database_dir();
    std::fs::create_dir_all(&path).unwrap();
    path.push(format!(
        "app-invoices-route-{process_id}-{nonce}-{sequence}.db"
    ));
    format!("sqlite://{}", path.to_string_lossy().replace('\\', "/"))
}

fn sqlite_test_database_dir() -> std::path::PathBuf {
    std::env::var_os("CARGO_TARGET_DIR")
        .map(std::path::PathBuf::from)
        .unwrap_or_else(std::env::temp_dir)
        .join("test-dbs")
}

async fn connect_sqlite_for_test(database_url: &str) -> SqlitePool {
    let options = SqliteConnectOptions::from_str(database_url)
        .unwrap()
        .create_if_missing(true);
    SqlitePoolOptions::new()
        .max_connections(1)
        .connect_with(options)
        .await
        .unwrap()
}
