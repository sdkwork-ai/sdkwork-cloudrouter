use sdkwork_clawrouter_router_service::infrastructure::sql::postgres::PostgresPricingCatalogLoader;
use sdkwork_clawrouter_router_service::infrastructure::sql::PricingCatalogSql;
use sqlx::postgres::PgPoolOptions;

const POSTGRES_TEST_DATABASE_URL: &str = "SDKWORK_DATABASE_URL";

#[tokio::test]
async fn postgres_loader_can_be_constructed_without_connecting_for_server_deployments() {
    let pool = PgPoolOptions::new()
        .max_connections(1)
        .connect_lazy("postgres://sdkwork_ai_dev:sdkworkdev123@localhost:5432/sdkwork_ai_dev")
        .unwrap();

    let _loader = PostgresPricingCatalogLoader::new(pool);
}

#[tokio::test]
async fn postgres_loader_reads_summed_routing_config_version_as_bigint() {
    let database_url = match std::env::var(POSTGRES_TEST_DATABASE_URL) {
        Ok(value) if !value.trim().is_empty() => value,
        _ => {
            eprintln!(
                "skipping Postgres pricing catalog loader test; set {POSTGRES_TEST_DATABASE_URL} to run it"
            );
            return;
        }
    };
    let pool = PgPoolOptions::new()
        .max_connections(1)
        .connect(&database_url)
        .await
        .unwrap();
    sqlx::query(
        r#"
        CREATE TEMP TABLE ai_config_version (
            tenant_id BIGINT NOT NULL,
            organization_id BIGINT NOT NULL,
            config_scope VARCHAR(64) NOT NULL,
            config_version BIGINT NOT NULL DEFAULT 0,
            status INTEGER NOT NULL DEFAULT 1,
            deleted_at TIMESTAMPTZ
        ) ON COMMIT PRESERVE ROWS
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO ai_config_version
            (tenant_id, organization_id, config_scope, config_version, status)
        VALUES
            (10, 20, 'routing', 4, 1),
            (10, 21, 'routing', 5, 1)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    let loader = PostgresPricingCatalogLoader::new(pool.clone());
    assert_eq!(9, loader.load_routing_config_version().await.unwrap());
    pool.close().await;
}

#[tokio::test]
async fn postgres_executes_the_authoritative_upstream_account_route_query() {
    let database_url = match std::env::var(POSTGRES_TEST_DATABASE_URL) {
        Ok(value) if !value.trim().is_empty() => value,
        _ => {
            eprintln!(
                "skipping Postgres pricing catalog snapshot test; set {POSTGRES_TEST_DATABASE_URL} to run it"
            );
            return;
        }
    };
    let pool = PgPoolOptions::new()
        .max_connections(1)
        .connect(&database_url)
        .await
        .unwrap();

    for statement in [
        r#"CREATE TEMP TABLE ai_resource (
            id BIGINT PRIMARY KEY,
            tenant_id BIGINT NOT NULL,
            organization_id BIGINT NOT NULL,
            resource_code VARCHAR(128) NOT NULL,
            resource_type VARCHAR(64) NOT NULL,
            vendor_code VARCHAR(64),
            modality_code VARCHAR(64),
            api_code VARCHAR(128),
            catalog_key VARCHAR(256),
            model VARCHAR(256),
            provider_native_model VARCHAR(256),
            status INTEGER NOT NULL DEFAULT 1,
            deleted_at TIMESTAMPTZ
        )"#,
        r#"CREATE TEMP TABLE ai_resource_group (
            id BIGINT PRIMARY KEY,
            tenant_id BIGINT NOT NULL,
            organization_id BIGINT NOT NULL,
            group_code VARCHAR(128) NOT NULL,
            status INTEGER NOT NULL DEFAULT 1,
            deleted_at TIMESTAMPTZ
        )"#,
        r#"CREATE TEMP TABLE ai_resource_group_item (
            id BIGINT PRIMARY KEY,
            tenant_id BIGINT NOT NULL,
            organization_id BIGINT NOT NULL,
            resource_group_id BIGINT NOT NULL,
            resource_group_code VARCHAR(128) NOT NULL,
            resource_id BIGINT,
            resource_code VARCHAR(128),
            child_resource_group_id BIGINT,
            child_resource_group_code VARCHAR(128),
            status INTEGER NOT NULL DEFAULT 1,
            deleted_at TIMESTAMPTZ
        )"#,
    ] {
        sqlx::query(statement).execute(&pool).await.unwrap();
    }

    let rows = sqlx::query(PricingCatalogSql::load_upstream_account_routes())
        .bind(30_i64)
        .fetch_all(&pool)
        .await
        .unwrap();

    assert!(rows.is_empty());
    pool.close().await;
}
