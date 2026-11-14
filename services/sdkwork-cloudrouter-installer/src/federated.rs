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
}
