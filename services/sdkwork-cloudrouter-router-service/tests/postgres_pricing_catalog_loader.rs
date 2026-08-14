use sdkwork_cloudrouter_router_service::infrastructure::sql::postgres::PostgresPricingCatalogLoader;
use sdkwork_cloudrouter_router_service::infrastructure::sql::PricingCatalogSql;
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
async fn postgres_loader_reads_routing_config_version_fingerprint() {
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
    let version = loader.load_routing_config_version().await.unwrap();
    // The routing config version is an md5 fingerprint over the catalog
    // low-frequency tables, not a summed counter; only its shape is asserted.
    assert_eq!(32, version.len());
    assert!(version.chars().all(|ch| ch.is_ascii_hexdigit()));
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
    sqlx::query("SET search_path TO pg_temp")
        .execute(&pool)
        .await
        .unwrap();

    for statement in [
        r#"CREATE TEMP TABLE ai_resource (
            id BIGINT PRIMARY KEY,
            api_code TEXT,
            catalog_key TEXT,
            deleted_at TIMESTAMPTZ,
            modality_code TEXT,
            model TEXT,
            organization_id BIGINT NOT NULL DEFAULT 0,
            provider_native_model TEXT,
            resource_code TEXT,
            resource_type TEXT,
            status INTEGER,
            tenant_id BIGINT,
            vendor_code TEXT
)"#,
        r#"CREATE TEMP TABLE ai_resource_group (
            id BIGINT PRIMARY KEY,
            definition_organization_id BIGINT,
            definition_tenant_id BIGINT,
            deleted_at TIMESTAMPTZ,
            group_code TEXT,
            organization_id BIGINT NOT NULL DEFAULT 0,
            resource_group_id BIGINT,
            scope_organization_id BIGINT,
            scope_tenant_id BIGINT,
            status INTEGER,
            tenant_id BIGINT
)"#,
        r#"CREATE TEMP TABLE ai_upstream_account_resource (
            id BIGINT PRIMARY KEY,
            account_id BIGINT,
            deleted_at TIMESTAMPTZ,
            effective_from TIMESTAMPTZ,
            effective_to TIMESTAMPTZ,
            grant_type TEXT,
            organization_id BIGINT NOT NULL DEFAULT 0,
            resource_code TEXT,
            resource_group_code TEXT,
            resource_group_id BIGINT,
            resource_id BIGINT,
            status INTEGER,
            tenant_id BIGINT
)"#,
        r#"CREATE TEMP TABLE ai_upstream_supplier_resource (
            id BIGINT PRIMARY KEY,
            api_code TEXT,
            catalog_key TEXT,
            deleted_at TIMESTAMPTZ,
            effective_from TIMESTAMPTZ,
            effective_to TIMESTAMPTZ,
            grant_type TEXT,
            modality_code TEXT,
            model TEXT,
            organization_id BIGINT NOT NULL DEFAULT 0,
            provider_native_model TEXT,
            resource_code TEXT,
            resource_group_code TEXT,
            resource_group_id BIGINT,
            resource_id BIGINT,
            resource_type TEXT,
            status INTEGER,
            supplier_id BIGINT,
            tenant_id BIGINT,
            vendor_code TEXT
)"#,
        r#"CREATE TEMP TABLE ai_upstream_supplier (
            id BIGINT PRIMARY KEY,
            default_base_url TEXT,
            deleted_at TIMESTAMPTZ,
            organization_id BIGINT NOT NULL DEFAULT 0,
            status INTEGER,
            supplier_code TEXT,
            tenant_id BIGINT
)"#,
        r#"CREATE TEMP TABLE ai_upstream_account (
            account_code TEXT,
            auth_method_code TEXT,
            contract_cost_multiplier NUMERIC(38, 12),
            credential_rotation_strategy TEXT,
            preferred_endpoint_id BIGINT,
            region_code TEXT,
            retry_policy TEXT,
            supplier_code TEXT,
            timeout_ms INTEGER,
            id BIGINT PRIMARY KEY,
            deleted_at TIMESTAMPTZ,
            organization_id BIGINT NOT NULL DEFAULT 0,
            status INTEGER,
            supplier_id BIGINT,
            tenant_id BIGINT
)"#,
        r#"CREATE TEMP TABLE ai_upstream_account_health_state (
            last_latency_ms INTEGER,
            updated_at TIMESTAMPTZ,
            id BIGINT PRIMARY KEY,
            account_id BIGINT,
            health_status INTEGER,
            organization_id BIGINT NOT NULL DEFAULT 0,
            tenant_id BIGINT
)"#,
        r#"CREATE TEMP TABLE ai_upstream_supplier_endpoint (
            id BIGINT PRIMARY KEY,
            base_url TEXT,
            deleted_at TIMESTAMPTZ,
            endpoint_code TEXT,
            organization_id BIGINT NOT NULL DEFAULT 0,
            priority INTEGER,
            routing_weight INTEGER,
            status INTEGER,
            supplier_id BIGINT,
            tenant_id BIGINT,
            timeout_ms INTEGER
)"#,
        r#"CREATE TEMP TABLE ai_upstream_supplier_endpoint_health_state (
            id BIGINT PRIMARY KEY,
            endpoint_id BIGINT,
            health_status INTEGER,
            organization_id BIGINT NOT NULL DEFAULT 0,
            tenant_id BIGINT,
            updated_at TIMESTAMPTZ
)"#,
        r#"CREATE TEMP TABLE ai_upstream_account_credential (
            account_id BIGINT,
            credential_version INTEGER,
            expires_at TIMESTAMPTZ,
            is_active BOOLEAN,
            priority INTEGER,
            secret_ciphertext TEXT,
            secret_key_id TEXT,
            id BIGINT PRIMARY KEY,
            deleted_at TIMESTAMPTZ,
            organization_id BIGINT NOT NULL DEFAULT 0,
            status INTEGER,
            tenant_id BIGINT
)"#,
        r#"CREATE TEMP TABLE ai_upstream_account_group_member (
            id BIGINT PRIMARY KEY,
            account_group_id BIGINT,
            account_id BIGINT,
            cost_multiplier_override NUMERIC(38, 12),
            deleted_at TIMESTAMPTZ,
            effective_from TIMESTAMPTZ,
            effective_to TIMESTAMPTZ,
            enabled BOOLEAN,
            organization_id BIGINT NOT NULL DEFAULT 0,
            priority INTEGER,
            routing_weight INTEGER,
            status INTEGER,
            tenant_id BIGINT
)"#,
        r#"CREATE TEMP TABLE ai_upstream_account_group_resource (
            id BIGINT PRIMARY KEY,
            account_group_id BIGINT,
            api_code TEXT,
            catalog_key TEXT,
            deleted_at TIMESTAMPTZ,
            effective_from TIMESTAMPTZ,
            effective_to TIMESTAMPTZ,
            grant_type TEXT,
            modality_code TEXT,
            model TEXT,
            organization_id BIGINT NOT NULL DEFAULT 0,
            provider_native_model TEXT,
            resource_code TEXT,
            resource_group_code TEXT,
            resource_group_id BIGINT,
            resource_id BIGINT,
            resource_type TEXT,
            status INTEGER,
            tenant_id BIGINT,
            vendor_code TEXT
)"#,
        r#"CREATE TEMP TABLE ai_upstream_supplier_auth_method (
            auth_method_code TEXT,
            runtime_auth_config TEXT,
            id BIGINT PRIMARY KEY,
            tenant_id BIGINT,
            organization_id BIGINT NOT NULL DEFAULT 0,
            supplier_id BIGINT,
            auth_type TEXT,
            status INTEGER,
            deleted_at TIMESTAMPTZ
)"#,
        r#"CREATE TEMP TABLE ai_resource_group_item (
            id BIGINT PRIMARY KEY,
            child_resource_group_code TEXT,
            child_resource_group_id BIGINT,
            deleted_at TIMESTAMPTZ,
            organization_id BIGINT NOT NULL DEFAULT 0,
            resource_code TEXT,
            resource_group_code TEXT,
            resource_group_id BIGINT,
            resource_id BIGINT,
            status INTEGER,
            tenant_id BIGINT
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
