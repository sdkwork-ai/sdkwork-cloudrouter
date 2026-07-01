import json
import re
import unittest
from pathlib import Path

try:
    import yaml
except ImportError:  # pragma: no cover
    yaml = None

from tools.schema_registry_loader import load_schema_registry, render_schema_registry


ROOT = Path(__file__).resolve().parents[1]
_SDKWORK_MODELS_MOUNT = ROOT / "data" / "sdkwork-models"
SDKWORK_MODELS_ROOT = (
    _SDKWORK_MODELS_MOUNT
    if _SDKWORK_MODELS_MOUNT.is_dir()
    else ROOT.parent / "sdkwork-models"
)
MODELS_CATALOG_BASELINE_PATH = (
    SDKWORK_MODELS_ROOT
    / "database"
    / "ddl"
    / "baseline"
    / "postgres"
    / "0001_sdkwork-models_baseline.sql"
)
MODELS_CATALOG_SERVICE_API_DIR = (
    SDKWORK_MODELS_ROOT / "crates" / "sdkwork-models-catalog-service" / "src" / "api"
)
MODELS_CATALOG_DOMAIN_PATH = (
    SDKWORK_MODELS_ROOT
    / "crates"
    / "sdkwork-models-catalog-service"
    / "src"
    / "domain"
    / "catalog.rs"
)
REGISTRY_PATH = ROOT / "docs" / "schema-registry" / "sdkwork-clawrouter.tables.yaml"
GENERATED_SCHEMA_PATH = ROOT / "generated" / "schema" / "postgres" / "schema.sql"
BACKEND_OPENAPI_PATH = ROOT / "generated" / "openapi" / "clawrouter-backend-openapi.json"
APP_OPENAPI_PATH = ROOT / "generated" / "openapi" / "clawrouter-app-openapi.json"
SCHEMA_COMPONENTS_PATH = ROOT / "generated" / "openapi" / "schema-components.yaml"
API_MANIFEST_PATH = ROOT / "generated" / "api" / "api-contract-manifest.json"
RUST_DOMAIN_PATH = ROOT / "generated" / "types" / "rust" / "domain.rs"
JAVA_BILLING_METER_PATH = ROOT / "generated" / "types" / "java" / "com" / "sdkwork" / "claw" / "router" / "domain" / "enums" / "BillingMeter.java"
TS_DOMAIN_PATH = ROOT / "generated" / "types" / "typescript" / "domain-types.ts"
RUST_TEST_SUPPORT_PATH = ROOT / "crates" / "sdkwork-claw-test-support" / "src" / "lib.rs"
RUST_INSTALLER_PATH = ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "infrastructure" / "sql" / "installer.rs"
RUST_INSTALLER_CLI_PATH = ROOT / "services" / "sdkwork-claw-installer" / "src" / "main.rs"
AI_CHANNEL_ROUTE_CONTRACT_PATHS = (
    ROOT / "docs" / "schema-registry" / "frontend-field-contracts" / "models" / "admin-channel.yaml",
    ROOT / "docs" / "schema-registry" / "frontend-field-contracts" / "models" / "admin-group.yaml",
    ROOT / "docs" / "schema-registry" / "frontend-field-contracts" / "models" / "console-api-keys.yaml",
    ROOT / "docs" / "schema-registry" / "frontend-field-contracts" / "operations" / "app-ai.yaml",
    ROOT / "docs" / "schema-registry" / "frontend-field-contracts" / "operations" / "app-iam.yaml",
    ROOT / "docs" / "schema-registry" / "frontend-field-contracts" / "operations" / "backend-ai.yaml",
    ROOT / "docs" / "schema-registry" / "frontend-field-contracts" / "operations" / "backend-integration.yaml",
    ROOT / "docs" / "schema-registry" / "frontend-route-classification.yaml",
    ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "infrastructure" / "sql" / "queries" / "snapshot.rs",
    ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "infrastructure" / "sql" / "queries" / "lookup.rs",
    ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "infrastructure" / "sql" / "sqlite" / "queries.rs",
    ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "infrastructure" / "sql" / "postgres" / "app_routing_read_store.rs",
    ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "infrastructure" / "sql" / "sqlite" / "app_routing_read_store.rs",
    ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "infrastructure" / "sql" / "postgres" / "admin_channel_group_store.rs",
    ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "infrastructure" / "sql" / "sqlite" / "admin_channel_group_store.rs",
    ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "infrastructure" / "sql" / "postgres" / "admin_channel_store.rs",
    ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "infrastructure" / "sql" / "sqlite" / "admin_channel_store.rs",
    SDKWORK_MODELS_ROOT
    / "crates"
    / "sdkwork-models-catalog-repository-sqlx"
    / "src"
    / "postgres"
    / "admin_ai_resource_store.rs",
    SDKWORK_MODELS_ROOT
    / "crates"
    / "sdkwork-models-catalog-repository-sqlx"
    / "src"
    / "sqlite"
    / "admin_ai_resource_store.rs",
)
AI_CHANNEL_ROUTE_REQUIRED_TABLES = (
    "ai_provider",
    "ai_channel",
    "ai_channel_resource",
    "ai_channel_group",
    "ai_channel_group_member",
    "ai_channel_group_resource",
    "ai_channel_group_metric_snapshot",
    "ai_resource",
    "ai_resource_group",
    "ai_resource_group_item",
)
OBSOLETE_ROUTER_TABLES = {
    "ai_channel_vendor",
    "ai_rate_limit_bucket",
    "ai_resource_route_profile",
    "ai_route_idempotency",
    "ai_site_model",
    "ai_route_candidate",
    "ai_usage_service_provider_chain",
    "commerce_usage_service_provider_settlement",
    "commerce_usage_service_provider_statement_item",
    "integration_service_provider_account_binding",
    "integration_service_provider_contract_version",
    "integration_service_provider_price_change_request",
}
RUNTIME_MODEL_IDENTITY_FIXTURE_PATHS = (
    ROOT / "services" / "sdkwork-clawrouter-router-service" / "tests" / "openai_chat_adapter_api.rs",
    ROOT / "services" / "sdkwork-clawrouter-router-service" / "tests" / "openai_embeddings_adapter_api.rs",
    ROOT / "services" / "sdkwork-clawrouter-router-service" / "tests" / "openai_responses_adapter_api.rs",
    ROOT / "services" / "sdkwork-clawrouter-router-service" / "tests" / "sqlite_admin_channel_group_store.rs",
    ROOT / "services" / "sdkwork-clawrouter-router-service" / "tests" / "sqlite_openai_invocation_telemetry.rs",
    ROOT / "services" / "sdkwork-clawrouter-cloud-gateway" / "src" / "runtime.rs",
    ROOT / "services" / "sdkwork-clawrouter-cloud-gateway" / "src" / "invocation_http.rs",
)
PORTAL_RUNTIME_MODEL_IDENTITY_FIXTURE_PATHS = (
    ROOT / "apps" / "sdkwork-clawrouter-pc" / "admin-channel-runtime.test.ts",
    ROOT / "apps" / "sdkwork-clawrouter-pc" / "admin-group-runtime.test.ts",
    ROOT / "apps" / "sdkwork-clawrouter-pc" / "admin-operations-runtime.test.ts",
    ROOT / "apps" / "sdkwork-clawrouter-pc" / "models-runtime.test.ts",
    ROOT / "apps" / "sdkwork-clawrouter-pc" / "playground-chat-runtime.test.ts",
    ROOT / "apps" / "sdkwork-clawrouter-pc" / "rankings-runtime.test.ts",
    ROOT / "apps" / "sdkwork-clawrouter-pc" / "admin-model-runtime.test.ts",
    ROOT / "apps" / "sdkwork-clawrouter-pc" / "console-app-runtime.test.ts",
)
API_GATEWAY_MODEL_IDENTITY_FIXTURE_PATHS = (
    ROOT / "services" / "sdkwork-clawrouter-admin-api-server" / "tests" / "database_config_router.rs",
    ROOT / "services" / "sdkwork-clawrouter-app-api-server" / "tests" / "contract_routes.rs",
    ROOT / "services" / "sdkwork-clawrouter-cloud-gateway" / "tests" / "provider_passthrough_route.rs",
    ROOT / "services" / "sdkwork-clawrouter-cloud-gateway" / "tests" / "edge_server_sqlite_smoke.rs",
)
AI_CHANNEL_ROUTE_RUNTIME_ROOTS = (
    ROOT / "services" / "sdkwork-clawrouter-router-service" / "src",
    ROOT / "services" / "sdkwork-clawrouter-cloud-gateway" / "src",
    ROOT / "services" / "sdkwork-clawrouter-app-api-server" / "src",
)
SERVER_RESOURCES = ROOT.parents[1] / "spring-ai-plus-server-application" / "src" / "main" / "resources"
POSTGRES_MIGRATION_DIR = SERVER_RESOURCES / "database" / "postgresql"
DATA_DIR = SERVER_RESOURCES / "data"
BOOTSTRAP_DIR = DATA_DIR / "bootstrap"
FRONTEND_GENERATED_DIR = ROOT / "generated" / "schema" / "frontend"

SYSTEM_TABLES = {
    "system_installation_state",
    "system_schema_migration",
}

SCHEMA_REGISTRY_REQUIRED_TABLE_PREFIXES = (
    "ai_",
    "analytics_",
    "commerce_",
    "content_",
    "iam_",
    "integration_",
    "ops_",
    "plus_",
    "product_",
    "system_",
)

CANONICAL_TABLES = {
    "ai_provider",
    "ai_channel",
    "ai_channel_resource",
    "ai_channel_group",
    "ai_channel_group_member",
    "ai_channel_group_resource",
    "ai_channel_group_metric_snapshot",
    "ai_model_vendor",
    "ai_modality",
    "ai_api_endpoint",
    "ai_vendor_modality",
    "ai_vendor_api_endpoint",
    "ai_modality_api_endpoint",
    "ai_model_family",
    "ai_model",
    "ai_model_capability",
    "ai_model_modality",
    "ai_model_api_endpoint",
    "ai_resource",
    "ai_resource_group",
    "ai_resource_group_item",
    "ai_model_catalog_source",
    "ai_model_catalog_sync_run",
    "ai_billing_meter",
    "ai_model_pricing",
    "ai_pricing_plan",
    "ai_pricing_plan_binding",
    "ai_pricing_rule",
    "ai_pricing_tier",
    "ai_pricing_import_snapshot",
    "ai_model_rank_snapshot",
}

MODELS_CATALOG_TABLES = frozenset(
    {
        "ai_model_vendor",
        "ai_modality",
        "ai_api_endpoint",
        "ai_vendor_modality",
        "ai_vendor_api_endpoint",
        "ai_modality_api_endpoint",
        "ai_model_modality",
        "ai_model_api_endpoint",
        "ai_resource",
        "ai_resource_group",
        "ai_resource_group_item",
        "ai_model_family",
        "ai_model",
        "ai_model_capability",
        "ai_model_catalog_source",
        "ai_model_catalog_sync_run",
        "ai_billing_meter",
        "ai_model_pricing",
        "ai_model_rank_snapshot",
    }
)
CLAWROUTER_GENERATED_CANONICAL_TABLES = frozenset(CANONICAL_TABLES - MODELS_CATALOG_TABLES)

CANONICAL_TABLE_PROFILES = {
    "ai_provider": "tenant_entity",
    "ai_channel": "tenant_entity",
    "ai_channel_resource": "tenant_entity",
    "ai_channel_group": "tenant_entity",
    "ai_channel_group_member": "tenant_entity",
    "ai_channel_group_resource": "tenant_entity",
    "ai_channel_group_metric_snapshot": "projection",
    "ai_model_vendor": "tenant_entity",
    "ai_modality": "tenant_entity",
    "ai_api_endpoint": "tenant_entity",
    "ai_vendor_modality": "tenant_entity",
    "ai_vendor_api_endpoint": "tenant_entity",
    "ai_modality_api_endpoint": "tenant_entity",
    "ai_model_family": "tenant_entity",
    "ai_model": "tenant_entity",
    "ai_model_capability": "tenant_entity",
    "ai_model_modality": "tenant_entity",
    "ai_model_api_endpoint": "tenant_entity",
    "ai_resource": "tenant_entity",
    "ai_resource_group": "tenant_entity",
    "ai_resource_group_item": "tenant_entity",
    "ai_model_catalog_source": "tenant_entity",
    "ai_model_catalog_sync_run": "event_log",
    "ai_billing_meter": "tenant_entity",
    "ai_model_pricing": "tenant_entity",
    "ai_pricing_plan": "tenant_entity",
    "ai_pricing_plan_binding": "tenant_entity",
    "ai_pricing_rule": "tenant_entity",
    "ai_pricing_tier": "tenant_entity",
    "ai_pricing_import_snapshot": "event_log",
    "ai_model_rank_snapshot": "projection",
}

FINANCIAL_TABLES = {
    "ai_model_pricing",
    "ai_pricing_plan",
    "ai_pricing_plan_binding",
    "ai_pricing_rule",
    "ai_pricing_tier",
}

REQUIRED_PROFILE_COLUMNS = {
    "tenant_entity": {
        "id",
        "uuid",
        "tenant_id",
        "organization_id",
        "data_scope",
        "status",
        "created_at",
        "updated_at",
        "version",
        "deleted_at",
        "deleted_by",
        "metadata",
    },
    "event_log": {
        "id",
        "uuid",
        "tenant_id",
        "organization_id",
        "request_id",
        "trace_id",
        "payload_hash",
        "status",
        "created_at",
        "retention_until",
        "legal_hold",
        "metadata",
    },
    "projection": {
        "id",
        "uuid",
        "tenant_id",
        "organization_id",
        "source_type",
        "source_id",
        "source_version",
        "status",
        "created_at",
        "updated_at",
        "rebuild_version",
        "metadata",
    },
}

BASE_DATABASE_SPEC_COLUMNS = {
    "id",
    "uuid",
    "tenant_id",
    "organization_id",
    "status",
    "created_at",
    "metadata",
}

REQUIRED_BILLING_METERS = {
    "llm_input_token",
    "llm_output_token",
    "llm_reasoning_token",
    "llm_cache_write_token",
    "llm_cache_read_token",
    "llm_cache_storage_token_hour",
    "embedding_input_token",
    "embedding_image",
    "image_input_token",
    "image_output_token",
    "image_result",
    "image_pixel",
    "image_megapixel",
    "audio_input_second",
    "audio_output_second",
    "audio_input_minute",
    "audio_output_minute",
    "tts_input_character",
    "speech_character",
    "stt_audio_minute",
    "video_input_second",
    "video_output_second",
    "video_result",
    "music_output_second",
    "sfx_result",
    "rerank_search",
    "rerank_document",
    "api_request",
    "api_result",
    "api_item",
    "tool_call",
    "web_search_call",
    "file_search_call",
    "code_interpreter_session",
    "container_session",
    "storage_gb_day",
    "bandwidth_gb",
    "unknown",
}

FORBIDDEN_MODEL_VENDOR_CODES = {
    "alibaba_qwen",
    "alibaba_qwen_cn",
    "alibaba_cn",
    "baidu_cn",
    "baidu_qianfan",
    "baidu_qianfan_cn",
    "bytedance_cn",
    "bytedance_global",
    "bytedance_seed",
    "bytedance_seed_global",
    "bytedance_volcengine_cn",
    "cohere",
    "deepseek_cn",
    "deepseek_global",
    "kuaishou_cn",
    "kuaishou_global",
    "kuaishou_kling",
    "kuaishou_kling_global",
    "meta",
    "minimax_cn",
    "minimax_global",
    "mistral",
    "moonshot_cn",
    "moonshot_global",
    "open_source",
    "tencent_cn",
    "tencent_hunyuan",
    "tencent_hunyuan_cn",
    "zero_one_ai",
    "zhipu_cn",
    "zhipu_bigmodel",
    "zhipu_bigmodel_cn",
}

REQUIRED_MODEL_VENDOR_CODES = {
    "alibaba",
    "anthropic",
    "baidu",
    "black_forest_labs",
    "bytedance",
    "deepseek",
    "elevenlabs",
    "google",
    "kuaishou",
    "minimax",
    "moonshot",
    "openai",
    "stability_ai",
    "suno",
    "tencent",
    "xai",
    "zhipu",
    "custom",
    "unknown",
}

REQUIRED_MODEL_REGION_CODES = {
    "global",
    "cn",
}

LEGACY_MODEL_PATTERNS = (
    "plus_ai_model_info",
    "plus_ai_model_price",
    "plus_ai_model_availability",
    "plus_ai_model_compliance_profile",
    "plus_ai_model_price_metric",
    "plus_ai_model_taxonomy",
    "plus_ai_model_taxonomy_rel",
    "plus_ai_tenant_model_policy",
    "PlusAiModelInfo",
    "PlusAiModelPrice",
    "PlusAiModelAvailability",
    "PlusAiModelComplianceProfile",
    "PlusAiModelPriceMetric",
    "PlusAiModelTaxonomy",
    "PlusAiTenantModelPolicy",
)

LEGACY_GATEWAY_MODEL_TABLE = "ai_gateway_model"
LEGACY_GATEWAY_MODEL_TYPE_PATTERNS = (
    "GatewayModel",
    "AiGatewayModel",
    "AdminGatewayModel",
    "ai-gateway-model",
    "admin-gateway-model",
)


def read_text(path: Path) -> str:
    data = path.read_bytes()
    try:
        return data.decode("utf-8")
    except UnicodeDecodeError:
        return data.decode("utf-8", errors="replace")


def read_source(path: Path) -> str:
    return read_text(path).replace("\r\n", "\n")


def models_catalog_baseline_sql() -> str:
    if not MODELS_CATALOG_BASELINE_PATH.is_file():
        raise unittest.SkipTest(
            f"missing sdkwork-models catalog baseline: {MODELS_CATALOG_BASELINE_PATH}"
        )
    return read_text(MODELS_CATALOG_BASELINE_PATH)


def runtime_install_schema_sql() -> str:
    return read_text(GENERATED_SCHEMA_PATH) + "\n\n" + models_catalog_baseline_sql()


def schema_sql_for_table(table: str) -> str:
    if table in MODELS_CATALOG_TABLES:
        return models_catalog_baseline_sql()
    return read_text(GENERATED_SCHEMA_PATH)


def assert_canonical_table_contract(test_case: unittest.TestCase, sql: str, table: str) -> None:
    block = create_table_block(sql, table)
    test_case.assertTrue(block, f"{table} table must exist in generated schema")
    for column in REQUIRED_PROFILE_COLUMNS[CANONICAL_TABLE_PROFILES[table]]:
        test_case.assertRegex(block, rf"\b{column}\b", f"{table} missing common column {column}")
    test_case.assertRegex(block, r"\buuid\s+VARCHAR\(64\)\s+NOT NULL\b")
    test_case.assertRegex(block, r"\btenant_id\s+BIGINT\s+NOT NULL\s+DEFAULT 0\b")
    test_case.assertRegex(block, r"\borganization_id\s+BIGINT\s+NOT NULL\s+DEFAULT 0\b")


def load_registry() -> dict:
    if yaml is None:
        raise RuntimeError("PyYAML is required for schema registry tests")
    return load_schema_registry(REGISTRY_PATH)


def load_generated_openapi(path: Path) -> dict:
    return json.loads(read_text(path))


def migration_text() -> str:
    return "\n".join(read_text(path) for path in sorted(POSTGRES_MIGRATION_DIR.glob("V*.sql")))


def create_table_block(sql: str, table: str) -> str:
    match = re.search(
        rf"CREATE TABLE IF NOT EXISTS\s+{re.escape(table)}\s*\((.*?)\);\s*",
        sql,
        flags=re.IGNORECASE | re.DOTALL,
    )
    if not match:
        return ""
    return match.group(1)


class ModelCatalogStandardContractTest(unittest.TestCase):
    def test_registry_no_longer_declares_legacy_model_catalog_tables(self) -> None:
        registry = load_registry()
        registry_text = render_schema_registry(REGISTRY_PATH)

        for legacy in LEGACY_MODEL_PATTERNS:
            self.assertNotIn(legacy, registry_text)

        tables = {item["table"] for item in registry.get("tables", []) if isinstance(item, dict)}
        self.assertTrue(CANONICAL_TABLES.issubset(tables))
        self.assertNotIn(
            "ai_model_vendor_region",
            tables,
            "V2 model identity must not keep vendor-region as a model-catalog table",
        )

    def test_frontend_route_classification_does_not_use_vendor_region_table(self) -> None:
        classification_path = ROOT / "docs" / "schema-registry" / "frontend-route-classification.yaml"
        classification = yaml.safe_load(read_text(classification_path)) or {}
        stale_routes = [
            route.get("route")
            for route in classification.get("routes", [])
            if isinstance(route, dict)
            and "ai_model_vendor_region" in route.get("required_tables", [])
        ]

        self.assertEqual(
            [],
            stale_routes,
            "Frontend routes must depend on canonical vendor/model capability tables; "
            "region belongs to pricing, catalog source, and provider endpoint context.",
        )

    def test_canonical_tables_follow_database_spec_common_contract(self) -> None:
        registry = load_registry()
        tables = {
            item["table"]: item
            for item in registry.get("tables", [])
            if isinstance(item, dict) and item.get("table") in CANONICAL_TABLES
        }

        self.assertEqual(CANONICAL_TABLES, set(tables))
        for table_name, table in tables.items():
            with self.subTest(table=table_name):
                self.assertEqual("ai", table.get("domain"))
                self.assertIn(table.get("compliance_level"), {"L2", "L3"})
                if table_name in FINANCIAL_TABLES:
                    self.assertEqual("L3", table.get("compliance_level"))
                    self.assertTrue(table.get("security", {}).get("financial"))
                    self.assertTrue(table.get("security", {}).get("decimal_only"))
                self.assertEqual(CANONICAL_TABLE_PROFILES[table_name], table.get("common_columns"))

                unique_constraints = table.get("unique_constraints", [])
                uuid_unique = any(
                    isinstance(item, dict) and item.get("columns") == ["uuid"]
                    for item in unique_constraints
                )
                indexes = table.get("indexes", [])
                uuid_index_unique = any(
                    isinstance(item, dict)
                    and item.get("unique") is True
                    and item.get("columns") == ["uuid"]
                    for item in indexes
                )
                self.assertTrue(uuid_unique or uuid_index_unique, f"{table_name} must declare a unique uuid constraint")

                not_null_columns = set(table.get("not_null_columns", []))
                self.assertIn("uuid", not_null_columns)
                self.assertIn("tenant_id", not_null_columns)
                self.assertIn("organization_id", not_null_columns)
                self.assertIn("status", not_null_columns)

                if table_name == "ai_pricing_import_snapshot":
                    required_prefixes = (["tenant_id", "organization_id", "status"], ["tenant_id", "organization_id", "request_id"])
                elif table_name == "ai_model_catalog_sync_run":
                    required_prefixes = (["tenant_id", "organization_id", "status"], ["tenant_id", "organization_id", "source_code"])
                elif table_name == "ai_model_rank_snapshot":
                    required_prefixes = (["tenant_id", "organization_id", "status"], ["tenant_id", "organization_id", "source_type"])
                else:
                    required_prefixes = (["tenant_id", "organization_id", "status"],)
                tenant_leading_index = any(
                    isinstance(item, dict)
                    and any(item.get("columns", [])[:len(prefix)] == prefix for prefix in required_prefixes)
                    for item in indexes
                )
                self.assertTrue(tenant_leading_index, f"{table_name} must have a tenant-leading index")

    def test_catalog_refresh_tables_have_idempotent_source_and_run_audit_contract(self) -> None:
        registry = load_registry()
        tables = {
            item["table"]: item
            for item in registry.get("tables", [])
            if isinstance(item, dict)
        }

        source = tables.get("ai_model_catalog_source")
        self.assertIsNotNone(source)
        source_columns = set(source.get("columns", {}))
        for column in (
            "source_code",
            "vendor_code",
            "provider_code",
            "source_name",
            "source_url",
            "source_kind",
            "trust_level",
            "parser_kind",
            "refresh_interval_seconds",
            "last_observed_at",
            "last_success_at",
            "catalog_version",
            "source_hash",
        ):
            self.assertIn(column, source_columns)
        self.assertIn(
            {"name": "uk_ai_model_catalog_source_tenant_code", "columns": ["tenant_id", "organization_id", "source_code"]},
            [
                {"name": item.get("name"), "columns": item.get("columns")}
                for item in source.get("unique_constraints", [])
                if isinstance(item, dict)
            ],
        )

        sync_run = tables.get("ai_model_catalog_sync_run")
        self.assertIsNotNone(sync_run)
        sync_run_columns = set(sync_run.get("columns", {}))
        for column in (
            "source_type",
            "source_id",
            "source_version",
            "source_code",
            "vendor_code",
            "provider_code",
            "run_status",
            "started_at",
            "finished_at",
            "observed_at",
            "catalog_version",
            "source_hash",
            "observed_model_count",
            "accepted_count",
            "rejected_count",
            "change_summary",
        ):
            self.assertIn(column, sync_run_columns)

        generated_schema = models_catalog_baseline_sql()
        for table in ("ai_model_catalog_source", "ai_model_catalog_sync_run"):
            self.assertIn(f"CREATE TABLE IF NOT EXISTS {table}", generated_schema)
            self.assertIn(f"CREATE UNIQUE INDEX IF NOT EXISTS uk_{table}_uuid", generated_schema)

    def test_generated_postgres_schema_uses_database_spec_columns_and_decimal_precision(self) -> None:
        for table in CLAWROUTER_GENERATED_CANONICAL_TABLES:
            with self.subTest(table=table, owner="claw-router"):
                assert_canonical_table_contract(self, read_text(GENERATED_SCHEMA_PATH), table)

        for table in MODELS_CATALOG_TABLES:
            with self.subTest(table=table, owner="sdkwork-models"):
                assert_canonical_table_contract(self, models_catalog_baseline_sql(), table)

        pricing_block = create_table_block(models_catalog_baseline_sql(), "ai_model_pricing")
        forbidden_float = re.compile(r"\b(DOUBLE\s+PRECISION|REAL|FLOAT)\b", re.IGNORECASE)
        self.assertIsNone(forbidden_float.search(pricing_block))
        for column in (
            "unit_size",
            "minimum_quantity",
            "quantity_step",
            "included_quantity",
            "unit_price",
            "min_charge_amount",
            "reference_multiplier",
            "markup_amount",
        ):
            self.assertRegex(pricing_block, rf"\b{column}\s+NUMERIC\(38,\s*12\)")

        usage_fact_block = create_table_block(read_text(GENERATED_SCHEMA_PATH), "ai_usage_fact")
        self.assertTrue(usage_fact_block, "ai_usage_fact table must exist in generated schema")
        for column in (
            "currency",
            "pricing_id",
            "pricing_plan_id",
            "pricing_plan_code",
            "pricing_rule_id",
            "pricing_tier_id",
            "pricing_snapshot",
            "reasoning_effort",
            "occurred_at",
            "settlement_status",
            "settlement_id",
        ):
            self.assertRegex(
                usage_fact_block,
                rf"\b{column}\b",
                f"ai_usage_fact missing pricing/settlement column {column}",
            )

    def test_installer_runtime_schema_uses_only_canonical_model_catalog_tables(self) -> None:
        claw_schema = read_text(GENERATED_SCHEMA_PATH)
        runtime_schema = runtime_install_schema_sql()

        for table in CLAWROUTER_GENERATED_CANONICAL_TABLES:
            self.assertRegex(claw_schema, rf"CREATE TABLE IF NOT EXISTS\s+{re.escape(table)}\b")

        for table in MODELS_CATALOG_TABLES:
            self.assertNotRegex(
                claw_schema,
                rf"CREATE TABLE IF NOT EXISTS\s+{re.escape(table)}\b",
                f"{table} is owned by sdkwork-models and must not be generated in claw-router schema.sql",
            )
            self.assertRegex(runtime_schema, rf"CREATE TABLE IF NOT EXISTS\s+{re.escape(table)}\b")

        for legacy in LEGACY_MODEL_PATTERNS:
            self.assertNotIn(legacy, runtime_schema)

        for table in CANONICAL_TABLES:
            with self.subTest(table=table):
                block = create_table_block(runtime_schema, table)
                self.assertTrue(block, f"{table} must be in runtime migration")
                for column in BASE_DATABASE_SPEC_COLUMNS:
                    self.assertRegex(block, rf"\b{column}\b", f"{table} missing database spec column {column}")
                self.assertRegex(block, r"\buuid\s+VARCHAR\(64\)\s+NOT NULL\b")
                self.assertRegex(block, r"\btenant_id\s+BIGINT\s+NOT NULL\s+DEFAULT 0\b")
                self.assertRegex(block, r"\borganization_id\s+BIGINT\s+NOT NULL\s+DEFAULT 0\b")

    def test_generated_openapi_and_manifest_do_not_expose_legacy_model_catalog_components(self) -> None:
        paths = [
            BACKEND_OPENAPI_PATH,
            APP_OPENAPI_PATH,
            SCHEMA_COMPONENTS_PATH,
            API_MANIFEST_PATH,
            ROOT / "sdks" / "clawrouter-app-sdk" / "clawrouter-app-sdk-typescript" / "src" / "types" / "index.ts",
            ROOT / "sdks" / "clawrouter-backend-sdk" / "clawrouter-backend-sdk-typescript" / "src" / "types" / "index.ts",
            ROOT / "sdks" / "clawrouter-app-sdk" / "clawrouter-app-sdk-rust" / "generated" / "server-openapi" / "src" / "models" / "mod.rs",
            ROOT / "sdks" / "clawrouter-backend-sdk" / "clawrouter-backend-sdk-rust" / "generated" / "server-openapi" / "src" / "models" / "mod.rs",
            ROOT
            / "sdks"
            / "clawrouter-app-sdk"
            / "clawrouter-app-sdk-python"
            / "generated"
            / "server-openapi"
            / "sdkwork_clawrouter_app_sdk"
            / "models"
            / "__init__.py",
            ROOT
            / "sdks"
            / "clawrouter-backend-sdk"
            / "clawrouter-backend-sdk-python"
            / "generated"
            / "server-openapi"
            / "sdkwork_clawrouter_backend_sdk"
            / "models"
            / "__init__.py",
        ]

        for path in paths:
            text = read_text(path)
            for legacy in LEGACY_MODEL_PATTERNS:
                self.assertNotIn(legacy, text, f"{legacy} leaked into {path}")
            for legacy in LEGACY_GATEWAY_MODEL_TYPE_PATTERNS:
                self.assertNotIn(legacy, text, f"{legacy} leaked into {path}")
            self.assertNotIn("AiModelVendorRegionRecord", text, f"legacy vendor-region model leaked into {path}")
            self.assertNotIn("ai_model_vendor_region", text, f"legacy vendor-region table leaked into {path}")

        self.assertIsNotNone(yaml, "PyYAML is required to inspect generated schema components")
        schema_components = yaml.safe_load(read_text(SCHEMA_COMPONENTS_PATH)) or {}
        source_schemas = schema_components.get("components", {}).get("schemas", {})
        self.assertIn("AiModelRecord", source_schemas)
        self.assertIn("AiModelPricingRecord", source_schemas)
        self.assertNotIn("PlusAiModelInfoRecord", source_schemas)
        self.assertNotIn("PlusAiModelPriceRecord", source_schemas)

        backend_spec = load_generated_openapi(BACKEND_OPENAPI_PATH)
        app_spec = load_generated_openapi(APP_OPENAPI_PATH)
        for spec in (backend_spec, app_spec):
            schemas = spec.get("components", {}).get("schemas", {})
            self.assertNotIn("AiModelRecord", schemas)
            self.assertNotIn("AiModelPricingRecord", schemas)
            self.assertNotIn("PlusAiModelInfoRecord", schemas)
            self.assertNotIn("PlusAiModelPriceRecord", schemas)

    def test_generated_frontend_contracts_and_bootstrap_do_not_reference_gateway_model_table(self) -> None:
        paths = [
            *(FRONTEND_GENERATED_DIR.glob("*.json")),
            *(BOOTSTRAP_DIR.glob("*.json")),
        ]

        for path in paths:
            text = read_text(path)
            self.assertNotIn(LEGACY_GATEWAY_MODEL_TABLE, text, f"{LEGACY_GATEWAY_MODEL_TABLE} leaked into {path}")
            self.assertNotIn("/data/model/model_info.json", text, f"legacy model seed leaked into {path}")
            self.assertNotIn("/data/model/model_price.json", text, f"legacy model pricing seed leaked into {path}")
            self.assertNotIn("MODEL_CHANNEL_KEYS", text, f"legacy model verification leaked into {path}")
            self.assertNotIn("MODEL_PRICE_RULE_KEYS", text, f"legacy model price verification leaked into {path}")

    def test_rust_runtime_uses_ai_model_domain_name_not_gateway_model(self) -> None:
        source_roots = [
            ROOT / "services",
            ROOT / "crates",
        ]
        paths = [
            path
            for source_root in source_roots
            for path in source_root.rglob("*.rs")
            if "target" not in path.parts
        ]

        for path in paths:
            text = read_text(path)
            self.assertNotIn("GatewayModel", text, f"legacy GatewayModel domain name leaked into {path}")
            self.assertNotIn("GatewayModelRow", text, f"legacy GatewayModelRow SQL row name leaked into {path}")

    def test_runtime_sources_do_not_write_legacy_vendor_region_table(self) -> None:
        source_roots = [
            ROOT / "services",
            ROOT / "crates",
        ]
        paths = [
            path
            for source_root in source_roots
            for path in source_root.rglob("*.rs")
            if "target" not in path.parts
        ]

        for path in paths:
            text = read_text(path)
            self.assertNotIn("ai_model_vendor_region", text, f"legacy vendor-region table leaked into {path}")

    def test_ai_channel_route_contracts_use_canonical_channel_resource_tables(self) -> None:
        for path in AI_CHANNEL_ROUTE_CONTRACT_PATHS:
            with self.subTest(path=path.relative_to(ROOT)):
                self.assertTrue(path.is_file(), f"AI channel route contract path is missing: {path}")
                text = read_text(path)
                self.assertRegex(
                    text,
                    r"\b(?:ai_channel|ai_channel_group|ai_resource|ai_channel_resource)\b",
                    f"{path.relative_to(ROOT)} must reference canonical AI channel/resource route tables.",
                )

    def test_obsolete_router_tables_are_removed_from_schema_contract_and_runtime(self) -> None:
        registry = load_registry()
        tables = {item["table"] for item in registry.get("tables", []) if isinstance(item, dict)}
        generated_schema = read_text(GENERATED_SCHEMA_PATH)
        effective_schema = read_text(
            ROOT / "generated" / "schema" / "registry" / "sdkwork-clawrouter.tables.effective.yaml"
        )
        frontend_contract = read_text(ROOT / "docs" / "schema-registry" / "frontend-field-contracts.yaml")

        for table_name in OBSOLETE_ROUTER_TABLES:
            with self.subTest(table=table_name):
                self.assertNotIn(table_name, tables)
                self.assertNotRegex(
                    generated_schema,
                    rf"CREATE TABLE IF NOT EXISTS\s+{re.escape(table_name)}\b",
                )
                self.assertNotIn(table_name, effective_schema)
                self.assertNotIn(table_name, frontend_contract)

        runtime_roots = (
            ROOT / "services" / "sdkwork-clawrouter-router-service" / "src",
            ROOT / "crates" / "sdkwork-claw-test-support" / "src",
        )
        for root in runtime_roots:
            for path in root.rglob("*.rs"):
                if "target" in path.parts:
                    continue
                text = read_text(path)
                for table_name in OBSOLETE_ROUTER_TABLES:
                    with self.subTest(path=path.relative_to(ROOT), table=table_name):
                        self.assertNotIn(
                            table_name,
                            text,
                            f"{table_name} must not be recreated in runtime schema, SQL, or fixtures.",
                        )

    def test_ai_channel_route_runtime_uses_channel_route_vocabulary(self) -> None:
        forbidden_fragments = (
            "account" + "_pool",
            "Account" + "Pool",
        )
        paths = [
            path
            for root in AI_CHANNEL_ROUTE_RUNTIME_ROOTS
            for path in root.rglob("*.rs")
            if "target" not in path.parts
        ]
        for path in paths:
            text = read_text(path)
            for fragment in forbidden_fragments:
                self.assertNotIn(
                    fragment,
                    text,
                    f"{fragment} leaked into {path.relative_to(ROOT)}; "
                    "AI channel routing must use channel route/group/resource vocabulary.",
                )

    def test_catalog_importers_do_not_use_region_in_model_identity_uuids(self) -> None:
        importer_paths = (
            ROOT
            / "services"
            / "sdkwork-clawrouter-router-service"
            / "src"
            / "infrastructure"
            / "sql"
            / "sqlite"
            / "model_catalog_import.rs",
            ROOT
            / "services"
            / "sdkwork-clawrouter-router-service"
            / "src"
            / "infrastructure"
            / "sql"
            / "postgres"
            / "model_catalog_import.rs",
        )
        for path in importer_paths:
            source = read_text(path)
            for uuid_prefix in ("sdk-model", "sdk-cap"):
                self.assertIsNone(
                    re.search(
                        rf"stable_uuid\(\s*\"{uuid_prefix}\"\s*,\s*&\[[^\]]*region_code",
                        source,
                        re.DOTALL,
                    ),
                    f"{uuid_prefix} identity UUID in {path.relative_to(ROOT)} must be vendor/model based; "
                    "region belongs to pricing, ranking, and provider endpoint resources.",
                )

    def test_postgres_catalog_importer_casts_decimal_string_parameters(self) -> None:
        source = read_text(
            ROOT
            / "services"
            / "sdkwork-clawrouter-router-service"
            / "src"
            / "infrastructure"
            / "sql"
            / "postgres"
            / "model_catalog_import.rs"
        )

        for fragment in (
            "CAST($11 AS NUMERIC)",
            "$31::jsonb",
            "CAST($32 AS NUMERIC)",
            "CAST($17 AS NUMERIC)",
            "CAST($18 AS NUMERIC)",
            "CAST($19 AS NUMERIC)",
            "CAST($20 AS NUMERIC)",
            "$25::timestamptz",
            "$26::timestamptz",
            "$7::date",
            "CAST($24 AS NUMERIC)",
            "CAST($25 AS NUMERIC)",
        ):
            self.assertIn(
                fragment,
                source,
                "PostgreSQL catalog import binds sdkwork-models decimal values as strings; "
                "numeric target columns must cast parameters explicitly.",
            )

    def test_postgres_seed_assets_cast_text_backed_typed_parameters(self) -> None:
        product_sql_dir = (
            ROOT
            / "services"
            / "sdkwork-clawrouter-router-service"
            / "src"
            / "infrastructure"
            / "sql"
        )
        seed_sources: list[Path] = [
            product_sql_dir / "app_seed.rs",
            product_sql_dir / "skills_seed.rs",
        ]
        existing_sources = [path for path in seed_sources if path.is_file()]
        if not existing_sources:
            self.skipTest("legacy app/skills seed SQL modules were removed from claw-router")

        for path in existing_sources:
            source = read_source(path)
            for fragment in (
                "duration_seconds = CAST($16 AS NUMERIC)",
                "published_at = $19::timestamptz",
                "CAST($22 AS NUMERIC)",
                "$25::timestamptz",
            ):
                self.assertIn(
                    fragment,
                    source,
                    "PostgreSQL seed asset imports bind JSON-backed duration/published values as text; "
                    "typed target columns must cast parameters explicitly.",
                )
        app_seed_path = product_sql_dir / "app_seed.rs"
        if app_seed_path.is_file():
            self.assertIn(
                "duration_seconds = CAST($20 AS NUMERIC)",
                read_source(app_seed_path),
            )
        for path in existing_sources:
            source = read_source(path)
            for fragment in (
                "$23::timestamptz",
                "$24::timestamptz",
            ):
                self.assertIn(
                    fragment,
                    source,
                    "PostgreSQL seed artifact imports bind published/deprecated timestamps as text; "
                    "typed target columns must cast parameters explicitly.",
                )
        for path in existing_sources:
            source = read_source(path)
            for fragment in (
                "$22::timestamptz",
                "$35::timestamptz",
                "CAST($41 AS NUMERIC)",
                "CAST($44 AS NUMERIC)",
                "$50::timestamptz",
            ):
                if path.name != "skills_seed.rs":
                    continue
                self.assertIn(
                    fragment,
                    source,
                    "PostgreSQL skill seed imports bind numeric/timestamp values as text; "
                    "typed target columns must cast parameters explicitly.",
                )

    def test_postgres_commerce_product_category_writes_integer_primary_flag(self) -> None:
        product_sql_dir = (
            ROOT
            / "services"
            / "sdkwork-clawrouter-router-service"
            / "src"
            / "infrastructure"
            / "sql"
        )
        installer_source = read_text(product_sql_dir / "installer.rs")
        admin_catalog_source = read_text(
            product_sql_dir / "postgres" / "admin_catalog_store.rs"
        )

        self.assertIn(
            "'commerce-recharge', 1, 0, 'active'",
            installer_source,
            "PostgreSQL commerce bootstrap must write integer primary_flag values.",
        )
        self.assertNotIn(
            "'commerce-recharge', TRUE, 0, 'active'",
            installer_source,
        )
        self.assertIn(
            ".bind(if index == 0 { 1 } else { 0 })",
            admin_catalog_source,
            "PostgreSQL product category writes must bind integer primary_flag values.",
        )
        self.assertNotIn(".bind(index == 0)", admin_catalog_source)

    def test_studio_catalog_seed_tables_index_tenant_scoped_uuid(self) -> None:
        studio_registry_path = ROOT / "docs" / "schema-registry" / "tables" / "020-studio.yaml"
        if not studio_registry_path.is_file():
            self.skipTest("studio catalog tables are not registered in claw-router schema registry")

        schema_sql = read_text(GENERATED_SCHEMA_PATH)
        studio_registry = read_text(studio_registry_path)

        for table in ("asset", "artifact"):
            index_name = f"uk_studio_catalog_{table}_uuid"
            index_sql = (
                f"CREATE UNIQUE INDEX IF NOT EXISTS {index_name} "
                f"ON studio_catalog_{table} (tenant_id, organization_id, uuid);"
            )
            self.assertIn(
                index_sql,
                schema_sql,
                "Studio seed repair updates rows by tenant, organization, and uuid; "
                "PostgreSQL initialization must not scan the whole seed table per row.",
            )
            self.assertIn(f"- name: {index_name}", studio_registry)

    def test_project_docs_use_canonical_ai_model_name(self) -> None:
        paths = [
            path
            for path in (ROOT / "docs").rglob("*.md")
            if path.is_file()
        ]

        for path in paths:
            text = read_text(path)
            for legacy in ("ai_gateway_model", "gateway_model", "GatewayModel", "plus_ai_model"):
                self.assertNotIn(legacy, text, f"{legacy} leaked into {path}")

    def test_project_docs_do_not_show_regional_catalog_key_query_examples(self) -> None:
        query_api_pattern = re.compile(
            r"\b(?:findModel|getModelPrices|getBestReferencePrice|find_model|get_model_prices|model_prices)"
            r"\([^;\n]*[\"'](?:[a-z0-9_-]+)/(?:global|cn|cn-north-1|us-east-1|eastus)/",
        )
        offenders = []
        for path in (ROOT / "docs").rglob("*.md"):
            if not path.is_file():
                continue
            text = read_text(path)
            for match in query_api_pattern.finditer(text):
                line_no = text.count("\n", 0, match.start()) + 1
                line = text.splitlines()[line_no - 1].strip()
                offenders.append(f"{path.relative_to(ROOT)}:{line_no}: {line}")

        self.assertEqual(
            [],
            offenders,
            "SDK query examples must use vendor/model catalog keys. "
            "Region belongs to deployment endpoint, pricing, and ranking filters.",
        )

    def test_project_docs_do_not_document_removed_router_tables(self) -> None:
        offenders = []
        for path in (ROOT / "docs").rglob("*.md"):
            if not path.is_file():
                continue
            text = read_text(path)
            for legacy in (*sorted(OBSOLETE_ROUTER_TABLES), "ai_channel_model", "ai_channel_endpoint", "ChannelEndpointTemplate"):
                for match in re.finditer(re.escape(legacy), text):
                    line_no = text.count("\n", 0, match.start()) + 1
                    line = text.splitlines()[line_no - 1].strip()
                    offenders.append(f"{path.relative_to(ROOT)}:{line_no}: {line}")

        self.assertEqual(
            [],
            offenders,
            "Project docs must describe canonical resource/provider-edge router tables, "
            "not removed router tables.",
        )

    def test_frontend_route_classification_required_tables_exist_in_registry(self) -> None:
        if yaml is None:
            self.skipTest("PyYAML is required to parse frontend route classification")

        registry = load_schema_registry(REGISTRY_PATH)
        known_tables = {table["table"] for table in registry["tables"]}
        classification_path = ROOT / "docs" / "schema-registry" / "frontend-route-classification.yaml"
        classification = yaml.safe_load(read_text(classification_path)) or {}

        offenders = []
        for route in classification.get("routes", []):
            if route.get("dependency_owned"):
                continue
            route_id = route.get("route") or route.get("route_id") or "<unknown>"
            for table_name in route.get("required_tables", []) or []:
                if (
                    table_name.startswith(SCHEMA_REGISTRY_REQUIRED_TABLE_PREFIXES)
                    and table_name not in known_tables
                ):
                    offenders.append(f"{route_id}: {table_name}")

        self.assertEqual(
            [],
            offenders,
            "Frontend route classification required_tables must reference tables "
            "declared in the schema registry.",
        )

    def test_billing_meter_domain_types_cover_multimodal_industry_pricing(self) -> None:
        sources = {
            "java": read_text(JAVA_BILLING_METER_PATH),
            "rust": read_text(RUST_DOMAIN_PATH),
            "typescript": read_text(TS_DOMAIN_PATH),
        }

        for source_name, source in sources.items():
            with self.subTest(source=source_name):
                for meter in REQUIRED_BILLING_METERS:
                    self.assertIn(meter, source)

    def test_model_vendor_domain_types_use_unique_vendor_identity_not_region_or_product_aliases(self) -> None:
        registry = load_registry()
        values = registry["domain_names"]["model_vendor"]["builtin_values"]
        vendor_codes = {
            item.get("code")
            for item in values
            if isinstance(item, dict)
        }

        self.assertTrue(REQUIRED_MODEL_VENDOR_CODES.issubset(vendor_codes))
        self.assertTrue(FORBIDDEN_MODEL_VENDOR_CODES.isdisjoint(vendor_codes))

        generated_sources = {
            "rust": {
                f'"{match}"'
                for match in re.findall(r'"([a-z][a-z0-9_]+)"', read_text(RUST_DOMAIN_PATH))
            },
            "typescript": {
                f'"{match}"'
                for match in re.findall(r'"([a-z][a-z0-9_]+)"', read_text(TS_DOMAIN_PATH))
            },
            "openapi": {
                match
                for match in re.findall(
                    r"^\s+-\s+([a-z][a-z0-9_]+)\s*$",
                    read_text(ROOT / "generated" / "types" / "openapi" / "domain-types.yaml"),
                    flags=re.MULTILINE,
                )
            },
        }
        for source_name, tokens in generated_sources.items():
            with self.subTest(source=source_name):
                for vendor_code in REQUIRED_MODEL_VENDOR_CODES:
                    expected = f'"{vendor_code}"' if source_name in {"rust", "typescript"} else vendor_code
                    self.assertIn(expected, tokens)
                for vendor_code in FORBIDDEN_MODEL_VENDOR_CODES:
                    forbidden = f'"{vendor_code}"' if source_name in {"rust", "typescript"} else vendor_code
                    self.assertNotIn(forbidden, tokens)

    def test_model_catalog_uses_vendor_model_identity_and_region_only_for_supply_context(self) -> None:
        registry = load_registry()
        tables = {item["table"]: item for item in registry.get("tables", []) if isinstance(item, dict)}
        ai_model = tables["ai_model"]
        ai_model_pricing = tables["ai_model_pricing"]
        ai_model_rank_snapshot = tables["ai_model_rank_snapshot"]
        ai_model_family = tables["ai_model_family"]

        ai_model_capability = tables["ai_model_capability"]
        self.assertNotIn("ai_model_vendor_region", tables)
        for table in (ai_model_family, ai_model, ai_model_capability):
            with self.subTest(table=table["table"]):
                self.assertNotIn("region_code", table.get("columns", {}))
                self.assertNotIn("region_code", table.get("required_columns", []))
                self.assertNotIn("region_code", table.get("not_null_columns", []))

        self.assertEqual(
            ["tenant_id", "organization_id", "vendor_code", "family_code"],
            next(
                item.get("columns")
                for item in ai_model_family.get("unique_constraints", [])
                if item.get("name") == "uk_ai_model_family_tenant_vendor_code"
            ),
        )
        self.assertEqual(
            ["tenant_id", "organization_id", "catalog_key"],
            next(
                item.get("columns")
                for item in ai_model.get("unique_constraints", [])
                if item.get("name") == "uk_ai_model_tenant_catalog_key"
            ),
        )

        self.assertIn("region_code", ai_model_pricing.get("columns", {}))
        self.assertIn("region_code", ai_model_pricing.get("required_columns", []))
        self.assertIn("region_code", ai_model_pricing.get("not_null_columns", []))
        for column in ("provider_code", "channel_id"):
            self.assertIn(column, ai_model_pricing.get("columns", {}))
        self.assertEqual(
            [
                "tenant_id",
                "organization_id",
                "snapshot_date",
                "snapshot_period",
                "rank_scope",
                "vendor_code",
                "region_code",
                "catalog_key",
            ],
            next(
                item.get("columns")
                for item in ai_model_rank_snapshot.get("unique_constraints", [])
                if item.get("name") == "uk_ai_model_rank_snapshot_scope_catalog_key"
            ),
        )

        model_indexes = {
            item["name"]: item.get("columns", [])
            for item in ai_model.get("indexes", [])
            if isinstance(item, dict)
        }
        capability_indexes = {
            item["name"]: item.get("columns", [])
            for item in ai_model_capability.get("indexes", [])
            if isinstance(item, dict)
        }
        self.assertNotIn("idx_ai_model_vendor_region_status", model_indexes)
        self.assertNotIn("idx_ai_model_capability_vendor_region_capability", capability_indexes)
        self.assertNotIn("region_code", model_indexes["idx_ai_model_vendor_status"])
        self.assertNotIn("region_code", model_indexes["idx_ai_model_catalog_search"])

        capability_tables = {
            "ai_provider",
            "ai_channel",
            "ai_channel_resource",
            "ai_channel_group",
            "ai_channel_group_member",
            "ai_channel_group_resource",
            "ai_modality",
            "ai_api_endpoint",
            "ai_vendor_modality",
            "ai_vendor_api_endpoint",
            "ai_modality_api_endpoint",
            "ai_model_modality",
            "ai_model_api_endpoint",
            "ai_resource",
            "ai_resource_group",
            "ai_resource_group_item",
        }
        self.assertTrue(capability_tables.issubset(tables))

        self.assertTrue(
            set(AI_CHANNEL_ROUTE_REQUIRED_TABLES).issubset(tables),
            "AI routing schema must expose the canonical channel/resource/group route table set.",
        )

        channel = tables["ai_channel"]
        for column in (
            "channel_code",
            "channel_name",
            "channel_type",
            "provider_code",
            "protocol_code",
            "credential_ref",
            "base_url",
            "health_status",
        ):
            self.assertIn(column, channel.get("columns", {}))

        channel_group = tables["ai_channel_group"]
        for column in ("group_code", "group_name", "group_type", "routing_policy_id", "pricing_plan_code"):
            self.assertIn(column, channel_group.get("columns", {}))

        group_member = tables["ai_channel_group_member"]
        for column in ("channel_group_id", "channel_id", "priority", "weight", "effective_from", "effective_to"):
            self.assertIn(column, group_member.get("columns", {}))

        group_resource = tables["ai_channel_group_resource"]
        for column in ("channel_group_id", "resource_id", "resource_group_id", "grant_type", "priority"):
            self.assertIn(column, group_resource.get("columns", {}))
        for column in ("resource_code", "resource_group_code"):
            column_spec = group_resource["columns"][column]
            self.assertIsInstance(column_spec, dict)
            self.assertEqual("NOT NULL DEFAULT ''", column_spec.get("constraints"))

        resource = tables["ai_resource"]
        for column in (
            "resource_code",
            "resource_type",
            "vendor_code",
            "modality_code",
            "api_code",
            "model_code",
            "catalog_key",
            "provider_native_model",
        ):
            self.assertIn(column, resource.get("columns", {}))
        self.assertEqual(
            "string(192)",
            resource["columns"]["resource_code"],
            "Canonical resources must keep resource_code as the real resource identity, "
            "without blank-default binding semantics.",
        )
        self.assertIn(
            {"name": "uk_ai_resource_tenant_code", "columns": ["tenant_id", "organization_id", "resource_code"]},
            [
                {"name": item.get("name"), "columns": item.get("columns")}
                for item in resource.get("unique_constraints", [])
                if isinstance(item, dict)
            ],
        )

        resource_group = tables["ai_resource_group"]
        for column in ("group_code", "group_name", "group_type", "selection_mode"):
            self.assertIn(column, resource_group.get("columns", {}))

        resource_group_item = tables["ai_resource_group_item"]
        for column in ("resource_group_id", "item_type", "resource_id", "child_resource_group_id", "item_role"):
            self.assertIn(column, resource_group_item.get("columns", {}))
        for column in ("resource_code", "child_resource_group_code"):
            column_spec = resource_group_item["columns"][column]
            self.assertIsInstance(column_spec, dict)
            self.assertEqual(
                "NOT NULL DEFAULT ''",
                column_spec.get("constraints"),
                "Resource group members must store the unused unique-key side as an empty string, "
                "otherwise duplicate seed/admin members can bypass ON CONFLICT through NULL semantics.",
            )

        channel_resource = tables["ai_channel_resource"]
        for column in ("channel_id", "resource_code", "resource_group_code", "grant_type", "priority"):
            self.assertIn(column, channel_resource.get("columns", {}))
        for column in ("resource_code", "resource_group_code"):
            column_spec = channel_resource["columns"][column]
            self.assertIsInstance(column_spec, dict)
            self.assertEqual("NOT NULL DEFAULT ''", column_spec.get("constraints"))

        sdkwork_models_root = SDKWORK_MODELS_ROOT / "models"
        self.assertTrue((sdkwork_models_root / "minimax" / "cn" / "vendor.json").is_file())
        self.assertTrue((sdkwork_models_root / "minimax" / "global" / "vendor.json").is_file())
        self.assertFalse((sdkwork_models_root / "minimax_cn").exists())
        self.assertFalse((sdkwork_models_root / "minimax_global").exists())

        for vendor_dir in sdkwork_models_root.iterdir():
            if not vendor_dir.is_dir():
                continue
            if (vendor_dir / "vendor.json").exists():
                self.fail(f"{vendor_dir.name} must use models/<vendorCode>/<regionCode>/vendor.json")
            for region_dir in vendor_dir.iterdir():
                if not region_dir.is_dir():
                    continue
                vendor_file = region_dir / "vendor.json"
                if not vendor_file.exists():
                    continue
                vendor_payload = json.loads(read_text(vendor_file))
                self.assertEqual(vendor_dir.name, vendor_payload.get("vendorCode"))
                self.assertEqual(region_dir.name, vendor_payload.get("regionCode"))
                self.assertNotRegex(vendor_payload["vendorCode"], r"_(cn|global)$")
                self.assertIn(vendor_payload["regionCode"], REQUIRED_MODEL_REGION_CODES | {"us", "eu", "apac"})
                for model_file in (region_dir / "models").glob("*.json"):
                    model_payload = json.loads(read_text(model_file))
                    expected_catalog_key = f"{vendor_dir.name}/{model_payload['modelId']}"
                    self.assertEqual(vendor_dir.name, model_payload.get("vendorCode"))
                    self.assertEqual(region_dir.name, model_payload.get("regionCode"))
                    self.assertEqual(
                        expected_catalog_key,
                        model_payload.get("catalogKey"),
                        f"{model_file.relative_to(ROOT)} must use vendor/model as model identity; "
                        "regionCode is a separate deployment/pricing dimension.",
                    )
                for pricing_file in (region_dir / "pricing").glob("*.json"):
                    pricing_payload = json.loads(read_text(pricing_file))
                    expected_catalog_key = f"{vendor_dir.name}/{pricing_payload['modelId']}"
                    self.assertEqual(vendor_dir.name, pricing_payload.get("vendorCode"))
                    self.assertEqual(region_dir.name, pricing_payload.get("regionCode"))
                    self.assertEqual(
                        expected_catalog_key,
                        pricing_payload.get("catalogKey"),
                        f"{pricing_file.relative_to(ROOT)} must use vendor/model as pricing subject; "
                        "regionCode remains the regional price dimension.",
                    )
                rankings_file = region_dir / "rankings.json"
                if rankings_file.exists():
                    rankings_payload = json.loads(read_text(rankings_file))
                    for snapshot in rankings_payload.get("snapshots", []):
                        for item in snapshot.get("items", []):
                            expected_catalog_key = f"{vendor_dir.name}/{item['modelId']}"
                            self.assertEqual(
                                expected_catalog_key,
                                item.get("catalogKey"),
                                f"{rankings_file.relative_to(ROOT)} must use vendor/model ranking identity; "
                                "regionCode remains the regional ranking context.",
                            )

        importer_source = read_text(
            ROOT
            / "services"
            / "sdkwork-clawrouter-router-service"
            / "src"
            / "infrastructure"
            / "sql"
            / "model_catalog_import.rs"
        )
        self.assertNotIn(
            "format!(\"{vendor_code}/{region_code}/{model_id}\")",
            importer_source,
            "Catalog import must not encode region into ai_model_pricing or ai_model_rank_snapshot catalog_key.",
        )
        self.assertNotIn(
            "{vendor_code}_direct_{region_code}",
            importer_source,
            "Provider identity must not encode region; ai_model_pricing.region_code is the regional price dimension.",
        )
        self.assertNotRegex(
            importer_source,
            r"_direct_(?:cn|global|us|eu|apac)",
            "Imported provider_code values must use stable vendor/provider identity; region belongs to region_code.",
        )

    def test_model_identity_columns_support_nested_provider_model_ids(self) -> None:
        registry = load_registry()
        tables = {item["table"]: item for item in registry.get("tables", []) if isinstance(item, dict)}
        expected_model_identity_columns = {
            "ai_model": ("model", "replacement_model"),
            "ai_model_capability": ("model",),
            "ai_model_modality": ("model",),
            "ai_model_api_endpoint": ("model", "provider_native_model"),
            "ai_model_pricing": ("model", "provider_model"),
            "ai_pricing_rule": ("model", "provider_model"),
            "ai_model_rank_snapshot": ("model",),
            "ai_routing_decision_log": ("requested_model", "resolved_model"),
            "ai_request_trace": ("requested_model", "provider_model", "provider_native_model"),
            "ai_usage_fact": ("model", "provider_native_model"),
            "ai_resource": ("model", "provider_native_model"),
        }
        for table_name, column_names in expected_model_identity_columns.items():
            table = tables[table_name]
            columns = table.get("columns", {})
            for column_name in column_names:
                with self.subTest(table=table_name, column=column_name):
                    self.assertEqual(
                        "string(256)",
                        columns.get(column_name),
                        "Model identity fields must allow OpenRouter-style nested provider model ids "
                        "and long provider-native names; display labels remain separately bounded.",
                    )

    def test_gateway_usage_does_not_recreate_regional_requested_catalog_key_compatibility(self) -> None:
        source = read_text(ROOT / "services" / "sdkwork-clawrouter-cloud-gateway" / "src" / "passthrough.rs")
        domain_source = read_text(MODELS_CATALOG_DOMAIN_PATH)
        self.assertNotIn(
            "canonical_adapter_usage_catalog_key",
            source,
            "Gateway usage must reject regional requested catalog keys instead of normalizing vendor/region/model.",
        )
        self.assertNotIn(
            "known_region_segment",
            source,
            "Gateway usage must use the shared model region standard, not a private compatibility list.",
        )
        self.assertNotIn(
            "\"{}/global/{}\"",
            source,
            "Gateway usage must not synthesize vendor/global/model requested catalog keys.",
        )
        self.assertIn(
            "ensure_canonical_model_catalog_key",
            source,
            "Gateway usage must delegate canonical catalog identity validation to the shared domain standard.",
        )
        self.assertIn(
            '"{field_name} must use vendorCode/modelId; region belongs to region_code: {value}"',
            domain_source,
            "Gateway usage must fail loudly when adapter usage reports a regional catalog key.",
        )
        self.assertIn(
            'ensure_canonical_model_catalog_key(catalog_key, "requestedModelCatalogKey")',
            source,
            "Gateway usage must pass the adapter field name into the shared domain validator.",
        )
        self.assertIn(
            "adapter_requested_model_catalog_key(invocation, usage_line)",
            source,
            "Provider-native direct usage must keep requested catalog identity canonical and store region separately.",
        )
        self.assertIn(
            "let requested_model_catalog_key = adapter_requested_model_catalog_key(invocation, usage_line)?;",
            source,
            "Gateway usage must resolve requested catalog identity before persisting usage facts.",
        )

    def test_regional_catalog_key_guards_use_shared_domain_region_standard(self) -> None:
        direct_region_guard_sources = [
            ROOT / "services" / "sdkwork-clawrouter-app-api-server" / "tests" / "model_rankings_route.rs",
            MODELS_CATALOG_DOMAIN_PATH,
        ]
        for path in direct_region_guard_sources:
            source = read_text(path)
            with self.subTest(path=path.relative_to(ROOT).as_posix()):
                self.assertNotIn(
                    "known_region_segment",
                    source,
                    "Regional catalog-key guards must use the shared domain region standard, "
                    "not a private compatibility list.",
                )
                self.assertIn(
                    "is_model_region_segment",
                    source,
                    "Regional catalog-key guards must reject region segments through the shared domain standard.",
                )
        passthrough_source = read_text(ROOT / "services" / "sdkwork-clawrouter-cloud-gateway" / "src" / "passthrough.rs")
        self.assertIn(
            "ensure_canonical_model_catalog_key",
            passthrough_source,
            "Gateway guards must reuse the shared canonical catalog key standard instead of duplicating region parsing.",
        )

    def test_persistence_catalog_key_parsers_reuse_shared_identity_standard(self) -> None:
        parser_sources = [
            ROOT
            / "services"
            / "sdkwork-clawrouter-router-service"
            / "src"
            / "infrastructure"
            / "sql"
            / "rows.rs",
            ROOT
            / "crates"
            / "sdkwork-clawrouter-admin-analytics-repository-sqlx"
            / "src"
            / "snapshot.rs",
        ]
        for path in parser_sources:
            source = read_text(path)
            with self.subTest(path=path.relative_to(ROOT).as_posix()):
                self.assertNotIn(
                    "known_region_segment",
                    source,
                    "Persistence and analytics code must not carry private region compatibility lists.",
                )
                self.assertNotIn(
                    "is_model_region_segment",
                    source,
                    "Persistence and analytics code must validate catalog identity through the shared parser.",
                )
                self.assertRegex(
                    source,
                    r"parse_model_catalog_identity|ensure_canonical_model_catalog_key",
                    "Persistence and analytics catalog-key handling must reuse the shared domain identity standard.",
                )

    def test_app_routing_channel_store_uses_resource_bindings_not_model_parsing(self) -> None:
        channel_store_sources = [
            ROOT
            / "services"
            / "sdkwork-clawrouter-router-service"
            / "src"
            / "infrastructure"
            / "sql"
            / "sqlite"
            / "app_routing_channel_command_store.rs",
            ROOT
            / "services"
            / "sdkwork-clawrouter-router-service"
            / "src"
            / "infrastructure"
            / "sql"
            / "postgres"
            / "app_routing_channel_command_store.rs",
        ]
        for path in channel_store_sources:
            source = read_text(path)
            with self.subTest(path=path.relative_to(ROOT).as_posix()):
                self.assertNotIn(
                    "ai_channel_model",
                    source,
                    "App routing channel stores must not recreate direct account-to-model bindings.",
                )
                self.assertNotIn(
                    "replace_channel_models",
                    source,
                    "App routing channel stores must bind account access through resources.",
                )
                self.assertIn(
                    "replace_channel_resource_bindings",
                    source,
                    "App routing channel stores must maintain channel access through ai_channel_resource.",
                )
                self.assertIn(
                    "ai_channel_resource",
                    source,
                    "App routing channel stores must persist channel resource bindings.",
                )
                self.assertNotRegex(
                    source,
                    r"parse_model_catalog_identity|ensure_canonical_model_catalog_key",
                    "App routing account setup should not parse model catalog keys; "
                    "model selection belongs to resource routing and model mapping.",
                )

    def test_admin_channel_store_uses_resource_bindings_not_channel_models(self) -> None:
        channel_store_sources = [
            ROOT
            / "services"
            / "sdkwork-clawrouter-router-service"
            / "src"
            / "infrastructure"
            / "sql"
            / "sqlite"
            / "admin_channel_store.rs",
            ROOT
            / "services"
            / "sdkwork-clawrouter-router-service"
            / "src"
            / "infrastructure"
            / "sql"
            / "postgres"
            / "admin_channel_store.rs",
        ]
        for path in channel_store_sources:
            source = read_text(path)
            with self.subTest(path=path.relative_to(ROOT).as_posix()):
                self.assertNotIn(
                    "ai_channel_model",
                    source,
                    "Admin channel stores must not recreate direct account-to-model bindings.",
                )
                self.assertNotIn(
                    "replace_channel_models",
                    source,
                    "Admin channel stores must use resource bindings instead of model replacement helpers.",
                )
                self.assertIn(
                    "replace_ai_resource_bindings",
                    source,
                    "Admin channel stores must maintain channel access through ai_channel_resource.",
                )
                self.assertIn(
                    "ai_channel_resource",
                    source,
                    "Admin channel stores must persist channel resource bindings.",
                )
                self.assertNotIn(
                    "models:",
                    source,
                    "Admin channel read models must not expose direct account model bindings.",
                )
                self.assertIn(
                    "resource_codes: ai_resources.get(&id).cloned().unwrap_or_default()",
                    source,
                    "Admin channel read models must expose account routing through resource bindings.",
                )

    def test_portal_catalog_key_parsers_reuse_shared_identity_standard(self) -> None:
        parser_sources = [
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-admin-channel"
            / "src"
            / "channelService.ts",
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-models"
            / "src"
            / "runtimeModelCatalog.ts",
        ]
        for path in parser_sources:
            source = read_text(path)
            with self.subTest(path=path.relative_to(ROOT).as_posix()):
                self.assertNotIn(
                    "function isKnownRegionSegment",
                    source,
                    "Portal feature packages must not carry private catalog-region lists.",
                )
                self.assertNotIn(
                    "catalogKeyParts",
                    source,
                    "Portal feature packages must reuse the shared catalog identity parser instead of local split helpers.",
                )
                self.assertRegex(
                    source,
                    r"parseModelCatalogIdentity|isCanonicalModelCatalogKey|isRegionalModelCatalogKey",
                    "Portal catalog-key handling must reuse sdkwork-clawroutes-pc-commons model catalog identity helpers.",
                )

        commons_source = read_text(
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawroutes-pc-commons"
            / "src"
            / "model-catalog-identity.ts"
        )
        self.assertIn("export function parseModelCatalogIdentity", commons_source)
        self.assertIn("export function isModelRegionSegment", commons_source)

    def test_admin_model_commands_accept_nested_provider_model_ids(self) -> None:
        source = read_source(MODELS_CATALOG_SERVICE_API_DIR / "admin_model_command.rs")
        runtime_test = read_text(
            ROOT
            / "services"
            / "sdkwork-clawrouter-router-service"
            / "tests"
            / "admin_model_command_api.rs"
        )

        self.assertIn("const MAX_MODEL_ID_LEN: usize = 256;", source)
        self.assertIn("fn is_model_identity_byte(byte: u8) -> bool", source)
        for token in ("b'/'", "b'.'", "b':'", "b'-'", "b'_'"):
            self.assertIn(token, source)
        self.assertNotIn(
            "modelId must use ASCII letters, numbers, hyphen, or underscore",
            source,
            "Admin model route ids must support nested provider-native model ids such as anthropic/claude.",
        )
        self.assertIn("/backend/v3/api/ai/models/anthropic%2Fclaude-3-opus", runtime_test)
        self.assertIn("update_model:anthropic/claude-3-opus:", runtime_test)

    def test_app_model_reference_prices_are_region_scoped(self) -> None:
        contract_source = read_text(
            ROOT
            / "docs"
            / "schema-registry"
            / "frontend-field-contracts"
            / "operations"
            / "app-ai.yaml"
        )
        runtime_catalog_source = read_text(
            ROOT
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawrouter-pc-models"
            / "src"
            / "runtimeModelCatalog.ts"
        )
        app_model_api_source = read_source(MODELS_CATALOG_SERVICE_API_DIR / "app_models.rs")

        contract = yaml.safe_load(contract_source)
        app_models_operation = next(
            operation
            for operation in contract["frontend_operations"]
            if operation.get("source") == "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-models/src/modelService.ts"
            and operation.get("operation") == "fetchModels"
        )
        item_schema = app_models_operation["response_schema"]["properties"]["items"]["items"]
        item_properties = item_schema["properties"]
        reference_price_schema = item_properties["officialReferencePrices"]["items"]

        self.assertNotIn("regionCode", item_schema["required"])
        self.assertNotIn("regionCode", item_properties)
        self.assertNotIn("officialReferenceUnitPrice", item_properties)
        self.assertNotIn("officialReferenceCurrency", item_properties)
        self.assertIn("regionCode", reference_price_schema["required"])
        self.assertIn("regionCode", reference_price_schema["properties"])
        app_model_item_section = app_model_api_source.split(
            "struct AppModelCatalogItemResponse", 1
        )[1].split("struct AppModelCatalogReferencePriceResponse", 1)[0]
        self.assertNotIn("region_code: String", app_model_item_section)
        self.assertIn("region_code: price.region_code", app_model_api_source)
        self.assertIn("byRegionAndMeter", runtime_catalog_source)
        self.assertIn("pricesForDefaultReferenceRegion", runtime_catalog_source)
        self.assertNotIn("regionCode: item.regionCode", runtime_catalog_source)

    def test_gateway_usage_records_deployment_region_explicitly(self) -> None:
        registry = load_schema_registry(REGISTRY_PATH)
        tables = {table["table"]: table for table in registry["tables"]}
        generated_schema = read_text(GENERATED_SCHEMA_PATH)
        sqlite_recorder_source = read_text(
            ROOT
            / "services"
            / "sdkwork-clawrouter-router-service"
            / "src"
            / "infrastructure"
            / "sql"
            / "sqlite"
            / "gateway_usage_recorder.rs"
        )
        postgres_recorder_source = read_text(
            ROOT
            / "services"
            / "sdkwork-clawrouter-router-service"
            / "src"
            / "infrastructure"
            / "sql"
            / "postgres"
            / "gateway_usage_recorder.rs"
        )
        port_source = read_text(
            ROOT
            / "services"
            / "sdkwork-clawrouter-router-service"
            / "src"
            / "ports"
            / "gateway_usage_recorder.rs"
        )

        for table_name in ("ai_request_trace", "ai_usage_fact"):
            with self.subTest(table=table_name):
                table = tables[table_name]
                self.assertIn("region_code", table.get("columns", {}))
                table_sql = create_table_block(generated_schema, table_name)
                self.assertIn("region_code VARCHAR(64)", table_sql)
        self.assertIn("pub region_code: String", port_source)
        for source in (sqlite_recorder_source, postgres_recorder_source):
            self.assertIn("region_code", source)
            self.assertIn(".bind(&command.region_code)", source)

    def test_usage_log_read_models_expose_deployment_region(self) -> None:
        admin_record_contract = yaml.safe_load(
            read_text(ROOT / "docs" / "schema-registry" / "frontend-field-contracts" / "models" / "admin-record.yaml")
        )
        console_usage_contract = yaml.safe_load(
            read_text(ROOT / "docs" / "schema-registry" / "frontend-field-contracts" / "models" / "console-usage.yaml")
        )
        backend_system_contract = yaml.safe_load(
            read_text(ROOT / "docs" / "schema-registry" / "frontend-field-contracts" / "operations" / "backend-system.yaml")
        )
        app_ai_contract = yaml.safe_load(
            read_text(ROOT / "docs" / "schema-registry" / "frontend-field-contracts" / "operations" / "app-ai.yaml")
        )
        backend_openapi = load_generated_openapi(BACKEND_OPENAPI_PATH)
        app_openapi = load_generated_openapi(APP_OPENAPI_PATH)
        sources = {
            "admin_port": read_text(ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "ports" / "admin_record_store.rs"),
            "usage_port": read_text(ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "ports" / "usage_logs_read_store.rs"),
            "sqlite_admin": read_text(ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "infrastructure" / "sql" / "sqlite" / "admin_record_store.rs"),
            "postgres_admin": read_text(ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "infrastructure" / "sql" / "postgres" / "admin_record_store.rs"),
            "sqlite_usage": read_text(ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "infrastructure" / "sql" / "sqlite" / "usage_logs_read_store.rs"),
            "postgres_usage": read_text(ROOT / "services" / "sdkwork-clawrouter-router-service" / "src" / "infrastructure" / "sql" / "postgres" / "usage_logs_read_store.rs"),
            "admin_service": read_text(ROOT / "apps" / "sdkwork-clawrouter-pc" / "packages" / "sdkwork-clawrouter-pc-admin-record" / "src" / "recordService.ts"),
            "usage_service": read_text(ROOT / "apps" / "sdkwork-clawrouter-pc" / "packages" / "sdkwork-clawrouter-pc-console-usage" / "src" / "usageService.ts"),
        }

        for contract in (admin_record_contract, console_usage_contract):
            model_fields = contract["frontend_models"][0]["fields"]
            self.assertIn("regionCode", model_fields)

        for operation_contract, schema_name in (
            (backend_system_contract, "AdminRecordLogItem"),
            (app_ai_contract, "UsageLogItem"),
        ):
            response_items = next(
                operation["response_schema"]["properties"]["logs"]["items"]
                for operation in operation_contract["frontend_operations"]
                if operation["response_schema"]["properties"].get("logs")
            )
            self.assertEqual(schema_name, response_items["name"])
            self.assertIn("regionCode", response_items["required"])
            self.assertIn("regionCode", response_items["properties"])

        for spec, schema_name in (
            (backend_openapi, "AdminRecordLogItem"),
            (app_openapi, "UsageLogItem"),
        ):
            schema = spec["components"]["schemas"][schema_name]
            self.assertIn("regionCode", schema["required"])
            self.assertIn("regionCode", schema["properties"])

        for name, source in sources.items():
            with self.subTest(source=name):
                if name.endswith("_port"):
                    self.assertIn("pub region_code: String", source)
                elif name in ("admin_service", "usage_service"):
                    self.assertIn("regionCode", source)
                    self.assertIn("readOptionalString(item, 'regionCode')", source)
                else:
                    self.assertIn("AS region_code", source)
                    self.assertIn('string_cell(&row, "region_code")', source)

    def test_runtime_model_identity_fixtures_do_not_use_regional_catalog_keys(self) -> None:
        regional_catalog_key = r"(?:openai/global/(?:gpt-4o-mini|text-embedding-3-small|gpt-4\.1-mini|gpt-5\.5)|openrouter/global/anthropic/claude-3-opus)"
        runtime_field_patterns = (
            re.compile(rf"catalog_key:\s*\"{regional_catalog_key}\""),
            re.compile(rf"provider_model:\s*\"{regional_catalog_key}\""),
            re.compile(rf"model_scope:\s*vec!\[\s*\"{regional_catalog_key}\""),
            re.compile(rf"catalogKey\\\":\\\"{regional_catalog_key}"),
            re.compile(rf"\.with_catalog_key\(\s*\"{regional_catalog_key}\""),
            re.compile(rf"ModelProviderRoute::new_for_catalog_key\(\s*\"{regional_catalog_key}", re.DOTALL),
            re.compile(rf"OpenAiProviderRoute\s*\{{[^}}]*catalog_key:\s*\"{regional_catalog_key}", re.DOTALL),
        )
        offenders = []
        for path in RUNTIME_MODEL_IDENTITY_FIXTURE_PATHS:
            text = read_text(path)
            for pattern in runtime_field_patterns:
                for match in pattern.finditer(text):
                    line_no = text.count("\n", 0, match.start()) + 1
                    line = text.splitlines()[line_no - 1].strip()
                    offenders.append(f"{path.relative_to(ROOT)}:{line_no}: {line}")
        self.assertEqual(
            [],
            offenders,
            "Runtime routing, access-group, and telemetry fixtures must use vendor/model catalog keys; region belongs only to pricing/ranking/supply data.",
        )

    def test_gateway_source_fixtures_do_not_use_regional_model_identity_strings(self) -> None:
        regional_catalog_key = re.compile(
            r"(?:openai/global/(?:gpt-4o-mini|text-embedding-3-small|gpt-4\.1-mini|gpt-5\.5)|openrouter/global/anthropic/claude-3-opus)"
        )
        allowed_negative_test_ranges = (
            r"provider_native_model_id_strips_only_catalog_vendor_scope[\s\S]*?\n\}",
        )
        offenders = []
        for path in (
            ROOT / "services" / "sdkwork-clawrouter-cloud-gateway" / "src" / "runtime.rs",
            ROOT / "services" / "sdkwork-clawrouter-cloud-gateway" / "src" / "invocation_http.rs",
            ROOT / "services" / "sdkwork-clawrouter-cloud-gateway" / "src" / "invocation_router.rs",
        ):
            text = read_text(path)
            negative_ranges = [
                (match.start(), match.end())
                for pattern in allowed_negative_test_ranges
                for match in re.finditer(pattern, text)
            ]
            for match in regional_catalog_key.finditer(text):
                if any(start <= match.start() < end for start, end in negative_ranges):
                    continue
                line_no = text.count("\n", 0, match.start()) + 1
                line = text.splitlines()[line_no - 1].strip()
                offenders.append(f"{path.relative_to(ROOT)}:{line_no}: {line}")
        self.assertEqual(
            [],
            offenders,
            "Gateway passthrough/runtime fixtures must use provider-native model ids or vendor/model catalog keys; "
            "region is deployment, pricing, and routing context, not model identity.",
        )

    def test_product_ranking_fixtures_do_not_use_regional_catalog_keys(self) -> None:
        regional_catalog_key = re.compile(
            r"(?:openai|anthropic|xai)/global/[A-Za-z0-9._/-]+"
        )
        offenders = []
        for path in (
            ROOT / "services" / "sdkwork-clawrouter-router-service" / "tests" / "model_rankings_read_store.rs",
        ):
            text = read_text(path)
            for match in regional_catalog_key.finditer(text):
                line_no = text.count("\n", 0, match.start()) + 1
                line = text.splitlines()[line_no - 1].strip()
                offenders.append(f"{path.relative_to(ROOT)}:{line_no}: {line}")
        self.assertEqual(
            [],
            offenders,
            "Ranking read-store fixtures must use vendor/model catalog keys; "
            "region_code is the ranking and supply dimension.",
        )

    def test_product_relay_fixtures_do_not_use_regional_model_identity_strings(self) -> None:
        regional_catalog_key = re.compile(
            r"(?:openai|openrouter)/global/[A-Za-z0-9._/-]+"
        )
        offenders = []
        for path in (
            ROOT / "services" / "sdkwork-clawrouter-router-service" / "tests" / "openai_compatible_http_relay.rs",
            ROOT / "services" / "sdkwork-clawrouter-router-service" / "tests" / "openai_compatible_chat_stream_http_relay.rs",
            ROOT / "services" / "sdkwork-clawrouter-router-service" / "tests" / "openai_compatible_embeddings_http_relay.rs",
            ROOT / "services" / "sdkwork-clawrouter-router-service" / "tests" / "openai_compatible_responses_http_relay.rs",
            ROOT / "services" / "sdkwork-clawrouter-router-service" / "tests" / "secret_ref_openai_compatible_http_relay.rs",
            ROOT / "services" / "sdkwork-clawrouter-router-service" / "tests" / "secret_ref_openai_compatible_embeddings_http_relay.rs",
            ROOT / "services" / "sdkwork-clawrouter-router-service" / "tests" / "secret_ref_openai_compatible_responses_http_relay.rs",
        ):
            text = read_text(path)
            for match in regional_catalog_key.finditer(text):
                line_no = text.count("\n", 0, match.start()) + 1
                line = text.splitlines()[line_no - 1].strip()
                offenders.append(f"{path.relative_to(ROOT)}:{line_no}: {line}")
        self.assertEqual(
            [],
            offenders,
            "OpenAI-compatible relay fixtures must use provider-native request/response model ids "
            "or vendor/model catalog keys; region belongs to endpoint selection and pricing.",
        )

    def test_product_usage_and_analytics_fixtures_do_not_use_regional_catalog_keys(self) -> None:
        regional_catalog_key = re.compile(
            r"(?:openai|anthropic)/global/[A-Za-z0-9._/-]+"
        )
        offenders = []
        for path in (
            ROOT / "services" / "sdkwork-clawrouter-router-service" / "tests" / "sqlite_gateway_usage_recorder.rs",
            ROOT / "services" / "sdkwork-clawrouter-router-service" / "tests" / "postgres_transaction_integration.rs",
            ROOT / "services" / "sdkwork-clawrouter-router-service" / "tests" / "sqlite_admin_analytics_read_store.rs",
            ROOT / "services" / "sdkwork-clawrouter-router-service" / "tests" / "admin_record_api.rs",
        ):
            text = read_text(path)
            for match in regional_catalog_key.finditer(text):
                line_no = text.count("\n", 0, match.start()) + 1
                line = text.splitlines()[line_no - 1].strip()
                offenders.append(f"{path.relative_to(ROOT)}:{line_no}: {line}")
        self.assertEqual(
            [],
            offenders,
            "Usage, analytics, and admin-record fixtures must use vendor/model catalog keys; "
            "deployment region is recorded in region_code and pricing/routing snapshots.",
        )

    def test_portal_runtime_model_identity_fixtures_do_not_use_regional_catalog_keys(self) -> None:
        regional_catalog_key = re.compile(
            r"\b[A-Za-z0-9][A-Za-z0-9_-]*/(?:global|cn|us|eu|ap|jp|sg|hk|kr|in|au|uk|de|fr|ca|br|me|af|sa)(?:-[A-Za-z0-9_-]+)?/[A-Za-z0-9._/-]+"
        )
        offenders = []
        for path in PORTAL_RUNTIME_MODEL_IDENTITY_FIXTURE_PATHS:
            text = read_text(path)
            negative_test_ranges = [
                (match.start(), match.end())
                for match in re.finditer(
                    r'test\("runtime model catalog rejects regional catalog keys[\s\S]*?\n\}\);',
                    text,
                )
            ]
            negative_test_ranges.extend(
                (match.start(), match.end())
                for match in re.finditer(
                    r'test\("admin channel mapping catalog rejects regional catalog key debt[\s\S]*?\n\}\);',
                    text,
                )
            )
            negative_test_ranges.extend(
                (match.start(), match.end())
                for match in re.finditer(
                    r'test\("admin channel mapping catalog rejects cloud region segments[\s\S]*?\n\}\);',
                    text,
                )
            )
            for match in regional_catalog_key.finditer(text):
                if any(start <= match.start() < end for start, end in negative_test_ranges):
                    continue
                line_no = text.count("\n", 0, match.start()) + 1
                line = text.splitlines()[line_no - 1].strip()
                offenders.append(f"{path.relative_to(ROOT)}:{line_no}: {line}")
        self.assertEqual(
            [],
            offenders,
            "Portal runtime catalog and ranking fixtures must use vendor/model identities; "
            "region remains explicit pricing, routing, and deployment context.",
        )

    def test_api_gateway_fixtures_do_not_use_regional_catalog_keys(self) -> None:
        regional_catalog_key = re.compile(
            r"\b[A-Za-z0-9][A-Za-z0-9_-]*/(?:global|cn|us|eu|ap|jp|sg|hk|kr|in|au|uk|de|fr|ca|br|me|af|sa)(?:-[A-Za-z0-9_-]+)?/[A-Za-z0-9._/-]+"
        )
        allowed_negative_test_ranges = (
            r"provider_native_model_id_strips_only_catalog_vendor_scope[\s\S]*?\n\}",
            r"gateway_database_route_scoped_openai_passthrough_routes_optional_model_calls_by_presence[\s\S]*?\n\}",
        )
        offenders = []
        for path in API_GATEWAY_MODEL_IDENTITY_FIXTURE_PATHS:
            text = read_text(path)
            negative_ranges = [
                (match.start(), match.end())
                for pattern in allowed_negative_test_ranges
                for match in re.finditer(pattern, text)
            ]
            for match in regional_catalog_key.finditer(text):
                if any(start <= match.start() < end for start, end in negative_ranges):
                    continue
                line_no = text.count("\n", 0, match.start()) + 1
                line = text.splitlines()[line_no - 1].strip()
                if "assert!(!" in line or "!.contains(" in line:
                    continue
                offenders.append(f"{path.relative_to(ROOT)}:{line_no}: {line}")
        self.assertEqual(
            [],
            offenders,
            "API and gateway fixtures must use vendor/model catalog keys; deployment region is a route, endpoint, pricing, and usage dimension.",
        )

    def test_rust_test_support_uses_canonical_model_catalog_schema(self) -> None:
        source = read_text(RUST_TEST_SUPPORT_PATH)

        for table in CANONICAL_TABLES:
            self.assertIn(f"CREATE TABLE {table}", source)
        for legacy in LEGACY_MODEL_PATTERNS:
            self.assertNotIn(legacy, source)
        for meter in REQUIRED_BILLING_METERS - {"unknown"}:
            self.assertIn(meter, source)
        regional_catalog_key = re.compile(r"openai/global/(?:gpt-4o-mini|text-embedding-3-small)")
        offenders = []
        for match in regional_catalog_key.finditer(source):
            line_no = source.count("\n", 0, match.start()) + 1
            line = source.splitlines()[line_no - 1].strip()
            offenders.append(f"{RUST_TEST_SUPPORT_PATH.relative_to(ROOT)}:{line_no}: {line}")
        self.assertEqual(
            [],
            offenders,
            "Shared Rust test support seed data must use vendor/model catalog keys; "
            "region_code columns keep regional pricing and ranking context.",
        )

    def test_environment_seed_data_replaces_legacy_model_files(self) -> None:
        if not DATA_DIR.is_dir():
            self.skipTest("spring-ai-plus-server seed data directory is not present in this workspace")

        self.assertFalse((DATA_DIR / "model" / "model_info.json").exists())
        self.assertFalse((DATA_DIR / "model" / "model_price.json").exists())

        catalog_dir = DATA_DIR / "model-catalog"
        expected_profiles = {
            "test": catalog_dir / "model-catalog-test.json",
            "dev": catalog_dir / "model-catalog-dev.json",
            "prod": catalog_dir / "model-catalog-prod.json",
            "demo": catalog_dir / "model-catalog-demo.json",
        }
        for profile, path in expected_profiles.items():
            with self.subTest(profile=profile):
                self.assertTrue(path.exists(), f"{profile} model catalog seed file is missing")
                payload = json.loads(read_text(path))
                self.assertEqual(profile, payload.get("profile"))
                self.assertIn("schemaVersion", payload)
                self.assertTrue(payload.get("meters"), f"{profile} seed must include meters")
                self.assertTrue(payload.get("vendors"), f"{profile} seed must include vendors")
                self.assertTrue(payload.get("models"), f"{profile} seed must include models")
                self.assertTrue(payload.get("prices"), f"{profile} seed must include prices")
                for price in payload.get("prices", []):
                    self.assertIsInstance(price.get("unitPrice"), str)
                    self.assertRegex(price.get("unitPrice", ""), r"^\d+(\.\d+)?$")
                    self.assertTrue(price.get("sourceUrl"))
                    self.assertTrue(price.get("observedAt"))

        dev_payload = json.loads(read_text(expected_profiles["dev"]))
        self.assertTrue(
            any(model.get("releaseStage") == "retired" or model.get("routingState") == "disabled" for model in dev_payload.get("models", [])),
            "dev seed must include retired or disabled model examples",
        )
        self.assertTrue(
            any("image" in model.get("modalities", {}).get("input", []) or "video" in model.get("modalities", {}).get("output", []) for model in dev_payload.get("models", [])),
            "dev seed must include multimodal model examples",
        )

    def test_rust_database_installer_has_explicit_install_state_and_cli(self) -> None:
        installer_source = read_source(RUST_INSTALLER_PATH)
        cli_source = read_source(RUST_INSTALLER_CLI_PATH)
        registry_source = render_schema_registry(REGISTRY_PATH)
        generated_schema = read_text(GENERATED_SCHEMA_PATH)

        for required in (
            "system_installation_state",
            "system_schema_migration",
            "InstallationStatus",
            "ensure_installed",
            "CURRENT_SCHEMA_VERSION",
            "ENV_INSTALL_ENVIRONMENT",
            "ENV_INSTALL_SEED_PROFILE",
            "ENV_MODELS_CATALOG_ROOT",
            "DatabaseInstallOptions",
            "CatalogRefreshOptions",
            "refresh_catalog",
            "NotInstalled",
            "UpgradeRequired",
            "Corrupt",
            "load_install_model_catalog",
            "catalog_completeness_spec",
            "sdkwork_models_catalog_complete",
            "generated_schema_table_names",
            "last_catalog_refresh_status().await?",
            "sqlite_last_catalog_refresh_status",
            "postgres_last_catalog_refresh_status",
            "catalog_refresh_status_code",
            "catalog_refresh_metadata_is_dry_run",
            "record_failed_catalog_refresh",
            "try_record_failed_catalog_refresh",
            "sqlite_record_failed_catalog_refresh",
            "postgres_record_failed_catalog_refresh",
            "failed_catalog_refresh_row",
            "CATALOG_REFRESH_SEQUENCE",
            "catalog_refresh_id_with_entropy",
            "error_message_masked",
            "last_catalog_refresh_status",
            '"not_run"',
            '"success"',
            '"dry_run"',
            '"failed"',
        ):
            self.assertIn(required, installer_source)

        self.assertNotIn("CURRENT_CATALOG_VERSION", installer_source)
        self.assertNotIn("MIN_SDKWORK_MODELS_", installer_source)
        self.assertNotIn('"succeeded"', installer_source)
        self.assertNotIn('last_catalog_refresh_status: "not_run".to_owned()', installer_source)
        self.assertIn("Some(loaded_catalog_version)", installer_source)
        self.assertIn("let audit_options = options.clone();", installer_source)
        self.assertIn("&audit_options", installer_source)
        self.assertIn("options.catalog_version.as_deref()", installer_source)
        self.assertIn(".sync_catalog(command.clone())", installer_source)
        self.assertIn("return Err(error);", installer_source)
        self.assertIn("let _ = self", installer_source)
        self.assertIn(".record_failed_catalog_refresh(options, catalog_root, catalog_version, error)", installer_source)
        self.assertEqual(
            2,
            installer_source.count("ORDER BY started_at DESC, id DESC"),
            "SQLite and Postgres refresh status queries must order by timestamp and id for deterministic latest status",
        )
        self.assertRegex(
            installer_source,
            r"CATALOG_REFRESH_SEQUENCE\.fetch_add\(1,\s*Ordering::Relaxed\)",
        )
        self.assertRegex(
            installer_source,
            r"Err\(error\)\s*=>\s*\{\s*self\.try_record_failed_catalog_refresh\(",
        )
        self.assertNotIn("'ai_model_catalog_source'", installer_source)
        self.assertNotIn("'ai_model_catalog_sync_run'", installer_source)
        self.assertNotIn("COUNT(1)\n        FROM sqlite_master\n        WHERE type = 'table'\n          AND name IN", installer_source)
        for model_file in (ROOT / "data" / "sdkwork-models" / "models").glob("*/models/*.json"):
            model_payload = json.loads(read_text(model_file))
            model_id = model_payload.get("modelId")
            if model_id:
                self.assertNotIn(
                    model_id,
                    installer_source,
                    f"installer must load model facts from sdkwork-models, not hardcode {model_id}",
                )

        for command in ("status", "install", "upgrade", "ensure", "refresh-catalog"):
            self.assertIn(f"\"{command}\"", cli_source)
        for option in ("--vendor", "--catalog-root", "--catalog-version", "--dry-run", "--force"):
            self.assertIn(f"\"{option}\"", cli_source)
        for required in (
            "InstallationStatusOutput",
            "CatalogRefreshOutput",
            "InstallerErrorOutput",
            "InstallerCliError",
            "InstallerCommand",
            "parse_cli_command",
            "reject_extra_args",
            "installer_error_code",
            "MissingDatabaseUrl",
            "InvalidArgument",
            "normalize_refresh_token",
            "normalize_catalog_root",
            "normalize_catalog_version",
            "normalize_refresh_mode",
            "downcast_ref::<DatabaseInstallError>",
            "ExitCode",
            "print_json",
            "last_catalog_refresh_status",
        ):
            self.assertIn(required, cli_source)
        self.assertIn("serde_json::to_string", cli_source)
        self.assertLess(
            cli_source.index("let command = parse_cli_command"),
            cli_source.index("DatabaseConfig::from_env_or_initialize()"),
            "installer CLI must validate command syntax before requiring database environment",
        )
        run_body = cli_source[
            cli_source.index("async fn run()") : cli_source.index("async fn run_sqlite")
        ]
        self.assertIn("let command = parse_cli_command", run_body)
        self.assertLess(
            run_body.index("let command = parse_cli_command"),
            run_body.index("DatabaseConfig::from_env_or_initialize()"),
            "installer CLI must validate command syntax before requiring database environment",
        )
        self.assertIn(
            '"refresh-catalog" => InstallerCommand::RefreshCatalog(parse_refresh_options(args)?)',
            cli_source,
        )
        for command in ("status", "install", "upgrade", "ensure"):
            self.assertIn(
                f'reject_extra_args("{command}", args)?;',
                cli_source,
                f"{command} must reject unexpected CLI arguments before database initialization",
            )
        self.assertIn("does not accept extra arguments", cli_source)
        self.assertIn(
            'options.source =\n                    normalize_refresh_token(next_arg(&mut args, "--source")?, "source", 64)?',
            cli_source,
        )
        self.assertRegex(cli_source, r'"--catalog-root"[\s\S]*normalize_catalog_root\(next_arg\(')
        self.assertRegex(
            cli_source,
            r'"--catalog-version"[\s\S]*normalize_catalog_version\(next_arg\(',
        )
        self.assertIn(
            '{name} must contain only letters, numbers, -, and _',
            cli_source,
        )
        self.assertIn(
            "catalog version must contain only letters, numbers, ., -, and _",
            cli_source,
        )
        self.assertIn("options.vendor_codes.len() > 32", cli_source)
        self.assertIn(
            "vendor codes must contain 32 items or fewer",
            cli_source,
        )
        self.assertNotIn("std::env::args().skip(2)", cli_source)
        self.assertIn("last_catalog_refresh_status: status_report.last_catalog_refresh_status", cli_source)
        self.assertIn('"missing_database_url"', cli_source)
        self.assertIn('"invalid_argument"', cli_source)
        self.assertIn('"invalid_state"', cli_source)
        self.assertIn('"database_error"', cli_source)
        self.assertIn('"catalog_error"', cli_source)
        self.assertIn('"commerce_error"', cli_source)
        self.assertNotIn("changed={}", cli_source)
        self.assertNotIn("catalog_version={}", cli_source)

        for service_runtime in (
            ROOT / "services" / "sdkwork-clawrouter-cloud-gateway" / "src" / "runtime.rs",
            ROOT / "crates" / "sdkwork-routes-clawrouter-app-api" / "src" / "routes.rs",
            ROOT / "crates" / "sdkwork-routes-clawrouter-backend-api" / "src" / "routes.rs",
        ):
            source = read_text(service_runtime)
            self.assertIn("DatabaseInstaller", source)
            self.assertIn(".with_env_options()?", source)
            self.assertIn(".ensure_installed()", source)

        workspace_launcher = read_text(ROOT / "scripts" / "dev" / "start-workspace.mjs")
        for required in (
            "DEFAULT_MODELS_CATALOG_RELATIVE_PATH",
            "defaultModelsCatalogRoot",
            "resolveModelsCatalogRoot",
            "SDKWORK_MODELS_CATALOG_ROOT",
            "settings.modelsCatalogRoot",
            "modelsCatalogRoot: settings.modelsCatalogRoot",
            "SDKWORK_MODELS_CATALOG_ROOT=${settings.modelsCatalogRoot}",
            "model-catalog-refresh",
            "'refresh-catalog'",
            "'--catalog-root'",
            "'--force'",
        ):
            self.assertIn(required, workspace_launcher)
        self.assertIn(
            "settings.modelsCatalogRoot = resolveModelsCatalogRoot(settings, workspaceRoot)",
            workspace_launcher,
        )
        self.assertLess(
            workspace_launcher.index("name: 'installer'"),
            workspace_launcher.index("name: 'model-catalog-refresh'"),
            "dev startup must install schema before refreshing model catalog data",
        )
        self.assertLess(
            workspace_launcher.index("name: 'model-catalog-refresh'"),
            workspace_launcher.index("name: 'gateway'"),
            "dev startup must refresh model catalog data before starting Rust services",
        )

        for table in SYSTEM_TABLES:
            self.assertIn(f"- table: {table}", registry_source)
            self.assertIn(f"CREATE TABLE IF NOT EXISTS {table}", generated_schema)
            self.assertRegex(
                generated_schema,
                rf"CREATE TABLE IF NOT EXISTS {table} \(\r?\n\s+id BIGINT NOT NULL PRIMARY KEY,",
            )


if __name__ == "__main__":
    unittest.main()
