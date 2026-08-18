//! One-off diagnostic for admin login session insert failures.

use sqlx::{PgPool, Row};

#[tokio::test]
#[ignore = "manual DB diagnostic"]
async fn debug_admin_login_database_state() {
    let url = std::env::var("SDKWORK_DATABASE_URL").unwrap_or_else(|_| {
        "postgresql://sdkwork_ai_dev:sdkworkdev123@127.0.0.1:5432/sdkwork_ai_dev?sslmode=disable"
            .to_owned()
    });
    let pool = PgPool::connect(&url)
        .await
        .expect("connect postgres");

    let user = sqlx::query("SELECT id, tenant_id FROM iam_user WHERE username = 'admin' LIMIT 1")
        .fetch_one(&pool)
        .await
        .expect("load admin user");
    let user_id: String = user.get(0);
    let tenant_id: String = user.get(1);
    eprintln!("admin user_id={user_id} tenant_id={tenant_id}");

    let memberships = sqlx::query(
        "SELECT organization_id, membership_kind, status FROM iam_organization_membership WHERE user_id = $1",
    )
    .bind(&user_id)
    .fetch_all(&pool)
    .await
    .expect("load memberships");
    for row in &memberships {
        eprintln!(
            "membership org={}:kind={}:status={}",
            row.get::<String, _>(0),
            row.get::<String, _>(1),
            row.get::<String, _>(2),
        );
    }

    let cols = sqlx::query(
        "SELECT column_name FROM information_schema.columns \
         WHERE table_schema = current_schema() AND table_name = 'iam_session' \
           AND column_name IN ('principal_kind', 'principal_id', 'login_scope') \
         ORDER BY column_name",
    )
    .fetch_all(&pool)
    .await
    .expect("load iam_session columns");
    eprintln!(
        "iam_session columns: {:?}",
        cols.iter()
            .map(|row| row.get::<String, _>(0))
            .collect::<Vec<_>>()
    );

    let app = sqlx::query(
        "SELECT app_id, status FROM iam_tenant_application \
         WHERE tenant_id = $1 AND app_id = 'sdkwork-cloudrouter'",
    )
    .bind(&tenant_id)
    .fetch_all(&pool)
    .await
    .expect("load tenant application");
    eprintln!("tenant application rows: {}", app.len());

    let signing_key = sqlx::query(
        "SELECT kid FROM iam_tenant_signing_key WHERE tenant_id = $1 LIMIT 1",
    )
    .bind(&tenant_id)
    .fetch_all(&pool)
    .await
    .expect("load signing key");
    eprintln!("signing key rows: {}", signing_key.len());

    let insert = sqlx::query(
        "INSERT INTO iam_session (id, tenant_id, organization_id, login_scope, user_id, \
         principal_kind, principal_id, app_id, environment, deployment_mode, auth_level, \
         auth_token_hash, auth_token_kid, access_token_hash, access_token_kid, \
         refresh_token_hash, refresh_token_kid, sharding_key, sharding_strategy, \
         data_scope_json, permission_scope_json, expires_at, created_at, updated_at) \
         VALUES ('debug-session', $1, '0', 'TENANT', $2, 'user', $2, 'sdkwork-cloudrouter', \
                 'dev', 'saas', 'password', 'h1', 'kid1', 'h2', 'kid1', 'h3', 'kid1', $1, \
                 'tenant', '[]'::jsonb, '[]'::jsonb, NOW()::text, NOW()::text, NOW()::text)",
    )
    .bind(&tenant_id)
    .bind(&user_id)
    .execute(&pool)
    .await;

    match insert {
        Ok(_) => {
            eprintln!("debug insert ok");
            sqlx::query("DELETE FROM iam_session WHERE id = 'debug-session'")
                .execute(&pool)
                .await
                .expect("cleanup debug session");
        }
        Err(error) => {
            panic!("debug insert failed: {error}");
        }
    }
}
