//! Explicit bootstrap of the federated commerce database modules served by
//! the Cloud Router standalone gateway.
//!
//! Development boots the gateway with `SDKWORK_DATABASE_AUTO_MIGRATE=true` and
//! `SDKWORK_DATABASE_SEED_ON_BOOT=true` (`.env.postgres`), so every federated
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
        assert!(source.contains(".register(payment_module)"));
        assert!(source.contains(".register(order_module)"));
        assert!(source.contains(".register(membership_module)"));
        assert!(source.contains(".register(promotion_module)"));
        assert!(source.contains(".register(partner_module)"));
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
}
