//! Explicit bootstrap of the federated commerce database modules served by
//! the Cloud Router standalone gateway.
//!
//! Development boots the gateway with `SDKWORK_DATABASE_AUTO_MIGRATE=true` and
//! `SDKWORK_DATABASE_SEED_ON_BOOT=true` (`config/host/postgres.env`), so every federated
//! module is migrated and seeded at gateway boot — that is how the commercial
//! reference data (subscription plans and plan groups in `membership_plan` /
//! `membership_package_group`, payment method catalogs, promotion and partner
//! bootstrap rows) appears on `pnpm dev`. The gateway registry lives in
//! `crates/sdkwork-routes-cloudrouter-app-api/src/commerce_runtime.rs` and must
//! stay in sync with this module: same module set, same registration order
//! (payment before order, order before membership), same seed profile.
//!
//! Production keeps `SDKWORK_DATABASE_*` lifecycle switches off
//! (DATABASE_FRAMEWORK_SPEC.md §5.5, ENVIRONMENT_SPEC.md §7.1) and drives
//! lifecycle through explicit installer commands, so `cloudrouterctl
//! install|upgrade|ensure` must apply the same standard seed set itself.
//! Without this step, packaged and deployed databases (Docker entrypoint,
//! install packages, `pnpm db:init`) carry no membership plan/plan-group data.
//!
//! Every step is idempotent: baseline, migration, and seed execution are
//! recorded in the shared `ops_*` history tables, so repeated ensures only
//! apply what is missing.
//!
//! [`bootstrap_federated_storage_module`] closes the same gap for the storage
//! center: Drive's admin-storage module owns `/admin/storage/providers`, so its
//! baseline, migrations, and standard seed profile (the mainstream storage
//! provider catalog plus the Tencent Cloud COS default binding) are converged
//! here as well instead of waiting for the fail-open runtime bootstrap.

use sdkwork_cloudrouter_router_service::infrastructure::sql::installer::DEFAULT_SEED_PROFILE;
use sdkwork_database_lifecycle::RegistryLifecycleOrchestrator;
use sdkwork_database_spi::{DatabaseManifest, DatabaseModuleRegistry, LocaleTag, SeedProfile};
use sdkwork_database_sqlx::DatabasePool;

/// Bootstraps the federated commerce modules on the shared installer pool:
/// init + migrate + seed with the standard profile.
///
/// `seed_locale` comes from the canonical `SDKWORK_DATABASE_SEED_LOCALE`
/// override (or the runtime TOML `install.seed_locale`); when unset, each
/// module's own manifest default applies (zh-CN per the seed standard §8.1).
pub async fn bootstrap_federated_commerce_modules(
    pool: &DatabasePool,
    seed_locale: Option<&str>,
) -> Result<Vec<(String, usize, usize)>, String> {
    let payment_module = sdkwork_payment_database_host::database_module()
        .map_err(|error| format!("load payment database module failed: {error}"))?;
    let order_module = sdkwork_api_order_assembly::OrderAssemblyContract::database_module()
        .map_err(|error| format!("load order database module failed: {error}"))?;
    let membership_module = sdkwork_membership_database_host::database_module()
        .map_err(|error| format!("load membership database module failed: {error}"))?;
    let promotion_module = sdkwork_promotion_database_host::database_module()
        .map_err(|error| format!("load promotion database module failed: {error}"))?;
    let partner_module = sdkwork_partner_database_host::database_module()
        .map_err(|error| format!("load partner database module failed: {error}"))?;
    let merchandise_module = sdkwork_merchandise_database_host::database_module()
        .map_err(|error| format!("load merchandise database module failed: {error}"))?;
    let shop_module = sdkwork_shop_database_host::database_module()
        .map_err(|error| format!("load shop database module failed: {error}"))?;
    let inventory_module = sdkwork_inventory_database_host::database_module()
        .map_err(|error| format!("load inventory database module failed: {error}"))?;
    let registry = DatabaseModuleRegistry::builder()
        .register(payment_module)
        .map_err(|error| format!("register payment database module failed: {error}"))?
        .register(order_module)
        .map_err(|error| format!("register order database module failed: {error}"))?
        .register(membership_module)
        .map_err(|error| format!("register membership database module failed: {error}"))?
        .register(promotion_module)
        .map_err(|error| format!("register promotion database module failed: {error}"))?
        .register(partner_module)
        .map_err(|error| format!("register partner database module failed: {error}"))?
        .register(merchandise_module)
        .map_err(|error| format!("register merchandise database module failed: {error}"))?
        .register(shop_module)
        .map_err(|error| format!("register shop database module failed: {error}"))?
        .register(inventory_module)
        .map_err(|error| format!("register inventory database module failed: {error}"))?
        .build();
    let locale = match seed_locale {
        Some(locale) => LocaleTag(locale.to_owned()),
        None => LocaleTag(default_seed_locale(&registry)),
    };
    RegistryLifecycleOrchestrator::new(pool.clone(), registry)
        .with_applied_by("cloudrouterctl-commerce")
        .bootstrap_all(&locale, &SeedProfile(DEFAULT_SEED_PROFILE.to_owned()))
        .await
        .map_err(|error| format!("bootstrap federated commerce modules failed: {error}"))
}

/// Resolves the first module's declared default seed locale when no
/// `SDKWORK_DATABASE_SEED_LOCALE` override is configured.
fn default_seed_locale(registry: &DatabaseModuleRegistry) -> String {
    for module in registry.modules() {
        if let Ok(manifest) = DatabaseManifest::from_file(module.manifest_path()) {
            return manifest.lifecycle.default_seed_locale.clone();
        }
    }
    "zh-CN".to_owned()
}

/// Bootstraps the Drive storage database module on the installer pool.
///
/// The CloudRouter backend API mounts Drive's admin-storage surface
/// (`/backend/v3/api/drive/storage/*`, which owns `/admin/storage/providers`
/// and the provider/bucket data behind the storage center) through the Drive
/// API assembly. That module is a sibling of the commerce modules and is not
/// part of the CloudRouter module registry, so an explicit lifecycle command
/// has to converge it here: baseline, migrations, and the `standard` seed
/// profile — the profile that installs the storage provider catalog and the
/// Tencent Cloud COS tenant default binding
/// (`database/seeds/common/002_storage_provider_catalog.sql`).
///
/// Without this step a packaged `install`/`upgrade` leaves the provider list
/// empty until the gateway boots and the runtime storage bootstrap happens to
/// run — which is fail-open and therefore cannot make the database complete by
/// itself.
///
/// Host packages that do not stage the Drive `database/` module keep the
/// operator-managed path: there is nothing to converge, so this is a no-op.
pub async fn bootstrap_federated_storage_module(
    pool: &DatabasePool,
    seed_locale: Option<&str>,
) -> Result<Vec<(String, usize, usize)>, String> {
    let app_root = sdkwork_drive_database_host::resolve_app_root();
    if !app_root.join("database/database.manifest.json").is_file() {
        return Ok(Vec::new());
    }
    let drive_module = sdkwork_drive_database_host::database_module()?;
    let registry = DatabaseModuleRegistry::builder()
        .register(drive_module)
        .map_err(|error| format!("register drive database module failed: {error}"))?
        .build();
    let locale = match seed_locale {
        Some(locale) => LocaleTag(locale.to_owned()),
        None => LocaleTag(default_seed_locale(&registry)),
    };
    RegistryLifecycleOrchestrator::new(pool.clone(), registry)
        .with_applied_by("cloudrouterctl-drive-storage")
        .bootstrap_all(&locale, &SeedProfile(DEFAULT_SEED_PROFILE.to_owned()))
        .await
        .map_err(|error| format!("bootstrap Drive storage database module failed: {error}"))
}

/// Bootstraps the Messaging notification database module on the installer pool.
///
/// The CloudRouter backend API mounts Messaging's admin surface
/// (`/backend/v3/api/messaging/*`), which owns `/admin/notify/email` and
/// `/admin/notify/sms`. The email/SMS provider accounts, sender identities,
/// carrier signatures, per-scenario routing rules, and message templates are
/// **seed-only** reference data (`database/seeds/common/002_*`, `003_*`, and
/// `database/seeds/locales/*/001_message_templates.sql`): a schema migration
/// alone never creates them.
///
/// Production keeps `SDKWORK_DATABASE_SEED_ON_BOOT` off and Messaging's own
/// manifest also declares `seedOnBoot = false`, so nothing seeds the module at
/// boot. Without this step a packaged `install`/`upgrade` leaves both notify
/// pages empty while the installation still reports success — exactly the
/// regression this module exists to close (the Drive storage module has the
/// same shape and is converged the same way).
///
/// Host packages that do not stage the Messaging `database/` module keep the
/// operator-managed path: there is nothing to converge, so this is a no-op.
pub async fn bootstrap_federated_messaging_module(
    pool: &DatabasePool,
    seed_locale: Option<&str>,
) -> Result<Vec<(String, usize, usize)>, String> {
    let app_root = sdkwork_messaging_database_host::resolve_app_root();
    if !app_root.join("database/database.manifest.json").is_file() {
        return Ok(Vec::new());
    }
    let messaging_module = sdkwork_messaging_database_host::database_module()?;
    let registry = DatabaseModuleRegistry::builder()
        .register(messaging_module)
        .map_err(|error| format!("register messaging database module failed: {error}"))?
        .build();
    let locale = match seed_locale {
        Some(locale) => LocaleTag(locale.to_owned()),
        None => LocaleTag(default_seed_locale(&registry)),
    };
    RegistryLifecycleOrchestrator::new(pool.clone(), registry)
        .with_applied_by("cloudrouterctl-messaging")
        .bootstrap_all(&locale, &SeedProfile(DEFAULT_SEED_PROFILE.to_owned()))
        .await
        .map_err(|error| format!("bootstrap Messaging database module failed: {error}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn federated_registry_matches_gateway_commerce_registry() {
        let source = include_str!("federated.rs");

        let payment = source
            .find("sdkwork_payment_database_host::database_module()")
            .expect("payment database module registration");
        let order = source
            .find("OrderAssemblyContract::database_module()")
            .expect("order assembly database module registration");
        let membership = source
            .find("sdkwork_membership_database_host::database_module()")
            .expect("membership database module registration");
        let promotion = source
            .find("sdkwork_promotion_database_host::database_module()")
            .expect("promotion database module registration");
        let partner = source
            .find("sdkwork_partner_database_host::database_module()")
            .expect("partner database module registration");
        let merchandise = source
            .find("sdkwork_merchandise_database_host::database_module()")
            .expect("merchandise database module registration");
        let shop = source
            .find("sdkwork_shop_database_host::database_module()")
            .expect("shop database module registration");
        let inventory = source
            .find("sdkwork_inventory_database_host::database_module()")
            .expect("inventory database module registration");
        assert!(
            payment < order,
            "payment database must bootstrap before order"
        );
        assert!(
            order < membership,
            "order database must bootstrap before membership"
        );
        assert!(
            membership < promotion,
            "membership database must bootstrap before promotion"
        );
        assert!(
            promotion < partner,
            "promotion database must bootstrap before partner"
        );
        assert!(
            partner < merchandise,
            "partner database must bootstrap before merchandise"
        );
        assert!(
            merchandise < shop,
            "merchandise database must bootstrap before shop"
        );
        // Catalog owns no database module: its app root ships no `database/` assets, so the
        // lifecycle discovery reports it as an API-only dependency surface instead of a module.
        // The needle is assembled at compile time so this assertion cannot satisfy itself.
        assert!(
            !source.contains(concat!("sdkwork_", "catalog_database_host")),
            "catalog is an API-only dependency surface and must not register a database module"
        );
        assert!(
            shop < inventory,
            "shop database must bootstrap before inventory"
        );
        assert!(source.contains(".register(payment_module)"));
        assert!(source.contains(".register(order_module)"));
        assert!(source.contains(".register(membership_module)"));
        assert!(source.contains(".register(promotion_module)"));
        assert!(source.contains(".register(partner_module)"));
        assert!(source.contains(".register(merchandise_module)"));
        assert!(source.contains(".register(shop_module)"));
        assert!(source.contains(".register(inventory_module)"));
        assert!(
            source
                .contains("bootstrap_all(&locale, &SeedProfile(DEFAULT_SEED_PROFILE.to_owned()))"),
            "explicit lifecycle must always apply the standard seed profile"
        );
    }

    #[test]
    fn default_seed_locale_falls_back_to_zh_cn_without_manifests() {
        let registry = DatabaseModuleRegistry::builder().build();

        assert_eq!("zh-CN", default_seed_locale(&registry));
    }

    /// The storage center is only seeded during an explicit lifecycle command
    /// if the Drive module is registered and bootstrapped with the standard
    /// profile. A registration without `bootstrap_all` would read as coverage
    /// while never applying a seed.
    #[test]
    fn storage_module_bootstrap_registers_drive_and_applies_the_standard_seed() {
        let source = include_str!("federated.rs");
        let function = source
            .find("pub async fn bootstrap_federated_storage_module(")
            .expect("installer must converge the Drive storage module");
        let body = &source[function..];

        let registration = body
            .find("sdkwork_drive_database_host::database_module()")
            .expect("the Drive database module must be loaded for registration");
        let bootstrap_all = body
            .find(".bootstrap_all(&locale, &SeedProfile(DEFAULT_SEED_PROFILE.to_owned()))")
            .expect("the Drive module must be bootstrapped with the standard seed profile");
        assert!(
            registration < bootstrap_all,
            "the module must be registered before the registry bootstraps it"
        );
        assert!(
            body.contains(concat!("database/database.", "manifest.json")),
            "a host package without the staged Drive database module must remain a no-op"
        );
    }

    /// `/admin/notify/email` and `/admin/notify/sms` read seed-only reference
    /// data (provider accounts, sender identities, signatures, routing rules,
    /// and templates). The installer must register the Messaging module and
    /// bootstrap it with the standard profile, or a packaged install reports
    /// success with both pages empty.
    #[test]
    fn messaging_module_bootstrap_registers_the_module_and_applies_the_standard_seed() {
        let source = include_str!("federated.rs");
        let function = source
            .find("pub async fn bootstrap_federated_messaging_module(")
            .expect("installer must converge the Messaging notification module");
        let body = &source[function..];

        let registration = body
            .find("sdkwork_messaging_database_host::database_module()")
            .expect("the Messaging database module must be loaded for registration");
        let bootstrap_all = body
            .find(".bootstrap_all(&locale, &SeedProfile(DEFAULT_SEED_PROFILE.to_owned()))")
            .expect("the Messaging module must be bootstrapped with the standard seed profile");
        assert!(
            registration < bootstrap_all,
            "the module must be registered before the registry bootstraps it"
        );
        assert!(
            body.contains(concat!("database/database.", "manifest.json")),
            "a host package without the staged Messaging database module must remain a no-op"
        );
        assert!(
            body.contains(concat!(
                "\"",
                "cloudrouterctl-messaging",
                "\""
            )),
            "seed history must attribute Messaging initialization to the installer"
        );
    }

    /// End-to-end regression for the installation path: running the installer's
    /// Messaging bootstrap against an empty PostgreSQL schema must create the
    /// provider/identity/rule/template reference data, and a second run must
    /// apply nothing (checksummed seed history).
    ///
    /// Run:
    /// `SDKWORK_CLOUDROUTER_TEST_PG_URL=postgres://... \
    ///  cargo test -p sdkwork-cloudrouter-installer \
    ///  messaging_bootstrap_converges_an_empty_schema -- --ignored --nocapture`
    #[tokio::test]
    #[ignore = "requires SDKWORK_CLOUDROUTER_TEST_PG_URL and the sibling sdkwork-messaging checkout"]
    async fn messaging_bootstrap_converges_an_empty_schema() {
        use sdkwork_database_config::{DatabaseConfig, DatabaseEngine, DeploymentMode};
        use sdkwork_database_sqlx::{DatabasePool, PoolContext};
        use sqlx::postgres::PgPoolOptions;
        use sqlx::{Connection, PgConnection, Row};

        let base_url = std::env::var("SDKWORK_CLOUDROUTER_TEST_PG_URL").unwrap_or_else(|_| {
            "postgres://sdkwork_ai_dev:sdkworkdev123@127.0.0.1:5432/sdkwork_ai_dev".to_owned()
        });
        let mut admin = PgConnection::connect(&base_url)
            .await
            .expect("connect integration database");
        let schema = format!(
            "cloudrouter_messaging_init_{}_{}",
            chrono::Utc::now().timestamp_nanos_opt().unwrap_or_default(),
            std::process::id(),
        );
        sqlx::raw_sql(sqlx::AssertSqlSafe(format!("CREATE SCHEMA {schema}")))
            .execute(&mut admin)
            .await
            .expect("create throwaway schema");

        let separator = if base_url.contains('?') { '&' } else { '?' };
        let scoped_url = format!(
            "{base_url}{separator}options=-c%20search_path%3D{schema}"
        );
        let config = DatabaseConfig {
            engine: DatabaseEngine::Postgres,
            url: scoped_url,
            mode: DeploymentMode::Standalone,
            max_connections: 2,
            ..DatabaseConfig::default()
        };
        // `create_pool_from_config` normalizes the URL into the workspace
        // structured fields and drops `options`, so build the pool directly and
        // pin the throwaway schema on every connection.
        let schema_for_connect = schema.clone();
        let pg_pool = PgPoolOptions::new()
            .max_connections(2)
            .after_connect(move |connection, _metadata| {
                let statement = format!("SET search_path TO {schema_for_connect}");
                Box::pin(async move {
                    sqlx::raw_sql(sqlx::AssertSqlSafe(statement.as_str()))
                        .execute(connection)
                        .await
                        .map(|_| ())
                })
            })
            .connect(&config.url)
            .await
            .expect("connect throwaway schema");
        let pool = DatabasePool::Postgres(
            pg_pool,
            PoolContext {
                config: config.clone(),
            },
        );

        let messaging_root = std::fs::canonicalize(
            std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../../sdkwork-messaging"),
        )
        .expect("resolve the sibling sdkwork-messaging checkout");
        assert!(
            messaging_root.join("database/database.manifest.json").is_file(),
            "the sibling sdkwork-messaging checkout must stage database/ at {}",
            messaging_root.display()
        );
        // SAFETY: ignored integration tests in this binary run sequentially;
        // no other test reads this variable.
        unsafe {
            std::env::set_var("SDKWORK_MESSAGING_APP_ROOT", &messaging_root);
        }

        let applied = super::bootstrap_federated_messaging_module(&pool, Some("zh-CN"))
            .await
            .expect("bootstrap the Messaging database module");
        assert_eq!(applied.len(), 1, "one Messaging module is converged");
        let (module_id, _migrations, seeds) = &applied[0];
        assert_eq!(module_id, "messaging");
        assert_eq!(*seeds, 4, "common provider seeds plus the zh-CN template seed");

        let postgres = pool.as_postgres().expect("PostgreSQL pool");
        let row = sqlx::query(
            "SELECT \
                (SELECT COUNT(*) FROM messaging_email_account) AS email_accounts, \
                (SELECT COUNT(*) FROM messaging_email_sender) AS email_senders, \
                (SELECT COUNT(*) FROM messaging_email_send_rule) AS email_rules, \
                (SELECT COUNT(*) FROM messaging_sms_account) AS sms_accounts, \
                (SELECT COUNT(*) FROM messaging_sms_signature) AS sms_signatures, \
                (SELECT COUNT(*) FROM messaging_sms_send_rule) AS sms_rules, \
                (SELECT COUNT(*) FROM messaging_template) AS templates",
        )
        .fetch_one(postgres)
        .await
        .expect("count seeded notification data");
        assert_eq!(row.get::<i64, _>("email_accounts"), 13);
        assert_eq!(row.get::<i64, _>("email_senders"), 13);
        assert_eq!(row.get::<i64, _>("email_rules"), 4);
        assert_eq!(row.get::<i64, _>("sms_accounts"), 8);
        assert_eq!(row.get::<i64, _>("sms_signatures"), 8);
        assert_eq!(row.get::<i64, _>("sms_rules"), 4);
        assert_eq!(row.get::<i64, _>("templates"), 20);

        let default_email: String = sqlx::query_scalar(
            "SELECT provider FROM messaging_email_account WHERE enabled AND receive_enabled",
        )
        .fetch_one(postgres)
        .await
        .expect("resolve the enabled email provider");
        assert_eq!(default_email, "enterprise_mail");
        let default_sms: String =
            sqlx::query_scalar("SELECT provider FROM messaging_sms_account WHERE enabled")
                .fetch_one(postgres)
                .await
                .expect("resolve the enabled sms provider");
        assert_eq!(default_sms, "tencent");

        let second = super::bootstrap_federated_messaging_module(&pool, Some("zh-CN"))
            .await
            .expect("re-bootstrap the Messaging database module");
        assert_eq!(second.len(), 1);
        assert_eq!(
            second[0].1, 0,
            "a repeat ensure must apply no migration (checksummed history)"
        );
        assert_eq!(
            second[0].2, 0,
            "a repeat ensure must apply no seed (checksummed history)"
        );

        pool.close().await;
        sqlx::raw_sql(sqlx::AssertSqlSafe(format!("DROP SCHEMA {schema} CASCADE")))
            .execute(&mut admin)
            .await
            .expect("drop throwaway schema");
    }
}
