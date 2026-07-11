from __future__ import annotations

import argparse
from collections.abc import Iterator
from dataclasses import dataclass
from pathlib import Path
import re
from typing import Any

from tools.frontend_contract_loader import DEFAULT_CONTRACT_INDEX, DEFAULT_CONTRACT_SNAPSHOT
from tools.schema_registry_loader import load_schema_registry, schema_registry_source_paths

try:
    import yaml
except ImportError as exc:  # pragma: no cover - exercised only on missing tooling
    yaml = None
    _YAML_IMPORT_ERROR = exc
else:
    _YAML_IMPORT_ERROR = None


OBSOLETE_SKILLS_HUB_TABLES = {
    "studio_skill_listing",
    "studio_skill_version",
    "studio_skill_media",
}

SKILLS_HUB_ROUTES = {"/skills-hub", "/skills-hub/:id"}

TYPE_BINDING_TARGETS = {"java", "rust", "typescript", "openapi"}

DOMAIN_NAME_REQUIRED_CODES = {
    "model_vendor": {"unknown"},
    "price_side": {"official_reference", "upstream_cost", "customer_charge", "internal_transfer"},
    "billing_mode": {
        "token",
        "fixed_price",
        "per_request",
        "per_result",
        "per_item",
        "duration",
        "character",
        "storage",
        "bandwidth",
        "tiered",
        "expression",
        "image",
        "audio",
        "video",
    },
    "billing_meter": {
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
    },
    "integration_provider_type": {
        "model_vendor_direct",
        "cloud_platform",
        "relay_aggregator",
        "self_hosted_gateway",
        "local_runtime",
        "custom",
        "unknown",
    },
}

DOMAIN_NAMES_REQUIRING_TYPE_BINDINGS = {"model_vendor", "billing_meter", "integration_provider_type"}

FORBIDDEN_PRICING_TABLES = {"ai_pricing_group"}

FORBIDDEN_LEGACY_IDENTITY_TABLES = {
    "plus_api_key",
    "plus_oauth_account",
    "plus_organization",
    "plus_organization_member",
    "plus_permission",
    "plus_role",
    "plus_role_permission",
    "plus_tenant",
    "plus_user",
    "plus_user_role",
}

APPBASE_COMMERCE_LEGACY_ALIASES: dict[str, str] = {
    "ops_coupon_issue_batch": "commerce_coupon_issue_batch",
    "plus_account": "commerce_account",
    "plus_account_exchange_config": "commerce_exchange_rule",
    "plus_account_history": "commerce_account_ledger_entry",
    "plus_coupon": "commerce_coupon_template",
    "plus_coupon_template": "commerce_coupon_template",
    "plus_currency": "sdkwork-appbase commerce money value fields",
    "plus_exchange_rate": "sdkwork-appbase commerce exchange rules",
    "plus_invoice": "commerce_invoice",
    "plus_invoice_item": "commerce_invoice_item",
    "plus_invoice_record": "commerce_invoice",
    "plus_ledger_bridge": "commerce_account_ledger_entry",
    "plus_order": "commerce_order",
    "plus_order_dispatch_rule": "sdkwork-appbase commerce order policy",
    "plus_order_item": "commerce_order_item",
    "plus_order_worker_dispatch_profile": "sdkwork-appbase commerce order policy",
    "plus_payment": "commerce_payment_attempt",
    "plus_payment_webhook_event": "commerce_payment_webhook_event",
    "plus_product": "commerce_product",
    "plus_refund": "commerce_refund",
    "plus_shop": "commerce_product",
    "plus_shopping_cart": "commerce_order",
    "plus_shopping_cart_item": "commerce_order_item",
    "plus_sku": "commerce_sku",
    "plus_user_coupon": "commerce_coupon",
    "plus_vip_benefit": "commerce_vip_entitlement",
    "plus_vip_benefit_usage": "commerce_vip_entitlement_usage",
    "plus_vip_level": "commerce_vip_level",
    "plus_vip_level_benefit": "commerce_vip_entitlement",
    "plus_vip_pack": "commerce_recharge_package",
    "plus_vip_pack_group": "commerce_recharge_package",
    "plus_vip_point_change": "commerce_account_ledger_entry",
    "plus_vip_recharge": "commerce_order",
    "plus_vip_recharge_method": "commerce_payment_method",
    "plus_vip_recharge_pack": "commerce_recharge_package",
    "plus_vip_user": "commerce_vip_membership",
}

V41_PLATFORM_LEGACY_ALIASES: dict[str, str] = {
    "plus_app": "appstore_app",
    "platform_app": "appstore_app",
    "plus_category": "c_category",
    "plus_agent_skill": "ai_agent_skill",
    "plus_agent_skill_package": "ai_agent_skill_package",
    "plus_user_agent_skill": "ai_user_agent_skill",
    "studio_catalog_action": "ai_skill_action",
    "studio_catalog_asset": "ai_skill_asset",
    "studio_catalog_artifact": "ai_skill_artifact",
    "plus_feeds": "content_forum_post",
    "plus_comments": "content_comment",
    "plus_favorite": "content_favorite",
    "plus_content_vote": "content_reaction",
    "studio_app_template": "appstore_app_template",
    "platform_app_template": "appstore_app_template",
    "platform_app_template_version": "appstore_app_template_version",
    "platform_app_template_usage": "appstore_app_template_usage",
}

REQUIRED_TABLE_COLUMNS = {
    "ai_model_vendor": {"vendor_code", "display_name"},
    "ai_model": {
        "model",
        "vendor_code",
        "capability",
        "capabilities",
        "modalities",
        "default_pricing_id",
    },
    "ai_model_pricing": {
        "model",
        "vendor_code",
        "provider_code",
        "price_side",
        "pricing_plan_id",
        "billing_mode",
        "billing_meter_code",
        "unit_price",
        "currency",
        "reference_price_id",
        "reference_multiplier",
        "effective_from",
        "effective_to",
    },
    "ai_billing_meter": {"meter_code", "billing_mode", "default_unit", "quantity_source"},
    "ai_pricing_plan": {"plan_code", "plan_scope", "base_price_side", "default_multiplier", "default_markup_amount"},
    "ai_pricing_plan_binding": {"pricing_plan_id", "subject_type", "subject_id", "priority", "effective_from"},
    "ai_pricing_rule": {
        "pricing_plan_id",
        "price_side",
        "reference_price_side",
        "billing_mode",
        "billing_meter_code",
        "formula_mode",
        "multiplier",
        "expression",
    },
    "ai_pricing_tier": {
        "pricing_rule_id",
        "billing_mode",
        "billing_meter_code",
        "input_unit_price",
        "output_unit_price",
        "image_unit_price",
        "audio_unit_price",
        "video_unit_price",
        "per_request_price",
    },
    "iam_gateway_api_key": {"channel_group_id", "key_hash", "policy_id", "quota_policy_id", "rate_limit_policy_id"},
    "ai_channel_group": {"pricing_plan_id", "pricing_plan_code", "official_price_multiplier", "billing_type"},
    "ai_provider": {"provider_code", "default_vendor_code", "provider_type", "resource_schema"},
}

MESSAGING_STANDARD_TABLES: tuple[str, ...] = (
    "messaging_provider_capability",
    "messaging_sender_identity",
    "messaging_template",
    "messaging_template_version",
    "messaging_template_variant",
    "messaging_template_binding",
    "messaging_route_rule",
    "messaging_route_rule_target",
    "messaging_send_request",
    "messaging_send_attempt",
    "messaging_delivery_event",
    "messaging_suppression",
    "messaging_rate_limit_bucket",
)

MESSAGING_TABLE_NAME_TOKENS: tuple[str, ...] = (
    "email",
    "provider",
    "route",
    "send",
    "sender",
    "sms",
    "template",
    "webhook",
)

MOJIBAKE_MARKER_CODEPOINTS: tuple[int, ...] = (
    0xFFFD,
    0x95C1,
    0x6FDE,
    0x5A75,
    0x95BB,
    0x95C2,
    0x6FE0,
    0x7F02,
    0x9225,
    0xE51B,
    0xE5DD,
    0x941F,
    0x59AB,
)

# Keep bad-glyph samples as code points so this source file stays readable.
MOJIBAKE_MARKERS: tuple[str, ...] = tuple(chr(codepoint) for codepoint in MOJIBAKE_MARKER_CODEPOINTS)

SQLITE_SQL_SCAN_ROOTS: tuple[str, ...] = (
    "crates",
    "data",
    "database",
    "jobs",
    "packages",
    "services",
)

SQLITE_SQL_SCAN_SKIP_DIRECTORIES: frozenset[str] = frozenset(
    {
        ".git",
        ".sdkwork",
        "build",
        "dist",
        "fixtures",
        "generated",
        "node_modules",
        "target",
        "test",
        "tests",
        "vendor",
    }
)

SQLITE_SQL_SOURCE_SUFFIXES: frozenset[str] = frozenset({".rs", ".sql"})

SQL_PRECISION_FUNCTION_RE = re.compile(r"\b(?P<name>SUM|AVG|CAST)\s*\(", re.IGNORECASE)
SQL_IDENTIFIER_RE = re.compile(r"(?<![A-Za-z0-9_])[A-Za-z_][A-Za-z0-9_]*(?![A-Za-z0-9_])")
SQL_CAST_AS_REAL_RE = re.compile(r"\bAS\s+REAL\b", re.IGNORECASE)

GENERATED_SCHEMA_PATHS: dict[str, str] = {
    "postgres": "generated/schema/postgres/schema.sql",
    "sqlite": "generated/schema/sqlite/schema.sql",
}

INSERT_INTO_RE = re.compile(
    r"\bINSERT\s+INTO\s+(?:(?:[A-Za-z_][A-Za-z0-9_]*|\"[A-Za-z_][A-Za-z0-9_]*\")\s*\.\s*)?"
    r"[\"`\[]?(?P<table>[A-Za-z_][A-Za-z0-9_]*)[\"`\]]?",
    re.IGNORECASE,
)

ON_CONFLICT_TARGET_RE = re.compile(
    r"\bON\s+CONFLICT\s*\((?P<columns>[^)]*)\)"
    r"(?:\s+WHERE\s+(?P<where>.*?))?\s+DO\s+(?:UPDATE|NOTHING)\b",
    re.IGNORECASE | re.DOTALL,
)

CREATE_TABLE_RE = re.compile(
    r"\bCREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+"
    r"[\"`\[]?(?P<table>[A-Za-z_][A-Za-z0-9_]*)[\"`\]]?\s*"
    r"\((?P<body>.*?)\n\);",
    re.IGNORECASE | re.DOTALL,
)

CREATE_UNIQUE_INDEX_RE = re.compile(
    r"\bCREATE\s+UNIQUE\s+INDEX(?:\s+IF\s+NOT\s+EXISTS)?\s+"
    r"[\"`\[]?[A-Za-z_][A-Za-z0-9_]*[\"`\]]?\s+ON\s+"
    r"[\"`\[]?(?P<table>[A-Za-z_][A-Za-z0-9_]*)[\"`\]]?\s*"
    r"\((?P<columns>[^)]*)\)"
    r"(?:\s+WHERE\s+(?P<where>[^;]+))?\s*;",
    re.IGNORECASE | re.DOTALL,
)

TABLE_PRIMARY_KEY_RE = re.compile(
    r"(?:\bCONSTRAINT\s+[\"`\[]?[A-Za-z_][A-Za-z0-9_]*[\"`\]]?\s+)?"
    r"\bPRIMARY\s+KEY\s*\((?P<columns>[^)]*)\)",
    re.IGNORECASE,
)

TABLE_UNIQUE_RE = re.compile(
    r"(?:\bCONSTRAINT\s+[\"`\[]?[A-Za-z_][A-Za-z0-9_]*[\"`\]]?\s+)?"
    r"\bUNIQUE\s*\((?P<columns>[^)]*)\)",
    re.IGNORECASE,
)

INLINE_PRIMARY_KEY_RE = re.compile(
    r"^\s*[\"`\[]?(?P<column>[A-Za-z_][A-Za-z0-9_]*)[\"`\]]?\s+.*\bPRIMARY\s+KEY\b",
    re.IGNORECASE | re.MULTILINE,
)

BARE_MEDIA_DB_COLUMN_NAMES = {
    "asset_url",
    "artifact_url",
    "audio_url",
    "avatar_url",
    "cover_image",
    "cover_images",
    "cover_url",
    "document_url",
    "favicon_url",
    "file_url",
    "icon_url",
    "image_url",
    "logo_url",
    "media_url",
    "storage_url",
    "thumbnail_url",
    "video_url",
    "voice_url",
}

BARE_MEDIA_FRONTEND_FIELD_NAMES = {
    "assetUrl",
    "artifactUrl",
    "audioUrl",
    "avatarUrl",
    "coverImage",
    "coverImages",
    "coverUrl",
    "documentUrl",
    "faviconUrl",
    "fileUrl",
    "iconUrl",
    "imageUrl",
    "logoUrl",
    "mediaUrl",
    "storageUrl",
    "thumbnailUrl",
    "videoUrl",
    "voiceUrl",
    *BARE_MEDIA_DB_COLUMN_NAMES,
}

MEDIA_CONTEXT_TOKENS = {
    "asset",
    "artifact",
    "attachment",
    "audio",
    "avatar",
    "cover",
    "document",
    "file",
    "icon",
    "image",
    "logo",
    "media",
    "photo",
    "picture",
    "storage",
    "thumbnail",
    "video",
    "voice",
}

MEDIA_RESOURCE_FIELD_NAMES = {
    "asset",
    "artifact",
    "audio",
    "avatar",
    "cover",
    "document",
    "favicon",
    "icon",
    "image",
    "logo",
    "mainImage",
    "poster",
    "resource",
    "skuImage",
    "thumbnail",
    "video",
    "voice",
}

MEDIA_RESOURCE_COLLECTION_FIELD_NAMES = {
    "assets",
    "artifacts",
    "attachments",
    "audios",
    "avatars",
    "covers",
    "documents",
    "files",
    "images",
    "logos",
    "posters",
    "resources",
    "skuImages",
    "thumbnails",
    "videos",
    "voices",
}

NON_MEDIA_URL_FIELD_NAMES = {
    "access_url",
    "accessUrl",
    "action_url",
    "actionUrl",
    "authorization_url",
    "authorizationUrl",
    "base_url",
    "baseUrl",
    "callback_url",
    "callbackUrl",
    "cashier_url",
    "cashierUrl",
    "docs_url",
    "docsUrl",
    "download_url",
    "downloadUrl",
    "endpoint_url",
    "endpointUrl",
    "entry_url",
    "entryUrl",
    "homepage_url",
    "homepageUrl",
    "manifest_url",
    "manifestUrl",
    "payment_url",
    "paymentUrl",
    "redirect_url",
    "redirectUrl",
    "repository_url",
    "repositoryUrl",
    "return_url",
    "returnUrl",
    "source_url",
    "sourceUrl",
    "store_url",
    "storeUrl",
    "target_url",
    "targetUrl",
    "website_url",
    "websiteUrl",
    "webhook_url",
    "webhookUrl",
}


@dataclass(frozen=True)
class SchemaGuardianResult:
    ok: bool
    messages: list[str]


@dataclass(frozen=True)
class GeneratedUniqueTarget:
    columns: tuple[str, ...]
    where: str | None


class SchemaGuardian:
    """Executable guardrails for the Claw Router schema registry."""

    def __init__(
        self,
        root: Path,
        registry_path: Path | None = None,
        test_schema_path: Path | None = None,
    ) -> None:
        self.root = Path(root).resolve()
        self.registry_path = (
            Path(registry_path).resolve()
            if registry_path is not None
            else self.root / "docs" / "schema-registry" / "sdkwork-clawrouter.tables.yaml"
        )
        self.test_schema_path = Path(test_schema_path).resolve() if test_schema_path is not None else None

    def run(self) -> SchemaGuardianResult:
        data = self._load_registry()
        tables = data.get("tables", [])
        if not isinstance(tables, list):
            return SchemaGuardianResult(ok=False, messages=["tables must be a list"])

        by_table = {
            item.get("table"): item
            for item in tables
            if isinstance(item, dict) and isinstance(item.get("table"), str)
        }

        messages: list[str] = []
        messages.extend(self._check_registry_text_encoding())
        messages.extend(self._check_forbidden_synonyms(data, by_table))
        messages.extend(self._check_legacy_identity_standard(data, by_table))
        messages.extend(self._check_appbase_commerce_legacy_aliases(by_table))
        messages.extend(self._check_appbase_commerce_legacy_alias_references())
        messages.extend(self._check_v41_platform_legacy_aliases(by_table))
        messages.extend(self._check_v41_platform_legacy_alias_references())
        messages.extend(self._check_category_seed_manifests())
        messages.extend(self._check_schema_registry_media_resource_columns(by_table))
        messages.extend(self._check_frontend_contract_media_resource_fields())
        messages.extend(self._check_skills_hub_tables(by_table))
        messages.extend(self._check_domain_names(data, by_table))
        messages.extend(self._check_pricing_and_billing_contracts(by_table))
        messages.extend(self._check_repository_on_conflict_targets(by_table))
        messages.extend(self._check_sqlite_logical_decimal_queries(by_table))
        messages.extend(self._check_messaging_delivery_standard(by_table))
        messages.extend(self._check_projection_source_contracts(by_table))
        messages.extend(self._check_api_prefixes(data))
        messages.extend(self._check_table_naming_guardrails(data, by_table))
        messages.extend(self._check_frontend_route_api_surfaces(by_table))

        return SchemaGuardianResult(ok=not messages, messages=messages)

    def _load_registry(self) -> dict[str, Any]:
        return load_schema_registry(self.registry_path)

    def _check_registry_text_encoding(self) -> list[str]:
        messages: list[str] = []
        for path in schema_registry_source_paths(self.registry_path):
            text = path.read_text(encoding="utf-8")
            for line_number, line in enumerate(text.splitlines(), 1):
                if any(marker in line for marker in MOJIBAKE_MARKERS):
                    excerpt = line.strip()
                    if len(excerpt) > 120:
                        excerpt = excerpt[:117] + "..."
                    messages.append(
                        f"schema registry contains mojibake text near line {line_number}: {excerpt}"
                    )
        return messages

    def _check_forbidden_synonyms(self, data: dict[str, Any], by_table: dict[str, dict[str, Any]]) -> list[str]:
        guardrails = data.get("schema_registry", {}).get("legacy_compatibility_guardrails", {})
        forbidden_tables = guardrails.get("forbidden_synonym_tables", [])
        if not isinstance(forbidden_tables, list):
            return ["legacy_compatibility_guardrails.forbidden_synonym_tables must be a list"]

        return [
            f"forbidden synonym table present: {table}"
            for table in forbidden_tables
            if isinstance(table, str) and table in by_table
        ]

    def _check_appbase_commerce_legacy_aliases(self, by_table: dict[str, dict[str, Any]]) -> list[str]:
        messages: list[str] = []
        for table, replacement in sorted(APPBASE_COMMERCE_LEGACY_ALIASES.items()):
            if table in by_table:
                messages.append(f"appbase commerce legacy alias must be removed: {table} -> {replacement}")
        return messages

    def _check_appbase_commerce_legacy_alias_references(self) -> list[str]:
        checked_sources = [
            *self._frontend_contract_source_paths(),
            self.root / "tools" / "api_contract_manifest.py",
        ]
        messages: list[str] = []

        for source in checked_sources:
            if not source.exists():
                continue
            text = source.read_text(encoding="utf-8")
            for alias, replacement in sorted(APPBASE_COMMERCE_LEGACY_ALIASES.items()):
                if alias in text:
                    messages.append(
                        f"{source.relative_to(self.root)} references appbase commerce legacy alias: {alias} -> {replacement}"
                    )

        return messages

    def _check_v41_platform_legacy_aliases(self, by_table: dict[str, dict[str, Any]]) -> list[str]:
        messages: list[str] = []
        for table, replacement in sorted(V41_PLATFORM_LEGACY_ALIASES.items()):
            if table in by_table:
                messages.append(f"v4.1 platform legacy alias must be removed: {table} -> {replacement}")
        return messages

    def _check_category_seed_manifests(self) -> list[str]:
        messages: list[str] = []
        categories_root = self.root / "data" / "categories"
        if not categories_root.exists():
            return messages

        for manifest in sorted(categories_root.glob("*/categories.json")):
            text = manifest.read_text(encoding="utf-8")
            if "plus_category" in text:
                messages.append(
                    f"{manifest.relative_to(self.root)} must target c_category instead of plus_category"
                )
        return messages

    def _check_v41_platform_legacy_alias_references(self) -> list[str]:
        checked_sources = [
            *self._frontend_contract_source_paths(),
            self.root / "docs" / "schema-registry" / "frontend-field-contracts.yaml",
            self.root / "tools" / "api_contract_manifest.py",
            self.root / "apis" / "app-api" / "clawrouter" / "clawrouter-app-api.openapi.json",
            self.root / "apis" / "backend-api" / "clawrouter" / "clawrouter-backend-api.openapi.json",
            self.root / "generated" / "openapi" / "clawrouter-app-openapi.json",
            self.root / "generated" / "openapi" / "clawrouter-backend-openapi.json",
            self.root / "generated" / "api" / "api-contract-manifest.json",
        ]
        messages: list[str] = []

        for source in checked_sources:
            if not source.exists():
                continue
            text = source.read_text(encoding="utf-8")
            for alias, replacement in sorted(V41_PLATFORM_LEGACY_ALIASES.items()):
                if alias in text:
                    messages.append(
                        f"{source.relative_to(self.root)} references v4.1 retired platform alias: {alias} -> {replacement}"
                    )

        return messages

    def _check_schema_registry_media_resource_columns(
        self,
        by_table: dict[str, dict[str, Any]],
    ) -> list[str]:
        messages: list[str] = []
        for table, metadata in sorted(by_table.items()):
            columns = metadata.get("columns", {})
            if not isinstance(columns, dict):
                continue
            for column in sorted(name for name in columns if isinstance(name, str)):
                if self._is_bare_media_db_column(table, column):
                    messages.append(
                        f"{table}.{column} is a bare media URL column; use MediaResource stable reference fields"
                    )
        return messages

    def _is_bare_media_db_column(self, table: str, column: str) -> bool:
        if column in NON_MEDIA_URL_FIELD_NAMES:
            return False
        if column in BARE_MEDIA_DB_COLUMN_NAMES:
            return True
        return column == "url" and self._has_media_context((table,))

    def _check_frontend_contract_media_resource_fields(self) -> list[str]:
        messages: list[str] = []
        for source in self._frontend_contract_source_paths():
            if not source.exists():
                continue
            payload = self._load_yaml_mapping(source)
            for table, column in self._iter_frontend_required_columns(payload):
                if self._is_bare_media_db_column(table, column):
                    messages.append(
                        f"{source.relative_to(self.root)} required column {table}.{column} is a bare media URL column; use MediaResource stable reference fields"
                    )
            for field_path in self._iter_frontend_schema_field_paths(payload):
                field_name = field_path[-1] if field_path else ""
                if self._is_bare_media_frontend_field(field_name, field_path):
                    messages.append(
                        f"{source.relative_to(self.root)} field {'.'.join(field_path)} is a bare media URL field; use MediaResource"
                    )
            for field_path, schema in self._iter_frontend_schema_property_schemas(payload):
                field_name = field_path[-1] if field_path else ""
                if self._is_plain_natural_media_field(field_name, field_path, schema):
                    messages.append(
                        f"{source.relative_to(self.root)} field {'.'.join(field_path)} must use MediaResource schema"
                    )
        return messages

    def _iter_frontend_required_columns(self, value: Any) -> list[tuple[str, str]]:
        columns: list[tuple[str, str]] = []
        if isinstance(value, dict):
            required_columns = value.get("required_columns")
            if isinstance(required_columns, dict):
                for table, table_columns in required_columns.items():
                    if not isinstance(table, str) or not isinstance(table_columns, list):
                        continue
                    for column in table_columns:
                        if isinstance(column, str):
                            columns.append((table, column))

            for key, child in value.items():
                if key == "required_columns":
                    continue
                columns.extend(self._iter_frontend_required_columns(child))
            return columns

        if isinstance(value, list):
            for item in value:
                columns.extend(self._iter_frontend_required_columns(item))

        return columns

    def _iter_frontend_schema_property_schemas(
        self,
        value: Any,
        field_path: tuple[str, ...] = (),
    ) -> list[tuple[tuple[str, ...], dict[str, Any]]]:
        paths: list[tuple[tuple[str, ...], dict[str, Any]]] = []

        if isinstance(value, dict):
            properties = value.get("properties")
            if isinstance(properties, dict):
                for property_name, property_schema in properties.items():
                    if not isinstance(property_name, str) or not isinstance(property_schema, dict):
                        continue
                    next_path = (*field_path, property_name)
                    paths.append((next_path, property_schema))
                    paths.extend(self._iter_frontend_schema_property_schemas(property_schema, next_path))

            for key, child in value.items():
                if key == "properties":
                    continue
                paths.extend(self._iter_frontend_schema_property_schemas(child, field_path))
            return paths

        if isinstance(value, list):
            for item in value:
                paths.extend(self._iter_frontend_schema_property_schemas(item, field_path))

        return paths

    def _iter_frontend_schema_field_paths(
        self,
        value: Any,
        field_path: tuple[str, ...] = (),
    ) -> list[tuple[str, ...]]:
        paths: list[tuple[str, ...]] = []

        if isinstance(value, dict):
            for field_list_key in ("fields", "derived_fields"):
                fields = value.get(field_list_key)
                if isinstance(fields, list):
                    for field in fields:
                        if isinstance(field, str):
                            paths.append(tuple(part for part in field.split(".") if part))

            properties = value.get("properties")
            if isinstance(properties, dict):
                for property_name, property_schema in properties.items():
                    if not isinstance(property_name, str):
                        continue
                    next_path = (*field_path, property_name)
                    paths.append(next_path)
                    paths.extend(self._iter_frontend_schema_field_paths(property_schema, next_path))

            for key, child in value.items():
                if key in {"fields", "derived_fields", "properties"}:
                    continue
                paths.extend(self._iter_frontend_schema_field_paths(child, field_path))
            return paths

        if isinstance(value, list):
            for item in value:
                paths.extend(self._iter_frontend_schema_field_paths(item, field_path))

        return paths

    def _is_bare_media_frontend_field(self, field_name: str, field_path: tuple[str, ...]) -> bool:
        if field_name in NON_MEDIA_URL_FIELD_NAMES:
            return False
        if field_name in BARE_MEDIA_FRONTEND_FIELD_NAMES:
            return True
        return field_name == "url" and self._has_media_context(field_path[:-1])

    def _is_plain_natural_media_field(
        self,
        field_name: str,
        field_path: tuple[str, ...],
        schema: dict[str, Any],
    ) -> bool:
        if field_name not in MEDIA_RESOURCE_FIELD_NAMES:
            if field_name not in MEDIA_RESOURCE_COLLECTION_FIELD_NAMES:
                return False
            if not self._is_plain_media_resource_collection(field_name, field_path, schema):
                return False
        if self._is_allowed_non_media_resource_field(field_name, field_path, schema):
            return False
        if self._uses_media_resource_schema(schema):
            return False
        return True

    def _is_plain_media_resource_collection(
        self,
        field_name: str,
        field_path: tuple[str, ...],
        schema: dict[str, Any],
    ) -> bool:
        if schema.get("type") != "array":
            return False
        if self._is_allowed_non_media_resource_field(field_name, field_path, schema):
            return False
        items = schema.get("items")
        if not isinstance(items, dict):
            return False
        if items.get("type") == "string":
            return True
        if items.get("$ref") == "#/components/schemas/MediaResource" or items.get("name") == "MediaResource":
            return False
        if items.get("name") == "GenerationHistoryMediaItem":
            return True
        if self._has_media_context(field_path):
            return True
        return False

    def _is_allowed_non_media_resource_field(
        self,
        field_name: str,
        field_path: tuple[str, ...],
        schema: dict[str, Any],
    ) -> bool:
        if field_name == "file" and schema.get("format") == "binary":
            return True
        if field_name == "icon":
            max_length = schema.get("maxLength")
            if isinstance(max_length, int) and max_length <= 128:
                return True
            if isinstance(schema.get("type"), str) and schema.get("type") != "string":
                return True
        if field_name in {"image", "video", "audio"}:
            return "modalities" in field_path or "capabilities" in field_path
        return False

    def _uses_media_resource_schema(self, schema: dict[str, Any]) -> bool:
        if schema.get("$ref") == "#/components/schemas/MediaResource":
            return True
        if schema.get("name") == "MediaResource":
            return True
        if schema.get("type") == "array":
            items = schema.get("items")
            return isinstance(items, dict) and self._uses_media_resource_schema(items)
        for union_key in ("oneOf", "anyOf", "allOf"):
            values = schema.get(union_key)
            if isinstance(values, list) and any(isinstance(item, dict) and self._uses_media_resource_schema(item) for item in values):
                return True
        return False

    def _has_media_context(self, values: tuple[str, ...]) -> bool:
        for value in values:
            normalized = self._normalize_identifier(value)
            tokens = set(filter(None, normalized.split("_")))
            if normalized in MEDIA_CONTEXT_TOKENS or tokens & MEDIA_CONTEXT_TOKENS:
                return True
        return False

    def _normalize_identifier(self, value: str) -> str:
        normalized = re.sub(r"(?<!^)(?=[A-Z])", "_", value).lower()
        return re.sub(r"[^a-z0-9]+", "_", normalized).strip("_")

    def _frontend_contract_source_paths(self) -> list[Path]:
        index_path = self.root / DEFAULT_CONTRACT_INDEX
        if not index_path.is_file():
            return [self.root / DEFAULT_CONTRACT_SNAPSHOT]
        sources = [index_path]
        index = self._load_yaml_mapping(index_path)
        fragments = index.get("fragments", [])
        if isinstance(fragments, list):
            for raw_fragment in fragments:
                fragment_path = self._frontend_contract_fragment_path(index_path, raw_fragment)
                if fragment_path is not None:
                    sources.append(fragment_path)
        return sources

    def _load_yaml_mapping(self, path: Path) -> dict[str, Any]:
        if yaml is None or not path.is_file():
            return {}
        payload = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
        return payload if isinstance(payload, dict) else {}

    def _frontend_contract_fragment_path(self, index_path: Path, raw_fragment: Any) -> Path | None:
        if isinstance(raw_fragment, str):
            raw_path = raw_fragment
        elif isinstance(raw_fragment, dict) and isinstance(raw_fragment.get("path"), str):
            raw_path = raw_fragment["path"]
        else:
            return None
        candidate = Path(raw_path)
        if candidate.is_absolute() or ".." in candidate.parts:
            return None
        return (index_path.parent / candidate).resolve()

    def _check_legacy_identity_standard(
        self,
        data: dict[str, Any],
        by_table: dict[str, dict[str, Any]],
    ) -> list[str]:
        messages: list[str] = []
        for table in sorted(FORBIDDEN_LEGACY_IDENTITY_TABLES):
            if table in by_table:
                messages.append(f"legacy identity table must be removed: {table}")

        for table, metadata in by_table.items():
            foreign_keys = metadata.get("foreign_keys", [])
            if isinstance(foreign_keys, list):
                for foreign_key in foreign_keys:
                    if not isinstance(foreign_key, dict):
                        continue
                    reference = foreign_key.get("references_table")
                    if reference in FORBIDDEN_LEGACY_IDENTITY_TABLES:
                        name = foreign_key.get("name", "<unnamed>")
                        replacement = "iam_user" if reference == "plus_user" else self._iam_identity_table_for(str(reference))
                        messages.append(
                            f"{table} foreign key {name} must reference {replacement} instead of {reference}"
                        )

            messages.extend(self._check_legacy_identity_source_list(table, metadata, "source_tables"))
            policy = metadata.get("projection_policy")
            if isinstance(policy, dict):
                messages.extend(
                    self._check_legacy_identity_source_list(
                        table,
                        policy,
                        "does_not_replace",
                        label="projection_policy.does_not_replace",
                    )
                )

        return messages

    def _check_legacy_identity_source_list(
        self,
        table: str,
        metadata: dict[str, Any],
        key: str,
        *,
        label: str | None = None,
    ) -> list[str]:
        values = metadata.get(key)
        if not isinstance(values, list):
            return []

        messages: list[str] = []
        for value in values:
            if not isinstance(value, str) or value not in FORBIDDEN_LEGACY_IDENTITY_TABLES:
                continue
            replacement = "iam_user" if value == "plus_user" else self._iam_identity_table_for(value)
            messages.append(f"{table} {label or key} must use {replacement} instead of {value}")
        return messages

    def _iam_identity_table_for(self, legacy_table: str) -> str:
        return {
            "plus_api_key": "iam_gateway_api_key",
            "plus_oauth_account": "iam_user_identity",
            "plus_organization": "iam_organization",
            "plus_organization_member": "iam_organization_member",
            "plus_permission": "iam_permission",
            "plus_role": "iam_role",
            "plus_role_permission": "iam_role_permission",
            "plus_tenant": "iam_tenant",
            "plus_user": "iam_user",
            "plus_user_role": "iam_user_role",
        }.get(legacy_table, f"iam_{legacy_table.removeprefix('plus_')}")

    def _check_skills_hub_tables(self, by_table: dict[str, dict[str, Any]]) -> list[str]:
        messages: list[str] = []
        for table in sorted(OBSOLETE_SKILLS_HUB_TABLES):
            metadata = by_table.get(table)
            if metadata is None:
                continue

            messages.append(f"obsolete SkillsHub table remains: {table}")
            routes = metadata.get("frontend_routes", [])
            if isinstance(routes, list):
                for route in routes:
                    if isinstance(route, str) and route in SKILLS_HUB_ROUTES:
                        messages.append(f"{route} still uses obsolete SkillsHub table: {table}")

        return messages

    def _check_domain_names(self, data: dict[str, Any], by_table: dict[str, dict[str, Any]]) -> list[str]:
        domain_names = data.get("domain_names")
        if not isinstance(domain_names, dict):
            return []

        messages: list[str] = []
        for name, definition in domain_names.items():
            if not isinstance(name, str) or not isinstance(definition, dict):
                continue

            persistence = definition.get("persistence", {})
            if isinstance(persistence, dict):
                table = persistence.get("table")
                if isinstance(table, str) and table not in by_table:
                    messages.append(f"{name} persistence table must be registered: {table}")
                if name == "pricing_plan" and table != "ai_pricing_plan":
                    messages.append("pricing_plan persistence table must be ai_pricing_plan")

            if name in DOMAIN_NAMES_REQUIRING_TYPE_BINDINGS:
                type_bindings = definition.get("type_bindings", {})
                if not isinstance(type_bindings, dict):
                    type_bindings = {}
                for target in sorted(TYPE_BINDING_TARGETS):
                    if not type_bindings.get(target):
                        messages.append(f"{name} type_bindings.{target} is required")

            required_codes = DOMAIN_NAME_REQUIRED_CODES.get(name, set())
            if required_codes:
                builtin_codes = self._builtin_codes(definition)
                for code in sorted(required_codes):
                    if code not in builtin_codes:
                        messages.append(f"{name} builtin_values must include {code}")

        return messages

    def _check_pricing_and_billing_contracts(self, by_table: dict[str, dict[str, Any]]) -> list[str]:
        messages: list[str] = []
        for table in sorted(FORBIDDEN_PRICING_TABLES):
            if table in by_table:
                messages.append(f"forbidden pricing table present: {table}")

        for table, required_columns in REQUIRED_TABLE_COLUMNS.items():
            metadata = by_table.get(table)
            if metadata is None:
                continue
            columns = metadata.get("columns", {})
            if not isinstance(columns, dict):
                columns = {}
            for column in sorted(required_columns):
                if column not in columns:
                    messages.append(f"{table} must include column {column}")

        return messages

    def _check_repository_on_conflict_targets(
        self,
        by_table: dict[str, dict[str, Any]],
    ) -> list[str]:
        generated_targets = self._generated_unique_targets()
        if not generated_targets:
            return []

        local_tables = {
            table.casefold()
            for table, metadata in by_table.items()
            if metadata.get("generated_by_this_project") is not False
        }
        messages: list[str] = []
        for path in self._repository_sql_source_paths():
            text = path.read_text(encoding="utf-8", errors="replace")
            inserts = list(INSERT_INTO_RE.finditer(text))
            if not inserts:
                continue

            insert_index = 0
            last_insert: re.Match[str] | None = None
            for conflict in ON_CONFLICT_TARGET_RE.finditer(text):
                while insert_index < len(inserts) and inserts[insert_index].start() < conflict.start():
                    last_insert = inserts[insert_index]
                    insert_index += 1
                if last_insert is None:
                    continue

                table = last_insert.group("table").casefold()
                if table not in local_tables:
                    continue

                columns = self._parse_sql_identifier_list(conflict.group("columns"))
                relative_path = path.relative_to(self.root).as_posix()
                line_number = text.count("\n", 0, conflict.start()) + 1
                if columns is None:
                    messages.append(
                        f"repository SQL {relative_path}:{line_number} ON CONFLICT target for "
                        f"local table {table} must contain plain column identifiers"
                    )
                    continue

                target_where = self._normalize_sql_predicate(conflict.group("where"))
                statement_prefix = text[last_insert.start() : conflict.start()]
                for dialect in self._repository_statement_dialects(
                    path,
                    statement_prefix,
                    generated_targets,
                ):
                    table_targets = generated_targets[dialect].get(table, ())
                    matching_columns = [
                        target
                        for target in table_targets
                        if self._same_column_target(columns, target.columns)
                    ]
                    if any(
                        target.where is None or target.where == target_where
                        for target in matching_columns
                    ):
                        continue

                    dialect_name = "PostgreSQL" if dialect == "postgres" else "SQLite"
                    rendered_columns = ", ".join(columns)
                    if matching_columns:
                        predicates = sorted(
                            {
                                target.where
                                for target in matching_columns
                                if target.where is not None
                            }
                        )
                        rendered_predicates = ", ".join(predicates)
                        messages.append(
                            f"repository SQL {relative_path}:{line_number} ON CONFLICT target "
                            f"{table}({rendered_columns}) does not explicitly match generated "
                            f"{dialect_name} partial UNIQUE predicate(s): {rendered_predicates}"
                        )
                        continue

                    messages.append(
                        f"repository SQL {relative_path}:{line_number} ON CONFLICT target "
                        f"{table}({rendered_columns}) is not backed by a same-table PRIMARY KEY "
                        f"or UNIQUE index in generated {dialect_name} schema"
                    )

        return messages

    def _generated_unique_targets(
        self,
    ) -> dict[str, dict[str, tuple[GeneratedUniqueTarget, ...]]]:
        targets_by_dialect: dict[str, dict[str, tuple[GeneratedUniqueTarget, ...]]] = {}
        for dialect, relative_path in GENERATED_SCHEMA_PATHS.items():
            path = self.root / relative_path
            if not path.exists():
                continue
            targets_by_dialect[dialect] = self._parse_generated_unique_targets(
                path.read_text(encoding="utf-8", errors="replace")
            )
        return targets_by_dialect

    def _parse_generated_unique_targets(
        self,
        ddl: str,
    ) -> dict[str, tuple[GeneratedUniqueTarget, ...]]:
        mutable_targets: dict[str, list[GeneratedUniqueTarget]] = {}

        for table_match in CREATE_TABLE_RE.finditer(ddl):
            table = table_match.group("table").casefold()
            body = table_match.group("body")
            for inline_primary_key in INLINE_PRIMARY_KEY_RE.finditer(body):
                self._append_unique_target(
                    mutable_targets,
                    table,
                    (inline_primary_key.group("column").casefold(),),
                    where=None,
                )
            for pattern in (TABLE_PRIMARY_KEY_RE, TABLE_UNIQUE_RE):
                for table_constraint in pattern.finditer(body):
                    columns = self._parse_sql_identifier_list(table_constraint.group("columns"))
                    if columns is not None:
                        self._append_unique_target(
                            mutable_targets,
                            table,
                            columns,
                            where=None,
                        )

        for index_match in CREATE_UNIQUE_INDEX_RE.finditer(ddl):
            columns = self._parse_sql_identifier_list(index_match.group("columns"))
            if columns is None:
                continue
            self._append_unique_target(
                mutable_targets,
                index_match.group("table").casefold(),
                columns,
                where=self._normalize_sql_predicate(index_match.group("where")),
            )

        return {
            table: tuple(targets)
            for table, targets in mutable_targets.items()
        }

    @staticmethod
    def _append_unique_target(
        targets: dict[str, list[GeneratedUniqueTarget]],
        table: str,
        columns: tuple[str, ...],
        *,
        where: str | None,
    ) -> None:
        target = GeneratedUniqueTarget(columns=columns, where=where)
        table_targets = targets.setdefault(table, [])
        if target not in table_targets:
            table_targets.append(target)

    @staticmethod
    def _parse_sql_identifier_list(value: str) -> tuple[str, ...] | None:
        columns: list[str] = []
        for raw_column in value.split(","):
            column = raw_column.strip()
            match = re.fullmatch(
                r"[\"`\[]?(?P<column>[A-Za-z_][A-Za-z0-9_]*)[\"`\]]?",
                column,
            )
            if match is None:
                return None
            columns.append(match.group("column").casefold())
        if not columns or len(set(columns)) != len(columns):
            return None
        return tuple(columns)

    @staticmethod
    def _normalize_sql_predicate(value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        while (
            normalized.startswith("(")
            and SchemaGuardian._matching_parenthesis(normalized, 0) == len(normalized) - 1
        ):
            normalized = normalized[1:-1].strip()
        normalized = re.sub(
            r"[\"`\[]([A-Za-z_][A-Za-z0-9_]*)[\"`\]]",
            r"\1",
            normalized,
        )
        normalized = re.sub(r"\s+", " ", normalized).strip().casefold()
        return normalized or None

    @staticmethod
    def _same_column_target(left: tuple[str, ...], right: tuple[str, ...]) -> bool:
        return len(left) == len(right) and set(left) == set(right)

    def _repository_statement_dialects(
        self,
        path: Path,
        statement_prefix: str,
        generated_targets: dict[str, dict[str, tuple[GeneratedUniqueTarget, ...]]],
    ) -> tuple[str, ...]:
        relative = path.relative_to(self.root)
        path_tokens = {part.casefold() for part in relative.parts}
        stem = path.stem.casefold()
        if "sqlite" in path_tokens or stem == "sqlite" or stem.startswith("sqlite_"):
            return ("sqlite",) if "sqlite" in generated_targets else ()
        if (
            "postgres" in path_tokens
            or "postgresql" in path_tokens
            or stem in {"postgres", "postgresql"}
            or stem.startswith(("postgres_", "postgresql_"))
        ):
            return ("postgres",) if "postgres" in generated_targets else ()

        has_postgres_placeholders = re.search(r"\$[1-9][0-9]*\b", statement_prefix) is not None
        has_sqlite_placeholders = "?" in statement_prefix
        if has_postgres_placeholders and not has_sqlite_placeholders:
            return ("postgres",) if "postgres" in generated_targets else ()
        if has_sqlite_placeholders and not has_postgres_placeholders:
            return ("sqlite",) if "sqlite" in generated_targets else ()
        return tuple(sorted(generated_targets))

    def _repository_sql_source_paths(self) -> Iterator[Path]:
        for relative_root in SQLITE_SQL_SCAN_ROOTS:
            root = self.root / relative_root
            if not root.exists():
                continue
            yield from self._walk_repository_sql_sources(root)

    def _walk_repository_sql_sources(self, root: Path) -> Iterator[Path]:
        for path in sorted(root.iterdir(), key=lambda candidate: candidate.name.casefold()):
            if path.is_dir():
                if path.name.casefold() in SQLITE_SQL_SCAN_SKIP_DIRECTORIES or path.is_symlink():
                    continue
                yield from self._walk_repository_sql_sources(path)
                continue
            if path.is_file() and path.suffix.casefold() in SQLITE_SQL_SOURCE_SUFFIXES:
                yield path

    def _check_sqlite_logical_decimal_queries(
        self,
        by_table: dict[str, dict[str, Any]],
    ) -> list[str]:
        decimal_columns = self._logical_decimal_columns(by_table)
        if not decimal_columns:
            return []

        messages: list[str] = []
        for path in self._sqlite_sql_source_paths():
            text = path.read_text(encoding="utf-8", errors="replace")
            relative_path = path.relative_to(self.root).as_posix()
            for function_name, start, expression in self._sql_precision_function_calls(text):
                referenced_columns = sorted(
                    decimal_columns.intersection(
                        identifier.casefold()
                        for identifier in SQL_IDENTIFIER_RE.findall(expression)
                    )
                )
                if not referenced_columns:
                    continue

                line_number = text.count("\n", 0, start) + 1
                columns = ", ".join(referenced_columns)
                if function_name in {"sum", "avg"}:
                    replacement = "sdkwork_decimal_sum(...)"
                    if function_name == "avg":
                        replacement += " with exact decimal division"
                    messages.append(
                        f"SQLite SQL {relative_path}:{line_number} uses native "
                        f"{function_name.upper()} on logical decimal column(s) {columns}; "
                        f"use {replacement}"
                    )
                    continue

                if SQL_CAST_AS_REAL_RE.search(expression):
                    messages.append(
                        f"SQLite SQL {relative_path}:{line_number} casts logical decimal "
                        f"column(s) {columns} AS REAL; use sdkwork_decimal_order_key(...)"
                    )

        return messages

    @staticmethod
    def _logical_decimal_columns(by_table: dict[str, dict[str, Any]]) -> set[str]:
        columns: set[str] = set()
        for metadata in by_table.values():
            table_columns = metadata.get("columns")
            if not isinstance(table_columns, dict):
                continue
            for column, logical_type in table_columns.items():
                if (
                    isinstance(column, str)
                    and column.strip()
                    and SchemaGuardian._is_logical_decimal_type(logical_type)
                ):
                    columns.add(column.strip().casefold())
        return columns

    @staticmethod
    def _is_logical_decimal_type(logical_type: Any) -> bool:
        if isinstance(logical_type, dict):
            logical_type = logical_type.get("type", logical_type.get("logical_type"))
        if not isinstance(logical_type, str):
            return False
        normalized = logical_type.strip().casefold()
        return normalized == "decimal" or normalized.startswith("decimal(")

    def _sqlite_sql_source_paths(self) -> Iterator[Path]:
        for relative_root in SQLITE_SQL_SCAN_ROOTS:
            root = self.root / relative_root
            if not root.exists():
                continue
            yield from self._walk_sqlite_sql_sources(root)

    def _walk_sqlite_sql_sources(self, root: Path) -> Iterator[Path]:
        for path in sorted(root.iterdir(), key=lambda candidate: candidate.name.casefold()):
            if path.is_dir():
                if path.name.casefold() in SQLITE_SQL_SCAN_SKIP_DIRECTORIES or path.is_symlink():
                    continue
                yield from self._walk_sqlite_sql_sources(path)
                continue
            if not path.is_file() or path.suffix.casefold() not in SQLITE_SQL_SOURCE_SUFFIXES:
                continue
            if self._is_sqlite_sql_source(path):
                yield path

    def _is_sqlite_sql_source(self, path: Path) -> bool:
        relative = path.relative_to(self.root)
        directory_parts = {part.casefold() for part in relative.parts[:-1]}
        stem = path.stem.casefold()
        return (
            "sqlite" in directory_parts
            or stem == "sqlite"
            or stem.startswith("sqlite_")
            or stem.endswith("_sqlite")
        )

    @staticmethod
    def _sql_precision_function_calls(text: str) -> Iterator[tuple[str, int, str]]:
        for match in SQL_PRECISION_FUNCTION_RE.finditer(text):
            opening_parenthesis = match.end() - 1
            closing_parenthesis = SchemaGuardian._matching_parenthesis(text, opening_parenthesis)
            if closing_parenthesis is None:
                continue
            yield (
                match.group("name").casefold(),
                match.start(),
                text[opening_parenthesis + 1 : closing_parenthesis],
            )

    @staticmethod
    def _matching_parenthesis(text: str, opening_parenthesis: int) -> int | None:
        depth = 0
        quote: str | None = None
        index = opening_parenthesis
        while index < len(text):
            character = text[index]
            if quote is not None:
                if character == "\\":
                    index += 2
                    continue
                if character == quote:
                    if index + 1 < len(text) and text[index + 1] == quote:
                        index += 2
                        continue
                    quote = None
                index += 1
                continue

            if character in {"'", '"'}:
                quote = character
            elif character == "(":
                depth += 1
            elif character == ")":
                depth -= 1
                if depth == 0:
                    return index
            index += 1

        return None

    def _check_messaging_delivery_standard(self, by_table: dict[str, dict[str, Any]]) -> list[str]:
        messages: list[str] = []
        has_messaging_table = False

        for table, metadata in by_table.items():
            domain = metadata.get("domain")
            if table.startswith("messaging_") or domain == "messaging":
                has_messaging_table = True
                if not table.startswith("messaging_") or domain != "messaging":
                    messages.append(
                        f"external messaging table must use messaging_* prefix and messaging domain: {table}"
                    )
                continue

            if table.startswith("ops_notification_"):
                continue
            if table.startswith("notification_") or domain == "notification":
                if any(token in table for token in MESSAGING_TABLE_NAME_TOKENS):
                    messages.append(
                        f"external messaging table must use messaging_* prefix and messaging domain: {table}"
                    )

        if has_messaging_table:
            for table in MESSAGING_STANDARD_TABLES:
                if table not in by_table:
                    messages.append(f"messaging standard table is required: {table}")

        return messages

    def _check_projection_source_contracts(self, by_table: dict[str, dict[str, Any]]) -> list[str]:
        messages: list[str] = []
        for table, metadata in by_table.items():
            if not self._is_projection_table(metadata):
                continue

            if metadata.get("system_of_record") is not False:
                messages.append(f"{table} projection table must set system_of_record: false")

            write_owner = metadata.get("write_owner")
            if not isinstance(write_owner, str) or not write_owner.strip():
                messages.append(f"{table} projection table must declare write_owner")

            source_tables = metadata.get("source_tables", [])
            source_refs = metadata.get("source_refs", [])
            if not isinstance(source_tables, list):
                messages.append(f"{table} source_tables must be a list")
                source_tables = []
            if not isinstance(source_refs, list):
                messages.append(f"{table} source_refs must be a list")
                source_refs = []

            source_table_names = [
                source.strip()
                for source in source_tables
                if isinstance(source, str) and source.strip()
            ]
            source_ref_names: list[str] = []
            for source_ref in source_refs:
                if isinstance(source_ref, str) and source_ref.strip():
                    source_ref_names.append(source_ref.strip())
                    continue
                if isinstance(source_ref, dict):
                    module_id = source_ref.get("module_id")
                    source_table = source_ref.get("table")
                    if (
                        isinstance(module_id, str)
                        and module_id.strip()
                        and isinstance(source_table, str)
                        and source_table.strip()
                    ):
                        source_ref_names.append(f"{module_id.strip()}:{source_table.strip()}")
                        continue
                messages.append(f"{table} source_refs entries must declare module_id and table")

            if not source_table_names and not source_ref_names:
                messages.append(f"{table} projection table must declare source_tables or source_refs")

            for source in source_table_names:
                if source not in by_table:
                    messages.append(f"{table} source_tables references unregistered table {source}")
                    continue
                if by_table[source].get("domain") == "legacy" and not self._declares_non_replacement(metadata, source):
                    messages.append(
                        f"{table} projection over legacy table {source} must declare projection_policy.does_not_replace"
                    )

            if metadata.get("imported") is True or metadata.get("generated_by_this_project") is False:
                continue

            semantic_contracts = metadata.get("semantic_contracts")
            lineage = (
                semantic_contracts.get("projection_lineage")
                if isinstance(semantic_contracts, dict)
                else None
            )
            if not isinstance(lineage, dict):
                messages.append(f"{table} projection table must declare semantic_contracts.projection_lineage")
                continue

            watermark = lineage.get("watermark")
            if not self._has_non_empty_string_fields(watermark, "field", "strategy"):
                messages.append(
                    f"{table} projection_lineage.watermark must declare field and strategy"
                )

            source_version = lineage.get("source_version")
            if not self._has_non_empty_string_fields(source_version, "field"):
                messages.append(f"{table} projection_lineage.source_version must declare field")

            algorithm_version = lineage.get("algorithm_version")
            if not isinstance(algorithm_version, str) or not algorithm_version.strip():
                messages.append(
                    f"{table} projection_lineage.algorithm_version must be a non-empty string"
                )

            freshness = lineage.get("freshness")
            target_seconds = freshness.get("target_seconds") if isinstance(freshness, dict) else None
            max_staleness_seconds = (
                freshness.get("max_staleness_seconds") if isinstance(freshness, dict) else None
            )
            if (
                not isinstance(target_seconds, int)
                or isinstance(target_seconds, bool)
                or target_seconds <= 0
                or not isinstance(max_staleness_seconds, int)
                or isinstance(max_staleness_seconds, bool)
                or max_staleness_seconds <= 0
            ):
                messages.append(
                    f"{table} projection_lineage.freshness must declare positive "
                    "target_seconds and max_staleness_seconds"
                )
            elif max_staleness_seconds < target_seconds:
                messages.append(
                    f"{table} projection_lineage.freshness max_staleness_seconds must be "
                    "greater than or equal to target_seconds"
                )

            rebuild = lineage.get("rebuild")
            if not self._has_non_empty_string_fields(rebuild, "strategy", "owner"):
                messages.append(f"{table} projection_lineage.rebuild must declare strategy and owner")

            aggregation_grain = lineage.get("aggregation_grain")
            if (
                not isinstance(aggregation_grain, list)
                or not aggregation_grain
                or any(not isinstance(column, str) or not column.strip() for column in aggregation_grain)
            ):
                messages.append(
                    f"{table} projection_lineage.aggregation_grain must be a non-empty string list"
                )

        return messages

    def _is_projection_table(self, metadata: dict[str, Any]) -> bool:
        return metadata.get("profile") in {"projection", "read_model", "search_index"} or metadata.get(
            "common_columns"
        ) == "projection"

    @staticmethod
    def _has_non_empty_string_fields(value: Any, *fields: str) -> bool:
        return isinstance(value, dict) and all(
            isinstance(value.get(field), str) and value[field].strip()
            for field in fields
        )

    def _declares_non_replacement(self, metadata: dict[str, Any], source: str) -> bool:
        policy = metadata.get("projection_policy")
        if isinstance(policy, dict):
            value = policy.get("does_not_replace")
            if isinstance(value, list):
                return source in value or "*" in value
            return value == source or value == "*" or value is True
        if isinstance(policy, str):
            return "does_not_replace" in policy
        return False

    def _builtin_codes(self, definition: dict[str, Any]) -> set[str]:
        values = definition.get("builtin_values", [])
        if not isinstance(values, list):
            return set()

        codes: set[str] = set()
        for value in values:
            if isinstance(value, dict) and isinstance(value.get("code"), str):
                codes.add(value["code"])
        return codes

    def _check_api_prefixes(self, data: dict[str, Any]) -> list[str]:
        prefixes = data.get("schema_registry", {}).get("api_prefixes")
        if not isinstance(prefixes, dict):
            return []

        return []

    def _check_table_naming_guardrails(
        self,
        data: dict[str, Any],
        by_table: dict[str, dict[str, Any]],
    ) -> list[str]:
        naming = data.get("schema_registry", {}).get("naming_guardrails", {})
        forbidden_prefixes = naming.get("forbidden_new_prefixes", [])
        if not isinstance(forbidden_prefixes, list):
            return ["naming_guardrails.forbidden_new_prefixes must be a list"]

        forbidden = {prefix for prefix in forbidden_prefixes if isinstance(prefix, str)}
        messages: list[str] = []
        for table, metadata in by_table.items():
            if metadata.get("domain") == "legacy":
                continue
            prefix = table.split("_", 1)[0]
            if prefix in forbidden:
                messages.append(f"forbidden new table prefix present: {table}")
        return messages

    def _check_frontend_route_api_surfaces(self, by_table: dict[str, dict[str, Any]]) -> list[str]:
        messages: list[str] = []
        for table, metadata in by_table.items():
            routes = metadata.get("frontend_routes", [])
            if not isinstance(routes, list) or not routes:
                continue

            api_surfaces = metadata.get("api_surfaces", [])
            if not isinstance(api_surfaces, list):
                api_surfaces = []
            surfaces = {surface for surface in api_surfaces if isinstance(surface, str)}

            for route in routes:
                if not isinstance(route, str):
                    continue
                if route.startswith("/admin"):
                    if "backend" not in surfaces:
                        messages.append(f"{route} on {table} requires backend api_surface")
                elif "app" not in surfaces:
                    messages.append(f"{route} on {table} requires app api_surface")

        return messages


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate sdkwork-clawrouter schema registry guardrails.")
    parser.add_argument("--root", type=Path, default=Path.cwd(), help="sdkwork-clawrouter root directory")
    parser.add_argument("--registry", type=Path, default=None, help="schema registry YAML path")
    parser.add_argument("--test-schema", type=Path, default=None, help="Rust integration test schema source path")
    args = parser.parse_args()

    result = SchemaGuardian(root=args.root, registry_path=args.registry, test_schema_path=args.test_schema).run()
    if result.ok:
        print("Schema guardian passed")
        return 0

    for message in result.messages:
        print(message)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
