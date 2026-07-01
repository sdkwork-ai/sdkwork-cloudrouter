from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from tools.frontend_contract_loader import default_frontend_contract_path, load_frontend_field_contract

try:
    import yaml
except ImportError as exc:  # pragma: no cover - exercised only on missing tooling
    yaml = None
    _YAML_IMPORT_ERROR = exc
else:
    _YAML_IMPORT_ERROR = None


@dataclass(frozen=True)
class FrontendContractResult:
    ok: bool
    messages: list[str]


class FrontendContractGuardian:
    """Validate that the actual portal routes have explicit schema coverage contracts."""

    APPBASE_REQUIRED_TABLES = frozenset(
        {
            "commerce_vip_entitlement",
            "commerce_vip_entitlement_usage",
            "commerce_vip_level",
            "commerce_vip_package",
            "commerce_vip_package_group",
            "drive_acl_entry",
            "drive_change_log",
            "drive_node",
            "drive_space",
            "file_audit_log",
            "file_binding",
            "file_metadata_common",
            "file_node",
            "file_security_scan",
            "file_slot_definition",
            "file_version",
            "object_blob",
            "object_bucket",
            "object_provider",
            "object_tag",
            "storage_default_bucket_policy",
            "storage_gc_job",
            "storage_quota_policy",
            "storage_reconciliation_run",
            "storage_usage_counter",
            "storage_usage_ledger",
            "storage_usage_snapshot",
            "iam_oauth_account_link",
            "iam_oauth_authorization_state",
            "iam_oauth_callback_event",
            "iam_oauth_claim_mapping",
            "iam_oauth_client",
            "iam_oauth_diagnostic_run",
            "iam_oauth_flow_config",
            "iam_oauth_grant",
            "iam_oauth_integration",
            "iam_oauth_operational_resource",
            "iam_oauth_operator_platform",
            "iam_oauth_policy",
            "iam_oauth_provider_catalog",
            "iam_oauth_resource_account",
            "iam_oauth_resource_authorization",
            "iam_oauth_scope_profile",
            "iam_oauth_secret",
            "iam_oauth_surface",
            "iam_oauth_tenant_binding",
            "iam_oauth_webhook_config",
            "upload_part",
        }
    )
    ROUTE_PATTERN = re.compile(r"<Route\b([^>]*)>")
    PATH_PATTERN = re.compile(r'\bpath\s*=\s*"([^"]+)"')
    IMPORT_PATTERN = re.compile(r'^\s*import\s+(?:[^"\']+\s+from\s+)?["\']([^"\']+)["\']', re.MULTILINE)
    COMMONS_ROOT_NAMED_IMPORT_PATTERN = re.compile(
        r"^\s*import\s+(?:type\s+)?(?:[^{}\n]+,\s*)?\{(?P<imports>[\s\S]*?)\}\s+from\s+"
        r"['\"]@sdkwork/clawroutes-pc-commons['\"]",
        re.MULTILINE,
    )
    EXPORT_ALL_PATTERN = re.compile(r"^\s*export\s+\*\s+from\s+['\"](?P<module>[^'\"]+)['\"]", re.MULTILINE)
    LAZY_ROUTE_PATTERN = re.compile(
        r"^\s*const\s+([A-Za-z_$][\w$]*)\s*=\s*"
        r"(?:lazyRoute(?:<[^>]+>)?|React\.lazy)\s*\(\s*"
        r"\(\)\s*=>\s*import\(\s*['\"]([^'\"]+)['\"]\s*\)",
        re.MULTILINE,
    )
    ROUTE_ELEMENT_COMPONENT_PATTERN = re.compile(r"\belement\s*=\s*\{\s*<\s*([A-Z][A-Za-z0-9_$]*)\b")
    RUNTIME_NETWORK_CLIENT_PATTERN = re.compile(
        r"\bfetch\s*\("
        r"|\baxios(?:\s*\(|\.[A-Za-z_$][\w$]*\s*\()"
        r"|\bnew\s+XMLHttpRequest\s*\("
        r"|\bgetClawRouterAppSdkClient\s*\("
        r"|\bgetClawRouterBackendSdkClient\s*\("
        r"|^\s*import\s+(?:[^'\"]+\s+from\s+)?['\"]axios['\"]",
        re.MULTILINE,
    )
    BROWSER_FETCH_CALL_PATTERN = re.compile(r"\bfetch\s*\(\s*([^,\)\n]+)")
    NODE_ONLY_BROWSER_PACKAGES = frozenset({"sdkwork-code-generator"})
    ROUTE_PACKAGE_PREFIX = "@sdkwork/clawrouter-"
    ROUTE_PACKAGE_PREFIXES = ("@sdkwork/clawrouter-", "sdkwork-clawrouter-")
    STATIC_ROUTE_IMPORT_ALLOWLIST = frozenset(
        {
            "@sdkwork/clawroutes-pc-commons",
            "@sdkwork/clawrouter-pc-shell",
            "@sdkwork/clawrouter-pc-console-shell",
            "@sdkwork/clawrouter-pc-admin-shell",
        }
    )
    APP_SHELL_LAYOUT_RELATIVE = (
        "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-shell/src/AppShellLayout.tsx"
    )
    COMMERCE_HOST_MOUNT_COMPONENTS = frozenset(
        {
            "ClawRouterConsoleBusinessHostRoutes",
            "SdkworkWalletPage",
        }
    )
    COMMERCE_HOST_MOUNT_RELATIVE = "apps/sdkwork-clawrouter-pc/src/console-business/consoleBusinessHostMount.tsx"
    COMMERCE_HOST_CATALOG_RELATIVES = (
        # REMOVED: sdkwork-commerce reference
    )
    COMMERCE_HOST_ROUTE_PREFIX_PATTERN = re.compile(
        r"export\s+const\s+[A-Z0-9_]+\s*=\s*['\"]([^'\"]+)['\"]"
    )
    COMMERCE_HOST_CATALOG_SEGMENT_PATTERN = re.compile(r"segment:\s*['\"]([^'\"]+)['\"]")
    COMMERCE_HOST_LOGICAL_ROUTE_PATTERN = re.compile(r"['\"](/console/[^'\"]+)['\"]")
    COMMERCE_HOST_ROUTE_PACKAGES = {
        "wallet": "@sdkwork/account-pc-wallet",
        "memberships": "@sdkwork/membership-pc-membership",
        "checkout": "@sdkwork/payment-pc-payment",
        "payment": "@sdkwork/payment-pc-payment",
    }
    BROWSER_SOURCE_EXTENSIONS = frozenset({".ts", ".tsx", ".js", ".jsx"})
    BROWSER_SOURCE_EXCLUDED_DIRECTORIES = frozenset(
        {
            ".git",
            ".turbo",
            ".vite",
            "coverage",
            "dist",
            "node_modules",
        }
    )
    VITE_LOCAL_ROUTE_CHUNK_MESSAGE = (
        "portal Vite manualChunks must split local sdkwork-clawrouter route packages before generic vendor chunks"
    )
    PORTAL_NODE_SERVER_FORBIDDEN_MESSAGE = (
        "portal Node server runtime is forbidden; serve portal static and forwarding through Rust edge server"
    )
    PORTAL_SERVER_SCRIPT_FORBIDDEN_MESSAGE = (
        "portal package scripts must not reference server.ts, dist/server.mjs, build-server.mjs, or smoke-production-server.mjs"
    )
    PORTAL_BUILD_SERVER_FORBIDDEN_MESSAGE = (
        "portal build script must build only Vite portal artifacts and must not build a Node server"
    )
    BUSINESS_API_PREFIX_BOUNDARY_MESSAGE = (
        "portal business API prefixes must be isolated to sdkwork-clawroutes-pc-commons SDK boundary files"
    )
    BUSINESS_RAW_HTTP_MESSAGE = (
        "portal remote business calls must go through service -> generated SDK clients, not raw fetch/axios/XMLHttpRequest"
    )
    GENERATED_SDK_VALUE_IMPORT_BOUNDARY_MESSAGE = (
        "portal packages must value-import generated SDK clients only from sdkwork-clawroutes-pc-commons SDK boundary files"
    )
    GENERATED_SDK_CLIENT_CONSTRUCTION_BOUNDARY_MESSAGE = (
        "portal packages must construct generated SDK clients only in sdkwork-clawroutes-pc-commons SDK boundary files"
    )
    GENERATED_SDK_CLIENT_BOUNDARY_MESSAGE = (
        "sdkwork-clawroutes-pc-commons/src/sdk-clients.ts must construct generated app, backend, and AI SDK clients"
    )
    GENERATED_SDK_CLIENT_OPTIONS_BOUNDARY_MESSAGE = (
        "sdkwork-clawroutes-pc-commons/src/sdk-clients.ts must expose separate app/backend/AI SDK option types "
        "without manual header/baseUrl escape hatches"
    )
    COMMONS_RUNTIME_IMPORT_BOUNDARY_MESSAGE = (
        "portal business service files must import runtime helpers from "
        "sdkwork-clawroutes-pc-commons/runtime instead of the commons UI root"
    )
    COMMONS_UI_ROOT_RUNTIME_IMPORT_BOUNDARY_MESSAGE = (
        "portal browser source must import runtime helpers from "
        "sdkwork-clawroutes-pc-commons/runtime instead of the commons UI root"
    )
    COMMONS_UI_ROOT_RUNTIME_EXPORT_BOUNDARY_MESSAGE = (
        "sdkwork-clawroutes-pc-commons root must not re-export runtime modules; use "
        "sdkwork-clawroutes-pc-commons/runtime for runtime helpers"
    )
    GENERATED_SDK_RESULT_DATA_BOUNDARY_MESSAGE = (
        "portal business service files must read generated SDK results through "
        "sdkwork-clawroutes-pc-commons/runtime helpers instead of result.data"
    )
    ADMIN_SESSION_TOKEN_BOUNDARY_MESSAGE = (
        "portal admin services must let sdkwork-clawroutes-pc-commons/src/sdk-clients.ts inject session tokens"
    )
    RUNTIME_API_BASE_URL_BOUNDARY_MESSAGE = (
        "portal runtime API base URL defaults must stay same-origin and must not fall back to external domains"
    )
    TOOL_API_ENDPOINTS = ("/api/code-snippet", "/api/generate-sdk", "/api/sdk-readme")
    LOCAL_OPENAPI_SNAPSHOT_ENDPOINT = "/openapi.json"
    LOCAL_OPENAPI_SCHEMA_TABS_ENDPOINT = "/openapi/schema-tabs.json"
    EXTERNAL_RUNTIME_REQUEST_ENDPOINT = "external_runtime_request"
    LOCAL_TOOL_BROWSER_PURPOSES = {
        LOCAL_OPENAPI_SNAPSHOT_ENDPOINT: "local_openapi_snapshot",
        LOCAL_OPENAPI_SCHEMA_TABS_ENDPOINT: "local_openapi_snapshot",
        EXTERNAL_RUNTIME_REQUEST_ENDPOINT: "explicit_api_playground_request",
        **{endpoint: "local_tool_api" for endpoint in TOOL_API_ENDPOINTS},
    }
    BUSINESS_RANDOM_PATTERN = re.compile(r"\bMath\s*\.\s*random\s*\(")
    GENERATED_SDK_VALUE_IMPORT_PATTERN = re.compile(
        r"^\s*import\s+(?!type\b)(?P<imports>[\s\S]*?)\s+from\s+['\"]"
        r"(?P<module>@sdkwork/clawrouter-(?:app|backend|open)-sdk)['\"]",
        re.MULTILINE,
    )
    GENERATED_SDK_CLIENT_CONSTRUCTION_PATTERN = re.compile(r"\bnew\s+Sdkwork(?:App|Backend|Ai)Client\s*\(")
    GENERATED_SDK_RESULT_DATA_PATTERN = re.compile(
        r"\b(?:result|response|data)\s*\.\s*data\b"
    )
    LOCAL_RUNTIME_ADAPTER_IMPORT_PATTERN = re.compile(
        r"(?:from\s+|import\s*\(\s*)['\"](\.{1,2}/[^'\"]*RuntimeApiOperations(?:\.[cm]?[tj]sx?)?)['\"]"
    )
    DEPENDENCY_SDK_BOUNDARY_TOKENS = {
        # REMOVED: commerce tokens (sdkwork-commerce repository dissolved)
        "iam": {
            "getSdkworkAppbaseAppSdkClient",
            "getSdkworkAppbaseBackendSdkClient",
            "getClawRouterIamRuntime",
            "createSdkworkAppbasePcAuthRuntime",
            "createSdkworkIamRuntimeAuthController",
            "@sdkwork/auth-runtime-pc-react",
            "@sdkwork/auth-pc-react",
        },
        "auth": {
            "getSdkworkAppbaseAppSdkClient",
            "getClawRouterIamRuntime",
            "createSdkworkAppbasePcAuthRuntime",
            "createSdkworkIamRuntimeAuthController",
            "@sdkwork/auth-runtime-pc-react",
            "@sdkwork/auth-pc-react",
        },
        "appbase": {
            "getSdkworkAppbaseAppSdkClient",
            "getSdkworkAppbaseBackendSdkClient",
            "getClawRouterIamRuntime",
            "createSdkworkAppbasePcAuthRuntime",
            "createSdkworkIamRuntimeAuthController",
        },
        "generations": {
            "getSdkworkGenerationsAppSdkClient",
            "createSdkworkGenerationService",
            "SdkworkGenerationService",
            "@sdkwork/generation-pc-react",
            "@sdkwork/generations-pc-react",
            "@sdkwork/generations-pc-workspace",
        },
        "notification": {
            "createPortalNotificationService",
            "NotificationService",
            "@sdkwork/notification-pc-react",
        },
        "models": {
            "getModelsBackendSdkClient",
            "getModelsAppSdkClient",
            "@sdkwork/models-backend-sdk",
            "@sdkwork/models-app-sdk",
        },
        "agent": {
            "getSdkworkAgentBackendSdkClient",
            "@sdkwork/agent-backend-sdk",
        },
        "drive": {
            "getSdkworkDriveAppSdkClient",
            "getSdkworkDriveBackendSdkClient",
            "@sdkwork/drive-app-sdk",
            "@sdkwork/drive-backend-sdk",
        },
        "prompts": {
            "getSdkworkPromptsBackendSdkClient",
            "@sdkwork/prompts-backend-sdk",
        },
    }
    BUSINESS_API_PREFIXES = ("/app/v3/api", "/backend/v3/api")
    SDK_CLIENT_BOUNDARY_FILE = (
        "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawroutes-pc-commons/src/sdk-clients.ts"
    )
    SDK_CLIENT_BOUNDARY_FILES = frozenset(
        {
            "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawroutes-pc-commons/src/sdk-clients.ts",
            "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawroutes-pc-commons/src/runtime.ts",
        }
    )
    COMMONS_UI_ROOT_FILE = "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawroutes-pc-commons/src/index.ts"
    COMMONS_RUNTIME_ONLY_SYMBOLS = frozenset(
        {
            "API_BASE_URL",
            "APP_API_PREFIX",
            "BACKEND_API_PREFIX",
            "OPEN_API_PREFIX",
            "CLAWROUTER_APP_SDK_REFERENCE_METADATA",
            "CLAWROUTER_BACKEND_SDK_REFERENCE_METADATA",
            "CLAWROUTER_AI_SDK_REFERENCE_METADATA",
            "ClawRouterAppSdkClientOptions",
            "ClawRouterBackendSdkClientOptions",
            "ClawRouterAiSdkClientOptions",
            "ClawRouterGeneratedSdkMetadata",
            "ClawRouterGeneratedSdkType",
            "ApiRecord",
            "clearAppSession",
            "clearStoredAppSessionToken",
            "createClawRouterAppSdkClient",
            "createClawRouterAppSdkModelExample",
            "createClawRouterBackendSdkClient",
            "createClawRouterAiSdkClient",
            "createClientOperationToken",
            "createIdempotencyParams",
            "decimalNumber",
            "ensurePlusApiSuccess",
            "formatDecimalAmount",
            "getClawRouterAppSdkClient",
            "getClawRouterBackendSdkClient",
            "getClawRouterAiSdkClient",
            "getLoadErrorMessage",
            "getStoredAppSessionToken",
            "isRecord",
            "loadStoredAppSessionToken",
            "readApiData",
            "readApiItem",
            "readApiItems",
            "readApiRecord",
            "readBoolean",
            "readClawRouterRuntimeEnv",
            "readDecimalString",
            "readNullableString",
            "readNumber",
            "readRecordArray",
            "readString",
            "readStringArray",
            "resetClawRouterSdkClients",
            "resetSiteBrandingCache",
            "resolveClawRouterRuntimeBoolean",
            "storeAppSessionFromResult",
            "sumDecimalStrings",
            "syntaxHighlightJson",
            "applySiteBrandingToDocument",
            "fetchSiteBranding",
            "getCachedSiteBranding",
            "useSiteBranding",
        }
    )
    COMMONS_RUNTIME_MODULE_REEXPORTS = frozenset(
        {
            "./api-result",
            "./app-session-token",
            "./decimal",
            "./load-error",
            "./idempotency",
            "./sdk-clients",
            "./sessionService",
            "./siteBranding",
            "./utils",
            "./utils/index",
            "./utils/env",
        }
    )
    RAW_BROWSER_NETWORK_ALLOWLIST = frozenset(
        {
            "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-core/src/index.ts",
            "sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/apiReferenceSchemaTabs.ts",
            "sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/codeSnippetClient.ts",
            "sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/components/ApiPlayground.tsx",
        }
    )
    DOCUMENTS_RUNTIME_BOUNDARY_FILES = frozenset(
        {
            "sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-commons/src/documents-reference-runtime.tsx",
            "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawroutes-pc-commons/src/documents-reference-runtime-adapter.ts",
        }
    )
    EXTERNAL_DEPENDENCY_SDK_FAMILIES_WITHOUT_LOCAL_OPERATIONS = frozenset(
        {
            "sdkwork-documents-app-sdk",
            "sdkwork-iam-app-sdk",
            "sdkwork-iam-backend-sdk",
            "sdkwork-clawrouter-app-sdk",
            "sdkwork-clawrouter-backend-sdk",
        }
    )
    WORKSPACE_DOCUMENTS_PACKAGE_SRC: dict[str, str] = {
        "@sdkwork/documents-pc-api-reference": "sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src",
        "@sdkwork/documents-pc-sdk-reference": "sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-sdk-reference/src",
        "@sdkwork/documents-pc-commons": "sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-commons/src",
    }
    FORBIDDEN_PORTAL_SERVER_FILES = (
        "server.ts",
        "server.test.ts",
        "scripts/build-server.mjs",
        "scripts/smoke-production-server.mjs",
    )
    FORBIDDEN_PORTAL_SERVER_SCRIPT_TOKENS = (
        "server.ts",
        "dist/server.mjs",
        "build-server.mjs",
        "smoke-production-server.mjs",
    )
    ROUTE_CLASSIFICATION_SCHEMA = "sdkwork-clawrouter-frontend-route-classification"
    ALLOWED_DELIVERY_KINDS = frozenset(
        {
            "sdk_backed_business_runtime",
            "schema_provenanced_content",
            "local_developer_tool_api",
            "composed_local_mount",
        }
    )
    ALLOWED_STATIC_DELIVERY_MODES = frozenset(
        {
            "curated_seed_content",
            "generated_reference_snapshot",
            "published_catalog_snapshot",
        }
    )
    ALLOWED_STATIC_REFRESH_POLICIES = frozenset(
        {
            "manual_content_release",
            "schema_registry_regeneration",
            "scheduled_snapshot_import",
        }
    )
    ALLOWED_STATIC_STALENESS = frozenset(
        {
            "release_bound",
            "daily_snapshot",
            "weekly_snapshot",
        }
    )
    ALLOWED_STATIC_UPGRADE_TRIGGERS = frozenset(
        {
            "user_personalization",
            "tenant_specific_data",
            "billing_or_pricing_decision",
            "provider_availability",
            "realtime_ranking",
            "authoring_workflow",
            "compliance_review",
        }
    )
    ISO_DATE_OR_DATETIME_PATTERN = re.compile(
        r"^\d{4}-\d{2}-\d{2}(?:[T ][0-2]\d:[0-5]\d:[0-5]\d(?:\.\d{1,6})?(?:Z|[+-][0-2]\d:[0-5]\d)?)?$"
    )
    SOURCE_HASH_PATTERN = re.compile(r"^sha256:[0-9a-f]{64}$")
    STATIC_SOURCE_MANIFEST_SCHEMA = "sdkwork-clawrouter-frontend-static-source-manifest"
    DEPENDENCY_OPERATION_FRAGMENTS = (
        Path("docs")
        / "schema-registry"
        / "frontend-field-contracts"
        / "operations"
        / "app-commerce-catalog.yaml",
        Path("docs")
        / "schema-registry"
        / "frontend-field-contracts"
        / "operations"
        / "backend-commerce-catalog.yaml",
    )
    STATIC_SOURCE_METADATA_LABELS = {
        "curated_seed_content": "curated seed",
        "generated_reference_snapshot": "generated reference",
        "published_catalog_snapshot": "published catalog",
    }

    def __init__(
        self,
        root: Path,
        app_path: Path | None = None,
        manifest_path: Path | None = None,
        contract_path: Path | None = None,
        route_classification_path: Path | None = None,
        static_source_manifest_path: Path | None = None,
        require_route_classification: bool = False,
    ) -> None:
        self.root = Path(root).resolve()
        self.app_path = (
            Path(app_path).resolve()
            if app_path is not None
            else self.root / "apps" / "sdkwork-clawrouter-pc" / "src" / "App.tsx"
        )
        self.manifest_path = (
            Path(manifest_path).resolve()
            if manifest_path is not None
            else self.root / "generated" / "schema" / "manifest" / "schema-manifest.json"
        )
        self.contract_path = (
            Path(contract_path).resolve()
            if contract_path is not None
            else default_frontend_contract_path(self.root)
        )
        self.route_classification_path = (
            Path(route_classification_path).resolve()
            if route_classification_path is not None
            else self.root / "docs" / "schema-registry" / "frontend-route-classification.yaml"
        )
        self.static_source_manifest_path = (
            Path(static_source_manifest_path).resolve()
            if static_source_manifest_path is not None
            else self.root / "generated" / "schema" / "frontend" / "frontend-static-source-manifest.json"
        )
        self.require_route_classification = require_route_classification
        self.portal_root = self.root / "apps" / "sdkwork-clawrouter-pc"
        self.vite_config_path = self.portal_root / "vite.config.ts"
        self.portal_package_path = self.portal_root / "package.json"

    def _resolve_workspace_sibling_path(self, relative_path: str) -> Path:
        nested = (self.root / relative_path).resolve()
        if nested.exists():
            return nested
        return (self.root.parent / relative_path).resolve()

    def run(self) -> FrontendContractResult:
        messages: list[str] = []

        try:
            actual_routes = set(self.extract_portal_routes())
        except FileNotFoundError as exc:
            return FrontendContractResult(ok=False, messages=[str(exc)])

        manifest = self._load_manifest()
        routes = manifest.get("routes", {})
        if not isinstance(routes, dict):
            routes = {}

        tables = manifest.get("tables", [])
        if not isinstance(tables, list):
            tables = []
        by_table = {
            table.get("table"): table
            for table in tables
            if isinstance(table, dict) and isinstance(table.get("table"), str)
        }

        contract = self._load_contract()
        dependency_owned_routes = self._dependency_owned_contract_routes(contract)
        for route in sorted(actual_routes):
            if route not in routes and route not in dependency_owned_routes:
                messages.append(f"frontend route missing from schema manifest: {route}")

        contract_routes = contract.get("routes", [])
        if not isinstance(contract_routes, list):
            return FrontendContractResult(ok=False, messages=["frontend field contracts routes must be a list"])

        contract_route_values = {
            item["route"]
            for item in contract_routes
            if isinstance(item, dict) and isinstance(item.get("route"), str)
        }
        for route in sorted(actual_routes):
            if route not in contract_route_values:
                messages.append(f"frontend route missing field contract: {route}")

        for item in contract_routes:
            if not isinstance(item, dict) or not isinstance(item.get("route"), str):
                continue
            route = item["route"]
            dependency_owned = self._is_dependency_owned_contract_route(item)
            if route not in actual_routes:
                messages.append(f"frontend contract route is not in portal App.tsx: {route}")

            route_tables = self._manifest_route_tables(routes.get(route))
            for table in self._string_list(item.get("required_tables")):
                if table not in route_tables and table not in self.APPBASE_REQUIRED_TABLES and not dependency_owned:
                    messages.append(f"route {route} requires table {table}")

            required_columns = item.get("required_columns", {})
            if not isinstance(required_columns, dict):
                messages.append(f"route {route} required_columns must be a mapping")
                continue

            for table, columns in required_columns.items():
                if not isinstance(table, str):
                    continue
                if table in self.APPBASE_REQUIRED_TABLES or dependency_owned:
                    continue
                metadata = by_table.get(table)
                if metadata is None:
                    messages.append(f"route {route} requires unregistered table {table}")
                    continue
                actual_columns = self._table_columns(metadata)
                for column in self._string_list(columns):
                    if column not in actual_columns:
                        messages.append(f"table {table} requires column {column} for route {route}")

        messages.extend(self._check_browser_dependency_boundaries())
        messages.extend(self._check_app_route_loading_boundary())
        messages.extend(self._check_vite_chunk_boundary())
        messages.extend(self._check_portal_node_server_removed_boundary())
        messages.extend(self._check_generated_sdk_client_boundary())
        messages.extend(self._check_runtime_api_base_url_boundary())
        messages.extend(self._check_commons_runtime_import_boundary())
        messages.extend(self._check_business_sdk_call_boundary())
        messages.extend(self._check_frontend_model_source_boundaries(contract))
        frontend_operations = self._frontend_operations_with_dependency_fragments(contract)
        if not isinstance(frontend_operations, list):
            frontend_operations = []
        operation_items = [operation for operation in frontend_operations if isinstance(operation, dict)]
        messages.extend(self._check_app_shell_frontend_operations(operation_items))
        messages.extend(self._check_route_classification_boundary(actual_routes, routes, contract))

        return FrontendContractResult(ok=not messages, messages=messages)

    def extract_portal_routes(self) -> list[str]:
        if not self.app_path.exists():
            raise FileNotFoundError(f"portal App.tsx not found: {self.app_path}")

        routes: set[str] = set()
        wildcard_mounts: set[str] = set()
        route_stack: list[str] = []
        commerce_mount_prefix: str | None = None

        for line in self.app_path.read_text(encoding="utf-8").splitlines():
            if commerce_mount_prefix is None and any(
                component in line for component in self.COMMERCE_HOST_MOUNT_COMPONENTS
            ):
                parent = route_stack[-1] if route_stack else ""
                if parent == "/console" or parent.startswith("/console/"):
                    commerce_mount_prefix = parent

            for match in self.ROUTE_PATTERN.finditer(line):
                attrs = match.group(1)
                path_match = self.PATH_PATTERN.search(attrs)
                if path_match is None:
                    continue

                path = path_match.group(1).strip()
                if not path or path == "*":
                    continue
                if path.endswith("/*"):
                    parent = route_stack[-1] if route_stack else ""
                    mount_path = self._join_route(parent, path[:-2])
                    wildcard_mounts.add(mount_path)
                    continue

                parent = route_stack[-1] if route_stack else ""
                full_path = self._join_route(parent, path)
                # JSX element props often contain nested tags such as element={<Layout />};
                # line-level closure is more reliable than stopping at the first ">".
                self_closing = line.strip().endswith("/>")
                if self_closing:
                    routes.add(full_path)
                else:
                    route_stack.append(full_path)

            close_count = line.count("</Route>")
            for _ in range(close_count):
                if route_stack:
                    route_stack.pop()

        routes.update(self._contracted_child_routes_for_wildcard_mounts(wildcard_mounts))
        if commerce_mount_prefix is not None:
            routes.update(self._commerce_host_routes_for_prefix(commerce_mount_prefix))
        shell_routes, _ = self._extract_app_shell_route_data()
        routes.update(shell_routes)
        return sorted(routes)

    def _load_manifest(self) -> dict[str, Any]:
        if not self.manifest_path.exists():
            return {}
        manifest = json.loads(self.manifest_path.read_text(encoding="utf-8"))
        if not isinstance(manifest, dict):
            return {}
        return manifest

    def _load_contract(self) -> dict[str, Any]:
        if yaml is None:
            raise RuntimeError("PyYAML is required to load frontend field contracts") from _YAML_IMPORT_ERROR
        contract = load_frontend_field_contract(self.root, self.contract_path)
        if contract is None:
            return {"routes": []}
        if not isinstance(contract, dict):
            raise ValueError("frontend field contract root must be a mapping")
        return contract

    def _load_route_classification(self) -> dict[str, Any]:
        if yaml is None:
            raise RuntimeError("PyYAML is required to load frontend route classifications") from _YAML_IMPORT_ERROR
        if not self.route_classification_path.exists():
            return {"routes": []}
        classification = yaml.safe_load(self.route_classification_path.read_text(encoding="utf-8"))
        if classification is None:
            return {"routes": []}
        if not isinstance(classification, dict):
            raise ValueError("frontend route classification root must be a mapping")
        return classification

    def _frontend_operations_with_dependency_fragments(self, contract: dict[str, Any]) -> list[Any]:
        entries = contract.get("frontend_operations", [])
        merged_entries = list(entries) if isinstance(entries, list) else []
        existing_keys = {
            f"{entry.get('source')}#{entry.get('operation')}"
            for entry in merged_entries
            if isinstance(entry, dict)
            and isinstance(entry.get("source"), str)
            and isinstance(entry.get("operation"), str)
        }

        for relative_fragment in self.DEPENDENCY_OPERATION_FRAGMENTS:
            fragment_path = self.root / relative_fragment
            if not fragment_path.is_file():
                continue
            fragment = yaml.safe_load(fragment_path.read_text(encoding="utf-8")) if yaml is not None else None
            if not isinstance(fragment, dict):
                continue
            fragment_entries = fragment.get("frontend_operations", [])
            if not isinstance(fragment_entries, list):
                continue
            for entry in fragment_entries:
                if not isinstance(entry, dict):
                    continue
                source = entry.get("source")
                operation = entry.get("operation")
                if not isinstance(source, str) or not isinstance(operation, str):
                    continue
                key = f"{source}#{operation}"
                if key in existing_keys:
                    continue
                merged_entries.append(entry)
                existing_keys.add(key)
        return merged_entries

    def _load_static_source_manifest(self) -> dict[str, Any]:
        if not self.static_source_manifest_path.exists():
            return {}
        manifest = json.loads(self.static_source_manifest_path.read_text(encoding="utf-8"))
        if not isinstance(manifest, dict):
            return {}
        return manifest

    def _join_route(self, parent: str, path: str) -> str:
        if path.startswith("/"):
            return path.rstrip("/") or "/"
        if not parent:
            return f"/{path}".rstrip("/")
        return f"{parent.rstrip('/')}/{path}".rstrip("/")

    def _contracted_child_routes_for_wildcard_mounts(self, mounts: set[str]) -> set[str]:
        if not mounts:
            return set()

        declared_routes: set[str] = set()
        contract = self._load_contract()
        contract_routes = contract.get("routes", [])
        if isinstance(contract_routes, list):
            declared_routes.update(
                item["route"]
                for item in contract_routes
                if isinstance(item, dict) and isinstance(item.get("route"), str)
            )

        if self.route_classification_path.exists():
            classification = self._load_route_classification()
            classified_routes = classification.get("routes", [])
            if isinstance(classified_routes, list):
                declared_routes.update(
                    item["route"]
                    for item in classified_routes
                    if isinstance(item, dict) and isinstance(item.get("route"), str)
                )

        child_routes: set[str] = set()
        for mount in mounts:
            prefix = mount.rstrip("/") + "/"
            child_routes.update(
                route
                for route in declared_routes
                if route == mount or route.startswith(prefix)
            )
        return child_routes

    def _commerce_host_mount_path(self) -> Path:
        return self._resolve_workspace_sibling_path(self.COMMERCE_HOST_MOUNT_RELATIVE)

    def _commerce_host_catalog_path(self) -> Path | None:
        for relative in self.COMMERCE_HOST_CATALOG_RELATIVES:
            candidate = self._resolve_workspace_sibling_path(relative)
            if candidate.exists():
                return candidate
        return None

    def _resolve_commerce_host_route_prefix(self, mount_prefix: str) -> str:
        mount_path = self._commerce_host_mount_path()
        if mount_path.exists():
            for match in self.COMMERCE_HOST_ROUTE_PREFIX_PATTERN.finditer(
                mount_path.read_text(encoding="utf-8")
            ):
                return match.group(1).rstrip("/") or mount_prefix.rstrip("/")
        return mount_prefix.rstrip("/")

    def _commerce_host_route_segments(self) -> list[str]:
        catalog_path = self._commerce_host_catalog_path()
        if catalog_path is None:
            return ["wallet", "memberships", "checkout", "payment"]
        return [
            match.group(1)
            for match in self.COMMERCE_HOST_CATALOG_SEGMENT_PATTERN.finditer(
                catalog_path.read_text(encoding="utf-8")
            )
        ]

    def _commerce_host_logical_routes(self) -> set[str]:
        mount_path = self._commerce_host_mount_path()
        if not mount_path.exists():
            return set()
        logical_routes: set[str] = set()
        for match in self.COMMERCE_HOST_LOGICAL_ROUTE_PATTERN.finditer(
            mount_path.read_text(encoding="utf-8")
        ):
            route = match.group(1).rstrip("/")
            if route.startswith("/console/"):
                logical_routes.add(route)
        return logical_routes

    def _commerce_host_routes_for_prefix(self, mount_prefix: str) -> set[str]:
        route_prefix = self._resolve_commerce_host_route_prefix(mount_prefix)
        routes = {
            self._join_route(route_prefix, segment)
            for segment in self._commerce_host_route_segments()
        }
        routes.update(self._commerce_host_logical_routes())
        return routes

    def _manifest_route_tables(self, route_entry: Any) -> set[str]:
        if not isinstance(route_entry, dict):
            return set()
        return set(self._string_list(route_entry.get("tables")))

    def _table_columns(self, table: dict[str, Any]) -> set[str]:
        columns: set[str] = set()
        raw_columns = table.get("columns", [])
        if isinstance(raw_columns, list):
            for column in raw_columns:
                if isinstance(column, dict) and isinstance(column.get("name"), str):
                    columns.add(column["name"])

        physical_columns = table.get("physical_columns", {})
        if isinstance(physical_columns, dict):
            own_columns = physical_columns.get("own", [])
            if isinstance(own_columns, list):
                columns.update(column for column in own_columns if isinstance(column, str))
        return columns

    def _string_list(self, value: Any) -> list[str]:
        if not isinstance(value, list):
            return []
        return [item for item in value if isinstance(item, str)]

    def _check_browser_dependency_boundaries(self) -> list[str]:
        portal_root = self.root / "apps" / "sdkwork-clawrouter-pc"
        if not portal_root.exists():
            return []

        messages: list[str] = []
        for source_path in self._browser_source_files(portal_root):
            source = self._safe_read_text(source_path)
            if source is None:
                continue
            for module_name in self._static_imports(source):
                root_package = self._root_package_name(module_name)
                if root_package in self.NODE_ONLY_BROWSER_PACKAGES:
                    messages.append(
                        f"browser source must not import node-only package {root_package}: "
                        f"{self._browser_source_display_path(source_path)}"
                    )
        return messages

    def _browser_source_files(self, portal_root: Path) -> list[Path]:
        source_roots = [portal_root / "src", portal_root / "packages"]
        files: list[Path] = []
        for source_root in source_roots:
            files.extend(self._browser_source_files_under(source_root))
        for relative_src in self.WORKSPACE_DOCUMENTS_PACKAGE_SRC.values():
            workspace_src = self._resolve_workspace_sibling_path(relative_src)
            files.extend(self._browser_source_files_under(workspace_src))
        return files

    def _resolve_portal_package_src(self, package_name: str) -> Path | None:
        if isinstance(package_name, str) and package_name in self.WORKSPACE_DOCUMENTS_PACKAGE_SRC:
            workspace_src = self._resolve_workspace_sibling_path(
                self.WORKSPACE_DOCUMENTS_PACKAGE_SRC[package_name]
            )
            if workspace_src.is_dir():
                return workspace_src
        unscoped = package_name.split("/", 1)[1] if isinstance(package_name, str) and package_name.startswith("@") else package_name
        candidates = [
            self.portal_root / "packages" / unscoped / "src",
            self.portal_root / "node_modules" / package_name / "src",
        ]
        for candidate in candidates:
            if candidate.is_dir():
                return candidate
        return None

    def _browser_source_display_path(self, source_path: Path) -> str:
        try:
            return source_path.relative_to(self.root).as_posix()
        except ValueError:
            pass
        try:
            return source_path.relative_to(self.root.parent).as_posix()
        except ValueError:
            return source_path.as_posix()

    def _browser_source_files_under(self, source_root: Path) -> list[Path]:
        if not source_root.exists():
            return []

        files: list[Path] = []
        for current_root, directories, filenames in os.walk(source_root):
            directories[:] = [
                directory
                for directory in directories
                if directory not in self.BROWSER_SOURCE_EXCLUDED_DIRECTORIES
            ]
            current_path = Path(current_root)
            for filename in filenames:
                path = current_path / filename
                if path.suffix in self.BROWSER_SOURCE_EXTENSIONS:
                    files.append(path)
        return files

    def _check_app_route_loading_boundary(self) -> list[str]:
        if not self.app_path.exists():
            return []

        source = self._safe_read_text(self.app_path)
        if source is None:
            return []

        messages: list[str] = []
        for module_name in self._static_imports(source):
            if not module_name.startswith(self.ROUTE_PACKAGE_PREFIXES):
                continue
            root_package = self._root_package_name(module_name)
            if root_package in self.STATIC_ROUTE_IMPORT_ALLOWLIST:
                continue
            messages.append(
                f"portal App.tsx must lazy-load route package import {root_package} instead of static import"
            )
        return messages

    def _check_vite_chunk_boundary(self) -> list[str]:
        if not self.vite_config_path.exists():
            return []

        source = self._safe_read_text(self.vite_config_path)
        if source is None:
            return []
        if "manualChunks" not in source or "rollupOptions" not in source:
            return [
                "portal Vite config must define rollupOptions.output.manualChunks for production chunk boundaries"
            ]
        if not self._has_local_route_chunk_boundary(source):
            return [self.VITE_LOCAL_ROUTE_CHUNK_MESSAGE]
        return []

    def _has_local_route_chunk_boundary(self, source: str) -> bool:
        route_pattern_index = source.find("LOCAL_ROUTE_PACKAGE_PATTERN")
        route_match_index = source.find("normalizedId.match(LOCAL_ROUTE_PACKAGE_PATTERN)")
        vendor_index = source.find("if (!id.includes('node_modules'))")
        return (
            route_pattern_index != -1
            and route_match_index != -1
            and "sdkwork-clawrouter-" in source
            and vendor_index != -1
            and route_match_index < vendor_index
        )

    def _check_portal_node_server_removed_boundary(self) -> list[str]:
        messages: list[str] = []
        for relative_path in self.FORBIDDEN_PORTAL_SERVER_FILES:
            if (self.portal_root / relative_path).exists():
                messages.append(f"{self.PORTAL_NODE_SERVER_FORBIDDEN_MESSAGE}: {relative_path}")

        if not self.portal_package_path.exists():
            return messages

        package_source = self._safe_read_text(self.portal_package_path)
        if package_source is None:
            return messages
        try:
            package = json.loads(package_source)
        except json.JSONDecodeError as exc:
            return messages + [f"portal package.json must be valid JSON: {exc.msg}"]
        if not isinstance(package, dict):
            return messages + ["portal package.json root must be a JSON object"]

        scripts = package.get("scripts", {})
        if not isinstance(scripts, dict):
            return messages + ["portal package.json scripts must be a JSON object"]

        scripts_surface = json.dumps(scripts, ensure_ascii=False)
        if any(token in scripts_surface for token in self.FORBIDDEN_PORTAL_SERVER_SCRIPT_TOKENS):
            messages.append(self.PORTAL_SERVER_SCRIPT_FORBIDDEN_MESSAGE)

        dev_script = scripts.get("dev")
        dev_browser_script = scripts.get("dev:browser")
        if not (
            isinstance(dev_script, str)
            and isinstance(dev_browser_script, str)
            and self._is_vite_native_script(dev_script)
            and self._is_vite_native_script(dev_browser_script)
            and "--configLoader native" in dev_script
            and "--configLoader native" in dev_browser_script
        ):
            messages.append(
                "portal dev and dev:browser scripts must run Vite directly with native config loading"
            )

        build_script = scripts.get("build")
        if isinstance(build_script, str) and "build-portal.mjs" in build_script:
            build_portal_path = self.portal_root / "scripts" / "build-portal.mjs"
            build_portal_source = self._safe_read_text(build_portal_path) or ""
            if any(token in build_portal_source for token in ("buildServer", "build-server.mjs", "dist/server.mjs")):
                messages.append(self.PORTAL_BUILD_SERVER_FORBIDDEN_MESSAGE)
        elif isinstance(build_script, str) and "vite" not in build_script:
            messages.append("portal package.json build must build Vite portal artifacts")
        return messages

    def _check_generated_sdk_client_boundary(self) -> list[str]:
        boundary_path = self.root / self.SDK_CLIENT_BOUNDARY_FILE
        source = self._safe_read_text(boundary_path)
        if source is None:
            return [f"portal SDK client boundary is missing: {self.SDK_CLIENT_BOUNDARY_FILE}"]

        messages: list[str] = []
        required_terms = (
            "@sdkwork/clawrouter-app-sdk",
            "@sdkwork/clawrouter-backend-sdk",
            "@sdkwork/clawrouter-open-sdk",
            "new SdkworkAppClient",
            "new SdkworkBackendClient",
            "new SdkworkAiClient",
            "normalizeGeneratedSdkBaseUrl",
            "/app/v3/api",
            "/backend/v3/api",
            "/v1",
        )
        if not all(term in source for term in required_terms):
            messages.append(self.GENERATED_SDK_CLIENT_BOUNDARY_MESSAGE)
        required_option_terms = (
            "export interface ClawRouterAppSdkClientOptions",
            "export interface ClawRouterBackendSdkClientOptions",
            "export interface ClawRouterAiSdkClientOptions",
        )
        forbidden_option_terms = (
            "interface ClawRouterSdkClientOptions",
            "type ClawRouterSdkClientOptions",
            "baseUrl?:",
            "headers?:",
            "options.baseUrl",
            "options.headers",
            "headers:",
        )
        if not all(term in source for term in required_option_terms) or any(
            term in source for term in forbidden_option_terms
        ):
            messages.append(self.GENERATED_SDK_CLIENT_OPTIONS_BOUNDARY_MESSAGE)
        return messages

    def _is_vite_native_script(self, script: str) -> bool:
        commands = [part.strip() for part in script.split("&&")]
        if not commands:
            return False
        vite_command = commands[-1]
        return vite_command.startswith("vite ") and "--configLoader native" in vite_command

    def _check_runtime_api_base_url_boundary(self) -> list[str]:
        env_path = self.portal_root / "packages" / "sdkwork-clawroutes-pc-commons" / "src" / "utils" / "env.ts"
        sdk_clients_path = self.root / self.SDK_CLIENT_BOUNDARY_FILE
        env_source = self._safe_read_text(env_path) or ""
        sdk_clients_source = self._safe_read_text(sdk_clients_path) or ""

        if (
            "const DEFAULT_API_BASE_URL = '/v1';" in env_source
            and "api.sdkwork.com" not in env_source
            and "?? API_BASE_URL" not in sdk_clients_source
            and "?? APP_API_PREFIX" in sdk_clients_source
            and "?? BACKEND_API_PREFIX" in sdk_clients_source
        ):
            return []
        return [self.RUNTIME_API_BASE_URL_BOUNDARY_MESSAGE]

    def _check_commons_runtime_import_boundary(self) -> list[str]:
        messages: list[str] = []
        service_name_pattern = re.compile(r"(?:^|[/\\])[^/\\]*[Ss]ervice\.tsx?$")
        for source_path in self._browser_source_files(self.portal_root):
            relative = self._browser_source_display_path(source_path)
            source = self._safe_read_text(source_path)
            if source is None:
                continue

            root_imports = self._commons_root_named_imports(source)
            runtime_imports = sorted(set(root_imports) & self.COMMONS_RUNTIME_ONLY_SYMBOLS)
            if runtime_imports:
                messages.append(
                    f"{self.COMMONS_UI_ROOT_RUNTIME_IMPORT_BOUNDARY_MESSAGE}: "
                    f"{relative} imports {', '.join(runtime_imports)}"
                )

            if service_name_pattern.search(relative) and re.search(
                r"from\s+['\"]@sdkwork/clawroutes-pc-commons['\"]",
                source,
            ):
                messages.append(f"{self.COMMONS_RUNTIME_IMPORT_BOUNDARY_MESSAGE}: {relative}")

        root_source = self._safe_read_text(self.root / self.COMMONS_UI_ROOT_FILE)
        if root_source is not None:
            runtime_reexports = [
                match.group("module")
                for match in self.EXPORT_ALL_PATTERN.finditer(root_source)
                if self._normalize_ts_module_specifier(match.group("module")) in self.COMMONS_RUNTIME_MODULE_REEXPORTS
            ]
            if runtime_reexports:
                messages.append(
                    f"{self.COMMONS_UI_ROOT_RUNTIME_EXPORT_BOUNDARY_MESSAGE}: "
                    f"{self.COMMONS_UI_ROOT_FILE} exports {', '.join(runtime_reexports)}"
                )
        return messages

    def _commons_root_named_imports(self, source: str) -> list[str]:
        names: list[str] = []
        for match in self.COMMONS_ROOT_NAMED_IMPORT_PATTERN.finditer(source):
            for raw_item in match.group("imports").split(","):
                item = raw_item.strip()
                if not item:
                    continue
                item = re.sub(r"^type\s+", "", item).strip()
                item = item.split(" as ", 1)[0].strip()
                if item:
                    names.append(item)
        return names

    def _normalize_ts_module_specifier(self, module_name: str) -> str:
        return re.sub(r"\.(?:ts|tsx|js|jsx)$", "", module_name)

    def _check_business_sdk_call_boundary(self) -> list[str]:
        messages: list[str] = []
        service_name_pattern = re.compile(r"(?:^|[/\\])[^/\\]*[Ss]ervice\.tsx?$")
        for source_path in self._browser_source_files(self.portal_root):
            source = self._safe_read_text(source_path)
            if source is None:
                continue
            relative = self._browser_source_display_path(source_path)

            if relative not in self.SDK_CLIENT_BOUNDARY_FILES:
                for match in self.GENERATED_SDK_VALUE_IMPORT_PATTERN.finditer(source):
                    imports = match.group("imports")
                    if "SdkworkAppClient" in imports or "SdkworkBackendClient" in imports:
                        messages.append(
                            f"{self.GENERATED_SDK_VALUE_IMPORT_BOUNDARY_MESSAGE}: "
                            f"{relative} imports {match.group('module')}"
                        )
                if self.GENERATED_SDK_CLIENT_CONSTRUCTION_PATTERN.search(source):
                    messages.append(f"{self.GENERATED_SDK_CLIENT_CONSTRUCTION_BOUNDARY_MESSAGE}: {relative}")

            if any(prefix in source for prefix in self.BUSINESS_API_PREFIXES) and relative not in self.SDK_CLIENT_BOUNDARY_FILES and relative not in self.DOCUMENTS_RUNTIME_BOUNDARY_FILES:
                messages.append(f"{self.BUSINESS_API_PREFIX_BOUNDARY_MESSAGE}: {relative}")

            if self._contains_manual_admin_session_token_usage(relative, source):
                messages.append(f"{self.ADMIN_SESSION_TOKEN_BOUNDARY_MESSAGE}: {relative}")

            if (
                service_name_pattern.search(relative)
                and self.GENERATED_SDK_RESULT_DATA_PATTERN.search(source)
                and "getClawRouterAiSdkClient" not in source
            ):
                messages.append(f"{self.GENERATED_SDK_RESULT_DATA_BOUNDARY_MESSAGE}: {relative}")

            if relative in self.RAW_BROWSER_NETWORK_ALLOWLIST:
                continue

            if self._contains_raw_business_http_client(source):
                messages.append(f"{self.BUSINESS_RAW_HTTP_MESSAGE}: {relative}")
        return messages

    def _contains_raw_business_http_client(self, source: str) -> bool:
        return (
            re.search(r"(?<!\.)\bfetch\s*\(", source) is not None
            or re.search(r"\bnew\s+XMLHttpRequest\s*\(", source) is not None
            or re.search(r"\baxios(?:\s*\(|\.[A-Za-z_$][\w$]*\s*\()", source) is not None
            or re.search(r"^\s*import\s+(?:[^'\"]+\s+from\s+)?['\"]axios['\"]", source, re.MULTILINE)
            is not None
        )

    def _contains_manual_admin_session_token_usage(self, relative: str, source: str) -> bool:
        return (
            "/packages/sdkwork-clawrouter-pc-admin-" in f"/{relative}"
            and "getStoredAppSessionToken" in source
        )

    def _check_frontend_model_source_boundaries(self, contract: dict[str, Any]) -> list[str]:
        frontend_models = contract.get("frontend_models", [])
        if not isinstance(frontend_models, list):
            return ["frontend field contracts frontend_models must be a list"]

        messages: list[str] = []
        checked_sources: set[str] = set()
        for item in frontend_models:
            if not isinstance(item, dict) or not isinstance(item.get("source"), str):
                continue
            source = item["source"]
            if source in checked_sources:
                continue
            checked_sources.add(source)

            source_path = (self.root / source).resolve()
            source_text = self._safe_read_text(source_path)
            if source_text is None:
                continue
            if self.BUSINESS_RANDOM_PATTERN.search(source_text):
                messages.append(f"frontend model source {source} must not generate business facts with Math.random")
        return messages

    def _check_route_classification_boundary(
        self,
        actual_routes: set[str],
        manifest_routes: dict[str, Any],
        contract: dict[str, Any],
    ) -> list[str]:
        if not self.route_classification_path.exists():
            if self.require_route_classification:
                return ["frontend route classification registry is missing"]
            return []

        classification = self._load_route_classification()
        messages: list[str] = []
        if classification.get("schema") != self.ROUTE_CLASSIFICATION_SCHEMA:
            messages.append(
                "frontend route classification schema must be "
                f"{self.ROUTE_CLASSIFICATION_SCHEMA}"
            )

        entries = classification.get("routes", [])
        if not isinstance(entries, list):
            return messages + ["frontend route classification routes must be a list"]

        route_entries: list[dict[str, Any]] = [
            entry for entry in entries if isinstance(entry, dict) and isinstance(entry.get("route"), str)
        ]
        classified_routes = [entry["route"] for entry in route_entries]
        for route in sorted(set(classified_routes)):
            if classified_routes.count(route) > 1:
                messages.append(f"frontend route has duplicate delivery classifications: {route}")

        classified_route_set = set(classified_routes)
        for route in sorted(actual_routes - classified_route_set):
            messages.append(f"frontend route missing delivery classification: {route}")
        for route in sorted(classified_route_set - actual_routes):
            messages.append(f"frontend route classification is not in portal App.tsx: {route}")

        frontend_operations = self._frontend_operations_with_dependency_fragments(contract)
        if not isinstance(frontend_operations, list):
            frontend_operations = []
        operation_items = [operation for operation in frontend_operations if isinstance(operation, dict)]
        browser_tool_endpoint_sources = self._browser_tool_endpoint_sources()
        actual_route_packages = self.extract_portal_route_packages()

        for entry in route_entries:
            route = entry["route"]
            delivery_kind = entry.get("delivery_kind")
            if delivery_kind not in self.ALLOWED_DELIVERY_KINDS:
                messages.append(f"frontend route {route} has invalid delivery_kind: {delivery_kind}")
                continue

            messages.extend(self._check_route_classification_evidence(entry))

            actual_package = actual_route_packages.get(route)
            declared_package = entry.get("package")
            if actual_package is not None and declared_package != actual_package:
                messages.append(
                    f"frontend route {route} classification package must match App.tsx lazy route package "
                    f"{actual_package}"
                )

            manifest_route = manifest_routes.get(route)
            if not isinstance(manifest_route, dict):
                if self._is_dependency_owned_classification_route(entry):
                    messages.extend(self._check_dependency_owned_route_classification(entry, contract, operation_items))
                continue

            expected_scope = manifest_route.get("route_scope")
            if expected_scope != entry.get("route_scope"):
                messages.append(
                    f"frontend route {route} classification route_scope must be {expected_scope}"
                )

            if delivery_kind == "sdk_backed_business_runtime":
                if self._is_dependency_owned_classification_route(entry):
                    messages.extend(self._check_dependency_owned_route_classification(entry, contract, operation_items))
                else:
                    messages.extend(self._check_sdk_backed_route_classification(entry, manifest_route, operation_items))
            elif delivery_kind == "schema_provenanced_content":
                messages.extend(self._check_schema_content_route_classification(entry, manifest_route, operation_items))
            elif delivery_kind == "local_developer_tool_api":
                messages.extend(self._check_local_tool_route_classification(entry, browser_tool_endpoint_sources))
            elif delivery_kind == "composed_local_mount":
                messages.extend(
                    self._check_composed_local_mount_route_classification(entry, contract, operation_items)
                )

        return messages

    def _check_composed_local_mount_route_classification(
        self,
        entry: dict[str, Any],
        contract: dict[str, Any],
        frontend_operations: list[dict[str, Any]],
    ) -> list[str]:
        messages = self._check_dependency_owned_route_classification(entry, contract, frontend_operations)
        dependency_sdk_family = entry.get("dependency_sdk_family")
        if not isinstance(dependency_sdk_family, str) or not dependency_sdk_family.startswith("sdkwork-models-"):
            messages.append(
                f"composed local mount route {entry['route']} must declare dependency_sdk_family sdkwork-models-*"
            )
        return messages

    def _dependency_owned_contract_routes(self, contract: dict[str, Any]) -> set[str]:
        routes = contract.get("routes", [])
        if not isinstance(routes, list):
            return set()
        return {
            route
            for item in routes
            if isinstance(item, dict)
            and self._is_dependency_owned_contract_route(item)
            and isinstance((route := item.get("route")), str)
        }

    def _is_dependency_owned_contract_route(self, item: dict[str, Any]) -> bool:
        return item.get("dependency_owned") is True and isinstance(item.get("dependency_sdk_family"), str)

    def _is_dependency_owned_classification_route(self, item: dict[str, Any]) -> bool:
        return item.get("dependency_owned") is True and isinstance(item.get("dependency_sdk_family"), str)

    def _check_dependency_owned_route_classification(
        self,
        entry: dict[str, Any],
        contract: dict[str, Any],
        frontend_operations: list[dict[str, Any]],
    ) -> list[str]:
        route = entry["route"]
        messages: list[str] = []
        api_surface = entry.get("api_surface")
        dependency_sdk_family = entry.get("dependency_sdk_family")
        if api_surface not in {"app", "backend"}:
            messages.append(f"dependency-owned route {route} must declare api_surface app or backend")
            return messages
        if not isinstance(dependency_sdk_family, str) or not dependency_sdk_family:
            messages.append(f"dependency-owned route {route} must declare dependency_sdk_family")
            return messages

        contract_routes = [
            item
            for item in contract.get("routes", [])
            if isinstance(item, dict) and item.get("route") == route
        ]
        if not contract_routes:
            messages.append(f"dependency-owned route {route} must declare a field contract route")
            return messages

        if not any(
            self._is_dependency_owned_contract_route(item)
            and item.get("dependency_sdk_family") == dependency_sdk_family
            for item in contract_routes
        ):
            messages.append(
                f"dependency-owned route {route} contract must declare dependency_sdk_family {dependency_sdk_family}"
            )

        if dependency_sdk_family in self.EXTERNAL_DEPENDENCY_SDK_FAMILIES_WITHOUT_LOCAL_OPERATIONS:
            return messages

        operation_routes = {route, *self._string_list(entry.get("operation_routes"))}
        matching_operations = [
            operation
            for operation in frontend_operations
            if operation.get("route") in operation_routes and operation.get("api_surface") == api_surface
        ]
        if not matching_operations:
            messages.append(
                f"dependency-owned route {route} must declare at least one {api_surface} frontend operation contract"
            )
            return messages

        expected_client = "getClawRouterAppSdkClient" if api_surface == "app" else "getClawRouterBackendSdkClient"
        if dependency_sdk_family == "sdkwork-models-backend-sdk":
            expected_client = "getModelsBackendSdkClient"
        elif dependency_sdk_family == "sdkwork-models-app-sdk":
            expected_client = "getModelsAppSdkClient"
        elif dependency_sdk_family == "sdkwork-drive-backend-sdk":
            expected_client = "getSdkworkDriveBackendSdkClient"
        elif dependency_sdk_family == "sdkwork-drive-app-sdk":
            expected_client = "getSdkworkDriveAppSdkClient"
        elif dependency_sdk_family == "sdkwork-prompts-backend-sdk":
            expected_client = "getSdkworkPromptsBackendSdkClient"
        elif dependency_sdk_family == "sdkwork-agent-backend-sdk":
            expected_client = "getSdkworkAgentBackendSdkClient"
        if not any(
            self._operation_uses_allowed_sdk_client_boundary(operation, expected_client)
            for operation in matching_operations
            if isinstance(operation.get("source"), str)
        ):
            messages.append(
                f"dependency-owned route {route} must use dependency SDK boundary {dependency_sdk_family}"
            )
        return messages

    def _check_sdk_backed_route_classification(
        self,
        entry: dict[str, Any],
        manifest_route: dict[str, Any],
        frontend_operations: list[dict[str, Any]],
    ) -> list[str]:
        route = entry["route"]
        api_surface = entry.get("api_surface")
        messages: list[str] = []

        if api_surface not in {"app", "backend"}:
            messages.append(f"sdk-backed route {route} must declare api_surface app or backend")
            return messages

        required_surface = manifest_route.get("required_api_surface")
        if api_surface != required_surface:
            messages.append(
                f"sdk-backed route {route} api_surface must match manifest required_api_surface {required_surface}"
            )

        operation_routes = {route, *self._string_list(entry.get("operation_routes"))}
        matching_operations = [
            operation
            for operation in frontend_operations
            if operation.get("route") in operation_routes and operation.get("api_surface") == api_surface
        ]
        if not matching_operations:
            messages.append(
                f"sdk-backed route {route} must declare at least one {api_surface} frontend operation contract"
            )
            return messages

        expected_client = "getClawRouterAppSdkClient" if api_surface == "app" else "getClawRouterBackendSdkClient"
        package = entry.get("package")
        if package in {"@sdkwork/clawrouter-pc-models", "@sdkwork/clawrouter-pc-rankings"} and api_surface == "app":
            expected_client = "getModelsAppSdkClient"
        if not any(
            self._operation_uses_allowed_sdk_client_boundary(operation, expected_client)
            for operation in matching_operations
            if isinstance(operation.get("source"), str)
        ):
            messages.append(f"sdk-backed route {route} must use {expected_client}")
        return messages

    def _operation_uses_allowed_sdk_client_boundary(self, operation: dict[str, Any], expected_client: str) -> bool:
        source = operation.get("source")
        if not isinstance(source, str):
            return False
        sdk_domain = operation.get("sdk_domain")
        return self._source_uses_standard_sdk_client_boundary(
            source,
            expected_client,
            sdk_domain=sdk_domain if isinstance(sdk_domain, str) else None,
        )

    def _source_uses_standard_sdk_client_boundary(
        self,
        source: str,
        expected_client: str,
        sdk_domain: str | None = None,
    ) -> bool:
        source_path = (self.root / source).resolve()
        source_text = self._safe_read_text(source_path) or ""
        return (
            expected_client in source_text
            or self._uses_standard_foundation_sdk_client(source_text, expected_client)
            or self._uses_local_runtime_adapter_sdk_client(source_path, source_text, expected_client)
            or self._uses_dependency_sdk_client_boundary(source_path, source_text, sdk_domain)
        )

    def _uses_standard_foundation_sdk_client(self, source_text: str, expected_client: str) -> bool:
        if (
            "getClawRouterCommerceService" not in source_text
            and "commerce-runtime" not in source_text
        ):
            return False

        commerce_runtime = (
            self.root
            / "apps"
            / "sdkwork-clawrouter-pc"
            / "packages"
            / "sdkwork-clawroutes-pc-commons"
            / "src"
            / "commerce-runtime.ts"
        )
        runtime_source = self._safe_read_text(commerce_runtime)
        return runtime_source is not None and expected_client in runtime_source

    def _uses_local_runtime_adapter_sdk_client(
        self,
        source_path: Path,
        source_text: str,
        expected_client: str,
    ) -> bool:
        for match in self.LOCAL_RUNTIME_ADAPTER_IMPORT_PATTERN.finditer(source_text):
            adapter_path = self._resolve_relative_import(source_path, match.group(1))
            if adapter_path is None:
                continue
            adapter_source = self._safe_read_text(adapter_path)
            if adapter_source is not None and expected_client in adapter_source:
                return True
        return False

    def _uses_dependency_sdk_client_boundary(
        self,
        source_path: Path,
        source_text: str,
        sdk_domain: str | None,
    ) -> bool:
        if self._source_text_uses_dependency_sdk_client_boundary(source_text, sdk_domain):
            return True

        for match in self.LOCAL_RUNTIME_ADAPTER_IMPORT_PATTERN.finditer(source_text):
            adapter_path = self._resolve_relative_import(source_path, match.group(1))
            if adapter_path is None:
                continue
            adapter_source = self._safe_read_text(adapter_path)
            if adapter_source is not None and self._source_text_uses_dependency_sdk_client_boundary(
                adapter_source,
                sdk_domain,
            ):
                return True
        return False

    def _source_text_uses_dependency_sdk_client_boundary(
        self,
        source_text: str,
        sdk_domain: str | None,
    ) -> bool:
        domain = self._normalize_dependency_sdk_domain(sdk_domain)
        if domain:
            return any(token in source_text for token in self.DEPENDENCY_SDK_BOUNDARY_TOKENS.get(domain, ()))
        return any(
            token in source_text
            for tokens in self.DEPENDENCY_SDK_BOUNDARY_TOKENS.values()
            for token in tokens
        )

    def _normalize_dependency_sdk_domain(self, sdk_domain: str | None) -> str:
        if not isinstance(sdk_domain, str):
            return ""
        normalized = re.sub(r"[^a-z0-9]", "", sdk_domain.lower())
        if normalized in {"commerce", "billing", "wallet", "membership", "memberships", "recharge", "orders"}:
            return "commerce"
        if normalized in {"iam", "auth", "appbase"}:
            return normalized
        if normalized in {"generation", "generations"}:
            return "generations"
        if normalized in {"notification", "notifications"}:
            return "notification"
        if normalized in {"models", "model", "modelcatalog", "modelscatalog"}:
            return "models"
        if normalized in {"agent", "agents"}:
            return "agent"
        if normalized in {"drive"}:
            return "drive"
        if normalized in {"prompt", "prompts"}:
            return "prompts"
        return ""

    def _resolve_relative_import(self, source_path: Path, import_spec: str) -> Path | None:
        candidate = (source_path.parent / import_spec).resolve()
        candidates = [candidate]
        if not candidate.suffix:
            candidates.extend(candidate.with_suffix(suffix) for suffix in (".ts", ".tsx", ".mts", ".cts", ".js", ".jsx"))
        for path in candidates:
            try:
                path.relative_to(self.root)
            except ValueError:
                continue
            if path.is_file():
                return path
        return None

    def _check_app_shell_frontend_operations(self, frontend_operations: list[dict[str, Any]]) -> list[str]:
        messages: list[str] = []
        for operation in frontend_operations:
            if operation.get("operation_scope") != "app_shell":
                continue

            operation_name = operation.get("operation")
            if not isinstance(operation_name, str) or not operation_name.strip():
                operation_name = "<unnamed>"

            api_surface = operation.get("api_surface")
            if api_surface not in {"app", "backend"}:
                messages.append(
                    f"app-shell frontend operation {operation_name} must declare api_surface app or backend"
                )
                continue

            source = operation.get("source")
            if not isinstance(source, str) or not source.strip():
                messages.append(f"app-shell frontend operation {operation_name} must declare source")
                continue

            source_path = Path(source)
            if source_path.is_absolute() or ".." in source_path.parts:
                messages.append(
                    f"app-shell frontend operation {operation_name} source must be a repo-relative path"
                )
                continue

            resolved_source = (self.root / source).resolve()
            try:
                resolved_source.relative_to(self.root)
            except ValueError:
                messages.append(
                    f"app-shell frontend operation {operation_name} source must stay inside repository"
                )
                continue

            source_text = self._safe_read_text(resolved_source)
            if source_text is None:
                messages.append(
                    f"app-shell frontend operation {operation_name} source does not exist: {source}"
                )
                continue

            expected_client = "getClawRouterAppSdkClient" if api_surface == "app" else "getClawRouterBackendSdkClient"
            if not self._operation_uses_allowed_sdk_client_boundary(operation, expected_client):
                messages.append(
                    f"app-shell frontend operation {operation_name} must use {expected_client}"
                )
        return messages

    def _check_schema_content_route_classification(
        self,
        entry: dict[str, Any],
        manifest_route: dict[str, Any],
        frontend_operations: list[dict[str, Any]],
    ) -> list[str]:
        route = entry["route"]
        messages: list[str] = []
        provenance_tables = set(self._string_list(entry.get("provenance_tables")))
        if not provenance_tables:
            messages.append(f"schema content route {route} must declare provenance_tables")

        manifest_tables = set(self._manifest_route_tables(manifest_route))
        missing_tables = sorted(provenance_tables - manifest_tables)
        for table in missing_tables:
            messages.append(f"schema content route {route} provenance table {table} is not in schema manifest")

        route_runtime_operations = [
            operation
            for operation in frontend_operations
            if operation.get("route") == route and operation.get("operation_scope") != "app_shell"
        ]
        if route_runtime_operations:
            messages.append(f"schema content route {route} must not declare runtime frontend operations")

        messages.extend(self._check_schema_content_static_delivery(entry))
        messages.extend(self._check_schema_content_runtime_network_boundary(entry))
        return messages

    def _check_schema_content_static_delivery(self, entry: dict[str, Any]) -> list[str]:
        route = entry["route"]
        static_delivery = entry.get("static_delivery")
        messages: list[str] = []
        if not isinstance(static_delivery, dict):
            return [f"schema content route {route} must declare static_delivery"]

        mode = static_delivery.get("mode")
        refresh_policy = static_delivery.get("refresh_policy")
        max_staleness = static_delivery.get("max_staleness")
        upgrade_triggers = self._string_list(static_delivery.get("upgrade_triggers"))

        if mode not in self.ALLOWED_STATIC_DELIVERY_MODES:
            messages.append(
                f"schema content route {route} static_delivery.mode must be one of "
                f"{', '.join(sorted(self.ALLOWED_STATIC_DELIVERY_MODES))}"
            )
        if refresh_policy not in self.ALLOWED_STATIC_REFRESH_POLICIES:
            messages.append(
                f"schema content route {route} static_delivery.refresh_policy must be one of "
                f"{', '.join(sorted(self.ALLOWED_STATIC_REFRESH_POLICIES))}"
            )
        if max_staleness not in self.ALLOWED_STATIC_STALENESS:
            messages.append(
                f"schema content route {route} static_delivery.max_staleness must be one of "
                f"{', '.join(sorted(self.ALLOWED_STATIC_STALENESS))}"
            )
        if not upgrade_triggers:
            messages.append(f"schema content route {route} static_delivery must declare upgrade_triggers")
        else:
            for trigger in sorted(set(upgrade_triggers)):
                if trigger not in self.ALLOWED_STATIC_UPGRADE_TRIGGERS:
                    messages.append(
                        f"schema content route {route} static_delivery upgrade trigger {trigger} is not approved"
                    )

        if mode in self.ALLOWED_STATIC_DELIVERY_MODES:
            messages.extend(self._check_static_source_reference(entry, static_delivery, str(mode)))

        return messages

    def _check_static_source_reference(
        self,
        entry: dict[str, Any],
        static_delivery: dict[str, Any],
        mode: str,
    ) -> list[str]:
        route = entry["route"]
        label = self.STATIC_SOURCE_METADATA_LABELS[mode]
        messages: list[str] = []
        if "source_metadata" in static_delivery:
            messages.append(
                f"schema content route {route} {label} static_delivery must use source_manifest_ref instead of inline source_metadata"
            )

        manifest_ref = static_delivery.get("source_manifest_ref")
        if not isinstance(manifest_ref, str) or not manifest_ref.strip():
            messages.append(
                f"schema content route {route} {label} static_delivery must declare source_manifest_ref"
            )
            return messages

        manifest = self._load_static_source_manifest()
        if not manifest:
            messages.append(f"frontend static source manifest is missing: {self.static_source_manifest_path}")
            return messages
        if manifest.get("schema") != self.STATIC_SOURCE_MANIFEST_SCHEMA:
            messages.append(
                "frontend static source manifest schema must be "
                f"{self.STATIC_SOURCE_MANIFEST_SCHEMA}"
            )
        if manifest.get("version") != 1:
            messages.append("frontend static source manifest version must be 1")

        snapshots = manifest.get("snapshots")
        if not isinstance(snapshots, dict):
            messages.append("frontend static source manifest snapshots must be a mapping")
            return messages

        metadata = snapshots.get(manifest_ref)
        if not isinstance(metadata, dict):
            messages.append(
                f"schema content route {route} {label} source_manifest_ref is not in frontend static source manifest: {manifest_ref}"
            )
            return messages

        if metadata.get("id") != manifest_ref:
            messages.append(
                f"schema content route {route} {label} static source manifest id must match source_manifest_ref"
            )
        if metadata.get("route") != route:
            messages.append(
                f"schema content route {route} {label} static source manifest route must match classification route"
            )
        if metadata.get("mode") != mode:
            messages.append(
                f"schema content route {route} {label} static source manifest mode must match static_delivery.mode"
            )

        source_ref = metadata.get("source_ref")
        observed_at = metadata.get("observed_at")
        source_hash = metadata.get("source_hash")
        schema_tables = self._string_list(metadata.get("schema_tables"))

        source_path: Path | None = None
        if not isinstance(source_ref, str) or not source_ref.strip():
            messages.append(
                f"schema content route {route} {label} static source manifest source_ref must be a repo-relative path"
            )
        else:
            ref_path = Path(source_ref)
            if ref_path.is_absolute() or ".." in ref_path.parts:
                messages.append(
                    f"schema content route {route} {label} static source manifest source_ref must be a repo-relative path"
                )
            else:
                resolved = (self.root / source_ref).resolve()
                try:
                    resolved.relative_to(self.root)
                except ValueError:
                    messages.append(
                        f"schema content route {route} {label} static source manifest source_ref must stay inside repository"
                    )
                else:
                    if not resolved.is_file():
                        messages.append(
                            f"schema content route {route} {label} static source manifest source_ref does not exist: {source_ref}"
                        )
                    else:
                        source_path = resolved

        if not isinstance(observed_at, str) or not self.ISO_DATE_OR_DATETIME_PATTERN.match(observed_at):
            messages.append(
                f"schema content route {route} {label} static source manifest observed_at must be an ISO date or datetime"
            )

        if not isinstance(source_hash, str) or not self.SOURCE_HASH_PATTERN.match(source_hash):
            messages.append(
                f"schema content route {route} {label} static source manifest source_hash must be sha256:<64 lowercase hex>"
            )
        elif source_path is not None:
            actual_hash = "sha256:" + hashlib.sha256(source_path.read_bytes()).hexdigest()
            if source_hash != actual_hash:
                messages.append(
                    f"schema content route {route} {label} static source manifest source_hash must match source_ref content"
                )

        if not schema_tables:
            messages.append(
                f"schema content route {route} {label} static source manifest must declare schema_tables"
            )
        provenance_tables = set(self._string_list(entry.get("provenance_tables")))
        for table in sorted(set(schema_tables) - provenance_tables):
            messages.append(
                f"schema content route {route} {label} static source manifest schema table "
                f"{table} is not in provenance_tables"
            )

        return messages

    def _check_local_tool_route_classification(
        self,
        entry: dict[str, Any],
        browser_tool_endpoint_sources: set[tuple[str, str]],
    ) -> list[str]:
        route = entry["route"]
        messages: list[str] = []

        if entry.get("browser_env") != "VITE_TOOL_API_ENABLED":
            messages.append(f"local tool route {route} must declare browser_env VITE_TOOL_API_ENABLED")
        if entry.get("runtime_env") != "PORTAL_PUBLIC_TOOL_API_ENABLED":
            messages.append(f"local tool route {route} must declare runtime_env PORTAL_PUBLIC_TOOL_API_ENABLED")

        tool_endpoints = set(self._string_list(entry.get("tool_endpoints")))
        if not tool_endpoints:
            messages.append(f"local tool route {route} must declare tool_endpoints")
        for endpoint in sorted(tool_endpoints):
            if endpoint not in self.TOOL_API_ENDPOINTS:
                messages.append(
                    f"local tool route {route} tool endpoint {endpoint} is not an approved local tool API endpoint"
                )

        source_files = set(self._string_list(entry.get("source_files")))
        if not source_files:
            messages.append(f"local tool route {route} must declare source_files")
        for endpoint in sorted(tool_endpoints):
            for source_file in sorted(source_files):
                if (endpoint, source_file) not in browser_tool_endpoint_sources:
                    messages.append(f"local tool route {route} must bind {endpoint} to source file {source_file}")

        gate_sources = self._string_list(entry.get("gate_sources"))
        if not gate_sources:
            messages.append(f"local tool route {route} must declare gate_sources")
        for gate_source in gate_sources:
            gate_source_path = (
                self._resolve_workspace_sibling_path(gate_source)
                if gate_source.startswith("sdkwork-documents/")
                else (self.root / gate_source).resolve()
            )
            source = self._safe_read_text(gate_source_path) or ""
            if "VITE_TOOL_API_ENABLED" not in source or (
                "resolveClawRouterRuntimeBoolean" not in source
                and "resolveDocumentsRuntimeBoolean" not in source
            ):
                messages.append(
                    f"local tool route {route} gate source {gate_source} "
                    "must read VITE_TOOL_API_ENABLED through resolveClawRouterRuntimeBoolean"
                )
        messages.extend(self._check_local_tool_browser_network_sources(entry))
        return messages

    def _browser_tool_endpoint_sources(self) -> set[tuple[str, str]]:
        endpoint_call = re.compile(r"fetch\(\s*['\"](/api/(?:code-snippet|generate-sdk|sdk-readme))['\"]")
        sources: set[tuple[str, str]] = set()
        for source_path in self._browser_source_files(self.portal_root):
            source = self._safe_read_text(source_path)
            if source is None:
                continue
            relative = self._browser_source_display_path(source_path)
            for match in endpoint_call.finditer(source):
                sources.add((match.group(1), relative))
        return sources

    def _check_local_tool_browser_network_sources(self, entry: dict[str, Any]) -> list[str]:
        route = entry["route"]
        package_name = entry.get("package")
        if not isinstance(package_name, str):
            return []

        package_src = self._resolve_portal_package_src(package_name) if isinstance(package_name, str) else None
        if package_src is None or not package_src.exists():
            return []

        actual_sources = self._browser_fetch_sources_for_package(package_src)
        declared_sources = self._declared_browser_network_sources(entry)
        messages: list[str] = []

        for source_key in sorted(actual_sources - declared_sources):
            messages.append(f"local tool route {route} must declare browser_network_sources entry {source_key}")
        for source_key in sorted(declared_sources - actual_sources):
            messages.append(f"local tool route {route} declares unused browser_network_sources entry {source_key}")
        messages.extend(self._check_local_tool_browser_network_source_metadata(entry))
        return messages

    def _browser_fetch_sources_for_package(self, package_src: Path) -> set[str]:
        sources: set[str] = set()
        for source_path in self._browser_source_files_under(package_src):
            if not source_path.is_file() or source_path.suffix not in self.BROWSER_SOURCE_EXTENSIONS:
                continue
            source = self._safe_read_text(source_path)
            if source is None:
                continue
            relative = self._browser_source_display_path(source_path)
            for match in self.BROWSER_FETCH_CALL_PATTERN.finditer(source):
                if self._is_ignored_source_position(source, match.start()):
                    continue
                endpoint = self._classify_browser_fetch_argument(match.group(1), source_path)
                if endpoint is not None:
                    sources.add(f"{endpoint}|{relative}")
        return sources

    def _is_ignored_source_position(self, source: str, position: int) -> bool:
        line_start = source.rfind("\n", 0, position) + 1
        return self._is_ignored_line_position(source[line_start:position])

    def _is_ignored_line_position(self, prefix: str) -> bool:
        in_single_quote = False
        in_double_quote = False
        in_template = False
        in_line_comment = False
        in_block_comment = False
        escaped = False
        index = 0

        while index < len(prefix):
            char = prefix[index]
            next_char = prefix[index + 1] if index + 1 < len(prefix) else ""

            if in_line_comment:
                return True

            if in_block_comment:
                if char == "*" and next_char == "/":
                    in_block_comment = False
                    index += 2
                else:
                    index += 1
                continue

            if in_single_quote or in_double_quote or in_template:
                if escaped:
                    escaped = False
                    index += 1
                    continue
                if char == "\\":
                    escaped = True
                    index += 1
                    continue
                if in_single_quote and char == "'":
                    in_single_quote = False
                elif in_double_quote and char == '"':
                    in_double_quote = False
                elif in_template and char == "`":
                    in_template = False
                index += 1
                continue

            if char == "/" and next_char == "/":
                in_line_comment = True
                index += 2
                continue
            if char == "/" and next_char == "*":
                in_block_comment = True
                index += 2
                continue
            if char == "'":
                in_single_quote = True
            elif char == '"':
                in_double_quote = True
            elif char == "`":
                in_template = True
            index += 1

        return in_single_quote or in_double_quote or in_template or in_line_comment or in_block_comment

    def _classify_browser_fetch_argument(self, raw_argument: str, source_path: Path | None = None) -> str | None:
        argument = raw_argument.strip()
        literal_match = re.match(r"['\"]([^'\"]+)['\"]", argument)
        if literal_match is not None:
            return literal_match.group(1)
        if argument == "url" and source_path is not None and source_path.name == "apiReferenceSchemaTabs.ts":
            return self.EXTERNAL_RUNTIME_REQUEST_ENDPOINT
        return "external_runtime_request"

    def _declared_browser_network_sources(self, entry: dict[str, Any]) -> set[str]:
        declared: set[str] = set()
        raw_sources = entry.get("browser_network_sources", [])
        if not isinstance(raw_sources, list):
            return declared

        for item in raw_sources:
            if not isinstance(item, dict):
                continue
            endpoint = item.get("endpoint")
            source = item.get("source")
            if isinstance(endpoint, str) and isinstance(source, str):
                declared.add(f"{endpoint}|{source}")
        return declared

    def _check_local_tool_browser_network_source_metadata(self, entry: dict[str, Any]) -> list[str]:
        route = entry["route"]
        tool_endpoints = set(self._string_list(entry.get("tool_endpoints")))
        raw_sources = entry.get("browser_network_sources", [])
        messages: list[str] = []
        if not isinstance(raw_sources, list):
            messages.append(f"local tool route {route} must declare browser_network_sources as a list")
            return messages

        for item in raw_sources:
            if not isinstance(item, dict):
                messages.append(f"local tool route {route} browser_network_sources entries must be objects")
                continue

            endpoint = item.get("endpoint")
            source = item.get("source")
            purpose = item.get("purpose")
            if not isinstance(endpoint, str) or not isinstance(source, str):
                messages.append(
                    f"local tool route {route} browser_network_sources entries must declare endpoint and source"
                )
                continue

            source_key = f"{endpoint}|{source}"
            if not isinstance(purpose, str) or not purpose.strip():
                messages.append(
                    f"local tool route {route} browser_network_sources entry {source_key} must declare purpose"
                )
                continue

            expected_purpose = self._expected_local_tool_browser_purpose(endpoint, source)
            if expected_purpose is None:
                messages.append(
                    f"local tool route {route} browser_network_sources entry {source_key} "
                    f"uses unsupported browser endpoint {endpoint}"
                )
            elif purpose != expected_purpose:
                messages.append(
                    f"local tool route {route} browser_network_sources entry {source_key} "
                    f"must use purpose {expected_purpose}"
                )

            if endpoint.startswith("/api/") and endpoint not in tool_endpoints:
                messages.append(
                    f"local tool route {route} browser_network_sources entry {source_key} "
                    "must reference a declared tool_endpoint"
                )

            if endpoint == self.EXTERNAL_RUNTIME_REQUEST_ENDPOINT and Path(source).stem not in {"ApiPlayground", "apiReferenceSchemaTabs"}:
                messages.append(
                    f"local tool route {route} external runtime browser source {source} "
                    "must be isolated in an ApiPlayground component or the API reference schema-tabs loader"
                )
        return messages

    def _expected_local_tool_browser_purpose(self, endpoint: str, source: str) -> str | None:
        if endpoint == self.EXTERNAL_RUNTIME_REQUEST_ENDPOINT and Path(source).stem == "apiReferenceSchemaTabs":
            return "local_openapi_snapshot"
        return self.LOCAL_TOOL_BROWSER_PURPOSES.get(endpoint)

    def extract_portal_route_packages(self) -> dict[str, str]:
        if not self.app_path.exists():
            raise FileNotFoundError(f"portal App.tsx not found: {self.app_path}")

        source = self.app_path.read_text(encoding="utf-8")
        component_packages = {
            match.group(1): self._root_package_name(match.group(2))
            for match in self.LAZY_ROUTE_PATTERN.finditer(source)
        }

        route_packages: dict[str, str] = {}
        wildcard_mount_packages: dict[str, str] = {}
        route_stack: list[str] = []
        commerce_mount_prefix: str | None = None
        for line in source.splitlines():
            if commerce_mount_prefix is None and any(
                component in line for component in self.COMMERCE_HOST_MOUNT_COMPONENTS
            ):
                parent = route_stack[-1] if route_stack else ""
                if parent == "/console" or parent.startswith("/console/"):
                    commerce_mount_prefix = parent

            for match in self.ROUTE_PATTERN.finditer(line):
                attrs = match.group(1)
                path_match = self.PATH_PATTERN.search(attrs)
                if path_match is None:
                    continue

                path = path_match.group(1).strip()
                if not path or path == "*":
                    continue
                if path.endswith("/*"):
                    parent = route_stack[-1] if route_stack else ""
                    mount_path = self._join_route(parent, path[:-2])
                    component_match = self.ROUTE_ELEMENT_COMPONENT_PATTERN.search(attrs)
                    if component_match is not None:
                        package_name = component_packages.get(component_match.group(1))
                        if package_name is not None:
                            wildcard_mount_packages[mount_path] = package_name
                    continue

                parent = route_stack[-1] if route_stack else ""
                full_path = self._join_route(parent, path)
                self_closing = line.strip().endswith("/>")
                if self_closing:
                    component_match = self.ROUTE_ELEMENT_COMPONENT_PATTERN.search(attrs)
                    if component_match is not None:
                        package_name = component_packages.get(component_match.group(1))
                        if package_name is not None:
                            route_packages[full_path] = package_name
                else:
                    route_stack.append(full_path)

            close_count = line.count("</Route>")
            for _ in range(close_count):
                if route_stack:
                    route_stack.pop()

        for mount_path, package_name in wildcard_mount_packages.items():
            for child_route in self._contracted_child_routes_for_wildcard_mounts({mount_path}):
                route_packages.setdefault(child_route, package_name)

        if commerce_mount_prefix is not None:
            route_prefix = self._resolve_commerce_host_route_prefix(commerce_mount_prefix)
            for segment in self._commerce_host_route_segments():
                full_route = self._join_route(route_prefix, segment)
                route_packages.setdefault(
                    full_route,
                    self.COMMERCE_HOST_ROUTE_PACKAGES.get(segment, "@sdkwork/commerce-pc-host"),
                )
            for logical_route in self._commerce_host_logical_routes():
                route_packages.setdefault(logical_route, "@sdkwork/commerce-pc-wallet")

        _, shell_packages = self._extract_app_shell_route_data()
        route_packages.update(shell_packages)

        return route_packages

    def _app_shell_layout_path(self) -> Path:
        return self.root / self.APP_SHELL_LAYOUT_RELATIVE

    def _extract_app_shell_route_data(self) -> tuple[set[str], dict[str, str]]:
        shell_path = self._app_shell_layout_path()
        if not self.app_path.exists() or not shell_path.exists():
            return set(), {}

        app_source = self.app_path.read_text(encoding="utf-8")
        component_packages = {
            match.group(1): self._root_package_name(match.group(2))
            for match in self.LAZY_ROUTE_PATTERN.finditer(app_source)
        }

        routes: set[str] = set()
        route_packages: dict[str, str] = {}
        for line in shell_path.read_text(encoding="utf-8").splitlines():
            for match in self.ROUTE_PATTERN.finditer(line):
                attrs = match.group(1)
                path_match = self.PATH_PATTERN.search(attrs)
                if path_match is None:
                    continue
                path = path_match.group(1).strip()
                if not path:
                    continue
                normalized_path = path[:-2] if path.endswith("/*") else path
                component_match = self.ROUTE_ELEMENT_COMPONENT_PATTERN.search(attrs)
                if component_match is None:
                    continue
                package_name = component_packages.get(component_match.group(1))
                if package_name is None:
                    continue
                routes.add(normalized_path)
                route_packages[normalized_path] = package_name

        return routes, route_packages

    def _check_route_classification_evidence(self, entry: dict[str, Any]) -> list[str]:
        route = entry["route"]
        evidence_items = self._string_list(entry.get("evidence"))
        messages: list[str] = []
        if not evidence_items:
            messages.append(f"frontend route {route} classification must declare evidence")
            return messages

        for evidence in evidence_items:
            evidence_path = Path(evidence)
            if evidence_path.is_absolute():
                messages.append(
                    f"frontend route {route} classification evidence must be a repo-relative path: {evidence}"
                )
                continue

            if evidence.startswith("sdkwork-documents/") or evidence.startswith("data/sdkwork-models/"):
                resolved = self._resolve_workspace_sibling_path(evidence)
            elif ".." in evidence_path.parts:
                messages.append(
                    f"frontend route {route} classification evidence must be a repo-relative path: {evidence}"
                )
                continue
            else:
                resolved = (self.root / evidence).resolve()
                try:
                    resolved.relative_to(self.root)
                except ValueError:
                    messages.append(
                        f"frontend route {route} classification evidence must stay inside repository: {evidence}"
                    )
                    continue

            if not resolved.exists():
                messages.append(f"frontend route {route} classification evidence does not exist: {evidence}")
        return messages

    def _check_schema_content_runtime_network_boundary(self, entry: dict[str, Any]) -> list[str]:
        route = entry["route"]
        package_name = entry.get("package")
        if not isinstance(package_name, str):
            return []

        source_paths = self._schema_content_source_paths(entry, package_name)
        messages: list[str] = []
        for source_path in source_paths:
            source = self._safe_read_text(source_path)
            if source is None:
                continue
            if self.RUNTIME_NETWORK_CLIENT_PATTERN.search(source):
                messages.append(
                    f"schema content route {route} package {package_name} "
                    "must not contain runtime network client usage: "
                    f"{source_path.relative_to(self.root).as_posix()}"
                )
        return messages

    def _schema_content_source_paths(self, entry: dict[str, Any], package_name: str) -> list[Path]:
        package_route_entries = self._package_route_classification_entries(package_name)
        package_delivery_kinds = {
            item.get("delivery_kind")
            for item in package_route_entries
            if isinstance(item, dict)
        }

        package_src = self.portal_root / "packages" / package_name / "src"
        if package_delivery_kinds <= {"schema_provenanced_content"} and package_src.exists():
            return [
                path
                for path in sorted(package_src.rglob("*"))
                if path.is_file() and path.suffix in self.BROWSER_SOURCE_EXTENSIONS
            ]

        evidence_paths: list[Path] = []
        for evidence in self._string_list(entry.get("evidence")):
            evidence_path = Path(evidence)
            if evidence_path.is_absolute() or ".." in evidence_path.parts:
                continue
            resolved = (self.root / evidence).resolve()
            if (
                resolved.is_file()
                and resolved.suffix in self.BROWSER_SOURCE_EXTENSIONS
                and package_src in resolved.parents
            ):
                evidence_paths.append(resolved)
        return sorted(set(evidence_paths))

    def _package_route_classification_entries(self, package_name: str) -> list[dict[str, Any]]:
        try:
            classification = self._load_route_classification()
        except (RuntimeError, ValueError):
            return []

        entries = classification.get("routes", [])
        if not isinstance(entries, list):
            return []
        return [
            entry
            for entry in entries
            if isinstance(entry, dict) and entry.get("package") == package_name
        ]

    def _first_index(self, source: str, needles: tuple[str, ...]) -> int:
        positions = [source.find(needle) for needle in needles]
        found = [position for position in positions if position != -1]
        if not found:
            return -1
        return min(found)

    def _static_imports(self, source: str) -> list[str]:
        return [match.group(1) for match in self.IMPORT_PATTERN.finditer(source)]

    def _root_package_name(self, module_name: str) -> str:
        if module_name.startswith("."):
            return "portal-root"
        if module_name.startswith("@"):
            parts = module_name.split("/")
            return "/".join(parts[:2])
        return module_name.split("/")[0]

    def _safe_read_text(self, path: Path) -> str | None:
        try:
            return path.read_text(encoding="utf-8")
        except OSError:
            return None


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate portal routes and field contracts against schema manifest.")
    parser.add_argument("--root", type=Path, default=Path.cwd(), help="sdkwork-clawrouter root directory")
    parser.add_argument("--app", type=Path, default=None, help="portal App.tsx path")
    parser.add_argument("--manifest", type=Path, default=None, help="schema manifest JSON path")
    parser.add_argument("--contract", type=Path, default=None, help="frontend field contract YAML path")
    parser.add_argument(
        "--route-classification",
        type=Path,
        default=None,
        help="frontend route classification YAML path",
    )
    parser.add_argument(
        "--static-source-manifest",
        type=Path,
        default=None,
        help="frontend static source manifest JSON path",
    )
    args = parser.parse_args()

    result = FrontendContractGuardian(
        root=args.root,
        app_path=args.app,
        manifest_path=args.manifest,
        contract_path=args.contract,
        route_classification_path=args.route_classification,
        static_source_manifest_path=args.static_source_manifest,
        require_route_classification=True,
    ).run()
    if result.ok:
        print("Frontend contract guardian passed")
        return 0

    for message in result.messages:
        print(message)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
