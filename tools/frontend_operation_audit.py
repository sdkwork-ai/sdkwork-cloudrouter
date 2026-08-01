from __future__ import annotations

import argparse
import json
import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from tools.frontend_contract_loader import default_frontend_contract_path, load_frontend_field_contract
from tools.relay_retired_admin_surfaces import (
    is_backend_route_manifest_source,
    is_relay_retired_admin_source,
    is_route_manifest_bootstrap_source,
)

try:
    import yaml
except ImportError as exc:  # pragma: no cover - exercised only on missing tooling
    yaml = None
    _YAML_IMPORT_ERROR = exc
else:
    _YAML_IMPORT_ERROR = None


@dataclass(frozen=True)
class FrontendOperationAuditResult:
    ok: bool
    messages: list[str]


class FrontendOperationAudit:
    """Audit portal service operations against route table contracts."""

    SOURCE_EXCLUDED_DIRECTORIES = frozenset(
        {
            ".git",
            ".turbo",
            ".vite",
            "coverage",
            "dist",
            "node_modules",
        }
    )
    CLASS_STATIC_ASYNC_PATTERN = re.compile(r"\bstatic\s+async\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(")
    OBJECT_ASYNC_PATTERN = re.compile(r"^\s*async\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(", re.MULTILINE)
    EXPORT_ASYNC_FUNCTION_PATTERN = re.compile(r"\bexport\s+async\s+function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(")
    VALID_KINDS = {"read", "create", "update", "delete", "action", "sync"}
    WRITE_KINDS = {"create", "update", "delete", "action", "sync"}
    VALID_API_SURFACES = {"app", "backend", "openai_v1"}
    API_PREFIXES = {
        "app": "/app/v3/api",
        "backend": "/backend/v3/api",
        "openai_v1": "/v1",
    }
    KIND_METHODS = {
        "read": {"GET"},
        "create": {"POST"},
        "update": {"PATCH", "PUT"},
        "delete": {"DELETE"},
        "action": {"POST"},
        "sync": {"POST"},
    }
    SDK_CLIENTS = {
        "app": "getClawRouterAppSdkClient",
        "backend": "getClawRouterBackendSdkClient",
        "openai_v1": "getClawRouterAiSdkClient",
    }
    CLAWROUTER_DOMAIN_TRANSPORT_DOMAINS = frozenset({
        "commerce",
        "promotion",
        "promotions",
        "wallet",
        "membership",
        "memberships",
        "catalog",
        "order",
        "orders",
        "payment",
        "payments",
        "inventory",
        "finance",
        "invoice",
        "invoices",
        "recharge",
        "recharges",
    })
    COMMERCE_DEPENDENCY_DOMAINS = CLAWROUTER_DOMAIN_TRANSPORT_DOMAINS
    COMMERCE_SERVICE_CLIENT = "getSdkworkCommerceService"
    COMMERCE_SERVICE_PATTERN = re.compile(r"\bgetSdkworkCommerceService\s*\(")
    COMMERCE_API_PATH_PREFIXES = (
        "/app/v3/api/accounts",
        "/app/v3/api/addresses",
        "/app/v3/api/billing",
        "/app/v3/api/cart",
        "/app/v3/api/catalog",
        "/app/v3/api/checkout",
        "/app/v3/api/fulfillments",
        "/app/v3/api/invoices",
        "/app/v3/api/memberships",
        "/app/v3/api/orders",
        "/app/v3/api/payments",
        "/app/v3/api/promotions",
        "/app/v3/api/recharges",
        "/app/v3/api/refunds",
        "/app/v3/api/shipments",
        "/app/v3/api/wallet",
        "/backend/v3/api/audit/commerce_events",
        "/backend/v3/api/catalog",
        "/backend/v3/api/commerce_reports",
        "/backend/v3/api/fulfillments",
        "/backend/v3/api/inventory",
        "/backend/v3/api/invoices",
        "/backend/v3/api/memberships",
        "/backend/v3/api/orders",
        "/backend/v3/api/payments",
        "/backend/v3/api/promotions",
        "/backend/v3/api/recharges",
        "/backend/v3/api/refunds",
        "/backend/v3/api/shipments",
        "/backend/v3/api/wallet",
    )
    GENERATIONS_DEPENDENCY_DOMAINS = frozenset({"generations", "generation"})
    GENERATIONS_APP_SDK_CLIENT = "getSdkworkGenerationsAppSdkClient"
    GENERATIONS_SERVICE_CLIENT = "createSdkworkGenerationService"
    GENERATIONS_APP_SDK_PATTERN = re.compile(r"\bgetSdkworkGenerationsAppSdkClient\s*\(")
    GENERATIONS_SERVICE_PATTERN = re.compile(r"\bcreateSdkworkGenerationService\s*\(")
    GENERATIONS_INJECTED_SERVICE_PATTERN = re.compile(
        r"\bSdkworkGenerationService\b[\s\S]*\bservice\s*\.\s*createGenerationCommand\s*\("
    )
    GENERATIONS_WORKSPACE_PATTERN = re.compile(r"\bservice\s*\.\s*getWorkspace\s*\(")
    GENERATIONS_API_PATH_PREFIXES = (
        "/app/v3/api/generations",
    )
    MEMORY_DEPENDENCY_DOMAINS = frozenset({"memory"})
    MEMORY_APP_SDK_PATTERN = re.compile(r"\bgetSdkworkMemoryAppSdkClient\s*\(")
    MEMORY_CLIENT_PATTERN = re.compile(r"\bclient\s*\.\s*memory\s*\.")
    NOTIFICATION_DEPENDENCY_DOMAINS = frozenset({"notification"})
    NOTIFICATION_SERVICE_PATTERN = re.compile(r"\bcreatePortalNotificationService\s*\(")
    NOTIFICATION_PC_REACT_PATTERN = re.compile(r"@sdkwork/notification-pc-react")
    MODELS_DEPENDENCY_DOMAINS = frozenset({"intelligence", "ai"})
    MODELS_BACKEND_SDK_CLIENT = "getModelsBackendSdkClient"
    MODELS_BACKEND_SDK_PATTERN = re.compile(r"\bgetModelsBackendSdkClient\s*\(")
    MODELS_APP_SDK_PATTERN = re.compile(r"\bgetModelsAppSdkClient\s*\(")
    MODELS_BACKEND_API_PATH_PREFIXES = (
        "/backend/v3/api/ai/model_vendors",
        "/backend/v3/api/ai/models",
        "/backend/v3/api/ai/model_mappings",
        "/backend/v3/api/ai/model_rankings",
        "/backend/v3/api/ai/resources",
        "/backend/v3/api/ai/resource_groups",
    )
    MODELS_SOURCE_PREFIX = "../sdkwork-models/"
    CLAWROUTER_PORTAL_MODELS_SOURCE_PREFIX = (
        "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-models/"
    )
    CLAWROUTER_PORTAL_RANKINGS_SOURCE_PREFIX = (
        "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-rankings/"
    )
    APPBASE_APP_DEPENDENCY_DOMAINS = frozenset({"auth", "iam", "appbase"})
    CLAWROUTER_OWNED_IAM_APP_API_PATH_PREFIXES = (
        "/app/v3/api/iam/api_keys",
        "/app/v3/api/iam/users/settings",
    )
    APPBASE_APP_SERVICE_CLIENT = "getSdkworkAppbaseAppSdkClient"
    APPBASE_BACKEND_SERVICE_CLIENT = "getSdkworkAppbaseBackendSdkClient"
    APPBASE_APP_SERVICE_PATTERN = re.compile(r"\bgetSdkworkAppbaseAppSdkClient\s*\(")
    APPBASE_BACKEND_SERVICE_PATTERN = re.compile(r"\bgetSdkworkAppbaseBackendSdkClient\s*\(")
    APPBASE_BACKEND_DEPENDENCY_OPERATIONS = frozenset(
        {
            ("GET", "/backend/v3/api/iam/api_keys"),
            ("POST", "/backend/v3/api/iam/api_keys/{apiKeyId}/revoke"),
            ("GET", "/backend/v3/api/iam/users"),
            ("POST", "/backend/v3/api/iam/users"),
            ("PATCH", "/backend/v3/api/iam/users/{userId}"),
        }
    )
    COMMERCE_RUNTIME_IMPORT_PATTERN = re.compile(
        r"from\s+['\"](?:\./)?commerce-runtime(?:\.ts)?['\"]"
    )
    LOCAL_RUNTIME_ADAPTER_IMPORT_PATTERN = re.compile(
        r"(?:from\s+|import\s*\(\s*)['\"](\.{1,2}/[^'\"]*RuntimeApiOperations(?:\.[cm]?[tj]sx?)?)['\"]"
    )
    COMMERCE_RUNTIME_SOURCE = (
        "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawroutes-pc-commons/src/sdk-clients.ts"
    )
    MISSING_COMMERCE_DEPENDENCY_PATTERN = re.compile(
        r"\bmissingCommerceDependencyOperation\s*\(\s*['\"]([^'\"]+)['\"]\s*\)"
    )
    OPERATION_SOURCE_ALIASES: dict[str, str] = {
        "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawroutes-pc-commons/src/notificationService.ts": (
            "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-commons/src/notificationService.ts"
        ),
    }
    OPERATION_AUDIT_EXEMPT_SOURCE_PREFIXES: tuple[str, ...] = (
        "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawroutes-pc-commons/src/sessionService.ts",
    )
    AGENT_DEPENDENCY_DOMAINS = frozenset({"agent"})
    AGENT_BACKEND_SDK_PATTERN = re.compile(r"\bgetSdkworkAgentBackendSdkClient\s*\(")
    PROMPTS_DEPENDENCY_DOMAINS = frozenset({"prompts"})
    PROMPTS_BACKEND_SDK_PATTERN = re.compile(r"\bgetSdkworkPromptsBackendSdkClient\s*\(")
    DRIVE_DEPENDENCY_DOMAINS = frozenset({"drive"})
    DRIVE_APP_SDK_PATTERN = re.compile(r"\bgetSdkworkDriveAppSdkClient\s*\(")
    DRIVE_BACKEND_SDK_PATTERN = re.compile(
        r"\b(?:getSdkworkDriveBackendSdkClient|getDriveStorageSdk)\s*\("
    )
    ADMIN_APP_API_SURFACE_ROUTES = frozenset(
        {
            "/admin/drive/spaces",
            "/admin/drive/nodes",
            "/admin/drive/permissions",
            "/admin/drive/share-links",
            "/admin/drive/audit",
        }
    )
    CLAWROUTER_BACKEND_DOMAIN_TRANSPORT_PATTERN = re.compile(
        r"\bgetClawRouterBackendSdkClient\s*\(\s*\)\s*\.(?:wallet|memberships|promotions|catalog|orders|payments|inventory|recharges|refunds|fulfillments|invoices|commerceReports|afterSales|shipments|audit)\b"
    )
    CLAWROUTER_APP_DOMAIN_TRANSPORT_PATTERN = re.compile(
        r"\bgetClawRouterAppSdkClient\s*\(\s*\)\s*\.(?:wallet|memberships|promotions|catalog|orders|payments|cart|checkout|accounts|recharges|refunds|fulfillments|shipments|afterSales)\b"
    )
    APPBASE_IAM_RUNTIME_PATTERN = re.compile(r"\bgetClawRouterIamRuntime\s*\(\s*\)\s*\.service\b")
    APPBASE_IAM_CONTROLLER_PATTERN = re.compile(
        r"\bcreateSdkworkIamRuntimeAuthController\s*\([\s\S]*\bgetRuntime\s*:\s*getClawRouterIamRuntime\b"
    )
    APPBASE_IAM_CONTROLLER_OPERATIONS = (
        "bootstrap",
        "getOAuthAuthorizationUrl",
        "register",
        "requestPasswordReset",
        "resetPassword",
        "refreshSession",
        "sendVerifyCode",
        "signIn",
        "signInWithEmailCode",
        "signInWithOAuth",
        "signInWithPhoneCode",
        "signInWithSessionBridge",
        "signOut",
        "updateCurrentSession",
        "verifyCode",
    )
    AUTH_OPERATION_VARIANTS = frozenset(
        {
            "signInWithEmailCode",
            "signInWithPhoneCode",
            "signInWithSessionBridge",
        }
    )
    MOCK_DATA_PATTERNS = (
        ("setTimeout", re.compile(r"\bsetTimeout\s*\(")),
        ("Math.random", re.compile(r"\bMath\.random\s*\(")),
        ("Promise.resolve", re.compile(r"\bPromise\.resolve\s*\(")),
        ("mock data", re.compile(r"\bmock\s+data\b", re.IGNORECASE)),
        ("local mock", re.compile(r"\blocal\s+mock\b", re.IGNORECASE)),
    )
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
        / "backend-admin-commerce.yaml",
    )
    SDK_AUTHORITY_REGISTRY = "frontend_operation_sdk_authorities"

    def __init__(
        self,
        root: Path,
        contract_path: Path | None = None,
        output_path: Path | None = None,
    ) -> None:
        self.root = Path(root).resolve()
        self.contract_path = (
            Path(contract_path).resolve()
            if contract_path is not None
            else default_frontend_contract_path(self.root)
        )
        self.output_path = (
            Path(output_path).resolve()
            if output_path is not None
            else self.root / "generated" / "schema" / "frontend" / "frontend-operation-audit.json"
        )

    def generate(self) -> dict[str, Any]:
        operations: list[dict[str, Any]] = []
        contract_index = self._frontend_operation_contract_index()
        for source in self._source_files():
            display_source = self._display_path(source)
            for operation in self._extract_operations(source):
                contract = contract_index.get(f"{display_source}#{operation}", {})
                operations.append(
                    {
                        "source": display_source,
                        "operation": operation,
                        "operation_scope": contract.get("operation_scope"),
                        "route": contract.get("route"),
                        "kind": contract.get("kind"),
                        "api_surface": contract.get("api_surface"),
                        "api_method": contract.get("api_method"),
                        "api_path": contract.get("api_path"),
                        "sdk_operations": contract.get("sdk_operations", []),
                        "read_sources": contract.get("read_sources", []),
                        "write_tables": contract.get("write_tables", []),
                        "file_targets": contract.get("file_targets", []),
                    }
                )

        operations.sort(key=lambda item: (item["source"], item["operation"]))
        return {
            "summary": {
                "source_file_count": len({item["source"] for item in operations}),
                "operation_count": len(operations),
                "write_operation_count": sum(1 for item in operations if item.get("kind") in self.WRITE_KINDS),
            },
            "operations": operations,
        }

    def render_json(self) -> str:
        return json.dumps(self.generate(), ensure_ascii=False, indent=2, sort_keys=True) + "\n"

    def write(self, output_path: Path | None = None) -> Path:
        target = Path(output_path) if output_path is not None else self.output_path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(self.render_json(), encoding="utf-8")
        return target

    def check(self, output_path: Path | None = None) -> FrontendOperationAuditResult:
        validation = self.validate()
        if not validation.ok:
            return validation

        target = Path(output_path) if output_path is not None else self.output_path
        expected = self.render_json()
        if not target.exists():
            return FrontendOperationAuditResult(ok=False, messages=[f"frontend operation audit is missing: {target}"])
        actual = target.read_text(encoding="utf-8")
        if actual != expected:
            return FrontendOperationAuditResult(ok=False, messages=[f"frontend operation audit is stale: {target}"])
        return FrontendOperationAuditResult(ok=True, messages=[])

    def validate(self) -> FrontendOperationAuditResult:
        actual = {
            f"{item['source']}#{item['operation']}"
            for item in self.generate()["operations"]
            if isinstance(item.get("source"), str) and isinstance(item.get("operation"), str)
        }
        contract = self._load_contract()
        entries = contract.get("frontend_operations", [])
        if not isinstance(entries, list):
            return FrontendOperationAuditResult(ok=False, messages=["frontend_operations must be a list"])

        routes = contract.get("routes", [])
        route_tables: dict[str, set[str]] = {}
        if isinstance(routes, list):
            for route_entry in routes:
                if not isinstance(route_entry, dict):
                    continue
                route = route_entry.get("route")
                required_tables = route_entry.get("required_tables", [])
                if isinstance(route, str) and isinstance(required_tables, list):
                    route_tables[route] = {table for table in required_tables if isinstance(table, str)}

        expected: set[str] = set()
        messages: list[str] = []
        source_text_cache: dict[str, str | None] = {}
        sdk_authority_cache: dict[str, tuple[dict[str, tuple[str, str]], list[str]]] = {}
        for entry in entries:
            if not isinstance(entry, dict):
                continue
            source = entry.get("source")
            operation = entry.get("operation")
            if isinstance(source, str) and (
                is_route_manifest_bootstrap_source(source)
                or is_backend_route_manifest_source(source)
            ):
                continue
            if isinstance(source, str) and is_relay_retired_admin_source(source):
                continue
            route = entry.get("route")
            route_contract = (
                self._resolve_route_contract(route, route_tables)
                if isinstance(route, str)
                else None
            )
            kind = entry.get("kind")
            api_surface = entry.get("api_surface")
            api_method = entry.get("api_method")
            api_path = entry.get("api_path")
            operation_scope = entry.get("operation_scope")
            sdk_domain = entry.get("sdk_domain")
            is_app_shell_operation = operation_scope == "app_shell"
            is_composition = operation_scope == "composition"
            if not isinstance(source, str) or not isinstance(operation, str):
                messages.append("frontend_operations entries must include source and operation")
                continue
            key = f"{source}#{operation}"
            expected.add(key)

            if not isinstance(route, str):
                messages.append(f"frontend operation {key} must declare route")
            elif route_contract is None:
                messages.append(f"frontend operation {key} references route without route contract: {route}")
            if not isinstance(kind, str) or kind not in self.VALID_KINDS:
                messages.append(f"frontend operation {key} kind must be one of {', '.join(sorted(self.VALID_KINDS))}")
            if not isinstance(api_surface, str):
                messages.append(f"frontend operation {key} must declare api_surface")
            elif api_surface not in self.VALID_API_SURFACES:
                messages.append(f"frontend operation {key} api_surface must be one of {', '.join(sorted(self.VALID_API_SURFACES))}")
            if is_composition and api_method is not None:
                messages.append(f"frontend operation {key} composition must not declare a single api_method")
            elif not is_composition and not isinstance(api_method, str):
                messages.append(f"frontend operation {key} must declare api_method")
            elif isinstance(api_method, str) and isinstance(kind, str) and kind in self.KIND_METHODS:
                normalized_method = api_method.upper()
                allowed_methods = self._allowed_methods(kind, api_surface)
                if normalized_method not in allowed_methods:
                    messages.append(f"frontend operation {key} kind {kind} does not allow api_method {normalized_method}")
            if is_composition and api_path is not None:
                messages.append(f"frontend operation {key} composition must not declare a single api_path")
            elif not is_composition and not isinstance(api_path, str):
                messages.append(f"frontend operation {key} must declare api_path")
            messages.extend(
                self._validate_sdk_operation_bindings(
                    entry=entry,
                    key=key,
                    kind=kind,
                    api_method=api_method,
                    api_path=api_path,
                    is_composition=is_composition,
                    contract=contract,
                    authority_cache=sdk_authority_cache,
                )
            )
            if isinstance(route, str) and isinstance(api_surface, str):
                if (
                    route.startswith("/admin")
                    and api_surface != "backend"
                    and route not in self.ADMIN_APP_API_SURFACE_ROUTES
                ):
                    messages.append(f"frontend operation {key} route {route} must use backend api_surface")
                elif not route.startswith("/admin") and api_surface == "backend":
                    messages.append(f"frontend operation {key} route {route} must not use backend api_surface")
            if isinstance(api_surface, str) and api_surface in self.SDK_CLIENTS and not is_app_shell_operation:
                source_text = self._source_text(source, source_text_cache)
                if (
                    source_text is not None
                    and not self._source_uses_generated_sdk_boundary(
                        api_surface=api_surface,
                        sdk_domain=sdk_domain,
                        source_operation=entry,
                        source=source,
                        source_text=source_text,
                        source_text_cache=source_text_cache,
                    )
                ):
                    messages.append(self._sdk_boundary_error_message(key, api_surface, sdk_domain, entry))
                for label in self._mock_data_pattern_labels(source_text):
                    messages.append(f"frontend operation {key} must not use mock async data pattern: {label}")

            read_sources = entry.get("read_sources", [])
            write_tables = entry.get("write_tables", [])
            file_targets = entry.get("file_targets", [])
            request_content_type = entry.get("request_content_type")
            is_multipart_upload = request_content_type == "multipart/form-data"
            valid_read_sources = isinstance(read_sources, list) and all(isinstance(source, str) for source in read_sources)
            valid_write_tables = isinstance(write_tables, list) and all(isinstance(table, str) for table in write_tables)
            valid_file_targets = isinstance(file_targets, list) and all(isinstance(target, str) for target in file_targets)

            if not valid_read_sources:
                messages.append(f"frontend operation {key} must declare read_sources as a string list")
            elif not read_sources and not is_multipart_upload:
                messages.append(f"frontend operation {key} must declare non-empty read_sources")
            elif (
                read_sources
                and not is_app_shell_operation
                and isinstance(route, str)
                and route_contract is not None
            ):
                for read_source in read_sources:
                    if read_source not in route_tables[route_contract]:
                        messages.append(
                            f"frontend operation {key} read_source {read_source} is not declared in route {route_contract} required_tables"
                        )

            if not valid_write_tables:
                messages.append(f"frontend operation {key} write_tables must be a string list")
            if not valid_file_targets:
                messages.append(f"frontend operation {key} file_targets must be a string list")
            if is_multipart_upload and valid_file_targets and not file_targets:
                messages.append(f"frontend operation {key} multipart upload must declare non-empty file_targets")

            if kind in self.WRITE_KINDS:
                if (
                    valid_write_tables
                    and not write_tables
                    and not is_multipart_upload
                    and not is_app_shell_operation
                    and not self._is_appbase_dependency_operation(
                        api_surface=api_surface,
                        sdk_domain=sdk_domain,
                        source_operation=entry,
                    )
                    and not self._is_external_sdk_operation(entry)
                ):
                    messages.append(f"frontend operation {key} kind {kind} must declare non-empty write_tables")
                elif (
                    valid_write_tables
                    and write_tables
                    and not is_app_shell_operation
                    and isinstance(route, str)
                    and route_contract is not None
                ):
                    for write_table in write_tables:
                        if write_table not in route_tables[route_contract]:
                            messages.append(
                                f"frontend operation {key} write_table {write_table} is not declared in route {route_contract} required_tables"
                            )
            elif valid_write_tables and write_tables:
                messages.append(f"frontend operation {key} kind read must not declare write_tables")

        for key in sorted(actual):
            source = key.split("#", 1)[0]
            if (
                is_backend_route_manifest_source(source)
                or is_relay_retired_admin_source(source)
                or self._is_operation_audit_exempt_source(source)
            ):
                continue
            resolved = self._resolve_operation_alias(key)
            if resolved in expected or key in expected:
                continue
            source, operation = key.split("#", 1)
            if (
                source.endswith("/src/auth/clawRouterAuthController.ts")
                and operation in self.AUTH_OPERATION_VARIANTS
                and f"{source}#signIn" in expected
            ):
                continue
            messages.append(f"frontend operation missing from contract: {key}")
        for key in sorted(expected):
            source = key.split("#", 1)[0]
            if (
                is_route_manifest_bootstrap_source(source)
                or is_backend_route_manifest_source(source)
                or is_relay_retired_admin_source(source)
            ):
                continue
            if key not in actual:
                messages.append(f"frontend operation contract references missing operation: {key}")

        return FrontendOperationAuditResult(ok=not messages, messages=messages)

    def _source_files(self) -> list[Path]:
        portal_root = self.root / "apps" / "sdkwork-clawrouter-pc"
        source_roots = [portal_root / "packages", portal_root / "src"]
        files: list[Path] = []
        for source_root in source_roots:
            if not source_root.exists():
                continue
            for path in self._walk_source_tree(source_root):
                if path.suffix not in {".ts", ".tsx"}:
                    continue
                if self._is_operation_source_file(path, portal_root):
                    files.append(path)
        for source in self._contract_operation_sources():
            path = self.root / source
            if path.exists() and path.is_file() and path.suffix in {".ts", ".tsx"}:
                files.append(path)
        return sorted(set(files))

    def _is_operation_source_file(self, path: Path, portal_root: Path) -> bool:
        lowered_name = path.name.lower()
        if "service" in lowered_name:
            return True
        portal_src = portal_root / "src"
        try:
            path.relative_to(portal_src)
        except ValueError:
            return False
        return "controller" in lowered_name

    def _walk_source_tree(self, root: Path) -> list[Path]:
        files: list[Path] = []

        def ignore_scan_error(_error: OSError) -> None:
            return None

        for directory, names, filenames in os.walk(root, onerror=ignore_scan_error):
            names[:] = sorted(
                name for name in names if name not in self.SOURCE_EXCLUDED_DIRECTORIES
            )
            base = Path(directory)
            for filename in sorted(filenames):
                files.append(base / filename)
        return files

    def _extract_operations(self, source: Path) -> list[str]:
        text = source.read_text(encoding="utf-8", errors="ignore")
        operations: list[str] = []
        if self.APPBASE_IAM_CONTROLLER_PATTERN.search(text):
            operations.extend(self.APPBASE_IAM_CONTROLLER_OPERATIONS)
        class_spans = self._class_spans(text)
        for match in self.CLASS_STATIC_ASYNC_PATTERN.finditer(text):
            operation = match.group(1)
            if operation not in operations:
                operations.append(operation)
        for pattern in [self.OBJECT_ASYNC_PATTERN, self.EXPORT_ASYNC_FUNCTION_PATTERN]:
            for match in pattern.finditer(text):
                if self._inside_spans(match.start(), class_spans):
                    continue
                operation = match.group(1)
                if operation not in operations:
                    operations.append(operation)
        return operations

    def _class_spans(self, text: str) -> list[tuple[int, int]]:
        spans: list[tuple[int, int]] = []
        for match in re.finditer(r"\bclass\s+[A-Za-z_][A-Za-z0-9_]*", text):
            start = text.find("{", match.end())
            if start == -1:
                continue
            end = self._balanced_block_end(text, start)
            spans.append((match.start(), end))
        return spans

    def _balanced_block_end(self, text: str, start: int) -> int:
        depth = 0
        for index in range(start, len(text)):
            char = text[index]
            if char == "{":
                depth += 1
            elif char == "}":
                depth -= 1
                if depth == 0:
                    return index + 1
        return len(text)

    def _inside_spans(self, index: int, spans: list[tuple[int, int]]) -> bool:
        return any(start <= index < end for start, end in spans)

    def _load_contract(self) -> dict[str, Any]:
        if yaml is None:
            raise RuntimeError("PyYAML is required to load frontend field contracts") from _YAML_IMPORT_ERROR
        contract = load_frontend_field_contract(self.root, self.contract_path)
        if not isinstance(contract, dict):
            raise ValueError("frontend field contract root must be a mapping")
        contract = self._append_dependency_operation_fragments(contract)
        return contract

    def _append_dependency_operation_fragments(self, contract: dict[str, Any]) -> dict[str, Any]:
        entries = contract.get("frontend_operations", [])
        if not isinstance(entries, list):
            return contract

        merged = dict(contract)
        merged_entries = list(entries)
        merged_authorities = dict(contract.get(self.SDK_AUTHORITY_REGISTRY, {})) \
            if isinstance(contract.get(self.SDK_AUTHORITY_REGISTRY), dict) else {}
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
            fragment = yaml.safe_load(fragment_path.read_text(encoding="utf-8"))
            if not isinstance(fragment, dict):
                continue
            fragment_entries = fragment.get("frontend_operations", [])
            fragment_authorities = fragment.get(self.SDK_AUTHORITY_REGISTRY, {})
            if isinstance(fragment_authorities, dict):
                for family, authority in fragment_authorities.items():
                    existing_authority = merged_authorities.get(family)
                    if existing_authority is not None and existing_authority != authority:
                        raise ValueError(f"conflicting frontend operation SDK authority: {family}")
                    merged_authorities[family] = authority
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
        merged["frontend_operations"] = merged_entries
        if merged_authorities:
            merged[self.SDK_AUTHORITY_REGISTRY] = merged_authorities
        return merged

    def _frontend_operation_contract_index(self) -> dict[str, dict[str, Any]]:
        contract = self._load_contract()
        entries = contract.get("frontend_operations", [])
        if not isinstance(entries, list):
            return {}

        indexed: dict[str, dict[str, Any]] = {}
        for entry in entries:
            if not isinstance(entry, dict):
                continue
            source = entry.get("source")
            operation = entry.get("operation")
            if not isinstance(source, str) or not isinstance(operation, str):
                continue
            indexed[f"{source}#{operation}"] = entry
        return indexed

    def _contract_operation_sources(self) -> set[str]:
        contract = self._load_contract()
        entries = contract.get("frontend_operations", [])
        if not isinstance(entries, list):
            return set()

        sources: set[str] = set()
        for entry in entries:
            if not isinstance(entry, dict):
                continue
            source = entry.get("source")
            if isinstance(source, str):
                sources.add(source)
        return sources

    def _is_operation_audit_exempt_source(self, source: str) -> bool:
        normalized = source.replace("\\", "/")
        return any(normalized.endswith(prefix) or prefix in normalized for prefix in self.OPERATION_AUDIT_EXEMPT_SOURCE_PREFIXES)

    def _resolve_operation_alias(self, key: str) -> str:
        source, operation = key.split("#", 1)
        normalized = source.replace("\\", "/")
        for alias_source, canonical_source in self.OPERATION_SOURCE_ALIASES.items():
            if normalized == alias_source:
                return f"{canonical_source}#{operation}"
            if normalized == canonical_source:
                return f"{alias_source}#{operation}"
        if normalized.endswith("sdkwork-clawrouter-pc-commons/src/sessionService.ts"):
            return (
                "apps/sdkwork-clawrouter-pc/packages/sdkwork-clawroutes-pc-commons/src/sessionService.ts"
                f"#{operation}"
            )
        return key

    def _allowed_methods(self, kind: str, api_surface: Any) -> set[str]:
        methods = set(self.KIND_METHODS[kind])
        if kind == "read" and api_surface == "backend":
            methods.add("POST")
        return methods

    def _validate_sdk_operation_bindings(
        self,
        *,
        entry: dict[str, Any],
        key: str,
        kind: Any,
        api_method: Any,
        api_path: Any,
        is_composition: bool,
        contract: dict[str, Any],
        authority_cache: dict[str, tuple[dict[str, tuple[str, str]], list[str]]],
    ) -> list[str]:
        raw_bindings = entry.get("sdk_operations")
        if raw_bindings is None:
            if is_composition:
                return [f"frontend operation {key} composition must declare sdk_operations"]
            return []
        if not isinstance(raw_bindings, list):
            return [f"frontend operation {key} sdk_operations must be a list"]
        if is_composition and len(raw_bindings) < 2:
            return [f"frontend operation {key} composition must bind at least two SDK operations"]
        if not is_composition and len(raw_bindings) != 1:
            return [f"frontend operation {key} must bind exactly one SDK operation"]

        messages: list[str] = []
        for index, binding in enumerate(raw_bindings):
            binding_key = f"{key} sdk_operations[{index}]"
            if not isinstance(binding, dict):
                messages.append(f"frontend operation {binding_key} must be a mapping")
                continue
            family = binding.get("sdk_family")
            operation_id = binding.get("operation_id")
            if not isinstance(family, str) or not family:
                messages.append(f"frontend operation {binding_key} must declare sdk_family")
                continue
            if not isinstance(operation_id, str) or not operation_id:
                messages.append(f"frontend operation {binding_key} must declare operation_id")
                continue

            was_cached = family in authority_cache
            if not was_cached:
                authority_cache[family] = self._load_sdk_authority_operations(
                    family=family,
                    contract=contract,
                )
            operations, authority_errors = authority_cache[family]
            if authority_errors:
                if not was_cached:
                    messages.extend(authority_errors)
                continue
            authority_operation = operations.get(operation_id)
            if authority_operation is None:
                messages.append(
                    f"frontend operation {binding_key} references missing {family} operation_id: {operation_id}"
                )
                continue

            authority_method, authority_path = authority_operation
            if is_composition:
                if isinstance(kind, str) and kind == "read" and authority_method not in self._allowed_methods(kind, "backend"):
                    messages.append(
                        f"frontend operation {binding_key} read composition references non-read "
                        f"{authority_method} {authority_path}"
                    )
                continue
            if isinstance(api_method, str) and api_method.upper() != authority_method:
                messages.append(
                    f"frontend operation {binding_key} method {api_method.upper()} does not match "
                    f"{family} authority {authority_method}"
                )
            if isinstance(api_path, str) and api_path != authority_path:
                messages.append(
                    f"frontend operation {binding_key} path {api_path} does not match "
                    f"{family} authority {authority_path}"
                )
        return messages

    def _load_sdk_authority_operations(
        self,
        *,
        family: str,
        contract: dict[str, Any],
    ) -> tuple[dict[str, tuple[str, str]], list[str]]:
        registry = contract.get(self.SDK_AUTHORITY_REGISTRY)
        if not isinstance(registry, dict):
            return {}, [f"frontend operation SDK authority registry is missing for family: {family}"]
        descriptor = registry.get(family)
        if not isinstance(descriptor, dict):
            return {}, [f"frontend operation SDK authority is missing for family: {family}"]
        manifest_reference = descriptor.get("manifest")
        if not isinstance(manifest_reference, str) or not manifest_reference:
            return {}, [f"frontend operation SDK authority {family} must declare manifest"]

        manifest_candidate = Path(manifest_reference)
        if manifest_candidate.is_absolute():
            return {}, [f"frontend operation SDK authority {family} manifest must be workspace-relative"]
        manifest_path = (self.root / manifest_candidate).resolve()
        workspace_root = self.root.parent.resolve()
        if manifest_path != workspace_root and workspace_root not in manifest_path.parents:
            return {}, [f"frontend operation SDK authority {family} manifest escapes the SDKWork workspace"]
        if manifest_path.name != "sdk-manifest.json" or not manifest_path.is_file():
            return {}, [f"frontend operation SDK authority {family} manifest is missing: {manifest_reference}"]

        try:
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            return {}, [f"frontend operation SDK authority {family} manifest is invalid: {exc}"]
        if not isinstance(manifest, dict):
            return {}, [f"frontend operation SDK authority {family} manifest root must be a mapping"]
        manifest_family = manifest.get("sdkFamily") or manifest.get("workspace")
        if manifest_family != family:
            return {}, [
                f"frontend operation SDK authority {family} manifest declares family: {manifest_family}"
            ]

        dependency_error = self._validate_declared_backend_sdk_dependency(
            family=family,
            manifest_path=manifest_path,
        )
        if dependency_error is not None:
            return {}, [dependency_error]

        authority_reference = manifest.get("authoritySpec")
        if not isinstance(authority_reference, str) or not authority_reference:
            return {}, [f"frontend operation SDK authority {family} manifest must declare authoritySpec"]
        authority_path = (manifest_path.parent / authority_reference).resolve()
        if manifest_path.parent.resolve() not in authority_path.parents:
            return {}, [f"frontend operation SDK authority {family} authoritySpec escapes its SDK family"]
        if not authority_path.is_file():
            return {}, [
                f"frontend operation SDK authority {family} authoritySpec is missing: {authority_reference}"
            ]

        try:
            if authority_path.suffix.lower() in {".yaml", ".yml"}:
                authority = yaml.safe_load(authority_path.read_text(encoding="utf-8"))
            else:
                authority = json.loads(authority_path.read_text(encoding="utf-8"))
        except (OSError, ValueError, json.JSONDecodeError) as exc:
            return {}, [f"frontend operation SDK authority {family} authoritySpec is invalid: {exc}"]
        if not isinstance(authority, dict) or not isinstance(authority.get("paths"), dict):
            return {}, [f"frontend operation SDK authority {family} authoritySpec must declare paths"]

        operations: dict[str, tuple[str, str]] = {}
        errors: list[str] = []
        for api_path, path_item in authority["paths"].items():
            if not isinstance(api_path, str) or not isinstance(path_item, dict):
                continue
            for method, operation in path_item.items():
                normalized_method = str(method).upper()
                if normalized_method not in {"GET", "POST", "PUT", "PATCH", "DELETE"}:
                    continue
                if not isinstance(operation, dict):
                    continue
                operation_id = operation.get("operationId")
                if not isinstance(operation_id, str) or not operation_id:
                    continue
                existing = operations.get(operation_id)
                candidate = (normalized_method, api_path)
                if existing is not None and existing != candidate:
                    errors.append(
                        f"frontend operation SDK authority {family} has duplicate operation_id: {operation_id}"
                    )
                    continue
                operations[operation_id] = candidate
        if not operations:
            errors.append(f"frontend operation SDK authority {family} authoritySpec has no operations")
        return operations, errors

    def _validate_declared_backend_sdk_dependency(
        self,
        *,
        family: str,
        manifest_path: Path,
    ) -> str | None:
        owner_manifest_path = self.root / "sdks" / "clawrouter-backend-sdk" / "sdk-manifest.json"
        if not owner_manifest_path.is_file():
            return "Claw Router backend SDK manifest is missing"
        try:
            owner_manifest = json.loads(owner_manifest_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            return f"Claw Router backend SDK manifest is invalid: {exc}"
        if not isinstance(owner_manifest, dict):
            return "Claw Router backend SDK manifest root must be a mapping"

        owner_family = owner_manifest.get("sdkFamily") or owner_manifest.get("workspace")
        if family == owner_family:
            if manifest_path != owner_manifest_path.resolve():
                return f"frontend operation SDK authority {family} must use the application-owned manifest"
            return None
        dependencies = owner_manifest.get("sdkDependencies", [])
        declared_families = {
            dependency.get("workspace")
            for dependency in dependencies
            if isinstance(dependency, dict) and isinstance(dependency.get("workspace"), str)
        } if isinstance(dependencies, list) else set()
        if family not in declared_families:
            return f"frontend operation SDK authority {family} is not declared in clawrouter-backend-sdk sdkDependencies"
        return None

    def _sdk_operation_families(self, source_operation: dict[str, Any] | None) -> list[str]:
        if not isinstance(source_operation, dict):
            return []
        bindings = source_operation.get("sdk_operations")
        if not isinstance(bindings, list):
            return []
        families: list[str] = []
        for binding in bindings:
            if not isinstance(binding, dict):
                continue
            family = binding.get("sdk_family")
            if isinstance(family, str) and family and family not in families:
                families.append(family)
        return families

    def _sdk_client_factory(self, family: str) -> str | None:
        if family == "clawrouter-backend-sdk":
            return "getClawRouterBackendSdkClient"
        match = re.fullmatch(r"sdkwork-([a-z0-9-]+)-backend-sdk", family)
        if match is None:
            return None
        domain = "".join(part[:1].upper() + part[1:] for part in match.group(1).split("-") if part)
        return f"getSdkwork{domain}BackendSdkClient" if domain else None

    def _is_external_sdk_operation(self, source_operation: dict[str, Any] | None) -> bool:
        return any(family != "clawrouter-backend-sdk" for family in self._sdk_operation_families(source_operation))

    def _resolve_route_contract(
        self,
        route: str,
        route_tables: dict[str, set[str]],
    ) -> str | None:
        if route in route_tables:
            return route

        parameterized_hosts = sorted(
            (
                candidate
                for candidate in route_tables
                if candidate.endswith("/:sectionId?")
            ),
            key=len,
            reverse=True,
        )
        for candidate in parameterized_hosts:
            prefix = candidate.removesuffix("/:sectionId?")
            if route == prefix or route.startswith(f"{prefix}/"):
                return candidate
        return None

    def _source_text(self, source: str, cache: dict[str, str | None]) -> str | None:
        if source in cache:
            return cache[source]
        path = self.root / source
        if not path.exists() or not path.is_file():
            cache[source] = None
            return None
        cache[source] = path.read_text(encoding="utf-8", errors="ignore")
        return cache[source]

    def _source_uses_generated_sdk_boundary(
        self,
        *,
        api_surface: str,
        sdk_domain: Any,
        source_operation: dict[str, Any] | None,
        source: str,
        source_text: str,
        source_text_cache: dict[str, str | None],
    ) -> bool:
        sdk_families = self._sdk_operation_families(source_operation)
        if sdk_families:
            factories = [self._sdk_client_factory(family) for family in sdk_families]
            return all(
                factory is not None
                and re.search(rf"\b{re.escape(factory)}\s*\(", source_text) is not None
                for factory in factories
            )
        if self._is_appbase_dependency_operation(
            api_surface=api_surface,
            sdk_domain=sdk_domain,
            source_operation=source_operation,
        ):
            return self._source_uses_appbase_dependency_boundary(
                api_surface=api_surface,
                source_text=source_text,
            )
        if self._is_commerce_dependency_operation(sdk_domain=sdk_domain, source_operation=source_operation):
            return (
                self.COMMERCE_SERVICE_PATTERN.search(source_text) is not None
                or self.CLAWROUTER_BACKEND_DOMAIN_TRANSPORT_PATTERN.search(source_text) is not None
                or self.CLAWROUTER_APP_DOMAIN_TRANSPORT_PATTERN.search(source_text) is not None
                or self.MISSING_COMMERCE_DEPENDENCY_PATTERN.search(source_text) is not None
            )
        if self._is_generations_dependency_operation(sdk_domain=sdk_domain, source_operation=source_operation):
            return (
                self.GENERATIONS_SERVICE_PATTERN.search(source_text) is not None
                or self.GENERATIONS_APP_SDK_PATTERN.search(source_text) is not None
                or self.GENERATIONS_INJECTED_SERVICE_PATTERN.search(source_text) is not None
                or self.GENERATIONS_WORKSPACE_PATTERN.search(source_text) is not None
            )
        if self._is_memory_dependency_operation(sdk_domain=sdk_domain, source_operation=source_operation):
            return (
                self.MEMORY_APP_SDK_PATTERN.search(source_text) is not None
                or self.MEMORY_CLIENT_PATTERN.search(source_text) is not None
            )
        if self._is_notification_dependency_operation(sdk_domain=sdk_domain, source_operation=source_operation):
            return (
                self.NOTIFICATION_SERVICE_PATTERN.search(source_text) is not None
                or self.NOTIFICATION_PC_REACT_PATTERN.search(source_text) is not None
            )
        if self._is_models_dependency_operation(
            sdk_domain=sdk_domain,
            api_surface=api_surface,
            source=source,
            source_operation=source_operation,
        ):
            return (
                self.MODELS_BACKEND_SDK_PATTERN.search(source_text) is not None
                or self.MODELS_APP_SDK_PATTERN.search(source_text) is not None
            )
        if self._is_agent_dependency_operation(sdk_domain=sdk_domain, source_operation=source_operation):
            return self.AGENT_BACKEND_SDK_PATTERN.search(source_text) is not None
        if self._is_prompts_dependency_operation(sdk_domain=sdk_domain, source_operation=source_operation):
            return self.PROMPTS_BACKEND_SDK_PATTERN.search(source_text) is not None
        if self._is_drive_dependency_operation(sdk_domain=sdk_domain, source_operation=source_operation):
            if api_surface == "backend":
                return self.DRIVE_BACKEND_SDK_PATTERN.search(source_text) is not None
            return self.DRIVE_APP_SDK_PATTERN.search(source_text) is not None
        if self._is_missing_commerce_dependency_operation(source_text=source_text, source_operation=source_operation):
            return True

        sdk_client = self.SDK_CLIENTS[api_surface]
        if re.search(rf"\b{re.escape(sdk_client)}\s*\(", source_text):
            return True
        if (
            api_surface == "app"
            and (
                self.APPBASE_IAM_RUNTIME_PATTERN.search(source_text)
                or self.APPBASE_IAM_CONTROLLER_PATTERN.search(source_text)
            )
        ):
            return True
        if self._source_uses_local_runtime_adapter(
            api_surface=api_surface,
            source=source,
            source_text=source_text,
            source_text_cache=source_text_cache,
        ):
            return True
        if not self.COMMERCE_SERVICE_PATTERN.search(source_text):
            if not self.COMMERCE_RUNTIME_IMPORT_PATTERN.search(source_text):
                return False
            commerce_runtime = self._source_text(self.COMMERCE_RUNTIME_SOURCE, source_text_cache)
            return commerce_runtime is not None and re.search(
                rf"\b{re.escape(sdk_client)}\s*\(",
                commerce_runtime,
            ) is not None
        commerce_runtime = self._source_text(self.COMMERCE_RUNTIME_SOURCE, source_text_cache)
        return commerce_runtime is not None and re.search(
            rf"\b{re.escape(sdk_client)}\s*\(",
            commerce_runtime,
        ) is not None

    def _source_uses_appbase_dependency_boundary(self, *, api_surface: str, source_text: str) -> bool:
        if api_surface == "app" and self.APPBASE_APP_SERVICE_PATTERN.search(source_text):
            return True
        if api_surface == "backend" and self.APPBASE_BACKEND_SERVICE_PATTERN.search(source_text):
            return True
        return (
            api_surface == "app"
            and (
                self.APPBASE_IAM_RUNTIME_PATTERN.search(source_text)
                or self.APPBASE_IAM_CONTROLLER_PATTERN.search(source_text)
            )
        )

    def _is_commerce_dependency_domain(self, sdk_domain: Any) -> bool:
        return isinstance(sdk_domain, str) and sdk_domain in self.COMMERCE_DEPENDENCY_DOMAINS

    def _is_commerce_dependency_operation(self, *, sdk_domain: Any, source_operation: dict[str, Any] | None) -> bool:
        if self._is_commerce_dependency_domain(sdk_domain):
            return True
        if isinstance(sdk_domain, str) and sdk_domain:
            return False
        if not isinstance(source_operation, dict):
            return False
        api_path = source_operation.get("api_path")
        if isinstance(api_path, str) and api_path.startswith(self.COMMERCE_API_PATH_PREFIXES):
            return True
        dependency_tables = [
            *self._string_list(source_operation.get("read_sources")),
            *self._string_list(source_operation.get("write_tables")),
        ]
        return any(table.startswith(("commerce_", "promotion_")) for table in dependency_tables)

    def _is_generations_dependency_domain(self, sdk_domain: Any) -> bool:
        return isinstance(sdk_domain, str) and sdk_domain in self.GENERATIONS_DEPENDENCY_DOMAINS

    def _is_generations_dependency_operation(self, *, sdk_domain: Any, source_operation: dict[str, Any] | None) -> bool:
        if self._is_generations_dependency_domain(sdk_domain):
            return True
        if isinstance(sdk_domain, str) and sdk_domain:
            return False
        if not isinstance(source_operation, dict):
            return False
        api_path = source_operation.get("api_path")
        if isinstance(api_path, str) and api_path.startswith(self.GENERATIONS_API_PATH_PREFIXES):
            return True
        dependency_tables = [
            *self._string_list(source_operation.get("read_sources")),
            *self._string_list(source_operation.get("write_tables")),
        ]
        return any(table.startswith("generation_") for table in dependency_tables)

    def _is_memory_dependency_domain(self, sdk_domain: Any) -> bool:
        return isinstance(sdk_domain, str) and sdk_domain in self.MEMORY_DEPENDENCY_DOMAINS

    def _is_memory_dependency_operation(self, *, sdk_domain: Any, source_operation: dict[str, Any] | None) -> bool:
        if self._is_memory_dependency_domain(sdk_domain):
            return True
        if isinstance(sdk_domain, str) and sdk_domain:
            return False
        if not isinstance(source_operation, dict):
            return False
        api_path = source_operation.get("api_path")
        return isinstance(api_path, str) and api_path.startswith("/app/v3/api/memory")

    def _is_notification_dependency_domain(self, sdk_domain: Any) -> bool:
        return isinstance(sdk_domain, str) and sdk_domain in self.NOTIFICATION_DEPENDENCY_DOMAINS

    def _is_notification_dependency_operation(self, *, sdk_domain: Any, source_operation: dict[str, Any] | None) -> bool:
        if self._is_notification_dependency_domain(sdk_domain):
            return True
        if isinstance(sdk_domain, str) and sdk_domain:
            return False
        if not isinstance(source_operation, dict):
            return False
        api_path = source_operation.get("api_path")
        return isinstance(api_path, str) and api_path.startswith("/app/v3/api/notification")

    def _is_models_dependency_domain(self, sdk_domain: Any) -> bool:
        return isinstance(sdk_domain, str) and sdk_domain in self.MODELS_DEPENDENCY_DOMAINS

    def _is_agent_dependency_domain(self, sdk_domain: Any) -> bool:
        return isinstance(sdk_domain, str) and sdk_domain in self.AGENT_DEPENDENCY_DOMAINS

    def _is_prompts_dependency_domain(self, sdk_domain: Any) -> bool:
        return isinstance(sdk_domain, str) and sdk_domain in self.PROMPTS_DEPENDENCY_DOMAINS

    def _is_prompts_dependency_operation(self, *, sdk_domain: Any, source_operation: dict[str, Any] | None) -> bool:
        if not isinstance(source_operation, dict):
            return False
        if source_operation.get("operation_scope") == "app_shell":
            return False
        if self._is_prompts_dependency_domain(sdk_domain):
            return True
        if isinstance(sdk_domain, str) and sdk_domain:
            return False
        api_path = source_operation.get("api_path")
        return isinstance(api_path, str) and api_path.startswith("/backend/v3/api/prompts")

    def _is_agent_dependency_operation(self, *, sdk_domain: Any, source_operation: dict[str, Any] | None) -> bool:
        if self._is_agent_dependency_domain(sdk_domain):
            return True
        if isinstance(sdk_domain, str) and sdk_domain:
            return False
        if not isinstance(source_operation, dict):
            return False
        api_path = source_operation.get("api_path")
        return isinstance(api_path, str) and api_path.startswith("/backend/v3/api/ai/agents")

    def _is_drive_dependency_domain(self, sdk_domain: Any) -> bool:
        return isinstance(sdk_domain, str) and sdk_domain in self.DRIVE_DEPENDENCY_DOMAINS

    def _is_drive_dependency_operation(self, *, sdk_domain: Any, source_operation: dict[str, Any] | None) -> bool:
        if self._is_drive_dependency_domain(sdk_domain):
            return True
        if isinstance(sdk_domain, str) and sdk_domain:
            return False
        if not isinstance(source_operation, dict):
            return False
        api_path = source_operation.get("api_path")
        return isinstance(api_path, str) and (
            api_path.startswith("/app/v3/api/drive/")
            or api_path.startswith("/backend/v3/api/drive/")
        )

    def _is_missing_commerce_dependency_operation(
        self,
        *,
        source_text: str,
        source_operation: dict[str, Any] | None,
    ) -> bool:
        if self.MISSING_COMMERCE_DEPENDENCY_PATTERN.search(source_text) is None:
            return False
        if not isinstance(source_operation, dict):
            return True
        return self._is_commerce_dependency_operation(
            sdk_domain=source_operation.get("sdk_domain"),
            source_operation=source_operation,
        )

    def _is_models_dependency_operation(
        self,
        *,
        sdk_domain: Any,
        api_surface: str | None = None,
        source: str | None = None,
        source_operation: dict[str, Any] | None = None,
    ) -> bool:
        if isinstance(source, str) and source.replace("\\", "/").startswith(self.MODELS_SOURCE_PREFIX):
            return True
        normalized_source = source.replace("\\", "/") if isinstance(source, str) else ""
        if normalized_source.startswith(self.CLAWROUTER_PORTAL_MODELS_SOURCE_PREFIX):
            return True
        if normalized_source.startswith(self.CLAWROUTER_PORTAL_RANKINGS_SOURCE_PREFIX):
            return True
        if api_surface != "backend" or not self._is_models_dependency_domain(sdk_domain):
            return False
        if not isinstance(source_operation, dict):
            return False
        api_path = source_operation.get("api_path")
        return isinstance(api_path, str) and api_path.startswith(
            self.MODELS_BACKEND_API_PATH_PREFIXES
        )

    def _is_appbase_dependency_operation(
        self,
        *,
        api_surface: str,
        sdk_domain: Any,
        source_operation: dict[str, Any] | None,
    ) -> bool:
        if api_surface not in {"app", "backend"}:
            return False
        if self._is_clawrouter_owned_iam_app_operation(
            api_surface=api_surface,
            source_operation=source_operation,
        ):
            return False
        if isinstance(sdk_domain, str) and sdk_domain in self.APPBASE_APP_DEPENDENCY_DOMAINS:
            return True
        if not isinstance(source_operation, dict):
            return False
        api_path = source_operation.get("api_path")
        api_method = source_operation.get("api_method")
        if not isinstance(api_path, str) or not isinstance(api_method, str):
            return False
        return api_surface == "backend" and (
            (api_method.upper(), api_path) in self.APPBASE_BACKEND_DEPENDENCY_OPERATIONS
            or api_path.startswith("/backend/v3/api/iam/oauth/")
        )

    def _is_clawrouter_owned_iam_app_operation(
        self,
        *,
        api_surface: str,
        source_operation: dict[str, Any] | None,
    ) -> bool:
        if api_surface != "app" or not isinstance(source_operation, dict):
            return False
        api_path = source_operation.get("api_path")
        if not isinstance(api_path, str):
            return False
        return any(
            api_path == prefix or api_path.startswith(f"{prefix}/")
            for prefix in self.CLAWROUTER_OWNED_IAM_APP_API_PATH_PREFIXES
        )

    def _sdk_boundary_error_message(
        self,
        key: str,
        api_surface: str,
        sdk_domain: Any,
        source_operation: dict[str, Any] | None,
    ) -> str:
        sdk_families = self._sdk_operation_families(source_operation)
        if sdk_families:
            factories = [self._sdk_client_factory(family) or family for family in sdk_families]
            return (
                f"frontend operation {key} must use bound SDK client factories: "
                f"{', '.join(factories)}"
            )
        if self._is_commerce_dependency_operation(sdk_domain=sdk_domain, source_operation=source_operation):
            return (
                f"frontend operation {key} must use getClawRouterBackendSdkClient().<domain>, "
                f"getClawRouterAppSdkClient().<domain>, or missingCommerceDependencyOperation "
                f"for {api_surface} api_surface"
            )
        if self._is_agent_dependency_operation(sdk_domain=sdk_domain, source_operation=source_operation):
            return (
                f"frontend operation {key} must use getSdkworkAgentBackendSdkClient "
                f"for {api_surface} api_surface"
            )
        if self._is_prompts_dependency_operation(sdk_domain=sdk_domain, source_operation=source_operation):
            return (
                f"frontend operation {key} must use getSdkworkPromptsBackendSdkClient "
                f"for prompts dependency {api_surface} api_surface"
            )
        if self._is_drive_dependency_operation(sdk_domain=sdk_domain, source_operation=source_operation):
            if api_surface == "backend":
                return (
                    f"frontend operation {key} must use getSdkworkDriveBackendSdkClient "
                    f"for drive dependency {api_surface} api_surface"
                )
            return (
                f"frontend operation {key} must use getSdkworkDriveAppSdkClient "
                f"for {api_surface} api_surface"
            )
        if self._is_generations_dependency_operation(sdk_domain=sdk_domain, source_operation=source_operation):
            return (
                f"frontend operation {key} must use {self.GENERATIONS_SERVICE_CLIENT} "
                f"or {self.GENERATIONS_APP_SDK_CLIENT} for generations dependency {api_surface} api_surface"
            )
        if self._is_memory_dependency_operation(sdk_domain=sdk_domain, source_operation=source_operation):
            return (
                f"frontend operation {key} must use getSdkworkMemoryAppSdkClient() "
                f"for memory dependency {api_surface} api_surface"
            )
        if self._is_notification_dependency_operation(sdk_domain=sdk_domain, source_operation=source_operation):
            return (
                f"frontend operation {key} must use @sdkwork/notification-pc-react service boundary "
                f"for notification dependency {api_surface} api_surface"
            )
        operation_source = key.split("#", 1)[0]
        if self._is_models_dependency_operation(
            sdk_domain=sdk_domain,
            api_surface=api_surface,
            source=operation_source,
            source_operation=source_operation,
        ):
            return (
                f"frontend operation {key} must use {self.MODELS_BACKEND_SDK_CLIENT} "
                f"for models dependency {api_surface} api_surface"
            )
        if self._is_appbase_dependency_operation(
            api_surface=api_surface,
            sdk_domain=sdk_domain,
            source_operation=source_operation,
        ):
            sdk_client = (
                self.APPBASE_BACKEND_SERVICE_CLIENT
                if api_surface == "backend"
                else self.APPBASE_APP_SERVICE_CLIENT
            )
            return f"frontend operation {key} must use {sdk_client} for {sdk_domain} dependency {api_surface} api_surface"
        sdk_client = self.SDK_CLIENTS[api_surface]
        return f"frontend operation {key} must use {sdk_client} for {api_surface} api_surface"

    def _string_list(self, value: Any) -> list[str]:
        if not isinstance(value, list):
            return []
        return [item for item in value if isinstance(item, str)]

    def _source_uses_local_runtime_adapter(
        self,
        *,
        api_surface: str,
        source: str,
        source_text: str,
        source_text_cache: dict[str, str | None],
    ) -> bool:
        sdk_client = self.SDK_CLIENTS[api_surface]
        for match in self.LOCAL_RUNTIME_ADAPTER_IMPORT_PATTERN.finditer(source_text):
            adapter_source = self._resolve_relative_import(source, match.group(1))
            if adapter_source is None:
                continue
            adapter_text = self._source_text(adapter_source, source_text_cache)
            if adapter_text is not None and re.search(rf"\b{re.escape(sdk_client)}\s*\(", adapter_text):
                return True
        return False

    def _resolve_relative_import(self, source: str, import_spec: str) -> str | None:
        source_path = (self.root / source).resolve()
        candidate = (source_path.parent / import_spec).resolve()
        candidates = [candidate]
        if not candidate.suffix:
            candidates.extend(candidate.with_suffix(suffix) for suffix in (".ts", ".tsx", ".mts", ".cts", ".js", ".jsx"))
        for path in candidates:
            try:
                relative = path.relative_to(self.root)
            except ValueError:
                continue
            if path.is_file():
                return relative.as_posix()
        return None

    def _mock_data_pattern_labels(self, source_text: str | None) -> list[str]:
        if source_text is None:
            return []
        labels: list[str] = []
        for label, pattern in self.MOCK_DATA_PATTERNS:
            if pattern.search(source_text):
                labels.append(label)
        return labels

    def _display_path(self, path: Path) -> str:
        try:
            return path.relative_to(self.root).as_posix()
        except ValueError:
            return path.as_posix()


def main() -> int:
    parser = argparse.ArgumentParser(description="Audit portal TypeScript service operations against route data contracts.")
    parser.add_argument("--root", type=Path, default=Path.cwd(), help="sdkwork-clawrouter root directory")
    parser.add_argument("--contract", type=Path, default=None, help="frontend field contract YAML path")
    parser.add_argument("--output", type=Path, default=None, help="output audit JSON path")
    parser.add_argument("--check", action="store_true", help="validate generated operation audit and operation contracts")
    args = parser.parse_args()

    auditor = FrontendOperationAudit(root=args.root, contract_path=args.contract, output_path=args.output)
    if args.check:
        result = auditor.check(args.output)
        if result.ok:
            print("Frontend operation audit is current")
            return 0
        for message in result.messages:
            print(message)
        return 1

    validation = auditor.validate()
    if not validation.ok:
        for message in validation.messages:
            print(message)
        return 1

    output = auditor.write(args.output)
    print(f"Wrote frontend operation audit to {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
