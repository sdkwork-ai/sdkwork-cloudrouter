from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from tools.appbase_openapi_schema_guardian import CANONICAL_COMMERCE_API_OPERATIONS
from tools.frontend_contract_loader import (
    DEFAULT_CONTRACT_INDEX,
    DEFAULT_CONTRACT_SNAPSHOT,
    load_frontend_field_contract,
    render_frontend_field_contract,
)
from tools.schema_registry_loader import render_schema_registry

try:
    import yaml
except ImportError as exc:  # pragma: no cover - exercised only when PyYAML is unavailable
    yaml = None
    _YAML_IMPORT_ERROR = exc
else:
    _YAML_IMPORT_ERROR = None


APPBASE_CATALOG_PATH = (
    Path(".sdkwork")
    / "dependencies"
    / "sdkwork-appbase"
    / "specs"
    / "appbase-capabilities.yaml"
)
DEFAULT_INTEGRATION_PATH = Path("specs") / "appbase-integration.yaml"
PORTAL_PACKAGE_PATH = Path("apps") / "sdkwork-clawrouter-pc" / "package.json"
FRONTEND_FIELD_CONTRACTS_PATH = DEFAULT_CONTRACT_SNAPSHOT
FRONTEND_ROUTE_CLASSIFICATION_PATH = Path("docs") / "schema-registry" / "frontend-route-classification.yaml"
TABLE_REGISTRY_PATH = Path("docs") / "schema-registry" / "sdkwork-clawrouter.tables.yaml"
LEGACY_CONSOLE_BILLING_ROUTE = "/console/" + "billing"

MATURITY_RANK: dict[str, int] = {
    "L0": 0,
    "L1": 1,
    "L2": 2,
    "L3": 3,
}

REQUIRED_FRONTEND_ADAPTERS: dict[str, tuple[str, ...]] = {
    "commerce": (
        "apps/sdkwork-clawrouter-pc/src/App.tsx",
        "apps/sdkwork-clawrouter-pc/src/console-business/consoleBusinessHostMount.tsx",
    ),
}

COMMERCE_FRONTEND_FEATURE_ROOTS: tuple[str, ...] = ()

FRONTEND_SOURCE_SUFFIXES: tuple[str, ...] = (
    ".ts",
    ".tsx",
    ".mts",
    ".cts",
    ".js",
    ".jsx",
)

IGNORED_DIR_NAMES: set[str] = {
    ".git",
    ".pnpm",
    "dist",
    "node_modules",
    "target",
}

BUILT_IN_FORBIDDEN_PRODUCT_FORKS: tuple[str, ...] = (
    "/".join(
        [
            "apps",
            "sdkwork-clawrouter-pc",
            "packages",
            "sdkwork-clawroutes-pc-commons",
            "src",
            f"{'-'.join(['appbase', 'sdk', 'clients'])}.ts",
        ]
    ),
)

ROOT_LEVEL_APPBASE_SHADOW_PATHS: tuple[str, ...] = (
    "packages/common/commerce",
    "packages/native-rust/commerce",
)

CLAWROUTER_GENERATED_SDK_IMPORT_RE = re.compile(
    r"from\s+['\"]@sdkwork/clawrouter-(?:app|backend|open)-sdk['\"]|"
    r"import\s*\(\s*['\"]@sdkwork/clawrouter-(?:app|backend|open)-sdk['\"]\s*\)"
)

COMMERCE_RETIRED_API_PATH_RE = re.compile(
    r"/(?:app|backend)/v3/api/billing(?!/history\b)(?:/[\w{}\-/.-]*)?"
    r"|/(?:app|backend)/v3/api/coupons(?:/[\w{}\-/.-]*)?"
    r"|/app/v3/api/payments/checkout(?:/[\w{}\-/.-]*)?"
    r"|/app/v3/api/router/settlements/dashboard"
    r"|/backend/v3/api/wallet/ledger(?!_entries)(?:/[\w{}\-/.-]*)?"
    r"|/backend/v3/api/commerce/reports(?:/[\w{}\-/.-]*)?"
)
COMMERCE_BILLING_TABLE_RE = re.compile(r"\bcommerce_billing_(?!history\b)[A-Za-z0-9_]*\b")
COMMERCE_RETIRED_FRONTEND_ARTIFACT_RE = re.compile(
    r"@sdkwork/commerce-(?:contracts|sdk-ports|service)"
    r"|commerce-runtime\.ts"
    r"|commerce-console-service\.ts"
    r"|sdkwork-claw-?router-(?:pc-)?(?:console-commerce|admin-commerce|admin-vip)"
)
COMMERCE_TABLE_DECLARATION_RE = re.compile(r"(?m)^\s*-\s*table:\s*([A-Za-z0-9_]+)\s*$")
COMMERCE_RETIRED_PRODUCT_CENTER_TABLES: set[str] = {
    "commerce_product",
    "commerce_sku",
}
COMMERCE_REQUIRED_PRODUCT_CENTER_TABLES: tuple[str, ...] = (
    "commerce_product_category",
    "commerce_product_spu",
    "commerce_product_sku",
    "commerce_product_attribute",
    "commerce_product_attribute_value",
    "commerce_product_sku_attribute",
    "commerce_product_media",
    "commerce_price_list",
    "commerce_price_list_item",
    "commerce_inventory_stock",
    "commerce_inventory_reservation",
    "commerce_inventory_ledger",
)
COMMERCE_REQUIRED_PRODUCT_CENTER_API_OPERATIONS: tuple[tuple[str, str, str, str], ...] = ()
COMMERCE_REQUIRED_API_OPERATIONS = tuple(
    dict.fromkeys(
        (
            *COMMERCE_REQUIRED_PRODUCT_CENTER_API_OPERATIONS,
            *CANONICAL_COMMERCE_API_OPERATIONS,
        )
    )
)
COMMERCE_SURFACE_PREFIXED_OPERATION_ID_RE = re.compile(
    r"(?m)^\s*operation_id:\s*['\"]?((?:app|backend)\.[A-Za-z0-9_.-]+)['\"]?"
)
COMMERCE_RETIRED_OPERATION_ID_RE = re.compile(
    r"(?m)^\s*operation_id:\s*['\"]?("
    r"account\.[A-Za-z0-9_.-]*"
    r"|couponBatches\.[A-Za-z0-9_.-]*"
    r"|promotionCodes\.[A-Za-z0-9_.-]*"
    r"|exchangeRules\.[A-Za-z0-9_.-]*"
    r"|finance\.[A-Za-z0-9_.-]*"
    r"|payments\.(?:checkout|records)\.[A-Za-z0-9_.-]*"
    r"|preflight\.[A-Za-z0-9_.-]*"
    r"|recharges\.records\.[A-Za-z0-9_.-]*"
    r"|settlements\.[A-Za-z0-9_.-]*"
    r"|users\.(?:balanceAdjustments|coupons|current\.coupons)\.[A-Za-z0-9_.-]*"
    r"|vip\.[A-Za-z0-9_.-]*"
    r"|wallet\.(?:ledger|operations|topups|transactions|withdrawals)\.[A-Za-z0-9_.-]*"
    r"|coupons\.[A-Za-z0-9_.-]*"
    r")['\"]?"
)


@dataclass(frozen=True)
class AppbaseIntegrationGuardianResult:
    ok: bool
    messages: list[str]


class AppbaseIntegrationGuardian:
    """Validate that this application integrates appbase capabilities as an assembly layer."""

    def __init__(
        self,
        root: Path,
        integration_path: Path | None = None,
        appbase_catalog_path: Path | None = None,
    ) -> None:
        self.root = Path(root).resolve()
        self.integration_path = (
            Path(integration_path).resolve()
            if integration_path is not None
            else self.root / DEFAULT_INTEGRATION_PATH
        )
        self.appbase_catalog_path = (
            Path(appbase_catalog_path).resolve()
            if appbase_catalog_path is not None
            else self._default_appbase_catalog_path()
        )

    def _default_appbase_catalog_path(self) -> Path:
        materialized_catalog = self.root / APPBASE_CATALOG_PATH
        if materialized_catalog.exists():
            return materialized_catalog
        sibling_catalog = self.root.parent / "sdkwork-appbase" / "specs" / "appbase-capabilities.yaml"
        if sibling_catalog.exists():
            return sibling_catalog
        return materialized_catalog

    def run(self) -> AppbaseIntegrationGuardianResult:
        messages: list[str] = []
        appbase_catalog = self._load_yaml(self.appbase_catalog_path, "appbase capability catalog", messages)
        integration_manifest = self._load_yaml(self.integration_path, "appbase integration manifest", messages)
        if appbase_catalog is None or integration_manifest is None:
            return AppbaseIntegrationGuardianResult(ok=False, messages=messages)

        capabilities = self._capability_index(appbase_catalog, messages)
        messages.extend(self._validate_integration_manifest(integration_manifest, capabilities))
        if self._declares_capability(integration_manifest, "commerce"):
            messages.extend(self._validate_commerce_schema_registry())
        messages.extend(self._validate_builtin_forbidden_product_forks())
        messages.extend(self._validate_root_level_appbase_shadow_paths())
        return AppbaseIntegrationGuardianResult(ok=not messages, messages=messages)

    def _load_yaml(self, path: Path, label: str, messages: list[str]) -> dict[str, Any] | None:
        if yaml is None:
            messages.append(f"PyYAML is required to validate {label}: {_YAML_IMPORT_ERROR}")
            return None
        if not path.exists():
            messages.append(f"missing {label}: {self._display_path(path)}")
            return None
        payload = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
        if not isinstance(payload, dict):
            messages.append(f"{label} root must be a mapping")
            return None
        return payload

    def _capability_index(self, catalog: dict[str, Any], messages: list[str]) -> dict[str, dict[str, Any]]:
        capabilities = catalog.get("capabilities")
        if not isinstance(capabilities, list):
            messages.append("appbase capability catalog must declare capabilities")
            return {}
        indexed: dict[str, dict[str, Any]] = {}
        for index, capability in enumerate(capabilities):
            if not isinstance(capability, dict):
                messages.append(f"appbase capability at index {index} must be a mapping")
                continue
            capability_id = capability.get("id")
            if not isinstance(capability_id, str) or not capability_id.strip():
                messages.append(f"appbase capability at index {index} must declare id")
                continue
            indexed[capability_id.strip()] = capability
        return indexed

    def _declares_capability(self, manifest: dict[str, Any], capability_id: str) -> bool:
        integrations = manifest.get("integrations")
        if not isinstance(integrations, list):
            return False
        for integration in integrations:
            if isinstance(integration, dict) and integration.get("capability") == capability_id:
                return True
        return False

    def _validate_integration_manifest(
        self,
        manifest: dict[str, Any],
        capabilities: dict[str, dict[str, Any]],
    ) -> list[str]:
        messages: list[str] = []
        if manifest.get("kind") != "sdkwork.appbase.integration":
            messages.append("appbase integration manifest kind must be sdkwork.appbase.integration")
        app = manifest.get("app")
        if not isinstance(app, dict) or app.get("key") != "sdkwork-clawrouter":
            messages.append("appbase integration manifest must declare app.key sdkwork-clawrouter")
        integrations = manifest.get("integrations")
        if not isinstance(integrations, list) or not integrations:
            messages.append("appbase integration manifest must declare integrations")
            return messages
        seen: set[str] = set()
        for index, integration in enumerate(integrations):
            if not isinstance(integration, dict):
                messages.append(f"appbase integration at index {index} must be a mapping")
                continue
            messages.extend(self._validate_integration(integration, capabilities, seen, index))
        return messages

    def _validate_integration(
        self,
        integration: dict[str, Any],
        capabilities: dict[str, dict[str, Any]],
        seen: set[str],
        index: int,
    ) -> list[str]:
        messages: list[str] = []
        capability_id = self._required_string(integration, "capability", f"appbase integration at index {index}", messages)
        if not capability_id:
            return messages
        if capability_id in seen:
            messages.append(f"duplicate appbase integration capability: {capability_id}")
        seen.add(capability_id)

        capability = capabilities.get(capability_id)
        if capability is None:
            messages.append(f"appbase integration references unknown capability: {capability_id}")
            return messages

        required_maturity = self._required_string(integration, "requiredMaturity", f"appbase integration {capability_id}", messages)
        declared_maturity = capability.get("maturity")
        if isinstance(required_maturity, str) and isinstance(declared_maturity, str):
            if required_maturity not in MATURITY_RANK:
                messages.append(f"appbase integration {capability_id} requiredMaturity must be one of L0, L1, L2, L3")
            elif declared_maturity not in MATURITY_RANK:
                messages.append(f"appbase catalog capability {capability_id} maturity must be one of L0, L1, L2, L3")
            elif MATURITY_RANK[declared_maturity] < MATURITY_RANK[required_maturity]:
                messages.append(
                    f"appbase integration {capability_id} requires maturity {required_maturity} "
                    f"but appbase catalog declares {declared_maturity}"
                )

        if integration.get("sdkBoundary") != "generated-sdk-through-ports":
            messages.append(f"appbase integration {capability_id} must use sdkBoundary generated-sdk-through-ports")
        messages.extend(self._validate_surfaces(capability_id, integration))
        messages.extend(self._validate_frontend(capability_id, integration))
        messages.extend(self._validate_rust(capability_id, integration))
        messages.extend(self._validate_contract_tests(capability_id, integration))
        messages.extend(self._validate_verification_commands(capability_id, integration))
        messages.extend(self._validate_forbidden_product_forks(capability_id, integration))
        if capability_id == "commerce":
            messages.extend(self._validate_commerce_standard_contract(integration))
        return messages

    def _validate_commerce_standard_contract(self, integration: dict[str, Any]) -> list[str]:
        messages: list[str] = []
        namespaces = integration.get("sdkNamespaces", [])
        if isinstance(namespaces, list):
            for namespace in namespaces:
                if isinstance(namespace, str) and namespace.strip() == "billing":
                    messages.append("appbase integration commerce must not declare SDK namespace billing")
        elif namespaces is not None:
            messages.append("appbase integration commerce sdkNamespaces must be a list")

        messages.extend(self._validate_commerce_manifest_node(integration))
        return messages

    def _validate_commerce_manifest_node(self, node: Any) -> list[str]:
        messages: list[str] = []
        if isinstance(node, dict):
            for key, value in node.items():
                if key == "compatibilityMode":
                    messages.append("appbase integration commerce must not declare compatibilityMode")
                messages.extend(self._validate_commerce_manifest_node(value))
            return messages
        if isinstance(node, list):
            for item in node:
                messages.extend(self._validate_commerce_manifest_node(item))
            return messages
        if isinstance(node, str):
            messages.extend(self._validate_commerce_text("appbase integration commerce", node))
        return messages

    def _validate_commerce_text(self, label: str, text: str) -> list[str]:
        messages: list[str] = []
        for retired_artifact in sorted(set(COMMERCE_RETIRED_FRONTEND_ARTIFACT_RE.findall(text))):
            messages.append(f"{label} must not reference retired commerce frontend artifact: {retired_artifact}")
        seen_paths: set[str] = set()
        for match in COMMERCE_RETIRED_API_PATH_RE.finditer(text):
            api_path = match.group(0)
            if api_path in seen_paths:
                continue
            seen_paths.add(api_path)
            messages.append(f"{label} must not reference retired commerce API path: {api_path}")
        for match in COMMERCE_BILLING_TABLE_RE.finditer(text):
            messages.append(f"{label} must not declare billing table: {match.group(0)}")
        if re.search(r"\bcompatibility\s+envelopes?\b", text, flags=re.IGNORECASE):
            messages.append(f"{label} must not mention compatibility envelopes")
        return messages

    def _validate_surfaces(self, capability_id: str, integration: dict[str, Any]) -> list[str]:
        surfaces = integration.get("surfaces")
        if not isinstance(surfaces, list) or not surfaces:
            return [f"appbase integration {capability_id} must declare at least one surface"]
        messages: list[str] = []
        for surface in surfaces:
            if not isinstance(surface, str) or not surface.strip():
                messages.append(f"appbase integration {capability_id} surfaces must be non-empty strings")
        return messages

    def _validate_frontend(self, capability_id: str, integration: dict[str, Any]) -> list[str]:
        messages: list[str] = []
        frontend = integration.get("frontend")
        if frontend is None:
            return messages
        if not isinstance(frontend, dict):
            return [f"appbase integration {capability_id} frontend must be a mapping"]
        dependencies = frontend.get("dependencies", [])
        if not isinstance(dependencies, list):
            messages.append(f"appbase integration {capability_id} frontend.dependencies must be a list")
            dependencies = []
        portal_dependencies = self._portal_dependencies(messages)
        for dependency in dependencies:
            if not isinstance(dependency, str) or not dependency.strip():
                messages.append(f"appbase integration {capability_id} frontend dependency must be a non-empty string")
                continue
            if dependency not in portal_dependencies:
                messages.append(f"appbase integration {capability_id} missing portal dependency {dependency}")

        adapters = frontend.get("adapters", [])
        if not isinstance(adapters, list):
            messages.append(f"appbase integration {capability_id} frontend.adapters must be a list")
            adapters = []
        for adapter in adapters:
            if not isinstance(adapter, str) or not adapter.strip():
                messages.append(f"appbase integration {capability_id} frontend adapter must be a non-empty string")
                continue
            self._validate_existing_relative_file(capability_id, "frontend adapter", adapter, messages)
        declared_adapters = {adapter.strip() for adapter in adapters if isinstance(adapter, str)}
        for required_adapter in REQUIRED_FRONTEND_ADAPTERS.get(capability_id, ()):
            if required_adapter not in declared_adapters:
                messages.append(
                    f"appbase integration {capability_id} must declare required frontend adapter: {required_adapter}"
                )
        if capability_id == "commerce":
            messages.extend(self._validate_frontend_sdk_injection_adapters(capability_id, frontend, declared_adapters))
        return messages

    def _validate_frontend_sdk_injection_adapters(
        self,
        capability_id: str,
        frontend: dict[str, Any],
        declared_adapters: set[str],
    ) -> list[str]:
        messages: list[str] = []
        sdk_injection_adapters = frontend.get("sdkInjectionAdapters", [])
        if not isinstance(sdk_injection_adapters, list):
            return [f"appbase integration {capability_id} frontend.sdkInjectionAdapters must be a list"]
        declared_sdk_injection_adapters: set[str] = set()
        for adapter in sdk_injection_adapters:
            if not isinstance(adapter, str) or not adapter.strip():
                messages.append(
                    f"appbase integration {capability_id} frontend sdkInjectionAdapter must be a non-empty string"
                )
                continue
            adapter = adapter.strip()
            declared_sdk_injection_adapters.add(adapter)
            if adapter not in declared_adapters:
                messages.append(
                    f"appbase integration {capability_id} frontend sdkInjectionAdapter must also be declared as an adapter: {adapter}"
                )
        for adapter in sorted(declared_adapters):
            adapter_path = self.root / adapter
            if not adapter_path.is_file():
                continue
            source = adapter_path.read_text(encoding="utf-8")
            imports_generated_sdk = CLAWROUTER_GENERATED_SDK_IMPORT_RE.search(source) is not None
            if imports_generated_sdk and adapter not in declared_sdk_injection_adapters:
                messages.append(
                    f"appbase integration {capability_id} frontend adapter {adapter} "
                    "must not import ClawRouter generated SDK packages; use the shared SDK runtime boundary"
                )
        messages.extend(self._validate_commerce_frontend_feature_sources(declared_sdk_injection_adapters))
        return messages

    def _validate_commerce_frontend_feature_sources(self, sdk_injection_adapters: set[str]) -> list[str]:
        messages: list[str] = []
        for feature_root in COMMERCE_FRONTEND_FEATURE_ROOTS:
            root = self.root / feature_root
            if not root.exists():
                continue
            for path in self._walk(root):
                if not path.is_file() or path.suffix not in FRONTEND_SOURCE_SUFFIXES:
                    continue
                relative_path = self._posix(path.relative_to(self.root))
                if relative_path in sdk_injection_adapters:
                    continue
                source = path.read_text(encoding="utf-8")
                if CLAWROUTER_GENERATED_SDK_IMPORT_RE.search(source) is not None:
                    messages.append(
                        f"appbase integration commerce frontend source {relative_path} "
                        "must not import ClawRouter generated SDK packages; use the local commerce service boundary"
                    )
        return messages

    def _validate_rust(self, capability_id: str, integration: dict[str, Any]) -> list[str]:
        messages: list[str] = []
        rust = integration.get("rust")
        if rust is None:
            return messages
        if not isinstance(rust, dict):
            return [f"appbase integration {capability_id} rust must be a mapping"]
        crates = rust.get("crates", [])
        if not isinstance(crates, list):
            messages.append(f"appbase integration {capability_id} rust.crates must be a list")
            crates = []
        for index, crate in enumerate(crates):
            if not isinstance(crate, dict):
                messages.append(f"appbase integration {capability_id} rust crate at index {index} must be a mapping")
                continue
            crate_name = self._required_string(crate, "name", f"appbase integration {capability_id} rust crate {index}", messages)
            manifest = self._required_string(crate, "manifest", f"appbase integration {capability_id} rust crate {crate_name or index}", messages)
            if not crate_name or not manifest:
                continue
            manifest_path = self.root / manifest
            self._validate_existing_relative_file(capability_id, "rust manifest", manifest, messages)
            if manifest_path.exists() and crate_name not in manifest_path.read_text(encoding="utf-8"):
                messages.append(f"appbase integration {capability_id} rust manifest {manifest} does not reference crate {crate_name}")
        return messages

    def _validate_contract_tests(self, capability_id: str, integration: dict[str, Any]) -> list[str]:
        messages: list[str] = []
        contract_tests = integration.get("contractTests", [])
        if not isinstance(contract_tests, list):
            return [f"appbase integration {capability_id} contractTests must be a list"]
        for contract_test in contract_tests:
            if not isinstance(contract_test, str) or not contract_test.strip():
                messages.append(f"appbase integration {capability_id} contract test must be a non-empty string")
                continue
            self._validate_existing_relative_file(capability_id, "contract test", contract_test, messages)
        return messages

    def _validate_verification_commands(self, capability_id: str, integration: dict[str, Any]) -> list[str]:
        messages: list[str] = []
        commands = integration.get("verification", [])
        if not isinstance(commands, list):
            return [f"appbase integration {capability_id} verification must be a list"]
        if not commands:
            return [f"appbase integration {capability_id} must declare verification commands"]
        for index, command in enumerate(commands):
            if not isinstance(command, str) or not command.strip():
                messages.append(f"appbase integration {capability_id} verification command at index {index} must be a non-empty string")
                continue
            messages.extend(self._validate_verification_command(capability_id, command.strip()))
        return messages

    def _validate_verification_command(self, capability_id: str, command: str) -> list[str]:
        unittest_match = re.search(r"\bpython\s+-B\s+-m\s+unittest\s+(.+)$", command)
        if not unittest_match:
            return [
                f"appbase integration {capability_id} verification command must use a supported executable form: {command}"
            ]
        messages: list[str] = []
        targets = [target for target in unittest_match.group(1).split() if target]
        for target in targets:
            module = target.split("::", 1)[0].split(":", 1)[0]
            if capability_id == "commerce" and "billing" in module:
                messages.append(
                    f"appbase integration {capability_id} verification command must not reference billing-named test module: {module}"
                )
                continue
            if "." in module:
                path = self.root / (module.replace(".", "/") + ".py")
            else:
                path = self.root / module
            if not path.is_file():
                messages.append(
                    f"appbase integration {capability_id} verification command references missing unittest module: {module}"
                )
        return messages

    def _validate_forbidden_product_forks(self, capability_id: str, integration: dict[str, Any]) -> list[str]:
        messages: list[str] = []
        forbidden_paths = integration.get("forbiddenProductForks", [])
        if not isinstance(forbidden_paths, list):
            return [f"appbase integration {capability_id} forbiddenProductForks must be a list"]
        for forbidden_path in forbidden_paths:
            if not isinstance(forbidden_path, str) or not forbidden_path.strip():
                messages.append(f"appbase integration {capability_id} forbidden product fork path must be a non-empty string")
                continue
            normalized_forbidden_path = forbidden_path.strip()
            if self._has_glob_pattern(normalized_forbidden_path):
                for matched_path in sorted(self.root.glob(normalized_forbidden_path)):
                    messages.append(
                        "appbase integration "
                        f"{capability_id} forbids product fork path matching {normalized_forbidden_path}: "
                        f"{self._display_path(matched_path)}"
                    )
                continue
            if (self.root / normalized_forbidden_path).exists():
                messages.append(
                    f"appbase integration {capability_id} forbids product fork path that exists: {normalized_forbidden_path}"
                )
        return messages

    def _validate_commerce_schema_registry(self) -> list[str]:
        messages: list[str] = []
        field_contract = self._load_frontend_field_contract(messages)
        if field_contract is not None:
            try:
                text = render_frontend_field_contract(self.root, self.root / DEFAULT_CONTRACT_INDEX)
            except (OSError, RuntimeError, ValueError):
                snapshot = self.root / FRONTEND_FIELD_CONTRACTS_PATH
                text = snapshot.read_text(encoding="utf-8", errors="ignore") if snapshot.is_file() else ""
            messages.extend(
                self._validate_commerce_schema_registry_text(
                    "appbase commerce schema registry",
                    text,
                )
            )
            messages.extend(self._validate_commerce_required_api_operations(field_contract))
        table_registry = self.root / TABLE_REGISTRY_PATH
        if table_registry.is_file():
            try:
                text = render_schema_registry(table_registry)
            except (OSError, RuntimeError, ValueError):
                text = table_registry.read_text(encoding="utf-8", errors="ignore")
            messages.extend(
                self._validate_commerce_schema_registry_text(
                    "appbase commerce table registry",
                    text,
                )
            )
            messages.extend(self._validate_commerce_table_registry_product_center(text))
        route_classification = self.root / FRONTEND_ROUTE_CLASSIFICATION_PATH
        if route_classification.is_file():
            text = route_classification.read_text(encoding="utf-8", errors="ignore")
            legacy_route_pattern = re.escape(LEGACY_CONSOLE_BILLING_ROUTE)
            if re.search(fr"(?m)^\s*-\s*route:\s*{legacy_route_pattern}\s*$", text) or re.search(
                fr"operation_routes:\s*\[[^\]]*{legacy_route_pattern}[^\]]*\]",
                text,
            ):
                messages.append(
                    "appbase commerce route classification must use business-domain routes instead of retired aggregate commerce or billing routes"
                )
        return messages

    def _load_frontend_field_contract(self, messages: list[str]) -> dict[str, Any] | None:
        try:
            contract = load_frontend_field_contract(self.root)
        except (OSError, RuntimeError, ValueError) as exc:
            messages.append(f"failed to load frontend field contracts: {exc}")
            return None
        if not contract:
            return None
        return contract

    def _validate_commerce_schema_registry_text(self, label: str, text: str) -> list[str]:
        messages: list[str] = []
        seen_paths: set[str] = set()
        for match in COMMERCE_RETIRED_API_PATH_RE.finditer(text):
            api_path = match.group(0)
            if api_path in seen_paths:
                continue
            seen_paths.add(api_path)
            messages.append(f"{label} must not declare retired commerce API path: {api_path}")
        for table in sorted(set(COMMERCE_BILLING_TABLE_RE.findall(text))):
            messages.append(f"{label} must not declare billing table: {table}")
        for match in COMMERCE_SURFACE_PREFIXED_OPERATION_ID_RE.finditer(text):
            messages.append(
                "appbase commerce schema registry operation_id must not start with app. or backend.: "
                f"{match.group(1)}"
            )
        for match in COMMERCE_RETIRED_OPERATION_ID_RE.finditer(text):
            messages.append(
                "appbase commerce schema registry must not declare retired commerce operationId: "
                f"{match.group(1)}"
            )
        return messages

    def _validate_commerce_table_registry_product_center(self, text: str) -> list[str]:
        declared_tables = set(COMMERCE_TABLE_DECLARATION_RE.findall(text))
        messages: list[str] = []
        for table in sorted(COMMERCE_RETIRED_PRODUCT_CENTER_TABLES & declared_tables):
            messages.append(
                f"appbase commerce table registry must not declare retired product center table: {table}"
            )
        for table in COMMERCE_REQUIRED_PRODUCT_CENTER_TABLES:
            if table not in declared_tables:
                messages.append(
                f"appbase commerce table registry must declare unified product center table: {table}"
            )
        return messages

    def _validate_commerce_required_api_operations(self, payload: dict[str, Any]) -> list[str]:
        messages: list[str] = []
        frontend_operations = payload.get("frontend_operations", [])
        if not isinstance(frontend_operations, list):
            return ["appbase commerce schema registry frontend_operations must be a list"]
        declared_operations: set[tuple[str, str, str, str]] = set()
        for operation in frontend_operations:
            if not isinstance(operation, dict):
                continue
            surface = operation.get("api_surface")
            method = operation.get("api_method")
            api_path = operation.get("api_path")
            operation_id = operation.get("operation_id")
            if all(isinstance(value, str) for value in (surface, method, api_path, operation_id)):
                declared_operations.add(
                    (
                        str(surface),
                        str(method).upper(),
                        str(api_path),
                        str(operation_id),
                    )
                )
        for surface, method, api_path, operation_id in COMMERCE_REQUIRED_API_OPERATIONS:
            if (surface, method, api_path, operation_id) not in declared_operations:
                messages.append(
                    "appbase commerce schema registry must declare standard commerce API operation: "
                    f"{method} {api_path} {operation_id}"
                )
        return messages

    def _validate_builtin_forbidden_product_forks(self) -> list[str]:
        messages: list[str] = []
        for forbidden_path in BUILT_IN_FORBIDDEN_PRODUCT_FORKS:
            if (self.root / forbidden_path).exists():
                messages.append(f"appbase integration forbids product fork path that exists: {forbidden_path}")
        return messages

    def _validate_root_level_appbase_shadow_paths(self) -> list[str]:
        messages: list[str] = []
        for forbidden_path in ROOT_LEVEL_APPBASE_SHADOW_PATHS:
            if (self.root / forbidden_path).exists():
                messages.append(
                    "appbase integration forbids root-level appbase commerce shadow path "
                    f"that exists: {forbidden_path}"
                )
        return messages

    def _portal_dependencies(self, messages: list[str]) -> set[str]:
        package_path = self.root / PORTAL_PACKAGE_PATH
        if not package_path.exists():
            messages.append(f"missing portal package manifest: {self._posix(PORTAL_PACKAGE_PATH)}")
            return set()
        package = json.loads(package_path.read_text(encoding="utf-8"))
        dependencies = package.get("dependencies", {})
        dev_dependencies = package.get("devDependencies", {})
        combined: set[str] = set()
        if isinstance(dependencies, dict):
            combined.update(str(key) for key in dependencies)
        if isinstance(dev_dependencies, dict):
            combined.update(str(key) for key in dev_dependencies)
        return combined

    def _validate_existing_relative_file(
        self,
        capability_id: str,
        label: str,
        relative_path: str,
        messages: list[str],
    ) -> None:
        path = Path(relative_path)
        if path.is_absolute() or ".." in path.parts:
            messages.append(f"appbase integration {capability_id} {label} path must stay inside the application workspace: {relative_path}")
            return
        if not (self.root / path).is_file():
            messages.append(f"appbase integration {capability_id} {label} path does not exist: {relative_path}")

    def _walk(self, root: Path) -> list[Path]:
        result: list[Path] = []
        stack = [root]
        while stack:
            current = stack.pop()
            if current.name in IGNORED_DIR_NAMES:
                continue
            result.append(current)
            if current.is_dir():
                stack.extend(current.iterdir())
        return result

    def _required_string(self, payload: dict[str, Any], key: str, subject: str, messages: list[str]) -> str | None:
        value = payload.get(key)
        if not isinstance(value, str) or not value.strip():
            messages.append(f"{subject} must declare non-empty {key}")
            return None
        return value.strip()

    def _display_path(self, path: Path) -> str:
        try:
            return self._posix(path.relative_to(self.root))
        except ValueError:
            return self._posix(path)

    def _posix(self, path: Path | str) -> str:
        return str(path).replace("\\", "/")

    def _has_glob_pattern(self, path: str) -> bool:
        return any(token in path for token in ("*", "?", "["))


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate appbase capability integration for sdkwork-clawrouter.")
    parser.add_argument("--root", type=Path, default=Path.cwd(), help="sdkwork-clawrouter root directory")
    parser.add_argument("--manifest", type=Path, default=None, help="appbase integration manifest path")
    parser.add_argument("--appbase-catalog", type=Path, default=None, help="appbase capability catalog path")
    args = parser.parse_args()

    result = AppbaseIntegrationGuardian(
        root=args.root,
        integration_path=args.manifest,
        appbase_catalog_path=args.appbase_catalog,
    ).run()
    if result.ok:
        print("Appbase integration guardian passed")
        return 0
    for message in result.messages:
        print(message)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
