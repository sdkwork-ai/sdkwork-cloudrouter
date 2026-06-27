from __future__ import annotations

from pathlib import Path

INSTALLER = (
    Path(__file__).resolve().parents[1]
    / "services/sdkwork-clawrouter-router-service/src/infrastructure/sql/installer.rs"
)


def main() -> None:
    text = INSTALLER.read_text(encoding="utf-8")
    old = """/// Claw-router owns only generated gateway schema; sibling SoR DDL is external.
const COMPOSE_SIBLING_DATABASE_MODULES: bool = false;"""
    new = """/// Claw-router owns gateway schema; commerce SoR stays external, models catalog composes at install.
const COMPOSE_SIBLING_COMMERCE_MODULE: bool = false;
const COMPOSE_SDKWORK_MODELS_CATALOG_MODULE: bool = true;"""
    if old not in text:
        raise SystemExit("constant block not found")
    text = text.replace(old, new)

    replacements = [
        (
            "if COMPOSE_SIBLING_DATABASE_MODULES {\n                    import_sqlite_commerce_experience_seed",
            "if COMPOSE_SIBLING_COMMERCE_MODULE {\n                    import_sqlite_commerce_experience_seed",
        ),
        (
            "if COMPOSE_SIBLING_DATABASE_MODULES {\n                    import_postgres_commerce_experience_seed",
            "if COMPOSE_SIBLING_COMMERCE_MODULE {\n                    import_postgres_commerce_experience_seed",
        ),
        (
            "if COMPOSE_SIBLING_DATABASE_MODULES {\n        import_sqlite_commerce_experience_seed",
            "if COMPOSE_SIBLING_COMMERCE_MODULE {\n        import_sqlite_commerce_experience_seed",
        ),
        (
            "if COMPOSE_SIBLING_DATABASE_MODULES {\n        import_postgres_commerce_experience_seed",
            "if COMPOSE_SIBLING_COMMERCE_MODULE {\n        import_postgres_commerce_experience_seed",
        ),
        (
            "if COMPOSE_SIBLING_DATABASE_MODULES\n        && !sqlite_commerce_experience_seed_complete",
            "if COMPOSE_SIBLING_COMMERCE_MODULE\n        && !sqlite_commerce_experience_seed_complete",
        ),
        (
            "if COMPOSE_SIBLING_DATABASE_MODULES\n        && !postgres_commerce_experience_seed_complete",
            "if COMPOSE_SIBLING_COMMERCE_MODULE\n        && !postgres_commerce_experience_seed_complete",
        ),
        ("if !COMPOSE_SIBLING_DATABASE_MODULES {", "if !COMPOSE_SIBLING_COMMERCE_MODULE {"),
        (
            "if COMPOSE_SIBLING_DATABASE_MODULES {\n                    sqlite_changed |=\n                        repair_sqlite_sdkwork_models_catalog_module_index_definitions",
            "if COMPOSE_SDKWORK_MODELS_CATALOG_MODULE {\n                    sqlite_changed |=\n                        repair_sqlite_sdkwork_models_catalog_module_index_definitions",
        ),
        (
            "if COMPOSE_SIBLING_DATABASE_MODULES {\n                    if !sqlite_sdkwork_models_catalog_module_schema_tables_exist",
            "if COMPOSE_SDKWORK_MODELS_CATALOG_MODULE {\n                    if !sqlite_sdkwork_models_catalog_module_schema_tables_exist",
        ),
        (
            "if COMPOSE_SIBLING_DATABASE_MODULES {\n                    if !postgres_sdkwork_models_catalog_module_schema_tables_exist",
            "if COMPOSE_SDKWORK_MODELS_CATALOG_MODULE {\n                    if !postgres_sdkwork_models_catalog_module_schema_tables_exist",
        ),
        (
            "if COMPOSE_SIBLING_DATABASE_MODULES {\n                    if !postgres_appbase_commerce_schema_tables_exist",
            "if COMPOSE_SIBLING_COMMERCE_MODULE {\n                    if !postgres_appbase_commerce_schema_tables_exist",
        ),
        (
            "if COMPOSE_SIBLING_DATABASE_MODULES {\n                    ensure_sqlite_bootstrap_admin_recharge_catalog",
            "if COMPOSE_SIBLING_COMMERCE_MODULE {\n                    ensure_sqlite_bootstrap_admin_recharge_catalog",
        ),
        (
            "if COMPOSE_SIBLING_DATABASE_MODULES {\n                    ensure_postgres_bootstrap_admin_recharge_catalog",
            "if COMPOSE_SIBLING_COMMERCE_MODULE {\n                    ensure_postgres_bootstrap_admin_recharge_catalog",
        ),
        (
            "if COMPOSE_SIBLING_DATABASE_MODULES {\n        if !sqlite_appbase_commerce_schema_tables_exist",
            "if COMPOSE_SIBLING_COMMERCE_MODULE {\n        if !sqlite_appbase_commerce_schema_tables_exist",
        ),
        (
            "if COMPOSE_SIBLING_DATABASE_MODULES {\n        if !postgres_appbase_commerce_schema_tables_exist",
            "if COMPOSE_SIBLING_COMMERCE_MODULE {\n        if !postgres_appbase_commerce_schema_tables_exist",
        ),
        (
            "if COMPOSE_SIBLING_DATABASE_MODULES {\n        if !sqlite_sdkwork_models_catalog_complete",
            "if COMPOSE_SDKWORK_MODELS_CATALOG_MODULE {\n        if !sqlite_sdkwork_models_catalog_complete",
        ),
        (
            "if COMPOSE_SIBLING_DATABASE_MODULES {\n        if !postgres_sdkwork_models_catalog_complete",
            "if COMPOSE_SDKWORK_MODELS_CATALOG_MODULE {\n        if !postgres_sdkwork_models_catalog_complete",
        ),
        (
            "if COMPOSE_SIBLING_DATABASE_MODULES {\n        if !sqlite_sdkwork_models_catalog_module_schema_tables_exist",
            "if COMPOSE_SDKWORK_MODELS_CATALOG_MODULE {\n        if !sqlite_sdkwork_models_catalog_module_schema_tables_exist",
        ),
        (
            "if COMPOSE_SIBLING_DATABASE_MODULES {\n        if !postgres_sdkwork_models_catalog_module_schema_tables_exist",
            "if COMPOSE_SDKWORK_MODELS_CATALOG_MODULE {\n        if !postgres_sdkwork_models_catalog_module_schema_tables_exist",
        ),
        (
            """if COMPOSE_SIBLING_DATABASE_MODULES {
        apply_sqlite_appbase_commerce_schema(pool).await?;
        apply_sqlite_sdkwork_models_catalog_module_schema(pool).await?;
    }""",
            """if COMPOSE_SIBLING_COMMERCE_MODULE {
        apply_sqlite_appbase_commerce_schema(pool).await?;
    }
    if COMPOSE_SDKWORK_MODELS_CATALOG_MODULE {
        apply_sqlite_sdkwork_models_catalog_module_schema(pool).await?;
    }""",
        ),
        (
            """if COMPOSE_SIBLING_DATABASE_MODULES {
        apply_postgres_appbase_commerce_schema(pool).await?;
        apply_postgres_sdkwork_models_catalog_module_schema(pool).await?;
    }""",
            """if COMPOSE_SIBLING_COMMERCE_MODULE {
        apply_postgres_appbase_commerce_schema(pool).await?;
    }
    if COMPOSE_SDKWORK_MODELS_CATALOG_MODULE {
        apply_postgres_sdkwork_models_catalog_module_schema(pool).await?;
    }""",
        ),
        (
            "if COMPOSE_SIBLING_DATABASE_MODULES {\n        record_sqlite_migration_started(\n            pool,\n            \"catalog\",",
            "if COMPOSE_SDKWORK_MODELS_CATALOG_MODULE {\n        record_sqlite_migration_started(\n            pool,\n            \"catalog\",",
        ),
        (
            "if COMPOSE_SIBLING_DATABASE_MODULES {\n        record_postgres_migration_started(\n            pool,\n            \"catalog\",",
            "if COMPOSE_SDKWORK_MODELS_CATALOG_MODULE {\n        record_postgres_migration_started(\n            pool,\n            \"catalog\",",
        ),
        (
            "if COMPOSE_SIBLING_DATABASE_MODULES {\n        let spec = catalog_completeness_spec(&catalog);",
            "if COMPOSE_SDKWORK_MODELS_CATALOG_MODULE {\n        let spec = catalog_completeness_spec(&catalog);",
        ),
        (
            "if COMPOSE_SIBLING_DATABASE_MODULES {\n        let commerce_payload = commerce_experience_seed_manifest().payload_json;",
            "if COMPOSE_SIBLING_COMMERCE_MODULE {\n        let commerce_payload = commerce_experience_seed_manifest().payload_json;",
        ),
        (
            "if COMPOSE_SIBLING_DATABASE_MODULES {\n        if !postgres_commerce_experience_seed_complete(pool).await? {",
            "if COMPOSE_SIBLING_COMMERCE_MODULE {\n        if !postgres_commerce_experience_seed_complete(pool).await? {",
        ),
        (
            "if COMPOSE_SIBLING_DATABASE_MODULES {\n        ensure_sqlite_bootstrap_admin_recharge_catalog(pool).await?;",
            "if COMPOSE_SIBLING_COMMERCE_MODULE {\n        ensure_sqlite_bootstrap_admin_recharge_catalog(pool).await?;",
        ),
        (
            "if COMPOSE_SIBLING_DATABASE_MODULES {\n        ensure_postgres_bootstrap_admin_recharge_catalog(pool).await?;",
            "if COMPOSE_SIBLING_COMMERCE_MODULE {\n        ensure_postgres_bootstrap_admin_recharge_catalog(pool).await?;",
        ),
    ]
    for old_value, new_value in replacements:
        text = text.replace(old_value, new_value)

    combined_blocks = [
        (
            """if COMPOSE_SIBLING_DATABASE_MODULES {
        if !sqlite_appbase_commerce_schema_tables_exist(pool).await?
            || !sqlite_appbase_commerce_schema_indexes_exist(pool).await?
        {
            apply_sqlite_appbase_commerce_schema(pool).await?;
        }
        if !sqlite_sdkwork_models_catalog_module_schema_tables_exist(pool).await?
            || !sqlite_sdkwork_models_catalog_module_schema_indexes_exist(pool).await?
        {
            apply_sqlite_sdkwork_models_catalog_module_schema(pool).await?;
        }
    }""",
            """if COMPOSE_SIBLING_COMMERCE_MODULE {
        if !sqlite_appbase_commerce_schema_tables_exist(pool).await?
            || !sqlite_appbase_commerce_schema_indexes_exist(pool).await?
        {
            apply_sqlite_appbase_commerce_schema(pool).await?;
        }
    }
    if COMPOSE_SDKWORK_MODELS_CATALOG_MODULE {
        if !sqlite_sdkwork_models_catalog_module_schema_tables_exist(pool).await?
            || !sqlite_sdkwork_models_catalog_module_schema_indexes_exist(pool).await?
        {
            apply_sqlite_sdkwork_models_catalog_module_schema(pool).await?;
        }
    }""",
        ),
        (
            """if COMPOSE_SIBLING_DATABASE_MODULES {
        if !postgres_appbase_commerce_schema_tables_exist(pool).await?
            || !postgres_appbase_commerce_schema_columns_exist(pool).await?
            || !postgres_appbase_commerce_schema_indexes_exist(pool).await?
        {
            apply_postgres_appbase_commerce_schema(pool).await?;
        }
        if !postgres_sdkwork_models_catalog_module_schema_tables_exist(pool).await?
            || !postgres_sdkwork_models_catalog_module_schema_indexes_exist(pool).await?
        {
            apply_postgres_sdkwork_models_catalog_module_schema(pool).await?;
        }
    }""",
            """if COMPOSE_SIBLING_COMMERCE_MODULE {
        if !postgres_appbase_commerce_schema_tables_exist(pool).await?
            || !postgres_appbase_commerce_schema_columns_exist(pool).await?
            || !postgres_appbase_commerce_schema_indexes_exist(pool).await?
        {
            apply_postgres_appbase_commerce_schema(pool).await?;
        }
    }
    if COMPOSE_SDKWORK_MODELS_CATALOG_MODULE {
        if !postgres_sdkwork_models_catalog_module_schema_tables_exist(pool).await?
            || !postgres_sdkwork_models_catalog_module_schema_indexes_exist(pool).await?
        {
            apply_postgres_sdkwork_models_catalog_module_schema(pool).await?;
        }
    }""",
        ),
    ]
    for old_value, new_value in combined_blocks:
        text = text.replace(old_value, new_value)

    gateway_replacements = [
        (
            """if !sqlite_gateway_routing_dictionary_schema_tables_exist(pool).await? {
                    apply_sqlite_gateway_routing_dictionary_schema(pool).await?;
                    sqlite_changed = true;
                }""",
            """if !COMPOSE_SDKWORK_MODELS_CATALOG_MODULE
                    && !sqlite_gateway_routing_dictionary_schema_tables_exist(pool).await?
                {
                    apply_sqlite_gateway_routing_dictionary_schema(pool).await?;
                    sqlite_changed = true;
                }""",
        ),
        (
            """if !postgres_gateway_routing_dictionary_schema_tables_exist(pool).await? {
                    apply_postgres_gateway_routing_dictionary_schema(pool).await?;
                    changed = true;
                }""",
            """if !COMPOSE_SDKWORK_MODELS_CATALOG_MODULE
                    && !postgres_gateway_routing_dictionary_schema_tables_exist(pool).await?
                {
                    apply_postgres_gateway_routing_dictionary_schema(pool).await?;
                    changed = true;
                }""",
        ),
        (
            """if !sqlite_gateway_routing_dictionary_schema_tables_exist(pool).await? {
        return Ok(InstallationStatus::UpgradeRequired);
    }""",
            """if !COMPOSE_SDKWORK_MODELS_CATALOG_MODULE
        && !sqlite_gateway_routing_dictionary_schema_tables_exist(pool).await?
    {
        return Ok(InstallationStatus::UpgradeRequired);
    }""",
        ),
        (
            """if !postgres_gateway_routing_dictionary_schema_tables_exist(pool).await? {
        return Ok(InstallationStatus::UpgradeRequired);
    }""",
            """if !COMPOSE_SDKWORK_MODELS_CATALOG_MODULE
        && !postgres_gateway_routing_dictionary_schema_tables_exist(pool).await?
    {
        return Ok(InstallationStatus::UpgradeRequired);
    }""",
        ),
        (
            "apply_sqlite_gateway_routing_dictionary_schema(pool).await?;\n    if COMPOSE_SIBLING_COMMERCE_MODULE {",
            "if !COMPOSE_SDKWORK_MODELS_CATALOG_MODULE {\n        apply_sqlite_gateway_routing_dictionary_schema(pool).await?;\n    }\n    if COMPOSE_SIBLING_COMMERCE_MODULE {",
        ),
        (
            "apply_postgres_gateway_routing_dictionary_schema(pool).await?;\n    if COMPOSE_SIBLING_COMMERCE_MODULE {",
            "if !COMPOSE_SDKWORK_MODELS_CATALOG_MODULE {\n        apply_postgres_gateway_routing_dictionary_schema(pool).await?;\n    }\n    if COMPOSE_SIBLING_COMMERCE_MODULE {",
        ),
        (
            """if !sqlite_gateway_routing_dictionary_schema_tables_exist(pool).await? {
        apply_sqlite_gateway_routing_dictionary_schema(pool).await?;
    }""",
            """if !COMPOSE_SDKWORK_MODELS_CATALOG_MODULE
        && !sqlite_gateway_routing_dictionary_schema_tables_exist(pool).await?
    {
        apply_sqlite_gateway_routing_dictionary_schema(pool).await?;
    }""",
        ),
    ]
    for old_value, new_value in gateway_replacements:
        text = text.replace(old_value, new_value)

    remaining = text.count("COMPOSE_SIBLING_DATABASE_MODULES")
    if remaining:
        raise SystemExit(f"unresolved COMPOSE_SIBLING_DATABASE_MODULES occurrences: {remaining}")

    INSTALLER.write_text(text, encoding="utf-8")
    print("installer compose flags patched")


if __name__ == "__main__":
    main()
